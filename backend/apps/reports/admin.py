from django.contrib import admin

from .models import CustomWasteType, BarangayPersonnel
admin.site.register(BarangayPersonnel)
admin.site.register(CustomWasteType)