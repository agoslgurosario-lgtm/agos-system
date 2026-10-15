"""
Chunked restore: lets the browser upload a large backup .zip in small
pieces (so the web process never holds the whole file in RAM), then
restores it in a background thread.

Flow
  1. POST  backup/restore/chunk/   (repeat for every chunk)
  2. POST  backup/restore/finish/  (starts the restore, returns 202)
  3. GET   backup/restore/status/<upload_id>/   (poll until done/failed)
"""
import json
import logging
import os
import shutil
import tempfile
import threading
import time
import uuid

from django.db import IntegrityError, connections
from rest_framework import status
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsAdmin
from .models import BackupLog
from .services import restore_backup_archive, InvalidBackupError

logger = logging.getLogger(__name__)

UPLOAD_ROOT = os.path.join(tempfile.gettempdir(), 'agos_restore_uploads')
MAX_CHUNK_BYTES = 8 * 1024 * 1024      # reject any single chunk bigger than 8 MB
MAX_CHUNKS = 600                       # ~2.4 GB at 4 MB per chunk
STALE_AFTER_SECONDS = 6 * 60 * 60      # clean leftovers older than 6 hours

# Only one restore at a time in this process.
_restore_lock = threading.Lock()


# ---------- helpers ----------

def _parse_upload_id(value):
    """upload_id must be a real UUID — this also blocks path traversal."""
    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, AttributeError, TypeError):
        return None


def _upload_dir(upload_id):
    return os.path.join(UPLOAD_ROOT, upload_id)


def _status_path(upload_id):
    return os.path.join(UPLOAD_ROOT, f'{upload_id}.status.json')


def _write_status(upload_id, state, error=None):
    os.makedirs(UPLOAD_ROOT, exist_ok=True)
    tmp = _status_path(upload_id) + '.tmp'
    with open(tmp, 'w') as f:
        json.dump({'state': state, 'error': error}, f)
    os.replace(tmp, _status_path(upload_id))


def _cleanup_stale():
    """Delete abandoned uploads / old status files."""
    if not os.path.isdir(UPLOAD_ROOT):
        return
    now = time.time()
    for name in os.listdir(UPLOAD_ROOT):
        path = os.path.join(UPLOAD_ROOT, name)
        try:
            if now - os.path.getmtime(path) > STALE_AFTER_SECONDS:
                if os.path.isdir(path):
                    shutil.rmtree(path, ignore_errors=True)
                else:
                    os.remove(path)
        except OSError:
            pass


def _log_restore(user_id, file_name, ok, error=None):
    """
    Write a BackupLog row. The restore replaces the users table, so the
    admin who triggered it may not exist in the restored data — fall back
    to triggered_by=None instead of failing on the foreign key.
    """
    fields = dict(
        backup_type='restore',
        status='success' if ok else 'failed',
        file_name=file_name,
        error_message=error,
    )
    try:
        BackupLog.objects.create(triggered_by_id=user_id, **fields)
    except IntegrityError:
        BackupLog.objects.create(triggered_by=None, **fields)
    except Exception:
        logger.exception("Could not write restore BackupLog.")


def _restore_worker(upload_id, total_chunks, file_name, user_id):
    up_dir = _upload_dir(upload_id)
    try:
        # 1. Stitch the chunks into one zip on disk, deleting each as we go
        _write_status(upload_id, 'assembling')
        zip_path = os.path.join(up_dir, 'assembled.zip')
        with open(zip_path, 'wb') as out:
            for i in range(total_chunks):
                chunk_path = os.path.join(up_dir, f'{i:06d}.part')
                with open(chunk_path, 'rb') as part:
                    shutil.copyfileobj(part, out, length=1024 * 1024)
                os.remove(chunk_path)

        # 2. Run the memory-light restore
        _write_status(upload_id, 'restoring')
        restore_backup_archive(zip_path)

        _log_restore(user_id, file_name, ok=True)
        _write_status(upload_id, 'done')

    except InvalidBackupError as e:
        logger.warning("Chunked restore rejected: %s", e)
        _log_restore(user_id, file_name, ok=False, error=str(e))
        _write_status(upload_id, 'failed', error=str(e))
    except Exception as e:
        logger.exception("Chunked restore failed.")
        _log_restore(user_id, file_name, ok=False, error=str(e))
        _write_status(
            upload_id, 'failed',
            error='Restore failed because of a server problem. Please try again, '
                  'and contact your system administrator if it keeps happening.',
        )
    finally:
        shutil.rmtree(up_dir, ignore_errors=True)
        connections.close_all()
        _restore_lock.release()


