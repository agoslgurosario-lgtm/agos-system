from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.sensor_nodes.models import SensorNode
from apps.sensor_readings.models import SensorReading
from apps.sensor_readings.services import get_clog_severity
from .models import ReportNodeSummary

# the reading that triggers an event is saved just before the event is created
WINDOW_MARGIN = timedelta(minutes=2)
# a whole-barangay cleanup looks at the week up to the cleanup
CLEANUP_WINDOW = timedelta(days=7)

STATUS_RANK = {'Normal': 0, 'Warning': 1, 'Critical': 2}
FLOW_RANK = {'Normal': 0, 'Slow': 1, 'Stagnant': 2}

# the report's own choices, lowest to highest
WATER_RANK = {'Low': 0, 'Moderate': 1, 'High': 2}
OBSTRUCTION_RANK = {'Under_25': 0, '25_50': 1, '50_75': 2, 'Over_75': 3}
FLOW_CHOICE_RANK = {'Normal': 0, 'Reduced': 1, 'Blocked': 2}

# the mapping from sensor values to the report's own choices (change here)
WATER_LEVEL_FROM_STATUS = {'Normal': 'Low', 'Warning': 'Moderate', 'Critical': 'High'}
FLOW_FROM_READING = {'Normal': 'Normal', 'Slow': 'Reduced', 'Stagnant': 'Blocked'}
# STORED values, not labels: the report keeps 'Medium' and the apps show it as "Moderate"
SEVERITY_FROM_CLOG = {'High': 'Critical', 'Medium': 'Medium', 'Low': 'Low'}
SEVERITY_FROM_OBSTRUCTION = {'Over_75': 'Critical', '50_75': 'Medium'}   # anything lower is 'Low'


def obstruction_band(pct):
    if pct is None:
        return None
    if pct >= 75:
        return 'Over_75'
    if pct >= 50:
        return '50_75'
    if pct >= 25:
        return '25_50'
    return 'Under_25'


def worst(values, rank):
    vals = [v for v in values if v]
    return max(vals, key=lambda v: rank.get(v, 0)) if vals else None


NODE_STAT_FIELDS = [
    'reading_count', 'peak_clog_pct', 'avg_clog_pct', 'peak_water_level_cm',
    'peak_water_level_pct', 'min_flow_rate', 'worst_water_status', 'worst_flow',
]
NODE_SUMMARY_FIELDS = ['window_start', 'window_end'] + NODE_STAT_FIELDS


def summarize_readings(readings, depth=None):
    """Numbers and mapped report choices for a list of readings (must not be empty)."""
    clog = [r.clog_pct for r in readings if r.clog_pct is not None]
    levels = [r.water_level for r in readings if r.water_level is not None]
    rates = [r.water_flow_rate for r in readings if r.water_flow_rate is not None]
    worst_status = max((r.reading_status for r in readings), key=lambda s: STATUS_RANK.get(s, 0))
    worst_flow = max((r.water_flow for r in readings), key=lambda s: FLOW_RANK.get(s, 0))
    peak_level = max(levels) if levels else None
    peak_clog = max(clog) if clog else None
    return {
        'reading_count': len(readings),
        'peak_clog_pct': peak_clog,
        'avg_clog_pct': round(sum(clog) / len(clog), 1) if clog else None,
        'peak_water_level_cm': peak_level,
        'peak_water_level_pct': round(peak_level / depth * 100, 1) if (peak_level is not None and depth) else None,
        'min_flow_rate': min(rates) if rates else None,
        'worst_water_status': worst_status,
        'worst_flow': worst_flow,
        # mapped to the report's own choices
        'overall_water_level': WATER_LEVEL_FROM_STATUS.get(worst_status),
        'overall_obstruction_coverage': obstruction_band(peak_clog),
        'overall_water_flow_condition': FLOW_FROM_READING.get(worst_flow),
    }


# clog event reports

def build_event_summary(event):
    """The node's readings from detection until the response (or until it settled).
    None if there are none."""
    start = event.detected_at - WINDOW_MARGIN
    end = event.responded_at or event.settled_at or timezone.now()
    readings = list(
        SensorReading.objects.filter(node=event.node, timestamp__gte=start, timestamp__lte=end)
        .order_by('timestamp')
    )
    if not readings:
        return None
    hotspot = getattr(event.node, 'hotspot', None)
    summary = summarize_readings(readings, getattr(hotspot, 'canal_depth', None))
    summary['window_start'] = start
    summary['window_end'] = end
    return summary


def peak_waste_kg(node, start, end):
    """The most waste (kg) the AI saw on this node's canal during the window: the highest single
    estimate, not a sum, because every reading re-estimates the same pile. None if it saw nothing."""
    from django.db.models import Max
    from apps.waste_classification.models import WasteClassification

    if node is None or start is None or end is None:
        return None
    best = WasteClassification.objects.filter(
        node=node, timestamp__gte=start, timestamp__lte=end,
    ).aggregate(m=Max('estimated_volume'))['m']
    return round(best, 2) if best is not None else None


@transaction.atomic
def apply_event_summary(report, event, summary):
    """Write the fetched condition into the report and keep the node's own numbers."""
    hotspot = getattr(event.node, 'hotspot', None)

    report.overall_water_level = summary['overall_water_level']
    report.overall_obstruction_coverage = summary['overall_obstruction_coverage']
    report.overall_water_flow_condition = summary['overall_water_flow_condition']
    report.condition_source = 'Sensor'
    level = get_clog_severity(summary['peak_clog_pct']) or event.first_severity or event.severity
    report.severity = SEVERITY_FROM_CLOG.get(level, report.severity)
    if getattr(hotspot, 'purok', None):
        report.purok = hotspot.purok

    ReportNodeSummary.objects.filter(report=report).delete()
    row = ReportNodeSummary.objects.create(
        report=report,
        node=event.node,
        hotspot=hotspot,
        node_name=event.node.node_name or f"Node {event.node_id}",
        hotspot_name=getattr(hotspot, 'name', '') or '',
        purok=getattr(hotspot, 'purok', None),
        **{k: summary[k] for k in NODE_SUMMARY_FIELDS},
    )
    row.peak_waste_kg = peak_waste_kg(row.node, row.window_start, row.window_end)
    row.save(update_fields=['peak_waste_kg'])


# whole-barangay reports

def purok_nodes(barangay, purok):
    """Active nodes whose hotspot sits in this purok of this barangay."""
    return list(
        SensorNode.objects
        .filter(barangay=barangay, hotspot__purok=purok, hotspot__is_active=True)
        .exclude(status='Inactive')
        .select_related('hotspot')
    )


def build_purok_condition(barangay, purok, start, end):
    """What the sensors in one purok recorded between start and end.
    aggregate is None when no node there has readings (the barangay enters it by hand)."""
    nodes = purok_nodes(barangay, purok)
    per_node, all_readings = [], []
    for node in nodes:
        readings = list(
            SensorReading.objects.filter(node=node, timestamp__gte=start, timestamp__lte=end)
            .order_by('timestamp')
        )
        if not readings:
            continue
        per_node.append((node, summarize_readings(readings, getattr(node.hotspot, 'canal_depth', None))))
        all_readings.extend(readings)
    return {
        'purok': purok,
        'nodes': nodes,
        'per_node': per_node,
        'aggregate': summarize_readings(all_readings) if all_readings else None,   # worst across the purok's nodes
    }