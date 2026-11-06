from django.db import models
from django.conf import settings
from apps.barangay.models import Barangay
from django.core.validators import MinValueValidator, MaxValueValidator


class CanalMonitoringReport(models.Model):
    SEVERITY_CHOICES = [
        ('Critical', 'Critical'),
        ('Medium', 'Moderate'),
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
    WASTE_UNIT_CHOICES = [
        ('kg', 'kg'),
        ('L', 'L'),
        ('Other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Awaiting_Post_Report', 'Awaiting Post-Report'),
        ('Ready_To_Verify', 'Ready to Verify'),
        ('Verified', 'Verified'),
        ('Submitted', 'Submitted'),
        ('Voided', 'Voided'),
    ]
    CONDITION_SOURCE_CHOICES = [('Sensor', 'Sensor'), ('Manual', 'Manual'), ('Mixed', 'Mixed')]
    SCOPE_CHOICES = [('Purok', 'Single purok'), ('Barangay', 'Whole barangay')]

    report_id = models.AutoField(primary_key=True)
    is_submitted = models.BooleanField(default=False)
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default='Draft')
    condition_source = models.CharField(max_length=10, choices=CONDITION_SOURCE_CHOICES, default='Manual')
    post_completed_at = models.DateTimeField(null=True, blank=True)
    report_scope = models.CharField(max_length=10, choices=SCOPE_CHOICES, default='Purok')

    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='verified_canal_reports',
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    void_reason = models.TextField(blank=True, default='')
    voided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='voided_canal_reports',
    )
    voided_at = models.DateTimeField(null=True, blank=True)
    submission = models.ForeignKey(
        'reports.PeriodSubmission', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='reports',
    )
    carried_over = models.BooleanField(default=False)   # submitted in a later period than its own

    # Monitoring Site Information
    barangay = models.ForeignKey(
        Barangay,
        on_delete=models.CASCADE,
        db_column='barangay_id'
    )
    purok = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(30)],
    )

    # Detection Summary
    date_observed = models.DateTimeField(null=True, blank=True)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, null=True, blank=True)

    # Canal Condition — overall assessment across the whole purok
    overall_water_level = models.CharField(max_length=10, choices=WATER_LEVEL_CHOICES, null=True, blank=True)
    overall_obstruction_coverage = models.CharField(max_length=10, choices=OBSTRUCTION_COVERAGE_CHOICES, null=True, blank=True)
    overall_water_flow_condition = models.CharField(max_length=10, choices=WATER_FLOW_CHOICES, null=True, blank=True)

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
    waste_sanitary_kg = models.FloatField(null=True, blank=True)  # diapers, pads, wet wipes
    waste_footwear_kg = models.FloatField(null=True, blank=True)  # slippers, rubber scraps
    waste_medical_kg = models.FloatField(null=True, blank=True)   # facemasks, gloves, syringes, medicine packs
    waste_other_kg = models.FloatField(null=True, blank=True)
    waste_other_label = models.CharField(max_length=100, blank=True)

    # Barangay Response
    assigned_personnel = models.CharField(max_length=500, null=True, blank=True)
    date_responded = models.DateTimeField(null=True, blank=True)
    action_taken = models.TextField(null=True, blank=True)
    waste_collected_amount = models.FloatField(null=True, blank=True)
    waste_collected_unit = models.CharField(max_length=10, choices=WASTE_UNIT_CHOICES, default='kg')
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
    submitted_at = models.DateTimeField(null=True, blank=True)
    signatory_snapshot = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'tbl_canal_monitoring_reports'

    def __str__(self):
        when = self.date_observed.date() if self.date_observed else "draft"
        return f"Report {self.report_id} — {self.barangay.barangay_name} ({when})"


def save(self, *args, **kwargs):
    if self.is_submitted and self.status != 'Submitted':
        self.status = 'Submitted'
        fields = kwargs.get('update_fields')
        if fields is not None:
            kwargs['update_fields'] = set(fields) | {'status'}
    super().save(*args, **kwargs)


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


class CustomWasteType(models.Model):
    STATUS_CHOICES = [('Pending', 'Pending'), ('Approved', 'Approved'), ('Rejected', 'Rejected')]

    waste_type_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=40)
    name_key = models.CharField(max_length=40, unique=True)  # lowercase, for duplicate checks
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Pending')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+', db_column='created_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+', db_column='reviewed_by'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.CharField(max_length=200, blank=True, default='')

    class Meta:
        db_table = 'tbl_custom_waste_types'
        ordering = ['name']

    def __str__(self):
        return self.name


