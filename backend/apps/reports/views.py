import os
import base64
import io
from PIL import Image, ImageOps
from datetime import timedelta
from django.db import transaction
from django.utils.dateparse import parse_datetime
from django.db.models import Q
from rest_framework.exceptions import ValidationError
from .validators import validate_upload, convert_heic_to_jpeg
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import CanalMonitoringReport, ReportMedia, CustomWasteType, ReportPurokRow, ReportNodeSummary
from .serializers import CanalMonitoringReportSerializer, ReportMediaSerializer, CustomWasteTypeSerializer, ReportPurokRowSerializer
from .waste_types import clean_name, name_key, find_similar, find_fixed_match
from django.db import IntegrityError
from apps.users.permissions import (
    IsBarangay, IsAdminOrMENROOrBarangay, IsAdminOrMENROOfficer,
    CanAccessOwnCanalReport, CanAccessOwnCanalReportMedia, IsMENRO, IsMENROOrStaff,
)
from apps.audit_logs.utils import log_action
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from agos_backend.pdf_utils import render_custom_pdf, get_logo_data_uri
from apps.signatories.models import Signatory
from apps.alerts.models import Alert
from django.utils import timezone

from .services import (
    build_purok_condition, CLEANUP_WINDOW, worst, WATER_RANK, OBSTRUCTION_RANK, FLOW_CHOICE_RANK,
    SEVERITY_FROM_OBSTRUCTION, NODE_STAT_FIELDS, build_event_summary, apply_event_summary,
    peak_waste_kg,
)


PHOTO_LABELS = [
    ('Before_Clearing', 'Before Cleanup'),
    ('After_Clearing', 'After Cleanup'),
    ('Additional_Evidence', 'Additional Evidence'),
]
PHOTO_MAX_BOX = (280, 200)  # largest a photo can be on the page, in px

DEFAULT_SIGNATORY_POSITIONS = [
    'Barangay Secretary', 'Chairman Environment',
    'Brgy. Sanitary Inspector', 'Punong Barangay',
]


def _choice_options(choices, selected):
    """[{label, checked}] for a "[X] Critical  [  ] Medium" style checkbox row."""
    return [{'label': label, 'checked': value == selected} for value, label in choices]


def _photo_for_pdf(media):
    """Downscale one photo and inline it as base64 so xhtml2pdf can embed it. None if unreadable."""
    try:
        with media.file_path.open('rb') as f:
            img = ImageOps.exif_transpose(Image.open(f)).convert('RGB')
        img.thumbnail((900, 900))
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=75)
        scale = min(PHOTO_MAX_BOX[0] / img.width, PHOTO_MAX_BOX[1] / img.height)
        return {
            'uri': 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode(),
            'w': round(img.width * scale),
            'h': round(img.height * scale),
        }
    except Exception:
        return None


def _photo_groups(report):
    groups = []
    for category, label in PHOTO_LABELS:
        media_qs = report.reportmedia_set.filter(media_category=category).order_by('media')
        photos = [p for p in (_photo_for_pdf(m) for m in media_qs) if p]
        if photos:
            groups.append({'label': label, 'rows': [photos[i:i + 2] for i in range(0, len(photos), 2)]})
    return groups


def _signatory_rows(report):
    """
    Pulls each position's current active signatory for the report's barangay.
    Positions with no signatory set yet fall back to a blank name, same as
    before signatory management existed — so older/unset barangays don't
    break the PDF.
    """
    if report.signatory_snapshot:
        active_by_position = report.signatory_snapshot
    else:
        active_by_position = {
            s.position: s.name
            for s in Signatory.objects.filter(barangay=report.barangay, status='Active')
        }
    signatories = [
        {'name': active_by_position.get(p, ''), 'position': p}
        for p in DEFAULT_SIGNATORY_POSITIONS
    ]
    return [signatories[i:i + 2] for i in range(0, len(signatories), 2)]


def _snapshot_signatories(barangay):
    """{position: name} for the barangay's current active signatories, taken
    at the moment a report becomes submitted — so a later staffing change
    doesn't rewrite history on an already-signed report."""
    return {
        s.position: s.name
        for s in Signatory.objects.filter(barangay=barangay, status='Active')
    }

