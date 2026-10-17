import re
import time
from rest_framework import serializers
from .models import SensorNode, SystemHealthLog, MaintenanceLog, NodeAssignmentHistory
from apps.barangay.models import Barangay
from apps.hotspots.models import Hotspot
from apps.sensor_readings.models import SensorReading
from datetime import timedelta
from django.utils import timezone

HEALTH_REPORT_INTERVAL_MINUTES = 10
OFFLINE_THRESHOLD_MINUTES = 25
CODE_PATTERN = re.compile(r'^[A-Za-z0-9\-]+$')
ONLINE_MARGIN_SECONDS = 120


_THR_CACHE = {'at': 0.0, 'rows': {}, 'longest': 300}

def _load_intervals():
    from apps.rainfall.models import AlertThreshold
    now = time.monotonic()
    if now - _THR_CACHE['at'] > 60:
        rows = dict(AlertThreshold.objects.values_list('condition', 'reading_interval_seconds'))
        _THR_CACHE.update(at=now, rows=rows, longest=max(rows.values(), default=300))
    return _THR_CACHE['rows'], _THR_CACHE['longest']


def get_online_window_seconds(node, recent_readings):
    from apps.rainfall.services import get_effective_condition

    barangay = node.barangay
    condition = get_effective_condition(barangay) if barangay else 'Unknown'

    rows, longest = _load_intervals()
    tier_interval = rows.get(condition) or 300

    interval = tier_interval
    if len(recent_readings) >= 2:
        gap = (recent_readings[0].timestamp - recent_readings[1].timestamp).total_seconds()
        interval = max(interval, min(gap, longest))

    return 2 * interval + ONLINE_MARGIN_SECONDS


def get_node_identity(node):
    """Lightweight, query-cheap node info for nesting inside other serializers.
    No live sensor/health lookups — use SensorNodeSerializer directly if you
    need water_level/clog_pct/condition/health_status."""
    if not node:
        return None
    return {
        'node_id': node.node_id,
        'node_name': node.node_name,
        'status': node.status,
        'availability_status': node.availability_status,
        'barangay_details': {
            'barangay_id': node.barangay.barangay_id,
            'barangay_name': node.barangay.barangay_name,
        } if node.barangay else None,
        'hotspot_details': {
            'hotspot_id': node.hotspot.hotspot_id,
            'name': node.hotspot.name,
            'latitude': node.hotspot.latitude,
            'longitude': node.hotspot.longitude,
        } if node.hotspot else None,
    }


def get_node_identity_as_of(node, timestamp):
    """Like get_node_identity, but resolves hotspot/barangay as of
    `timestamp` via hotspot_at() (D1) — for readings, alerts and clog
    events, which should keep showing the hotspot they happened at,
    not the node's current one."""
    if not node:
        return None
    from .services import hotspot_at
    hotspot, hotspot_name, barangay, barangay_name = hotspot_at(node, timestamp)
    return {
        'node_id': node.node_id,
        'node_name': node.node_name,
        'status': node.status,
        'availability_status': node.availability_status,
        'barangay_details': {
            'barangay_id': barangay.barangay_id if barangay else None,
            'barangay_name': barangay_name,
        } if barangay_name else None,
        'hotspot_details': {
            'hotspot_id': hotspot.hotspot_id if hotspot else None,
            'name': hotspot_name,
            'latitude': hotspot.latitude if hotspot else None,
            'longitude': hotspot.longitude if hotspot else None,
        } if hotspot_name else None,
    }


