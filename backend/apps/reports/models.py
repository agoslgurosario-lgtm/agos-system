from django.db import models
from django.conf import settings
from apps.barangay.models import Barangay


class CanalMonitoringReport(models.Model):
    SEVERITY_CHOICES = [
        ('Critical', 'Critical'),
        ('Medium', 'Medium'),
        ('Low', 'Low'),
    ]
    WATER_LEVEL_CHOICES = [
        ('Low', 'Low'),
        ('Moderate', 'Moderate'),
        ('High', 'High'),
    ]
    OBSTRUCTION_COVERAGE_CHOICES = [
        ('Under_25', '<25%'),
        ('25_50', '25–50%'),
        ('50_75', '50–75%'),
        ('Over_75', '>75%'),
    ]
    WATER_FLOW_CHOICES = [
        ('Normal', 'Normal'),
        ('Reduced', 'Reduced'),
        ('Blocked', 'Blocked'),
    ]
    CANAL_CONDITION_CHOICES = [
        ('Clear', 'Clear'),
        ('Partially_Clear', 'Partially Clear'),
        ('Still_Obstructed', 'Still Obstructed'),
    ]
    WASTE_UNIT_CHOICES = [
        ('kg', 'kg'),
        ('L', 'L'),
        ('Other', 'Other'),
    ]

    report_id = models.AutoField(primary_key=True)
    is_submitted = models.BooleanField(default=False)

    # Monitoring Site Information
    barangay = models.ForeignKey(
        Barangay,
        on_delete=models.CASCADE,
        db_column='barangay_id'
    )
    canal_name = models.CharField(max_length=150, null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    nearest_landmark = models.CharField(max_length=255, blank=True)

    # Detection Summary
    date_observed = models.DateTimeField(null=True, blank=True)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, null=True, blank=True)

    # Canal Condition
    water_level = models.CharField(max_length=10, choices=WATER_LEVEL_CHOICES, null=True, blank=True)
    obstruction_coverage = models.CharField(max_length=10, choices=OBSTRUCTION_COVERAGE_CHOICES, null=True, blank=True)
    water_flow_condition = models.CharField(max_length=10, choices=WATER_FLOW_CHOICES, null=True, blank=True)

    # Waste Composition — estimated amount per category (kg)
    waste_plastic_kg = models.FloatField(null=True, blank=True)
    waste_food_wrapper_kg = models.FloatField(null=True, blank=True)  # snack / junk-food packaging
    waste_paper_cardboard_kg = models.FloatField(null=True, blank=True)
    waste_glass_kg = models.FloatField(null=True, blank=True)
    waste_organic_kg = models.FloatField(null=True, blank=True)
    waste_metal_kg = models.FloatField(null=True, blank=True)
    waste_foam_kg = models.FloatField(null=True, blank=True)
    waste_textile_kg = models.FloatField(null=True, blank=True)  # clothes, towels, etc.
    waste_ewaste_kg = models.FloatField(null=True, blank=True)  # batteries, vapes, electronics
    waste_other_kg = models.FloatField(null=True, blank=True)
    waste_other_label = models.CharField(max_length=100, blank=True)

    # Barangay Response
    assigned_personnel = models.CharField(max_length=150, null=True, blank=True)
    date_responded = models.DateTimeField(null=True, blank=True)
    action_taken = models.TextField(null=True, blank=True)
    waste_collected_amount = models.FloatField(null=True, blank=True)
    waste_collected_unit = models.CharField(max_length=10, choices=WASTE_UNIT_CHOICES, default='kg')
    final_canal_condition = models.CharField(max_length=20, choices=CANAL_CONDITION_CHOICES, null=True, blank=True)
    remarks = models.TextField(blank=True)

    # Relationships / metadata
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='canal_reports',
        db_column='reported_by'
    )
    clog_event = models.ForeignKey(
        'clog_events.ClogEvent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='clog_event_id'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_canal_monitoring_reports'

    def __str__(self):
        when = self.date_observed.date() if self.date_observed else "draft"
        return f"Report {self.report_id} — {self.barangay.barangay_name} ({when})"


def report_media_upload_path(instance, filename):
    category_folder = {
        'Before_Clearing': 'before_clearing',
        'After_Clearing': 'after_clearing',
        'Additional_Evidence': 'additional_evidence',
    }.get(instance.media_category, 'other')
    return f'report_media/{category_folder}/{filename}'


class ReportMedia(models.Model):
    MEDIA_TYPE_CHOICES = [
        ('Image', 'Image'),
        ('Video', 'Video'),
    ]

    MEDIA_CATEGORY_CHOICES = [
        ('Before_Clearing', 'Before Clearing'),
        ('After_Clearing', 'After Clearing'),
        ('Additional_Evidence', 'Additional Evidence'),
    ]

    media = models.AutoField(primary_key=True)
    report = models.ForeignKey(
        CanalMonitoringReport,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column='report_id'
    )
    media_category = models.CharField(max_length=20, choices=MEDIA_CATEGORY_CHOICES, default='Additional_Evidence')
    file_path = models.FileField(upload_to=report_media_upload_path, null=True, blank=True)
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES, default='Image')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='uploaded_by'
    )

    class Meta:
        db_table = 'tbl_report_media'

    def __str__(self):
        return f"Media {self.media} - {self.media_type}"