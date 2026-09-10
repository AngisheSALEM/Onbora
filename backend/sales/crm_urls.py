from django.urls import path
from .views import (
    EnterpriseListFullView,
    EnterpriseSearchView,
    EnterpriseMapView,
    EnterpriseBriefView,
    EnterpriseEnrichView,
    EnterpriseAssignSalespersonView,
    ConvertedAccountsView,
    SegmentationConfigView,
    ResegmentEnterprisesView,
)

urlpatterns = [
    # Repertoire Central CRM des Entreprises B2B
    path('enterprises/', EnterpriseListFullView.as_view(), name='crm-enterprise-list-full'),
    path('enterprises/search/', EnterpriseSearchView.as_view(), name='crm-enterprise-search'),
    path('enterprises/map/', EnterpriseMapView.as_view(), name='crm-enterprise-map'),
    path('enterprises/<int:pk>/brief/', EnterpriseBriefView.as_view(), name='crm-enterprise-brief'),
    path('enterprises/<int:pk>/enrich/', EnterpriseEnrichView.as_view(), name='crm-enterprise-enrich'),
    path('enterprises/<int:pk>/assign-salesperson/', EnterpriseAssignSalespersonView.as_view(), name='crm-enterprise-assign-salesperson'),
    
    # Comptes Convertis & Configuration de Segmentation
    path('converted-accounts/', ConvertedAccountsView.as_view(), name='crm-converted-accounts'),
    path('segmentation-config/', SegmentationConfigView.as_view(), name='crm-segmentation-config'),
    path('segmentation-config/resegment/', ResegmentEnterprisesView.as_view(), name='crm-segmentation-resegment'),
]
