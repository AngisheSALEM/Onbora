from django.urls import path
from .views import RegisterView, LoginView, MeView, KAMListView, FCMTokenUpdateView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('me/', MeView.as_view(), name='me'),
    path('kams/', KAMListView.as_view(), name='kams'),
    path('fcm-token/', FCMTokenUpdateView.as_view(), name='fcm_token_update'),
]

