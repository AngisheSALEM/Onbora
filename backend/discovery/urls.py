from django.urls import path
from .views import (
    ConversationCreateView,
    MessageCreateView,
    ConversationRecommendationsView,
    ConversationTransmitView,
    ConversationExportView
)

urlpatterns = [
    path('conversations/', ConversationCreateView.as_view(), name='conversation-create'),
    path('conversations/<int:pk>/messages/', MessageCreateView.as_view(), name='message-create'),
    path('conversations/<int:pk>/recommendations/', ConversationRecommendationsView.as_view(), name='conversation-recommendations'),
    path('conversations/<int:pk>/transmit/', ConversationTransmitView.as_view(), name='conversation-transmit'),
    path('conversations/<int:pk>/export/', ConversationExportView.as_view(), name='conversation-export'),
]
