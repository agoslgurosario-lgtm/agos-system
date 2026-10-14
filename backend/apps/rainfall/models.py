from datetime import timedelta
from django.db import models
from django.utils import timezone
from apps.barangay.models import Barangay
from django.conf import settings


class RainfallCondition(models.Model):
    """
    Live rainfall tier for a barangay, derived from Open-Meteo mm/hr
    readings mapped onto PAGASA's published Yellow/Orange/Red bands.
    """

    CONDITION_CHOICES = [
        ('None', 'None'),
        ('Yellow', 'Yellow'),
        ('Orange', 'Orange'),
        ('Red', 'Red'),
    ]

    STALE_AFTER = timedelta(hours=3)

    barangay = models.OneToOneField(
        Barangay,
        on_delete=models.CASCADE,
        db_column='barangay_id',
        related_name='rainfall_condition',
    )
    rainfall_mm_hr = models.FloatField(null=True, blank=True)
    condition = models.CharField(
        max_length=10,
        choices=CONDITION_CHOICES,
        default='None',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_rainfall_conditions'

    def __str__(self):
        return f"{self.barangay.barangay_name} - {self.condition} ({self.rainfall_mm_hr} mm/hr)"

    @property
    def is_stale(self):
        return timezone.now() - self.updated_at > self.STALE_AFTER

    @property
    def effective_condition(self):
        return 'Unknown' if self.is_stale else self.condition


class AlertThreshold(models.Model):
    """
    DB-backed Warning/Critical percentage pair per rainfall condition.
    Stored in the DB (not hardcoded) so thresholds can be tuned from
    Django admin without a redeploy.
    """

    CONDITION_CHOICES = RainfallCondition.CONDITION_CHOICES + [('Unknown', 'Unknown')]

    condition = models.CharField(
        max_length=10,
        choices=CONDITION_CHOICES,
        unique=True,
    )
    warning_pct = models.FloatField(
        help_text="Water level % of canal_depth that triggers a Warning classification."
    )
    critical_pct = models.FloatField(
        help_text="Water level % of canal_depth that triggers a Critical classification."
    )
    reading_interval_seconds = models.PositiveIntegerField(
        default=300,
        help_text="Recommended seconds between sensor readings for this rainfall condition."
    )
    clear_streak_count = models.PositiveIntegerField(
        default=5,
        help_text="Consecutive confirmed-clear readings (clog_pct < 30) required to auto-clear an open ClogEvent."
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='updated_by',
    )

    class Meta:
        db_table = 'tbl_alert_thresholds'

    def __str__(self):
        return f"{self.condition}: Warning {self.warning_pct}% / Critical {self.critical_pct}%"