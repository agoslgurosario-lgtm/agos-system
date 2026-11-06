"""Creates alerts for barangay 27: the four node health alerts (Node Offline, Low Battery, Weak
Signal, Sensor Failure) and the two report reminders (Report Due Soon, Report Overdue).
Undo with revert_alerts.py.

The alerts are inserted directly, so they do not send push notifications or websocket updates.
Refresh the page to see them. The health logs made for them become each node's latest health
reading until a real one arrives."""
import mock_common  # noqa: F401  (first, so Django is set up before any apps.* import)
from datetime import timedelta

from django.utils import timezone

from apps.alerts.models import Alert
from apps.reports.periods import period_for, period_label, previous_period
from apps.sensor_nodes.models import SystemHealthLog
from mock_common import Manifest, create, get_barangay, get_nodes

NAME = 'alerts_b27'

# (alert type, health log values, minutes ago)
HEALTH_ALERTS = [
    ('Node_Offline', dict(battery_voltage=3.7, signal_strength=-85, sensor_continuity=True, status='Warning'), 45),
    ('Low_Battery', dict(battery_voltage=3.05, signal_strength=-78, sensor_continuity=True, status='Critical'), 30),
    ('Weak_Signal', dict(battery_voltage=3.9, signal_strength=-96, sensor_continuity=True, status='Warning'), 20),
    ('Sensor_Failure', dict(battery_voltage=3.8, signal_strength=-80, sensor_continuity=False, status='Critical'), 10),
]

manifest = Manifest(NAME)
manifest.begin()
try:
    barangay = get_barangay()
    nodes = get_nodes(barangay)
    now = timezone.now()
    today = timezone.localdate()

    # node health alerts: tied to a node, so they reach the barangay that owns it
    for i, (alert_type, health, minutes_ago) in enumerate(HEALTH_ALERTS):
        node = nodes[i % len(nodes)]
        when = now - timedelta(minutes=minutes_ago)
        log = create(manifest, SystemHealthLog, checked_at=when, node=node,
                     firmware_version='1.0.0', **health)
        # the real Node Offline alert has no health log (the node went silent), so it has none here
        create(manifest, Alert, timestamp=when, node=node, alert_type=alert_type,
               health_log=None if alert_type == 'Node_Offline' else log)
        print(f'{alert_type}: {node}')

    # report reminders: belong to the barangay itself
    def reminder(alert_type, start, end, due, minutes_ago):
        create(
            manifest, Alert, timestamp=now - timedelta(minutes=minutes_ago),
            barangay=barangay, alert_type=alert_type,
            alert_context={
                'period_start': start.isoformat(), 'period_end': end.isoformat(),
                'due_date': due.isoformat(), 'period_label': period_label(start, end),
                'ready_count': 4, 'unverified_count': 2,
            },
        )
        print(f'{alert_type}: {period_label(start, end)}, due {due}')

    start, end, due = period_for(today)
    reminder('Report_Due_Soon', start, end, due, 5)
    start, end, due = previous_period(start)
    reminder('Report_Overdue', start, end, due, 2)
finally:
    manifest.save()
print('Done. Run revert_alerts.py to remove it.')
