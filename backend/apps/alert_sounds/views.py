import os
import tempfile
from mutagen import File as MutagenFile

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser

from apps.users.permissions import IsAdmin
from .models import AlertSoundConfig, UploadedAlertSound
from .serializers import AlertSoundConfigSerializer, UploadedAlertSoundSerializer
from rest_framework.permissions import IsAuthenticated

MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024  # 2MB
MAX_DURATION_SECONDS = 20
ALLOWED_CONTENT_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3']


class AlertSoundConfigView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdmin()]

    def get(self, request):
        config, _ = AlertSoundConfig.objects.get_or_create(config_id=1)
        serializer = AlertSoundConfigSerializer(config)
        return Response(serializer.data)

    def patch(self, request):
        config, _ = AlertSoundConfig.objects.get_or_create(config_id=1)
        serializer = AlertSoundConfigSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UploadAlertSoundView(APIView):
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser]

    def post(self, request):
        uploaded_file = request.FILES.get('sound_file')

        if not uploaded_file:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        if uploaded_file.content_type not in ALLOWED_CONTENT_TYPES:
            return Response(
                {'error': f'Invalid file type: {uploaded_file.content_type}. Only MP3/WAV allowed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if uploaded_file.size > MAX_FILE_SIZE_BYTES:
            return Response(
                {'error': 'File too large. Maximum size is 2MB.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Save to a temp file first, since mutagen needs a real file path
        suffix = os.path.splitext(uploaded_file.name)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            for chunk in uploaded_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        try:
            audio = MutagenFile(tmp_path)
            if audio is None or audio.info is None:
                return Response({'error': 'Could not read audio file.'}, status=status.HTTP_400_BAD_REQUEST)

            duration = audio.info.length
            if duration > MAX_DURATION_SECONDS:
                return Response(
                    {'error': f'Sound must be {MAX_DURATION_SECONDS} seconds or shorter (got {duration:.1f}s).'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Passed validation — reset file pointer and save for real via the model
            uploaded_file.seek(0)
            sound = UploadedAlertSound.objects.create(
                original_filename=uploaded_file.name,
                file=uploaded_file,
                duration_seconds=duration,
                uploaded_by=request.user,
            )
            serializer = UploadedAlertSoundSerializer(sound, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        finally:
            os.unlink(tmp_path)  # always clean up the temp file


class ListAlertSoundsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sounds = UploadedAlertSound.objects.all().order_by('-uploaded_at')
        serializer = UploadedAlertSoundSerializer(sounds, many=True, context={'request': request})
        return Response(serializer.data)


class DeleteAlertSoundView(APIView):
    permission_classes = [IsAdmin]

    def delete(self, request, sound_id):
        try:
            sound = UploadedAlertSound.objects.get(sound_id=sound_id)
        except UploadedAlertSound.DoesNotExist:
            return Response({'error': 'Sound not found.'}, status=status.HTTP_404_NOT_FOUND)

        sound.file.delete(save=False)
        sound.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)