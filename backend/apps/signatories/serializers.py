from rest_framework import serializers
from .models import Signatory


class SignatorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Signatory
        fields = ['signatory_id', 'barangay', 'position', 'name', 'status', 'created_at']
        read_only_fields = ['signatory_id', 'status', 'created_at']
        validators = []