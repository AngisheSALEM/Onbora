from django.contrib import admin
from .models import BusinessTwin

@admin.register(BusinessTwin)
class BusinessTwinAdmin(admin.ModelAdmin):
    list_display = ['id', 'prospect_dossier', 'created_at']
    search_fields = ['prospect_dossier__id']
