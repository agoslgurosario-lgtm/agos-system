"""Fills the last 6 completed half-month periods of barangay 27 with submitted reports (clog
reports plus one weekly cleanup per period), period submissions (some late) and node
summaries, so the Report Analytics page has data. Undo with revert_report_analytics.py."""
import mock_common  # noqa: F401  (first, so Django is set up before any apps.* import)
import random
from datetime import timedelta

from django.utils import timezone

from apps.reports.models import PeriodSubmission
from apps.reports.periods import recent_periods
from apps.reports.submission_views import compute_totals
from mock_common import (
    Manifest, at_local, build_event, create, get_barangay, get_nodes, get_reporter, get_signatories,
    report_from_event, weekly_report,
)

NAME = 'report_analytics_b27'
PERIODS = 6

manifest = Manifest(NAME)
manifest.begin()
try:
    barangay = get_barangay()
    nodes = get_nodes(barangay)
    reporter = get_reporter(barangay)
    signatories = get_signatories(barangay)

    # skip the current period (still open) and go back from there
    for idx, (start, end, due) in enumerate(recent_periods(PERIODS + 1)[1:]):
        if PeriodSubmission.objects.filter(barangay=barangay, period_start=start).exists():
            print(f'{start}: already has a real submission, skipped.')
            continue

        late = idx % 3 == 1   # roughly one period in three is sent late
        submitted_at = min(at_local(due + timedelta(days=2 if late else 0), 9, 30), timezone.now())
        days_late = max(0, (submitted_at.date() - due).days)
        submission = create(
            manifest, PeriodSubmission, barangay=barangay, submitted_by=reporter, period_start=start,
            period_end=end, due_date=due, submitted_at=submitted_at,
            is_late=days_late > 0, days_late=days_late, signatory_snapshot=signatories,
        )

        common = dict(is_submitted=True, submitted_at=submitted_at, submission=submission,
                      signatory_snapshot=signatories)
        reports = []
        span = (end - start).days
        for _ in range(random.randint(3, 5)):
            day = start + timedelta(days=random.randint(0, span))
            built = build_event(
                manifest, random.choice(nodes),
                at_local(day, random.randint(5, 19), random.choice([0, 10, 20, 30, 40, 50])),
                random.choice([45, 62, 75, 88, 94]), 'Responded',
                response_minutes=random.randint(15, 150), responded_by=reporter,
            )
            reports.append(report_from_event(
                manifest, barangay, reporter, built, 'Submitted',
                verified_by=reporter, verified_at=built['event'].responded_at + timedelta(hours=2),
                **common,
            ))

        weekly_day = start + timedelta(days=random.randint(2, span))
        reports.append(weekly_report(
            manifest, barangay, reporter, nodes, at_local(weekly_day, 15), 'Submitted',
            verified_by=reporter, verified_at=at_local(weekly_day, 17), **common,
        ))

        PeriodSubmission.objects.filter(pk=submission.pk).update(
            report_count=len(reports), totals=compute_totals(reports),
        )
        print(f'{start} to {end}: {len(reports)} reports, {"late" if days_late else "on time"}')
finally:
    manifest.save()
print('Done. Run revert_report_analytics.py to remove it.')