class SensorNodeSerializer(serializers.ModelSerializer):
    barangay = serializers.PrimaryKeyRelatedField(
        queryset=Barangay.objects.all(),
        write_only=True,
        allow_null=True,
        required=False
    )
    hotspot = serializers.PrimaryKeyRelatedField(
        queryset=Hotspot.objects.all(),
        write_only=True,
        allow_null=True,
        required=False
    )
    # User only ever types this — the "1" in "SN-1"
    node_code = serializers.CharField(write_only=True, max_length=50)

    barangay_details = serializers.SerializerMethodField()
    hotspot_details = serializers.SerializerMethodField()

    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    water_level = serializers.SerializerMethodField()
    water_flow_rate = serializers.SerializerMethodField()
    clog_pct = serializers.SerializerMethodField()
    condition = serializers.SerializerMethodField()
    water_status = serializers.SerializerMethodField()
    clog_status = serializers.SerializerMethodField()
    health_status = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()
    last_seen = serializers.SerializerMethodField()
    firmware_version = serializers.SerializerMethodField()

    last_reading_at = serializers.SerializerMethodField()
    is_force_sleeping = serializers.SerializerMethodField()

    prev_hotspot = serializers.SerializerMethodField()

    class Meta:
        model = SensorNode
        fields = [
            'node_id', 'node_name', 'node_code',
            'barangay', 'barangay_details',
            'hotspot', 'hotspot_details',
            'latitude', 'longitude',
            'availability_status', 'status', 'forced_sleep_until', 'is_force_sleeping',
            'installed_at',
            'water_level', 'water_flow_rate', 'clog_pct', 'condition',
            'water_status', 'clog_status',
            'health_status', 'is_online', 'last_seen', 'firmware_version',
            'last_reading_at', 'device_model', 'prev_hotspot',
        ]
        extra_kwargs = {
            'node_name': {'read_only': True},
            'installed_at': {'required': False},
            'forced_sleep_until': {'read_only': True},
        }

    def get_prev_hotspot(self, obj):
        hid = getattr(obj, 'prev_hotspot_id', None)
        if hid is None:
            return None
        return {
            'hotspot_id': hid,
            'name': obj.prev_hotspot_name,
            'barangay_id': obj.prev_barangay_id,
            'barangay_name': obj.prev_barangay_name,
        }

    def _latest(self, obj):
        if not hasattr(obj, '_latest_reading_cache'):
            obj._latest_reading_cache = (
                SensorReading.objects.filter(node=obj).order_by('-timestamp').first()
            )
        return obj._latest_reading_cache

    def _latest_health(self, obj):
        if not hasattr(obj, '_latest_health_cache'):
            obj._latest_health_cache = (
                SystemHealthLog.objects.filter(node=obj).order_by('-checked_at').first()
            )
        return obj._latest_health_cache

    def get_barangay_details(self, obj):
        barangay = obj.barangay
        if not barangay:
            last = self._last_known_hotspot(obj)
            barangay = last.barangay if last else None
        if not barangay:
            return None
        return {
            'barangay_id': barangay.barangay_id,
            'barangay_name': barangay.barangay_name,
        }

    def get_hotspot_details(self, obj):
        if not obj.hotspot:
            return None
        from apps.waste_classification.utils import max_capacity_kg
        return {
            'hotspot_id': obj.hotspot.hotspot_id,
            'name': obj.hotspot.name,
            'description': obj.hotspot.description,
            'latitude': obj.hotspot.latitude,
            'longitude': obj.hotspot.longitude,
            'canal_width': obj.hotspot.canal_width,
            'canal_depth': obj.hotspot.canal_depth,
            'sensor_height': obj.hotspot.sensor_height,
            'max_capacity_kg': max_capacity_kg(
                obj.hotspot.canal_width, obj.hotspot.sensor_height
            ),
        }

    def _last_known_hotspot(self, obj):
        """
        For a node under maintenance (hotspot already stripped), the most
        recent hotspot it was assigned to, so the map can keep showing it
        at that location (purple) instead of dropping it entirely.
        Cached on the instance since both get_latitude and get_longitude
        need it — avoids querying twice per node.
        """
        if getattr(obj, '_last_known_hotspot_cache', 'unset') != 'unset':
            return obj._last_known_hotspot_cache

        result = None
        if obj.status == 'Maintenance' and not obj.hotspot:
            row = NodeAssignmentHistory.objects.filter(
                node=obj, end_reason='Maintenance'
            ).order_by('-started_at').first()
            result = row.hotspot if row else None

        obj._last_known_hotspot_cache = result
        return result

    def get_latitude(self, obj):
        if obj.hotspot:
            return obj.hotspot.latitude
        last = self._last_known_hotspot(obj)
        return last.latitude if last else None

    def get_longitude(self, obj):
        if obj.hotspot:
            return obj.hotspot.longitude
        last = self._last_known_hotspot(obj)
        return last.longitude if last else None

    def get_water_level(self, obj):
        r = self._latest(obj)
        return r.water_level if r else None

    def get_water_flow_rate(self, obj):
        r = self._latest(obj)
        return r.water_flow_rate if r else None

    def get_clog_pct(self, obj):
        r = self._latest(obj)
        return r.clog_pct if r else None

    def get_water_status(self, obj):
        r = self._latest(obj)
        return r.reading_status if r else None

    def get_clog_status(self, obj):
        from apps.sensor_readings.services import get_clog_status
        r = self._latest(obj)
        return get_clog_status(r.clog_pct) if r else None

    def get_condition(self, obj):
        # Overall status = worst of water-level status and clog status
        # (clog cutoffs 30/60/80, same as the clog alerts). If clog % isn't
        # in yet, this falls back to the water-level status.
        from apps.sensor_readings.services import get_clog_status, get_overall_status
        r = self._latest(obj)
        if not r:
            return None
        return get_overall_status(r.reading_status, get_clog_status(r.clog_pct))
    
    def get_health_status(self, obj):
        h = self._latest_health(obj)
        return h.status if h else None

    def get_is_online(self, obj):
        recent = list(
            SensorReading.objects.filter(node=obj).order_by('-timestamp')[:2]
        )
        if not recent:
            return False
        window = get_online_window_seconds(obj, recent)
        return (timezone.now() - recent[0].timestamp).total_seconds() <= window

    def get_is_force_sleeping(self, obj):
        return bool(obj.forced_sleep_until and obj.forced_sleep_until > timezone.now())

    def get_last_seen(self, obj):
        latest = self._latest_health(obj)
        return latest.checked_at if latest else None
    
    def get_firmware_version(self, obj):
        latest = self._latest_health(obj)
        return latest.firmware_version if latest else None

    def get_last_reading_at(self, obj):
        r = self._latest(obj)
        return r.timestamp if r else None

    def validate_node_code(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("This field is required.")
        if not CODE_PATTERN.match(value):
            raise serializers.ValidationError(
                "Only letters, numbers, and hyphens are allowed."
            )
        return value

    def validate(self, attrs):
        hotspot = attrs.get('hotspot')

        if hotspot:
            existing = SensorNode.objects.filter(
                hotspot=hotspot
            ).exclude(availability_status='Retired')

            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)

            if existing.exists():
                raise serializers.ValidationError(
                    {'hotspot': 'This hotspot is already occupied by an active node.'}
                )

            if self.instance and self.instance.status == 'Maintenance':
                raise serializers.ValidationError(
                    {'hotspot': 'This node is under maintenance and cannot be assigned.'}
                )

        node_code = attrs.get('node_code')
        if node_code:
            full_name = f"SN-{node_code}"
            qs = SensorNode.objects.filter(node_name=full_name)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {'node_code': 'A sensor node with this code already exists.'}
                )
            attrs['node_name'] = full_name

        # node_code isn't a real model field — it only exists to derive
        # node_name above. Drop it so it doesn't get passed into
        # SensorNode.objects.create(**validated_data)/update(...).
        attrs.pop('node_code', None)

        return attrs


