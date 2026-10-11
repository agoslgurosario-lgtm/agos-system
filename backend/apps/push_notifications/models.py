from django.db import models
from django.conf import settings


class DeviceToken(models.Model):
    token_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='device_tokens',
        db_column='user_id',
    )
    token = models.CharField(max_length=255, unique=True)
    platform = models.CharField(max_length=10, default='android')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_device_tokens'

    def __str__(self):
        return f"{self.user_id} - {self.platform}"