import json
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from sales.models import Enterprise
from .models import PreCallBriefing, KamVisitReport

User = get_user_model()

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
        """
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
        """
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
    def calculate_lead_scoring(user) -> list:
        """
        Calcule le Lead Scoring B2B et la priorisation du pipeline pour un KAM ou la direction :
        - Score 0 à 100
        - Tiers : TIER_1_PRIORITY, TIER_2_PROSPECT, TIER_3_NURTURING
        - Score drivers (facteurs explicatifs)
        - Angle d'approche recommandé
        """
        if user.role == User.KAM:
            enterprises = Enterprise.objects.filter(assigned_kam=user)
        else:
            enterprises = Enterprise.objects.all()

        scored_leads = []
        for ent in enterprises:
            score = 30  # Base
            drivers = []

            rev = float(ent.annual_revenue or 0)
            emp = ent.employee_count or 1
            sites = ent.site_count or 1
            curr_op = ent.current_operator or "Vodacom"

            # Facteur 1: Taille & Budget (max +25 pts)
            if rev >= 500000 or ent.segment == 'GRAND_COMPTE':
                score += 25
                drivers.append({"factor": "Chiffre d'affaires > 500k$ (Grand Compte)", "points": "+25 pts", "positive": True})
            elif rev >= 150000 or emp >= 30:
                score += 15
                drivers.append({"factor": "PME structurée (> 30 collaborateurs)", "points": "+15 pts", "positive": True})
            else:
                score += 5
                drivers.append({"factor": "Taille intermédiaire", "points": "+5 pts", "positive": True})

            # Facteur 2: Multi-sites & Complexité réseau (max +20 pts)
            if sites >= 5:
                score += 20
                drivers.append({"factor": f"Réseau multi-sites étendu ({sites} implantations)", "points": "+20 pts", "positive": True})
            elif sites >= 2:
                score += 10
                drivers.append({"factor": f"Multi-sites ({sites} implantations)", "points": "+10 pts", "positive": True})

            # Facteur 3: Concurrence & Douleur réseau (max +20 pts)
            if curr_op.lower() != 'orange':
                score += 18
                drivers.append({"factor": f"Client chez le concurrent ({curr_op}) à convertir", "points": "+18 pts", "positive": True})
            else:
                score += 5
                drivers.append({"factor": "Client Orange existant (parc à upgrader)", "points": "+5 pts", "positive": True})

            # Facteur 4: Statut de visite & Décideur identifié (max +15 pts)
            if ent.contact_name and ent.contact_phone:
                score += 10
                drivers.append({"factor": "Décideur direct et téléphone renseignés", "points": "+10 pts", "positive": True})
            if ent.is_visited:
                score += 7
                drivers.append({"factor": "Visite terrain déjà réalisée", "points": "+7 pts", "positive": True})

            score = min(score, 98)

            # Attribution du Tier
            if score >= 75:
                tier = "TIER_1_PRIORITY"
                prob = "HIGH"
                approach = "Contacter le DSI sous 24h pour positionner un POC Fibre Pro + SD-WAN."
            elif score >= 55:
                tier = "TIER_2_PROSPECT"
                prob = "MEDIUM"
                approach = "Planifier une visite de diagnostic réseau avec focus sur le coût des pannes."
            else:
                tier = "TIER_3_NURTURING"
                prob = "LOW"
                approach = "Intégrer à la campagne de prospection ciblée téléphonie collaborative."

            est_mrr = round(rev * 0.015 / 12, 2)
            scored_leads.append({
                "enterprise_id": ent.id,
                "name": ent.name,
                "sector": ent.sector or "Services",
                "segment": ent.segment,
                "city": ent.city,
                "lead_score": score,
                "scoring_tier": tier,
                "conversion_probability": prob,
                "estimated_mrr_usd": est_mrr,
                "score_drivers": drivers,
                "recommended_approach": approach,
                "current_operator": curr_op,
                "contact_name": ent.contact_name or "Non renseigné",
                "contact_role": ent.contact_role or "Décideur",
                "is_visited": ent.is_visited
            })

        # Trier par score décroissant
        scored_leads.sort(key=lambda x: x["lead_score"], reverse=True)
        return scored_leads

    @staticmethod
    def get_churn_and_upsell_radar(user) -> dict:
        """
        Détecte proactivement :
        1. Les risques de churn (clients mécontents, approche de concurrents)
        2. Les opportunités d'upsell (clients qui grandissent, nouveaux besoins)
        """
        if user.role == User.KAM:
            enterprises = Enterprise.objects.filter(assigned_kam=user)
        else:
            enterprises = Enterprise.objects.all()

        churn_alerts = []
        upsell_opportunities = []

        for ent in enterprises:
            rev = float(ent.annual_revenue or 50000.0)
            curr_op = ent.current_operator or "Vodacom"

            # Simulation de signaux réalistes de Churn sur base des données du compte
            if ent.conversion_status in ['PROSPECT', 'IN_NEGOTIATION'] and curr_op != 'Orange':
                # Risque de perdre le deal au profit du concurrent en place
                churn_alerts.append({
                    "id": f"churn-{ent.id}",
                    "enterprise_id": ent.id,
                    "enterprise_name": ent.name,
                    "sector": ent.sector or "Banque",
                    "churn_risk_level": "CRITICAL" if rev > 200000 else "HIGH",
                    "churn_score": 82 if rev > 200000 else 68,
                    "at_stake_monthly_revenue_usd": round(rev * 0.015 / 12, 2),
                    "signals_detected": [
                        f"Contrat de réengagement proposé par {curr_op} avec remise tarifaire agressive",
                        "Instabilités réseau récentes signalées sans réponse technique adéquate",
                        "Renouvellement annuel arrivant à échéance dans les 60 prochains jours"
                    ],
                    "retention_action_plan": {
                        "urgency": "IMMEDIATE_48H",
                        "action": f"Proposer immédiatement un entretien de direction avec présentation du SLA garanti Orange.",
                        "recommended_talk_track": "Démontrer que le coût d'une panne avec l'offre concurrente dépasse largement la remise apparente."
                    }
                })

            # Détection d'opportunités d'Upsell sur comptes établis
            if ent.employee_count >= 15 or ent.site_count > 1 or rev > 80000:
                upsell_opportunities.append({
                    "id": f"upsell-{ent.id}",
                    "enterprise_id": ent.id,
                    "enterprise_name": ent.name,
                    "sector": ent.sector or "Industrie",
                    "target_solution": "CyberSOC Managé 24/7 & Firewall HA" if ent.sector in ['Banque', 'Finance', 'Mines'] else "SD-WAN Managé Hybride",
                    "confidence_score": 85,
                    "potential_additional_mrr_usd": round(rev * 0.008 / 12, 2) + 650.0,
                    "trigger_event": f"Croissance d'effectif ({ent.employee_count} employés) et besoin de sécurisation des flux distants.",
                    "value_proposition": "Supervision proactive de la sécurité et élimination des interruptions de service."
                })

        return {
            "critical_churn_count": len([c for c in churn_alerts if c["churn_risk_level"] == "CRITICAL"]),
            "high_churn_count": len([c for c in churn_alerts if c["churn_risk_level"] == "HIGH"]),
            "churn_alerts": churn_alerts[:15],
            "total_upsell_potential_mrr": sum(u["potential_additional_mrr_usd"] for u in upsell_opportunities),
            "upsell_opportunities": upsell_opportunities[:15]
        }
