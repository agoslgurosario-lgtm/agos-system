"""
AGOS AI Service — standalone microservice hosting both waste-classification
models (TensorFlow/MobileNetV2 + YOLO detection), deployed separately from
the main Django backend so the two heavy ML frameworks don't compete with
Django/Channels for the same 512MB memory pool.

Exposes one endpoint: POST /classify
Input:  a single JPEG frame (multipart/form-data, field name "frame")
Output: combined JSON with both models' results, in the same shape the
        Django backend previously computed in-process.

Auth: a shared secret header (X-Service-Key) checked against an env var,
since this service should only ever be called by the Django backend, not
exposed publicly.
"""
import os
import io
import logging

from fastapi import FastAPI, File, UploadFile, Header, HTTPException
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AGOS AI Service")

SERVICE_KEY = os.environ.get("AI_SERVICE_KEY")  # shared secret, set on both services

if not SERVICE_KEY:
    raise RuntimeError(
        "AI_SERVICE_KEY environment variable is not set. "
        "This service must not run without it."
    )

import threading

@app.on_event("startup")
def warm_models():
    def _load():
        logger.info("Warming models in background at startup...")
        _get_tf_model()
        _get_yolo_model()
        logger.info("Model warm-up complete.")
    threading.Thread(target=_load, daemon=True).start()


# ------------------------------------------------------------------
# Lazy-loaded models — loaded once on first request, not at import
# time, so the service starts up fast and only pays the loading cost
# when actually needed.
# ------------------------------------------------------------------

_tf_model = None
_tf_load_failed = False

_yolo_model = None
_yolo_load_failed = False

CATEGORIES = ["biodegradable", "none", "recyclable", "residual", "special_waste"]
MIXED_THRESHOLD = 0.35
TF_MODEL_PATH = os.path.join(os.path.dirname(__file__), "saved_model", "waste_classifier.keras")

YOLO_MODEL_PATH = os.environ.get(
    "WASTE_DETECTION_MODEL_PATH",
    os.path.join(os.path.dirname(__file__), "weights", "waste_yolo.pt"),
)
AVG_WEIGHT_KG = {
    "plastic_bottle": 0.025,
    "dry_leaves": 0.010,
    "paper": 0.010,
    "paper_carton": 0.015,
    "rigid_plastic": 0.010,
    "sachet_wrapper": 0.005,
    "can": 0.015,
    "glass": 0.150,
    "styrofoam": 0.008,
    "fallen_fruit": 0.180,
    "other": 0.015,
}
CONFIDENCE_THRESHOLD = 0.5


def _get_tf_model():
    global _tf_model, _tf_load_failed
    if _tf_model is not None:
        return _tf_model
    if _tf_load_failed:
        return None
    tflite_path = TF_MODEL_PATH.replace(".keras", ".tflite")
    if not os.path.exists(tflite_path):
        logger.info("TFLite classifier not found at %s — skipping classification.", tflite_path)
        _tf_load_failed = True
        return None
    try:
        from ai_edge_litert.interpreter import Interpreter
        logger.info("Loading AGOS waste classification model...")
        interpreter = Interpreter(model_path=tflite_path)
        interpreter.allocate_tensors()
        _tf_model = interpreter
        logger.info("TFLite model loaded successfully!")
        return _tf_model
    except Exception:
        logger.exception("Failed to load TFLite model.")
        _tf_load_failed = True
        return None


def _get_yolo_model():
    global _yolo_model, _yolo_load_failed
    if _yolo_model is not None:
        return _yolo_model
    if _yolo_load_failed:
        return None
    onnx_path = YOLO_MODEL_PATH.replace(".pt", ".onnx")
    if not os.path.exists(onnx_path):
        logger.info("YOLO ONNX weights not found at %s — skipping detection.", onnx_path)
        _yolo_load_failed = True
        return None
    try:
        import onnxruntime as ort
        _yolo_model = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
        logger.info("YOLO ONNX model loaded successfully!")
        return _yolo_model
    except Exception:
        logger.exception("Failed to load YOLO ONNX model.")
        _yolo_load_failed = True
        return None


# ------------------------------------------------------------------
# TensorFlow classification (ported from ai_model/classifier.py)
# ------------------------------------------------------------------

