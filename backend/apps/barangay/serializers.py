from rest_framework import serializers
from .models import Barangay

class BarangaySerializer(serializers.ModelSerializer):
  has_boundary = serializers.SerializerMethodField()

  class Meta:
    model = Barangay
    exclude = ['boundary']

  def get_has_boundary(self, obj):
    return obj.boundary is not None