from django.urls import path
from .views import (
    CanalMonitoringReportListView, CanalMonitoringReportDetailView, CanalMonitoringReportExportView,
    MyReportsListView,
    ReportMediaListView, ReportMediaUploadView, ReportMediaDetailView, ReportMediaByClogEventView, SignatoryStatusView,
    CustomWasteTypeListCreateView, CustomWasteTypeReviewView, 
)

urlpatterns = [
    path('canal-reports/', CanalMonitoringReportListView.as_view()),
    path('canal-reports/mine/', MyReportsListView.as_view()),
    path('canal-reports/<int:report_id>/', CanalMonitoringReportDetailView.as_view()),
    path('canal-reports/<int:report_id>/export/', CanalMonitoringReportExportView.as_view()),
    path('report-media/', ReportMediaListView.as_view()),
    path('report-media/upload/', ReportMediaUploadView.as_view()),
    path('report-media/<int:media>/', ReportMediaDetailView.as_view()),
    path('canal-reports/signatory-status/', SignatoryStatusView.as_view()),
    path('report-media/clog-event/<int:event_id>/', ReportMediaByClogEventView.as_view(), name='report-media-by-clog-event'),
    path('custom-waste-types/', CustomWasteTypeListCreateView.as_view()),
    path('custom-waste-types/<int:waste_type_id>/', CustomWasteTypeReviewView.as_view()),
]