def _missing_signatory_positions(barangay):
    """Positions with no Active signatory for this barangay."""
    active = set(
        Signatory.objects.filter(barangay=barangay, status='Active')
        .values_list('position', flat=True)
    )
    return [p for p in DEFAULT_SIGNATORY_POSITIONS if p not in active]

def _require_active_barangay(barangay):
    if barangay is None or not barangay.is_active:
        raise ValidationError({
            'detail': 'Your barangay is no longer active, so reports can no longer be submitted. '
                      'Please contact your administrator.'
        })

def _require_complete_signatories(barangay):
    missing = _missing_signatory_positions(barangay)
    if missing:
        raise ValidationError({
            'detail': (
                'Your barangay needs a complete set of signatories before a report '
                'can be submitted. Missing: ' + ', '.join(missing) +
                '. Please contact your administrator.'
            )
        })


class CanalMonitoringReportListView(generics.ListCreateAPIView):
    serializer_class = CanalMonitoringReportSerializer
    pagination_class = None
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['barangay', 'severity']

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsBarangay()]
        return [IsAdminOrMENROOrBarangay()]

    def get_queryset(self):
        user = self.request.user
        base = CanalMonitoringReport.objects.select_related(
            'barangay', 'reported_by', 'submission'
        ).prefetch_related('reportmedia_set', 'custom_waste__waste_type')
        if user.user_role == 'Barangay':
            return base.filter(barangay=user.barangay).exclude(status='Voided').order_by('-date_observed')
        return base.filter(is_submitted=True).order_by('-date_observed')

    def perform_create(self, serializer):
        _require_active_barangay(self.request.user.barangay)
        if serializer.validated_data.get('is_submitted'):
            _require_complete_signatories(self.request.user.barangay)
        report = serializer.save(
            barangay=self.request.user.barangay,
            reported_by=self.request.user,
        )
        if report.is_submitted:
            report.signatory_snapshot = _snapshot_signatories(report.barangay)
            report.submitted_at = timezone.now()
            report.save(update_fields=['signatory_snapshot', 'submitted_at'])


class CanalMonitoringReportDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CanalMonitoringReport.objects.select_related(
        'barangay', 'reported_by', 'submission'
    ).prefetch_related('reportmedia_set', 'custom_waste__waste_type', 'node_summaries', 'purok_rows')
    serializer_class = CanalMonitoringReportSerializer
    lookup_field = 'report_id'
    permission_classes = [CanAccessOwnCanalReport]

    def perform_update(self, serializer):
        was_submitted = serializer.instance.is_submitted
        if serializer.validated_data.get('is_submitted') and not was_submitted:
            _require_active_barangay(serializer.instance.barangay)
            _require_complete_signatories(serializer.instance.barangay)
        report = serializer.save()
        if report.is_submitted and not was_submitted:
            report.signatory_snapshot = _snapshot_signatories(report.barangay)
            report.submitted_at = timezone.now()
            report.save(update_fields=['signatory_snapshot', 'submitted_at'])
            Alert.objects.create(report=report, alert_type='Report_Submitted')
            log_action(
                user=self.request.user,
                action='Filed Canal Monitoring Report',
                affected_table='tbl_canal_monitoring_reports',
                new_value=f"barangay: {report.barangay.barangay_name}, observed: {report.date_observed}",
                ip_address=self.request.META.get('REMOTE_ADDR')
            )


def _purok_table(report):
    """Rows for the per-purok table of a whole-barangay report."""
    water = dict(CanalMonitoringReport.WATER_LEVEL_CHOICES)
    cover = dict(CanalMonitoringReport.OBSTRUCTION_COVERAGE_CHOICES)
    flow = dict(CanalMonitoringReport.WATER_FLOW_CHOICES)
    rows = []
    for r in report.purok_rows.all():
        rows.append({
            'purok': r.purok,
            'included': r.included,
            'water': water.get(r.overall_water_level, '—'),
            'coverage': cover.get(r.overall_obstruction_coverage, '—'),
            'flow': flow.get(r.overall_water_flow_condition, '—'),
            'note': 'No sensors' if r.node_count == 0 else 'No readings this week',
        })
    return rows


