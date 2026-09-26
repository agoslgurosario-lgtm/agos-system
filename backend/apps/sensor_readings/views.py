import cv2
import numpy as np
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import SensorReading
from .serializers import SensorReadingSerializer
from apps.sensor_nodes.models import SensorNode
from apps.users.permissions import IsAdminOrMENRO, IsIoTDevice, IoTDeviceAuthentication
from apps.users.authentication import CookieJWTAuthentication
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

class SensorReadingListView(generics.ListCreateAPIView):
    queryset = SensorReading.objects.all().order_by('-timestamp')
    serializer_class = SensorReadingSerializer
    authentication_classes = [IoTDeviceAuthentication, CookieJWTAuthentication]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAdminOrMENRO()]
        return [IsIoTDevice()]

    def perform_create(self, serializer):
        if isinstance(self.request.auth, SensorNode):
            serializer.save(node=self.request.auth)
        else:
            serializer.save()


class SensorReadingByNodeView(generics.ListAPIView):
    serializer_class = SensorReadingSerializer
    permission_classes = [IsAdminOrMENRO]

    def get_queryset(self):
        node_id = self.kwargs['node_id']
        qs = SensorReading.objects.filter(node__node_id=node_id).order_by('-timestamp')

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(reading_status=status_param)

        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        hotspot_param = request.query_params.get('hotspot')
        if hotspot_param:
            from apps.sensor_nodes.services import hotspot_at
            queryset = [
                r for r in queryset
                if hotspot_at(r.node, r.timestamp)[1] == hotspot_param
            ]

        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page if page is not None else queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


# Tunable constants

TREND_WINDOW    = 5
FLOW_NORMAL_MIN = 0.002
FLOW_SLOW_MIN   = 0.001
WEIGHT_FLOW     = 0.60
WEIGHT_TREND    = 0.40
MAX_FLOW_RATE   = 0.002
MAX_TREND_RISE  = 5.0
FRAME_COUNT     = 5

# clog_pct threshold to trigger waste classification
CLASSIFY_THRESHOLD = 30.0


# Optical flow

def compute_optical_flow(frames_bytes: list, camera_height_cm: float):
    if len(frames_bytes) < 2:
        return None

    first_arr = np.frombuffer(frames_bytes[0], dtype=np.uint8)
    try:
        first_frame = cv2.imdecode(first_arr, cv2.IMREAD_GRAYSCALE)
    except cv2.error:
        first_frame = None
    if first_frame is None:
        return None

    img_height, img_width = first_frame.shape
    camera_height_m = camera_height_cm / 100.0
    real_width_m = camera_height_m * 1.155
    pixels_per_meter = img_width / real_width_m if real_width_m > 0 else 1000

    lk_params = dict(
        winSize=(21, 21),
        maxLevel=3,
        criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01),
    )
    feature_params = dict(
        maxCorners=200,
        qualityLevel=0.01,
        minDistance=7,
        blockSize=7,
    )

    velocities = []
    prev_gray = first_frame

    for i in range(1, len(frames_bytes)):
        curr_arr = np.frombuffer(frames_bytes[i], dtype=np.uint8)
        try:
            curr_gray = cv2.imdecode(curr_arr, cv2.IMREAD_GRAYSCALE)
        except cv2.error:
            curr_gray = None
        if curr_gray is None:
            continue

        prev_pts = cv2.goodFeaturesToTrack(prev_gray, mask=None, **feature_params)
        if prev_pts is None or len(prev_pts) == 0:
            prev_gray = curr_gray
            continue

        curr_pts, status_arr, _ = cv2.calcOpticalFlowPyrLK(
            prev_gray, curr_gray, prev_pts, None, **lk_params
        )

        good_prev = prev_pts[status_arr == 1]
        good_curr = curr_pts[status_arr == 1]

        if len(good_prev) == 0:
            prev_gray = curr_gray
            continue

        displacements = np.sqrt(np.sum((good_curr - good_prev) ** 2, axis=1))
        frame_interval_s = 0.2
        speeds_m_s = displacements / pixels_per_meter / frame_interval_s

        if len(speeds_m_s) > 0:
            velocities.append(float(np.median(speeds_m_s)))

        prev_gray = curr_gray

    if not velocities:
        return None

    return float(np.median(velocities))


# ------------------------------------------------------------------
# Water level trend
# ------------------------------------------------------------------

