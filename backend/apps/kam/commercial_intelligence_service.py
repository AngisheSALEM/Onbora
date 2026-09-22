import os
import json
import logging
import requests
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from sales.models import Enterprise
from .models import PreCallBriefing, KamVisitReport

from apps.ai_core.unified_engine import get_unified_core_ai

logger = logging.getLogger(__name__)
User = get_user_model()

CORE_AI_URL = os.getenv("CORE_AI_URL", "http://127.0.0.1:8001").rstrip("/")

ORANGE_OFFERS_CATALOG = [
    {
        "name": "Fibre Sécurisée Dédiée Pro",
        "category": "CONNECTIVITY",
        "speed": "100 Mbps à 1 Gbps symétrique",
        "sla": "99.99% avec GTR 4h garantie",
        "best_for": "Sièges sociaux, banques, usines et sites critiques nécessitant zéro interruption."
    },
    {
        "name": "SD-WAN Managé & Multi-liens Hybride",
        "category": "NETWORK",
        "speed": "Agrégation dynamique Fibre + Backup Satellite / 4G",
        "sla": "Basculement automatique < 1 seconde sans coupure de session",
        "best_for": "Entreprises multi-sites (agences bancaires, mines, retail) avec applications cloud critiques (SAP, Salesforce)."
    },
    {
        "name": "CyberSOC & Next-Gen Firewall Managé",
        "category": "SECURITY",
        "speed": "Surveillance 24/7/365 et filtrage temps réel",
        "sla": "Détection & isolement des menaces < 15 min",
        "best_for": "Protection contre les ransomwares, attaques DDoS et conformité réglementaire (Banque Centrale, RGPD)."
    },
    {
        "name": "Téléphonie Cloud Microsoft Teams Phone",
        "category": "COLLABORATION",
        "speed": "Operator Connect certifié Microsoft",
        "sla": "Qualité vocale HD avec routage intelligent",
        "best_for": "Remplacement des standards PABX obsolètes, télétravail et convergence fixe-mobile."
    }
]


