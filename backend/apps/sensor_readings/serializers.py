from rest_framework import serializers
from .models import SensorReading
from apps.sensor_nodes.models import SensorNode
from apps.sensor_nodes.serializers import get_node_identity_as_of


class SensorReadingSerializer(serializers.ModelSerializer):
    node = serializers.PrimaryKeyRelatedField(
        queryset=SensorNode.objects.all(),
        write_only=True
    )
    node_details = serializers.SerializerMethodField()

    class Meta:
        model = SensorReading
        fields = [
            'reading_id', 'node', 'node_details',
            'water_level', 'water_flow_rate', 'water_flow',
            'reading_status', 'clog_pct', 'timestamp',
        ]

    def get_node_details(self, obj):
        return get_node_identity_as_of(obj.node, obj.timestamp)