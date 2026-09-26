import re
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
    health_status = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()
    last_seen = serializers.SerializerMethodField()
    firmware_version = serializers.SerializerMethodField()

    last_reading_at = serializers.SerializerMethodField()
    is_force_sleeping = serializers.SerializerMethodField()

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
            'health_status', 'is_online', 'last_seen', 'firmware_version',
            'last_reading_at', 'device_model',
        ]
        extra_kwargs = {
            'node_name': {'read_only': True},
            'installed_at': {'required': False},
            'forced_sleep_until': {'read_only': True},
        }

    def _latest(self, obj):
        return SensorReading.objects.filter(node=obj).order_by('-timestamp').first()

    def _latest_health(self, obj):
        return SystemHealthLog.objects.filter(node=obj).order_by('-checked_at').first()

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

    def get_condition(self, obj):
        # condition is shown next to clog_pct in the UI, so derive it from
        # clog_pct (same cutoffs as the Clog Level Legend) rather than
        # reading_status, which reflects water level and can disagree.
        r = self._latest(obj)
        if not r or r.clog_pct is None:
            return None
        if r.clog_pct >= 67:
            return 'Critical'
        if r.clog_pct >= 34:
            return 'Warning'
        return 'Normal'
    
    def get_health_status(self, obj):
        h = self._latest_health(obj)
        return h.status if h else None

    def get_is_online(self, obj):
        latest = self._latest_health(obj)
        if not latest:
            return False
        return (timezone.now() - latest.checked_at) <= timedelta(minutes=OFFLINE_THRESHOLD_MINUTES)

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