def compute_trend_contribution(node, current_water_level: float) -> float:
    recent = SensorReading.objects.filter(
        node=node
    ).order_by('-timestamp')[:TREND_WINDOW]

    if not recent:
        return 0.0

    levels = [current_water_level] + [r.water_level for r in recent]

    if len(levels) < 2:
        return 0.0

    net_rise = levels[0] - levels[-1]
    if net_rise <= 0:
        return 0.0

    return min(net_rise / MAX_TREND_RISE, 1.0)


# ------------------------------------------------------------------
# clog_pct
# ------------------------------------------------------------------

def compute_clog_pct(flow_rate, trend_contribution: float):
    if flow_rate is None:
        return None

    normalized_flow = min(flow_rate / MAX_FLOW_RATE, 1.0)
    flow_contribution = 1.0 - normalized_flow

    clog = (WEIGHT_FLOW * flow_contribution) + (WEIGHT_TREND * trend_contribution)
    return round(min(clog * 100, 100.0), 2)

# ------------------------------------------------------------------
# water_flow category
# ------------------------------------------------------------------

def get_water_flow_category(flow_rate) -> str:
    if flow_rate is None:
        return 'Normal'
    if flow_rate >= FLOW_NORMAL_MIN:
        return 'Normal'
    if flow_rate >= FLOW_SLOW_MIN:
        return 'Slow'
    return 'Stagnant'


# ------------------------------------------------------------------
# AI waste classification
# ------------------------------------------------------------------

def call_ai_service(image_bytes: bytes):
    """
    Runs waste classification + detection in-process (see apps.ai_inference).
    Returns the combined {"classification": ..., "detection": ...} dict,
    or None if something goes wrong — callers should treat None the same
    way they previously treated a failed HTTP call to the old microservice.
    """
    from apps.ai_inference.inference import run_ai_classification
    try:
        return run_ai_classification(image_bytes)
    except Exception as e:
        print(f"[WARN] AI inference failed: {e}")
        return None


# ------------------------------------------------------------------
# Combined view
# ------------------------------------------------------------------

# How far back to look for the MQTT-created anchor reading that these
# frames belong to. MQTT fires first in the device's loop and is a tiny
# payload (near-instant); HTTP frame upload is the slow multipart leg
# that follows. Originally set to 30s, but field testing on a
# weak-signal device (~-95dBm) showed the frame upload alone taking
# ~46s under poor cellular conditions, causing legitimate uploads to
# 409 even though MQTT had succeeded. Widened to give real-world slow
# connections realistic room, while still bounded enough to avoid
# attaching frames to a stale, unrelated reading from a prior cycle.
MQTT_MATCH_WINDOW_SECONDS = 90


