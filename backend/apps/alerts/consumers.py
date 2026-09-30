from agos_backend.ws_base import AuthenticatedJsonConsumer

ALERTS_GROUP = "alerts"
ALERTS_STAFF_GROUP = "alerts_staff"
STAFF_ROLES = ('Admin', 'MENRO', 'MENRO_Staff')


class AlertConsumer(AuthenticatedJsonConsumer):
    async def after_auth(self):
        await self.channel_layer.group_add(ALERTS_GROUP, self.channel_name)
        if self.user.user_role in STAFF_ROLES:
            await self.channel_layer.group_add(ALERTS_STAFF_GROUP, self.channel_name)

    async def after_disconnect(self, code):
        await self.channel_layer.group_discard(ALERTS_GROUP, self.channel_name)
        if self.authenticated and self.user and self.user.user_role in STAFF_ROLES:
            await self.channel_layer.group_discard(ALERTS_STAFF_GROUP, self.channel_name)

    # handler name must match the "type" key sent in group_send (see signals.py)
    async def alert_message(self, event):
        await self.send_json(event["alert"])