# ---------- views ----------

class RestoreChunkView(APIView):
    """Receives ONE chunk of the backup zip and stores it on disk."""
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser]

    def post(self, request):
        upload_id = _parse_upload_id(request.data.get('upload_id'))
        chunk = request.FILES.get('chunk')

        try:
            chunk_index = int(request.data.get('chunk_index'))
            total_chunks = int(request.data.get('total_chunks'))
        except (TypeError, ValueError):
            return Response({'error': 'chunk_index and total_chunks must be numbers.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if not upload_id or not chunk:
            return Response({'error': 'upload_id and chunk are required.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not (1 <= total_chunks <= MAX_CHUNKS) or not (0 <= chunk_index < total_chunks):
            return Response({'error': 'Invalid chunk numbering, or the backup file is too large.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if chunk.size > MAX_CHUNK_BYTES:
            return Response({'error': 'Chunk is too large.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if chunk_index == 0:
            _cleanup_stale()

        up_dir = _upload_dir(upload_id)
        os.makedirs(up_dir, exist_ok=True)

        final_path = os.path.join(up_dir, f'{chunk_index:06d}.part')
        tmp_path = final_path + '.tmp'
        with open(tmp_path, 'wb') as f:
            for piece in chunk.chunks():
                f.write(piece)
        os.replace(tmp_path, final_path)   # safe to retry the same chunk

        return Response({'received': chunk_index})


class RestoreFinishView(APIView):
    """All chunks are uploaded — verify them and start the restore."""
    permission_classes = [IsAdmin]
    parser_classes = [JSONParser, MultiPartParser]

    def post(self, request):
        upload_id = _parse_upload_id(request.data.get('upload_id'))
        file_name = os.path.basename(str(request.data.get('file_name') or 'backup.zip'))[:255]

        try:
            total_chunks = int(request.data.get('total_chunks'))
        except (TypeError, ValueError):
            return Response({'error': 'total_chunks is required.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if not upload_id or not (1 <= total_chunks <= MAX_CHUNKS):
            return Response({'error': 'Invalid upload.'}, status=status.HTTP_400_BAD_REQUEST)
        if not file_name.lower().endswith('.zip'):
            return Response({'error': 'Invalid file type. Expected a .zip backup archive.'},
                            status=status.HTTP_400_BAD_REQUEST)

        up_dir = _upload_dir(upload_id)
        missing = [i for i in range(total_chunks)
                   if not os.path.exists(os.path.join(up_dir, f'{i:06d}.part'))]
        if missing:
            return Response(
                {'error': f'Upload incomplete. Missing chunk(s): {missing[:5]}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not _restore_lock.acquire(blocking=False):
            return Response({'error': 'Another restore is already running.'},
                            status=status.HTTP_409_CONFLICT)

        _write_status(upload_id, 'assembling')
        threading.Thread(
            target=_restore_worker,
            args=(upload_id, total_chunks, file_name, request.user.pk),
            daemon=True,
        ).start()

        return Response({'upload_id': upload_id, 'state': 'assembling'},
                        status=status.HTTP_202_ACCEPTED)


class RestoreStatusView(APIView):
    """
    Polled by the browser while the restore runs.

    Deliberately NOT behind login: the restore replaces the users table, so
    the admin's session may stop being valid halfway through. The random
    upload_id (a UUID only the uploader knows) acts as the access key, and
    the response only says the state and a safe error message.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request, upload_id):
        upload_id = _parse_upload_id(upload_id)
        if not upload_id:
            return Response({'error': 'Invalid upload id.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            with open(_status_path(upload_id)) as f:
                return Response(json.load(f))
        except FileNotFoundError:
            return Response({'state': 'unknown', 'error': None})