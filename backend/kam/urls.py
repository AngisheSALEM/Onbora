from django.urls import path
from .views import (
    DossierListView, DossierDetailView, DossierBusinessTwinView, 
    DossierExportView, DossierProvisionView, DossierHandoverPackView,
    KamStrategicAccountListView, KamBriefingDetailView, KamAccountDebriefView,
    KamAccountUpdateInfoView,
    KamAppointmentListCreateView, KamAppointmentDetailView, KamCompleteVocalMeetingView,
    KamVisitHistoryListView, KamVisitReportDetailView
)

urlpatterns = [
    path('accounts/', KamStrategicAccountListView.as_view(), name='kam-accounts-list'),
    path('accounts/<int:account_id>/debrief/', KamAccountDebriefView.as_view(), name='kam-account-debrief'),
    path('accounts/<int:account_id>/update-info/', KamAccountUpdateInfoView.as_view(), name='kam-account-update-info'),
    path('briefing/<int:account_id>/', KamBriefingDetailView.as_view(), name='kam-briefing-detail'),
    
    # Agenda, Rendez-vous & Clôture vocale connectée à Core AI
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
]

