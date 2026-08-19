from typing import List, Dict, Any, Optional
from kam.models import ProspectDossier
from kam.domain.exceptions import DossierNotFoundException
from kam.application.dtos import ProspectDossierDTO, ProvisionRequestDTO
from reporting.utils import log_demo_event
from shared.application.use_case import BaseUseCase


class ManageProvisioningUseCase(BaseUseCase[tuple[int, str, str, Any], ProspectDossier]):
    def execute(self, params: tuple[int, str, str, Any]) -> ProspectDossier:
        dossier_id, service, action, user = params
        try:
            dossier = ProspectDossier.objects.get(pk=dossier_id)
        except ProspectDossier.DoesNotExist:
            raise DossierNotFoundException(dossier_id)

        if not isinstance(dossier.raw_conversation_data, dict):
            dossier.raw_conversation_data = {}

        if 'provisioning' not in dossier.raw_conversation_data:
            dossier.raw_conversation_data['provisioning'] = {}

        prov = dossier.raw_conversation_data['provisioning']

        company_name = "l'entreprise"
        if dossier.source == ProspectDossier.INBOUND_CONVERSATION and dossier.conversation:
            profile = dossier.conversation.extracted_profile or {}
            company_name = profile.get('company_name') or "Client Inbound"
        elif dossier.source == ProspectDossier.OUTBOUND_VISIT and dossier.visit_report:
            company_name = dossier.visit_report.preparation.enterprise.name

        service_labels = {
            'fibre': 'Fibre Optique Pro',
            'm365': 'Microsoft 365 Cloud',
            'firewall': 'Pare-feu Centralisé & EDR'
        }
        label = service_labels.get(service, service)

        if action == 'start':
            prov[service] = 'PROVISIONING'
            log_demo_event(
                'PROVISIONING_STARTED',
                f"Provisioning {label} initialisé pour {company_name}",
                user=user if (user and user.is_authenticated) else None,
                metadata={"dossier_id": dossier.id, "service": service}
            )
        elif action == 'complete':
            prov[service] = 'COMPLETED'
            log_demo_event(
                'PROVISIONING_COMPLETED',
                f"Provisioning {label} activé avec succès pour {company_name}",
                user=user if (user and user.is_authenticated) else None,
                metadata={"dossier_id": dossier.id, "service": service}
            )
        else:
            prov[service] = 'PENDING'

        dossier.save()
        return dossier
