from agos_backend.ws_base import AuthenticatedJsonConsumer

ALERTS_STAFF_GROUP = "alerts_staff"
STAFF_ROLES = ('Admin', 'MENRO', 'MENRO_Staff')


def barangay_group(barangay_id):
    return f"alerts_barangay_{barangay_id}"


class AlertConsumer(AuthenticatedJsonConsumer):
    def _groups(self):
        if self.user.user_role in STAFF_ROLES:
            return [ALERTS_STAFF_GROUP]
        if self.user.user_role == 'Barangay' and self.user.barangay_id:
            return [barangay_group(self.user.barangay_id)]
        return []

    async def after_auth(self):
        for g in self._groups():
            await self.channel_layer.group_add(g, self.channel_name)

    async def after_disconnect(self, code):
        if self.authenticated and self.user:
            for g in self._groups():
                await self.channel_layer.group_discard(g, self.channel_name)

    # handler name must match the "type" key sent in group_send (see signals.py)
    async def alert_message(self, event):
        await self.send_json(event["alert"])