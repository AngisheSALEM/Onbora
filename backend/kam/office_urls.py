from django.urls import path
from .office_views import (
    KamOfficeOverviewView,
    KamOfficeKamListView,
    KamOfficeKamDetailView,
    KamOfficeAccountsListView,
    KamOfficeAssignAccountView,
)

urlpatterns = [
    path('overview/', KamOfficeOverviewView.as_view(), name='kam-office-overview'),
    path('kams/', KamOfficeKamListView.as_view(), name='kam-office-kams-list'),
    path('kams/<int:pk>/', KamOfficeKamDetailView.as_view(), name='kam-office-kam-detail'),
    path('accounts/', KamOfficeAccountsListView.as_view(), name='kam-office-accounts-list'),
    path('assign/', KamOfficeAssignAccountView.as_view(), name='kam-office-assign-account'),
]
