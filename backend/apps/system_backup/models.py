from django.db import models
from django.conf import settings


class BackupConfig(models.Model):
    """
    Single-row settings table for scheduled (automatic) backup.
    Configured by an Admin via Settings > Utilities.
    """
    config_id = models.AutoField(primary_key=True)
    auto_backup_enabled = models.BooleanField(default=False)
    frequency = models.CharField(
        max_length=20,
        choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly')],
        default='weekly',
    )
    server_backup_path = models.CharField(max_length=500, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, db_column='updated_by'
    )

    class Meta:
        db_table = 'tbl_backup_config'

    def __str__(self):
        return f"BackupConfig(enabled={self.auto_backup_enabled}, freq={self.frequency})"


class BackupLog(models.Model):
    """
    History of every backup/restore attempt, manual or scheduled.
    """
    BACKUP_TYPE_CHOICES = [('manual', 'Manual'), ('scheduled', 'Scheduled'), ('restore', 'Restore')]
    STATUS_CHOICES = [('success', 'Success'), ('failed', 'Failed')]

    log_id = models.AutoField(primary_key=True)
    config = models.ForeignKey(
        BackupConfig, on_delete=models.SET_NULL,
        null=True, blank=True, db_column='config_id'
    )
    backup_type = models.CharField(max_length=20, choices=BACKUP_TYPE_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='user_id',
    )
    file_name = models.CharField(max_length=255, blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_backup_logs'

    def __str__(self):
        return f"{self.backup_type} - {self.status} - {self.created_at}"