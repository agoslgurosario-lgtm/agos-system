from django.contrib import admin
from .models import Signatory


@admin.register(Signatory)
class SignatoryAdmin(admin.ModelAdmin):
    list_display = ('signatory_id', 'name', 'position', 'barangay', 'status', 'created_at')
    list_filter = ('barangay', 'position', 'status')