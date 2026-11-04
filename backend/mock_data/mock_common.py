"""Shared helpers for the barangay 27 mock-data scripts.

Run the scripts from the backend folder, for example:  python mock_data/seed_clog_events.py
Every row a seed script creates is recorded in mock_data/manifests/<name>.json, and the
matching revert script deletes exactly those rows (and anything that cascades from them).
"""
import json
import os
import random
import sys
from datetime import datetime, time, timedelta
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agos_backend.settings')

import django
django.setup()

from django.apps import apps
from django.db import transaction
from django.utils import timezone

from apps.barangay.models import Barangay
from apps.clog_events.models import ClogEvent
from apps.reports.models import CanalMonitoringReport, ReportNodeSummary, ReportPurokRow
from apps.sensor_nodes.models import SensorNode
from apps.sensor_readings.models import SensorReading
from apps.signatories.models import Signatory
from apps.users.models import User
from apps.waste_classification.models import WasteClassification

BARANGAY_ID = 27
TAG = '[MOCK]'
MANIFEST_DIR = Path(__file__).resolve().parent / 'manifests'

CLOG_TO_REPORT_SEVERITY = {'High': 'Critical', 'Medium': 'Medium', 'Low': 'Low'}
FLOW_RATE = {'Normal': 0.35, 'Slow': 0.12, 'Stagnant': 0.01}   # m/s
WASTE_TYPES = ['Recyclable', 'Biodegradable', 'Residual', 'Special Waste']
PCT_FIELD = {
    'Recyclable': 'recyclable_pct', 'Biodegradable': 'biodegradable_pct',
    'Residual': 'residual_pct', 'Special Waste': 'special_waste_pct',
}
WASTE_FIELDS = [
    'waste_plastic_kg', 'waste_food_wrapper_kg', 'waste_paper_cardboard_kg', 'waste_glass_kg',
    'waste_organic_kg', 'waste_metal_kg', 'waste_foam_kg', 'waste_textile_kg',
    'waste_ewaste_kg', 'waste_sanitary_kg', 'waste_footwear_kg', 'waste_medical_kg',
]
LEVELS = ['Low', 'Moderate', 'High']
COVERAGES = ['Under_25', '25_50', '50_75', 'Over_75']
FLOWS = ['Normal', 'Reduced', 'Blocked']
DEFAULT_SIGNATORIES = {
    'Barangay Secretary': 'Mock Secretary',
    'Chairman Environment': 'Mock Environment Chair',
    'Brgy. Sanitary Inspector': 'Mock Sanitary Inspector',
    'Punong Barangay': 'Mock Punong Barangay',
}


# ---------- tracking what was created ----------
class Manifest:
    """Remembers every row a seed script creates, so the revert script can remove them."""

    def __init__(self, name):
        self.name = name
        self.path = MANIFEST_DIR / f'{name}.json'
        self.items = {}

    def begin(self):
        if self.path.exists():
            raise SystemExit(f'{self.path.name} already exists. Run the matching revert script first.')

    def add(self, obj):
        self.items.setdefault(obj._meta.label, []).append(obj.pk)

    def save(self):
        """Always call this (use try/finally) so a half-finished run can still be reverted."""
        if self.items:
            MANIFEST_DIR.mkdir(exist_ok=True)
            self.path.write_text(json.dumps(self.items, indent=2))


def revert(name):
    path = MANIFEST_DIR / f'{name}.json'
    if not path.exists():
        print(f'Nothing to revert: {path.name} was not found.')
        return
    items = json.loads(path.read_text())
    with transaction.atomic():
        for label in reversed(list(items)):
            model = apps.get_model(label)
            removed = model.objects.filter(pk__in=items[label]).delete()[0]
            print(f'{label}: removed {removed} row(s) (cascades included)')
    path.unlink()
    print('Reverted.')


def create(manifest, model, **fields):
    """Insert one row without firing signals (no websocket broadcast, push notification or
    automatic clog-event / alert logic), then restore any auto_now_add timestamp we passed in."""
    obj = model(**fields)
    model.objects.bulk_create([obj])
    if obj.pk is None:
        raise SystemExit('bulk_create did not return the new id. Use PostgreSQL (or SQLite 3.35+).')
    stamped = {
        f.name: fields[f.name]
        for f in model._meta.fields
        if getattr(f, 'auto_now_add', False) and f.name in fields
    }
    if stamped:
        model.objects.filter(pk=obj.pk).update(**stamped)
        for key, value in stamped.items():
            setattr(obj, key, value)
    manifest.add(obj)
    return obj


