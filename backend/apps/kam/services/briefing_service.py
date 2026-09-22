"""
KAM Strategic Briefing Service
==============================
Provides structured serialization of enterprise CRM records into rich StrategicVisit
briefings for Key Account Managers (KAMs) according to Clean Architecture guidelines.
"""

from django.utils import timezone
from sales.models import Enterprise


def _extract_pains(ent: Enterprise) -> list:
    pains = []
    if ent.ai_hypotheses and isinstance(ent.ai_hypotheses, list):
        for h in ent.ai_hypotheses:
            if isinstance(h, dict):
                pains.append({
                    "hypothesis": h.get("hypothesis") or h.get("title") or "Besoin d'interconnexion réseau haut débit sécurisée",
                    "trigger_evidence": h.get("evidence") or h.get("context_evidence") or f"Activité multi-sites ({ent.site_count} agences) sur lien {ent.current_operator}.",
                    "discovery_angle": h.get("angle") or h.get("discovery_angle") or "Audit de latence et de bande passante aux heures de pointe"
                })
            elif isinstance(h, str):
                pains.append({
                    "hypothesis": h,
                    "trigger_evidence": f"Contrat d'infrastructure actuellement opéré par {ent.current_operator}.",
                    "discovery_angle": "Comment gérez-vous la continuité d'activité lors des coupures de fibre ?"
                })
    if not pains:
        pains = [
            {
                "hypothesis": f"Instabilité et saturation du lien {ent.current_connectivity} opéré par {ent.current_operator}",
                "trigger_evidence": f"Périmètre de {ent.site_count} agences nécessitant une haute disponibilité (99.9%).",
                "discovery_angle": "Quel est l'impact financier d'une interruption de service de 2 heures sur vos opérations ?"
            },
            {
                "hypothesis": "Besoin de souveraineté des données, cybersécurité et téléphonie unifiée Cloud",
                "trigger_evidence": f"Effectif de {ent.employee_count} collaborateurs avec interconnexion du siège.",
                "discovery_angle": "Vos applications de gestion (ERP, messagerie) sont-elles hébergées en local ou dans un Cloud sécurisé ?"
            }
        ]
    return pains


def _extract_opportunities(ent: Enterprise, revenue_val: float) -> list:
    return [
        {
            "solution_category": ent.recommended_solution or "Fibre Dédiée Très Haut Débit + SD-WAN Managé",
            "value_proposition": ent.ai_tailored_pitch or f"Lien optique symétrique avec bascule automatique 4G/Satellite sans interruption pour {ent.name}.",
            "potential_mrr": round(revenue_val * 0.006, 2)
        }
    ]


def _build_stakeholders(ent: Enterprise, primary_contact_name: str, primary_contact_role: str) -> list:
    return [
        {
            "id": f"stk-{ent.id}-1",
            "full_name": primary_contact_name,
            "job_title": primary_contact_role,
            "role_in_decision": "ECONOMIC_BUYER",
            "influence_level": "HIGH",
            "stance_towards_orange": "POSITIVE" if ent.conversion_status == 'CONVERTED' else "NEUTRAL",
            "last_contacted_date": ent.assigned_at.strftime('%Y-%m-%d') if ent.assigned_at else None,
            "last_contacted_by": ent.assigned_kam.get_full_name() if ent.assigned_kam else "KAM Office",
            "key_notes": f"Décideur joignable au {ent.contact_phone or 'N/A'} ({ent.contact_email or 'email non renseigné'}). Priorité stratégique sur la continuité de service et la réactivité du support."
        },
        {
            "id": f"stk-{ent.id}-2",
            "full_name": "Directeur des Systèmes d'Information (DSI)",
            "job_title": "Responsable Infrastructure & IT",
            "role_in_decision": "TECHNICAL_BUYER",
            "influence_level": "MEDIUM",
            "stance_towards_orange": "POSITIVE",
            "last_contacted_date": None,
            "last_contacted_by": None,
            "key_notes": "Sensible aux SLAs de disponibilité réseau (99.9%) et à la sécurité périmétrique."
        }
    ]


