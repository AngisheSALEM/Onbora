from django.urls import path
from .views import DossierListView, DossierDetailView, DossierBusinessTwinView, DossierExportView, DossierProvisionView

urlpatterns = [
    path('dossiers/', DossierListView.as_view(), name='dossier-list'),
    path('dossiers/<int:pk>/', DossierDetailView.as_view(), name='dossier-detail'),
    path('dossiers/<int:pk>/business-twin/', DossierBusinessTwinView.as_view(), name='dossier-business-twin'),
    path('dossiers/<int:pk>/export/', DossierExportView.as_view(), name='dossier-export'),
    path('dossiers/<int:pk>/provision/', DossierProvisionView.as_view(), name='dossier-provision'),
]
