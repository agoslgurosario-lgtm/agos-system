from django.utils import timezone
from django.db.models import Q

from .models import SensorReading
from apps.clog_events.models import ClogEvent
from apps.alerts.models import Alert
from apps.rainfall.services import get_effective_condition
from apps.rainfall.models import AlertThreshold


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

CLOG_ALERT_COOLDOWN = timezone.timedelta(hours=1)

CLOG_ALERT_TYPE_BY_SEVERITY = {
    'Low':    'Low_Clog_Alert',
    'Medium': 'Moderate_Clog_Alert',
    'High':   'Critical_Clog',
}


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


STATUS_RANK = {'Normal': 0, 'Warning': 1, 'Critical': 2}
RANK_TO_STATUS = {v: k for k, v in STATUS_RANK.items()}


def get_clog_status(clog_pct):
    """
    Clog % -> Normal / Warning / Critical, using the SAME cutoffs as the
    clog alerts (30 / 60 / 80). Low and Moderate both map to Warning.
    Returns None when there is no clog % yet.
    """
    severity = get_clog_severity(clog_pct)
    if clog_pct is None:
        return None
    if severity == 'High':
        return "Critical"
    if severity in ('Low', 'Medium'):
        return 'Warning'
    return 'Normal'


def get_overall_status(water_status, clog_status):
    """
    Worst of the water-level status and the clog status.
    If one is missing (e.g. clog % not computed yet), use the other.
    """
    ranks = [STATUS_RANK[s] for s in (water_status, clog_status) if s in STATUS_RANK]
    if not ranks:
        return None
    return RANK_TO_STATUS[max(ranks)]


def overall_status_q(status):
    """
    Q filter matching readings whose OVERALL status (worst of water-level
    status and clog status) equals `status`. Mirrors get_overall_status().
    """
    critical = Q(reading_status='Critical') | Q(clog_pct__gte=CLOG_PCT_THRESHOLDS['High'])
    warning = Q(reading_status='Warning') | Q(clog_pct__gte=CLOG_PCT_THRESHOLDS['Low'])

    if status == 'Critical':
        return critical
    if status == 'Warning':
        return warning & ~critical
    if status == 'Normal':
        return ~critical & ~warning
    return Q()


def evaluate_clog(reading):
    """
    Runs clog-event detection / escalation / clear-streak logic for a
    single SensorReading. Extracted from sensor_readings/signals.py so it
    can be called from both:
      - the post_save signal (fires at creation; a no-op today since
        clog_pct is always None at that point for the real MQTT-then-
        frames pipeline — kept for any future path that creates a
        reading with clog_pct already set)
      - SensorReadingWithFlowView.post, right after clog_pct is computed
        and saved — this is the actual point clog_pct becomes meaningful,
        and the fix for the "no clog event ever created" bug.
    No change to the logic itself vs. the original signal — only where
    and when it's called from.
    """
    already_open = ClogEvent.objects.filter(
        node=reading.node,
        status__in=['Detected', 'Responded'],
        settled_at__isnull=True,
    ).first()

    severity = get_clog_severity(reading.clog_pct)

    if severity is None:
        if reading.clog_pct is None:
            return

        if already_open:
            already_open.clear_streak += 1
            required = get_clear_streak_count(already_open.barangay)
            if already_open.clear_streak >= required:
                now = timezone.now()
                already_open.settled_at = now
                if already_open.status == 'Detected':
                    # no response happened: the readings cleared it
                    already_open.status = 'Cleared'
                    already_open.resolved_at = now
                # a Responded event stays Responded; it just stops absorbing readings
            already_open.save()
        return

    if not already_open:
        clog_event = ClogEvent.objects.create(
            node=reading.node,
            barangay=reading.node.barangay,
            severity=severity,
            first_severity=severity,
            peak_severity=severity,
            clear_streak=0,
            status='Detected'
        )
    else:
        clog_event = already_open
        clog_event.clear_streak = 0

        if severity != clog_event.severity:
            clog_event.severity = severity

        if CLOG_SEVERITY_RANK.get(severity, 0) > CLOG_SEVERITY_RANK.get(clog_event.peak_severity, 0):
            clog_event.peak_severity = severity

        clog_event.save()

    last_alert = Alert.objects.filter(
        node=reading.node,
        event=clog_event,
    ).order_by('-timestamp').first()

    re_alert_type = CLOG_ALERT_TYPE_BY_SEVERITY[clog_event.severity]

    should_alert = False
    if last_alert is None:
        should_alert = True
    else:
        cooldown_expired = (timezone.now() - last_alert.timestamp) >= CLOG_ALERT_COOLDOWN
        last_severity = last_alert.alert_context.get('severity', clog_event.severity)
        is_escalation = (
            CLOG_SEVERITY_RANK.get(clog_event.severity, 0)
            > CLOG_SEVERITY_RANK.get(last_severity, 0)
        )
        should_alert = cooldown_expired or is_escalation

    if should_alert:
        Alert.objects.create(
            event=clog_event,
            node=reading.node,
            alert_type=re_alert_type,
            alert_context={'severity': clog_event.severity}
        )

    return clog_event