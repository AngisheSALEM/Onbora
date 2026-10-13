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


def _generate_strategic_questions(appointment, enterprise, last_report, purpose):
    """
    Génère 3 questions stratégiques d'entretien ultra-ciblées,
    directement ancrées dans ce qu'on sait du client (besoins qualifiés,
    engagements/actions convenues, opérateur en place, objections, interlocuteur).
    Évite formellement les questions génériques passe-partout.
    """
    questions = []
    contact_label = appointment.contact_name or "l'interlocuteur"
    role_label = appointment.contact_role or ""

    # 1. Si un rapport précédent existe (suivi d'actions, besoins confirmés, objections)
    if last_report:
        # A. Suivi de l'engagement / action convenue précédente
        if last_report.actions_todo and last_report.actions_todo[0]:
            action_text = str(last_report.actions_todo[0]).strip().lstrip('-*•123456789. ')
            questions.append(
                f"Concernant l'action convenue lors du dernier échange (« {action_text} ») : "
                f"quel est l'état d'avancement pour arrêter le périmètre technique côté {enterprise.name} ?"
            )

        # B. Approfondissement des besoins confirmés
        if last_report.confirmed_needs:
            needs_list = [str(n).strip() for n in last_report.confirmed_needs if n]
            if needs_list:
                needs_summary = ", ".join(needs_list[:2])
                questions.append(
                    f"Sur les besoins validés ({needs_summary}) : "
                    f"quels sont vos impératifs de dimensionnement, de débit garanti et la date cible souhaitée de mise en service ?"
                )

        # C. Traitement des objections ou gouvernance décisionnelle
        if last_report.objections_raised:
            obj_list = [str(o).strip() for o in last_report.objections_raised if o]
            if obj_list:
                questions.append(
                    f"Concernant le point de vigilance soulevé (« {obj_list[0]} ») : "
                    f"quelles garanties de service (SLA) ou facilités budgétaires permettront de lever ce point ?"
                )
        elif enterprise.budget_status and enterprise.budget_status != 'Non précisé':
            questions.append(
                f"Le statut budgétaire étant « {enterprise.budget_status} » : "
                f"qui valide l'enveloppe finale aux côtés de {contact_label} et selon quel calendrier d'arbitrage ?"
            )
        else:
            if role_label:
                questions.append(
                    f"En tant que {role_label}, qui sont les autres décideurs (Direction Générale, DSI, DAF) "
                    f"associés à la signature du bon de commande ?"
                )
            else:
                questions.append(
                    f"Qui valide la décision finale aux côtés de {contact_label} et quelle est l'échéance contractuelle visée ?"
                )

    # 2. Complément ou cas sans rapport précédent selon le motif de visite (DISCOVERY, QUALIFICATION, FOLLOW_UP, GROWTH)
    current_op = _account_crm_details(enterprise).get('current_operator')
    growth_proj = _account_crm_details(enterprise).get('growth_project')

    if purpose == 'DISCOVERY':
        if len(questions) < 3 and current_op:
            questions.append(
                f"Quelle est votre échéance contractuelle chez {current_op} et quels sont vos principaux motifs de consultation (latence, pannes, coût, support) ?"
            )
        if len(questions) < 3 and enterprise.site_count and enterprise.site_count > 1:
            questions.append(
                f"Avec {enterprise.site_count} sites à interconnecter, quelle est votre priorité pour centraliser et sécuriser vos liaisons inter-agences ?"
            )
        elif len(questions) < 3 and enterprise.sector:
            questions.append(
                f"Pour les activités de {enterprise.name} dans le secteur {enterprise.sector}, quelles sont les applications critiques dont la coupure paralyserait l'exploitation ?"
            )
        if len(questions) < 3:
            questions.append(
                f"Quels sont les projets d'infrastructure ou de transformation numérique prioritaires pour {enterprise.name} sur les 6 à 12 prochains mois ?"
            )

    elif purpose == 'QUALIFICATION':
        if len(questions) < 3 and current_op:
            questions.append(
                f"Quelles sont les conditions de transition ou de résiliation vis-à-vis de votre opérateur actuel ({current_op}) ?"
            )
        if len(questions) < 3:
            questions.append(
                f"Quels sont les critères techniques et économiques déterminants qui feront retenir la proposition d'Orange Business pour {enterprise.name} ?"
            )
        if len(questions) < 3:
            questions.append(
                f"Quel est le calendrier de déploiement souhaité et la date de démarrage effective envisagée avec {contact_label} ?"
            )

    elif purpose == 'FOLLOW_UP':
        offer = enterprise.converted_offer or 'en cours'
        if len(questions) < 3:
            questions.append(
                f"Concernant votre contrat ({offer}) chez Orange : quel est le retour d'expérience des équipes sur la qualité de débit et la stabilité ?"
            )
        if len(questions) < 3 and enterprise.incident_count and enterprise.incident_count > 0:
            questions.append(
                f"Suite aux {enterprise.incident_count} incidents signalés ces 90 derniers jours : les mesures de résolution apportées par nos équipes techniques sont-elles satisfaisantes ?"
            )
        if len(questions) < 3:
            questions.append(
                f"Quels nouveaux usages ou hausses d'effectif constatés nécessitent une montée en débit ou des options de sécurité complémentaires ?"
            )

    elif purpose == 'GROWTH':
        renewal_dt = _orange_renewal_date(enterprise)
        if len(questions) < 3 and renewal_dt:
            questions.append(
                f"Votre contrat Orange arrivant à échéance le {renewal_dt.strftime('%d/%m/%Y')} : quelles évolutions de services (débit, Cloud, cybersécurité) souhaitez-vous inclure dans le renouvellement ?"
            )
        elif len(questions) < 3 and growth_proj:
            questions.append(
                f"Concernant votre projet de développement (« {growth_proj} ») : quel dimensionnement réseau ou licences Cloud devez-vous déployer ?"
            )
        if len(questions) < 3 and enterprise.site_count and enterprise.site_count > 1:
            questions.append(
                f"Quels nouveaux sites ou filiales de {enterprise.name} doivent être raccordés au réseau d'entreprise dans les prochains mois ?"
            )
        if len(questions) < 3:
            questions.append(
                f"Quelles nouvelles solutions (Microsoft 365, sauvegarde Cloud, téléphonie IP) souhaitez-vous intégrer à votre socle existant ?"
            )

    # Compléter au besoin pour toujours avoir 3 questions ciblées
    fallback_pool = [
        f"Quels sont les indicateurs clés de performance (SLA, disponibilité, support dédié) que vous exigez d'Orange Business pour {enterprise.name} ?",
        f"Quel est le calendrier cible et quelles sont les étapes indispensables d'ici la signature du devis ?",
        f"Y a-t-il d'autres sites ou filiales dont les besoins de connectivité doivent être mutualisés ?",
    ]
    for fb in fallback_pool:
        if len(questions) >= 3:
            break
        if fb not in questions:
            questions.append(fb)

    return questions[:3]


