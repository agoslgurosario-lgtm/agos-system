"""Deletes everything seed_clog_events.py created (events, readings, waste classifications)."""
from mock_common import revert

revert('clog_events_b27')
