from django.db import models
from django.conf import settings


class AlertSoundConfig(models.Model):
    """
    Single-row settings table (same singleton pattern as BackupConfig).
    Stores which sound is assigned to each severity tier.
    Value can be either a preset identifier (e.g. "chime") or the
    URL/path of an UploadedAlertSound.
    """
    config_id = models.AutoField(primary_key=True)
    sound_enabled = models.BooleanField(default=True)

    critical_sound = models.CharField(max_length=255, default="preset:critical")
    warning_sound = models.CharField(max_length=255, default="preset:warning")
    info_sound = models.CharField(max_length=255, default="preset:info")

    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, db_column='updated_by')

    class Meta:
        db_table = 'tbl_alert_sound_config'

    def __str__(self):
        return f"AlertSoundConfig(enabled={self.sound_enabled})"


class UploadedAlertSound(models.Model):
    """
    Custom sound files uploaded by an Admin.
    """
    sound_id = models.AutoField(primary_key=True)
    original_filename = models.CharField(max_length=255)
    file = models.FileField(upload_to='alert_sounds/')
    duration_seconds = models.FloatField()
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='user_id',
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_uploaded_alert_sounds'

    def __str__(self):
        return self.original_filename