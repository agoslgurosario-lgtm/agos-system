"""
URL configuration for agos_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from django.http import JsonResponse

def healthz(request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path('healthz/', healthz),
    path('admin/', admin.site.urls),
    path('api/', include('apps.users.urls')),
    path('api/', include('apps.barangay.urls')),
    path('api/', include('apps.signatories.urls')),
    path('api/', include('apps.hotspots.urls')),
    path('api/', include('apps.sensor_nodes.urls')),
    path('api/', include('apps.sensor_readings.urls')),
    path('api/', include('apps.waste_classification.urls')),
    path('api/', include('apps.clog_events.urls')),
    path('api/', include('apps.alerts.urls')),
    path('api/', include('apps.reports.urls')),
    path('api/', include('apps.audit_logs.urls')),
    path('api/', include('apps.training_captures.urls')),
    path('api/', include('apps.training_captures.urls')),
    path('api/', include('apps.system_backup.urls')),
    path('api/', include('apps.alert_sounds.urls')),
    path('api/', include('apps.rainfall.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
