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
from .models import CanalMonitoringReport, ReportMedia
from .serializers import CanalMonitoringReportSerializer, ReportMediaSerializer
from apps.users.permissions import (
    IsBarangay, IsAdminOrMENROOrBarangay, IsAdminOrMENROOfficer,
    CanAccessOwnCanalReport, CanAccessOwnCanalReportMedia,
)
from apps.audit_logs.utils import log_action
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from agos_backend.pdf_utils import render_custom_pdf, get_logo_data_uri



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
    Placeholder until signatory management exists: the same four positions as the MRF
    form, names left blank. Later, build this list from the barangay's saved signatories
    instead. The template renders whatever comes back here, two per row.
    """
    signatories = [{'name': '', 'position': p} for p in DEFAULT_SIGNATORY_POSITIONS]
    return [signatories[i:i + 2] for i in range(0, len(signatories), 2)]


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
        if user.user_role == 'Barangay':
            return CanalMonitoringReport.objects.filter(
                barangay=user.barangay
            ).order_by('-date_observed')
        return CanalMonitoringReport.objects.filter(is_submitted=True).order_by('-date_observed')

    def perform_create(self, serializer):
        serializer.save(
            barangay=self.request.user.barangay,
            reported_by=self.request.user,
        )


class CanalMonitoringReportDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CanalMonitoringReport.objects.all()
    serializer_class = CanalMonitoringReportSerializer
    lookup_field = 'report_id'
    permission_classes = [CanAccessOwnCanalReport]

    def perform_update(self, serializer):
        was_submitted = serializer.instance.is_submitted
        report = serializer.save()
        if report.is_submitted and not was_submitted:
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

        context = {
            "logo_data_uri": get_logo_data_uri(),
            "report": report,
            "generated_by": f"{request.user.first_name} {request.user.last_name}",
            "severity_options": _choice_options(CanalMonitoringReport.SEVERITY_CHOICES, report.severity),
            "water_level_options": _choice_options(CanalMonitoringReport.WATER_LEVEL_CHOICES, report.water_level),
            "coverage_options": _choice_options(CanalMonitoringReport.OBSTRUCTION_COVERAGE_CHOICES, report.obstruction_coverage),
            "flow_options": _choice_options(CanalMonitoringReport.WATER_FLOW_CHOICES, report.water_flow_condition),
            "final_condition_options": _choice_options(CanalMonitoringReport.CANAL_CONDITION_CHOICES, report.final_canal_condition),
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
        return CanalMonitoringReport.objects.filter(
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
        clog_event_id = request.data.get('clog_event_id')
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

        if clog_event_id:
            from apps.clog_events.models import ClogEvent
            try:
                media.clog_event_id = ClogEvent.objects.get(event_id=clog_event_id)
            except ClogEvent.DoesNotExist:
                pass

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
        return ReportMedia.objects.filter(clog_event_id=event_id).filter(
            Q(report__isnull=True) | Q(report__is_submitted=True)
        )