import os
import logging
import tempfile
import shutil
from datetime import timedelta
from django.utils import timezone

from .models import BackupConfig, BackupLog
from .services import create_backup_archive
from .supabase_backup import upload_backup_to_supabase, prune_old_backups

logger = logging.getLogger(__name__)

FREQUENCY_DELTA = {
    'daily': timedelta(days=1),
    'weekly': timedelta(weeks=1),
    'monthly': timedelta(days=30),
}


def run_scheduled_backup_check():
    """
    Runs daily. Decides internally whether a scheduled backup is
    actually due, based on BackupConfig.frequency and the last
    successful scheduled backup's timestamp. Uploads the result to
    Supabase Storage rather than the (ephemeral, on Render) local disk.
    """
    config = BackupConfig.objects.first()

    if not config or not config.auto_backup_enabled:
        return

    last_success = BackupLog.objects.filter(
        backup_type='scheduled', status='success'
    ).order_by('-created_at').first()

    if last_success:
        due_at = last_success.created_at + FREQUENCY_DELTA[config.frequency]
        if timezone.now() < due_at:
            return  # not due yet

    tmp_dir = tempfile.mkdtemp()
    try:
        archive_path = create_backup_archive(tmp_dir)
        file_name = os.path.basename(archive_path)

        upload_backup_to_supabase(archive_path, file_name)

        BackupLog.objects.create(
            backup_type='scheduled',
            status='success',
            file_name=file_name,
        )
        logger.info("Scheduled backup uploaded to backup storage: %s", file_name)

        try:
            prune_old_backups()
        except Exception:
            logger.exception("Could not prune old backups (backup itself succeeded).")
    except Exception as e:
        BackupLog.objects.create(
            backup_type='scheduled',
            status='failed',
            error_message=str(e),
        )
        logger.exception("Scheduled backup failed.")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)