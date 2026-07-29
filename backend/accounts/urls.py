from django.urls import path
from .views import RegisterView, LoginView, MeView, KAMListView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('me/', MeView.as_view(), name='me'),
    path('kams/', KAMListView.as_view(), name='kams'),
]