def _build_briefing_payload(ent: Enterprise, rev_str: str, wallet_share: float, mrr: float, revenue_val: float, primary_contact_name: str, primary_contact_role: str, pains: list, opportunities: list) -> dict:
    return {
        "account_id": str(ent.id),
        "account_name": ent.name,
        "industry": ent.sector or "Services & Entreprise",
        "growth_stage": "CONGLOMERATE" if ent.segment == 'GRAND_COMPTE' else "SCALING",
        "firmographics": {
            "headcount": ent.employee_count or 25,
            "estimated_annual_revenue": rev_str,
            "locations_count": ent.site_count or 1,
            "countries": ["RDC"],
            "business_model_summary": f"Acteur de référence ({ent.get_segment_display()}) basé à {ent.commune or ent.city}. {ent.employee_count} collaborateurs répartis sur {ent.site_count} implantations raccordées."
        },
        "orange_relationship": {
            "client_status": "PARTIAL_CLIENT" if ent.conversion_status == 'CONVERTED' else "NON_CLIENT",
            "wallet_share_percentage": wallet_share,
            "mrr_current": mrr,
            "total_telecom_cloud_budget": float(ent.telecom_budget_monthly * 12) if ent.telecom_budget_monthly else round(revenue_val * 0.015, 2),
            "active_contracts": [
                {
                    "service_name": f"Lien {ent.current_connectivity or 'Fibre'} ({ent.current_operator or 'Opérateur tiers'})",
                    "end_date": ent.contract_end_date.strftime('%d/%m/%Y') if ent.contract_end_date else "31/12/2026",
                    "is_renewal_imminent": bool(ent.contract_end_date and (ent.contract_end_date - timezone.now().date()).days <= 120),
                    "sla_status": "CRITICAL" if (ent.incident_count or 0) >= 4 else ("WARNING" if ent.current_operator != 'Orange' else "HEALTHY"),
                    "monthly_value": float(ent.telecom_budget_monthly) if ent.telecom_budget_monthly else round(mrr * 0.8, 2)
                }
            ],
            "recent_incidents_count_30d": ent.incident_count if ent.incident_count is not None else (1 if ent.current_operator != 'Orange' else 0),
            "critical_incidents_summary": f"{ent.incident_count} incident(s) de coupure ou de saturation relevés sur le lien {ent.current_operator}." if (ent.incident_count or 0) > 0 else f"Lien d'accès {ent.current_operator} sans dégradation majeure.",
            "last_interactions_summary": [
                f"Compte affecté au portefeuille KAM le {ent.assigned_at.strftime('%d/%m/%Y') if ent.assigned_at else 'récemment'}."
            ],
            "open_commitments": []
        },
        "stakeholders_mapping": _build_stakeholders(ent, primary_contact_name, primary_contact_role),
        "missing_stakeholders_alert": ["Responsable Achats / DAF non encore audité"] if ent.conversion_status != 'CONVERTED' else [],
        "trigger_signals": [
            {
                "id": f"sig-{ent.id}-1",
                "category": "EXPANSION",
                "title": f"Plan de modernisation réseau chez {ent.name}",
                "description": f"Audit de migration d'infrastructure télécoms actuellement sous contrat {ent.current_operator}.",
                "source": "CRM Onbora & Intelligence Télécoms",
                "date": timezone.now().strftime('%d/%m/%Y'),
                "is_urgent": True if ent.conversion_status == 'PROSPECT' else False
            }
        ],
        "technical_environment": {
            "current_competitors": [ent.current_operator] if ent.current_operator else ["Opérateur tiers"],
            "installed_cloud_telecom_stack": [ent.current_connectivity or "Fibre Dédiée", "Réseau Local LAN", "Microsoft 365"],
            "known_constraints": ["Disponibilité garantie 99.8%", "Facturation en USD"],
            "cybersecurity_compliance_needs": ["Protection anti-DDoS", "Conformité ARPTC RDC"]
        },
        "ai_hypotheses_and_playbook": {
            "pain_hypotheses": pains,
            "orange_opportunities": opportunities
        },
        "visit_strategy": {
            "primary_objective": f"Convertir le raccordement télécoms de {ent.name} vers l'infrastructure Onbora",
            "ideal_outcome": "Validation de la proposition commerciale et signature du bon de commande.",
            "suggested_agenda": [
                f"1. Diagnostic des incidents sur le lien {ent.current_operator} actuel (10 min)",
                f"2. Démonstration de la solution {ent.recommended_solution or 'Fibre Dédiée Pro'} (15 min)",
                "3. Chiffrage budgétaire et planification du raccordement (15 min)",
                "4. Accord et contractualisation (5 min)"
            ],
            "traps_to_avoid": [
                f"Ne pas dénigrer {ent.current_operator} : insister sur notre engagement de rétablissement en moins de 2 heures.",
                "Obtenir la validation du DAF avant d'arrêter l'architecture technique finale."
            ]
        }
    }


