from django.urls import path
from .views import (
    PlaqueListCreateView,
    PlaqueDetailView,
    PlaqueKMLDownloadView,
    PlaqueDrawAndSaveView,
    PlaquePurgeMockView,
    SalesNotificationListView,
    SalespersonListView,
    SalespersonDetailView,
    AssignSalespersonsToPlaqueView,
    SupervisorDashboardView,
    EnterpriseSearchView,
    EnterpriseMapView,
    EnterpriseBriefView,
    EnterpriseEnrichView,
    SalespersonActivityView,
    LiveCopilotTurnView,
    LiveCopilotTogglePackageView,
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
    AdvProvisioningQueueView,
    AdvTriggerProvisioningStpView,
    DocumentOcrScanView,
    TestPushNotificationView,
    SubmitVisitFormView,
    VisitFormSubmissionListView,
)

urlpatterns = [
    # Notifications Push & In-App Commerciaux
    path('notifications/', SalesNotificationListView.as_view(), name='sales-notifications-list'),
    path('notifications/<int:pk>/mark-read/', SalesNotificationListView.as_view(), name='sales-notification-mark-read'),
    path('notifications/mark-all-read/', SalesNotificationListView.as_view(), name='sales-notifications-mark-all-read'),
    path('notifications/test-push/', TestPushNotificationView.as_view(), name='sales-notifications-test-push'),

    # Numérisation OCR de Documents (RCCM, Carte de visite, Facture Télécom)
    path('ocr/scan/', DocumentOcrScanView.as_view(), name='sales-ocr-scan'),

    # ADV & Provisioning STP Engine (ZTE ZSmart + Microsoft CSP + TOM Fibre)
    path('provisioning/queue/', AdvProvisioningQueueView.as_view(), name='adv-provisioning-queue'),
    path('provisioning/trigger-stp/', AdvTriggerProvisioningStpView.as_view(), name='adv-provisioning-trigger-stp'),

    # Console Superviseur & Découpage Territorial
    path('supervisor-dashboard/', SupervisorDashboardView.as_view(), name='supervisor-dashboard'),
    path('salespersons/', SalespersonListView.as_view(), name='salesperson-list'),
    path('salespersons/<int:pk>/', SalespersonDetailView.as_view(), name='salesperson-detail'),
    path('plaques/<int:pk>/assign/', AssignSalespersonsToPlaqueView.as_view(), name='plaque-assign-salespersons'),
    path('plaques/<int:pk>/kml/', PlaqueKMLDownloadView.as_view(), name='plaque-kml-download'),
    path('plaques/draw-zone/', PlaqueDrawAndSaveView.as_view(), name='plaque-draw-save-kml'),
    path('plaques/purge-mock/', PlaquePurgeMockView.as_view(), name='plaque-purge-mock'),
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
    path('live-copilot/toggle-package/', LiveCopilotTogglePackageView.as_view(), name='live-copilot-toggle-package'),

    # Fiches de visite, Formulaires guidés, Génération IA et Boucle d'apprentissage continu
    path('visit-form/submit/', SubmitVisitFormView.as_view(), name='submit-visit-form'),
    path('visit-form/submissions/', VisitFormSubmissionListView.as_view(), name='visit-form-submissions'),
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

