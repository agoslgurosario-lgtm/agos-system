from django.db import transaction
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Signatory, POSITION_CHOICES
from .serializers import SignatorySerializer
from apps.barangay.models import Barangay
from apps.users.permissions import IsAdmin
from apps.audit_logs.utils import log_action

HISTORY_LIMIT = 3


class SignatoryListView(APIView):
    """
    GET  /api/signatories/?barangay=<id>
        Returns all 4 fixed positions for the barangay, each with the
        current active signatory (or null) and up to the last 3 past ones.

    POST /api/signatories/
        Body: { "barangay": <id>, "position": "<position>", "name": "<name>" }
        Creates a new active signatory for that slot and archives whichever
        one was active there before (single-active-signatory rule).
    """
    permission_classes = [IsAdmin]

    def get(self, request):
      barangay_id = request.query_params.get('barangay')
      if not barangay_id:
          return Response({'detail': 'barangay query param is required.'}, status=400)

      try:
          barangay = Barangay.objects.get(barangay_id=barangay_id)
      except Barangay.DoesNotExist:
          return Response({'detail': 'Barangay not found.'}, status=404)

      results = []
      for position_value, position_label in POSITION_CHOICES:
          active = Signatory.objects.filter(
              barangay=barangay, position=position_value, status='Active'
          ).first()
          history = Signatory.objects.filter(
              barangay=barangay, position=position_value, status='Inactive'
          ).order_by('-created_at')[:HISTORY_LIMIT]

          results.append({
              'position': position_value,
              'active': SignatorySerializer(active).data if active else None,
              'history': SignatorySerializer(history, many=True).data,
          })

      return Response(results)

    def post(self, request):
      serializer = SignatorySerializer(data=request.data)
      serializer.is_valid(raise_exception=True)

      barangay = serializer.validated_data['barangay']
      position = serializer.validated_data['position']
      name = serializer.validated_data['name']

      with transaction.atomic():
          previous_active = Signatory.objects.filter(
              barangay=barangay, position=position, status='Active'
          ).first()
          if previous_active:
              previous_active.status = 'Inactive'
              previous_active.save()

          new_signatory = Signatory.objects.create(
              barangay=barangay, position=position, name=name, status='Active'
          )

      log_action(
          user=request.user,
          action='Set Signatory',
          affected_table='tbl_signatory',
          old_value=f"{position}: {previous_active.name}" if previous_active else None,
          new_value=f"{position}: {new_signatory.name} ({barangay.barangay_name})",
          ip_address=request.META.get('REMOTE_ADDR')
      )
      return Response(SignatorySerializer(new_signatory).data, status=status.HTTP_201_CREATED)


class SignatoryRestoreView(APIView):
    """
    POST /api/signatories/<signatory_id>/restore/
        Reactivates a past signatory record and archives whatever is
        currently active for that same (barangay, position) slot.
    """
    permission_classes = [IsAdmin]

    def post(self, request, signatory_id):
        try:
            target = Signatory.objects.get(signatory_id=signatory_id)
        except Signatory.DoesNotExist:
            return Response({'detail': 'Signatory record not found.'}, status=404)

        if target.status == 'Active':
            return Response({'detail': 'This signatory is already active.'}, status=400)

        with transaction.atomic():
            current_active = Signatory.objects.filter(
                barangay=target.barangay, position=target.position, status='Active'
            ).first()
            if current_active:
                current_active.status = 'Inactive'
                current_active.save()

            target.status = 'Active'
            target.save()

        log_action(
            user=request.user,
            action='Restored Signatory',
            affected_table='tbl_signatory',
            old_value=f"{target.position}: {current_active.name}" if current_active else None,
            new_value=f"{target.position}: {target.name} ({target.barangay.barangay_name})",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response(SignatorySerializer(target).data)