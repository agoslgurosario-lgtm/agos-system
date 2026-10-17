from django.db.models import Q
from django.utils import timezone
from agos_backend.pdf_utils import render_to_pdf
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import WasteClassification
from .serializers import WasteClassificationSerializer
from apps.users.permissions import IsAdminOrMENROOrBarangay, IsIoTDevice, IoTDeviceAuthentication, IsAdminOrMENRO
from apps.users.authentication import CookieJWTAuthentication
import sys
import os
from apps.audit_logs.utils import log_action


class WasteClassificationListView(generics.ListCreateAPIView):
    serializer_class = WasteClassificationSerializer
    pagination_class = None

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAdminOrMENROOrBarangay()]
        return [(IsIoTDevice | IsAdminOrMENROOrBarangay)()]

    def get_queryset(self):
        from datetime import datetime
        from django.utils import timezone

        month_param = self.request.query_params.get('month')
        qs = WasteClassification.objects.select_related('node', 'node__barangay', 'node__hotspot')

        if month_param == 'All':
            pass  # no month filter — return everything
        elif month_param:
            try:
                target = datetime.strptime(month_param, '%Y-%m')
                qs = qs.filter(timestamp__year=target.year, timestamp__month=target.month)
            except ValueError:
                now = timezone.now()
                qs = qs.filter(timestamp__year=now.year, timestamp__month=now.month)
        else:
            now = timezone.now()
            qs = qs.filter(timestamp__year=now.year, timestamp__month=now.month)

        user = self.request.user
        if user.user_role == 'Barangay':
            qs = qs.filter(node__barangay=user.barangay)
        return qs.order_by('-timestamp')


class WasteClassificationDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = WasteClassification.objects.all()
    serializer_class = WasteClassificationSerializer
    lookup_field = 'classification_id'
    permission_classes = [IsIoTDevice]


class ClassifyWasteView(APIView):
    """
    Receives an image from ESP32-CAM (as bytes or file)
    Runs it through the AI model
    Saves the classification result
    """
    authentication_classes = [IoTDeviceAuthentication, CookieJWTAuthentication]
    permission_classes = [IsIoTDevice | IsAdminOrMENROOrBarangay]

    def post(self, request):
        from apps.sensor_nodes.models import SensorNode

        image_file = request.FILES.get('image')
        reading_id = request.data.get('reading_id')
        estimated_volume = request.data.get('estimated_volume', 0.0)

        if isinstance(request.auth, SensorNode):
            node_id = request.auth.node_id
        else:
            node_id = request.data.get('node_id')

        if not image_file:
            return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)

        if not node_id or not reading_id:
            return Response({'error': 'node_id and reading_id are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Load classifier
            ai_model_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
                'ai_model'
            )
            if ai_model_path not in sys.path:
                sys.path.append(ai_model_path)
            from classifier import classify_mixed_from_bytes

            image_bytes = image_file.read()
            result = classify_mixed_from_bytes(image_bytes)

            if not result['success']:
                return Response(
                    {'error': result.get('error', 'Classification failed')},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Save to database
            from apps.sensor_readings.models import SensorReading

            node    = SensorNode.objects.get(node_id=node_id)
            reading = SensorReading.objects.get(reading_id=reading_id)
            percentages = result.get('percentages', {})

            classification = WasteClassification.objects.create(
                node=node,
                reading=reading,
                dominant_waste_type=result['dominant_waste_type'].replace('_', ' ').title(),
                recyclable_pct=percentages.get('recyclable', 0),
                biodegradable_pct=percentages.get('biodegradable', 0),
                residual_pct=percentages.get('residual', 0),
                special_waste_pct=percentages.get('special_waste', 0),
                none_pct=percentages.get('none', 0),
                confidence=result['confidence'],
                estimated_volume=float(estimated_volume),
                is_mixed=result.get('is_mixed', False),
                present_waste_types=result.get('present_waste_types', []),
            )

            return Response(
                WasteClassificationSerializer(classification).data,
                status=status.HTTP_201_CREATED
            )

        except SensorNode.DoesNotExist:
            return Response({'error': 'Sensor node not found'}, status=status.HTTP_404_NOT_FOUND)
        except SensorReading.DoesNotExist:
            return Response({'error': 'Sensor reading not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WasteClassificationExportView(APIView):
    permission_classes = [IsAdminOrMENRO]

    def get(self, request):
        from datetime import datetime

        month_param = request.query_params.get('month')
        if month_param:
            try:
                target = datetime.strptime(month_param, '%Y-%m')
            except ValueError:
                target = timezone.now()
        else:
            target = timezone.now()

        qs = WasteClassification.objects.select_related(
            'node', 'node__barangay', 'node__hotspot', 'reading'
        ).filter(
            timestamp__year=target.year, timestamp__month=target.month
        ).order_by('-timestamp')

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(dominant_waste_type__icontains=search) |
                Q(node__node_name__icontains=search) |
                Q(node__barangay__barangay_name__icontains=search)
            )

        barangay = request.query_params.get('barangay')
        if barangay and barangay != 'All Barangay':
            qs = qs.filter(node__barangay__barangay_id=barangay)

        waste_type = request.query_params.get('waste_type')
        if waste_type and waste_type != 'All Waste':
            qs = qs.filter(dominant_waste_type=waste_type)

        node = request.query_params.get('node')
        if node and node != 'All Nodes':
            qs = qs.filter(node__node_id=node)

        columns = ["ID", "Node", "Location", "Dominant Type", "Recyclable", "Biodegradable",
                   "Residual", "Special Waste", "Confidence", "Est. Volume", "Timestamp"]
        rows = [
            [
                c.classification_id,
                c.node.node_name if c.node else "—",
                c.node.barangay.barangay_name if c.node and c.node.barangay else "—",
                c.dominant_waste_type,
                f"{c.recyclable_pct:.2f}%",
                f"{c.biodegradable_pct:.2f}%",
                f"{c.residual_pct:.2f}%",
                f"{c.special_waste_pct:.2f}%",
                f"{c.confidence:.2f}%",
                f"{c.estimated_volume:.2f} kg",
                c.timestamp.strftime("%b %d, %Y %I:%M %p"),
            ]
            for c in qs
        ]

        log_action(
            user=request.user,
            action='Exported Waste Classifications',
            affected_table='tbl_waste_classification',
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return render_to_pdf(
            report_title="Waste Classification",
            columns=columns,
            rows=rows,
            generated_by=f"{request.user.first_name} {request.user.last_name}",
            orientation="landscape",
            filename=f"waste-classification-{month_param or target.strftime('%Y-%m')}.pdf",
        )