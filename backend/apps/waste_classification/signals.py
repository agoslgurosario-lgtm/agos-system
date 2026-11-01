from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import WasteClassification
from .serializers import WasteClassificationSerializer
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


@receiver(post_save, sender=WasteClassification)
def link_classification_to_clog_event(sender, instance, created, **kwargs):
    if not created:
        return

    from apps.clog_events.models import ClogEvent

    # Find the most recent open ClogEvent for this node
    # that doesn't have a classification linked yet
    open_event = ClogEvent.objects.filter(
        node=instance.node,
        status__in=['Detected', 'Responded'],
        settled_at__isnull=True,
        classification__isnull=True
    ).order_by('-detected_at').first()

    if open_event:
        open_event.classification = instance
        open_event.save()


@receiver(post_save, sender=WasteClassification)
def broadcast_new_waste_classification(sender, instance, created, **kwargs):
    if not created:
        return

    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "waste_classification",
        {"type": "waste_message", "waste": WasteClassificationSerializer(instance).data}
    )