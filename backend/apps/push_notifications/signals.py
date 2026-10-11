import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.alerts.models import Alert
from .services import notify_alert

logger = logging.getLogger(__name__)


def _safe_notify(alert):
    try:
        notify_alert(alert)
    except Exception:
        logger.exception('Push notify failed')  # never let push break alert creation


@receiver(post_save, sender=Alert)
def push_new_alert(sender, instance, created, **kwargs):
    if not created:
        return
    transaction.on_commit(lambda: _safe_notify(instance))