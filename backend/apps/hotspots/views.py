from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from .models import Hotspot
from .serializers import HotspotSerializer
from apps.users.permissions import IsAdmin, IsMENRO, IsAdminOrMENRO, IsAdminOrMENROOrBarangay
import re
from rest_framework.views import APIView
from apps.audit_logs.utils import log_action
from apps.sensor_nodes.models import NodeAssignmentHistory
from apps.sensor_nodes.serializers import NodeAssignmentHistorySerializer


class HotspotListView(generics.ListCreateAPIView):
    serializer_class = HotspotSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAdminOrMENRO()]
        return [IsAdminOrMENRO()]

    def get_queryset(self):
        return Hotspot.objects.select_related('barangay').filter(
            is_active=True
        ).order_by('barangay__barangay_name', 'name')

    def perform_create(self, serializer):
        hotspot = serializer.save()
        log_action(
            user=self.request.user,
            action='Added Hotspot',
            affected_table='tbl_hotspots',
            new_value=f"hotspot: {hotspot.name} (barangay: {hotspot.barangay.barangay_name})",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )


class HotspotNextCodeView(APIView):
    """
    Suggests the next available code for a barangay, based on the highest
    existing numeric code for that barangay, e.g. if CH-Rosario-3 is the
    highest, suggests "4". Non-numeric codes are ignored.
    """
    permission_classes = [IsAdminOrMENRO]

    def get(self, request):
        barangay_id = request.query_params.get('barangay')
        if not barangay_id:
            return Response({'error': 'barangay query param is required'}, status=status.HTTP_400_BAD_REQUEST)

        highest = 0
        codes = Hotspot.objects.filter(barangay_id=barangay_id).values_list('code', flat=True)
        for code in codes:
            match = re.match(r'^(\d+)$', code or '')
            if match:
                highest = max(highest, int(match.group(1)))

        return Response({'next_code': str(highest + 1)}, status=status.HTTP_200_OK)


class HotspotDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Hotspot.objects.select_related('barangay').all()
    serializer_class = HotspotSerializer
    lookup_field = 'hotspot_id'
    permission_classes = [IsAdminOrMENRO]

    def perform_update(self, serializer):
        hotspot = serializer.save()
        log_action(
            user=self.request.user,
            action='Updated Hotspot',
            affected_table='tbl_hotspots',
            new_value=f"hotspot: {hotspot.name}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()
        log_action(
            user=self.request.user,
            action='Removed Hotspot',
            affected_table='tbl_hotspots',
            old_value=f"hotspot: {instance.name}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )


class HotspotByBarangayView(generics.ListAPIView):
    """
    All hotspots under a specific barangay (occupied + available).
    Used for the hotspot management list filtered by barangay.
    """
    serializer_class = HotspotSerializer
    permission_classes = [IsAdminOrMENROOrBarangay]

    def get_queryset(self):
        barangay_id = self.kwargs['barangay_id']
        return Hotspot.objects.select_related('barangay').filter(
            barangay__barangay_id=barangay_id
        ).order_by('name')


class HotspotAvailableByBarangayView(generics.ListAPIView):
    serializer_class = HotspotSerializer
    permission_classes = [IsAdminOrMENRO]

    def get_queryset(self):
        barangay_id = self.kwargs['barangay_id']
        # Exclude hotspots that already have an active/inactive/maintenance node
        occupied_ids = [
            h.hotspot_id
            for h in Hotspot.objects.filter(barangay__barangay_id=barangay_id)
            if h.is_occupied
        ]
        return Hotspot.objects.select_related('barangay').filter(
            barangay__barangay_id=barangay_id,
            is_active=True
        ).exclude(hotspot_id__in=occupied_ids).order_by('name')


class HotspotAssignmentHistoryView(generics.ListAPIView):
    """Every node this hotspot has had assigned to it, newest first."""
    serializer_class = NodeAssignmentHistorySerializer
    permission_classes = [IsAdmin]
    pagination_class = None

    def get_queryset(self):
        return NodeAssignmentHistory.objects.filter(
            hotspot_id=self.kwargs['hotspot_id']
        ).select_related('node', 'assigned_by', 'ended_by').order_by('-started_at')
