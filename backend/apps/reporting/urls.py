from django.urls import path
from .views import DemoStatsView, DemoLogsView

urlpatterns = [
    path('demo-stats/', DemoStatsView.as_view(), name='demo-stats'),
    path('demo-logs/', DemoLogsView.as_view(), name='demo-logs'),
]
