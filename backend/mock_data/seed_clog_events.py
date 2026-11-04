"""Creates clog events (with the sensor readings and AI waste classifications behind them)
for barangay 27, spread over the last week. Undo with revert_clog_events.py."""
from datetime import timedelta

from django.utils import timezone

from mock_common import Manifest, build_event, get_barangay, get_nodes, get_reporter, has_open_event

NAME = 'clog_events_b27'

# (hours ago the clog began, peak clog %, final status)
SCENARIOS = [
    (1.5, 88, 'Detected'),    # still open right now
    (20, 66, 'Responded'),
    (30, 42, 'Cleared'),
    (72, 91, 'Responded'),
    (120, 63, 'Cleared'),
    (168, 38, 'Cleared'),
]

manifest = Manifest(NAME)
manifest.begin()
try:
    barangay = get_barangay()
    nodes = get_nodes(barangay)
    reporter = get_reporter(barangay)
    now = timezone.now()

    for i, (hours_ago, peak, status) in enumerate(SCENARIOS):
        node = nodes[i % len(nodes)]
        if status == 'Detected' and has_open_event(node):
            print(f'Skipped the open event: {node} already has one.')
            continue
        built = build_event(manifest, node, now - timedelta(hours=hours_ago), peak, status,
                            responded_by=reporter)
        print(f"Event {built['event'].event_id}: {node} - {status}, peak {peak}%, "
              f"{len(built['readings'])} readings")
finally:
    manifest.save()
print('Done. Run revert_clog_events.py to remove it.')