class SystemHealthLogSerializer(serializers.ModelSerializer):
    node_details = serializers.SerializerMethodField()
    node = serializers.PrimaryKeyRelatedField(
        queryset=SensorNode.objects.all(),
        write_only=True
    )

    class Meta:
        model = SystemHealthLog
        fields = [
            'health_id', 'node', 'node_details',
            'battery_voltage', 'signal_strength', 'sensor_continuity',
            'status', 'firmware_version', 'checked_at',
        ]

    def get_node_details(self, obj):
        return get_node_identity(obj.node)


class MaintenanceLogSerializer(serializers.ModelSerializer):
    node_details = serializers.SerializerMethodField()
    marked_by_details = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceLog
        fields = [
            'maintenance_id', 'node', 'node_details',
            'reason', 'marked_by', 'marked_by_details',
            'started_at', 'resolved_at', 'closed_reason',
        ]
        read_only_fields = ['node', 'marked_by', 'started_at']

    def get_node_details(self, obj):
        return get_node_identity(obj.node)

    def get_marked_by_details(self, obj):
        if not obj.marked_by:
            return None
        return {
            'user_id': obj.marked_by.user_id,
            'first_name': obj.marked_by.first_name,
            'last_name': obj.marked_by.last_name,
        }


class NodeAssignmentHistorySerializer(serializers.ModelSerializer):
    node_name = serializers.CharField(source='node.node_name', read_only=True)
    assigned_by_name = serializers.SerializerMethodField()
    ended_by_name = serializers.SerializerMethodField()

    class Meta:
        model = NodeAssignmentHistory
        fields = [
            'history_id', 'node', 'node_name',
            'hotspot', 'hotspot_name', 'barangay', 'barangay_name',
            'started_at', 'ended_at', 'end_reason',
            'assigned_by', 'assigned_by_name', 'ended_by', 'ended_by_name',
        ]

    def _user_label(self, user):
        if not user:
            return None
        return f"{user.first_name} {user.last_name}".strip() or user.email

    def get_assigned_by_name(self, obj):
        return self._user_label(obj.assigned_by)

    def get_ended_by_name(self, obj):
        return self._user_label(obj.ended_by)