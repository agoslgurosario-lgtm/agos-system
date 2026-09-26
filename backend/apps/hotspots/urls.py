from django.urls import path
from .views import ( HotspotListView, HotspotDetailView, HotspotByBarangayView, HotspotAvailableByBarangayView, HotspotNextCodeView, HotspotAssignmentHistoryView, )

urlpatterns = [
    path('hotspots/', HotspotListView.as_view(), name='hotspot-list'),
    path('hotspots/<int:hotspot_id>/', HotspotDetailView.as_view(), name='hotspot-detail'),
    path('hotspots/<int:hotspot_id>/assignment-history/', HotspotAssignmentHistoryView.as_view(), name='hotspot-assignment-history'),
    path('hotspots/barangay/<int:barangay_id>/', HotspotByBarangayView.as_view(), name='hotspot-by-barangay'),
    path('hotspots/barangay/<int:barangay_id>/available/', HotspotAvailableByBarangayView.as_view(), name='hotspot-available-by-barangay'),
    path('hotspots/next-code/', HotspotNextCodeView.as_view(), name='hotspot-next-code'),
]
