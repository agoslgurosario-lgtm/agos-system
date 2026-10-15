from django.urls import path
from .views import (
    ManualBackupView, RestoreBackupView, BackupConfigView,
    BackupLogListView, RestorePointListView, RestoreFromServerView,
)
from .chunked_restore import RestoreChunkView, RestoreFinishView, RestoreStatusView

urlpatterns = [
    path('backup/manual/', ManualBackupView.as_view(), name='manual-backup'),
    path('backup/restore/', RestoreBackupView.as_view(), name='restore-backup'),
    path('backup/restore-from-server/', RestoreFromServerView.as_view(), name='restore-from-server'),
    path('backup/restore/chunk/', RestoreChunkView.as_view(), name='restore-chunk'),
    path('backup/restore/finish/', RestoreFinishView.as_view(), name='restore-finish'),
    path('backup/restore/status/<str:upload_id>/', RestoreStatusView.as_view(), name='restore-status'),
    path('backup/config/', BackupConfigView.as_view(), name='backup-config'),
    path('backup/logs/', BackupLogListView.as_view(), name='backup-logs'),
    path('backup/restore-points/', RestorePointListView.as_view(), name='restore-points'),
]