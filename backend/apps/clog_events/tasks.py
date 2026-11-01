import logging
from datetime import timedelta

from django.utils import timezone

from .models import ClogEvent

logger = logging.getLogger(__name__)

# How long an event can keep absorbing readings before the system closes it.
# Separate from a genuine clear-streak resolution (the number of consecutive
# normal readings is set in Settings). See auto_cleared and settled_at on ClogEvent.
AUTO_CLEAR_AFTER = timedelta(days=7)


def auto_clear_stale_clog_events():
    """
    Closes events that have been open longer than AUTO_CLEAR_AFTER,
    measured from detected_at:

      - Detected: nobody responded, so it is force-cleared (status Cleared,
        auto_cleared=True) and the node can get a new event if it clogs again.
      - Responded: the barangay already responded and the event counts as
        cleared, so its status is kept. It is only marked settled, so it stops
        absorbing readings and a new clog creates a new event.

    This does NOT confirm the clog is gone in real life.
    """
    cutoff = timezone.now() - AUTO_CLEAR_AFTER

    stale_events = ClogEvent.objects.filter(
        status__in=['Detected', 'Responded'],
        settled_at__isnull=True,
        detected_at__lte=cutoff,
    )

    cleared = settled = 0
    for event in stale_events:
        now = timezone.now()
        event.settled_at = now
        if event.status == 'Detected':
            event.status = 'Cleared'
            event.resolved_at = now
            event.auto_cleared = True
            cleared += 1
        else:
            settled += 1
        event.save()

    # events reopened for a redo (their report was voided) that nobody redid within the window
    abandoned = 0
    for event in ClogEvent.objects.filter(status='Detected', reopened_at__isnull=False, reopened_at__lte=cutoff):
        now = timezone.now()
        event.status = 'Cleared'
        event.resolved_at = now
        event.auto_cleared = True
        event.save()
        abandoned += 1

    if abandoned:
        logger.info(f"{abandoned} reopened clog events auto-cleared (the report was not redone).")

    if cleared or settled:
        logger.info(
            f"Stale clog events older than {AUTO_CLEAR_AFTER}: "
            f"{cleared} auto-cleared, {settled} responded events settled."
        )