from datetime import timedelta
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import SystemHealthLog
from apps.alerts.models import Alert

# Single-cell Li-ion discharge curve used app-wide (matches frontend getBatteryPct):
# 3.0V = 0% (empty), 3.6V = 50% (half), 4.2V = 100% (full)
BATTERY_EMPTY_V = 3.0
BATTERY_FULL_V = 4.2
LOW_BATTERY_PCT_THRESHOLD = 25  # = 3.3V on the 3.0–4.2V scale, matches firmware's Warning line exactly

HEALTH_ALERT_COOLDOWN = timedelta(hours=1)


def get_battery_pct(voltage):
    pct = ((voltage - BATTERY_EMPTY_V) / (BATTERY_FULL_V - BATTERY_EMPTY_V)) * 100
    return max(0, min(100, pct))


def _fire_if_not_on_cooldown(node, health_log, alert_type):
    last_alert = Alert.objects.filter(
        node=node, alert_type=alert_type
    ).order_by('-timestamp').first()

    if last_alert is not None and (timezone.now() - last_alert.timestamp) < HEALTH_ALERT_COOLDOWN:
        return  # still within the last hour's alert for this node+type — skip

    Alert.objects.create(node=node, health_log=health_log, alert_type=alert_type)


@receiver(post_save, sender=SystemHealthLog)
def create_health_alert(sender, instance, created, **kwargs):
    if not created:
        return

    if instance.battery_voltage is not None and get_battery_pct(instance.battery_voltage) < LOW_BATTERY_PCT_THRESHOLD:
        _fire_if_not_on_cooldown(instance.node, instance, 'Low_Battery')

    if instance.signal_strength is not None and instance.signal_strength < -90:
        _fire_if_not_on_cooldown(instance.node, instance, 'Weak_Signal')

    if instance.sensor_continuity is False:
        _fire_if_not_on_cooldown(instance.node, instance, 'Sensor_Failure')

    if instance.status == 'Critical':
        _fire_if_not_on_cooldown(instance.node, instance, 'Node_Offline')