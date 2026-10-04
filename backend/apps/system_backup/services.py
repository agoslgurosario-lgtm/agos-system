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


def _validate_backup_zip(zf):
    total_uncompressed = 0
    entry_count = 0

    for info in zf.infolist():
        entry_count += 1
        if entry_count > MAX_BACKUP_ENTRY_COUNT:
            raise ValueError("Backup archive has too many entries.")

        total_uncompressed += info.file_size
        if total_uncompressed > MAX_BACKUP_UNCOMPRESSED_SIZE:
            raise ValueError("Backup archive is too large when decompressed.")

        if info.compress_size > 0:
            ratio = info.file_size / info.compress_size
            if ratio > MAX_COMPRESSION_RATIO and info.file_size > 10 * 1024 * 1024:
                raise ValueError("Backup archive contains a suspiciously compressed file.")


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


def restore_backup_archive(zip_path):
    """
    Restores the system from a previously created backup archive:
      - runs the database.sql dump against the current DB
      - overwrites report_media/ files with the ones from the archive
    """
    with tempfile.TemporaryDirectory() as tmp_dir:
        with zipfile.ZipFile(zip_path, 'r') as zf:
            names = zf.namelist()
            if 'database.sql' not in names:
                raise ValueError("Invalid backup file: database.sql not found in archive.")
            _validate_backup_zip(zf)
            zf.extractall(tmp_dir)

        dump_path = os.path.join(tmp_dir, 'database.sql')
        db_settings = settings.DATABASES['default']
        dump_host = os.getenv('DB_HOST_DIRECT', db_settings['HOST'])
        dump_port = os.getenv('DB_PORT_DIRECT', db_settings['PORT'])

        env = os.environ.copy()
        env['PGPASSWORD'] = db_settings['PASSWORD']

        result = subprocess.run(
            [
                'psql',
                '-v', 'ON_ERROR_STOP=1',
                '--single-transaction',
                '-h', dump_host,
                '-p', str(dump_port),
                '-U', db_settings['USER'],
                '-d', db_settings['NAME'],
                '-f', dump_path,
            ],
            env=env,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            raise RuntimeError(f"psql restore failed: {result.stderr}")

        # Restore media files
        extracted_media = os.path.join(tmp_dir, 'media')
        if os.path.exists(extracted_media):
            s3 = _get_s3_client()
            bucket = settings.AWS_STORAGE_BUCKET_NAME
            for root, dirs, files in os.walk(extracted_media):
                for file in files:
                    src = os.path.join(root, file)
                    rel_path = os.path.relpath(src, extracted_media)
                    key = rel_path.replace(os.sep, '/')
                    s3.upload_file(src, bucket, key, ExtraArgs={'ACL': 'public-read'})