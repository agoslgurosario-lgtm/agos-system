from django.db import transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Barangay
from .serializers import BarangaySerializer
from .boundary import normalize_boundary, BoundaryError
from apps.users.permissions import IsAdmin, IsAdminOrMENROOrBarangay
from apps.hotspots.models import Hotspot
from apps.audit_logs.utils import log_action
from .boundary import normalize_boundary, point_in_boundary, BoundaryError


# functions
def _get_barangay(barangay_id):
    return Barangay.objects.exclude(barangay_name='Admin').filter(barangay_id=barangay_id).first()


def _blockers(barangay):
    """What still ties this barangay to live operations (shared by check/unregister/deactivate)."""
    from apps.sensor_nodes.models import SensorNode
    from apps.users.models import User

    nodes = SensorNode.objects.filter(barangay=barangay).exclude(status='Inactive').count()
    hotspots = Hotspot.objects.filter(barangay=barangay, is_active=True).count()
    users = User.objects.filter(barangay=barangay, user_role='Barangay', status='Active').count()

    issues = []
    if nodes:
        issues.append(f"{nodes} active sensor node(s)")
    if hotspots:
        issues.append(f"{hotspots} active canal hotspot(s)")
    if users:
        issues.append(f"{users} active barangay user(s)")
    return issues


def _name_error(name, exclude_id=None):
    if not name:
        return 'Barangay name is required.'
    if len(name) > 100:
        return 'Barangay name must be 100 characters or fewer.'
    if name.lower() == 'admin':
        return 'This name is reserved.'
    qs = Barangay.objects.filter(barangay_name__iexact=name)
    if exclude_id:
        qs = qs.exclude(barangay_id=exclude_id)
    if qs.exists():
        return 'A barangay with this name already exists.'
    return None


def _number(value, label, lo, hi):
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None, f'{label} is required and must be a number.'
    if not (lo <= v <= hi):
        return None, f'{label} must be between {lo} and {hi}.'
    return v, None


MAX_PUROK_COUNT = 30

def _purok_count(value):
    try:
        n = int(value)
    except (TypeError, ValueError):
        return None, 'Number of puroks must be a whole number.'
    if not (1 <= n <= MAX_PUROK_COUNT):
        return None, f'Number of puroks must be between 1 and {MAX_PUROK_COUNT}.'
    return n, None


def _ip(request):
    return request.META.get('REMOTE_ADDR')


# views
class BarangayListView(generics.ListCreateAPIView):
    serializer_class = BarangaySerializer
    pagination_class = None

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAdminOrMENROOrBarangay()]
        return [IsAdmin()]

    def get_queryset(self):
        return (Barangay.objects
                .filter(is_registered=True, is_active=True)
                .exclude(barangay_name='Admin'))

    def create(self, request, *args, **kwargs):
        data = request.data
        errors = {}

        name = (data.get('barangay_name') or '').strip()
        err = _name_error(name)
        if err:
            errors['barangay_name'] = err

        lat, err = _number(data.get('latitude'), 'Latitude', -90, 90)
        if err:
            errors['latitude'] = err
        lng, err = _number(data.get('longitude'), 'Longitude', -180, 180)
        if err:
            errors['longitude'] = err

        boundary = None
        if data.get('boundary') not in (None, ''):
            try:
                boundary = normalize_boundary(data.get('boundary'), name)
            except BoundaryError as e:
                errors['boundary'] = str(e)

        purok_count = 7
        if data.get('purok_count') not in (None, ''):
            purok_count, err = _purok_count(data.get('purok_count'))
            if err:
                errors['purok_count'] = err

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        # New barangays start Unregistered, same as the existing ones. Admin registers them from the list.
        barangay = Barangay.objects.create(
            purok_count=purok_count,
            barangay_name=name, latitude=lat, longitude=lng,
            is_registered=False, is_active=True, boundary=boundary,
        )
        log_action(
            user=request.user, action='Added Barangay', affected_table='tbl_barangay',
            new_value=f"barangay: {name}", ip_address=_ip(request),
        )
        return Response(self.get_serializer(barangay).data, status=status.HTTP_201_CREATED)


