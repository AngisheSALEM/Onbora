"""Rules and factual preparation for KAM appointments."""

from datetime import date, timedelta

from django.utils import timezone

from kam.models import KamAppointment, KamVisitReport


PURPOSE_LABELS = dict(KamAppointment.VISIT_PURPOSES)


def _account_crm_details(enterprise):
    return enterprise.existing_crm_data if isinstance(enterprise.existing_crm_data, dict) else {}


def _orange_renewal_date(enterprise):
    raw_value = _account_crm_details(enterprise).get('orange_contract_end_date')
    try:
        return date.fromisoformat(raw_value) if isinstance(raw_value, str) else None
    except ValueError:
        return None


def suggest_visit_purpose(enterprise):
    """Use recorded account state; a visit count alone never advances a prospect."""
    completed_count = KamAppointment.objects.filter(
        enterprise=enterprise, status='COMPLETED'
    ).count()
    latest_report = KamVisitReport.objects.filter(enterprise=enterprise).order_by('-created_at').first()
    status = enterprise.conversion_status
    # The generic contract_end_date can belong to a competing operator.
    renewal_date = _orange_renewal_date(enterprise)
    growth_project = _account_crm_details(enterprise).get('growth_project')
    renewal_soon = bool(
        status == 'CONVERTED'
        and renewal_date
        and timezone.localdate() <= renewal_date <= timezone.localdate() + timedelta(days=120)
    )

    if renewal_soon:
        purpose = 'GROWTH'
        reason = 'Contrat Orange indiqué comme arrivant à échéance sous 120 jours.'
    elif status == 'CONVERTED' and growth_project:
        purpose = 'GROWTH'
        reason = 'Un projet de développement est renseigné sur ce compte.'
    elif status == 'CONVERTED':
        purpose = 'FOLLOW_UP'
        reason = 'Le compte est marqué comme signé dans Onbora.'
    elif status == 'IN_NEGOTIATION':
        purpose = 'QUALIFICATION'
        reason = 'Une négociation est en cours sur ce compte.'
    elif latest_report and latest_report.confirmed_needs:
        purpose = 'QUALIFICATION'
        reason = 'Des besoins ont été confirmés lors du dernier rendez-vous KAM.'
    else:
        purpose = 'DISCOVERY'
        reason = 'Aucun besoin qualifié ni contrat signé n’est enregistré.'

    return {
        'suggested_purpose': purpose,
        'suggested_purpose_label': PURPOSE_LABELS[purpose],
        'reason': reason,
        'needs_confirmation': status == 'LOST',
        'completed_kam_visits': completed_count,
        'prior_contact_recorded': bool(enterprise.is_visited and completed_count == 0),
        'relationship_label': 'Contrat signé' if status == 'CONVERTED' else (
            'Négociation en cours' if status == 'IN_NEGOTIATION' else 'Prospect'
        ),
    }


