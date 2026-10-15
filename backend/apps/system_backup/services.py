import os
import subprocess
import zipfile
import tempfile
from datetime import datetime
from django.conf import settings
from .supabase_backup import _get_s3_client 

MAX_BACKUP_UNCOMPRESSED_SIZE = 2 * 1024 * 1024 * 1024  # 2 GB
MAX_BACKUP_ENTRY_COUNT = 20_000
MAX_COMPRESSION_RATIO = 100


class InvalidBackupError(ValueError):
    """The uploaded archive isn't a usable backup. Message is safe to show users."""
    

def _validate_backup_zip(zf):
    total_uncompressed = 0
    entry_count = 0

    for info in zf.infolist():
        entry_count += 1
        if entry_count > MAX_BACKUP_ENTRY_COUNT:
            raise InvalidBackupError("This backup file looks too large or unsafe to restore.")

        total_uncompressed += info.file_size
        if total_uncompressed > MAX_BACKUP_UNCOMPRESSED_SIZE:
            raise InvalidBackupError("Backup archive is too large when decompressed.")

        if info.compress_size > 0:
            ratio = info.file_size / info.compress_size
            if ratio > MAX_COMPRESSION_RATIO and info.file_size > 10 * 1024 * 1024:
                raise InvalidBackupError("Backup archive contains a suspiciously compressed file.")


def create_backup_archive(output_dir):
    """
    Creates a single .zip backup archive containing:
      - a PostgreSQL dump (via pg_dump)
      - a copy of the media/report_media folder

    output_dir: folder where the final .zip should be written
                (admin's chosen path for manual, or configured server
                path for scheduled — decided by the caller, not this function)

    Returns the full path to the created archive.
    Raises an exception if anything fails (caller is responsible for
    catching it and logging to BackupLog).
    """
    timestamp = datetime.now().strftime('%Y-%m-%d_%H%M')
    archive_name = f"agos_backup_{timestamp}.zip"
    archive_path = os.path.join(output_dir, archive_name)

    db_settings = settings.DATABASES['default']
    dump_host = os.getenv('DB_HOST_DIRECT', db_settings['HOST'])
    dump_port = os.getenv('DB_PORT_DIRECT', db_settings['PORT'])

    with tempfile.TemporaryDirectory() as tmp_dir:
        # 1. Dump the database to a .sql file
        dump_path = os.path.join(tmp_dir, 'database.sql')

        env = os.environ.copy()
        env['PGPASSWORD'] = db_settings['PASSWORD']

        result = subprocess.run(
          [
              'pg_dump',
              '-h', dump_host,
              '-p', str(dump_port),
              '-U', db_settings['USER'],
              '-F', 'p',
              '-n', 'public',     # only the app's tables, not Supabase internals
              '--no-owner',       # don't depend on who owned things in the source DB
              '--no-acl',         # don't copy GRANT/REVOKE statements
              '--clean',
              '--if-exists',
              '-f', dump_path,
              db_settings['NAME'],
          ],
          env=env,
          capture_output=True,
          text=True,
        )

        if result.returncode != 0:
            raise RuntimeError(f"pg_dump failed: {result.stderr}")

        # 2. Build the zip: db dump + media files
        with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.write(dump_path, arcname='database.sql')

            s3 = _get_s3_client()
            bucket = settings.AWS_STORAGE_BUCKET_NAME
            paginator = s3.get_paginator('list_objects_v2')
            for page in paginator.paginate(Bucket=bucket, Prefix='report_media/'):
                for obj in page.get('Contents', []):
                    key = obj['Key']
                    if key.endswith('/'):
                        continue
                    tmp_file = os.path.join(tmp_dir, os.path.basename(key))
                    s3.download_file(bucket, key, tmp_file)
                    zf.write(tmp_file, arcname=os.path.join('media', key))
                    os.remove(tmp_file)
            
            # 3. Add AI model weights (if present)
            classifier_path = os.path.join(settings.BASE_DIR, 'apps', 'ai_inference', 'saved_model', 'waste_classifier.tflite')
            yolo_path = os.path.join(settings.BASE_DIR, 'apps', 'ai_inference', 'weights', 'waste_yolo.onnx')

            if os.path.exists(classifier_path):
                zf.write(classifier_path, arcname='models/waste_classifier.tflite')
            else:
                print("Warning: TFLite classifier weights not found, skipping.")

            if os.path.exists(yolo_path):
                zf.write(yolo_path, arcname='models/waste_yolo.onnx')
            else:
                print("Warning: YOLO ONNX weights not found, skipping.")

    return archive_path


