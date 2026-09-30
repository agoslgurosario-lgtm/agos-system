from django.db import models
from apps.clog_events.models import ClogEvent
from django.conf import settings

class Alert(models.Model):
    ALERT_TYPE_CHOICES = [
        ('Water_Level_Rising',  'Water Level Rising'),
        ('Low_Clog_Alert',      'Low Clog Alert'),
        ('Moderate_Clog_Alert', 'Moderate Clog Alert'),
        ('Critical_Clog',       'Critical Clog'),
        ('Node_Offline',        'Node Offline'),
        ('Low_Battery',         'Low Battery'),
        ('Weak_Signal',         'Weak Signal'),
        ('Sensor_Failure',      'Sensor Failure'),
        ('Report_Submitted',    'Report Submitted'),
    ]

    alert_id = models.AutoField(primary_key=True)
    event = models.ForeignKey(
        ClogEvent,
        on_delete=models.CASCADE,
        db_column='event_id',
        null=True,
        blank=True,
    )
    report = models.ForeignKey(
        'reports.CanalMonitoringReport',
        on_delete=models.CASCADE,
        db_column='report_id',
        null=True,
        blank=True,
    )
    node = models.ForeignKey(
        'sensor_nodes.SensorNode',
        on_delete=models.CASCADE,
        db_column='node_id',
        null=True,
        blank=True,
    )
    health_log = models.ForeignKey(
        'sensor_nodes.SystemHealthLog',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        db_column='health_log_id'
    )
    alert_type = models.CharField(max_length=25, choices=ALERT_TYPE_CHOICES)
    alert_context = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_alerts'

    def __str__(self):
        return f"Alert {self.alert_id} - {self.alert_type}"

class AlertRead(models.Model):
    read_id  = models.AutoField(primary_key=True)
    alert = models.ForeignKey(Alert, on_delete=models.CASCADE, related_name='reads', db_column='alert_id')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='user_id')
    read_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_alert_reads'
        unique_together = ('alert', 'user')

    def __str__(self):
        return f"Read - Alert {self.alert_id} by {self.user.username}"