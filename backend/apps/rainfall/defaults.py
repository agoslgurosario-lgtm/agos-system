# The factory values for the alert thresholds. "Reset to default" restores exactly these.
# Change them here, and only here, if the defaults ever change.
CONDITION_ORDER = ['None', 'Yellow', 'Orange', 'Red', 'Unknown']

DEFAULT_ALERT_THRESHOLDS = {
    'None':    {'warning_pct': 35.0, 'critical_pct': 45.0, 'reading_interval_seconds': 1800, 'clear_streak_count': 5},
    'Yellow':  {'warning_pct': 35.0, 'critical_pct': 45.0, 'reading_interval_seconds': 240,  'clear_streak_count': 7},
    'Orange':  {'warning_pct': 24.6, 'critical_pct': 31.7, 'reading_interval_seconds': 120,  'clear_streak_count': 15},
    'Red':     {'warning_pct': 17.5, 'critical_pct': 22.5, 'reading_interval_seconds': 60,   'clear_streak_count': 30},
    'Unknown': {'warning_pct': 25.7, 'critical_pct': 33.1, 'reading_interval_seconds': 205,  'clear_streak_count': 9},
}