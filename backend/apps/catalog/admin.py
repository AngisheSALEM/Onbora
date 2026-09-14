from django.contrib import admin
from .models import ServiceCatalog, OfferQuestionnaire, OfferQuestion

class OfferQuestionInline(admin.TabularInline):
    model = OfferQuestion
    extra = 2
    fields = ['order', 'question_text', 'question_type', 'options', 'is_required', 'scoring_weight']


@admin.register(OfferQuestionnaire)
class OfferQuestionnaireAdmin(admin.ModelAdmin):
    list_display = ['title', 'target_offer_name', 'service', 'is_active', 'created_at']
    list_filter = ['is_active', 'service']
    search_fields = ['title', 'target_offer_name', 'description']
    inlines = [OfferQuestionInline]


@admin.register(OfferQuestion)
class OfferQuestionAdmin(admin.ModelAdmin):
    list_display = ['order', 'question_text', 'questionnaire', 'question_type', 'is_required', 'scoring_weight']
    list_filter = ['question_type', 'is_required', 'questionnaire']
    search_fields = ['question_text', 'help_text']


@admin.register(ServiceCatalog)
class ServiceCatalogAdmin(admin.ModelAdmin):
    list_display = ['name', 'category']
    list_filter = ['category']
    search_fields = ['name', 'description']

