from django.urls import path
from . import views

app_name = "api"

urlpatterns = [
    path("health/", views.health_check, name="health_check"),
    path("conversations/", views.create_conversation, name="create_conversation"),
    path("conversations/<int:conversation_id>/turn/", views.process_turn, name="process_turn"),
    path("conversations/<int:conversation_id>/analyze/", views.analyze_conversation, name="analyze_conversation"),
    path("conversations/<int:conversation_id>/reports/", views.generate_report, name="generate_report"),
    path("quick-match/", views.quick_match, name="quick_match"),
]
