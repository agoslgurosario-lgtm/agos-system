from django.urls import path
from .views import (
    BarangayListView, BarangayDetailView, BarangayAllView, BarangayBoundaryView,
    BarangayRegisterView, BarangayUnregisterView, BarangayCheckView,
    BarangayDeactivateView, BarangayReactivateView,
)

urlpatterns = [
    path('barangays/', BarangayListView.as_view(), name='barangay-list'),
    path('barangays/all/', BarangayAllView.as_view(), name='barangay-all'),
    path('barangays/<int:barangay_id>/', BarangayDetailView.as_view(), name='barangay-detail'),
    path('barangays/<int:barangay_id>/boundary/', BarangayBoundaryView.as_view(), name='barangay-boundary'),
    path('barangays/<int:barangay_id>/register/', BarangayRegisterView.as_view(), name='barangay-register'),
    path('barangays/<int:barangay_id>/unregister/', BarangayUnregisterView.as_view(), name='barangay-unregister'),
    path('barangays/<int:barangay_id>/check/', BarangayCheckView.as_view(), name='barangay-check'),
    path('barangays/<int:barangay_id>/deactivate/', BarangayDeactivateView.as_view(), name='barangay-deactivate'),
    path('barangays/<int:barangay_id>/reactivate/', BarangayReactivateView.as_view(), name='barangay-reactivate'),
]