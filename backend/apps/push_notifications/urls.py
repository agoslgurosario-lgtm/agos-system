from django.urls import path
from .views import RegisterDeviceView, UnregisterDeviceView

urlpatterns = [
    path('push/register/', RegisterDeviceView.as_view(), name='push-register'),
    path('push/unregister/', UnregisterDeviceView.as_view(), name='push-unregister'),
]