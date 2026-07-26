from django.urls import path
from .views import ServiceCatalogListCreateView, ServiceCatalogDetailView, CatalogUploadView

urlpatterns = [
    path('services/', ServiceCatalogListCreateView.as_view(), name='service-list-create'),
    path('services/<int:pk>/', ServiceCatalogDetailView.as_view(), name='service-detail'),
    path('services/upload/', CatalogUploadView.as_view(), name='service-upload'),
]