def _run_tf_classification(image_bytes: bytes) -> dict:
    interpreter = _get_tf_model()
    if interpreter is None:
        return {
            "percentages": {}, "dominant_waste_type": None, "confidence": 0,
            "is_mixed": False, "present_waste_types": [], "success": False,
            "error": "TensorFlow model unavailable",
        }
    try:
        import numpy as np
        from PIL import Image

        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = img.resize((224, 224))
        img_array = np.array(img, dtype=np.float32) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()

        interpreter.set_tensor(input_details[0]['index'], img_array)
        interpreter.invoke()
        predictions = interpreter.get_tensor(output_details[0]['index'])
        percentages_raw = predictions[0]

        result = {}
        present = []
        for i, category in enumerate(CATEGORIES):
            pct = round(float(percentages_raw[i]) * 100, 2)
            result[category] = pct
            if float(percentages_raw[i]) >= MIXED_THRESHOLD:
                present.append({"waste_type": category, "percentage": pct})
        present.sort(key=lambda x: x["percentage"], reverse=True)

        dominant_index = int(np.argmax(percentages_raw))
        dominant = CATEGORIES[dominant_index]
        confidence = round(float(percentages_raw[dominant_index]) * 100, 2)

        return {
            "percentages": result,
            "dominant_waste_type": dominant,
            "confidence": confidence,
            "is_mixed": len(present) > 1,
            "present_waste_types": present,
            "success": True,
        }
    except Exception as e:
        logger.exception("TensorFlow classification failed")
        return {
            "percentages": {}, "dominant_waste_type": None, "confidence": 0,
            "is_mixed": False, "present_waste_types": [], "success": False,
            "error": str(e),
        }


# ------------------------------------------------------------------
# YOLO detection-based weight estimate (ported from detection.py)
# ------------------------------------------------------------------

YOLO_INPUT_SIZE = 640
YOLO_CLASS_NAMES = ["plastic_bottle", "dry_leaves", "paper", "paper_carton", "rigid_plastic", "sachet_wrapper", "can", "glass", "styrofoam", "fallen_fruit", "other"]

def _preprocess_yolo(img):
    import cv2
    import numpy as np
    h, w = img.shape[:2]
    scale = min(YOLO_INPUT_SIZE / h, YOLO_INPUT_SIZE / w)
    new_h, new_w = int(round(h * scale)), int(round(w * scale))
    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

    pad_h = YOLO_INPUT_SIZE - new_h
    pad_w = YOLO_INPUT_SIZE - new_w
    top, bottom = pad_h // 2, pad_h - pad_h // 2
    left, right = pad_w // 2, pad_w - pad_w // 2

    padded = cv2.copyMakeBorder(resized, top, bottom, left, right, cv2.BORDER_CONSTANT, value=(114, 114, 114))

    blob = padded[:, :, ::-1].astype(np.float32) / 255.0
    blob = blob.transpose(2, 0, 1)[None, ...]
    return blob, scale


def _run_yolo_detection(image_bytes: bytes):
    session = _get_yolo_model()
    if session is None:
        return None, None
    try:
        import numpy as np
        import cv2

        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            logger.warning("Could not decode frame for detection")
            return None, None

        blob, scale = _preprocess_yolo(img)
        input_name = session.get_inputs()[0].name
        output = session.run(None, {input_name: blob})[0]

        output = output[0].T  # (8400, 4+num_classes)
        boxes_xywh = output[:, :4]
        class_scores = output[:, 4:]

        class_ids = np.argmax(class_scores, axis=1)
        confidences = np.max(class_scores, axis=1)

        mask = confidences >= CONFIDENCE_THRESHOLD
        boxes_xywh = boxes_xywh[mask]
        class_ids = class_ids[mask]
        confidences = confidences[mask]

        if len(boxes_xywh) == 0:
            return 0.0, {}

        boxes_xy = boxes_xywh.copy()
        boxes_xy[:, 0] -= boxes_xy[:, 2] / 2  # center x -> left x
        boxes_xy[:, 1] -= boxes_xy[:, 3] / 2  # center y -> top y

        indices = cv2.dnn.NMSBoxes(
            boxes_xy.tolist(), confidences.tolist(),
            CONFIDENCE_THRESHOLD, 0.45
        )

        counts_by_class = {}
        for i in (indices.flatten() if len(indices) > 0 else []):
            class_name = YOLO_CLASS_NAMES[class_ids[i]]
            counts_by_class[class_name] = counts_by_class.get(class_name, 0) + 1

        estimated_kg = sum(
            count * AVG_WEIGHT_KG.get(class_name, AVG_WEIGHT_KG["other"])
            for class_name, count in counts_by_class.items()
        )
        return estimated_kg, counts_by_class
    except Exception:
        logger.exception("YOLO detection failed")
        return None, None


# ------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------

@app.get("/healthz")
def healthz():
    """Plain health check for the keep-alive ping — cheap, no model loading."""
    return {
        "status": "ok",
        "tf_model_loaded": _tf_model is not None,
        "yolo_model_loaded": _yolo_model is not None,
    }


@app.post("/classify")
async def classify(
    frame: UploadFile = File(...),
    x_service_key: str = Header(None),
):
    if not SERVICE_KEY or x_service_key != SERVICE_KEY:
        raise HTTPException(status_code=403, detail="Invalid service key")

    image_bytes = await frame.read()

    classification_result = _run_tf_classification(image_bytes)
    detected_kg, detected_counts = _run_yolo_detection(image_bytes)

    return JSONResponse({
        "classification": classification_result,
        "detection": {
            "estimated_kg": detected_kg,
            "counts_by_class": detected_counts,
        },
    })