class CanalMonitoringReportExportView(APIView):
    """
    GET /api/canal-reports/<id>/export/
    Exports a single canal monitoring report as PDF.
    Same access rule as the detail view: Admin/MENRO any report,
    Barangay only their own.
    """
    permission_classes = [CanAccessOwnCanalReport]

    def get(self, request, report_id):
        report = get_object_or_404(CanalMonitoringReport, report_id=report_id)
        self.check_object_permissions(request, report)

        if not report.is_submitted:
            return Response(
                {'error': 'Only submitted reports can be exported.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        submitted = timezone.localtime(report.submitted_at or report.created_at)

        node_summaries = list(report.node_summaries.all()) if report.report_scope != 'Barangay' else []
        water_peaks = [s.peak_water_level_pct for s in node_summaries if s.peak_water_level_pct is not None]
        clog_peaks = [s.peak_clog_pct for s in node_summaries if s.peak_clog_pct is not None]

        context = {
            "logo_data_uri": get_logo_data_uri(),
            "report": report,
            "submitted_at": submitted,
            "submitted_week": (submitted.day - 1) // 7 + 1,
            "generated_by": f"{request.user.first_name} {request.user.last_name}",
            "severity_options": _choice_options(CanalMonitoringReport.SEVERITY_CHOICES, report.severity),
            "water_level_options": _choice_options(CanalMonitoringReport.WATER_LEVEL_CHOICES, report.overall_water_level),
            "coverage_options": _choice_options(CanalMonitoringReport.OBSTRUCTION_COVERAGE_CHOICES, report.overall_obstruction_coverage),
            "flow_options": _choice_options(CanalMonitoringReport.WATER_FLOW_CHOICES, report.overall_water_flow_condition),
            "photo_groups": _photo_groups(report),
            "signatory_rows": _signatory_rows(report),
            "is_cleanup": report.report_scope == 'Barangay',
            "purok_table": _purok_table(report) if report.report_scope == 'Barangay' else [],
            "peak_water_pct": max(water_peaks) if water_peaks else None,
            "peak_clog_pct": max(clog_peaks) if clog_peaks else None,
        }
        context["counted_puroks"] = sum(1 for r in context["purok_table"] if r["included"])

        observed = report.date_observed or report.created_at
        filename = f"{report.barangay.barangay_name}-Canal-Report-{observed.strftime('%b-%d-%Y')}.pdf"

        return render_custom_pdf(
            "exports/canal_monitoring_report.html",
            context,
            filename=filename,
        )


class MyReportsListView(generics.ListAPIView):
    """
    GET /api/canal-reports/mine/
    Returns every report filed by the current Barangay user's own
    barangay. Replaces the old single-per-month "mine" lookup — since
    reports are per-incident now, not one-per-month, this is a list.
    Barangay-only — scoped to request.user.barangay, no barangay param
    needed/trusted.
    """
    serializer_class = CanalMonitoringReportSerializer
    pagination_class = None
    permission_classes = [IsBarangay]

    def get_queryset(self):
        return CanalMonitoringReport.objects.select_related(
            'barangay', 'reported_by'
        ).prefetch_related('reportmedia_set', 'custom_waste__waste_type').filter(
            barangay=self.request.user.barangay
        ).exclude(status='Voided').order_by('-date_observed')


class ReportMediaListView(generics.ListAPIView):
    serializer_class = ReportMediaSerializer
    permission_classes = [IsAdminOrMENROOfficer]

    def get_queryset(self):
        return ReportMedia.objects.filter(Q(report__isnull=True) | Q(report__is_submitted=True))


class ReportMediaUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAdminOrMENROOrBarangay]

    def post(self, request):
        file = request.FILES.get('file')
        media_category = request.data.get('media_category', 'Additional_Evidence')
        report_id = request.data.get('report_id')

        if not file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_upload(file, 'Image')
        except ValidationError as e:
            detail = e.detail[0] if hasattr(e, 'detail') else str(e)
            return Response({'error': str(detail)}, status=status.HTTP_400_BAD_REQUEST)

        ext = os.path.splitext(file.name)[1].lower()
        if ext in {'.heic', '.heif'}:
            file = convert_heic_to_jpeg(file)

        media = ReportMedia(file_path=file, media_type='Image', media_category=media_category, uploaded_by=request.user)

        if report_id:
            try:
                report = CanalMonitoringReport.objects.get(report_id=report_id)
            except CanalMonitoringReport.DoesNotExist:
                return Response({'error': 'Report not found.'}, status=status.HTTP_404_NOT_FOUND)

            # only the barangay that owns a report can attach photos, and only until it's submitted
            if request.user.user_role != 'Barangay' or report.barangay_id != request.user.barangay_id:
                return Response({'error': 'Not your report.'}, status=status.HTTP_403_FORBIDDEN)
            if report.is_submitted or report.status in ('Verified', 'Voided'):
                return Response({'error': 'This report is locked.'}, status=status.HTTP_403_FORBIDDEN)
            media.report = report

        media.save()
        return Response(
            ReportMediaSerializer(media, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class ReportMediaDetailView(generics.RetrieveDestroyAPIView):
    queryset = ReportMedia.objects.all()
    serializer_class = ReportMediaSerializer
    lookup_field = 'media'
    permission_classes = [CanAccessOwnCanalReportMedia]


class ReportMediaByClogEventView(generics.ListAPIView):
    serializer_class = ReportMediaSerializer
    permission_classes = [IsAdminOrMENROOrBarangay]

    def get_queryset(self):
        event_id = self.kwargs['event_id']
        qs = ReportMedia.objects.filter(
            report__clog_event_id=event_id,
            report__is_submitted=True,
        )
        # a barangay may only see evidence for its own reports
        if self.request.user.user_role == 'Barangay':
            qs = qs.filter(report__barangay_id=self.request.user.barangay_id)
        return qs


class SignatoryStatusView(APIView):
    """
    GET /api/canal-reports/signatory-status/
    Lets the mobile app check whether the current barangay can submit.
    """
    permission_classes = [IsBarangay]

    def get(self, request):
        missing = _missing_signatory_positions(request.user.barangay)
        return Response({'complete': not missing, 'missing': missing})


class CustomWasteTypeListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomWasteTypeSerializer
    pagination_class = None
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status']

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsBarangay()]
        return [IsAdminOrMENROOrBarangay()]

    def get_queryset(self):
        user = self.request.user
        qs = CustomWasteType.objects.select_related('created_by__barangay')
        if user.user_role == 'Barangay':
            # approved types for everyone + this barangay's own pending ones
            qs = qs.filter(Q(status='Approved') | Q(status='Pending', created_by__barangay=user.barangay))
        return qs

    def create(self, request, *args, **kwargs):
        try:
            name = clean_name(request.data.get('name'))
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        key = name_key(name)

        existing = CustomWasteType.objects.filter(name_key=key).first()
        if existing:
            if existing.status == 'Rejected':
                return Response(
                    {'error': f'"{existing.name}" was reviewed and not accepted as a waste type.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response(self.get_serializer(existing).data, status=status.HTTP_200_OK)

        custom_by_key = dict(
            CustomWasteType.objects.exclude(status='Rejected').values_list('name_key', 'name')
        )
        similar = find_similar(key, custom_by_key)
        if similar:
            return Response(
                {'error': f'"{name}" looks like "{similar}", which already exists.', 'suggestion': similar},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            obj = CustomWasteType.objects.create(name=name, name_key=key, created_by=request.user)
        except IntegrityError:  # two users added the same name at the same moment
            obj = CustomWasteType.objects.get(name_key=key)

        log_action(
            user=request.user,
            action='Added Custom Waste Type',
            affected_table='tbl_custom_waste_types',
            new_value=f"{obj.name} (Pending)",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response(self.get_serializer(obj).data, status=status.HTTP_201_CREATED)


class CustomWasteTypeReviewView(APIView):
    """MENRO officer or staff: approve (optionally renaming) or reject a pending type."""
    permission_classes = [IsMENROOrStaff]

    def patch(self, request, waste_type_id):
        obj = get_object_or_404(CustomWasteType, pk=waste_type_id)
        # Pending can be approved/rejected; a Rejected one can only be approved again (MENRO mistake)
        if obj.status == 'Approved' or (obj.status == 'Rejected' and request.data.get('action') != 'approve'):
            return Response({'error': 'This waste type was already reviewed.'}, status=status.HTTP_400_BAD_REQUEST)

        action = request.data.get('action')
        if action not in ('approve', 'reject'):
            return Response({'error': 'action must be "approve" or "reject".'}, status=status.HTTP_400_BAD_REQUEST)

        old_name = obj.name

        if action == 'reject':
            reason = (request.data.get('reason') or '').strip()
            if not reason:
                return Response({'error': 'Please give a reason for rejecting this waste type.'}, status=status.HTTP_400_BAD_REQUEST)
            if len(reason) > 200:
                return Response({'error': 'The reason must be 200 characters or fewer.'}, status=status.HTTP_400_BAD_REQUEST)
            obj.status = 'Rejected'
            obj.rejection_reason = reason
        else:
            new_name = request.data.get('name')
            if new_name is not None:
                try:
                    name = clean_name(new_name)
                except ValueError as e:
                    return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
                key = name_key(name)
                if CustomWasteType.objects.filter(name_key=key).exclude(pk=obj.pk).exists():
                    return Response(
                        {'error': f'"{name}" already exists. Reject this one instead.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                obj.name, obj.name_key = name, key

            builtin = find_fixed_match(obj.name_key)
            if builtin:
                return Response(
                    {'error': f'"{obj.name}" is the same as the built-in category "{builtin}". Reject it with a reason instead.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            obj.status = 'Approved'
            obj.rejection_reason = ''

        obj.reviewed_by = request.user
        obj.reviewed_at = timezone.now()
        obj.save()

        creator = obj.created_by
        if creator and creator.barangay_id:
            if action == 'reject':
                alert_type = 'Waste_Type_Rejected'
                ctx = {'waste_type': obj.name, 'reason': obj.rejection_reason}
            else:
                alert_type = 'Waste_Type_Approved'
                ctx = {'waste_type': obj.name}
                if old_name != obj.name:  # MENRO renamed it while approving
                    ctx['original_name'] = old_name
            Alert.objects.create(
                alert_type=alert_type,
                barangay_id=creator.barangay_id,
                alert_context=ctx,
            )

        log_action(
            user=request.user,
            action=f'{obj.status} Custom Waste Type',
            affected_table='tbl_custom_waste_types',
            old_value=old_name,
            new_value=obj.name,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response(CustomWasteTypeSerializer(obj).data)


class _CanalReportActionBase(generics.GenericAPIView):
    queryset = CanalMonitoringReport.objects.select_related(
        'barangay', 'clog_event__node__hotspot'
    )
    lookup_field = 'report_id'
    permission_classes = [CanAccessOwnCanalReport]


class CanalReportSystemDataView(_CanalReportActionBase):
    """Preview of what the sensors recorded for this report's clog event. Saves nothing."""

    def get(self, request, report_id):
        report = self.get_object()
        if not report.clog_event_id:
            return Response({'detail': 'This report is not linked to a clog event.'}, status=400)
        summary = build_event_summary(report.clog_event)
        if summary is None:
            return Response({'available': False})
        return Response({'available': True, **summary})


class CanalReportCompletePostView(_CanalReportActionBase):
    """Finishes the post-report: fetches the canal condition and moves the report on."""

    def post(self, request, report_id):
        report = self.get_object()
        _require_active_barangay(report.barangay)

        if report.is_submitted or report.status not in ('Awaiting_Post_Report', 'Ready_To_Verify'):
            return Response({'detail': 'This report can no longer be completed.'}, status=400)
        event = report.clog_event
        if event is None:
            return Response({'detail': 'This report is not linked to a clog event.'}, status=400)

        errors = {}
        if report.waste_collected_amount is None:
            errors['waste_collected_amount'] = 'Enter the total waste collected (0 if none).'
        photos = ReportMedia.objects.filter(report=report)
        if not photos.filter(media_category='Before_Clearing').exists():
            errors['before_photos'] = 'At least one Before Cleanup photo is required.'
        if not photos.filter(media_category='After_Clearing').exists():
            errors['after_photos'] = 'At least one After Cleanup photo is required.'

        hotspot = getattr(event.node, 'hotspot', None)
        if not (getattr(hotspot, 'purok', None) or report.purok):
            errors['purok'] = "This node's hotspot has no purok yet. Ask your administrator to set it."

        summary = build_event_summary(event)
        if summary is None:
            errors['system_data'] = 'No sensor readings were found for this event.'

        if errors:
            return Response(errors, status=400)

        apply_event_summary(report, event, summary)
        report.status = 'Ready_To_Verify'
        report.post_completed_at = timezone.now()
        report.save()

        log_action(
            user=request.user, action='Completed Post-Report', affected_table='tbl_canal_monitoring_reports',
            new_value=f"report {report.report_id}", ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(CanalMonitoringReportSerializer(report, context={'request': request}).data)


def _required_fields(report):
    fields = list(CanalMonitoringReportSerializer.SUBMIT_REQUIRED_FIELDS)
    if report.report_scope == 'Barangay':
        fields.remove('purok')
    return fields


class CanalReportVerifyView(_CanalReportActionBase):
    """The barangay confirms a completed report. After this it is locked."""

    def post(self, request, report_id):
        report = self.get_object()
        _require_active_barangay(report.barangay)

        if report.status != 'Ready_To_Verify':
            return Response({'detail': 'Only a completed report can be verified.'}, status=400)

        missing = [f for f in _required_fields(report) if getattr(report, f) in (None, '')]
        photos = ReportMedia.objects.filter(report=report)
        if not photos.filter(media_category='Before_Clearing').exists():
            missing.append('before_photos')
        if not photos.filter(media_category='After_Clearing').exists():
            missing.append('after_photos')
        if missing:
            return Response({'detail': 'The report is incomplete.', 'missing': missing}, status=400)

        report.status = 'Verified'
        report.verified_by = request.user
        report.verified_at = timezone.now()
        report.save()

        log_action(
            user=request.user, action='Verified Report', affected_table='tbl_canal_monitoring_reports',
            new_value=f"report {report.report_id}", ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(CanalMonitoringReportSerializer(report, context={'request': request}).data)


def _reopen_clog_event(report):
    """Voiding a report made from a clog event puts the event back to Detected so the barangay can
    respond and report again. The event is 'frozen' (settled_at set) so the sensors and the 7-day
    auto-clear leave it alone while it waits. Returns True if the event was reopened."""
    event = report.clog_event
    if event is None or event.status != 'Responded':
        return False
    if CanalMonitoringReport.objects.filter(clog_event=event).exclude(status='Voided').exists():
        return False   # the event still has another active report
    now = timezone.now()
    event.status = 'Detected'
    event.responded_at = None
    event.responded_by = None
    event.resolved_at = None
    event.settled_at = event.settled_at or now
    event.reopened_at = now
    event.save()
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        from apps.clog_events.serializers import ClogEventSerializer
        async_to_sync(get_channel_layer().group_send)(
            "clog_events", {"type": "clog_event_message", "clog_event": ClogEventSerializer(event).data},
        )
    except Exception:
        pass
    return True



class CanalReportVoidView(generics.GenericAPIView):
    """A barangay voids one of its own reports that was not submitted (made by mistake, or a test).
    The report is hidden, never blocks a submission, and is kept with who voided it and why."""
    permission_classes = [IsBarangay]
    lookup_field = 'report_id'

    def get_queryset(self):
        return CanalMonitoringReport.objects.filter(barangay=self.request.user.barangay)

    def post(self, request, report_id):
        report = self.get_object()
        _require_active_barangay(report.barangay)

        if report.is_submitted or report.status == 'Submitted':
            return Response({'detail': 'A submitted report can no longer be voided.'}, status=400)
        if report.status == 'Voided':
            return Response({'detail': 'This report is already voided.'}, status=400)

        reason = (request.data.get('reason') or '').strip()
        if len(reason) < 5:
            return Response({'detail': 'Please give a reason (at least 5 characters).'}, status=400)
        if len(reason) > 500:
            return Response({'detail': 'The reason is too long (max 500 characters).'}, status=400)

        with transaction.atomic():
            report.status = 'Voided'
            report.void_reason = reason
            report.voided_by = request.user
            report.voided_at = timezone.now()
            report.save()
            event_reopened = _reopen_clog_event(report)

        log_action(
            user=request.user, action='Voided Report', affected_table='tbl_canal_monitoring_reports',
            new_value=f"report {report.report_id}: {reason}", ip_address=request.META.get('REMOTE_ADDR'),
        )
        data = CanalMonitoringReportSerializer(report, context={'request': request}).data
        data['event_reopened'] = event_reopened
        return Response(data)


class CanalReportCompleteView(_CanalReportActionBase):
    """Finishes a report that was filled in by hand (no clog event, or an older draft).
    A response report completes through its post-report instead, using the sensors."""

    def post(self, request, report_id):
        report = self.get_object()
        _require_active_barangay(report.barangay)

        allowed = report.status == 'Draft' or (
            report.status == 'Ready_To_Verify'
            and (report.condition_source == 'Manual' or report.report_scope == 'Barangay')
        )
        if report.is_submitted or not allowed:
            return Response({'detail': 'This report cannot be completed this way.'}, status=400)

        if report.report_scope == 'Barangay':
            return _complete_cleanup(request, report)

        missing = [
            f for f in CanalMonitoringReportSerializer.SUBMIT_REQUIRED_FIELDS
            if getattr(report, f) in (None, '')
        ]
        photos = ReportMedia.objects.filter(report=report)
        if not photos.filter(media_category='Before_Clearing').exists():
            missing.append('before_photos')
        if not photos.filter(media_category='After_Clearing').exists():
            missing.append('after_photos')
        if missing:
            return Response({'detail': 'The report is incomplete.', 'missing': missing}, status=400)
        if report.date_responded < report.date_observed:
            return Response(
                {'detail': "The response time can't be earlier than the time the problem was observed."},
                status=400,
            )

        report.condition_source = 'Manual'
        report.status = 'Ready_To_Verify'
        report.post_completed_at = timezone.now()
        report.save()

        log_action(
            user=request.user, action='Completed Report', affected_table='tbl_canal_monitoring_reports',
            new_value=f"report {report.report_id} (manual)", ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response(CanalMonitoringReportSerializer(report, context={'request': request}).data)


def _complete_cleanup(request, report):
    missing = [f for f in ('assigned_personnel', 'date_responded', 'action_taken', 'waste_collected_amount')
               if getattr(report, f) in (None, '')]
    photos = ReportMedia.objects.filter(report=report)
    if not photos.filter(media_category='Before_Clearing').exists():
        missing.append('before_photos')
    if not photos.filter(media_category='After_Clearing').exists():
        missing.append('after_photos')
    if missing:
        return Response({'detail': 'The report is incomplete.', 'missing': missing}, status=400)

    now = timezone.now()
    if report.date_responded > now + timedelta(minutes=5):
        return Response({'detail': "The cleanup date can't be in the future."}, status=400)

    day = timezone.localtime(report.date_responded).date()
    others = (CanalMonitoringReport.objects
              .filter(barangay=report.barangay, report_scope='Barangay')
              .exclude(pk=report.pk).exclude(status__in=['Voided', 'Draft']))
    if any(timezone.localtime(o.date_responded or o.created_at).date() == day for o in others):
        return Response({'detail': f'You already have a cleanup report for {day:%B} {day.day}.'}, status=400)

    end = min(report.date_responded, now)
    start = end - CLEANUP_WINDOW
    built = []
    for p in range(1, report.barangay.purok_count + 1):
        cond = build_purok_condition(report.barangay, p, start, end)
        agg = cond['aggregate']
        row = ReportPurokRow(report=report, purok=p, node_count=len(cond['nodes']), included=agg is not None)
        if agg:
            row.source = 'Sensor'
            row.overall_water_level = agg['overall_water_level']
            row.overall_obstruction_coverage = agg['overall_obstruction_coverage']
            row.overall_water_flow_condition = agg['overall_water_flow_condition']
            row.peak_clog_pct = agg['peak_clog_pct']
            row.reading_count = agg['reading_count']
        built.append((row, cond))
    counted = [r for r, _ in built if r.included]
    if not counted and not (report.overall_water_level and report.overall_obstruction_coverage
                            and report.overall_water_flow_condition):
        return Response({
            'detail': 'There is no sensor data for this week. Enter the canal condition for the whole barangay.',
            'needs_manual_condition': True,
        }, status=400)

    with transaction.atomic():
        ReportNodeSummary.objects.filter(report=report).delete()
        report.purok_rows.all().delete()
        for row, cond in built:
            row.save()
            for node, s in cond['per_node']:
                hotspot = node.hotspot
                ReportNodeSummary.objects.create(
                    report=report, node=node, hotspot=hotspot,
                    node_name=node.node_name or f"Node {node.pk}",
                    hotspot_name=getattr(hotspot, 'name', '') or '',
                    purok=getattr(hotspot, 'purok', None),
                    window_start=start, window_end=end,
                    peak_waste_kg=peak_waste_kg(node, start, end),
                    **{k: s[k] for k in NODE_STAT_FIELDS},
                )

        if counted:
            report.condition_source = 'Sensor'
            report.overall_water_level = worst([r.overall_water_level for r in counted], WATER_RANK)
            report.overall_obstruction_coverage = worst([r.overall_obstruction_coverage for r in counted], OBSTRUCTION_RANK)
            report.overall_water_flow_condition = worst([r.overall_water_flow_condition for r in counted], FLOW_CHOICE_RANK)
        else:
            report.condition_source = 'Manual'   # no sensors measured anything: the barangay's own three values stay
        report.severity = SEVERITY_FROM_OBSTRUCTION.get(report.overall_obstruction_coverage, 'Low')
        report.date_observed = report.date_responded
        report.purok = None
        report.status = 'Ready_To_Verify'
        report.post_completed_at = now
        report.save()

    log_action(
        user=request.user, action='Completed Report', affected_table='tbl_canal_monitoring_reports',
        new_value=f"report {report.report_id} (whole barangay, {len(built)} purok(s))",
        ip_address=request.META.get('REMOTE_ADDR'),
    )
    return Response(CanalMonitoringReportSerializer(report, context={'request': request}).data)


class CleanupPreviewView(APIView):
    """GET ?date=<ISO>: what the sensors say for every purok of the barangay in the week up to that date."""
    permission_classes = [IsBarangay]

    def get(self, request):
        b = request.user.barangay
        now = timezone.now()
        raw = request.query_params.get('date')
        when = now
        if raw:
            when = parse_datetime(raw) or parse_datetime(raw.replace(' ', '+'))   # a "+" in a URL arrives as a space
            if when is None:
                return Response({'detail': 'Invalid date.'}, status=400)
            if timezone.is_naive(when):
                when = timezone.make_aware(when, timezone.utc)
        end = min(when, now)
        start = end - CLEANUP_WINDOW

        puroks = []
        for p in range(1, b.purok_count + 1):
            cond = build_purok_condition(b, p, start, end)
            agg = cond['aggregate']
            puroks.append({
                'purok': p,
                'node_names': [n.node_name for n in cond['nodes']],
                'has_sensor_data': agg is not None,
                'reading_count': agg['reading_count'] if agg else 0,
                'peak_clog_pct': agg['peak_clog_pct'] if agg else None,
                'overall_water_level': agg['overall_water_level'] if agg else None,
                'overall_obstruction_coverage': agg['overall_obstruction_coverage'] if agg else None,
                'overall_water_flow_condition': agg['overall_water_flow_condition'] if agg else None,
            })
        return Response({'window_start': start, 'window_end': end, 'puroks': puroks})


class CanalReportPurokRowsView(_CanalReportActionBase):
    """PUT: save the purok table as it stands (used by Save Draft and before completing)."""

    def put(self, request, report_id):
        report = self.get_object()
        if report.report_scope != 'Barangay':
            return Response({'detail': 'This report does not use a purok table.'}, status=400)
        rows = request.data.get('rows')
        if not isinstance(rows, list):
            return Response({'detail': 'rows must be a list.'}, status=400)

        count = report.barangay.purok_count
        fields = (
            ('overall_water_level', WATER_RANK),
            ('overall_obstruction_coverage', OBSTRUCTION_RANK),
            ('overall_water_flow_condition', FLOW_CHOICE_RANK),
        )
        clean, seen = [], set()
        for i, item in enumerate(rows, start=1):
            try:
                purok = int(item.get('purok'))
            except (TypeError, ValueError, AttributeError):
                return Response({'detail': f'Row {i}: invalid purok.'}, status=400)
            if not (1 <= purok <= count) or purok in seen:
                return Response({'detail': f'Row {i}: Purok {purok} is not valid for this barangay.'}, status=400)
            seen.add(purok)
            values = {}
            for field, allowed in fields:
                v = item.get(field) or None
                if v is not None and v not in allowed:
                    return Response({'detail': f'Row {i}: {v} is not a valid choice.'}, status=400)
                values[field] = v
            clean.append(ReportPurokRow(
                report=report, purok=purok, included=bool(item.get('included', True)),
                source='Manual', **values,
            ))

        with transaction.atomic():
            report.purok_rows.all().delete()
            ReportPurokRow.objects.bulk_create(clean)
        return Response(ReportPurokRowSerializer(report.purok_rows.all(), many=True).data)