class BarangayDetailView(generics.RetrieveUpdateAPIView):
    queryset = Barangay.objects.exclude(barangay_name='Admin')
    serializer_class = BarangaySerializer
    lookup_field = 'barangay_id'
    permission_classes = [IsAdmin]
    http_method_names = ['get', 'patch', 'head', 'options']

    def update(self, request, *args, **kwargs):
        b = self.get_object()
        data = request.data
        errors = {}

        old_name = b.barangay_name
        name, lat, lng, boundary = old_name, b.latitude, b.longitude, b.boundary
        purok_count = b.purok_count
        boundary_given = False

        if 'barangay_name' in data:
            name = (data.get('barangay_name') or '').strip()
            err = _name_error(name, exclude_id=b.barangay_id)
            if err:
                errors['barangay_name'] = err
        if 'latitude' in data:
            lat, err = _number(data.get('latitude'), 'Latitude', -90, 90)
            if err:
                errors['latitude'] = err
        if 'longitude' in data:
            lng, err = _number(data.get('longitude'), 'Longitude', -180, 180)
            if err:
                errors['longitude'] = err
        if 'boundary' in data:
            boundary_given = True
            if data.get('boundary') in (None, ''):
                boundary = None
            else:
                try:
                    boundary = normalize_boundary(data.get('boundary'), name)
                except BoundaryError as e:
                    errors['boundary'] = str(e)

        if 'purok_count' in data:
            purok_count, err = _purok_count(data.get('purok_count'))
            if err:
                errors['purok_count'] = err
            else:
                too_high = (Hotspot.objects
                            .filter(barangay=b, is_active=True, purok__gt=purok_count)
                            .order_by('-purok').first())
                if too_high:
                    errors['purok_count'] = (
                        f'Purok {too_high.purok} is still used by {too_high.name}. Move or remove it first.'
                    )

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        # a new outline must not silently strand existing hotspots
        outside = []
        if boundary_given and boundary is not None:
            outside = [
                h for h in Hotspot.objects.filter(barangay=b, is_active=True)
                if not point_in_boundary(h.longitude, h.latitude, boundary)
            ]
            confirmed = data.get('confirm_outside_hotspots') in (True, 'true', 'True', 1, '1')
            if outside and not confirmed:
                return Response({
                    'detail': f'{len(outside)} active hotspot(s) would fall outside the new outline.',
                    'outside_hotspots': [
                        {'hotspot_id': h.hotspot_id, 'name': h.name} for h in outside
                    ],
                }, status=status.HTTP_409_CONFLICT)

        renamed = name != old_name
        with transaction.atomic():
            if renamed and boundary and not boundary_given:
                boundary = {**boundary, 'properties': {**(boundary.get('properties') or {}), 'adm4_en': name}}

            b.barangay_name, b.latitude, b.longitude, b.boundary = name, lat, lng, boundary
            b.purok_count = purok_count
            b.save()

            if renamed:
                # hotspot names are stored as "<prefix>-<barangay>-<code>", keep them in sync
                marker = f"-{old_name}-"
                hotspots = list(Hotspot.objects.filter(barangay=b, name__contains=marker))
                for h in hotspots:
                    head, _, tail = h.name.partition(marker)
                    h.name = f"{head}-{name}-{tail}"
                if hotspots:
                    Hotspot.objects.bulk_update(hotspots, ['name'])

        log_action(
            user=request.user, action='Edited Barangay', affected_table='tbl_barangay',
            old_value=f"barangay: {old_name}",
            new_value=f"barangay: {name}" + (
                f" (outline changed, {len(outside)} hotspot(s) outside)" if outside else ""
            ),
            ip_address=_ip(request),
        )
        return Response(self.get_serializer(b).data)


class BarangayBoundaryView(APIView):
    """Outline kept out of list responses because it is large."""
    permission_classes = [IsAdminOrMENROOrBarangay]

    def get(self, request, barangay_id):
        b = Barangay.objects.filter(barangay_id=barangay_id).first()
        if not b:
            return Response({'detail': 'Barangay not found.'}, status=404)
        return Response({'boundary': b.boundary})


# ---------- list all (includes inactive, for history/filters) ----------

class BarangayAllView(generics.ListAPIView):
    serializer_class = BarangaySerializer
    permission_classes = [IsAdminOrMENROOrBarangay]
    pagination_class = None

    def get_queryset(self):
        return Barangay.objects.exclude(barangay_name='Admin').order_by('barangay_name')


