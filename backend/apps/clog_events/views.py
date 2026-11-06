from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import ClogEvent
from .serializers import ClogEventSerializer, clog_clear_reason
from django.utils import timezone
from apps.users.permissions import IsAdmin, IsAdminOrMENRO, IsAdminOrMENROOrBarangay, IsBarangay
from apps.audit_logs.utils import log_action
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q
from django.utils import timezone
from agos_backend.pdf_utils import render_to_pdf
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from apps.audit_logs.utils import log_action
from datetime import timedelta
from django.db import transaction
from django.utils.dateparse import parse_datetime
from apps.reports.models import CanalMonitoringReport
from apps.reports.personnel import parse_personnel, join_names, record_personnel
from agos_backend.date_range import has_date_range, filter_by_date_range


class ClogEventListView(generics.ListCreateAPIView):
    serializer_class = ClogEventSerializer
    pagination_class = None
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'severity', 'barangay']
    ordering_fields = ['detected_at', 'severity']
    ordering = ['-detected_at']

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAdminOrMENROOrBarangay()]
        return [IsAdmin()]

    def get_queryset(self):
        from datetime import datetime
        from django.utils import timezone

        month_param = self.request.query_params.get('month')
        qs = ClogEvent.objects.select_related(
            'node__barangay', 'node__hotspot', 'classification__reading'
        )

        if has_date_range(self.request):
            qs = filter_by_date_range(qs, 'detected_at', self.request)
        elif month_param == 'All':
            pass
        elif month_param:
            try:
                target = datetime.strptime(month_param, '%Y-%m')
                qs = qs.filter(detected_at__year=target.year, detected_at__month=target.month)
            except ValueError:
                now = timezone.now()
                qs = qs.filter(detected_at__year=now.year, detected_at__month=now.month)
        else:
            now = timezone.now()
            qs = qs.filter(detected_at__year=now.year, detected_at__month=now.month)

        user = self.request.user
        if user.user_role == 'Barangay':
            qs = qs.filter(barangay=user.barangay)
        return qs
    

class ClogEventDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ClogEvent.objects.all()
    serializer_class = ClogEventSerializer
    lookup_field = 'event_id'
    permission_classes = [IsAdminOrMENRO]


class ClogEventByBarangayView(generics.ListAPIView):
    serializer_class = ClogEventSerializer
    permission_classes = [IsAdminOrMENROOrBarangay]

    def get_queryset(self):
        barangay_id = self.kwargs['barangay_id']
        return ClogEvent.objects.filter(
            barangay__barangay_id=barangay_id
        ).order_by('-detected_at')
    

