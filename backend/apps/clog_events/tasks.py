import logging
from datetime import timedelta

from django.utils import timezone

from .models import ClogEvent

logger = logging.getLogger(__name__)

# How long an unresolved clog event (status still Detected/Responded) can
# sit with no human resolution before the system force-clears it. This is
# separate from a genuine clear-streak resolution (5+ consecutive clean
# readings) — see the auto_cleared flag on ClogEvent.
AUTO_CLEAR_AFTER = timedelta(days=7)


def auto_clear_stale_clog_events():
    """
    Force-clears any ClogEvent that's been sitting in Detected/Responded
    for longer than AUTO_CLEAR_AFTER, measured from detected_at. This does
    NOT mean the clog is confirmed gone in real life — it just frees the
    node up to have a new ClogEvent created if conditions clog again,
    instead of staying stuck behind a stale open event nobody responded to.
    """
    cutoff = timezone.now() - AUTO_CLEAR_AFTER

    stale_events = ClogEvent.objects.filter(
        status__in=['Detected', 'Responded'],
        detected_at__lte=cutoff,
    )

    count = 0
    for event in stale_events:
        event.status = 'Cleared'
        event.resolved_at = timezone.now()
        event.auto_cleared = True
        event.save()
        count += 1

    if count:
        logger.info(f"Auto-cleared {count} stale clog event(s) older than {AUTO_CLEAR_AFTER}.")