class CommercialIntelligenceService:
    """
    Service centralisant les 4 piliers d'intelligence & d'exécution commerciale B2B :
    1. Pre-Call Intelligence (briefing prospect en 2 min)
    2. Post-Call Execution (e-mail de suivi prêt à l'envoi + payload CRM Dynamics)
    3. Lead Scoring B2B (priorisation du pipeline sur signaux faibles)
    4. Radar Churn & Upsell (surveillance proactive des risques et opportunités)
    """

    @staticmethod
    def generate_pre_call_briefing(enterprise: Enterprise, kam_user) -> dict:
        """
        Génère un dossier d'attaque complet pre-call pour un rendez-vous complexe.
        Appelle le microservice Core AI (Brain) sur /api/core-ai/pre-call avec repli sur le fallback local.
        """
        engine = get_unified_core_ai()
        ai_data = engine.generate_pre_call_briefing(enterprise, kam_user)

        golden_rules = ai_data.get("golden_rules") or [
            f"Ne jamais dénigrer directement {enterprise.current_operator or 'le concurrent'} : valoriser nos engagements SLA 99.99% et notre GTR 4h signée.",
            "Faire verbaliser la douleur financière avant d'aborder tout chiffre ou prix.",
            "Identifier dès les 10 premières minutes si le DAF doit être intégré à la réunion de restitution."
        ]
        briefing, _ = PreCallBriefing.objects.update_or_create(
            enterprise=enterprise,
            kam=kam_user,
            defaults={
                "company_overview": ai_data.get("company_overview", {}),
                "key_decision_makers": ai_data.get("key_decision_makers", []),
                "detected_business_challenges": ai_data.get("detected_business_challenges", []),
                "custom_pitch_angles": ai_data.get("custom_pitch_angles", []),
                "critical_discovery_questions": ai_data.get("critical_discovery_questions", []),
                "golden_rules": golden_rules,
                "analysis_data": ai_data,
            }
        )
        return {
            "id": briefing.id,
            "enterprise_id": enterprise.id,
            "enterprise_name": enterprise.name,
            **ai_data,
            "company_overview": briefing.company_overview,
            "key_decision_makers": briefing.key_decision_makers,
            "detected_business_challenges": briefing.detected_business_challenges,
            "custom_pitch_angles": briefing.custom_pitch_angles,
            "critical_discovery_questions": briefing.critical_discovery_questions,
            "golden_rules": briefing.golden_rules,
            "created_at": briefing.created_at.strftime("%d/%m/%Y %H:%M"),
            "updated_at": briefing.updated_at.strftime("%d/%m/%Y %H:%M"),
            "ai_engine": "Onbora Analysis (Port 8001 / AI Core)"
        }

    @staticmethod
    def update_and_resynthesize_briefing(enterprise: Enterprise, request_data: dict, kam_user=None) -> dict:
        """
        Met à jour le dossier de pré-visite et ré-exécute Core AI pour maintenir
        la synthèse exécutive et les solutions recommandées synchronisées avec les faits édités.
        """
        briefing = PreCallBriefing.objects.filter(enterprise=enterprise).first()
        if not briefing:
            # Création à la volée si inexistant
            briefing = PreCallBriefing.objects.create(
                enterprise=enterprise,
                kam=kam_user,
                analysis_data={}
            )

        analysis_data = briefing.analysis_data or {}
        ai_summary_input = request_data.get("ai_summary", {})
        resynthesize = request_data.get("resynthesize", True)

        existing_ai = analysis_data.get("ai_summary", {})
        key_facts_raw = ai_summary_input.get("key_facts") if "key_facts" in ai_summary_input else existing_ai.get("key_facts", [])
        contradictions_raw = ai_summary_input.get("contradictions") if "contradictions" in ai_summary_input else existing_ai.get("contradictions", [])
        gaps_raw = ai_summary_input.get("gaps") if "gaps" in ai_summary_input else existing_ai.get("gaps", [])

        key_facts = [f.get("text", f) if isinstance(f, dict) else str(f) for f in key_facts_raw]
        contradictions = [c.get("text", c) if isinstance(c, dict) else str(c) for c in contradictions_raw]
        gaps = [str(g) for g in gaps_raw]

        custom_overview = ""
        if isinstance(ai_summary_input.get("overview"), dict):
            custom_overview = ai_summary_input.get("overview", {}).get("text", "")
        elif isinstance(ai_summary_input.get("overview"), str):
            custom_overview = ai_summary_input.get("overview")

        custom_solutions = request_data.get("recommended_solutions", analysis_data.get("recommended_solutions", []))

        if resynthesize:
            engine = get_unified_core_ai()
            ai_result = engine.resynthesize_briefing(
                enterprise_name=enterprise.name,
                key_facts=key_facts,
                contradictions=contradictions,
                gaps=gaps,
                current_overview=custom_overview,
                current_solutions=custom_solutions
            )
            final_overview = ai_result.get("overview") or custom_overview
            final_solutions = ai_result.get("recommended_solutions") or custom_solutions
        else:
            final_overview = custom_overview or existing_ai.get("overview", {}).get("text", "")
            final_solutions = custom_solutions

        updated_ai_summary = {
            **existing_ai,
            **ai_summary_input,
            "status": "ai_resynthesized",
            "overview": {
                "text": final_overview,
                "sources": existing_ai.get("overview", {}).get("sources", [])
            },
            "key_facts": [{"text": kf} if isinstance(kf, str) else kf for kf in key_facts],
            "contradictions": [{"text": ct} if isinstance(ct, str) else ct for ct in contradictions],
            "gaps": gaps,
        }

        analysis_data["ai_summary"] = updated_ai_summary
        analysis_data["recommended_solutions"] = final_solutions
        if "custom_pitch_angles" in request_data:
            briefing.custom_pitch_angles = request_data["custom_pitch_angles"]

        briefing.analysis_data = analysis_data
        briefing.save(update_fields=['analysis_data', 'custom_pitch_angles', 'updated_at'])

        return {
            "id": briefing.id,
            "enterprise_id": enterprise.id,
            "enterprise_name": enterprise.name,
            **briefing.analysis_data,
            "company_overview": briefing.company_overview,
            "key_decision_makers": briefing.key_decision_makers,
            "detected_business_challenges": briefing.detected_business_challenges,
            "custom_pitch_angles": briefing.custom_pitch_angles,
            "critical_discovery_questions": briefing.critical_discovery_questions,
            "golden_rules": briefing.golden_rules,
            "created_at": briefing.created_at.strftime("%d/%m/%Y %H:%M"),
            "updated_at": briefing.updated_at.strftime("%d/%m/%Y %H:%M"),
            "ai_engine": "Unified Core AI (Resynthesized)"
        }

    @staticmethod
    def _fallback_pre_call(enterprise: Enterprise, kam_user) -> dict:
        sector = enterprise.sector or "Services & Industrie"
        employee_count = enterprise.employee_count or 25
        site_count = enterprise.site_count or 1
        annual_revenue = float(enterprise.annual_revenue or 50000.0)
        curr_op = enterprise.current_operator or "Opérateur tiers"
        curr_conn = enterprise.current_connectivity or "Fibre standard"
        city = enterprise.commune or enterprise.city or "Kinshasa"
        contact_name = enterprise.contact_name or "Direction Générale"
        contact_role = enterprise.contact_role or "DSI / Décideur"

        # 1. Vue d'ensemble de l'entreprise
        maturity = "HIGH" if (annual_revenue > 200000 or enterprise.segment == 'GRAND_COMPTE') else "MEDIUM"
        overview = {
            "company_name": enterprise.name,
            "summary": f"Acteur clé du secteur {sector} basé à {city}. Structure de {employee_count} collaborateurs répartis sur {site_count} site(s). Infrastructure sous contrat {curr_op} ({curr_conn}).",
            "estimated_employees": f"{employee_count}+ collaborateurs",
            "estimated_sites": site_count,
            "annual_revenue_usd": f"{annual_revenue:,.0f} USD",
            "digital_maturity": maturity,
            "telecom_budget_monthly_usd": round(annual_revenue * 0.015 / 12, 2)
        }

        # 2. Cartographie des décideurs clés
        decision_makers = [
            {
                "role": "Directeur des Systèmes d'Information (DSI)",
                "name": contact_name if "DSI" in contact_role or "IT" in contact_role else "DSI / Responsable IT",
                "profile_type": "Technique & Résilience",
                "concerns": f"Disponibilité du lien {curr_conn}, latence sur les applications métier, pannes non résolues chez {curr_op}.",
                "influence": "DECISION_MAKER"
            },
            {
                "role": "Responsable de la Sécurité des SI (RSSI)",
                "name": "RSSI / Responsable Cyber",
                "profile_type": "Sécurité & Audit",
                "concerns": "Sécurité des accès distants, attaques DDoS, conformité et intégrité des flux de données.",
                "influence": "INFLUENCER"
            },
            {
                "role": "Directeur Administratif & Financier (DAF) / Achats",
                "name": "Direction Financière",
                "profile_type": "TCO & Justification Budgétaire",
                "concerns": "Rentabilité des investissements, pénalités SLA contractuelles, prévisibilité de la facturation.",
                "influence": "ECONOMIC_BUYER"
            }
        ]

        # 3. Enjeux business détectés
        challenges = [
            f"Dépendance critique aux performances du lien d'accès actuel ({curr_op}) pour l'activité quotidienne.",
            f"Besoin de continuité opérationnelle sans coupure sur les {site_count} implantation(s).",
            "Sécurisation des postes de travail et centralisation des sauvegardes cloud.",
            "Convergence vers des outils collaboratifs unifiés (téléphonie IP + Microsoft 365)."
        ]

        # 4. Angles d'attaque et argumentaire sur-mesure Orange
        pitch_angles = [
            {
                "target_offer": "Fibre Sécurisée Dédiée Pro avec GTR 4h",
                "why_relevant": f"Supprime les goulots d'étranglement subis avec {curr_op} et garantit un temps de rétablissement contractuel en moins de 4h.",
                "hook_sentence": f"Monsieur le DSI, combien vous coûte concrètement une demi-journée d'arrêt de production lorsque votre lien {curr_op} tombe ?"
            },
            {
                "target_offer": "SD-WAN Managé & Multi-liens Hybride",
                "why_relevant": f"Agrège votre accès principal avec un secours 4G/Satellite automatique pour garantir zéro coupure de vos flux critiques.",
                "hook_sentence": "Aujourd'hui, si une pelleteuse coupe votre câble fibre de rue, vos collaborateurs peuvent-ils continuer à travailler sans interruption ?"
            },
            {
                "target_offer": "CyberSOC Managé 24/7 & Firewall Haute Disponibilité",
                "why_relevant": "Délègue la surveillance cybersécurité à nos experts certifiés sans avoir à recruter une équipe d'analystes interne.",
                "hook_sentence": "Avez-vous une visibilité en temps réel sur les flux anormaux qui transitent actuellement sur votre passerelle Internet ?"
            }
        ]

        # 5. Questions d'audit stratégiques (Discovery)
        discovery_questions = [
            f"Quel a été l'impact opérationnel de vos derniers incidents réseau avec {curr_op} ?",
            "Quelles sont les 3 applications logicielles dont l'arrêt bloque immédiatement vos équipes (ex: ERP, CRM, messagerie) ?",
            f"Comment vos {site_count} site(s) communiquent-ils aujourd'hui et les données sont-elles répliquées en temps réel ?",
            "Avez-vous déjà quantifié le coût horaire d'indisponibilité de vos agences ?",
            "Quel est le calendrier de renouvellement ou d'échéance de vos contrats télécoms en cours ?"
        ]

        # 6. Règles d'or d'entretien
        golden_rules = [
            f"Ne jamais dénigrer directement {curr_op} : valoriser plutôt nos engagements SLA 99.99% et notre GTR 4h signée.",
            "Faire verbaliser la douleur financière avant d'aborder tout chiffre ou prix.",
            "Identifier dès les 10 premières minutes si le DAF doit être intégré à la réunion de restitution."
        ]

        # Sauvegarde ou mise à jour du PreCallBriefing en base
        briefing, _ = PreCallBriefing.objects.update_or_create(
            enterprise=enterprise,
            kam=kam_user,
            defaults={
                "company_overview": overview,
                "key_decision_makers": decision_makers,
                "detected_business_challenges": challenges,
                "custom_pitch_angles": pitch_angles,
                "critical_discovery_questions": discovery_questions,
                "golden_rules": golden_rules
            }
        )

        return {
            "id": briefing.id,
            "enterprise_id": enterprise.id,
            "enterprise_name": enterprise.name,
            "company_overview": overview,
            "key_decision_makers": decision_makers,
            "detected_business_challenges": challenges,
            "custom_pitch_angles": pitch_angles,
            "critical_discovery_questions": discovery_questions,
            "golden_rules": golden_rules,
            "created_at": briefing.created_at.strftime("%d/%m/%Y %H:%M"),
            "updated_at": briefing.updated_at.strftime("%d/%m/%Y %H:%M")
        }

    @staticmethod
    def generate_post_call_execution(report: KamVisitReport) -> dict:
        """
        Génère l'exécution post-visite complète :
        - E-mail commercial de suivi prêt à envoyer
        - Payload d'injection CRM Dynamics 365 / Salesforce
        - Tâches d'action immédiates avec rappel 48h
        Exécution directe in-process via le Core AI unifié.
        """
        ent = report.enterprise
        kam = report.kam
        transcript = report.raw_transcript or report.executive_summary or f"Discussion avec {ent.contact_name} de {ent.name}."

        engine = get_unified_core_ai()
        ai_data = engine.generate_post_call_execution(ent, kam, transcript)

        email_obj = ai_data.get("client_followup_email", {})
        email_subject = email_obj.get("subject", f"Suite à notre échange — Accompagnement {ent.name}")
        email_body = email_obj.get("body", "")
        crm_payload = ai_data.get("crm_payload", {})
        action_tasks = ai_data.get("action_tasks", [])

        report.follow_up_email_draft = email_body
        report.crm_payload = crm_payload
        report.actions_todo = action_tasks
        report.save(update_fields=['follow_up_email_draft', 'crm_payload', 'actions_todo'])

        return {
            "report_id": report.id,
            "enterprise_name": ent.name,
            "email_subject": email_subject,
            "email_body": email_body,
            "crm_payload": crm_payload,
            "tasks": action_tasks,
            "crm_sync_status": report.crm_sync_status,
            "ai_engine": "Unified Core AI (In-Process)"
        }

    @staticmethod
    def _fallback_post_call(report: KamVisitReport) -> dict:
        ent = report.enterprise
        kam = report.kam
        contact_name = ent.contact_name or "Monsieur / Madame"
        contact_role = ent.contact_role or "Direction"

        # E-mail commercial prêt à envoyer
        email_subject = f"Suite à notre échange — Plan de sécurisation et connectivité télécoms pour {ent.name}"
        email_body = f"""Bonjour {contact_name},

Je tiens à vous remercier chaleureusement pour le temps accordé ce jour lors de notre échange concernant les infrastructures télécoms et réseaux de {ent.name}.

Comme nous l'avons constaté ensemble, l'enjeu prioritaire réside dans la fiabilisation de vos liaisons de communication et la garantie de continuité opérationnelle de vos applications métiers, tout en prévenant les risques d'interruption subis avec votre infrastructure actuelle.

Pour répondre précisément à ce cahier des charges, notre pôle d'ingénierie finalise actuellement votre proposition technique et financière sur-mesure, comprenant :
• Notre accès Fibre Optique Dédiée avec Garantie de Temps de Rétablissement (GTR < 4h contractuelle).
• Une architecture résiliente avec basculement automatique et sécurisation avancée.
• Un accompagnement technique dédié par nos équipes locales 24/7.

Je vous ferai parvenir l'ensemble des éléments chiffrés d'ici la fin de semaine. Comme convenu, je me permettrai de vous recontacter sous 48 heures pour caler la date de présentation de l'offre finale avec notre architecte réseau.

Restant à votre entière disposition pour toute précision,

Bien cordialement,

{kam.get_full_name() or kam.username}
Key Account Manager — Orange Business
{kam.email}
"""

        # Payload CRM structuré pour Dynamics 365 / Salesforce
        estimated_mrr = round(float(ent.annual_revenue or 50000.0) * 0.015 / 12, 2)
        crm_payload = {
            "crm_system": "Microsoft Dynamics 365 Sales / Salesforce",
            "account_id": ent.crm_id or f"CRM-ACC-{ent.id:04d}",
            "opportunity_name": f"Modernisation Connectivité & Sécurité — {ent.name}",
            "pipeline_stage": "QUALIFIED_OPPORTUNITY",
            "deal_confidence_percentage": 75,
            "estimated_mrr_usd": estimated_mrr,
            "estimated_tcv_usd": round(estimated_mrr * 24, 2),  # Engagement 24 mois
            "next_step": "Envoi proposition commerciale chiffrée",
            "next_followup_deadline": (timezone.now() + timedelta(days=2)).strftime("%Y-%m-%d"),
            "stakeholders": [
                {
                    "name": contact_name,
                    "role": contact_role,
                    "phone": ent.contact_phone or "N/A",
                    "email": ent.contact_email or "N/A",
                    "decision_power": "FINAL_DECISION_MAKER"
                }
            ],
            "identified_needs": report.confirmed_needs or ["Fibre Dédiée Pro GTR 4h", "Secours Automatique"],
            "competitor_incumbent": ent.current_operator or "Opérateur tiers",
            "last_interaction_date": timezone.now().strftime("%Y-%m-%d %H:%M")
        }

        # Tâches d'action immédiates
        tasks = [
            {
                "id": f"task-{report.id}-1",
                "title": f"Envoyer l'e-mail de suivi rédigé à {contact_name}",
                "deadline": (timezone.now() + timedelta(hours=24)).strftime("%d/%m/%Y"),
                "priority": "HIGH",
                "is_urgent_48h": True,
                "status": "TODO"
            },
            {
                "id": f"task-{report.id}-2",
                "title": f"Transmettre le chiffrage technique et valider le SLA avec l'avant-vente",
                "deadline": (timezone.now() + timedelta(days=2)).strftime("%d/%m/%Y"),
                "priority": "HIGH",
                "is_urgent_48h": True,
                "status": "TODO"
            },
            {
                "id": f"task-{report.id}-3",
                "title": f"Appel de calage et relance de {contact_name} (J+2)",
                "deadline": (timezone.now() + timedelta(days=3)).strftime("%d/%m/%Y"),
                "priority": "MEDIUM",
                "is_urgent_48h": False,
                "status": "SCHEDULED"
            }
        ]

        # Mise à jour du rapport
        report.follow_up_email_draft = email_body
        report.crm_payload = crm_payload
        report.actions_todo = tasks
        report.save(update_fields=['follow_up_email_draft', 'crm_payload', 'actions_todo'])

        return {
            "report_id": report.id,
            "enterprise_name": ent.name,
            "email_subject": email_subject,
            "email_body": email_body,
            "crm_payload": crm_payload,
            "tasks": tasks,
            "crm_sync_status": report.crm_sync_status
        }

    @staticmethod
    def calculate_lead_scoring(user, force_refresh: bool = False) -> list:
        """
        Calcule le Lead Scoring B2B et la priorisation du pipeline pour un KAM ou la direction,
        en déléguant au Core AI (B2BLeadScoringEngine) avec persistance locale dans Enterprise.ai_lead_scoring_data.
        """
        from django.db.models import Q

        if user.role == User.KAM:
            enterprises = Enterprise.objects.filter(assigned_kam=user)
        else:
            enterprises = Enterprise.objects.filter(
                Q(assigned_entity='KAM_OFFICE') | Q(segment__in=['GRAND_COMPTE', 'PME'])
            )

        enterprises = enterprises.prefetch_related(
            'kam_visit_reports',
            'field_intelligence_reports',
            'pre_call_briefings'
        )

        engine = get_unified_core_ai()
        scored_leads = []
        to_save = []
        total_count = enterprises.count()

        for ent in enterprises:
            ai_data = ent.ai_lead_scoring_data if isinstance(ent.ai_lead_scoring_data, dict) else {}
            needs_eval = not ai_data or force_refresh or 'lead_score' not in ai_data

            if needs_eval:
                try:
                    if force_refresh or total_count <= 5:
                        ai_data = engine.evaluate_lead_scoring(ent)
                    else:
                        from apps.ai_core.lead_scoring.models import LeadScoringInput
                        inp = LeadScoringInput(
                            company_name=ent.name,
                            sector=ent.sector or "Services",
                            locations_count=ent.site_count or 1,
                            budget_status=ent.budget_status,
                            pain_level=ent.pain_level,
                            decision_maker_involved=bool(ent.contact_name),
                            raw_notes=engine._extract_enterprise_notes(ent)
                        )
                        fallback_out = engine.lead_scoring_engine._build_fallback(inp)
                        ai_data = fallback_out.model_dump()
                        tier = ai_data.get("scoring_tier", "TIER_2_PROSPECT")
                        if tier == "TIER_2_MEDIUM":
                            tier = "TIER_2_PROSPECT"
                        ai_data["scoring_tier"] = tier
                        ai_data["estimated_mrr_usd"] = float(ent.telecom_budget_monthly or (float(ent.annual_revenue or 50000.0) * 0.015 / 12))
                        ai_data["recommended_approach"] = ai_data.get("recommended_sales_angle", "")

                    ent.ai_lead_scoring_data = ai_data
                    ent.ai_scored_at = timezone.now()
                    to_save.append(ent)
                except Exception as exc:
                    logger.warning("[LeadScoring] Erreur evaluation Core AI pour %s (%s)", ent.name, exc)
                    ai_data = {
                        "lead_score": 55,
                        "scoring_tier": "TIER_2_PROSPECT",
                        "conversion_probability": "MEDIUM",
                        "score_drivers": [{"factor": "Compte segmenté KAM Office", "points": "+15 pts", "positive": True}],
                        "recommended_approach": "Planifier un audit d'éligibilité réseau.",
                        "estimated_mrr_usd": float(ent.telecom_budget_monthly or 2500.0)
                    }

            lead_score = ai_data.get("lead_score", 50)
            tier = ai_data.get("scoring_tier", "TIER_2_PROSPECT")
            if tier == "TIER_2_MEDIUM":
                tier = "TIER_2_PROSPECT"

            drivers = ai_data.get("score_drivers", [])
            formatted_drivers = []
            for d in drivers:
                if isinstance(d, dict):
                    formatted_drivers.append({
                        "factor": d.get("factor", ""),
                        "points": d.get("points") or d.get("impact", "+10 pts"),
                        "positive": d.get("positive", True) if "positive" in d else (d.get("type") == "POSITIVE"),
                    })

            approach = (
                ai_data.get("recommended_approach")
                or ai_data.get("recommended_sales_angle")
                or "Planifier un entretien d'audit d'éligibilité et valoriser le SLA Orange Business."
            )

            est_mrr = float(
                ent.telecom_budget_monthly
                or ai_data.get("estimated_mrr_usd")
                or (float(ent.annual_revenue or 50000.0) * 0.015 / 12)
            )

            scored_leads.append({
                "enterprise_id": ent.id,
                "name": ent.name,
                "sector": ent.sector or "Services",
                "segment": ent.segment,
                "city": ent.city,
                "lead_score": lead_score,
                "scoring_tier": tier,
                "conversion_probability": ai_data.get("conversion_probability", "MEDIUM"),
                "estimated_mrr_usd": round(est_mrr, 2),
                "score_drivers": formatted_drivers,
                "recommended_approach": approach,
                "next_immediate_action": ai_data.get("next_immediate_action", ""),
                "current_operator": ent.current_operator or "Non renseigné",
                "contact_name": ent.contact_name or "Non renseigné",
                "contact_role": ent.contact_role or "Décideur",
                "is_visited": ent.is_visited,
                "ai_engine": "Unified Core AI (B2B Lead Scoring Engine)"
            })

        if to_save:
            Enterprise.objects.bulk_update(to_save, ['ai_lead_scoring_data', 'ai_scored_at'], batch_size=100)

        scored_leads.sort(key=lambda x: x["lead_score"], reverse=True)
        return scored_leads

    @staticmethod
    def get_churn_and_upsell_radar(user, force_refresh: bool = False) -> dict:
        """
        Détecte proactivement via le ChurnRadarEngine du Core AI :
        1. Les alertes de churn (risques de résiliation ou perte de deal concurrent)
        2. Les opportunités d'upsell ciblées sur le catalogue d'Orange Business.
        """
        from django.db.models import Q

        if user.role == User.KAM:
            enterprises = Enterprise.objects.filter(assigned_kam=user)
        else:
            enterprises = Enterprise.objects.filter(
                Q(assigned_entity='KAM_OFFICE') | Q(segment__in=['GRAND_COMPTE', 'PME'])
            )

        enterprises = enterprises.prefetch_related(
            'kam_visit_reports',
            'field_intelligence_reports',
            'pre_call_briefings'
        )

        engine = get_unified_core_ai()
        churn_alerts = []
        upsell_opportunities = []
        to_save = []
        total_count = enterprises.count()

        for ent in enterprises:
            ai_churn = ent.ai_churn_data if isinstance(ent.ai_churn_data, dict) else {}
            needs_eval = not ai_churn or force_refresh or 'churn_score' not in ai_churn

            if needs_eval:
                try:
                    if force_refresh or total_count <= 5:
                        ai_churn = engine.analyze_churn_radar(ent)
                    else:
                        from apps.ai_core.churn_radar.models import ChurnRadarInput
                        inp = ChurnRadarInput(
                            company_name=ent.name,
                            recent_interactions_notes=engine._extract_enterprise_notes(ent),
                            unresolved_incidents_count=ent.incident_count or 0,
                            contract_end_date=ent.contract_end_date.strftime('%Y-%m-%d') if ent.contract_end_date else None,
                        )
                        fallback_out = engine.churn_radar_engine._build_fallback(inp)
                        ai_churn = fallback_out.model_dump()
                        ai_churn["enterprise_id"] = ent.id
                        ai_churn["enterprise_name"] = ent.name
                        ai_churn["sector"] = ent.sector or "Grand Compte"
                        ai_churn["at_stake_monthly_revenue_usd"] = float(ent.telecom_budget_monthly or 2500.0)
                        ai_churn["signals_detected"] = ai_churn.get("churn_reasons", [])

                    ent.ai_churn_data = ai_churn
                    ent.ai_scored_at = timezone.now()
                    to_save.append(ent)
                except Exception as exc:
                    logger.warning("[ChurnRadar] Erreur evaluation Core AI pour %s (%s)", ent.name, exc)
                    ai_churn = {
                        "churn_risk_level": "LOW",
                        "churn_score": 20,
                        "churn_reasons": ["Relation stable"],
                        "retention_plan": {"urgency": "PLANNED_7D", "action": "Suivi régulier", "email_draft": ""},
                        "upsell_opportunities": []
                    }

            churn_level = ai_churn.get("churn_risk_level", "LOW")
            churn_score = ai_churn.get("churn_score", 20)
            telecom_monthly = float(
                ent.telecom_budget_monthly
                or ai_churn.get("at_stake_monthly_revenue_usd")
                or (float(ent.annual_revenue or 50000.0) * 0.015 / 12)
            )

            # Ne retenir en alertes que les comptes avec un risque tangible (CRITICAL, HIGH, ou MEDIUM avec incidents)
            if churn_level in ['CRITICAL', 'HIGH', 'MEDIUM']:
                retention = ai_churn.get("retention_plan") or ai_churn.get("retention_action_plan") or {}
                talk_track = (
                    retention.get("recommended_talk_track")
                    or retention.get("email_draft")
                    or f"Planifier un point d'étape technique avec le DSI de {ent.name}."
                )

                churn_alerts.append({
                    "id": f"churn-{ent.id}",
                    "enterprise_id": ent.id,
                    "enterprise_name": ent.name,
                    "sector": ent.sector or "Grand Compte",
                    "churn_risk_level": churn_level,
                    "churn_score": churn_score,
                    "at_stake_monthly_revenue_usd": round(telecom_monthly, 2),
                    "signals_detected": ai_churn.get("signals_detected") or ai_churn.get("churn_reasons") or [
                        f"{ent.incident_count} incident(s) signalé(s) chez {ent.current_operator}"
                    ],
                    "retention_action_plan": {
                        "urgency": retention.get("urgency", "IMMEDIATE_48H"),
                        "action": retention.get("action", f"Entretien de conciliation avec {ent.contact_name or 'le DSI'}"),
                        "recommended_talk_track": talk_track
                    }
                })

            # Opportunités d'upsell
            raw_upsells = ai_churn.get("upsell_opportunities", [])
            for u in raw_upsells:
                if isinstance(u, dict):
                    val_str = u.get("estimated_value", "+500 $/m")
                    mrr_val = 500.0
                    try:
                        digits = ''.join(c for c in val_str if c.isdigit() or c == '.')
                        if digits:
                            mrr_val = float(digits)
                    except Exception:
                        mrr_val = 500.0

                    upsell_opportunities.append({
                        "id": f"upsell-{ent.id}-{len(upsell_opportunities)+1}",
                        "enterprise_id": ent.id,
                        "enterprise_name": ent.name,
                        "sector": ent.sector or "Grand Compte",
                        "target_solution": u.get("solution") or u.get("target_solution", "SD-WAN Managé Hybride"),
                        "confidence_score": 85,
                        "potential_additional_mrr_usd": mrr_val,
                        "trigger_event": u.get("trigger") or u.get("trigger_event", "Croissance des usages et multi-sites"),
                        "value_proposition": u.get("talking_point") or u.get("value_proposition", "Continuité d'activité garantie")
                    })

        if to_save:
            Enterprise.objects.bulk_update(to_save, ['ai_churn_data', 'ai_scored_at'], batch_size=100)

        severity_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
        churn_alerts.sort(key=lambda x: (severity_order.get(x["churn_risk_level"], 9), -x["churn_score"]))

        return {
            "critical_churn_count": len([c for c in churn_alerts if c["churn_risk_level"] == "CRITICAL"]),
            "high_churn_count": len([c for c in churn_alerts if c["churn_risk_level"] == "HIGH"]),
            "churn_alerts": churn_alerts[:25],
            "total_upsell_potential_mrr": round(sum(u["potential_additional_mrr_usd"] for u in upsell_opportunities), 2),
            "upsell_opportunities": upsell_opportunities[:25],
            "ai_engine": "Unified Core AI (Churn Radar & Upsell Engine)"
        }
