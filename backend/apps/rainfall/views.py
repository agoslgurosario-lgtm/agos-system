import math

from django.db import transaction
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.audit_logs.utils import log_action
from apps.users.permissions import IsAdmin, IsAdminOrMENROOrBarangay
from .defaults import CONDITION_ORDER, DEFAULT_ALERT_THRESHOLDS
from .models import RainfallCondition, AlertThreshold
from .serializers import RainfallConditionSerializer, AlertThresholdSerializer
from .services import get_effective_condition


FIELDS = ('warning_pct', 'critical_pct', 'reading_interval_seconds', 'clear_streak_count')


def _ensure_rows():
    """All five rows, creating any that are missing from the defaults."""
    rows = {}
    for condition in CONDITION_ORDER:
        obj, _ = AlertThreshold.objects.get_or_create(
            condition=condition, defaults=DEFAULT_ALERT_THRESHOLDS[condition]
        )
        rows[condition] = obj
    return rows


def _is_default(obj):
    default = DEFAULT_ALERT_THRESHOLDS[obj.condition]
    return all(math.isclose(getattr(obj, f), default[f]) for f in FIELDS)


def _payload(rows):
    return [
        {'condition': c, **{f: getattr(rows[c], f) for f in FIELDS}, 'is_default': _is_default(rows[c])}
        for c in CONDITION_ORDER
    ]


def _fmt(v):
    return (f"warning {v['warning_pct']}%, critical {v['critical_pct']}%, "
            f"interval {v['reading_interval_seconds']}s, clear streak {v['clear_streak_count']}")


def _apply(request, rows, targets, action):
    """
    Writes `targets` ({condition: values}) to the DB in one transaction and logs one
    audit entry listing only what changed. Returns the list of changed conditions.
    """
    changes = []
    with transaction.atomic():
        for condition in CONDITION_ORDER:
            obj, new = rows[condition], targets[condition]
            before = {f: getattr(obj, f) for f in FIELDS}
            after = {f: new[f] for f in FIELDS}
            if before == after:
                continue
            for f in FIELDS:
                setattr(obj, f, after[f])
            obj.updated_by = request.user
            obj.save()
            changes.append((condition, before, after))

    if changes:
        log_action(
            user=request.user,
            action=action,
            affected_table='tbl_alert_thresholds',
            old_value='; '.join(f"{c}: {_fmt(b)}" for c, b, _ in changes),
            new_value='; '.join(f"{c}: {_fmt(a)}" for c, _, a in changes),
            ip_address=request.META.get('REMOTE_ADDR'),
        )
    return [c for c, _, _ in changes]


class AlertThresholdView(APIView):
    """
    GET: the five rainfall-condition rows (+ is_default).
    PUT: save all five at once, all or nothing. Every row is validated first;
         on any problem nothing is saved and ALL problems come back together:
         { "detail": "...", "errors": [ { "condition": "Red", "fields": { "critical_pct": "..." } } ] }
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(_payload(_ensure_rows()))

    def put(self, request):
        data = request.data
        if not isinstance(data, list):
            return Response({'detail': 'Expected a list of thresholds.'}, status=status.HTTP_400_BAD_REQUEST)

        targets, errors = {}, []
        for row in data:
            condition = row.get('condition') if isinstance(row, dict) else None
            if condition not in DEFAULT_ALERT_THRESHOLDS:
                return Response({'detail': f'Unknown rainfall condition: {condition}.'}, status=status.HTTP_400_BAD_REQUEST)
            if condition in targets:
                return Response({'detail': f'{condition} was sent more than once.'}, status=status.HTTP_400_BAD_REQUEST)

            serializer = AlertThresholdSerializer(data=row)
            if serializer.is_valid():
                targets[condition] = serializer.validated_data
            else:
                targets[condition] = None
                errors.append({
                    'condition': condition,
                    'fields': {k: str(v[0] if isinstance(v, (list, tuple)) else v)
                               for k, v in serializer.errors.items()},
                })

        if set(targets) != set(CONDITION_ORDER):
            return Response({'detail': 'All five rainfall conditions are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if errors:
            return Response(
                {'detail': 'Some values are invalid. Nothing was saved.', 'errors': errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rows = _ensure_rows()
        _apply(request, rows, targets, 'Updated Alert Thresholds')
        return Response(_payload(_ensure_rows()))


class AlertThresholdResetView(APIView):
    """Restore all five rows to DEFAULT_ALERT_THRESHOLDS."""
    permission_classes = [IsAdmin]

    def post(self, request):
        rows = _ensure_rows()
        _apply(request, rows, DEFAULT_ALERT_THRESHOLDS, 'Reset Alert Thresholds to Default')
        return Response(_payload(_ensure_rows()))

class MyBarangayRainfallConditionView(APIView):
    permission_classes = [IsAdminOrMENROOrBarangay]

    def get(self, request):
        barangay = request.user.barangay
        condition = get_effective_condition(barangay)
        return Response({'condition': condition})