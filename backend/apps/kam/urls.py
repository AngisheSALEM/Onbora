from django.urls import path
from .views import (
    DossierListView, DossierDetailView, DossierBusinessTwinView, 
    DossierExportView, DossierProvisionView, DossierHandoverPackView,
    KamStrategicAccountListView, KamBriefingDetailView, KamAccountDebriefView,
    KamAccountUpdateInfoView,
    KamAppointmentListCreateView, KamAppointmentDetailView, KamCompleteVocalMeetingView,
    KamVisitHistoryListView, KamVisitReportDetailView, KamAudioTranscribeView,
    RelationshipCoverageListCreateView, RelationshipCoverageDetailView, RelationshipCoverageDiagnosticView,
    AccountMemoryEventListCreateView, AccountHandoverPackView, AccountRiskSignalsView
)
from .commercial_intelligence_views import (
    PreCallBriefingDetailView, PreCallBriefingListView,
    PostCallExecutionDetailView, PostCallSyncCrmView,
    LeadScoringListView, ChurnRadarView
)

urlpatterns = [
    # 1. Pre-Call Intelligence (Briefing pré-RDV en 2 minutes)
    path('pre-call/<int:account_id>/', PreCallBriefingDetailView.as_view(), name='kam-pre-call-detail'),
    path('pre-call/list/', PreCallBriefingListView.as_view(), name='kam-pre-call-list'),

    # 2. Post-Call Execution (Email prêt à envoyer & Synchronisation CRM Dynamics)
    path('post-call/<int:report_id>/', PostCallExecutionDetailView.as_view(), name='kam-post-call-detail'),
    path('visits/<int:report_id>/sync-crm/', PostCallSyncCrmView.as_view(), name='kam-visit-sync-crm'),

    # 3. Lead Scoring B2B (Priorisation du pipeline)
    path('lead-scoring/', LeadScoringListView.as_view(), name='kam-lead-scoring'),

    # 4. Radar Churn & Upsell (Détection proactive)
    path('churn-radar/', ChurnRadarView.as_view(), name='kam-churn-radar'),

    # Comptes & Visites existantes
    path('accounts/', KamStrategicAccountListView.as_view(), name='kam-accounts-list'),
    path('accounts/<int:account_id>/debrief/', KamAccountDebriefView.as_view(), name='kam-account-debrief'),
    path('accounts/<int:account_id>/update-info/', KamAccountUpdateInfoView.as_view(), name='kam-account-update-info'),
    path('briefing/<int:account_id>/', KamBriefingDetailView.as_view(), name='kam-briefing-detail'),
    
    # Agenda, Rendez-vous & Clôture vocale connectée à Core AI
    path('transcribe/', KamAudioTranscribeView.as_view(), name='kam-transcribe'),
    path('appointments/', KamAppointmentListCreateView.as_view(), name='kam-appointments-list-create'),
    path('appointments/<int:pk>/', KamAppointmentDetailView.as_view(), name='kam-appointment-detail'),
    path('appointments/<int:pk>/complete-vocal/', KamCompleteVocalMeetingView.as_view(), name='kam-appointment-complete-vocal'),

    # Historique réel des visites et rapports exécutifs
    path('visits/', KamVisitHistoryListView.as_view(), name='kam-visits-history'),
    path('visits/<int:pk>/', KamVisitReportDetailView.as_view(), name='kam-visit-detail'),

    path('dossiers/', DossierListView.as_view(), name='dossier-list'),
    path('dossiers/<int:pk>/', DossierDetailView.as_view(), name='dossier-detail'),
    path('dossiers/<int:pk>/business-twin/', DossierBusinessTwinView.as_view(), name='dossier-business-twin'),
    path('dossiers/<int:pk>/export/', DossierExportView.as_view(), name='dossier-export'),
    path('dossiers/<int:pk>/provision/', DossierProvisionView.as_view(), name='dossier-provision'),
    path('dossiers/<int:pk>/handover-pack/', DossierHandoverPackView.as_view(), name='dossier-handover-pack'),

    # 5. Cartographie Relationnelle & Détection Mono-Champion (Epic 1)
    path('relationships/', RelationshipCoverageListCreateView.as_view(), name='kam-relationships-list-create'),
    path('relationships/<uuid:pk>/', RelationshipCoverageDetailView.as_view(), name='kam-relationships-detail'),
    path('relationships/diagnostic/<int:enterprise_id>/', RelationshipCoverageDiagnosticView.as_view(), name='kam-relationships-diagnostic'),

    # 6. Mémoire de Compte & Radar de Risque Explicable (Epic 5)
    path('accounts/<int:enterprise_id>/memory/', AccountMemoryEventListCreateView.as_view(), name='account-memory-list-create'),
    path('accounts/<int:enterprise_id>/handover-pack/', AccountHandoverPackView.as_view(), name='account-handover-pack'),
    path('accounts/<int:enterprise_id>/risk-signals/', AccountRiskSignalsView.as_view(), name='account-risk-signals'),
]



