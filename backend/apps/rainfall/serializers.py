from rest_framework import serializers
from .models import RainfallCondition
from .defaults import CONDITION_ORDER


class RainfallConditionSerializer(serializers.ModelSerializer):
    condition = serializers.CharField(source='effective_condition', read_only=True)

    class Meta:
        model = RainfallCondition
        fields = ['condition', 'updated_at']


class AlertThresholdSerializer(serializers.Serializer):
    """Validates one row. Only rules that would otherwise break the alerts."""
    condition = serializers.ChoiceField(choices=CONDITION_ORDER)
    warning_pct = serializers.FloatField()
    critical_pct = serializers.FloatField()
    reading_interval_seconds = serializers.IntegerField(min_value=1)
    clear_streak_count = serializers.IntegerField(min_value=1)

    def validate(self, attrs):
        warning, critical = attrs['warning_pct'], attrs['critical_pct']
        errors = {}
        if warning <= 0:
            errors['warning_pct'] = 'Must be greater than 0.'
        if critical > 100:
            errors['critical_pct'] = 'Cannot be more than 100.'
        if 'warning_pct' not in errors and 'critical_pct' not in errors and warning >= critical:
            errors['critical_pct'] = 'Must be higher than Warning.'
        if errors:
            raise serializers.ValidationError(errors)
        return attrs