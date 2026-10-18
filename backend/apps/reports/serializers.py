from rest_framework import serializers
from django.db import transaction
from .models import CanalMonitoringReport, ReportMedia, CustomWasteType, ReportCustomWaste
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


class ReportCustomWasteSerializer(serializers.ModelSerializer):
    waste_type_name = serializers.CharField(source='waste_type.name', read_only=True)
    waste_type_status = serializers.CharField(source='waste_type.status', read_only=True)

    class Meta:
        model = ReportCustomWaste
        fields = ['item_id', 'waste_type', 'waste_type_name', 'waste_type_status', 'weight_kg']
        read_only_fields = ['item_id']


class CanalMonitoringReportSerializer(serializers.ModelSerializer):
    barangay_details = BarangaySerializer(source='barangay', read_only=True)
    media = ReportMediaSerializer(many=True, read_only=True, source='reportmedia_set')
    reported_by_details = UserSerializer(source='reported_by', read_only=True)
    custom_waste = ReportCustomWasteSerializer(many=True, required=False)

    class Meta:
        model = CanalMonitoringReport
        fields = '__all__'
        read_only_fields = ['barangay', 'reported_by', 'submitted_at']

    SUBMIT_REQUIRED_FIELDS = [
        'purok', 'date_observed', 'severity',
        'overall_water_level', 'overall_obstruction_coverage', 'overall_water_flow_condition',
        'assigned_personnel', 'date_responded', 'action_taken',
        'waste_collected_amount',
    ]

    def validate_clog_event(self, event):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if event and user and user.user_role == 'Barangay' and event.barangay_id != user.barangay_id:
            raise serializers.ValidationError('That clog event belongs to another barangay.')
        return event

    def validate_custom_waste(self, items):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        seen = set()
        for item in items:
            wt = item['waste_type']
            if wt.pk in seen:
                raise serializers.ValidationError(f'"{wt.name}" is listed more than once.')
            seen.add(wt.pk)
            if wt.status == 'Rejected':
                raise serializers.ValidationError(f'"{wt.name}" is not an accepted waste type.')
            if (
                wt.status == 'Pending' and user and user.user_role == 'Barangay'
                and (wt.created_by is None or wt.created_by.barangay_id != user.barangay_id)
            ):
                raise serializers.ValidationError(f'"{wt.name}" is not available yet.')
        return items

    def _save_custom_waste(self, report, items):
        report.custom_waste.all().delete()
        ReportCustomWaste.objects.bulk_create([
            ReportCustomWaste(report=report, waste_type=i['waste_type'], weight_kg=i['weight_kg'])
            for i in items
        ])

    @transaction.atomic
    def create(self, validated_data):
        items = validated_data.pop('custom_waste', None)
        report = super().create(validated_data)
        if items is not None:
            self._save_custom_waste(report, items)
        return report

    @transaction.atomic
    def update(self, instance, validated_data):
        items = validated_data.pop('custom_waste', None)
        report = super().update(instance, validated_data)
        if items is not None:  # omitted = leave existing entries untouched
            self._save_custom_waste(report, items)
        return report

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


class CustomWasteTypeSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    created_by_barangay = serializers.SerializerMethodField()

    class Meta:
        model = CustomWasteType
        fields = ['waste_type_id', 'name', 'status', 'rejection_reason', 'created_at', 'reviewed_at',
                  'created_by_name', 'created_by_barangay']

    def get_created_by_name(self, obj):
        u = obj.created_by
        return f"{u.first_name} {u.last_name}".strip() if u else None

    def get_created_by_barangay(self, obj):
        b = getattr(obj.created_by, 'barangay', None) if obj.created_by else None
        return b.barangay_name if b else None