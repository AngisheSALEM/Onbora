from django.contrib import admin
from .models import Enterprise, VisitPreparation, VisitReport, ScraperCredential

@admin.register(Enterprise)
class EnterpriseAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'sector', 'location', 'created_at']
    search_fields = ['name', 'sector']

@admin.register(VisitPreparation)
class VisitPreparationAdmin(admin.ModelAdmin):
    list_display = ['id', 'enterprise', 'salesperson', 'meeting_objective', 'scheduled_date']
    list_filter = ['salesperson']
    search_fields = ['enterprise__name']

@admin.register(VisitReport)
class VisitReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'preparation', 'created_at']
    search_fields = ['preparation__enterprise__name']

@admin.register(ScraperCredential)
class ScraperCredentialAdmin(admin.ModelAdmin):
    list_display = ['id', 'platform', 'updated_at']
    list_filter = ['platform']
