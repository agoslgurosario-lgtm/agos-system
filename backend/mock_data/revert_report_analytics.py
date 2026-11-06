"""Deletes everything seed_report_analytics.py created (reports, period submissions, events,
readings, node summaries and purok rows)."""
from mock_common import revert

revert('report_analytics_b27')