# ---------- state changes ----------

class BarangayCheckView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, barangay_id):
        barangay = _get_barangay(barangay_id)
        if not barangay:
            return Response({'detail': 'Barangay not found.'}, status=404)

        issues = _blockers(barangay)
        if issues:
            return Response({
                'can_unregister': False,
                'can_deactivate': False,
                'detail': f"Cannot unregister {barangay.barangay_name}. Please decommission them first.",
                'issues': issues,
            })
        return Response({'can_unregister': True, 'can_deactivate': True})


class BarangayRegisterView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, barangay_id):
        barangay = _get_barangay(barangay_id)
        if not barangay:
            return Response({'detail': 'Barangay not found.'}, status=404)
        if not barangay.is_active:
            return Response({'detail': 'This barangay is inactive. Reactivate it first.'}, status=400)
        if barangay.is_registered:
            return Response({'detail': 'Barangay is already registered.'}, status=400)

        barangay.is_registered = True
        barangay.save(update_fields=['is_registered'])
        log_action(
            user=request.user, action='Registered Barangay', affected_table='tbl_barangay',
            new_value=f"barangay: {barangay.barangay_name}", ip_address=_ip(request),
        )
        return Response({'detail': f'{barangay.barangay_name} has been registered.'})


class BarangayUnregisterView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, barangay_id):
        barangay = _get_barangay(barangay_id)
        if not barangay:
            return Response({'detail': 'Barangay not found.'}, status=404)

        issues = _blockers(barangay)
        if issues:
            return Response({
                'detail': f"Cannot unregister {barangay.barangay_name}. It still has {' and '.join(issues)}. Please decommission them first."
            }, status=status.HTTP_400_BAD_REQUEST)

        barangay.is_registered = False
        barangay.save(update_fields=['is_registered'])
        log_action(
            user=request.user, action='Unregistered Barangay', affected_table='tbl_barangay',
            old_value=f"barangay: {barangay.barangay_name}", ip_address=_ip(request),
        )
        return Response({'detail': f'{barangay.barangay_name} has been unregistered.'})


class BarangayDeactivateView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, barangay_id):
        barangay = _get_barangay(barangay_id)
        if not barangay:
            return Response({'detail': 'Barangay not found.'}, status=404)
        if not barangay.is_active:
            return Response({'detail': 'Barangay is already inactive.'}, status=400)

        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({'reason': 'A reason is required.'}, status=400)
        if len(reason) > 500:
            return Response({'reason': 'Reason must be 500 characters or fewer.'}, status=400)

        issues = _blockers(barangay)
        if issues:
            return Response({
                'detail': f"Cannot deactivate {barangay.barangay_name}. It still has {' and '.join(issues)}. Please decommission them first."
            }, status=400)

        barangay.is_registered = False
        barangay.is_active = False
        barangay.deactivated_at = timezone.now()
        barangay.deactivation_reason = reason
        barangay.save(update_fields=['is_registered', 'is_active', 'deactivated_at', 'deactivation_reason'])
        log_action(
            user=request.user, action='Deactivated Barangay', affected_table='tbl_barangay',
            old_value=f"barangay: {barangay.barangay_name}", new_value=f"reason: {reason}",
            ip_address=_ip(request),
        )
        return Response({'detail': f'{barangay.barangay_name} has been deactivated.'})


class BarangayReactivateView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, barangay_id):
        barangay = _get_barangay(barangay_id)
        if not barangay:
            return Response({'detail': 'Barangay not found.'}, status=404)
        if barangay.is_active:
            return Response({'detail': 'Barangay is already active.'}, status=400)

        # comes back Unregistered; admin registers it again from the list
        barangay.is_active = True
        barangay.deactivated_at = None
        barangay.deactivation_reason = ''
        barangay.save(update_fields=['is_active', 'deactivated_at', 'deactivation_reason'])
        log_action(
            user=request.user, action='Reactivated Barangay', affected_table='tbl_barangay',
            new_value=f"barangay: {barangay.barangay_name}", ip_address=_ip(request),
        )
        return Response({'detail': f'{barangay.barangay_name} has been reactivated.'})