class BarangayPersonnel(models.Model):
    """A name in one barangay's saved list of response personnel. Private to that barangay;
    no MENRO review. Reports still store their own text string."""
    personnel_id = models.AutoField(primary_key=True)
    barangay = models.ForeignKey(
        Barangay, on_delete=models.CASCADE, related_name='personnel', db_column='barangay_id'
    )
    name = models.CharField(max_length=60)
    name_key = models.CharField(max_length=60)  # lowercase, for duplicate checks
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+', db_column='created_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'tbl_barangay_personnel'
        ordering = ['-last_used_at', 'name']
        constraints = [
            models.UniqueConstraint(fields=['barangay', 'name_key'], name='uniq_personnel_per_barangay'),
        ]

    def __str__(self):
        return f"{self.name} ({self.barangay_id})"


class ReportCustomWaste(models.Model):
    """One row per custom waste type recorded on a report (the 'Other' entries)."""
    item_id = models.AutoField(primary_key=True)
    report = models.ForeignKey(
        CanalMonitoringReport, on_delete=models.CASCADE,
        related_name='custom_waste', db_column='report_id'
    )
    waste_type = models.ForeignKey(
        CustomWasteType, on_delete=models.PROTECT, db_column='waste_type_id'
    )
    weight_kg = models.FloatField(validators=[MinValueValidator(0)])

    class Meta:
        db_table = 'tbl_report_custom_waste'
        unique_together = ('report', 'waste_type')

    def __str__(self):
        return f"{self.report_id}: {self.waste_type.name} {self.weight_kg} kg"


class ReportNodeSummary(models.Model):
    """What one node's sensors recorded for a report. Names are copied in so later
    renames or re-assignments don't change old reports."""
    summary_id = models.AutoField(primary_key=True)
    report = models.ForeignKey(
        CanalMonitoringReport, on_delete=models.CASCADE,
        related_name='node_summaries', db_column='report_id'
    )
    node = models.ForeignKey('sensor_nodes.SensorNode', null=True, blank=True,
                             on_delete=models.SET_NULL, db_column='node_id')
    hotspot = models.ForeignKey('hotspots.Hotspot', null=True, blank=True,
                                on_delete=models.SET_NULL, db_column='hotspot_id')
    node_name = models.CharField(max_length=100, blank=True, default='')
    hotspot_name = models.CharField(max_length=100, blank=True, default='')
    purok = models.PositiveSmallIntegerField(null=True, blank=True)

    window_start = models.DateTimeField()
    window_end = models.DateTimeField()
    reading_count = models.PositiveIntegerField(default=0)

    peak_clog_pct = models.FloatField(null=True, blank=True)
    avg_clog_pct = models.FloatField(null=True, blank=True)
    peak_water_level_cm = models.FloatField(null=True, blank=True)
    peak_water_level_pct = models.FloatField(null=True, blank=True)
    peak_waste_kg = models.FloatField(null=True, blank=True)
    min_flow_rate = models.FloatField(null=True, blank=True)
    worst_water_status = models.CharField(max_length=10, blank=True, default='')   # Normal/Warning/Critical
    worst_flow = models.CharField(max_length=10, blank=True, default='')           # Normal/Slow/Stagnant

    class Meta:
        db_table = 'tbl_report_node_summaries'
        ordering = ['summary_id']


class PeriodSubmission(models.Model):
    """What a barangay sends to MENRO for one half-month period."""
    submission_id = models.AutoField(primary_key=True)
    barangay = models.ForeignKey(Barangay, on_delete=models.PROTECT, related_name='period_submissions')
    period_start = models.DateField()
    period_end = models.DateField()
    due_date = models.DateField()
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='period_submissions',
    )
    submitted_at = models.DateTimeField()
    is_late = models.BooleanField(default=False)
    days_late = models.PositiveSmallIntegerField(default=0)
    report_count = models.PositiveIntegerField(default=0)
    totals = models.JSONField(default=dict, blank=True)
    signatory_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'tbl_period_submissions'
        ordering = ['-period_start']
        constraints = [
            models.UniqueConstraint(fields=['barangay', 'period_start'], name='uniq_submission_per_period'),
        ]


class ReportPurokRow(models.Model):
    """One purok's canal condition inside a whole-barangay report."""
    row_id = models.AutoField(primary_key=True)
    report = models.ForeignKey(CanalMonitoringReport, on_delete=models.CASCADE, related_name='purok_rows')
    purok = models.PositiveSmallIntegerField()
    included = models.BooleanField(default=True)
    source = models.CharField(max_length=10, default='Manual')
    overall_water_level = models.CharField(max_length=12, null=True, blank=True)
    overall_obstruction_coverage = models.CharField(max_length=12, null=True, blank=True)
    overall_water_flow_condition = models.CharField(max_length=12, null=True, blank=True)
    node_count = models.PositiveSmallIntegerField(default=0)
    reading_count = models.PositiveIntegerField(default=0)
    peak_clog_pct = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = 'tbl_report_purok_rows'
        ordering = ['purok']
        unique_together = ('report', 'purok')