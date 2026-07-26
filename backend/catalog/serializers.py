from rest_framework import serializers
from .models import ServiceCatalog

class ServiceCatalogSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = ServiceCatalog
        fields = ['id', 'name', 'category', 'category_display', 'description', 'benefits', 'technical_requirements']