# ---------- looking things up ----------
def get_barangay():
    try:
        return Barangay.objects.get(pk=BARANGAY_ID)
    except Barangay.DoesNotExist:
        raise SystemExit(f'Barangay {BARANGAY_ID} does not exist.')


def get_nodes(barangay):
    nodes = list(
        SensorNode.objects.filter(barangay=barangay, hotspot__isnull=False)
        .select_related('hotspot').order_by('node_id')
    )
    if not nodes:
        raise SystemExit(f'Barangay {BARANGAY_ID} has no sensor node with a hotspot. Assign one first.')
    return nodes


def get_reporter(barangay):
    return User.objects.filter(barangay=barangay, user_role='Barangay', is_active=True).first()


def get_signatories(barangay):
    found = {s.position: s.name for s in Signatory.objects.filter(barangay=barangay, status='Active')}
    return found or DEFAULT_SIGNATORIES


def has_open_event(node):
    return ClogEvent.objects.filter(
        node=node, status__in=['Detected', 'Responded'], settled_at__isnull=True
    ).exists()


def at_local(day, hour, minute=0):
    return timezone.make_aware(datetime.combine(day, time(hour, minute)))


# ---------- building clog events with readings ----------
def severity_of(pct):
    return 'High' if pct >= 80 else 'Medium' if pct >= 60 else 'Low'


def node_identity(node):
    return dict(
        node=node, hotspot=node.hotspot,
        node_name=node.node_name or f'Node {node.node_id}',
        hotspot_name=node.hotspot.name, purok=node.hotspot.purok,
    )


def waste_mix(clog_pct):
    """A believable AI classification for one reading."""
    dominant = random.choice(WASTE_TYPES)
    dominant_pct = round(random.uniform(50, 70), 1)
    others = [t for t in WASTE_TYPES if t != dominant]
    cuts = [random.random() + 0.1 for _ in others]
    shares = {t: round((100 - dominant_pct) * c / sum(cuts), 1) for t, c in zip(others, cuts)}
    shares[dominant] = dominant_pct
    return dict(
        dominant_waste_type=dominant,
        none_pct=0,
        confidence=round(random.uniform(0.72, 0.95), 2),
        is_mixed=True,
        present_waste_types=[t for t in WASTE_TYPES if shares[t] > 0],
        estimated_volume=round(clog_pct / 100 * random.uniform(2.5, 4.0), 2),   # kg
        **{PCT_FIELD[t]: shares[t] for t in WASTE_TYPES},
    )


def summarize(node, readings, classes):
    """The per-node numbers a report keeps (same shape as ReportNodeSummary)."""
    depth = node.hotspot.canal_depth or 100.0
    clogs = [r.clog_pct for r in readings]
    levels = [r.water_level for r in readings]
    flows = [r.water_flow_rate for r in readings if r.water_flow_rate is not None]
    status_rank = {'Normal': 0, 'Warning': 1, 'Critical': 2}
    flow_rank = {'Normal': 0, 'Slow': 1, 'Stagnant': 2}
    return dict(
        **node_identity(node),
        window_start=readings[0].timestamp, window_end=readings[-1].timestamp,
        reading_count=len(readings),
        peak_clog_pct=max(clogs), avg_clog_pct=round(sum(clogs) / len(clogs), 1),
        peak_water_level_cm=max(levels), peak_water_level_pct=round(max(levels) / depth * 100, 1),
        peak_waste_kg=max((c.estimated_volume for c in classes), default=None),
        min_flow_rate=min(flows) if flows else None,
        worst_water_status=max((r.reading_status for r in readings), key=status_rank.get),
        worst_flow=max((r.water_flow for r in readings), key=flow_rank.get),
    )


