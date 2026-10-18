from rest_framework import generics
from django.utils.dateparse import parse_date
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from agos_backend.pdf_utils import render_to_pdf
from .models import AuditLog
from .serializers import AuditLogSerializer
from apps.users.permissions import IsAdmin
from django.db.models import Q
from django.utils import timezone
from .utils import log_action


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
    pagination_class = None

    def get_queryset(self):
        now = timezone.localtime()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month_start = (
            month_start.replace(year=month_start.year + 1, month=1)
            if month_start.month == 12
            else month_start.replace(month=month_start.month + 1)
        )
        return (
            AuditLog.objects
            .select_related('user')
            .filter(timestamp__gte=month_start, timestamp__lt=next_month_start)
            .order_by('-timestamp')
        )
class AuditLogByUserView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        user_id = self.kwargs['user_id']
        return AuditLog.objects.select_related('user').filter(
            user__user_id=user_id
        ).order_by('-timestamp')


class AuditLogExportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = AuditLog.objects.select_related('user').order_by('-timestamp')

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(action__icontains=search) |
                Q(affected_table__icontains=search) |
                Q(old_value__icontains=search) |
                Q(new_value__icontains=search) |
                Q(ip_address__icontains=search) |
                Q(user__first_name__icontains=search) | Q(user__last_name__icontains=search) | Q(user__email__icontains=search)
            )

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(timestamp__date__gte=parse_date(start_date))
        if end_date:
            qs = qs.filter(timestamp__date__lte=parse_date(end_date))

        columns = ["ID", "User", "Action", "Table", "Old Value", "New Value", "IP Address", "Timestamp"]
        rows = [
            [
                a.audit_id,
                f"{a.user.first_name} {a.user.last_name}" if a.user else "—",
                a.action,
                a.affected_table or "—",
                a.old_value or "—",
                a.new_value or "—",
                a.ip_address or "—",
                a.timestamp.strftime("%b %d, %Y %I:%M %p"),
            ]
            for a in qs
        ]

        log_action(
            user=request.user,
            action='Exported Audit Logs',
            affected_table='tbl_audit_logs',
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return render_to_pdf(
            report_title="Audit Logs",
            columns=columns,
            rows=rows,
            generated_by=f"{request.user.first_name} {request.user.last_name}",
            orientation="landscape",
            filename=f"audit-logs-{parse_date(start_date) or 'all'}.pdf" if start_date else "audit-logs.pdf",
        )