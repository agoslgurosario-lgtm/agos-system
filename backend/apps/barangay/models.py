from django.db import models

class Barangay(models.Model):
  
  barangay_id = models.AutoField(primary_key=True)
  barangay_name = models.CharField(max_length=100)
  latitude = models.FloatField()
  longitude  = models.FloatField()
  is_registered = models.BooleanField(default=False)

  is_active = models.BooleanField(default=True)
  deactivated_at = models.DateTimeField(null=True, blank=True)
  deactivation_reason = models.TextField(blank=True, default='')

  boundary = models.JSONField(null=True, blank=True)
  purok_count = models.PositiveSmallIntegerField(default=7)

  class Meta:
    db_table = 'tbl_barangay'

  def __str__(self):
    return self.barangay_name