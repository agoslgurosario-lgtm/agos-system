from rest_framework import serializers
from .models import ClogEvent
from apps.barangay.serializers import BarangaySerializer
from apps.users.serializers import UserSerializer
from apps.waste_classification.serializers import WasteClassificationSerializer
from apps.sensor_nodes.serializers import get_node_identity
from apps.sensor_nodes.serializers import get_node_identity_as_of


class ClogEventSerializer(serializers.ModelSerializer):
    barangay_details = BarangaySerializer(source='barangay', read_only=True)
    node_details = serializers.SerializerMethodField()
    classification_details = WasteClassificationSerializer(source='classification', read_only=True)
    cleared_by_details = UserSerializer(source='cleared_by', read_only=True)
    reading_details = serializers.SerializerMethodField()
    responded_by_details = UserSerializer(source='responded_by', read_only=True)

    class Meta:
        model = ClogEvent
        fields = '__all__'

    def get_node_details(self, obj):
        return get_node_identity_as_of(obj.node, obj.detected_at)

    def get_reading_details(self, obj):
        # The reading that actually triggered this clog event, via the
        # classification that was linked to it at creation time — NOT
        # the node's latest reading (which changes over time).
        if not obj.classification or not obj.classification.reading:
            return None
        r = obj.classification.reading
        return {
            'reading_id': r.reading_id,
            'water_level': r.water_level,
            'water_flow_rate': r.water_flow_rate,
            'water_flow': r.water_flow,
            'reading_status': r.reading_status,
            'clog_pct': r.clog_pct,
            'timestamp': r.timestamp.isoformat() if r.timestamp else None,
        }