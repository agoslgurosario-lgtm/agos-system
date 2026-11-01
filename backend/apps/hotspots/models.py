from django.db import models
from apps.barangay.models import Barangay


class Hotspot(models.Model):
    hotspot_id = models.AutoField(primary_key=True)
    barangay = models.ForeignKey(
        Barangay,
        on_delete=models.CASCADE,
        db_column='barangay_id'
    )
    name = models.CharField(max_length=150)
    description = models.TextField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    canal_width = models.FloatField(
    null=True, blank=True,
    help_text="Width of canal in meters at this location."
    )
    canal_shape = models.CharField(
        max_length=20,
        choices=[
            ('rectangular', 'Rectangular'),
            ('trapezoidal', 'Trapezoidal'),
            ('circular', 'Circular'),
        ],
        default='rectangular',
        help_text="Cross-sectional shape of the canal at this location."
    )
    sensor_height = models.FloatField(
        null=True, blank=True,
        help_text="Fixed distance in cm from sensor/camera mount to canal floor. Measured once at installation."
    )
    canal_depth = models.FloatField(
        null=True, blank=True,
        help_text="Registered depth in cm of the canal at this hotspot, used for water-level percentage classification (Normal/Warning/Critical). Distinct from sensor_height."
    )

    code = models.CharField(max_length=50, blank=True, default='')
    purok = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text="Purok (1 up to the barangay's purok_count) where this canal point is located."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'tbl_hotspots'
        unique_together = ('barangay', 'name')

    def __str__(self):
        return f"{self.name} - {self.barangay.barangay_name}"

    @property
    def is_occupied(self):
        return (
            hasattr(self, 'sensornode')
            and self.sensornode.availability_status == 'Occupied'
        )