class UpdateClogStatusView(APIView):
    permission_classes = [IsAdminOrMENROOrBarangay]

    def patch(self, request, event_id):
        try:
            event = ClogEvent.objects.get(event_id=event_id)
            new_status = request.data.get('status')
            user = request.user

            if user.user_role == 'Barangay' and event.barangay_id != user.barangay_id:
                return Response(
                    {'error': 'You do not have permission to update this event'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Role-based status restrictions
            if user.user_role == 'Barangay':
                return Response(
                    {'error': 'Please use the response form to respond to a clog event.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            if user.user_role in ('MENRO', 'MENRO_Staff'):
                return Response(
                    {'error': 'MENRO cannot change clog event status'},
                    status=status.HTTP_403_FORBIDDEN
                )

            if new_status not in ['Detected', 'Responded', 'Cleared']:
                return Response(
                    {'error': 'Invalid status'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            old_status = event.status
            event.status = new_status
            if new_status == 'Cleared':
                event.resolved_at = timezone.now()
                event.cleared_by = user
            elif new_status == 'Responded':
                event.responded_at = timezone.now()
                event.responded_by = user
            event.save()

            try:
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    "clog_events",
                    {"type": "clog_event_message", "clog_event": ClogEventSerializer(event).data}
                )
            except Exception:
                pass

            # Log the status update
            log_action(
                user=user,
                action=f'Updated Clog Status to {new_status}',
                affected_table='tbl_clog_events',
                old_value=old_status,
                new_value=new_status,
                ip_address=request.META.get('REMOTE_ADDR')
            )

            return Response(ClogEventSerializer(event).data)
        except ClogEvent.DoesNotExist:
            return Response(
                {'error': 'Clog event not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class ClogEventExportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        now = timezone.now()
        qs = ClogEvent.objects.select_related(
            'node', 'barangay', 'classification', 'classification__reading'
        ).filter(
            detected_at__year=now.year, detected_at__month=now.month
        ).order_by('-detected_at')

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(severity__icontains=search) |
                Q(status__icontains=search) |
                Q(barangay__barangay_name__icontains=search) |
                Q(node__node_name__icontains=search)
            )

        barangay = request.query_params.get('barangay')
        if barangay and barangay != 'All Barangay':
            qs = qs.filter(barangay__barangay_id=barangay)

        severity = request.query_params.get('severity')
        if severity and severity != 'All Severity':
            qs = qs.filter(severity=severity)

        columns = ["ID", "Severity", "Detected At", "Resolved At", "Location", "Water Level", "Water Flow", "Status", "Reason"]
        rows = []
        for c in qs:
            reading = c.classification.reading if c.classification else None
            rows.append([
                c.event_id,
                c.severity,
                c.detected_at.strftime("%b %d, %Y %I:%M %p"),
                c.resolved_at.strftime("%b %d, %Y %I:%M %p") if c.resolved_at else "—",
                c.barangay.barangay_name if c.barangay else "—",
                f"{reading.water_level} cm" if reading and reading.water_level is not None else "—",
                f"{reading.water_flow_rate:.5f} m/s" if reading and reading.water_flow_rate is not None else "—",
                c.status,
                clog_clear_reason(c) or "—",
            ])

        log_action(
            user=request.user,
            action='Exported Clog Events',
            affected_table='tbl_clog_events',
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return render_to_pdf(
            report_title="Clog Events",
            columns=columns,
            rows=rows,
            generated_by=f"{request.user.first_name} {request.user.last_name}",
            orientation="landscape",
            filename="clog-events.pdf",
        )


CLOG_TO_REPORT_SEVERITY = {'High': 'Critical', 'Medium': 'Medium', 'Low': 'Low'}


def _responded_at(raw, event):
    """The response time sent by the app. The barangay may set it earlier than now (they might have
    responded days before writing the report). Returns (time, None) or (None, error message)."""
    now = timezone.now()
    if not raw:
        return now, None
    dt = parse_datetime(str(raw))
    if dt is None:
        return now, None   # unreadable: fall back to now
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.utc)
    if dt < event.detected_at:
        return None, 'The response time cannot be before the clog was detected.'
    if dt > now + timedelta(minutes=2):
        return None, 'The response time cannot be in the future.'
    return min(dt, now), None


class ClogEventRespondView(APIView):
    """Pre-report: records the response, clears the event and starts the report in one step."""
    permission_classes = [IsBarangay]

    def post(self, request, event_id):
        user = request.user
        try:
            event = ClogEvent.objects.select_related('barangay', 'node').get(event_id=event_id)
        except ClogEvent.DoesNotExist:
            return Response({'error': 'Clog event not found'}, status=404)

        if event.barangay_id != user.barangay_id:
            return Response({'error': 'You can only respond to clog events in your barangay.'}, status=403)
        if not event.barangay.is_active:
            return Response({'error': 'Your barangay is no longer active.'}, status=400)

        personnel = (request.data.get('assigned_personnel') or '').strip()
        action = (request.data.get('action_taken') or '').strip()
        errors = {}
        if not personnel:
            errors['assigned_personnel'] = 'Please list the personnel assigned to the response.'
        else:
            personnel_names, personnel_errors = parse_personnel(personnel)
            if personnel_errors:
                errors['assigned_personnel'] = personnel_errors[0]
            elif not personnel_names:
                errors['assigned_personnel'] = 'Please list the personnel assigned to the response.'
            elif len(join_names(personnel_names)) > 500:
                errors['assigned_personnel'] = 'Personnel list is too long (max 500 characters).'
            else:
                personnel = join_names(personnel_names)
        if not action:
            errors['action_taken'] = 'Please describe the action to be taken.'
        elif len(action) > 2000:
            errors['action_taken'] = 'Action is too long (max 2000 characters).'
        if errors:
            return Response(errors, status=400)
        personnel = join_names(record_personnel(event.barangay, personnel_names, user))

        with transaction.atomic():
            event = ClogEvent.objects.select_for_update().get(pk=event.pk)
            if event.status != 'Detected':
                return Response(
                    {'error': 'This clog event has already been responded to or cleared.'},
                    status=status.HTTP_409_CONFLICT
                )

            earlier = None
            if event.reopened_at and not request.data.get('responded_at'):
                # a redo with no time sent: keep the original response time (not "now")
                earlier = CanalMonitoringReport.objects.filter(
                    clog_event=event, status='Voided', date_responded__isnull=False
                ).order_by('-voided_at').first()
            if earlier:
                responded_at = earlier.date_responded
            else:
                responded_at, time_error = _responded_at(request.data.get('responded_at'), event)
                if time_error:
                    return Response({'responded_at': time_error}, status=400)

            event.status = 'Responded'
            event.responded_at = responded_at
            event.responded_by = user
            event.resolved_at = responded_at      # a response clears the event
            event.save()

            hotspot = getattr(event.node, 'hotspot', None)
            report = CanalMonitoringReport.objects.filter(
                clog_event=event, barangay=event.barangay
            ).exclude(status='Voided').first()
            if report is None:
                report = CanalMonitoringReport(clog_event=event, barangay=event.barangay, reported_by=user)
            report.purok = getattr(hotspot, 'purok', None)
            report.date_observed = event.detected_at          # the system's detection time
            report.severity = CLOG_TO_REPORT_SEVERITY.get(event.peak_severity or event.severity)
            report.assigned_personnel = personnel
            report.action_taken = action
            report.date_responded = responded_at
            if not report.is_submitted:
                report.status = 'Awaiting_Post_Report'
            report.save()

        log_action(
            user=user, action='Responded to Clog Event', affected_table='tbl_clog_events',
            new_value=f"event {event.event_id}: {personnel} (response time {responded_at:%Y-%m-%d %H:%M}, logged {timezone.now():%Y-%m-%d %H:%M})",
            ip_address=request.META.get('REMOTE_ADDR'),
        )

        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "clog_events",
                {"type": "clog_event_message", "clog_event": ClogEventSerializer(event).data},
            )
        except Exception:
            pass

        return Response({
            'event': ClogEventSerializer(event).data,
            'report_id': report.report_id,
        }, status=status.HTTP_201_CREATED)