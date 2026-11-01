from agos_backend.ws_base import AuthenticatedJsonConsumer

HEALTH_GROUP = "node_health"
ASSIGNMENT_GROUP = "node_assignments"

ADMIN_ROLES = {"Admin"}


def barangay_health_group(barangay_id):
    return f"node_health_b{barangay_id}"


class NodeHealthConsumer(AuthenticatedJsonConsumer):
    async def after_auth(self):
        role = getattr(self.user, "user_role", None)
        if role in ADMIN_ROLES:
            self.health_group = HEALTH_GROUP
        elif role == "Barangay" and self.user.barangay_id:
            # a barangay only ever hears about its own nodes
            self.health_group = barangay_health_group(self.user.barangay_id)
        else:
            await self.close()
            return
        await self.channel_layer.group_add(self.health_group, self.channel_name)

    async def after_disconnect(self, code):
        group = getattr(self, "health_group", None)
        if group:
            await self.channel_layer.group_discard(group, self.channel_name)

    async def health_message(self, event):
        await self.send_json(event["health"])


class NodeAssignmentConsumer(AuthenticatedJsonConsumer):
    async def after_auth(self):
        if getattr(self.user, "user_role", None) not in ADMIN_ROLES:
            await self.close()
            return
        await self.channel_layer.group_add(ASSIGNMENT_GROUP, self.channel_name)

    async def after_disconnect(self, code):
        await self.channel_layer.group_discard(ASSIGNMENT_GROUP, self.channel_name)

    async def assignment_message(self, event):
        await self.send_json(event["assignment"])