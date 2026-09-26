from rest_framework import serializers
from .models import Alert, AlertRead
from apps.sensor_nodes.services import hotspot_at


class AlertSerializer(serializers.ModelSerializer):
    node_name = serializers.SerializerMethodField()
    barangay_name = serializers.SerializerMethodField()
    is_read  = serializers.SerializerMethodField()
    alert_context = serializers.SerializerMethodField()

    class Meta:
        model  = Alert
        fields = [
            'alert_id', 'alert_type', 'node_name', 'barangay_name',
            'timestamp', 'is_read', 'alert_context',
        ]

    def get_node_name(self, obj):
        return obj.node.node_name if obj.node else None

    def get_barangay_name(self, obj):
        if not obj.node:
            return None
        _, _, _, barangay_name = hotspot_at(obj.node, obj.timestamp)
        return barangay_name or None
    
    def get_is_read(self, obj):
        user = self.context['request'].user
        return obj.reads.filter(user=user).exists()

    def get_alert_context(self, obj):
        """
        Returns extra fields relevant to each alert type.

        Critical_Clog       → dominant_waste_type, estimated_volume (kg)
        Water_Level_Rising  → water_level (cm), water_flow_rate (m/s), water_flow status
        Node_Offline        → last health status, checked_at
        Low_Battery         → battery_voltage
        Weak_Signal         → signal_strength
        Sensor_Failure      → sensor_continuity
        """
        t = obj.alert_type

        if t == 'Critical_Clog' or t in ('Low_Clog_Alert', 'Moderate_Clog_Alert'):
            if obj.event and obj.event.classification:
                classification = obj.event.classification
                reading = classification.reading
                return {
                    'water_level':         reading.water_level,
                    'water_flow':          reading.water_flow,
                    'water_flow_rate':     reading.water_flow_rate,
                    'clog_pct':            reading.clog_pct,
                    'dominant_waste_type': classification.dominant_waste_type,
                    'recyclable_pct':      classification.recyclable_pct,
                    'biodegradable_pct':   classification.biodegradable_pct,
                    'residual_pct':        classification.residual_pct,
                    'special_waste_pct':   classification.special_waste_pct,
                    'confidence':          classification.confidence,
                    'estimated_volume':    classification.estimated_volume,
                }
            return obj.alert_context if obj.alert_context else {}

        if t == 'Water_Level_Rising':
            # context already stored by signal at alert creation time
            return obj.alert_context if obj.alert_context else {}

        # Node health alerts
        if t in ('Node_Offline', 'Low_Battery', 'Weak_Signal', 'Sensor_Failure'):
            health = obj.health_log
            
            if not health and obj.node:
              health = obj.node.systemhealthlog_set.order_by('-checked_at').first()

            if health:
                return {
                    'battery_voltage': health.battery_voltage,
                    'signal_strength': health.signal_strength,
                    'sensor_continuity': health.sensor_continuity,
                    'health_status': health.status,
                    'checked_at': health.checked_at.isoformat() if health.checked_at else None,
                }
            return {}

        return {}