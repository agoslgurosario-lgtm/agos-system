from django.urls import path
from .views import ( ClogEventListView, ClogEventDetailView, ClogEventByBarangayView, UpdateClogStatusView, ClogEventExportView , ClogEventRespondView )

urlpatterns = [
    path('clog-events/', ClogEventListView.as_view(), name='clog-event-list'),
    path('clog-events/<int:event_id>/', ClogEventDetailView.as_view(), name='clog-event-detail'),
    path('clog-events/barangay/<int:barangay_id>/', ClogEventByBarangayView.as_view(), name='clog-event-by-barangay'),
    path('clog-events/<int:event_id>/status/', UpdateClogStatusView.as_view(), name='clog-event-status'),
    path('clog-events/export/', ClogEventExportView.as_view(), name='clog-event-export'),
    path('clog-events/<int:event_id>/respond/', ClogEventRespondView.as_view(), name='clog-event-respond'),
]