from django.urls import path
from .views import (
    SensorNodeListView, SensorNodeDetailView, SensorNodeByBarangayView,
    SystemHealthLogListView, SystemHealthLogByNodeView, SystemHealthLogExportView,
    SensorNodeUnassignView, SensorNodeRetireView, SensorNodeConfigView,
    SensorNodeNextCodeView, SensorNodeGenerateKeyView,
    SensorNodeMarkMaintenanceView, SensorNodeMarkAvailableView,
    SensorNodeForceSleepView, SensorNodeCancelForceSleepView,
    MaintenanceLogListView, MaintenanceLogExportView,
    NodeAssignmentHistoryView,
)

urlpatterns = [
    path('sensor-nodes/', SensorNodeListView.as_view(), name='sensor-node-list'),
    path('sensor-nodes/next-code/', SensorNodeNextCodeView.as_view(), name='sensor-node-next-code'),
    path('sensor-nodes/<int:node_id>/', SensorNodeDetailView.as_view(), name='sensor-node-detail'),
    path('sensor-nodes/<int:node_id>/config/', SensorNodeConfigView.as_view(), name='sensor-node-config'),
    path('sensor-nodes/<int:node_id>/generate-key/', SensorNodeGenerateKeyView.as_view(), name='sensor-node-generate-key'),
    path('sensor-nodes/barangay/<int:barangay_id>/', SensorNodeByBarangayView.as_view(), name='sensor-node-by-barangay'),
    path('sensor-nodes/<int:node_id>/unassign/', SensorNodeUnassignView.as_view(), name='sensor-node-unassign'),
    path('sensor-nodes/<int:node_id>/retire/', SensorNodeRetireView.as_view(), name='sensor-node-retire'),
    path('system-health/', SystemHealthLogListView.as_view(), name='system-health-list'),
    path('system-health/node/<int:node_id>/', SystemHealthLogByNodeView.as_view(), name='system-health-by-node'),
    path('system-health/export/', SystemHealthLogExportView.as_view(), name='system-health-export'),
    path('sensor-nodes/<int:node_id>/mark-maintenance/', SensorNodeMarkMaintenanceView.as_view(), name='sensor-node-mark-maintenance'),
    path('sensor-nodes/<int:node_id>/mark-available/', SensorNodeMarkAvailableView.as_view(), name='sensor-node-mark-available'),
    path('sensor-nodes/<int:node_id>/force-sleep/', SensorNodeForceSleepView.as_view(), name='sensor-node-force-sleep'),
    path('sensor-nodes/<int:node_id>/cancel-force-sleep/', SensorNodeCancelForceSleepView.as_view(), name='sensor-node-cancel-force-sleep'),
    path('maintenance-logs/', MaintenanceLogListView.as_view(), name='maintenance-log-list'),
    path('maintenance-logs/export/', MaintenanceLogExportView.as_view(), name='maintenance-log-export'),
    path('sensor-nodes/<int:node_id>/assignment-history/', NodeAssignmentHistoryView.as_view(), name='sensor-node-assignment-history'),
]