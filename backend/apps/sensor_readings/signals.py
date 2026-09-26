from datetime import timedelta

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import SensorReading
from apps.clog_events.models import ClogEvent
from apps.alerts.models import Alert

from apps.rainfall.services import get_effective_condition
from apps.rainfall.models import AlertThreshold

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .serializers import SensorReadingSerializer

from apps.sensor_readings.services import evaluate_clog


def get_clear_streak_count(barangay):
    condition = get_effective_condition(barangay) if barangay else 'None'
    try:
        return AlertThreshold.objects.get(condition=condition).clear_streak_count
    except AlertThreshold.DoesNotExist:
        return 5  # safe fallback

CLOG_PCT_THRESHOLDS = {
    'High':   80,
    'Medium': 60,
    'Low':    30,
}

CLOG_SEVERITY_RANK = {
    'Low': 1,
    'Medium': 2,
    'High': 3,
}

WATER_LEVEL_SEVERITY_RANK = {
    'Normal':   0,
    'Warning':  1,
    'Critical': 2,
}

WATER_LEVEL_COOLDOWN = timedelta(hours=1)
CLOG_ALERT_COOLDOWN = timedelta(hours=1)


def get_clog_severity(clog_pct):
    if clog_pct is None:
        return None
    if clog_pct >= CLOG_PCT_THRESHOLDS['High']:
        return 'High'
    if clog_pct >= CLOG_PCT_THRESHOLDS['Medium']:
        return 'Medium'
    if clog_pct >= CLOG_PCT_THRESHOLDS['Low']:
        return 'Low'
    return None


WATER_LEVEL_RISING_SAMPLE_SIZE = 5

def is_water_level_trending_up(node, current_instance):
    """
    Looks at the 5 most recent readings *before* the current one for this
    node. Fires as 'rising' only if the newest of those 5 is higher than
    the oldest of those 5. If fewer than 5 prior readings exist yet,
    falls back to trusting the single reading (not enough history to judge).
    """
    prior_readings = list(
        SensorReading.objects
        .filter(node=node)
        .exclude(pk=current_instance.pk)
        .order_by('-timestamp')
        .values_list('water_level', flat=True)[:WATER_LEVEL_RISING_SAMPLE_SIZE]
    )

    if len(prior_readings) < WATER_LEVEL_RISING_SAMPLE_SIZE:
        return True

    prior_readings.reverse()  # oldest -> newest
    oldest = prior_readings[0]
    newest = prior_readings[-1]

    return newest > oldest


@receiver(post_save, sender=SensorReading)
def handle_abnormal_reading(sender, instance, created, **kwargs):
    if not created:
        return

    # --- Water_Level_Rising ---------------------------------------
    if instance.reading_status in ('Warning', 'Critical'):
        if not is_water_level_trending_up(instance.node, instance):
            return 
        
        last_alert = Alert.objects.filter(
            node=instance.node,
            alert_type='Water_Level_Rising',
        ).order_by('-timestamp').first()

        should_alert = False
        if last_alert is None:
            should_alert = True
        else:
            cooldown_expired = (timezone.now() - last_alert.timestamp) >= WATER_LEVEL_COOLDOWN
            last_severity = last_alert.alert_context.get('severity', 'Warning')
            is_escalation = (
                WATER_LEVEL_SEVERITY_RANK.get(instance.reading_status, 0)
                > WATER_LEVEL_SEVERITY_RANK.get(last_severity, 0)
            )
            should_alert = cooldown_expired or is_escalation

        if should_alert:
            Alert.objects.create(
                node=instance.node,
                alert_type='Water_Level_Rising',
                alert_context={
                    'severity':        instance.reading_status,
                    'water_level':     instance.water_level,
                    'water_flow_rate': instance.water_flow_rate,
                    'water_flow':      instance.water_flow,
                }
            )

    # --- ClogEvent ---------------------------------------------------
    from apps.sensor_readings.services import evaluate_clog
    evaluate_clog(instance)


@receiver(post_save, sender=SensorReading)
def broadcast_new_reading(sender, instance, created, **kwargs):
    if not created:
        return

    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "sensor_readings",
        {"type": "reading_message", "reading": SensorReadingSerializer(instance).data}
    )