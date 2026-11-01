from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.barangay.models import Barangay
from .models import RainfallCondition


@receiver(post_save, sender=Barangay)
def create_rainfall_condition_on_registration(sender, instance, created, **kwargs):
    if instance.is_registered and instance.is_active:
        RainfallCondition.objects.get_or_create(barangay=instance)