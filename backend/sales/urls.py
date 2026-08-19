from django.urls import path
from .views import (
    EnterpriseSearchView,
    EnterpriseMapView,
    EnterpriseBriefView,
    PlaqueListView,
    SalespersonActivityView,
    VisitPreparationCreateView,
    VisitReportCreateView,
    VisitReportTransmitView,
    VisitReportExportView,
    VoiceUploadView,
    ScraperCredentialListCreateView,
    ScraperCredentialDetailView,
    KaabuDeduplicateView,
    ArrowSphereWebhookView,
)

urlpatterns = [
    # OpenStreetMap, Plaques & Activity (Mobile Flutter)
    path('plaques/', PlaqueListView.as_view(), name='plaque-list'),
    path('enterprises/map/', EnterpriseMapView.as_view(), name='enterprise-map'),
    path('enterprises/<int:pk>/brief/', EnterpriseBriefView.as_view(), name='enterprise-brief'),
    path('me/activity/', SalespersonActivityView.as_view(), name='salesperson-activity'),

    # Global search (Header)
    path('enterprises/search/', EnterpriseSearchView.as_view(), name='enterprise-search'),

    # Field visit copilot & Whisper voice
    path('visit-preparations/', VisitPreparationCreateView.as_view(), name='visit-preparation-create'),
    path('visit-reports/', VisitReportCreateView.as_view(), name='visit-report-create'),
    path('visit-reports/<int:pk>/transmit/', VisitReportTransmitView.as_view(), name='visit-report-transmit'),
    path('visit-reports/<int:pk>/export/', VisitReportExportView.as_view(), name='visit-report-export'),
    path('voice-upload/', VoiceUploadView.as_view(), name='voice-upload'),

    # Scraping credentials & External Integrations
    path('credentials/', ScraperCredentialListCreateView.as_view(), name='scraper-credential-list-create'),
    path('credentials/<str:platform>/', ScraperCredentialDetailView.as_view(), name='scraper-credential-detail'),
    path('integrations/kaabu/deduplicate/', KaabuDeduplicateView.as_view(), name='kaabu-deduplicate'),
    path('integrations/arrowsphere/webhook/', ArrowSphereWebhookView.as_view(), name='arrowsphere-webhook'),
]
