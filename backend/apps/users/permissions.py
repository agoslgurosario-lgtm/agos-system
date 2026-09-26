from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.hashers import check_password
from django.conf import settings

class _RolePermission(BasePermission):
    message = "Your account is not active. Please contact your administrator."
    allowed_roles: list = []

    def has_permission(self, request, view):
        user = request.user
        return (
            user.is_authenticated
            and getattr(user, 'status', None) == 'Active'
            and user.user_role in self.allowed_roles
        )


class IsAdmin(_RolePermission):
    allowed_roles = ['Admin']


class IsMENRO(_RolePermission):
    allowed_roles = ['MENRO']


class IsBarangay(_RolePermission):
    allowed_roles = ['Barangay']


class IsAdminOrMENRO(_RolePermission):
    allowed_roles = ['Admin', 'MENRO', 'MENRO_Staff']


class IsAdminOrMENROOrBarangay(_RolePermission):
    allowed_roles = ['Admin', 'MENRO', 'MENRO_Staff', 'Barangay']


class IsAdminOrMENROOfficer(_RolePermission):
    """Officer only — excludes MENRO Staff. Used for barangay/municipal reports."""
    allowed_roles = ['Admin', 'MENRO']
    

# for iot
class IoTDeviceAuthentication(BaseAuthentication):
    """
    Per-device authentication for IoT nodes. Expects a header like:
        X-API-Key: {node_id}.{secret}

    The node_id prefix isn't secret — it just lets us look up the
    exact SensorNode in one query. The part after the dot is checked
    against that node's stored hash. On success, the authenticated
    SensorNode is attached as request.auth, so views can trust
    request.auth.node_id instead of anything the client claims in the
    request body.
    """
    def authenticate(self, request):
        from apps.sensor_nodes.models import SensorNode

        api_key = request.headers.get('X-API-Key')

        if not api_key:
            return None

        if '.' not in api_key:
            raise AuthenticationFailed('Invalid API key')

        node_id_str, secret = api_key.split('.', 1)
        if not node_id_str.isdigit():
            raise AuthenticationFailed('Invalid API key')

        try:
            node = SensorNode.objects.get(node_id=int(node_id_str))
        except SensorNode.DoesNotExist:
            raise AuthenticationFailed('Invalid API key')

        if not node.device_key_hash or not check_password(secret, node.device_key_hash):
            raise AuthenticationFailed('Invalid API key')

        if node.status != 'Active':
            raise AuthenticationFailed('Device is not active')

        return (IoTUser(node), node)


class IoTUser:
    """Represents an authenticated IoT device, tied to a specific SensorNode."""
    is_authenticated = True
    user_role = 'IoT'

    def __init__(self, node):
        self.node = node

    @property
    def pk(self):
        return self.node.node_id

    def __str__(self):
        return f'IoT Device (node {self.node.node_id})'


class IsIoTDevice(BasePermission):
    def has_permission(self, request, view):
        return (
            hasattr(request, 'user') and 
            isinstance(request.user, IoTUser)
        )


class CanAccessOwnCanalReport(BasePermission):
    """
    Used for CanalMonitoringReportDetailView and the export view.
    Admin/MENRO/MENRO_Staff: read-only, and only on submitted reports
    (they receive reports, they don't edit or approve them).
    Barangay: GET/PATCH/DELETE on their own barangay's reports while
    still in progress; once submitted, read/export only. A submitted
    report is the record.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.user_role in ['Admin', 'MENRO', 'MENRO_Staff']:
            return request.method in SAFE_METHODS
        if user.user_role == 'Barangay':
            return True
        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.user_role in ['Admin', 'MENRO', 'MENRO_Staff']:
            return obj.is_submitted
        if user.user_role == 'Barangay':
            if obj.barangay_id != user.barangay_id:
                return False
            return (not obj.is_submitted) or request.method in SAFE_METHODS
        return False


class CanAccessOwnCanalReportMedia(BasePermission):
    """
    Used for ReportMediaDetailView.
    Admin/MENRO/MENRO_Staff: read-only, and never on photos of an
    unsubmitted report.
    Barangay: GET/DELETE on media attached to their own barangay's
    report; once that report is submitted, read-only.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.user_role in ['Admin', 'MENRO', 'MENRO_Staff']:
            return request.method in SAFE_METHODS
        if user.user_role == 'Barangay':
            return request.method in ['GET', 'DELETE']
        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        report = obj.report
        if user.user_role in ['Admin', 'MENRO', 'MENRO_Staff']:
            # media with no report is clog-event evidence, which stays visible
            return report is None or report.is_submitted
        if user.user_role == 'Barangay':
            if not report or report.barangay_id != user.barangay_id:
                return False
            return (not report.is_submitted) or request.method in SAFE_METHODS
        return False