def synthetic_summary(node, when, days=7):
    """Node numbers for a weekly report, which covers a stretch of time rather than one clog."""
    depth = node.hotspot.canal_depth or 100.0
    peak = round(random.uniform(20, 90), 1)
    level = round(depth * random.uniform(0.35, 0.95), 1)
    return dict(
        **node_identity(node),
        window_start=when - timedelta(days=days), window_end=when,
        reading_count=random.randint(80, 400),
        peak_clog_pct=peak, avg_clog_pct=round(peak * random.uniform(0.3, 0.6), 1),
        peak_water_level_cm=level, peak_water_level_pct=round(level / depth * 100, 1),
        peak_waste_kg=round(peak / 100 * random.uniform(2.5, 4.0), 2),
        min_flow_rate=round(random.uniform(0.01, 0.3), 4),
        worst_water_status='Critical' if level / depth >= 0.9 else 'Warning' if level / depth >= 0.7 else 'Normal',
        worst_flow='Stagnant' if peak >= 80 else 'Slow' if peak >= 50 else 'Normal',
    )


def build_event(manifest, node, start, peak_clog_pct, status, ramp=8, tail=3, step_min=10,
                response_minutes=45, responded_by=None):
    """A clog event on `node` with the sensor readings (and AI waste classifications) behind it.

    status: 'Detected' (still open, no tail), 'Responded' (barangay responded, then it cleared)
    or 'Cleared' (cleared by itself). Clog % ramps up to `peak_clog_pct` over `ramp` readings
    (one every `step_min` minutes), then drops back under 30% over `tail` readings."""
    depth = node.hotspot.canal_depth or 100.0
    step = timedelta(minutes=step_min)
    pcts = [round(15 + (peak_clog_pct - 15) * i / (ramp - 1), 1) for i in range(ramp)]
    if status != 'Detected':
        pcts += [round(max(5.0, 24 - 7 * i), 1) for i in range(tail)]

    readings, classes = [], []
    for i, pct in enumerate(pcts):
        when = start + step * i
        level_pct = min(100.0, 25 + pct * 0.75)          # water backs up as the canal clogs
        flow = 'Stagnant' if pct >= 80 else 'Slow' if pct >= 50 else 'Normal'
        reading = create(
            manifest, SensorReading, timestamp=when, node=node,
            water_level=round(depth * level_pct / 100, 1),
            water_flow_rate=round(FLOW_RATE[flow] * random.uniform(0.9, 1.1), 4),
            water_flow=flow,
            reading_status='Critical' if level_pct >= 90 else 'Warning' if level_pct >= 70 else 'Normal',
            clog_pct=pct,
        )
        readings.append(reading)
        if pct >= 30:   # the AI only classifies readings that show a clog
            classes.append(create(manifest, WasteClassification, timestamp=when, node=node,
                                  reading=reading, **waste_mix(pct)))

    detected_idx = next(i for i, p in enumerate(pcts) if p >= 30)
    detected_at = start + step * detected_idx
    last_at = start + step * (len(pcts) - 1)
    fields = dict(
        node=node, barangay=node.barangay, classification=classes[0], status=status,
        severity=severity_of(peak_clog_pct), peak_severity=severity_of(peak_clog_pct),
        first_severity=severity_of(pcts[detected_idx]),
    )
    if status == 'Responded':
        responded_at = detected_at + timedelta(minutes=response_minutes)
        fields.update(responded_at=responded_at, resolved_at=responded_at, responded_by=responded_by,
                      settled_at=max(last_at, responded_at), clear_streak=tail)
    elif status == 'Cleared':
        fields.update(resolved_at=last_at, settled_at=last_at, auto_cleared=True, clear_streak=tail)
    event = create(manifest, ClogEvent, detected_at=detected_at, **fields)

    return dict(
        event=event, node=node, readings=readings, classes=classes,
        summary=summarize(node, readings, classes),
        peak_kg=max(c.estimated_volume for c in classes),
    )


# ---------- building reports ----------
def condition_fields(summary):
    """The report's overall canal condition, worked out from a node summary."""
    water, clog = summary['peak_water_level_pct'], summary['peak_clog_pct']
    return dict(
        overall_water_level='High' if water >= 80 else 'Moderate' if water >= 50 else 'Low',
        overall_obstruction_coverage=(
            'Over_75' if clog >= 75 else '50_75' if clog >= 50 else '25_50' if clog >= 25 else 'Under_25'
        ),
        overall_water_flow_condition={'Normal': 'Normal', 'Slow': 'Reduced', 'Stagnant': 'Blocked'}[summary['worst_flow']],
    )