def serialize_enterprise_to_kam_visit(ent: Enterprise) -> dict:
    """
    Transforme une instance d'Enterprise de la base SQLite en objet StrategicVisit
    richement typé pour le desk opérationnel KAM (/kam).
    """
    dot_color = 'green' if ent.conversion_status == 'CONVERTED' else ('blue' if ent.conversion_status == 'IN_NEGOTIATION' else 'orange')
    revenue_val = float(ent.annual_revenue or 0)
    converted_amt = float(ent.converted_amount or 0)

    if converted_amt > 0:
        mrr = round(converted_amt / 12, 2)
        wallet_share = 100.0 if ent.conversion_status == 'CONVERTED' else 50.0
    else:
        mrr = round(revenue_val * 0.004, 2)
        wallet_share = 30.0 if ent.current_operator == 'Orange' else 0.0

    if revenue_val >= 1_000_000:
        rev_str = f"{revenue_val / 1_000_000:.1f}M $ USD"
    else:
        rev_str = f"{int(revenue_val):,} $ USD".replace(',', ' ')

    primary_contact_name = ent.contact_name or "Direction Générale"
    primary_contact_role = ent.contact_role or "Décideur Exécutif"

    pains = _extract_pains(ent)
    opportunities = _extract_opportunities(ent, revenue_val)
    location_str = f"{ent.commune or ent.city}, {ent.address}" if ent.address else (ent.commune or ent.city or "Kinshasa (Gombe)")

    return {
        "id": f"account-{ent.id}",
        "account_id": str(ent.id),
        "account_name": ent.name,
        "contact_name": ent.contact_name or "",
        "contact_role": ent.contact_role or "",
        "contact_phone": ent.contact_phone or "",
        "contact_email": ent.contact_email or "",
        "current_operator": (ent.existing_crm_data or {}).get('current_operator', '') if isinstance(ent.existing_crm_data, dict) else '',
        "current_connectivity": ent.current_connectivity or '',
        "orange_contract_end_date": (ent.existing_crm_data or {}).get('orange_contract_end_date', '') if isinstance(ent.existing_crm_data, dict) else '',
        "growth_project": (ent.existing_crm_data or {}).get('growth_project', '') if isinstance(ent.existing_crm_data, dict) else '',
        "crm_id": ent.crm_id or f"CRM-CD-{ent.id:04d}",
        "meeting_title": f"Revue Stratégique C-Level — {ent.name}",
        "meeting_time": "10:30",
        "meeting_date": ent.assigned_at.strftime('%Y-%m-%d') if ent.assigned_at else timezone.now().strftime('%Y-%m-%d'),
        "duration_minutes": 45,
        "location": location_str,
        "dot_color": dot_color,
        "status_label": ent.get_conversion_status_display(),
        "conversion_status": ent.conversion_status,
        "converted_amount": converted_amt,
        "converted_offer": ent.converted_offer or "",
        "conversion_notes": ent.conversion_notes or "",
        "is_prepared": True,
        "preparation_time_minutes": 15,
        "golden_rule": f"Ne jamais aborder le prix avant d'avoir validé l'inadéquation du lien {ent.current_operator} actuel.",
        "debrief_completed": ent.conversion_status in ['CONVERTED', 'IN_NEGOTIATION'],
        "briefing": _build_briefing_payload(
            ent, rev_str, wallet_share, mrr, revenue_val, primary_contact_name, primary_contact_role, pains, opportunities
        )
    }


