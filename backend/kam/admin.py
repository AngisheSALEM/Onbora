from django.contrib import admin
from .models import ProspectDossier

@admin.register(ProspectDossier)
class ProspectDossierAdmin(admin.ModelAdmin):
    list_display = ['id', 'source', 'status', 'kam', 'created_at']
    list_filter = ['status', 'source', 'kam']
    list_editable = ['kam', 'status']
    search_fields = ['raw_conversation_data']
