from django.urls import path
from .views import (
    ConversationCreateView,
    MessageCreateView,
    ConversationRecommendationsView,
    ConversationTransmitView,
    ConversationExportView,
    ConversationDetailView,
    ConversationVoiceMessageView,
    QualificationQuestionsView,
    QualificationSubmitView,
    QualificationRecordListView,
    HandoffDossierListView,
    HandoffDossierDetailView,
    HandoffAcceptView,
    HandoffReturnView,
)

urlpatterns = [
    # Inbound Client Conversations (Maxit, Widget, Portail)
    path('conversations/', ConversationCreateView.as_view(), name='conversation-create'),
    path('conversations/<int:pk>/', ConversationDetailView.as_view(), name='conversation-detail'),
    path('conversations/<int:pk>/messages/', MessageCreateView.as_view(), name='message-create'),
    path('conversations/<int:pk>/voice-message/', ConversationVoiceMessageView.as_view(), name='conversation-voice-message'),
    path('conversations/<int:pk>/recommendations/', ConversationRecommendationsView.as_view(), name='conversation-recommendations'),
    path('conversations/<int:pk>/transmit/', ConversationTransmitView.as_view(), name='conversation-transmit'),
    path('conversations/<int:pk>/export/', ConversationExportView.as_view(), name='conversation-export'),

    # Epic 2 : Qualification Double Segment & Bascule SOHO -> KAM (Handoff)
    path('questions/', QualificationQuestionsView.as_view(), name='discovery-questions'),
    path('qualifications/', QualificationRecordListView.as_view(), name='qualification-record-list'),
    path('qualifications/submit/', QualificationSubmitView.as_view(), name='qualification-submit'),
    path('handoffs/', HandoffDossierListView.as_view(), name='handoff-dossier-list'),
    path('handoffs/<uuid:pk>/', HandoffDossierDetailView.as_view(), name='handoff-dossier-detail'),
    path('handoffs/<uuid:pk>/accept/', HandoffAcceptView.as_view(), name='handoff-accept'),
    path('handoffs/<uuid:pk>/return/', HandoffReturnView.as_view(), name='handoff-return'),
]
