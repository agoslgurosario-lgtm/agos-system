from calendar import monthrange
from datetime import timedelta

from django.utils import timezone


def period_for(d):
    """The period a date belongs to, as (start, end, due).
    1st-15th is due on the 15th. 16th-30th is due on the 30th (the last day in February).
    The 31st rolls into the next period."""
    if d.day == 31:
        d = d + timedelta(days=1)
    if d.day <= 15:
        start, end = d.replace(day=1), d.replace(day=15)
    else:
        last = monthrange(d.year, d.month)[1]
        start, end = d.replace(day=16), d.replace(day=min(30, last))
    return start, end, end


def previous_period(start):
    """The period right before the one that starts on `start`."""
    d = start - timedelta(days=1)
    if d.day == 31:
        d -= timedelta(days=1)    # the 31st belongs to the next period, so step back to the 30th
    return period_for(d)


def recent_periods(count=4, today=None):
    """The current period first, then the ones before it."""
    out = [period_for(today or timezone.localdate())]
    while len(out) < count:
        out.append(previous_period(out[-1][0]))
    return out


def report_date(report):
    """The (Philippine) date a report counts for."""
    return timezone.localtime(report.date_responded or report.created_at).date()


def grace_end(period_end):
    """A missed deadline stays open for a late submission until the next period's deadline."""
    return period_for(period_end + timedelta(days=1))[2]


def period_status(period_end, due, today, submitted):
    """Submitted / Open (before or on the deadline) / Overdue (late but still allowed) / Missed (closed)."""
    if submitted:
        return 'Submitted'
    if today <= due:
        return 'Open'
    if today <= grace_end(period_end):
        return 'Overdue'
    return 'Missed'


def period_label(start, end):
    return f"{start:%b} {start.day}-{end.day}"