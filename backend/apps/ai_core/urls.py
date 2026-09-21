from django.urls import path
from .views import (
    AIHealthView,
    AICatalogSearchView,
    AICatalogServiceDetailView,
    AIPreCallView,
    AIPostCallView,
    AILeadScoringView,
    AIChurnRadarView,
    AISalesEnrichmentView,
    AIAnalyzeConversationView,
    AIValidateActionView,
    AISessionDetailView,
    AIToolsListView,
    AIAudioTranscribeView,
)

urlpatterns = [
    # Santé et métadonnées
    path("health/", AIHealthView.as_view(), name="health"),
    path("tools/", AIToolsListView.as_view(), name="tools_list"),

    # RAG Catalogue Orange Business
    path("catalog/search/", AICatalogSearchView.as_view(), name="catalog_search"),
    path("catalog/service/<str:service_id>/", AICatalogServiceDetailView.as_view(), name="catalog_service_detail"),

    # Transcription audio via Gemini (STT unifié)
    path("transcribe/", AIAudioTranscribeView.as_view(), name="audio_transcribe"),

    # 5 Moteurs d'action B2B
    path("pre-call/", AIPreCallView.as_view(), name="pre_call"),
    path("post-call/", AIPostCallView.as_view(), name="post_call"),
    path("lead-scoring/", AILeadScoringView.as_view(), name="lead_scoring"),
    path("churn-radar/", AIChurnRadarView.as_view(), name="churn_radar"),
    path("sales-enrichment/", AISalesEnrichmentView.as_view(), name="sales_enrichment"),

    # Session & Human-in-the-Loop
    path("analyze/", AIAnalyzeConversationView.as_view(), name="analyze"),
    path("validate/", AIValidateActionView.as_view(), name="validate"),
    path("session/<str:session_id>/", AISessionDetailView.as_view(), name="session_detail"),
]
