import re
from datetime import timedelta
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import SensorNode, SystemHealthLog, MaintenanceLog, NodeAssignmentHistory
from .serializers import SensorNodeSerializer, SystemHealthLogSerializer, MaintenanceLogSerializer, NodeAssignmentHistorySerializer
from apps.users.permissions import IsAdmin, IsAdminOrMENRO, IsAdminOrMENROOrBarangay, IsIoTDevice, IoTDeviceAuthentication
from apps.users.authentication import CookieJWTAuthentication
from apps.rainfall.services import get_effective_condition, AlertThreshold
from apps.audit_logs.utils import log_action
import secrets
from django.contrib.auth.hashers import make_password
from agos_backend.pdf_utils import render_to_pdf
from .utils import send_device_key_email 
from apps.audit_logs.utils import log_action
from django.utils import timezone
from .services import assign_node, release_node, sync_assignment_change


class SensorNodeListView(generics.ListCreateAPIView):
    serializer_class = SensorNodeSerializer
    pagination_class = None

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAdminOrMENROOrBarangay()]
        return [IsAdmin()]

    def get_queryset(self):
        qs = SensorNode.objects.all()

        if self.request.user.user_role == 'Barangay':
            qs = qs.filter(barangay=self.request.user.barangay)

        availability_status = self.request.query_params.get('availability_status')
        if availability_status:
            qs = qs.filter(availability_status=availability_status)

        node_status = self.request.query_params.get('node_status')
        if node_status:
            qs = qs.filter(status=node_status)

        return qs

    def perform_create(self, serializer):
        # On create from Node Management: no hotspot or barangay yet, just node_name
        node = serializer.save(availability_status='Available')
        log_action(
            user=self.request.user,
            action='Added Node',
            affected_table='tbl_sensor_nodes',
            new_value=f"node: {node.node_name}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )


class SensorNodeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SensorNode.objects.all()
    serializer_class = SensorNodeSerializer
    lookup_field = 'node_id'
    permission_classes = [IsAdmin]

    def perform_update(self, serializer):
        instance = self.get_object()
        prev_hotspot_id = instance.hotspot_id
        prev_hotspot_name = instance.hotspot.name if instance.hotspot else '—'
        hotspot = serializer.validated_data.get('hotspot', instance.hotspot)

        # If hotspot is being set, mark Occupied; if being cleared, mark Available
        if 'hotspot' in serializer.validated_data:
            availability_status = 'Occupied' if hotspot else 'Available'
            node = serializer.save(availability_status=availability_status)
            sync_assignment_change(
                node,
                prev_hotspot_id,
                user=self.request.user,
                installed_at=serializer.validated_data.get('installed_at'),
            )
            log_action(
                user=self.request.user,
                action='Assigned Node' if hotspot else 'Unassigned Node',
                affected_table='tbl_sensor_nodes',
                old_value=f"hotspot: {prev_hotspot_name}",
                new_value=f"hotspot: {hotspot.name if hotspot else '—'}",
                ip_address=self.request.META.get('REMOTE_ADDR')
            )
        else:
            node = serializer.save()
            # Install-date-only edit on the current assignment
            if 'installed_at' in serializer.validated_data:
                sync_assignment_change(
                    node,
                    prev_hotspot_id,
                    user=self.request.user,
                    installed_at=serializer.validated_data['installed_at'],
                )
            log_action(
                user=self.request.user,
                action='Updated Node',
                affected_table='tbl_sensor_nodes',
                new_value=f"node: {node.node_name}",
                ip_address=self.request.META.get('REMOTE_ADDR')
            )

class SensorNodeByBarangayView(generics.ListAPIView):
    serializer_class = SensorNodeSerializer
    permission_classes = [IsAdminOrMENROOrBarangay]

    def get_queryset(self):
        barangay_id = self.kwargs['barangay_id']
        return SensorNode.objects.filter(barangay__barangay_id=barangay_id)


class SensorNodeNextCodeView(APIView):
    """
    Suggests the next available SN- code based on the highest existing
    numeric code, e.g. if SN-5 is the highest, suggests "6".
    Non-numeric codes (e.g. SN-A1) are ignored. Retired nodes still count,
    since their node_name stays reserved (no exclusion in the uniqueness check).
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        highest = 0
        for name in SensorNode.objects.values_list('node_name', flat=True):
            match = re.match(r'^SN-(\d+)$', name or '')
            if match:
                highest = max(highest, int(match.group(1)))

        return Response({'next_code': str(highest + 1)}, status=status.HTTP_200_OK)


class SensorNodeUnassignView(APIView):
    """
    Detach a node from its hotspot and barangay.
    Reverts availability_status to Available.
    """
    permission_classes = [IsAdmin]

    def post(self, request, node_id):
        try:
            node = SensorNode.objects.get(node_id=node_id)
        except SensorNode.DoesNotExist:
            return Response({'error': 'Node not found'}, status=status.HTTP_404_NOT_FOUND)

        if node.availability_status == 'Available':
            return Response({'error': 'Node is already unassigned'}, status=status.HTTP_400_BAD_REQUEST)

        if node.availability_status == 'Retired':
            return Response({'error': 'Retired nodes cannot be unassigned'}, status=status.HTTP_400_BAD_REQUEST)

        release_node(node, reason='Unassigned', user=request.user)
        node.status = 'Active'
        node.save(update_fields=['status'])

        log_action(
            user=request.user,
            action='Unassigned Node',
            affected_table='tbl_sensor_nodes',
            old_value=f"node: {node.node_name}",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response(
            {'message': f'Node {node_id} has been unassigned and is now available'},
            status=status.HTTP_200_OK
        )


class SensorNodeRetireView(APIView):
    """
    Permanently retire a node. Hidden from UI but data preserved.
    """
    permission_classes = [IsAdmin]

    def post(self, request, node_id):
        try:
            node = SensorNode.objects.get(node_id=node_id)
        except SensorNode.DoesNotExist:
            return Response({'error': 'Node not found'}, status=status.HTTP_404_NOT_FOUND)

        if node.availability_status == 'Retired':
            return Response({'error': 'Node is already retired'}, status=status.HTTP_400_BAD_REQUEST)

        release_node(node, reason='Retired', user=request.user, availability_status='Retired')

        open_log = MaintenanceLog.objects.filter(node=node, resolved_at__isnull=True).order_by('-started_at').first()
        if open_log:
            open_log.resolved_at = timezone.now()
            open_log.closed_reason = 'Retired'
            open_log.save(update_fields=['resolved_at', 'closed_reason'])

        log_action(
            user=request.user,
            action='Retired Node',
            affected_table='tbl_sensor_nodes',
            old_value=f"node: {node.node_name}",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({'message': f'Node {node_id} has been retired'}, status=status.HTTP_200_OK)


class SensorNodeGenerateKeyView(APIView):
    """
    Generates a new device credential for a node. The plaintext key is
    emailed to the requesting admin — it's never returned in the API
    response, stored, or recoverable again, only the hash. Calling this
    again for the same node invalidates whatever key it had before.
    """
    permission_classes = [IsAdmin]

    def post(self, request, node_id):
        try:
            node = SensorNode.objects.get(node_id=node_id)
        except SensorNode.DoesNotExist:
            return Response({'error': 'Node not found'}, status=status.HTTP_404_NOT_FOUND)

        secret = secrets.token_urlsafe(32)
        node.device_key_hash = make_password(secret)
        node.save()

        device_key = f"{node.node_id}.{secret}"
        send_device_key_email(request.user, node, device_key)

        log_action(
            user=request.user,
            action='Generated Device Key',
            affected_table='tbl_sensor_nodes',
            new_value=f"node: {node.node_name or node.node_id}",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({
            'node_id': node.node_id,
            'email': request.user.email,
            'message': 'Device key generated and sent to your email.',
        }, status=status.HTTP_200_OK)


class SensorNodeForceSleepView(APIView):
    """
    Manually commands a node to deep-sleep for a given duration,
    independent of the rainfall-band-derived reading_interval_seconds.
    Consumed by the device's own /config/ check-in (force_sleep_seconds
    field) — this endpoint just records the intent server-side.
    """
    permission_classes = [IsAdmin]

    def post(self, request, node_id):
        try:
            node = SensorNode.objects.get(node_id=node_id)
        except SensorNode.DoesNotExist:
            return Response({'error': 'Node not found'}, status=status.HTTP_404_NOT_FOUND)

        if node.availability_status == 'Retired':
            return Response({'error': 'Retired nodes cannot be put to sleep'}, status=status.HTTP_400_BAD_REQUEST)

        if node.status == 'Maintenance':
            return Response({'error': 'Nodes under maintenance cannot be forced to sleep'}, status=status.HTTP_400_BAD_REQUEST)

        if not node.hotspot:
            return Response({'error': 'Node must have a hotspot assigned to be forced to sleep'}, status=status.HTTP_400_BAD_REQUEST)

        minutes = request.data.get('minutes')
        try:
            minutes = int(minutes)
        except (TypeError, ValueError):
            return Response({'error': 'A whole number of minutes is required'}, status=status.HTTP_400_BAD_REQUEST)

        if minutes <= 0:
            return Response({'error': 'minutes must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)

        MAX_FORCE_SLEEP_MINUTES = 72 * 60
        if minutes > MAX_FORCE_SLEEP_MINUTES:
            return Response({'error': 'Forced sleep cannot exceed 72 hours'}, status=status.HTTP_400_BAD_REQUEST)

        node.forced_sleep_until = timezone.now() + timedelta(minutes=minutes)
        node.save()

        log_action(
            user=request.user,
            action='Forced Node Sleep',
            affected_table='tbl_sensor_nodes',
            new_value=f"node: {node.node_name or node.node_id} — sleep for {minutes} min",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({
            'message': f'Node {node_id} will sleep for {minutes} minute(s), until {node.forced_sleep_until.isoformat()}.',
            'forced_sleep_until': node.forced_sleep_until,
        }, status=status.HTTP_200_OK)


class SensorNodeCancelForceSleepView(APIView):
    """
    Cancels an active forced-sleep command. The device picks this up
    on its next check-in (at most one force-sleep "chunk" of latency —
    see the firmware, which re-checks periodically rather than
    sleeping through the whole original duration blind).
    """
    permission_classes = [IsAdmin]

    def post(self, request, node_id):
        try:
            node = SensorNode.objects.get(node_id=node_id)
        except SensorNode.DoesNotExist:
            return Response({'error': 'Node not found'}, status=status.HTTP_404_NOT_FOUND)

        if not node.forced_sleep_until:
            return Response({'error': 'Node has no active forced-sleep command'}, status=status.HTTP_400_BAD_REQUEST)

        node.forced_sleep_until = None
        node.save()

        log_action(
            user=request.user,
            action='Cancelled Forced Node Sleep',
            affected_table='tbl_sensor_nodes',
            new_value=f"node: {node.node_name or node.node_id}",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({'message': f'Forced sleep cancelled for node {node_id}.'}, status=status.HTTP_200_OK)


class SensorNodeConfigView(APIView):
    """
    Lightweight config endpoint for IoT devices.

    Given a node_id, returns just what a physical sensor node needs to
    configure itself at boot — currently the sensor_height stored on the
    linked hotspot. This lets one physical board be reassigned to a
    different logical node (e.g. during testing/demo) by changing which
    node_id it reports, with no firmware re-flash required — the board
    always fetches the correct sensor height for whichever node_id it's
    currently set to.
    """
    authentication_classes = [IoTDeviceAuthentication, CookieJWTAuthentication]
    permission_classes = [IsIoTDevice | IsAdminOrMENROOrBarangay]

    def get(self, request, node_id):
        try:
            node = SensorNode.objects.get(node_id=node_id)
        except SensorNode.DoesNotExist:
            return Response({'error': 'Sensor node not found'}, status=status.HTTP_404_NOT_FOUND)

        if node.availability_status == 'Retired':
            return Response({'error': 'Node is retired'}, status=status.HTTP_400_BAD_REQUEST)

        sensor_height = node.hotspot.sensor_height if node.hotspot else None
        canal_depth = node.hotspot.canal_depth if node.hotspot else None

        reading_interval_seconds = 300
        if node.barangay:
            condition = get_effective_condition(node.barangay)
            try:
                reading_interval_seconds = AlertThreshold.objects.get(condition=condition).reading_interval_seconds
            except AlertThreshold.DoesNotExist:
                pass

        # Manual override: null unless an admin has explicitly forced
        # this node to sleep and that window hasn't elapsed yet. The
        # firmware treats a non-null value here as taking priority
        # over reading_interval_seconds for this wake cycle.
        force_sleep_seconds = None
        if node.forced_sleep_until and node.forced_sleep_until > timezone.now():
            force_sleep_seconds = int((node.forced_sleep_until - timezone.now()).total_seconds())

        return Response({
            'node_id': node.node_id,
            'node_name': node.node_name,
            'hotspot_id': node.hotspot.hotspot_id if node.hotspot else None,
            'hotspot_name': node.hotspot.name if node.hotspot else None,
            'sensor_height': sensor_height,
            'canal_depth': canal_depth,
            'reading_interval_seconds': reading_interval_seconds,
            'force_sleep_seconds': force_sleep_seconds,
            'availability_status': node.availability_status,
            'status': node.status,
        }, status=status.HTTP_200_OK)


class SystemHealthLogListView(generics.ListCreateAPIView):
    pagination_class = None
    serializer_class = SystemHealthLogSerializer
    authentication_classes = [IoTDeviceAuthentication, CookieJWTAuthentication]

    def get_queryset(self):
        from django.utils import timezone
        now = timezone.now()
        return SystemHealthLog.objects.select_related(
            'node', 'node__barangay', 'node__hotspot'
        ).filter(
            checked_at__year=now.year, checked_at__month=now.month
        ).order_by('-checked_at')

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAdminOrMENRO()]
        return [IsIoTDevice()]

    def perform_create(self, serializer):
        if isinstance(self.request.auth, SensorNode):
            serializer.save(node=self.request.auth)
        else:
            serializer.save()


class SystemHealthLogByNodeView(generics.ListAPIView):
    """
    Health history for one node — the Health History tab on Node
    Management. Supports:
      ?status=Normal|Warning|Critical
      ?from=YYYY-MM-DD&to=YYYY-MM-DD  (inclusive, by checked_at date)
      ?page_size=N                    (default 20, matches other tables)
    """
    serializer_class = SystemHealthLogSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        node_id = self.kwargs['node_id']
        qs = SystemHealthLog.objects.filter(node__node_id=node_id).order_by('-checked_at')

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        date_from = self.request.query_params.get('from')
        if date_from:
            qs = qs.filter(checked_at__date__gte=date_from)

        date_to = self.request.query_params.get('to')
        if date_to:
            qs = qs.filter(checked_at__date__lte=date_to)

        return qs

    def paginate_queryset(self, queryset):
        page_size = self.request.query_params.get('page_size')
        if page_size:
            self.paginator.page_size = min(int(page_size), 100)
        return super().paginate_queryset(queryset)


class SystemHealthLogExportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        # Only export assigned nodes — a node without a hotspot isn't a
        # deployed device yet (or was retired, which clears the hotspot),
        # so it has no real health to report. Matches the "assigned"
        # definition already used on the Dashboard (hotspot_details present).
        nodes = SensorNode.objects.select_related('barangay').filter(
            hotspot__isnull=False
        ).order_by('node_name')

        columns = ["Node", "Barangay", "Status", "Battery (V)", "Battery %", "Signal (dBm)", "Sensor", "Last Checked"]
        rows = []
        for node in nodes:
            latest = SystemHealthLog.objects.filter(node=node).order_by('-checked_at').first()
            if latest:
                if latest.battery_voltage is not None:
                    pct = round(min(100, max(0, ((latest.battery_voltage - 3.0) / (4.2 - 3.0)) * 100)))
                    battery_v = f"{latest.battery_voltage:.1f}"
                    battery_pct = f"{pct}%"
                else:
                    battery_v = "—"
                    battery_pct = "—"

                rows.append([
                    node.node_name,
                    node.barangay.barangay_name if node.barangay else "—",
                    node.status,
                    battery_v,
                    battery_pct,
                    f"{latest.signal_strength}" if latest.signal_strength is not None else "—",
                    "OK" if latest.sensor_continuity else ("FAIL" if latest.sensor_continuity is False else "—"),
                    latest.checked_at.strftime("%b %d, %Y %I:%M %p"),
                ])
            else:
                rows.append([node.node_name, node.barangay.barangay_name if node.barangay else "—", node.status, "—", "—", "—", "—", "No data yet"])

        log_action(
            user=request.user,
            action='Exported System Health',
            affected_table='tbl_sensor_nodes',
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return render_to_pdf(
            report_title="System Health Summary",
            columns=columns,
            rows=rows,
            generated_by=f"{request.user.first_name} {request.user.last_name}",
            orientation="landscape",
            filename="system-health.pdf",
        )


class SensorNodeMarkMaintenanceView(APIView):
    """
    Flags a node as under maintenance and opens a MaintenanceLog entry.
    """
    permission_classes = [IsAdmin]

    def post(self, request, node_id):
        try:
            node = SensorNode.objects.get(node_id=node_id)
        except SensorNode.DoesNotExist:
            return Response({'error': 'Node not found'}, status=status.HTTP_404_NOT_FOUND)

        if node.availability_status == 'Retired':
            return Response({'error': 'Retired nodes cannot be marked under maintenance'}, status=status.HTTP_400_BAD_REQUEST)

        if node.status == 'Maintenance':
            return Response({'error': 'Node is already under maintenance'}, status=status.HTTP_400_BAD_REQUEST)

        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({'error': 'A reason is required'}, status=status.HTTP_400_BAD_REQUEST)

        previous_status = node.status
        release_node(node, reason='Maintenance', user=request.user)
        node.status = 'Maintenance'
        node.save(update_fields=['status'])

        MaintenanceLog.objects.create(node=node, reason=reason, marked_by=request.user)

        log_action(
            user=request.user,
            action='Marked Node Under Maintenance',
            affected_table='tbl_sensor_nodes',
            old_value=f"status: {previous_status}",
            new_value=f"status: Maintenance — {reason}",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({'message': f'Node {node_id} marked under maintenance'}, status=status.HTTP_200_OK)


class SensorNodeMarkAvailableView(APIView):
    """
    Marks a node fixed. Either assigns it to a hotspot (the normal path,
    using the same modal as Node Assignment) or, if the body sends
    skip_assignment: true, returns it to the unassigned pool instead —
    for a node that's repaired but not ready to be deployed yet.
    """
    permission_classes = [IsAdmin]

    def post(self, request, node_id):
        try:
            node = SensorNode.objects.get(node_id=node_id)
        except SensorNode.DoesNotExist:
            return Response({'error': 'Node not found'}, status=status.HTTP_404_NOT_FOUND)

        if node.status != 'Maintenance':
            return Response({'error': 'Node is not currently under maintenance'}, status=status.HTTP_400_BAD_REQUEST)

        skip_assignment = bool(request.data.get('skip_assignment'))

        if not skip_assignment:
            hotspot_id = request.data.get('hotspot')
            if not hotspot_id:
                return Response(
                    {'error': 'A hotspot is required, or set skip_assignment to true.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            try:
                from apps.hotspots.models import Hotspot
                hotspot = Hotspot.objects.get(hotspot_id=hotspot_id)
            except Hotspot.DoesNotExist:
                return Response({'error': 'Hotspot not found'}, status=status.HTTP_404_NOT_FOUND)

            if SensorNode.objects.filter(hotspot=hotspot).exclude(availability_status='Retired').exists():
                return Response({'error': 'This hotspot is already occupied by an active node.'}, status=status.HTTP_400_BAD_REQUEST)

            installed_at = request.data.get('installed_at')
            assign_node(node, hotspot, installed_at=installed_at, user=request.user)

        node.status = 'Active'
        node.save(update_fields=['status'])

        open_log = MaintenanceLog.objects.filter(node=node, resolved_at__isnull=True).order_by('-started_at').first()
        if open_log:
            open_log.resolved_at = timezone.now()
            open_log.closed_reason = 'Fixed'
            open_log.save(update_fields=['resolved_at', 'closed_reason'])

        log_action(
            user=request.user,
            action='Marked Node Available',
            affected_table='tbl_sensor_nodes',
            old_value="status: Maintenance",
            new_value=f"status: Active — {'assigned to ' + hotspot.name if not skip_assignment else 'no hotspot'}",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({'message': f'Node {node_id} marked as available'}, status=status.HTTP_200_OK)


class MaintenanceLogListView(generics.ListAPIView):
    serializer_class = MaintenanceLogSerializer
    permission_classes = [IsAdmin]
    pagination_class = None

    def get_queryset(self):
        qs = MaintenanceLog.objects.select_related('node', 'marked_by').order_by('-started_at')
        month = self.request.query_params.get('month')  # expects 'YYYY-MM'
        if month:
            try:
                year, mon = month.split('-')
                qs = qs.filter(started_at__year=int(year), started_at__month=int(mon))
            except ValueError:
                pass
        return qs


class MaintenanceLogExportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = MaintenanceLog.objects.select_related('node').order_by('-started_at')

        month = request.query_params.get('month')
        if month:
            try:
                year, mon = month.split('-')
                qs = qs.filter(started_at__year=int(year), started_at__month=int(mon))
            except ValueError:
                pass

        columns = ["Node", "Reason", "Date Marked", "Date Fixed"]
        rows = [
            [
                m.node.node_name,
                m.reason,
                m.started_at.strftime("%b %d, %Y %I:%M %p"),
                m.resolved_at.strftime("%b %d, %Y %I:%M %p") if m.resolved_at else "Ongoing",
            ]
            for m in qs
        ]

        log_action(
            user=request.user,
            action='Exported Maintenance Logs',
            affected_table='tbl_maintenance_logs',
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return render_to_pdf(
            report_title="Maintenance Logs",
            columns=columns,
            rows=rows,
            generated_by=f"{request.user.first_name} {request.user.last_name}",
            orientation="landscape",
            filename=f"maintenance-logs-{month}.pdf" if month else "maintenance-logs.pdf",
        )


class NodeAssignmentHistoryView(generics.ListAPIView):
    """Every hotspot this node has been assigned to, newest first."""
    serializer_class = NodeAssignmentHistorySerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = NodeAssignmentHistory.objects.filter(
            node_id=self.kwargs['node_id']
        ).select_related('node', 'assigned_by', 'ended_by').order_by('-started_at')

        reason = self.request.query_params.get('reason')
        if reason == 'current':
            qs = qs.filter(ended_at__isnull=True)
        elif reason:
            qs = qs.filter(end_reason=reason)

        return qs

    def paginate_queryset(self, queryset):
        page_size = self.request.query_params.get('page_size')
        if page_size:
            self.paginator.page_size = min(int(page_size), 200)
        return super().paginate_queryset(queryset)