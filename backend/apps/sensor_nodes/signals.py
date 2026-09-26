from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import SystemHealthLog
from apps.alerts.models import Alert

# Single-cell Li-ion discharge curve used app-wide (matches frontend getBatteryPct):
# 3.0V = 0% (empty), 3.6V = 50% (half), 4.2V = 100% (full)
BATTERY_EMPTY_V = 3.0
BATTERY_FULL_V = 4.2
LOW_BATTERY_PCT_THRESHOLD = 25  # = 3.3V on the 3.0–4.2V scale, matches firmware's Warning line exactly


def get_battery_pct(voltage):
    pct = ((voltage - BATTERY_EMPTY_V) / (BATTERY_FULL_V - BATTERY_EMPTY_V)) * 100
    return max(0, min(100, pct))


@receiver(post_save, sender=SystemHealthLog)
def create_health_alert(sender, instance, created, **kwargs):
    if not created:
        return

    # Battery voltage — below 25% capacity on the 3.0V–4.2V scale
    if instance.battery_voltage is not None and get_battery_pct(instance.battery_voltage) < LOW_BATTERY_PCT_THRESHOLD:
        Alert.objects.create(node=instance.node, health_log=instance, alert_type='Low_Battery')

    # Signal strength (RSSI — more negative = weaker)
    if instance.signal_strength is not None and instance.signal_strength < -90:
        Alert.objects.create(node=instance.node, health_log=instance, alert_type='Weak_Signal')

    # Sensor continuity
    if instance.sensor_continuity is False:
        Alert.objects.create(node=instance.node, health_log=instance, alert_type='Sensor_Failure')

    # Node status
    if instance.status == 'Critical':
        Alert.objects.create(node=instance.node, health_log=instance, alert_type='Node_Offline')