class SensorReadingWithFlowView(APIView):
    authentication_classes = [IoTDeviceAuthentication, CookieJWTAuthentication]
    permission_classes = [IsIoTDevice | IsAdminOrMENRO]

    def post(self, request):
        if isinstance(request.auth, SensorNode):
            # Authenticated as a specific device — always use its own
            # node, ignoring whatever the client claims in the body.
            # This is what actually stops one device from posting data
            # as another node.
            node_id = request.auth.node_id
        else:
            # Authenticated as human staff (Admin/MENRO) via JWT —
            # allow specifying which node to submit/test for.
            node_id = request.data.get('node')

        if not node_id:
            return Response({'error': 'node is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            node = SensorNode.objects.get(node_id=node_id)
        except SensorNode.DoesNotExist:
            return Response({'error': 'Sensor node not found'}, status=status.HTTP_404_NOT_FOUND)

        # water_level is no longer sent over HTTP — it arrives via MQTT
        # first and creates the anchor row this request attaches to.
        # If that anchor doesn't exist yet (MQTT publish failed, or
        # this request arrived too late/too early), there's nothing
        # valid to compute flow/clog/classification against, so we
        # don't fabricate a row — the device is expected to skip
        # sending frames in that case and just retry next cycle.
        from django.utils import timezone
        from datetime import timedelta

        cutoff = timezone.now() - timedelta(seconds=MQTT_MATCH_WINDOW_SECONDS)
        reading = SensorReading.objects.filter(
            node=node,
            timestamp__gte=cutoff,
        ).order_by('-timestamp').first()

        if reading is None:
            return Response(
                {'error': 'No recent MQTT-created reading found for this node to attach frames to'},
                status=status.HTTP_409_CONFLICT
            )

        water_level = reading.water_level

        frames_bytes = []
        for i in range(1, FRAME_COUNT + 1):
            frame_file = request.FILES.get(f'frame_{i}')
            if frame_file is None:
                return Response(
                    {'error': f'frame_{i} is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            frames_bytes.append(frame_file.read())

        camera_height_cm = None
        if node.hotspot and node.hotspot.sensor_height:
            camera_height_cm = node.hotspot.sensor_height - water_level
            if camera_height_cm <= 0:
                camera_height_cm = 50.0
        if camera_height_cm is None:
            camera_height_cm = 100.0

        water_flow_rate    = compute_optical_flow(frames_bytes, camera_height_cm)
        trend_contribution = compute_trend_contribution(node, water_level)
        clog_pct           = compute_clog_pct(water_flow_rate, trend_contribution)
        water_flow         = get_water_flow_category(water_flow_rate)

        reading.water_flow_rate = water_flow_rate
        reading.water_flow      = water_flow
        reading.clog_pct        = clog_pct
        reading.save(update_fields=['water_flow_rate', 'water_flow', 'clog_pct'])

        from apps.sensor_readings.services import evaluate_clog
        evaluate_clog(reading)

        if clog_pct is not None and clog_pct >= CLASSIFY_THRESHOLD:
            self._handle_clog_classification(
                node=node,
                reading=reading,
                frame_bytes=frames_bytes[0],
                clog_pct=clog_pct,
            )

        return Response(
            SensorReadingSerializer(reading).data,
            status=status.HTTP_200_OK
        )

    def _handle_clog_classification(self, node, reading, frame_bytes, clog_pct):
        from apps.waste_classification.models import WasteClassification
        from apps.clog_events.models import ClogEvent
        from apps.alerts.models import Alert
        from django.utils import timezone
        from datetime import timedelta

        ai_result = call_ai_service(frame_bytes)
        classification_result = ai_result.get("classification") if ai_result else None
        if classification_result and not classification_result.get("success"):
            classification_result = None
        print(f"[DEBUG] classification_result: {classification_result}")  # ← add this
        if classification_result is None:
            print(f"[WARN] Classification failed for reading {reading.reading_id}")
            return

        percentages = classification_result.get('percentages', {})
        print(f"[DEBUG] percentages: {percentages}")  # ← add this
        dominant    = classification_result.get('dominant_waste_type', 'None')
        confidence  = classification_result.get('confidence', 0)
        is_mixed    = classification_result.get('is_mixed', False)
        present     = classification_result.get('present_waste_types', [])

        dominant_label = dominant.replace('_', ' ').title()

        hotspot = node.hotspot if node else None

        detection = ai_result.get("detection") if ai_result else {}
        detected_kg = detection.get("estimated_kg")
        detected_counts = detection.get("counts_by_class")

        if detected_kg is not None:
            estimated_kg = detected_kg
            print(f"[DEBUG] estimated_kg from detection: {estimated_kg} counts={detected_counts}")
        else:
            print(f"[WARN] YOLO returned no detection for reading {reading.reading_id} — defaulting estimated_kg to 0.0")
            estimated_kg = 0.0

        classification = WasteClassification.objects.create(
            node=node,
            reading=reading,
            dominant_waste_type=dominant_label,
            recyclable_pct=percentages.get('recyclable', 0),
            biodegradable_pct=percentages.get('biodegradable', 0),
            residual_pct=percentages.get('residual', 0),
            special_waste_pct=percentages.get('special_waste', 0),
            none_pct=percentages.get('none', 0),
            confidence=confidence,
            is_mixed=is_mixed,
            present_waste_types=present,
            estimated_volume=estimated_kg,
        )

        # Only act on the FIRST classification per ClogEvent
        open_event = ClogEvent.objects.filter(
            node=node,
            status__in=['Detected', 'Responded'],
        ).order_by('-detected_at').first()

        if open_event and open_event.classification is None:
            # Link this classification to the ClogEvent
            open_event.classification = classification
            open_event.save()

            # Alert creation itself now lives in clog_events/signals.py
            # (initial fire) and sensor_readings/signals.py (6-hour
            # re-alert while unresolved). Here we just patch the context
            # of the alert(s) tied to this event with the classification
            # data, since alert_context was empty at creation time.
            Alert.objects.filter(event=open_event).update(
                alert_context={
                    'dominant_waste_type': dominant_label,
                    'recyclable_pct':      round(percentages.get('recyclable', 0), 2),
                    'biodegradable_pct':   round(percentages.get('biodegradable', 0), 2),
                    'residual_pct':        round(percentages.get('residual', 0), 2),
                    'special_waste_pct':   round(percentages.get('special_waste', 0), 2),
                    'confidence':          round(confidence, 2),
                    'estimated_volume':    round(estimated_kg, 2),
                }
            )
        # If classification is already linked, do nothing — alert already exists