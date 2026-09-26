from rest_framework import serializers
from .models import CanalMonitoringReport, ReportMedia
from apps.barangay.serializers import BarangaySerializer
from apps.users.serializers import UserSerializer


class ReportMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ReportMedia
        fields = '__all__'

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file_path and request:
            return request.build_absolute_uri(obj.file_path.url)
        return None


class CanalMonitoringReportSerializer(serializers.ModelSerializer):
    barangay_details = BarangaySerializer(source='barangay', read_only=True)
    media = ReportMediaSerializer(many=True, read_only=True, source='reportmedia_set')
    reported_by_details = UserSerializer(source='reported_by', read_only=True)

    class Meta:
        model = CanalMonitoringReport
        fields = '__all__'
        read_only_fields = ['barangay', 'reported_by']

    SUBMIT_REQUIRED_FIELDS = [
        'canal_name', 'latitude', 'longitude', 'date_observed', 'severity',
        'water_level', 'obstruction_coverage', 'water_flow_condition',
        'assigned_personnel', 'date_responded', 'action_taken',
        'waste_collected_amount', 'final_canal_condition',
    ]

    def validate_clog_event(self, event):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if event and user and user.user_role == 'Barangay' and event.barangay_id != user.barangay_id:
            raise serializers.ValidationError('That clog event belongs to another barangay.')
        return event

    def validate(self, attrs):
        attrs = super().validate(attrs)

        # Completeness is only enforced on the save that submits the report; drafts stay loose.
        if not attrs.get('is_submitted'):
            return attrs

        def current(field):
            # value being sent now, otherwise what's already stored
            if field in attrs:
                return attrs[field]
            return getattr(self.instance, field, None)

        errors = {
            field: [f"{field.replace('_', ' ').capitalize()} is required to submit the report."]
            for field in self.SUBMIT_REQUIRED_FIELDS
            if current(field) in (None, '')
        }

        observed, responded = current('date_observed'), current('date_responded')
        if observed and responded and responded < observed:
            errors['date_responded'] = ['Response time cannot be earlier than the time observed.']

        photos = (
            ReportMedia.objects.filter(report=self.instance)
            if self.instance else ReportMedia.objects.none()
        )
        if not photos.filter(media_category='Before_Clearing').exists():
            errors['before_photos'] = ['At least one Before Cleanup photo is required.']
        if not photos.filter(media_category='After_Clearing').exists():
            errors['after_photos'] = ['At least one After Cleanup photo is required.']

        if errors:
            raise serializers.ValidationError(errors)
        return attrs