from django.urls import path
from .views import RegisterView, LoginView, MeView, KAMListView, FCMTokenUpdateView, ManagersView, ManagerToggleActiveView
from .copilot_views import (
    CopilotProfileView,
    CopilotConversationListView,
    CopilotMessageListView,
    CopilotChatView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('me/', MeView.as_view(), name='me'),
    path('kams/', KAMListView.as_view(), name='kams'),
    path('fcm-token/', FCMTokenUpdateView.as_view(), name='fcm_token_update'),
    path('managers/', ManagersView.as_view(), name='managers'),
    path('managers/<int:pk>/toggle-active/', ManagerToggleActiveView.as_view(), name='manager_toggle_active'),
    
    # Copilote IA Dédié par Compte
    path('copilot/profile/', CopilotProfileView.as_view(), name='copilot-profile'),
    path('copilot/conversations/', CopilotConversationListView.as_view(), name='copilot-conversations'),
    path('copilot/conversations/<uuid:conversation_id>/messages/', CopilotMessageListView.as_view(), name='copilot-messages'),
    path('copilot/chat/', CopilotChatView.as_view(), name='copilot-chat'),
]

