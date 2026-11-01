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
from django.db import transaction, IntegrityError
from apps.barangay.models import Barangay
from agos_backend.date_range import filter_overlapping_date_range

MAX_BULK_HOTSPOTS = 50


class HotspotListView(generics.ListCreateAPIView):
    serializer_class = HotspotSerializer
    pagination_class = None

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
    permission_classes = [IsAdminOrMENRO]
    pagination_class = None

    def get_queryset(self):
        qs = NodeAssignmentHistory.objects.filter(
            hotspot_id=self.kwargs['hotspot_id']
        ).select_related('node', 'assigned_by', 'ended_by').order_by('-started_at')
        return filter_overlapping_date_range(qs, 'started_at', 'ended_at', self.request)


class HotspotBulkCreateView(APIView):
    """
    Create several hotspots in one barangay, all or nothing.
    Body: { "barangay": <id>, "hotspots": [ {code, description, latitude, longitude,
            canal_width, canal_shape, sensor_height, canal_depth}, ... ] }

    Every row is validated first (with the same rules as a single create, plus
    duplicate codes inside the batch). Nothing is saved unless ALL rows pass.
    A failure returns every problem at once:
      { "detail": "...", "errors": [ { "index": 1, "fields": { "code": "..." } } ] }
    """
    permission_classes = [IsAdminOrMENRO]

    def post(self, request):
        barangay_id = request.data.get('barangay')
        rows = request.data.get('hotspots')

        if not barangay_id or not Barangay.objects.filter(pk=barangay_id).exists():
            return Response({'detail': 'A valid barangay is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(rows, list) or not rows:
            return Response({'detail': 'Add at least one hotspot.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(rows) > MAX_BULK_HOTSPOTS:
            return Response(
                {'detail': f'You can add at most {MAX_BULK_HOTSPOTS} hotspots at once.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # validate everything before saving anything
        serializers_ok = []
        errors = []
        seen_codes = {}

        for i, row in enumerate(rows):
            data = {**(row if isinstance(row, dict) else {}), 'barangay': barangay_id}
            serializer = HotspotSerializer(data=data)
            row_errors = {}

            if not serializer.is_valid():
                for field, msgs in serializer.errors.items():
                    row_errors[field] = str(msgs[0] if isinstance(msgs, (list, tuple)) else msgs)

            # duplicate code inside this same batch
            code = str(data.get('code', '')).strip()
            if code:
                if code in seen_codes:
                    row_errors.setdefault(
                        'code', f'Same code as hotspot #{seen_codes[code] + 1} in this list.'
                    )
                else:
                    seen_codes[code] = i

            if row_errors:
                errors.append({'index': i, 'fields': row_errors})
            else:
                serializers_ok.append(serializer)

        if errors:
            return Response(
                {'detail': 'Some hotspots are invalid. Nothing was saved.', 'errors': errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # save all in one transaction
        try:
            with transaction.atomic():
                created = [s.save() for s in serializers_ok]
        except IntegrityError:
            return Response(
                {'detail': 'A hotspot with one of these codes was just added by someone else. Nothing was saved. Please try again.'},
                status=status.HTTP_409_CONFLICT,
            )

        log_action(
            user=request.user,
            action='Added Hotspots',
            affected_table='tbl_hotspots',
            new_value=f"{len(created)} hotspots: {', '.join(h.name for h in created)}",
            ip_address=request.META.get('REMOTE_ADDR'),
        )

        return Response(
            {'created': HotspotSerializer(created, many=True).data},
            status=status.HTTP_201_CREATED,
        )