# Lines pg_dump --clean emits for the "public" schema itself. Supabase owns that
# schema (and extensions live in it), so we must not drop/recreate it.
_SKIP_EXACT = {
    'DROP SCHEMA IF EXISTS public;',
    'CREATE SCHEMA public;',
}
_SKIP_PREFIX = ('COMMENT ON SCHEMA public IS',)
# Signs of an old-style full-database dump (includes Supabase internals).
_UNSUPPORTED_PREFIX = ('CREATE EVENT TRIGGER', 'CREATE SCHEMA ', 'CREATE EXTENSION')


def _prepare_dump(src_path, dst_path):
    """
    Stream database.sql -> a cleaned copy (one line at a time, so memory use stays tiny).
    Raises InvalidBackupError for old backups that contain Supabase internals.
    """
    with open(src_path, 'r', encoding='utf-8', errors='replace') as src, \
         open(dst_path, 'w', encoding='utf-8') as dst:
        for line in src:
            stripped = line.strip()
            if stripped in _SKIP_EXACT or stripped.startswith(_SKIP_PREFIX):
                continue
            if stripped.startswith(_UNSUPPORTED_PREFIX):
                raise InvalidBackupError(
                    "This backup was made by an older version of the system and includes "
                    "database internals that can't be restored. Please create a new backup "
                    "and restore from that one."
                )
            dst.write(line)


def restore_backup_archive(zip_path):
    """
    Memory-light restore, safe for a 512MB instance:
      - extracts ONLY database.sql to disk (not the whole archive)
      - runs psql with output sent to a log file (nothing buffered in RAM)
      - streams each report_media file from the zip straight to S3
        (no extractall, no temp copies of the media)
    """
    import gc

    with tempfile.TemporaryDirectory() as tmp_dir:
        with zipfile.ZipFile(zip_path, 'r') as zf:
            names = zf.namelist()
            if 'database.sql' not in names:
                raise InvalidBackupError(
                    "This file isn't a valid AGOS backup. Please choose a backup that was created by the system."
                )
            _validate_backup_zip(zf)

            # 1. Extract only the SQL dump
            zf.extract('database.sql', tmp_dir)
            raw_path = os.path.join(tmp_dir, 'database.sql')
            dump_path = os.path.join(tmp_dir, 'database.clean.sql')
            _prepare_dump(raw_path, dump_path)
            os.remove(raw_path)

            db_settings = settings.DATABASES['default']
            dump_host = os.getenv('DB_HOST_DIRECT', db_settings['HOST'])
            dump_port = os.getenv('DB_PORT_DIRECT', db_settings['PORT'])

            env = os.environ.copy()
            env['PGPASSWORD'] = db_settings['PASSWORD']

            # 2. Run psql; stdout discarded, stderr to a file (never held in RAM)
            log_path = os.path.join(tmp_dir, 'psql.log')
            with open(log_path, 'w') as log:
                result = subprocess.run(
                    [
                        'psql', '-q',
                        '-v', 'ON_ERROR_STOP=1',
                        '--single-transaction',
                        '-h', dump_host,
                        '-p', str(dump_port),
                        '-U', db_settings['USER'],
                        '-d', db_settings['NAME'],
                        '-f', dump_path,
                    ],
                    env=env,
                    stdout=subprocess.DEVNULL,
                    stderr=log,
                )

            if result.returncode != 0:
                with open(log_path, 'r', errors='replace') as f:
                    tail = f.read()[-2000:]
                raise RuntimeError(f"psql restore failed: {tail}")

            # The dump is applied; free disk + memory before touching media
            os.remove(dump_path)
            gc.collect()

            # 3. Stream media entries directly from the zip to S3
            media_prefix = 'media/report_media/'
            s3 = _get_s3_client()
            bucket = settings.AWS_STORAGE_BUCKET_NAME
            for info in zf.infolist():
                if info.is_dir() or not info.filename.startswith(media_prefix):
                    continue
                key = info.filename[len('media/'):]  # -> report_media/...
                if '..' in key.split('/'):
                    continue  # skip anything suspicious
                with zf.open(info) as fh:
                    s3.upload_fileobj(
                        fh, bucket, key,
                        ExtraArgs={'ACL': 'public-read'},
                    )