def build_appointment_preparation(appointment):
    """Return verifiable facts and questions for this appointment's saved purpose."""
    enterprise = appointment.enterprise
    cutoff = min(appointment.scheduled_at, timezone.now())
    previous_reports = KamVisitReport.objects.filter(
        enterprise=enterprise, created_at__lt=cutoff
    ).exclude(appointment=appointment).order_by('-created_at')
    last_report = previous_reports.first()

    def fact(label, value, source):
        return {'label': label, 'value': str(value), 'source': source} if value not in (None, '') else None

    account_facts = [
        fact('Secteur', enterprise.sector, 'Fiche entreprise'),
        fact('Implantations renseignées', enterprise.site_count if enterprise.site_count and enterprise.site_count > 1 else None, 'Fiche entreprise'),
        fact('Relation commerciale', 'Contrat signé' if enterprise.conversion_status == 'CONVERTED' else
             'Négociation en cours' if enterprise.conversion_status == 'IN_NEGOTIATION' else 'Prospect',
             'Statut du compte'),
        fact('Interlocuteur', appointment.contact_name, 'Rendez-vous'),
        fact('Fonction', appointment.contact_role, 'Rendez-vous'),
    ]
    account_facts = [item for item in account_facts if item]
    visit_facts = []
    if last_report:
        visit_facts.append(fact('Dernier échange KAM', last_report.created_at.strftime('%d/%m/%Y'), 'Rapport KAM'))
        visit_facts.append(fact('Synthèse précédente', last_report.executive_summary, 'Rapport KAM'))
        if last_report.actions_todo:
            visit_facts.append(fact('Prochaine action convenue', last_report.actions_todo[0], 'Rapport KAM'))

    purpose = appointment.visit_purpose
    if purpose == 'DISCOVERY':
        visit_facts.append(fact('Opérateur actuel renseigné',
                                _account_crm_details(enterprise).get('current_operator'), 'Fiche entreprise'))
        questions = [
            'Quels sont les enjeux télécoms ou IT prioritaires cette année ?',
            'Quels sites et quelles équipes sont concernés ?',
            'Qui participe à la décision et selon quel calendrier ?',
        ]
    elif purpose == 'QUALIFICATION':
        visit_facts.append(fact('Opérateur actuel renseigné',
                                _account_crm_details(enterprise).get('current_operator'), 'Fiche entreprise'))
        if last_report and last_report.confirmed_needs:
            visit_facts.append(fact('Besoins confirmés', ', '.join(map(str, last_report.confirmed_needs)), 'Rapport KAM'))
        if last_report and last_report.objections_raised:
            visit_facts.append(fact('Objections précédentes', ', '.join(map(str, last_report.objections_raised)), 'Rapport KAM'))
        if enterprise.budget_status and enterprise.budget_status != 'Non précisé':
            visit_facts.append(fact('Statut du budget', enterprise.budget_status, 'Fiche entreprise'))
        questions = [
            'Le besoin, le périmètre et le budget sont-ils confirmés ?',
            'Quels critères serviront à comparer les propositions ?',
            'Qui valide la solution et à quelle date ?',
        ]
    elif purpose == 'FOLLOW_UP':
        visit_facts.append(fact('Offre signée', enterprise.converted_offer, 'Fiche entreprise'))
        if enterprise.incident_count:
            visit_facts.append(fact('Incidents renseignés (90 jours)', enterprise.incident_count, 'Fiche entreprise'))
        questions = [
            'Les engagements du dernier échange ont-ils été tenus ?',
            'Quels services fonctionnent bien ou posent problème ?',
            'Quelles actions faut-il attribuer et dater après la revue ?',
        ]
    elif purpose == 'GROWTH':
        visit_facts.append(fact('Offre signée', enterprise.converted_offer, 'Fiche entreprise'))
        visit_facts.append(fact('Projet de développement indiqué',
                                _account_crm_details(enterprise).get('growth_project'), 'Fiche entreprise'))
        renewal_date = _orange_renewal_date(enterprise)
        if renewal_date:
            visit_facts.append(fact('Échéance indiquée du contrat Orange',
                                    renewal_date.strftime('%d/%m/%Y'), 'Données CRM'))
        questions = [
            'Quelle échéance contractuelle le client confirme-t-il ?',
            'Quels nouveaux sites, usages ou projets faut-il couvrir ?',
            'Quelles offres actuelles souhaite-t-il reconduire ou faire évoluer ?',
        ]
    else:
        questions = ['Quel est l’objectif principal de ce rendez-vous ?']

    return {
        'appointment_id': appointment.id,
        'enterprise_name': enterprise.name,
        'visit_purpose': purpose,
        'visit_purpose_label': PURPOSE_LABELS.get(purpose, 'Type non renseigné'),
        'purpose_reason': appointment.purpose_reason,
        'objective': appointment.objective,
        'account_facts': account_facts,
        'visit_facts': [item for item in visit_facts if item],
        'questions_to_confirm': questions,
        'has_previous_report': bool(last_report),
    }