def build_appointment_preparation(appointment):
    """Return verifiable facts and questions for this appointment's saved purpose."""
    enterprise = appointment.enterprise
    # Recherche du rapport le plus récent pour cette entreprise afin de capter l'historique réel
    last_report = KamVisitReport.objects.filter(enterprise=enterprise).order_by('-created_at').first()

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
        if last_report.confirmed_needs:
            visit_facts.append(fact('Besoins confirmés', ', '.join(map(str, last_report.confirmed_needs)), 'Rapport KAM'))
        if last_report.objections_raised:
            visit_facts.append(fact('Objections précédentes', ', '.join(map(str, last_report.objections_raised)), 'Rapport KAM'))

    purpose = appointment.visit_purpose
    if purpose in ('DISCOVERY', 'QUALIFICATION'):
        op = _account_crm_details(enterprise).get('current_operator')
        if op:
            visit_facts.append(fact('Opérateur actuel renseigné', op, 'Fiche entreprise'))
        if enterprise.budget_status and enterprise.budget_status != 'Non précisé':
            visit_facts.append(fact('Statut du budget', enterprise.budget_status, 'Fiche entreprise'))
    elif purpose == 'FOLLOW_UP':
        if enterprise.converted_offer:
            visit_facts.append(fact('Offre signée', enterprise.converted_offer, 'Fiche entreprise'))
        if enterprise.incident_count:
            visit_facts.append(fact('Incidents renseignés (90 jours)', enterprise.incident_count, 'Fiche entreprise'))
    elif purpose == 'GROWTH':
        if enterprise.converted_offer:
            visit_facts.append(fact('Offre signée', enterprise.converted_offer, 'Fiche entreprise'))
        growth_p = _account_crm_details(enterprise).get('growth_project')
        if growth_p:
            visit_facts.append(fact('Projet de développement indiqué', growth_p, 'Fiche entreprise'))
        renewal_date = _orange_renewal_date(enterprise)
        if renewal_date:
            visit_facts.append(fact('Échéance indiquée du contrat Orange', renewal_date.strftime('%d/%m/%Y'), 'Données CRM'))

    questions = _generate_strategic_questions(appointment, enterprise, last_report, purpose)

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
