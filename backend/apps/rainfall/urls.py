from django.urls import path
from .views import MyBarangayRainfallConditionView, AlertThresholdView, AlertThresholdResetView

urlpatterns = [
    path('rainfall-condition/', MyBarangayRainfallConditionView.as_view(), name='rainfall-condition'),
    path('alert-thresholds/', AlertThresholdView.as_view(), name='alert-thresholds'),
    path('alert-thresholds/reset/', AlertThresholdResetView.as_view(), name='alert-thresholds-reset'),
]