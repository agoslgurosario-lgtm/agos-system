from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Alert, BARANGAY_ONLY_ALERT_TYPES
from .consumers import ALERTS_STAFF_GROUP, barangay_group
from .serializers import AlertSerializer


def alert_barangay_id(alert):
    """Barangay this alert belongs to (None for e.g. an unassigned node)."""
    if alert.alert_type in BARANGAY_ONLY_ALERT_TYPES:
        return alert.barangay_id
    return alert.node.barangay_id if alert.node else None


def build_alert_payload(alert):
    serializer = AlertSerializer(alert, context={})
    return {
        'alert_id': alert.alert_id,
        'alert_type': alert.alert_type,
        'node_name': serializer.get_node_name(alert),
        'barangay_name': serializer.get_barangay_name(alert),
        'barangay_id': alert_barangay_id(alert),
        'timestamp': alert.timestamp.isoformat(),
        'is_read': False,  # a brand-new alert has no reads yet
        'alert_context': serializer.get_alert_context(alert),
    }


@receiver(post_save, sender=Alert)
def broadcast_new_alert(sender, instance, created, **kwargs):
    if not created:
        return  # only broadcast on creation, not on updates (e.g. mark-as-read)

    bid = alert_barangay_id(instance)
    groups = []
    if instance.alert_type in BARANGAY_ONLY_ALERT_TYPES:
        if bid:
            groups = [barangay_group(bid)]       # that barangay only
    else:
        groups = [ALERTS_STAFF_GROUP] 
        if instance.alert_type != 'Report_Submitted' and bid:
            groups.append(barangay_group(bid))   # plus the barangay that owns the node

    if not groups:
        return

    channel_layer = get_channel_layer()
    message = {"type": "alert_message", "alert": build_alert_payload(instance)}
    for group in groups:
        async_to_sync(channel_layer.group_send)(group, message)