from rest_framework import serializers
from .models import ProspectDossier
from accounts.serializers import UserSerializer
from twin.models import BusinessTwin

class BusinessTwinSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessTwin
        fields = ['id', 'current_state', 'proposed_state', 'recommended_services', 'roadmap', 'created_at']

class ProspectDossierSerializer(serializers.ModelSerializer):
    kam_details = UserSerializer(source='kam', read_only=True)
    company_name = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    details_summary = serializers.SerializerMethodField()
    has_twin = serializers.SerializerMethodField()

    class Meta:
        model = ProspectDossier
        fields = [
            'id', 'source', 'conversation', 'visit_report', 'kam', 'kam_details',
            'status', 'raw_qualification_data', 'internal_kam_notes',
            'company_name', 'contact_name', 'email', 'phone', 'details_summary',
            'has_twin', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'source', 'conversation', 'visit_report', 'created_at', 'updated_at']

    def get_company_name(self, obj):
        if obj.source == ProspectDossier.INBOUND_CONVERSATION and obj.conversation:
            # Fallback to extracted profile or user profile
            profile = obj.conversation.extracted_profile or {}
            client = obj.conversation.client
            return profile.get('company_name') or (client.company_name if client else None) or "Entreprise Inconnue (Inbound)"
        elif obj.source == ProspectDossier.OUTBOUND_VISIT and obj.visit_report:
            return obj.visit_report.preparation.enterprise.name
        return "Entreprise Inconnue"

    def get_contact_name(self, obj):
        if obj.source == ProspectDossier.INBOUND_CONVERSATION and obj.conversation:
            client = obj.conversation.client
            if client:
                return f"{client.first_name} {client.last_name}".strip() or client.username
            return "Visiteur Anonyme"
        elif obj.source == ProspectDossier.OUTBOUND_VISIT and obj.visit_report:
            prep = obj.visit_report.preparation
            return f"Commercial: {prep.salesperson.first_name} {prep.salesperson.last_name}".strip() or prep.salesperson.username
        return "Contact Inconnu"

    def get_email(self, obj):
        if obj.source == ProspectDossier.INBOUND_CONVERSATION and obj.conversation and obj.conversation.client:
            return obj.conversation.client.email
        return None

    def get_phone(self, obj):
        if obj.source == ProspectDossier.INBOUND_CONVERSATION and obj.conversation:
            profile = obj.conversation.extracted_profile or {}
            client = obj.conversation.client
            return profile.get('phone') or (client.phone if client else None)
        return None

    def get_details_summary(self, obj):
        if obj.source == ProspectDossier.INBOUND_CONVERSATION and obj.conversation:
            profile = obj.conversation.extracted_profile or {}
            problems = profile.get('current_problems', [])
            return f"Besoins qualifiés : {', '.join(problems)}" if problems else "Aucun problème spécifique qualifié."
        elif obj.source == ProspectDossier.OUTBOUND_VISIT and obj.visit_report:
            return obj.visit_report.executive_summary
        return ""

    def get_has_twin(self, obj):
        return hasattr(obj, 'business_twin')