def build_dossier_export_html(dossier, company_name: str, contact_name: str, source_label: str, profile_data: dict) -> str:
    """Helper to assemble the Dossier Client HTML export."""
    from twin.models import BusinessTwin

    current_problems = profile_data.get('current_problems', [])
    current_tools = profile_data.get('current_tools', [])
    
    problems_html = "".join([f'<span class="badge badge-danger">{prob}</span>' for prob in current_problems])
    tools_html = "".join([f'<span class="badge badge-neutral">{tool}</span>' for tool in current_tools])

    twin_html = ""
    try:
        twin = BusinessTwin.objects.get(prospect_dossier=dossier)
        current_items = "".join([f"<li>• {item}</li>" for item in (twin.current_state or [])])
        proposed_items = "".join([f"<li>✓ {item}</li>" for item in (twin.proposed_state or [])])
        
        services_items = "".join([
            f"""<div style="margin-bottom: 12px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 13px;">
                    <span>{s.get('name')}</span>
                    <span class="badge badge-success">{s.get('priority')}</span>
                </div>
                <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b;">{s.get('reasoning')}</p>
            </div>"""
            for s in (twin.recommended_services or [])
        ])
            
        roadmap_items = "".join([
            f"""<div class="timeline-item">
                <p class="timeline-title">Étape {idx+1}</p>
                <p class="timeline-desc">{step}</p>
            </div>"""
            for idx, step in enumerate(twin.roadmap or [])
        ])
            
        twin_html = f"""
        <div class="section">
            <h3 class="section-title">Diagnostic d'Architecture Cible</h3>
            <div class="grid">
                <div class="card" style="border-color: #cbd5e1; background-color: #f8fafc;">
                    <p class="card-title" style="color: #64748b;">Situation Initiale (Avant)</p>
                    <ul class="list-unstyled">
                        {current_items}
                    </ul>
                </div>
                <div class="card" style="border-color: #fed7aa; background-color: #fff7ed;">
                    <p class="card-title" style="color: #ea580c;">Situation Proposée (Après)</p>
                    <ul class="list-unstyled">
                        {proposed_items}
                    </ul>
                </div>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Services MSP Préconisés</h3>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                {services_items}
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Roadmap de déploiement</h3>
            <div class="timeline">
                {roadmap_items}
            </div>
        </div>
        """
    except BusinessTwin.DoesNotExist:
        twin_html = """
        <div class="section">
            <h3 class="section-title">Diagnostic d'Architecture Cible</h3>
            <div class="card">
                <p style="margin: 0; color: #64748b; font-size: 13px; font-style: italic;">Aucun Diagnostic d'Architecture Cible n'a été généré pour ce dossier.</p>
            </div>
        </div>
        """

    return f"""
    <h2 class="document-title">DOSSIER PROSPECT & SUIVI CLIENT</h2>
    
    <div class="section">
        <h3 class="section-title">Informations Administratives</h3>
        <div class="card">
            <ul class="list-unstyled">
                <li><strong>Nom de l'entreprise :</strong> {company_name}</li>
                <li><strong>Contact :</strong> {contact_name}</li>
                <li><strong>Statut d'intégration :</strong> <span class="badge badge-neutral">{dossier.status}</span></li>
                <li><strong>Origine :</strong> {source_label}</li>
                <li><strong>Date de création :</strong> {dossier.created_at.strftime('%d/%m/%Y %H:%M')}</li>
                <li><strong>Conseiller KAM affecté :</strong> {f"{dossier.kam.first_name} {dossier.kam.last_name}" if (dossier.kam and dossier.kam.first_name) else 'Non assigné'}</li>
            </ul>
        </div>
    </div>

    <div class="section">
        <h3 class="section-title">Notes Internes du Conseiller</h3>
        <div class="card" style="background-color: #fef3c7; border-color: #fde68a;">
            <p style="margin: 0; font-size: 13px; white-space: pre-wrap; font-weight: 500;">{dossier.internal_kam_notes or 'Aucune note interne saisie pour le moment.'}</p>
        </div>
    </div>

    <div class="section">
        <h3 class="section-title">Synthèse de conversation</h3>
        <div class="grid">
            <div class="card">
                <p class="card-title">Secteur & Taille</p>
                <ul class="list-unstyled">
                    <li><strong>Secteur :</strong> {profile_data.get('sector', 'Non qualifié')}</li>
                    <li><strong>Taille :</strong> {profile_data.get('company_size_estimate', 'Non qualifié')}</li>
                    <li><strong>Sites géographiques :</strong> {profile_data.get('locations_count', 1)} site(s)</li>
                </ul>
            </div>
            <div class="card">
                <p class="card-title">Problèmes & Outils</p>
                <div style="margin-bottom: 8px;">
                    <span style="font-size: 11px; font-weight: bold; color: #64748b; display: block; margin-bottom: 4px;">Dysfonctionnements :</span>
                    {problems_html if problems_html else '<span style="font-size: 11px; color: #94a3b8; font-style: italic;">Aucun problème</span>'}
                </div>
                <div>
                    <span style="font-size: 11px; font-weight: bold; color: #64748b; display: block; margin-bottom: 4px;">Outils actuels :</span>
                    {tools_html if tools_html else '<span style="font-size: 11px; color: #94a3b8; font-style: italic;">Aucun outil</span>'}
                </div>
            </div>
        </div>
    </div>

    {twin_html}
    """


