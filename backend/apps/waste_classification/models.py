from django.db import models
from apps.sensor_readings.models import SensorReading
from apps.sensor_nodes.models import SensorNode

class WasteClassification(models.Model):
    WASTE_TYPE_CHOICES = [
        ('Recyclable', 'Recyclable'),
        ('Biodegradable', 'Biodegradable'),
        ('Residual', 'Residual'),
        ('Special Waste', 'Special Waste'),
        ('None', 'None'),
    ]

    classification_id = models.AutoField(primary_key=True)
    node = models.ForeignKey(
        SensorNode,
        on_delete=models.CASCADE,
        db_column='node_id'
    )
    reading = models.OneToOneField(
        SensorReading,
        on_delete=models.CASCADE,
        db_column='reading_id'
    )
    dominant_waste_type = models.CharField(
        max_length=20,
        choices=WASTE_TYPE_CHOICES,
        default='None'
)
    recyclable_pct = models.FloatField(default=0)
    biodegradable_pct = models.FloatField(default=0)
    residual_pct = models.FloatField(default=0)
    special_waste_pct = models.FloatField(default=0)
    none_pct = models.FloatField(default=0)
    confidence = models.FloatField(default=0)
    is_mixed = models.BooleanField(default=False)
    present_waste_types = models.JSONField(default=list, blank=True)
    estimated_volume = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_waste_classification'

    def __str__(self):
        return f"{self.dominant_waste_type} - Reading {self.reading.reading_id}"