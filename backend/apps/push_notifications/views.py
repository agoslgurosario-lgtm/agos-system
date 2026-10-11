from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from apps.users.permissions import IsBarangay
from .models import DeviceToken


class RegisterDeviceView(APIView):
    permission_classes = [IsBarangay]

    def post(self, request):
        token = str(request.data.get('token', '')).strip()
        platform = str(request.data.get('platform', 'android'))[:10]

        if len(token) > 255 or not token.startswith(('ExponentPushToken[', 'ExpoPushToken[')):
            return Response({'detail': 'Invalid push token.'}, status=status.HTTP_400_BAD_REQUEST)

        # token is unique: if this phone was used by another account, it moves to this one
        DeviceToken.objects.update_or_create(
            token=token,
            defaults={'user': request.user, 'platform': platform, 'is_active': True},
        )
        return Response({'detail': 'Device registered.'})


class UnregisterDeviceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = str(request.data.get('token', '')).strip()
        DeviceToken.objects.filter(token=token, user=request.user).delete()
        return Response({'detail': 'Device unregistered.'})