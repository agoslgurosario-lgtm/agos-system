from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Alert, AlertRead
from .serializers import AlertSerializer
from apps.users.permissions import IsAdmin, IsAdminOrMENROOrBarangay
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q


class AlertListView(generics.ListAPIView):
    serializer_class = AlertSerializer
    permission_classes = [IsAdminOrMENROOrBarangay]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = []

    def get_queryset(self):
        user = self.request.user
        qs = Alert.objects.select_related(
            'node__barangay', 'node__hotspot', 'report__barangay', 'barangay',
            'health_log', 'event__classification__reading',
        ).order_by('-timestamp')

        if user.user_role == 'Barangay':
            qs = qs.filter(Q(node__barangay=user.barangay) | Q(barangay=user.barangay))
        else:
            qs = qs.exclude(alert_type='Waste_Type_Rejected')  # barangay-only notice

        # barangay filter
        barangay_id = self.request.query_params.get('barangay')
        if barangay_id:
            qs = qs.filter(Q(node__barangay__barangay_id=barangay_id) | Q(report__barangay__barangay_id=barangay_id))

        # alert type filter
        alert_type = self.request.query_params.get('alert_type')
        if alert_type:
            types = [t.strip() for t in alert_type.split(',')]
            qs = qs.filter(alert_type__in=types)

        # date filter
        date_filter = self.request.query_params.get('date')
        if date_filter == 'Today':
            qs = qs.filter(timestamp__date=timezone.localtime(timezone.now()).date())
        elif date_filter == '7Days':
            qs = qs.filter(timestamp__gte=timezone.now() - timedelta(days=7))
        elif date_filter == '30Days':
            qs = qs.filter(timestamp__gte=timezone.now() - timedelta(days=30))

        return qs
    

class AlertMarkReadView(APIView):
    permission_classes = [IsAdminOrMENROOrBarangay]

    def post(self, request, alert_id):
        try:
            alert = Alert.objects.get(alert_id=alert_id)
        except Alert.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.user_role == 'Barangay':
            own_node = alert.node and alert.node.barangay_id == user.barangay_id
            own_notice = alert.barangay_id is not None and alert.barangay_id == user.barangay_id
            if not (own_node or own_notice):
                return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        elif alert.alert_type == 'Waste_Type_Rejected':
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)


class AlertUnreadCountView(APIView):
    permission_classes = [IsAdminOrMENROOrBarangay]

    def get(self, request):
        user = request.user
        if user.user_role == 'Barangay':
            queryset = Alert.objects.filter(Q(node__barangay=user.barangay) | Q(barangay=user.barangay))
        else:
            queryset = Alert.objects.exclude(alert_type='Waste_Type_Rejected')

        unread = queryset.exclude(reads__user=user).count()
        return Response({'unread_count': unread})


class AlertMarkAllReadView(APIView):
    permission_classes = [IsAdminOrMENROOrBarangay]

    def post(self, request):
        user = request.user
        if user.user_role == 'Barangay':
            queryset = Alert.objects.filter(Q(node__barangay=user.barangay) | Q(barangay=user.barangay))
        else:
            queryset = Alert.objects.exclude(alert_type='Waste_Type_Rejected')

        unread_ids = queryset.exclude(reads__user=user).values_list('alert_id', flat=True)

        AlertRead.objects.bulk_create(
            [AlertRead(alert_id=alert_id, user=user) for alert_id in unread_ids],
            ignore_conflicts=True,
        )
        return Response({'detail': 'All alerts marked as read.'})