def waste_fields(total_kg):
    """Spread `total_kg` over 3-5 waste categories."""
    picks = random.sample(WASTE_FIELDS, random.randint(3, 5))
    weights = [random.random() + 0.2 for _ in picks]
    scale = total_kg / sum(weights)
    return {field: round(w * scale, 2) for field, w in zip(picks, weights)}


def report_from_event(manifest, barangay, reporter, built, status, **extra):
    """A clog-event report. 'Awaiting_Post_Report' stops after the response; every other status
    also has the post-clearing canal condition, waste breakdown and node summary filled in."""
    event, node, summary = built['event'], built['node'], built['summary']
    fields = dict(
        barangay=barangay, reported_by=reporter, clog_event=event, status=status,
        report_scope='Purok', purok=node.hotspot.purok,
        date_observed=event.detected_at, date_responded=event.responded_at,
        severity=CLOG_TO_REPORT_SEVERITY[event.peak_severity],
        assigned_personnel='Barangay sanitation crew',
        action_taken='Removed the blockage and cleared the canal.',
        remarks=f'{TAG} generated for testing',
    )
    complete = status != 'Awaiting_Post_Report'
    if complete:
        collected = round(built['peak_kg'] * random.uniform(0.8, 1.3), 1)
        fields.update(
            condition_source='Sensor', post_completed_at=event.responded_at + timedelta(minutes=90),
            waste_collected_amount=collected, waste_collected_unit='kg',
            **condition_fields(summary), **waste_fields(collected),
        )
    fields.update(extra)
    report = create(manifest, CanalMonitoringReport, created_at=event.responded_at, **fields)
    if complete:
        create(manifest, ReportNodeSummary, report=report, **summary)
    return report


def weekly_report(manifest, barangay, reporter, nodes, when, status='Submitted', **extra):
    """A whole-barangay (weekly cleanup) report with one row per purok."""
    sensor_puroks = {n.hotspot.purok for n in nodes if n.hotspot.purok}
    rows = []
    for purok in range(1, barangay.purok_count + 1):
        has_sensor = purok in sensor_puroks
        rows.append(dict(
            purok=purok, included=random.random() > 0.15,
            source='Sensor' if has_sensor else 'Manual',
            overall_water_level=random.choice(LEVELS),
            overall_obstruction_coverage=random.choice(COVERAGES),
            overall_water_flow_condition=random.choice(FLOWS),
            node_count=sum(1 for n in nodes if n.hotspot.purok == purok),
            reading_count=random.randint(60, 200) if has_sensor else 0,
            peak_clog_pct=round(random.uniform(10, 85), 1) if has_sensor else None,
        ))
    rows[0]['included'] = True
    used = [r for r in rows if r['included']]
    collected = round(random.uniform(18, 60), 1)

    fields = dict(
        barangay=barangay, reported_by=reporter, status=status, report_scope='Barangay', purok=None,
        condition_source='Mixed' if sensor_puroks else 'Manual',
        date_observed=when, date_responded=when, post_completed_at=when + timedelta(hours=1),
        overall_water_level=LEVELS[max(LEVELS.index(r['overall_water_level']) for r in used)],
        overall_obstruction_coverage=COVERAGES[max(COVERAGES.index(r['overall_obstruction_coverage']) for r in used)],
        overall_water_flow_condition=FLOWS[max(FLOWS.index(r['overall_water_flow_condition']) for r in used)],
        assigned_personnel='Barangay sanitation crew',
        action_taken='Weekly barangay-wide canal cleanup.',
        waste_collected_amount=collected, waste_collected_unit='kg', **waste_fields(collected),
        remarks=f'{TAG} generated for testing',
    )
    fields.update(extra)
    report = create(manifest, CanalMonitoringReport, created_at=when, **fields)
    for row in rows:
        create(manifest, ReportPurokRow, report=report, **row)
    for node in nodes:
        create(manifest, ReportNodeSummary, report=report, **synthetic_summary(node, when))
    return report
