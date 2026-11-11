"""Référentiel commun au parc installé et au comparatif sectoriel."""
from rest_framework import serializers
from sales.models import EnterpriseInstalledOffer
from .enterprise_comparison_service import EnterpriseComparisonService


def sector_options(enterprise):
    policy = EnterpriseComparisonService.get_sector_policy(enterprise.sector)
    return [{
        'id': p['id'], 'name': p['label'], 'category': p.get('category', 'CONNECTIVITY'),
        'description': p.get('description', ''),
    } for p in policy.get('pillars', [])]


class InstalledOfferSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='installed_offer_name', read_only=True)
    provider_label = serializers.CharField(source='get_provider_display', read_only=True)
    contract_status_label = serializers.CharField(source='get_contract_status_display', read_only=True)

    class Meta:
        model = EnterpriseInstalledOffer
        fields = [
            'id', 'installed_offer_name', 'name', 'sector_pillar_id', 'category', 'provider',
            'provider_label', 'contract_status', 'contract_status_label', 'installation_date',
            'contract_end_date', 'monthly_cost_mrr', 'bandwidth_mbps', 'active_licenses_count',
            'unresolved_tickets_count', 'technical_equipment', 'created_at', 'is_demo',
        ]
        read_only_fields = ['is_demo']
        extra_kwargs = {
            'bandwidth_mbps': {'min_value': 0}, 'monthly_cost_mrr': {'min_value': 0},
            'active_licenses_count': {'min_value': 1}, 'unresolved_tickets_count': {'min_value': 0},
        }

    def validate(self, values):
        pillar_id = values.get('sector_pillar_id')
        if pillar_id:
            options = {p['id']: p for p in sector_options(self.context['enterprise'])}
            if pillar_id not in options:
                raise serializers.ValidationError({'detail': 'Choisissez une solution du secteur de ce compte.'})
            values['category'] = options[pillar_id]['category']
        return values