def persist_meeting_report(appointment, user, transcript, audio_file_path, conversion_status_val,
                           executive_summary, confirmed_needs, objections_raised, follow_up_email, bant_scores,
                           actions_todo=None):
    """Persists KamVisitReport and updates appointment and enterprise."""
    import logging
    from django.utils import timezone
    from sales.models import Enterprise
    from kam.models import KamVisitReport
    from apps.ai_core.rag_service import get_catalog_rag
    from apps.ai_core.services.session_service import AISessionService

    logger = logging.getLogger(__name__)

    rag_matches = get_catalog_rag().search(query=transcript, limit=3)
    recommended_packages = [
        {
            "id": m.get("service_id") or m.get("id"),
            "title": m.get("name") or m.get("nom_offre") or m.get("titre") or "Offre Orange Business",
            "category": m.get("category") or m.get("categorie") or "Connectivité & Réseaux",
            "score": m.get("score"),
            "pricing": m.get("pricing", {}).get("model") or m.get("tarification") or "Sur devis",
            "sla": m.get("pricing", {}).get("setup_fee") or m.get("sla") or "GTR 4h 99.8%",
            "summary": m.get("description") or m.get("description_commerciale") or m.get("resume") or "",
        }
        for m in rag_matches
    ]

    if not actions_todo:
        is_unqualified = (
            bant_scores.get('status') in ['INSUFFICIENT_DATA', 'DISQUALIFIED']
            or bant_scores.get('total', 0) == 0
            or not confirmed_needs
        )
        if is_unqualified:
            actions_todo = [f"Recontacter {appointment.contact_name} pour planifier un entretien approfondi"]
        else:
            actions_todo = [f"Transmettre la synthèse de l'entretien et la proposition à {appointment.contact_name}"]

    crm_payload = {
        "recommended_packages": recommended_packages,
        "next_step": actions_todo[0] if actions_todo else f"Suivi avec {appointment.contact_name}",
        "crm_system": "Microsoft Dynamics 365 Sales / Salesforce",
    }

    report, _ = KamVisitReport.objects.update_or_create(
        appointment=appointment,
        defaults={
            "kam": user,
            "enterprise": appointment.enterprise,
            "raw_transcript": transcript,
            "audio_file_path": audio_file_path,
            "executive_summary": executive_summary,
            "confirmed_needs": confirmed_needs,
            "objections_raised": objections_raised,
            "actions_todo": actions_todo,
            "follow_up_email_draft": follow_up_email,
            "bant_scores": bant_scores,
            "conversion_status": conversion_status_val,
            "crm_payload": crm_payload,
        }
    )

    appointment.status = 'COMPLETED'
    appointment.save(update_fields=['status', 'updated_at'])

    enterprise = appointment.enterprise
    enterprise.is_visited = True
    enterprise.last_visited_at = timezone.now()
    enterprise.last_visited_by = user
    if conversion_status_val in dict(Enterprise.CONVERSION_STATUS_CHOICES):
        enterprise.conversion_status = conversion_status_val
    enterprise.save()

    try:
        session_id = f"kam_account_{enterprise.id}"
        AISessionService.append_message(
            session_id=session_id,
            role="user",
            content=f"Rapport de rendez-vous commercial ({appointment.contact_name}) : {transcript}",
            metadata={"appointment_id": appointment.id}
        )
        AISessionService.add_report(
            session_id=session_id,
            report={
                "type": "KAM_VISIT_REPORT",
                "appointment_id": appointment.id,
                "executive_summary": executive_summary,
                "confirmed_needs": confirmed_needs,
                "objections_raised": objections_raised,
                "bant_scores": bant_scores,
                "recommended_packages": recommended_packages,
            }
        )
    except Exception as exc:
        logger.warning(f"Impossible d'enregistrer session AI pour {enterprise.name}: {exc}")

    return report, enterprise

