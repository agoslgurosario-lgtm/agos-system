from django.urls import path
from .views import SignatoryListView, SignatoryRestoreView

urlpatterns = [
    path('signatories/', SignatoryListView.as_view(), name='signatory-list'),
    path('signatories/<int:signatory_id>/restore/', SignatoryRestoreView.as_view(), name='signatory-restore'),
]