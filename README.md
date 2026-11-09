# AGOS — Automated Geo-Based Obstruction Sensing System

AGOS monitors canals for clogging and rising water. IoT sensor nodes installed at canal hotspots send water-level readings and camera frames. The system estimates water flow, detects clogs, classifies the waste with AI, and alerts the right people. Barangays then respond to clog events and submit canal monitoring reports to MENRO.

The system serves three user roles:

| Role | Interface | What they do |
|---|---|---|
| **Admin** | Web | Manage users, barangays, hotspots, sensor nodes, alert thresholds, alert sounds, backups; view audit logs and node health |
| **MENRO / MENRO Staff** | Web | Monitor the municipal map, alerts and analytics; receive and review barangay reports; approve custom waste types |
| **Barangay** | Web + Mobile app | Monitor their own nodes, respond to clog events, file and submit canal monitoring reports |

---

## How it works

```
 Sensor node (ESP32 + camera)
   │  1. water level ──► MQTT broker (HiveMQ) ──► Django MQTT listener ──► SensorReading
   │  2. 5 camera frames ──► POST /api/sensor-readings/with-flow/  (per-device API key)
   ▼
 Django backend
   ├─ optical flow (OpenCV) + water-level trend ──► clog %
   ├─ clog % ≥ 30 ──► ClogEvent (Low / Moderate / Critical) ──► Alert
   ├─ AI: waste classifier (TFLite) + YOLO detector (ONNX) ──► waste type + estimated kg
   └─ WebSockets (Channels + Redis) + push notifications (Firebase) ──► live updates
   ▼
 Web app (Next.js)  ·  Mobile app (Expo, Barangay only)
```

**Clog event lifecycle:** `Detected` → `Responded` (the barangay responds and files a report) or `Cleared` (enough consecutive normal readings, or auto-cleared after 7 days). The number of normal readings needed depends on the barangay's current rainfall condition, and admins can change it in Settings.

**Report lifecycle:** In progress → Submitted (for a reporting period) → Verified or Voided. Voiding a report reopens its clog event so the barangay can redo it.

---

## Repository layout

| Folder | What's in it |
|---|---|
| [backend/](backend/) | Django 5.2 + Django REST Framework API, Channels WebSockets, schedulers, in-process AI inference |
| [frontend/](frontend/) | Next.js 16 web app (Admin, MENRO, Barangay) |
| [mobile/](mobile/) | Expo / React Native app for Barangay users |
| [ai_model/](ai_model/) | Dataset preparation, training and evaluation scripts for the waste classifier |
| [ai_service/](ai_service/) | Older standalone FastAPI AI service. **Not used anymore**: inference now runs inside the backend ([backend/apps/ai_inference/](backend/apps/ai_inference/)) |

The ESP32 firmware is not in this branch.

### Backend apps (`backend/apps/`)

| App | Purpose |
|---|---|
| `users` | Accounts, roles, login (web cookies / mobile tokens), OTP password reset, permissions |
| `barangay`, `hotspots`, `signatories` | Barangays and their boundaries, canal hotspots, report signatories |
| `sensor_nodes` | Nodes, device keys, assignment history, health logs, maintenance, force-sleep |
| `sensor_readings` | MQTT ingestion, flow/clog computation |
| `clog_events`, `alerts` | Clog detection and escalation, alerts and read status |
| `waste_classification`, `ai_inference` | AI results and the TFLite/ONNX models |
| `rainfall` | Rainfall condition and per-condition alert thresholds |
| `reports` | Canal monitoring reports, media, period submissions, analytics, PDF export |
| `audit_logs` | Record of admin and user actions |
| `system_backup` | Manual/scheduled backups (pg_dump + media) and restore |
| `alert_sounds`, `push_notifications`, `training_captures` | Alert sound settings, mobile push, training image capture from nodes |

---

## Requirements

- Python 3.11
- Node.js 20+
- PostgreSQL (Supabase in deployment), plus the `pg_dump` / `psql` client tools if you need backup and restore
- Redis (for WebSockets and caching), e.g. `docker run -p 6379:6379 redis`
- An MQTT broker (HiveMQ Cloud in deployment), only needed to receive real sensor data

---

