from django.conf import settings
from django.db import models
from apps.sensor_nodes.models import SensorNode
from apps.barangay.models import Barangay
from apps.waste_classification.models import WasteClassification

class ClogEvent(models.Model):
    SEVERITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
    ]
    STATUS_CHOICES = [
        ('Detected', 'Detected'),
        ('Responded', 'Responded'),
        ('Cleared', 'Cleared'),
        ('Verified', 'Verified'),
    ]

    event_id = models.AutoField(primary_key=True)
    node = models.ForeignKey(
        SensorNode,
        on_delete=models.CASCADE,
        db_column='node_id'
    )
    barangay = models.ForeignKey(
        Barangay,
        on_delete=models.CASCADE,
        db_column='barangay_id'
    )
    classification = models.OneToOneField(
        WasteClassification,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='classification_id'
    )
    clear_streak = models.PositiveIntegerField(default=0)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    first_severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, null=True, blank=True)
    peak_severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, null=True, blank=True)

    
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Detected')
    detected_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    cleared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='cleared_by'
    )
    responded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='responded_events',
    )
    auto_cleared = models.BooleanField(default=False)

    class Meta:
        db_table = 'tbl_clog_events'

    def __str__(self):
        return f"Clog {self.event_id} - {self.barangay.barangay_name} - {self.severity}"