"""Deletes everything seed_alerts.py created (the alerts and the health logs made for them)."""
from mock_common import revert

revert('alerts_b27')
