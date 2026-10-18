import os
import base64
import io
from PIL import Image, ImageOps
from django.db.models import Q
from rest_framework.exceptions import ValidationError
from .validators import validate_upload, convert_heic_to_jpeg
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import CanalMonitoringReport, ReportMedia, CustomWasteType
from .serializers import CanalMonitoringReportSerializer, ReportMediaSerializer, CustomWasteTypeSerializer
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
            'barangay', 'reported_by'
        ).prefetch_related('reportmedia_set', 'custom_waste__waste_type')
        if user.user_role == 'Barangay':
            return base.filter(barangay=user.barangay).order_by('-date_observed')
        return base.filter(is_submitted=True).order_by('-date_observed')

    def perform_create(self, serializer):
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
        'barangay', 'reported_by'
    ).prefetch_related('reportmedia_set', 'custom_waste__waste_type')
    serializer_class = CanalMonitoringReportSerializer
    lookup_field = 'report_id'
    permission_classes = [CanAccessOwnCanalReport]

    def perform_update(self, serializer):
        was_submitted = serializer.instance.is_submitted
        if serializer.validated_data.get('is_submitted') and not was_submitted:
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
        }

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
        ).order_by('-date_observed')


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
            if report.is_submitted:
                return Response({'error': 'This report was already submitted.'}, status=status.HTTP_403_FORBIDDEN)
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