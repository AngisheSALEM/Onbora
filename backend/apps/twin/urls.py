from django.urls import path
from .views import CalculateROIView

urlpatterns = [
    path('calculate-roi/', CalculateROIView.as_view(), name='twin-calculate-roi'),
]
