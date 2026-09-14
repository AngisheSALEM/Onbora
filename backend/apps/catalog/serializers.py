from rest_framework import serializers
from .models import ServiceCatalog, OfferQuestionnaire, OfferQuestion

class ServiceCatalogSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = ServiceCatalog
        fields = ['id', 'name', 'category', 'category_display', 'description', 'benefits', 'technical_requirements']


class OfferQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = OfferQuestion
        fields = [
            'id', 'questionnaire', 'question_text', 'question_type',
            'options', 'is_required', 'order', 'help_text', 'scoring_weight'
        ]


class OfferQuestionnaireSerializer(serializers.ModelSerializer):
    questions = OfferQuestionSerializer(many=True, read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)

    class Meta:
        model = OfferQuestionnaire
        fields = [
            'id', 'service', 'service_name', 'title', 'description',
            'target_offer_name', 'is_active', 'questions', 'created_at'
        ]

