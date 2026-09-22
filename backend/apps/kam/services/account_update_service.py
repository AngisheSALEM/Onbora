from datetime import date
from typing import Dict, Any, Tuple
from enterprises.models import Enterprise
from reporting.utils import log_demo_event


def update_enterprise_account_info(enterprise: Enterprise, data: Dict[str, Any], user) -> Tuple[Enterprise, str]:
    """
    Met à jour les informations d'un compte entreprise par le KAM
    (décideurs, métriques, connectivité, CRM data, adresse).
    """
    # Mise à jour des contacts et décideurs
    if 'contact_name' in data:
        enterprise.contact_name = str(data['contact_name']).strip()
    if 'contact_role' in data:
        enterprise.contact_role = str(data['contact_role']).strip()
    if 'contact_phone' in data:
        enterprise.contact_phone = str(data['contact_phone']).strip()
    if 'contact_email' in data:
        enterprise.contact_email = str(data['contact_email']).strip()

    # Métriques d'entreprise
    if 'employee_count' in data:
        try:
            enterprise.employee_count = max(1, int(data['employee_count']))
        except (ValueError, TypeError):
            pass
    if 'site_count' in data:
        try:
            enterprise.site_count = max(1, int(data['site_count']))
        except (ValueError, TypeError):
            pass
    if 'annual_revenue' in data:
        try:
            enterprise.annual_revenue = max(0, float(data['annual_revenue']))
        except (ValueError, TypeError):
            pass

    # Concurrence et connectivité
    if 'current_connectivity' in data:
        enterprise.current_connectivity = str(data['current_connectivity']).strip()

    if any(key in data for key in ('current_operator', 'orange_contract_end_date', 'growth_project')):
        crm_data = dict(enterprise.existing_crm_data) if isinstance(enterprise.existing_crm_data, dict) else {}
        if 'current_operator' in data:
            current_operator = str(data['current_operator'] or '').strip()[:100]
            if current_operator:
                crm_data['current_operator'] = current_operator
            else:
                crm_data.pop('current_operator', None)
        if 'orange_contract_end_date' in data:
            raw_date = str(data['orange_contract_end_date'] or '').strip()
            if raw_date:
                try:
                    date.fromisoformat(raw_date)
                except ValueError:
                    raise ValueError("Date de fin du contrat Orange invalide.")
                crm_data['orange_contract_end_date'] = raw_date
            else:
                crm_data.pop('orange_contract_end_date', None)
        if 'growth_project' in data:
            project = str(data['growth_project'] or '').strip()[:255]
            if project:
                crm_data['growth_project'] = project
            else:
                crm_data.pop('growth_project', None)
        enterprise.existing_crm_data = crm_data

    # Adresse
    if 'address' in data:
        enterprise.address = str(data['address']).strip()
    if 'commune' in data:
        enterprise.commune = str(data['commune']).strip()
    if 'city' in data:
        enterprise.city = str(data['city']).strip()

    enterprise.save()

    log_demo_event(
        'KAM_ACCOUNT_INFO_UPDATED',
        f"Fiche client mise à jour par le KAM {user.username if user and hasattr(user, 'username') else 'system'} pour {enterprise.name} (Contact: {enterprise.contact_name}, Rôle: {enterprise.contact_role})",
        user=user if user and user.is_authenticated else None,
        metadata={
            "enterprise_id": enterprise.id,
            "contact_name": enterprise.contact_name,
            "contact_role": enterprise.contact_role,
        }
    )

    return enterprise, f"Fiche client de {enterprise.name} mise à jour avec succès."
