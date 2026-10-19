import logging

from django.utils import timezone

from apps.sensor_readings.models import SensorReading
from .models import SensorNode
from .serializers import get_online_window_seconds
from .signals import _fire_if_not_on_cooldown

logger = logging.getLogger(__name__)


def create_node_offline_alerts():
    """
    Node_Offline = no reading for longer than 2 x (expected interval) + 120s.
    The window comes from get_online_window_seconds(), the same formula
    that drives the is_online flag, so alert and badge always agree.
    """
    now = timezone.now()
    nodes = SensorNode.objects.filter(
        availability_status='Occupied', status='Active'
    ).select_related('barangay')

    for node in nodes:
        # admin-commanded deep sleep is not an outage
        if node.forced_sleep_until and node.forced_sleep_until > now:
            continue

        recent = list(SensorReading.objects.filter(node=node).order_by('-timestamp')[:2])
        if not recent:
            continue  # never reported yet, nothing to be "late" against

        last_seen = recent[0].timestamp
        # after a forced sleep ends, the node needs a window to wake and report
        if node.forced_sleep_until and node.forced_sleep_until > last_seen:
            last_seen = node.forced_sleep_until

        window = get_online_window_seconds(node, recent)
        if (now - last_seen).total_seconds() > window:
            logger.info("Node %s silent past %ss window, raising Node_Offline", node.node_id, window)
            _fire_if_not_on_cooldown(node, None, 'Node_Offline')