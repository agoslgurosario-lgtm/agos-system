import logging
from datetime import timedelta

from django.utils import timezone

from apps.alerts.models import Alert
from apps.barangay.models import Barangay

from .models import PeriodSubmission
from .periods import recent_periods, period_status, period_label

logger = logging.getLogger(__name__)

REMIND_DAYS = 2   # 2 days before and 2 days after the deadline


def send_report_reminders(today=None):
    """Daily: remind barangays that still have something to submit for a period.
    Due soon = deadline - 2 days. Overdue = deadline + 2 days. Returns how many alerts were made."""
    from .submission_views import eligible_reports, unverified_count   # local import: avoids a circular import

    today = today or timezone.localdate()
    made = 0
    for start, end, due in recent_periods(4, today):
        if today == due - timedelta(days=REMIND_DAYS):
            kind = 'Report_Due_Soon'
        elif today == due + timedelta(days=REMIND_DAYS):
            kind = 'Report_Overdue'
        else:
            continue
        if period_status(end, due, today, False) not in ('Open', 'Overdue'):
            continue   # a Missed period gets no reminders

        submitted = set(PeriodSubmission.objects.filter(period_start=start).values_list('barangay_id', flat=True))
        for b in Barangay.objects.filter(is_active=True):
            if b.barangay_id in submitted:
                continue
            ready = len(eligible_reports(b, end))
            pending = unverified_count(b, end)
            if Alert.objects.filter(barangay=b, alert_type=kind, alert_context__period_start=start.isoformat()).exists():
                continue   # already reminded for this period
            Alert.objects.create(
                barangay=b, alert_type=kind,
                alert_context={
                    'period_start': start.isoformat(), 'period_end': end.isoformat(),
                    'due_date': due.isoformat(), 'period_label': period_label(start, end),
                    'ready_count': ready, 'unverified_count': pending,
                },
            )
            made += 1
    logger.info("Report reminders sent: %s", made)
    return made