from rest_framework import serializers
from .models import SensorReading
from .services import get_clog_status, get_overall_status
from apps.sensor_nodes.models import SensorNode
from apps.sensor_nodes.serializers import get_node_identity_as_of


class SensorReadingSerializer(serializers.ModelSerializer):
    node = serializers.PrimaryKeyRelatedField(
        queryset=SensorNode.objects.all(),
        write_only=True
    )
    node_details = serializers.SerializerMethodField()
    clog_status = serializers.SerializerMethodField()
    overall_status = serializers.SerializerMethodField()
    estimated_weight = serializers.SerializerMethodField()

    class Meta:
        model = SensorReading
        fields = [
            'reading_id', 'node', 'node_details',
            'water_level', 'water_flow_rate', 'water_flow',
            'reading_status', 'clog_pct', 'clog_status', 'overall_status',
            'estimated_weight', 'timestamp',
        ]

    def get_node_details(self, obj):
        return get_node_identity_as_of(obj.node, obj.timestamp)

    def get_estimated_weight(self, obj):
        # kg, from the AI waste classification of this reading (None if there is none)
        classification = getattr(obj, 'wasteclassification', None)
        return classification.estimated_volume if classification else None

    def get_clog_status(self, obj):
        return get_clog_status(obj.clog_pct)

    def get_overall_status(self, obj):
        return get_overall_status(obj.reading_status, get_clog_status(obj.clog_pct))