from django.urls import path
from .views import (
    PlaqueListCreateView,
    PlaqueDetailView,
    SalespersonListView,
    SalespersonDetailView,
    AssignSalespersonsToPlaqueView,
    SupervisorDashboardView,
    EnterpriseSearchView,
    EnterpriseMapView,
    EnterpriseBriefView,
    EnterpriseEnrichView,
    PlaqueListView,
    SalespersonActivityView,
    LiveCopilotTurnView,
    VisitPreparationCreateView,
    VisitReportCreateView,
    VisitReportGenerateFromAIView,
    VisitReportFeedbackView,
    VisitReportTransmitView,
    VisitReportExportView,
    VoiceUploadView,
    ScraperCredentialListCreateView,
    ScraperCredentialDetailView,
    KaabuDeduplicateView,
    ArrowSphereWebhookView,
    FieldIntelligenceReportCreateListView,
    FieldIntelligenceNearbyLeadsView,
    FieldIntelligenceTradeAuditsView,
    FieldIntelligenceLeaderboardView,
)

urlpatterns = [
    # Console Superviseur & Découpage Territorial
    path('supervisor-dashboard/', SupervisorDashboardView.as_view(), name='supervisor-dashboard'),
    path('salespersons/', SalespersonListView.as_view(), name='salesperson-list'),
    path('salespersons/<int:pk>/', SalespersonDetailView.as_view(), name='salesperson-detail'),
    path('plaques/<int:pk>/assign/', AssignSalespersonsToPlaqueView.as_view(), name='plaque-assign-salespersons'),
    # Gestion des Plaques territoriales & Cartographie
    path('plaques/', PlaqueListCreateView.as_view(), name='plaque-list-create'),
    path('plaques/<int:pk>/', PlaqueDetailView.as_view(), name='plaque-detail'),
    path('enterprises/map/', EnterpriseMapView.as_view(), name='enterprise-map'),
    path('enterprises/<int:pk>/brief/', EnterpriseBriefView.as_view(), name='enterprise-brief'),
    path('enterprises/<int:pk>/enrich/', EnterpriseEnrichView.as_view(), name='enterprise-enrich'),
    path('me/activity/', SalespersonActivityView.as_view(), name='salesperson-activity'),

    # Recherche globale
    path('enterprises/search/', EnterpriseSearchView.as_view(), name='enterprise-search'),

    # Copilote en direct temps réel pendant la visite
    path('live-copilot/turn/', LiveCopilotTurnView.as_view(), name='live-copilot-turn'),

    # Fiches de visite, Génération IA et Boucle d'apprentissage continu
    path('visit-preparations/', VisitPreparationCreateView.as_view(), name='visit-preparation-create'),
    path('visit-reports/', VisitReportCreateView.as_view(), name='visit-report-create'),
    path('visit-reports/generate-from-ai/', VisitReportGenerateFromAIView.as_view(), name='visit-report-generate-ai'),
    path('visit-reports/<int:pk>/feedback/', VisitReportFeedbackView.as_view(), name='visit-report-feedback'),
    path('visit-reports/<int:pk>/transmit/', VisitReportTransmitView.as_view(), name='visit-report-transmit'),
    path('visit-reports/<int:pk>/export/', VisitReportExportView.as_view(), name='visit-report-export'),
    path('voice-upload/', VoiceUploadView.as_view(), name='voice-upload'),

    # Field Intelligence & Lead Sourcing (Proximité, Parrainages, Trade Audit, Nurturing & Leaderboard)
    path('field-intelligence/', FieldIntelligenceReportCreateListView.as_view(), name='field-intelligence-list-create'),
    path('field-intelligence/nearby-leads/', FieldIntelligenceNearbyLeadsView.as_view(), name='field-intelligence-nearby-leads'),
    path('field-intelligence/trade-audits/', FieldIntelligenceTradeAuditsView.as_view(), name='field-intelligence-trade-audits'),
    path('field-intelligence/leaderboard/', FieldIntelligenceLeaderboardView.as_view(), name='field-intelligence-leaderboard'),

    # Identifiants de scraping & Intégrations externes
    path('credentials/', ScraperCredentialListCreateView.as_view(), name='scraper-credential-list-create'),
    path('credentials/<str:platform>/', ScraperCredentialDetailView.as_view(), name='scraper-credential-detail'),
    path('integrations/kaabu/deduplicate/', KaabuDeduplicateView.as_view(), name='kaabu-deduplicate'),
    path('integrations/arrowsphere/webhook/', ArrowSphereWebhookView.as_view(), name='arrowsphere-webhook'),
]

