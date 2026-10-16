from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import ClogEvent
from .serializers import ClogEventSerializer, clog_clear_reason
from django.utils import timezone
from apps.users.permissions import IsAdmin, IsAdminOrMENRO, IsAdminOrMENROOrBarangay
from apps.audit_logs.utils import log_action
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q
from django.utils import timezone
from agos_backend.pdf_utils import render_to_pdf
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from apps.audit_logs.utils import log_action


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

        if month_param == 'All':
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
            if user.user_role == 'Barangay' and new_status not in ['Responded', 'Cleared']:
                return Response(
                    {'error': 'Barangay can only set Responded or Cleared'},
                    status=status.HTTP_403_FORBIDDEN
                )

            if user.user_role in ('MENRO', 'MENRO_Staff') and new_status not in ['Verified']:
                return Response(
                    {'error': 'MENRO can only set Verified'},
                    status=status.HTTP_403_FORBIDDEN
                )

            if new_status not in ['Detected', 'Responded', 'Cleared', 'Verified']:
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