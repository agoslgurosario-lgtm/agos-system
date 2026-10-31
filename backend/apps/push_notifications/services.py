import logging
import threading

import requests
from django.db import connection

from .models import DeviceToken

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

# alert_type -> (notification title, Android channel id)
PUSH_ALERT_TYPES = {
    'Critical_Clog':       ('Critical clog detected', 'critical'),
    'Moderate_Clog_Alert': ('Moderate clog detected', 'warning'),
    'Low_Clog_Alert':      ('Low clog detected', 'info'),
    'Water_Level_Rising':  ('Water level rising', 'warning'),
    'Waste_Type_Rejected': ('Waste type not approved', 'silent'),
    'Waste_Type_Rejected': ('Waste type not approved', 'silent'),
    'Waste_Type_Approved': ('Waste type approved', 'silent'),
    'Report_Due_Soon':     ('Report due soon', 'info'),
    'Report_Overdue':      ('Report overdue', 'warning'),
    'Node_Offline':        ('Device offline', 'warning'),
    'Low_Battery':         ('Device battery low', 'info'),
    'Weak_Signal':         ('Device signal weak', 'info'),
    'Sensor_Failure':      ('Device sensor failing', 'warning'),
}

HEALTH_PUSH_HINT = {
    'Node_Offline':   "hasn't reported recently. Please check on it.",
    'Low_Battery':    "battery is low. Please check its power source.",
    'Weak_Signal':    "has a weak connection. Please check its antenna.",
    'Sensor_Failure': "water sensor isn't responding. Please check it.",
}


def _recipient_tokens(alert):
    barangay_id = alert.node.barangay_id if alert.node else alert.barangay_id
    if not barangay_id:
        return []
    return list(
        DeviceToken.objects.filter(
            is_active=True,
            user__user_role='Barangay',
            user__status='Active',
            user__barangay_id=barangay_id,
        ).values_list('token', flat=True)
    )


def _send(messages):
    """Runs in a background thread: only HTTP, plus cleanup of dead tokens."""
    try:
        dead = []
        for i in range(0, len(messages), 100):  # Expo accepts 100 per request
            chunk = messages[i:i + 100]
            resp = requests.post(
                EXPO_PUSH_URL,
                json=chunk,
                headers={'Accept': 'application/json'},
                timeout=10,
            )
            resp.raise_for_status()
            for msg, ticket in zip(chunk, resp.json().get('data', [])):
                if ticket.get('status') == 'error':
                    if ticket.get('details', {}).get('error') == 'DeviceNotRegistered':
                        dead.append(msg['to'])
                    else:
                        logger.warning('Push rejected: %s', ticket)
        if dead:
            DeviceToken.objects.filter(token__in=dead).update(is_active=False)
    except Exception:
        logger.exception('Push send failed')
    finally:
        connection.close()  # this thread's own DB connection


def _fmt_day(iso):
    try:
        from datetime import date
        d = date.fromisoformat(iso)
        return f"{d:%b} {d.day}"
    except Exception:
        return ''


def notify_alert(alert):
    spec = PUSH_ALERT_TYPES.get(alert.alert_type)
    if not spec:
        return

    tokens = _recipient_tokens(alert)
    if not tokens:
        return

    from apps.alerts.signals import build_alert_payload  # local import avoids circular import
    payload = build_alert_payload(alert)

    title, channel = spec
    ctx = alert.alert_context or {}
    if alert.alert_type == 'Waste_Type_Rejected':
        body = f"“{ctx.get('waste_type', 'Waste type')}” wasn't approved: {ctx.get('reason', '')}".strip()
    elif alert.alert_type == 'Waste_Type_Approved':
        body = f"“{ctx.get('waste_type', 'Waste type')}” was approved. You can now use it in your reports."
    elif alert.alert_type in ('Report_Due_Soon', 'Report_Overdue'):
        label = ctx.get('period_label', 'this period')
        due = _fmt_day(ctx.get('due_date'))
        when = f"is due on {due}" if alert.alert_type == 'Report_Due_Soon' else f"was due on {due}"
        if ctx.get('ready_count'):
            todo = "Submit it to MENRO now." if alert.alert_type == 'Report_Due_Soon' else "You can still submit it late."
        else:
            todo = "You have no verified reports yet. Complete and verify your reports, then submit."
        body = f"Your report for {label} {when}. {todo}"
    elif alert.alert_type in HEALTH_PUSH_HINT:
        node = payload.get('node_name') or 'A device'
        body = f"{node}: {HEALTH_PUSH_HINT[alert.alert_type]}"
    else:
        body = payload.get('node_name') or 'AGOS node'
        if payload.get('barangay_name'):
            body += f" • {payload['barangay_name']}"

    messages = [{
        'to': t,
        'title': title,
        'body': body,
        'sound': None if channel == 'silent' else 'default',
        'channelId': channel,
        'priority': 'high',
        'ttl': 3600,  # drop it if the phone is offline for over an hour
        'data': {
            'alert_id': alert.alert_id,
            'alert_type': alert.alert_type,
            'event_id': alert.event_id,
        },
    } for t in tokens]

    threading.Thread(target=_send, args=(messages,), daemon=True).start()