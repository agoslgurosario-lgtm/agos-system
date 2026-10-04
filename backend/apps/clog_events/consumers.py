from agos_backend.ws_base import AuthenticatedJsonConsumer

CLOG_EVENTS_GROUP = "clog_events"
STAFF_ROLES = {"Admin", "MENRO", "MENRO_Staff"}


class ClogEventConsumer(AuthenticatedJsonConsumer):
    async def after_auth(self):
        await self.channel_layer.group_add(CLOG_EVENTS_GROUP, self.channel_name)

    async def after_disconnect(self, code):
        await self.channel_layer.group_discard(CLOG_EVENTS_GROUP, self.channel_name)

    async def clog_event_message(self, event):
        payload = event["clog_event"]
        role = getattr(self.user, "user_role", None)

        if role in STAFF_ROLES:
            allowed = True
        elif role == "Barangay":
            barangay_id = payload.get("barangay")
            allowed = barangay_id is not None and barangay_id == self.user.barangay_id
        else:
            allowed = False

        if allowed:
            await self.send_json(payload)