## Running locally

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows  (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt
# create backend/.env (see Environment variables below)
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

The first time you open the web app with an empty database, it asks you to create the first Admin account (`/api/auth/setup/`).

To receive live sensor data locally, run the MQTT listener in a second terminal:

```bash
python manage.py mqtt_listener
```

Run the tests with:

```bash
python manage.py test
```

### 2. Web app

```bash
cd frontend
npm install
# create frontend/.env.local (see below)
npm run dev                    # http://localhost:3000
```

### 3. Mobile app

```bash
cd mobile
npm install
# create mobile/.env (see below)
npx expo start
```

The mobile app only accepts **Barangay** accounts. Push notifications need a development build, because they don't work in Expo Go.

---

## Environment variables

Never commit these files. They are already in `.gitignore`.

### `backend/.env`

| Variable | Description |
|---|---|
| `SECRET_KEY`, `DEBUG` | Django secret key; `True` locally, `False` in production |
| `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` | Comma-separated lists |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | PostgreSQL connection |
| `DB_HOST_DIRECT`, `DB_PORT_DIRECT` | Optional direct (non-pooled) connection used by backup/restore |
| `REDIS_URL` | Defaults to `redis://127.0.0.1:6379` |
| `FRONTEND_URL` | Used for links in emails |
| `BREVO_API_KEY`, `EMAIL_HOST_USER` | Email sending (OTP codes, new account credentials, device keys) |
| `SUPABASE_S3_ACCESS_KEY`, `SUPABASE_S3_SECRET_KEY`, `SUPABASE_S3_BUCKET`, `SUPABASE_S3_ENDPOINT`, `SUPABASE_S3_REGION`, `SUPABASE_PROJECT_URL`, `SUPABASE_S3_BACKUP_BUCKET` | File storage. If these are missing, uploads are saved to `backend/media/` |
| `MQTT_BROKER_HOST`, `MQTT_BROKER_PORT`, `MQTT_USERNAME`, `MQTT_PASSWORD` | MQTT broker |
| `ENABLE_EMBEDDED_MQTT_LISTENER` | `true` runs the MQTT listener inside the web process. Enable it on **one** instance only, or every reading is saved more than once |
| `ENABLE_SCHEDULERS` | `true` (default) runs the background jobs (auto-clear, rainfall, reports, node checks, backups) |

### `frontend/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL the browser calls for the API |
| `BACKEND_URL` | Django URL used by the Next.js `/api` proxy and `/media` rewrite |
| `NEXT_PUBLIC_WS_URL` | WebSocket base URL |
| `NEXT_PUBLIC_BACKEND_DIRECT_URL` | Direct backend URL (large uploads such as backup restore) |
| `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_ARCGIS_API_KEY` | Map tiles |

### `mobile/.env`

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend URL (use your PC's LAN IP when testing on a phone) |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Map tiles |

---

## Sensor nodes

1. An Admin adds a node in **Node Management** and assigns it to a hotspot.
2. **Generate Key** creates the node's device key. It is shown and emailed once, and only a hash is stored.
3. The node sends:
   - **MQTT** to `agos/nodes/<node_id>/readings` with `{"node": <id>, "water_level": <cm>}`
   - **HTTP** `POST /api/sensor-readings/with-flow/` with header `X-API-Key: <node_id>.<secret>` and five frames (`frame_1` … `frame_5`), within 90 seconds of the MQTT reading
4. The node reads its sleep interval and settings from `GET /api/sensor-nodes/<id>/config/`.

---

## Deployment

| Part | Where |
|---|---|
| Backend | Render (Daphne ASGI) |
| Database and file storage | Supabase (PostgreSQL + S3-compatible storage) |
| Web app | Vercel (deploys from the `frontend-deploy` branch) |
| Mobile app | EAS Build |
| MQTT broker | HiveMQ Cloud |

---

## AI model

- **Classifier:** MobileNetV2 trained on 5 classes (`biodegradable`, `recyclable`, `residual`, `special_waste`, `none`), exported to TFLite.
- **Detector:** YOLO exported to ONNX, used to count items and estimate weight in kg.
- Training scripts are in [ai_model/](ai_model/) (`prepare_dataset.py`, `augment_dataset.py`, `train_model.py`, `evaluate_model.py`). The ML dependencies are in `backend/requirements-ml.txt`.
- The models used by the system are in `backend/apps/ai_inference/saved_model/` and `backend/apps/ai_inference/weights/`.

---

## Mock data (demo only)

`backend/mock_data/` contains scripts that add sample alerts, clog events, reports and analytics, and matching `revert_*.py` scripts that remove them. Don't run these against the production database.
