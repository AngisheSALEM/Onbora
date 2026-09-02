from django.urls import path
from .views import (
    DossierListView, DossierDetailView, DossierBusinessTwinView, 
    DossierExportView, DossierProvisionView, DossierHandoverPackView,
    KamStrategicAccountListView, KamBriefingDetailView
)

urlpatterns = [
    path('accounts/', KamStrategicAccountListView.as_view(), name='kam-accounts-list'),
    path('briefing/<int:account_id>/', KamBriefingDetailView.as_view(), name='kam-briefing-detail'),
    path('dossiers/', DossierListView.as_view(), name='dossier-list'),
    path('dossiers/<int:pk>/', DossierDetailView.as_view(), name='dossier-detail'),
    path('dossiers/<int:pk>/business-twin/', DossierBusinessTwinView.as_view(), name='dossier-business-twin'),
    path('dossiers/<int:pk>/export/', DossierExportView.as_view(), name='dossier-export'),
    path('dossiers/<int:pk>/provision/', DossierProvisionView.as_view(), name='dossier-provision'),
    path('dossiers/<int:pk>/handover-pack/', DossierHandoverPackView.as_view(), name='dossier-handover-pack'),
]
