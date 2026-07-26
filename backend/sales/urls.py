from django.urls import path
from .views import (
    EnterpriseSearchView,
    VisitPreparationCreateView,
    VisitReportCreateView,
    VisitReportTransmitView,
    VisitReportExportView,
    VoiceUploadView
)

urlpatterns = [
    path('enterprises/search/', EnterpriseSearchView.as_view(), name='enterprise-search'),
    path('visit-preparations/', VisitPreparationCreateView.as_view(), name='visit-preparation-create'),
    path('visit-reports/', VisitReportCreateView.as_view(), name='visit-report-create'),
    path('visit-reports/<int:pk>/transmit/', VisitReportTransmitView.as_view(), name='visit-report-transmit'),
    path('visit-reports/<int:pk>/export/', VisitReportExportView.as_view(), name='visit-report-export'),
    path('voice-upload/', VoiceUploadView.as_view(), name='voice-upload'),
]

