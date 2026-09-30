from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Alert
from .consumers import ALERTS_GROUP, ALERTS_STAFF_GROUP
from .serializers import AlertSerializer


def build_alert_payload(alert):
    serializer = AlertSerializer(alert, context={})
    return {
        'alert_id': alert.alert_id,
        'alert_type': alert.alert_type,
        'node_name': serializer.get_node_name(alert),
        'barangay_name': serializer.get_barangay_name(alert),
        'timestamp': alert.timestamp.isoformat(),
        'is_read': False,  # a brand-new alert has no reads yet
        'alert_context': serializer.get_alert_context(alert),
    }


@receiver(post_save, sender=Alert)
def broadcast_new_alert(sender, instance, created, **kwargs):
    if not created:
        return  # only broadcast on creation, not on updates (e.g. mark-as-read)

    channel_layer = get_channel_layer()
    # Report_Submitted is staff-only — the filing barangay doesn't need to be told
    # about its own submission. Everything else keeps going to everyone, unchanged.
    group = ALERTS_STAFF_GROUP if instance.alert_type == 'Report_Submitted' else ALERTS_GROUP
    async_to_sync(channel_layer.group_send)(
        group,
        {"type": "alert_message", "alert": build_alert_payload(instance)}
    )