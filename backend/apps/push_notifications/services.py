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
    'Waste_Type_Rejected': ('Waste type not approved', 'info'),
    'Waste_Type_Approved': ('Waste type approved', 'info'),
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
    else:
        body = payload.get('node_name') or 'AGOS node'
        if payload.get('barangay_name'):
            body += f" • {payload['barangay_name']}"

    messages = [{
        'to': t,
        'title': title,
        'body': body,
        'sound': 'default',
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