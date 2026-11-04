"""Creates one report per status for barangay 27: Submitted (from a clog event), Submitted (from a
weekly cleanup), Draft, Awaiting Post-Report and Verified. Undo with revert_report_statuses.py.

The two submitted reports are not attached to a half-month period submission, so they do not
mark the current period as already sent."""
import mock_common  # noqa: F401  (first, so Django is set up before any apps.* import)
from datetime import timedelta

from django.utils import timezone

from apps.reports.models import CanalMonitoringReport
from mock_common import (
    TAG, Manifest, build_event, create, get_barangay, get_nodes, get_reporter, get_signatories,
    report_from_event, weekly_report,
)

NAME = 'report_statuses_b27'

manifest = Manifest(NAME)
manifest.begin()
try:
    barangay = get_barangay()
    nodes = get_nodes(barangay)
    reporter = get_reporter(barangay)
    signatories = get_signatories(barangay)
    now = timezone.now()
    node = lambda i: nodes[i % len(nodes)]

    # 1. Submitted, from a clog event
    built = build_event(manifest, node(0), now - timedelta(days=3, hours=2), 86, 'Responded',
                        response_minutes=50, responded_by=reporter)
    r = report_from_event(
        manifest, barangay, reporter, built, 'Submitted', is_submitted=True,
        submitted_at=now - timedelta(days=1), signatory_snapshot=signatories,
        verified_by=reporter, verified_at=now - timedelta(days=2),
    )
    print(f'Submitted (clog event): report {r.report_id}')

    # 2. Submitted, from a weekly cleanup
    r = weekly_report(
        manifest, barangay, reporter, nodes, now - timedelta(days=2), 'Submitted',
        is_submitted=True, submitted_at=now - timedelta(days=1), signatory_snapshot=signatories,
        verified_by=reporter, verified_at=now - timedelta(days=1, hours=2),
    )
    print(f'Submitted (weekly): report {r.report_id}')

    # 3. Draft: started by hand and left unfinished
    r = create(
        manifest, CanalMonitoringReport, created_at=now - timedelta(hours=1),
        barangay=barangay, reported_by=reporter, status='Draft', condition_source='Manual',
        report_scope='Purok', purok=node(2).hotspot.purok or 1,
        date_observed=now - timedelta(hours=3), severity='Low', overall_water_level='Moderate',
        waste_plastic_kg=1.5, remarks=f'{TAG} draft left unfinished',
    )
    print(f'Draft: report {r.report_id}')

    # 4. Waiting for the post-clearing canal report: responded, but the after-cleanup part is empty
    built = build_event(manifest, node(1), now - timedelta(hours=5), 72, 'Responded',
                        response_minutes=40, responded_by=reporter)
    r = report_from_event(manifest, barangay, reporter, built, 'Awaiting_Post_Report')
    print(f'Awaiting post-report: report {r.report_id}')

    # 5. Verified: complete and locked, waiting to be sent to MENRO
    built = build_event(manifest, node(2), now - timedelta(hours=26), 79, 'Responded',
                        response_minutes=35, responded_by=reporter)
    r = report_from_event(manifest, barangay, reporter, built, 'Verified',
                          verified_by=reporter, verified_at=now - timedelta(hours=2))
    print(f'Verified: report {r.report_id}')
finally:
    manifest.save()
print('Done. Run revert_report_statuses.py to remove it.')
