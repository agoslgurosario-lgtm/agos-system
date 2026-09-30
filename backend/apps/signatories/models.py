from django.db import models
from apps.barangay.models import Barangay

POSITION_CHOICES = [
    ('Barangay Secretary', 'Barangay Secretary'),
    ('Chairman Environment', 'Chairman Environment'),
    ('Brgy. Sanitary Inspector', 'Brgy. Sanitary Inspector'),
    ('Punong Barangay', 'Punong Barangay'),
]

STATUS_CHOICES = [
    ('Active', 'Active'),
    ('Inactive', 'Inactive'),
]


class Signatory(models.Model):
    signatory_id = models.AutoField(primary_key=True)
    barangay = models.ForeignKey(Barangay, on_delete=models.CASCADE, related_name='signatories')
    position = models.CharField(max_length=50, choices=POSITION_CHOICES)
    name = models.CharField(max_length=150)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_signatory'
        ordering = ['-created_at']
        constraints = [
            # Enforces "only 1 active signatory per position, per barangay"
            # at the database level — same idea as the single-active-admin rule.
            models.UniqueConstraint(
                fields=['barangay', 'position'],
                condition=models.Q(status='Active'),
                name='unique_active_signatory_per_barangay_position',
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.position} - {self.barangay.barangay_name})"