from rest_framework import serializers
from django.db import transaction
from .models import CanalMonitoringReport, ReportMedia, CustomWasteType, ReportCustomWaste, ReportNodeSummary, ReportPurokRow
from apps.barangay.serializers import BarangaySerializer
from apps.users.serializers import UserSerializer
from .periods import period_label


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


class ReportNodeSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportNodeSummary
        exclude = ['report']


class ReportPurokRowSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportPurokRow
        exclude = ['report']


class CanalMonitoringReportSerializer(serializers.ModelSerializer):
    barangay_details = BarangaySerializer(source='barangay', read_only=True)
    media = ReportMediaSerializer(many=True, read_only=True, source='reportmedia_set')
    reported_by_details = UserSerializer(source='reported_by', read_only=True)
    custom_waste = ReportCustomWasteSerializer(many=True, required=False)
    node_summaries = ReportNodeSummarySerializer(many=True, read_only=True)
    verified_by_name = serializers.SerializerMethodField()
    purok_rows = ReportPurokRowSerializer(many=True, read_only=True)
    submission_info = serializers.SerializerMethodField()
    earlier_voided = serializers.SerializerMethodField()

    def get_earlier_voided(self, obj):
        """Earlier reports for the same clog event that the barangay voided (this one is a redo)."""
        if not obj.clog_event_id:
            return []
        earlier = CanalMonitoringReport.objects.filter(
            clog_event_id=obj.clog_event_id, status='Voided'
        ).exclude(pk=obj.pk).select_related('voided_by').order_by('voided_at')
        return [
            {
                'report_id': r.report_id,
                'reason': r.void_reason,
                'voided_at': r.voided_at,
                'voided_by_name': f"{r.voided_by.first_name} {r.voided_by.last_name}".strip() if r.voided_by else None,
            }
            for r in earlier
        ]

    def get_submission_info(self, obj):
        s = obj.submission
        if not s:
            return None
        return {
            'submission_id': s.submission_id,
            'period_start': s.period_start,
            'period_end': s.period_end,
            'label': period_label(s.period_start, s.period_end),
            'is_late': s.is_late,
            'days_late': s.days_late,
            'submitted_at': s.submitted_at,
        }

    def validate_report_scope(self, value):
        if self.instance is not None and value != self.instance.report_scope:
            raise serializers.ValidationError('The scope of a report cannot be changed.')
        return value

    class Meta:
        model = CanalMonitoringReport
        fields = '__all__'
        read_only_fields = ['barangay', 'reported_by', 'submitted_at', 'status',
                            'condition_source', 'post_completed_at', 'verified_by', 'verified_at',
                            'submission', 'carried_over',
                            'void_reason', 'voided_by', 'voided_at']

    SUBMIT_REQUIRED_FIELDS = [
        'purok', 'date_observed', 'severity',
        'overall_water_level', 'overall_obstruction_coverage', 'overall_water_flow_condition',
        'assigned_personnel', 'date_responded', 'action_taken',
        'waste_collected_amount',
    ]

    def get_verified_by_name(self, obj):
        u = obj.verified_by
        return f"{u.first_name} {u.last_name}".strip() if u else None

    def validate_clog_event(self, event):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if event and user and user.user_role == 'Barangay' and event.barangay_id != user.barangay_id:
            raise serializers.ValidationError('That clog event belongs to another barangay.')
        return event

    def validate_is_submitted(self, value):
        if value:
            raise serializers.ValidationError(
                'Reports are submitted to MENRO from the Submit screen, after they are verified.'
            )
        return value

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