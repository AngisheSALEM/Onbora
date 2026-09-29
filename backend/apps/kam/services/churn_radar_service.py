"""
Churn Radar & Upsell Business Service
=====================================
Domaine : KAM (Portefeuille Grands Comptes & PME)
Rôle : Moteur de scoring déterministe auditable (health_score 0-100) enrichi par Core AI
(explicabilité, plan d'action de rétention, catalogue Orange Business).
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from django.utils import timezone
from django.db.models import Q, Prefetch
from django.contrib.auth import get_user_model

from sales.models import Enterprise
from kam.models import (
    KamVisitReport,
    KamAppointment,
    ChurnRadarAssessment,
    ChurnRadarSnapshot,
)

logger = logging.getLogger(__name__)
User = get_user_model()


class ChurnRadarService:
    """
    Service métier orchestrant l'évaluation de santé de compte, la détection de churn,
    les opportunités d'upsell et l'historisation temporelle.
    """

    @classmethod
    def calculate_deterministic_health_score(cls, enterprise: Enterprise) -> Dict[str, Any]:
        """
        Calcule le score de santé (0-100) et le score de risque de churn (100 - health_score)
        selon des règles déterministes strictes, vérifiables et auditables.

        Règles :
        - Base : 100 points
        - Contrat expirant dans < 30j : -25 points
        - Contrat expirant dans < 90j : -15 points
        - Incidents non résolus : -15 points par incident (plafonné à 30)
        - Insatisfaction client ou friction forte : -15 points
        - Inactivité > 30j : -10 points
        - Inactivité > 14j : -5 points
        - Rendez-vous de suivi planifié : +15 points
        """
        now = timezone.now()
        today = now.date()

        score = 100
        reasons: List[str] = []
        is_renewal_imminent = False
        renewal_days: Optional[int] = None

        # 1. RÈGLE : Échéance contractuelle
        if enterprise.contract_end_date:
            days_until_end = (enterprise.contract_end_date - today).days
            renewal_days = days_until_end
            if days_until_end <= 30:
                score -= 25
                is_renewal_imminent = True
                reasons.append(f"Contrat expirant dans {max(0, days_until_end)} jours (< 30 jours)")
            elif days_until_end <= 90:
                score -= 15
                is_renewal_imminent = True
                reasons.append(f"Contrat arrivant à échéance dans {days_until_end} jours (< 90 jours)")

        # 2. RÈGLE : Incidents non résolus
        incidents = int(enterprise.incident_count or 0)
        if incidents > 0:
            deduction = min(incidents * 15, 30)
            score -= deduction
            reasons.append(f"{incidents} incident(s) réseau non résolu(s) signalés")

        # 3. RÈGLE : Insatisfaction client dans les rapports ou niveau de douleur
        pain = getattr(enterprise, 'pain_level', '')
        has_pain = pain in ['HIGH', 'CRITICAL']
        if not has_pain:
            # Vérification des derniers rapports de visite
            recent_reports = enterprise.kam_visit_reports.all()[:3]
            for rep in recent_reports:
                notes = (rep.client_feedback or rep.general_notes or '').lower()
                if any(w in notes for w in ['insatisfaction', 'mécontent', 'panne', 'coupure', 'rupture', 'dégradation', 'litige']):
                    has_pain = True
                    break

        if has_pain:
            score -= 15
            reasons.append("Insatisfaction client ou signaux de friction opérationnelle détectés")

        # 4. RÈGLE : Rupture d'interaction / Inactivité
        last_action_date: Optional[datetime] = None
        latest_report = enterprise.kam_visit_reports.order_by('-created_at').first()
        if latest_report:
            last_action_date = latest_report.created_at

        # Vérification des rendez-vous passés
        past_appt = enterprise.kam_appointments.filter(scheduled_at__lte=now).order_by('-scheduled_at').first()
        if past_appt and past_appt.scheduled_at:
            if not last_action_date or past_appt.scheduled_at > last_action_date:
                last_action_date = past_appt.scheduled_at

        if last_action_date:
            days_without_action = (now - last_action_date).days
        else:
            days_without_action = 45  # Défaut si aucun historique

        if days_without_action > 30:
            score -= 10
            reasons.append(f"Aucun contact KAM prouvé depuis plus de 30 jours ({days_without_action}j)")
        elif days_without_action > 14:
            score -= 5
            reasons.append(f"Aucune interaction KAM depuis plus de 14 jours ({days_without_action}j)")

        # 5. RÈGLE : Prochaine action planifiée
        next_appt = enterprise.kam_appointments.filter(scheduled_at__gte=now).order_by('scheduled_at').first()
        next_action_at: Optional[datetime] = None
        if next_appt and next_appt.scheduled_at:
            next_action_at = next_appt.scheduled_at
            score += 15
            reasons.append("Rendez-vous de suivi programmé dans l'agenda")

        # Bornage du score de santé (0 à 100)
        health_score = max(0, min(100, score))
        churn_risk_score = 100 - health_score

        # Segmentation des cohortes
        if health_score >= 70:
            risk_level = 'LOW'
            priority_level = 'P3'
        elif health_score >= 40:
            risk_level = 'MEDIUM'
            priority_level = 'P2'
        elif health_score < 30:
            risk_level = 'CRITICAL'
            priority_level = 'P1'
        else:
            risk_level = 'HIGH'
            priority_level = 'P1'

        if not reasons:
            reasons.append("Indicateurs contractuels et opérationnels conformes aux engagements.")

        return {
            "health_score": health_score,
            "churn_risk_score": churn_risk_score,
            "risk_level": risk_level,
            "priority_level": priority_level,
            "risk_reasons": reasons,
            "days_without_action": max(0, days_without_action),
            "is_renewal_imminent": is_renewal_imminent,
            "renewal_days": renewal_days,
            "last_action_at": last_action_date,
            "next_action_at": next_action_at,
        }

    @classmethod
    def refresh_account_assessment(
        cls,
        enterprise: Enterprise,
        use_ai: bool = False
    ) -> ChurnRadarAssessment:
        """
        Calcule ou actualise l'évaluation Radar de Churn d'une entreprise.
        Associe le moteur déterministe aux enrichissements d'explicabilité de Core AI.
        """
        det = cls.calculate_deterministic_health_score(enterprise)

        # Récupération ou création de l'évaluation
        assessment, created = ChurnRadarAssessment.objects.get_or_create(
            enterprise=enterprise,
            defaults={
                "health_score": det["health_score"],
                "churn_risk_score": det["churn_risk_score"],
                "risk_level": det["risk_level"],
                "priority_level": det["priority_level"],
                "risk_reasons": det["risk_reasons"],
                "days_without_action": det["days_without_action"],
                "is_renewal_imminent": det["is_renewal_imminent"],
                "renewal_days": det["renewal_days"],
                "last_action_at": det["last_action_at"],
                "next_action_at": det["next_action_at"],
            }
        )

        previous_health = assessment.health_score if not created else det["health_score"]
        if det["health_score"] > previous_health:
            trend = 'UP'
        elif det["health_score"] < previous_health:
            trend = 'DOWN'
        else:
            trend = 'STABLE'

        retention_plan = assessment.retention_plan or {}
        upsell_opportunities = assessment.upsell_opportunities or []

        # L'analyse externe est uniquement déclenchée sur demande explicite.
        if use_ai:
            try:
                from apps.ai_core.churn_radar.service import ChurnRadarEngine
                from apps.ai_core.churn_radar.models import ChurnRadarInput

                notes_list = [f"Secteur: {enterprise.sector or 'B2B'}", f"Opérateur actuel: {enterprise.current_operator or 'Non renseigné'}"]
                for r in enterprise.kam_visit_reports.all()[:2]:
                    if r.client_feedback:
                        notes_list.append(f"Rapport: {r.client_feedback}")
                notes = "\n".join(notes_list)

                inp = ChurnRadarInput(
                    company_name=enterprise.name,
                    current_services=[enterprise.current_connectivity] if enterprise.current_connectivity else ["Fibre Pro standard"],
                    recent_interactions_notes=notes,
                    unresolved_incidents_count=enterprise.incident_count or 0,
                    contract_end_date=enterprise.contract_end_date.strftime('%Y-%m-%d') if enterprise.contract_end_date else None,
                    orange_catalog_context=[
                        "SD-WAN Managé Hybride avec bascule automatique 4G/Satellite",
                        "Fibre Dédiée Pro Sécurisée avec GTR 4h contractuelle",
                        "CyberSOC Managé 24/7 & Firewall Haute Disponibilité",
                        "Liaison Fibre Noire Inter-Datacenters Sécurisée",
                        "Réseau LTE Privé Industriel & IoT"
                    ]
                )

                engine = ChurnRadarEngine()
                ai_output = engine.analyze(inp)

                retention_plan = ai_output.retention_plan.model_dump()
                upsell_opportunities = [u.model_dump() for u in ai_output.upsell_opportunities]

                # Enrichissement des explications sans écraser le score déterministe
                if ai_output.churn_reasons:
                    for r in ai_output.churn_reasons:
                        if r not in det["risk_reasons"]:
                            det["risk_reasons"].append(r)

                assessment.ai_scored_at = timezone.now()
            except Exception as exc:
                logger.warning("[ChurnRadarService] Core AI indisponible pour %s (%s), repli automatique.", enterprise.name, exc)
                if not retention_plan:
                    retention_plan = {
                        "urgency": "IMMEDIATE_48H" if det["risk_level"] in ['HIGH', 'CRITICAL'] else "PLANNED_7D",
                        "action": f"Organiser un entretien de cadrage avec la direction de {enterprise.name}.",
                        "email_draft": (
                            f"Bonjour,\n\n"
                            f"Je souhaite solliciter un échange de 15 minutes afin de faire un point sur vos services "
                            f"et anticiper vos besoins d'infrastructure pour ce trimestre.\n\n"
                            f"Bien cordialement,\nVotre Responsable de Compte Orange Business B2B"
                        )
                    }

        assessment.health_score = det["health_score"]
        assessment.churn_risk_score = det["churn_risk_score"]
        assessment.risk_level = det["risk_level"]
        assessment.priority_level = det["priority_level"]
        assessment.trend = trend
        assessment.risk_reasons = det["risk_reasons"]
        assessment.retention_plan = retention_plan
        assessment.upsell_opportunities = upsell_opportunities
        assessment.days_without_action = det["days_without_action"]
        assessment.is_renewal_imminent = det["is_renewal_imminent"]
        assessment.renewal_days = det["renewal_days"]
        assessment.last_action_at = det["last_action_at"]
        assessment.next_action_at = det["next_action_at"]
        assessment.save()

        # Enregistrement de l'instantané journalier (une fois par jour max par entreprise)
        today = timezone.now().date()
        existing_snapshot = ChurnRadarSnapshot.objects.filter(
            enterprise=enterprise,
            calculated_at__date=today
        ).first()

        if not existing_snapshot:
            ChurnRadarSnapshot.objects.create(
                enterprise=enterprise,
                health_score=assessment.health_score,
                churn_risk_score=assessment.churn_risk_score,
                risk_level=assessment.risk_level,
                calculated_at=timezone.now()
            )

        return assessment

    @classmethod
    def get_user_enterprises(cls, user) -> Any:
        """
        Retourne le QuerySet des entreprises assignées à l'utilisateur connecté.
        Chaque utilisateur ne voit que les comptes qui lui sont attribués via assigned_kam.
        """
        qs = Enterprise.objects.filter(assigned_kam=user)

        return qs.select_related('churn_assessment').prefetch_related(
            Prefetch('kam_appointments', queryset=KamAppointment.objects.order_by('scheduled_at')),
            Prefetch('kam_visit_reports', queryset=KamVisitReport.objects.order_by('-created_at'))
        )

    @classmethod
    def ensure_assessments(cls, enterprises) -> None:
        """S'assure que chaque entreprise a son évaluation Churn Radar calculée."""
        for ent in enterprises:
            if not hasattr(ent, 'churn_assessment') or ent.churn_assessment is None:
                cls.refresh_account_assessment(ent, use_ai=False)

    @classmethod
    def get_portfolio_summary(cls, user) -> Dict[str, Any]:
        """
        Génère le résumé complet du portefeuille pour le dashboard principal KAM :
        - 4 compteurs des cartes principales
        - Séries temporelles 7j, 30j, 90j sans aucun dégradé
        - Liste des comptes prioritaires
        """
        enterprises = list(cls.get_user_enterprises(user))
        cls.ensure_assessments(enterprises)

        # Rechargement propre des évaluations
        assessments = [ent.churn_assessment for ent in enterprises if getattr(ent, 'churn_assessment', None)]

        total_accounts = len(assessments)
        high_risk_list = [a for a in assessments if a.risk_level in ['HIGH', 'CRITICAL'] or a.health_score < 40]
        surveillance_list = [a for a in assessments if a not in high_risk_list and a.health_score < 70]
        healthy_list = [a for a in assessments if a not in high_risk_list and a.health_score >= 70]

        high_risk_count = len(high_risk_list)
        surveillance_count = len(surveillance_list)
        healthy_count = len(healthy_list)

        renewals_list = [a for a in assessments if a.is_renewal_imminent or (a.renewal_days is not None and a.renewal_days <= 90)]
        renewals_count = len(renewals_list)

        upsell_count = sum(1 for a in assessments if a.upsell_opportunities and len(a.upsell_opportunities) > 0)
        no_action_list = [a for a in assessments if a.days_without_action >= 14 and a.next_action_at is None]
        no_action_count = len(no_action_list)

        # Calcul des jalons temporels (7j, 30j, 90j)
        milestones = cls._build_chart_milestones(enterprises, healthy_count, surveillance_count, high_risk_count)

        # Comptes prioritaires pour le tableau d'accueil
        priority_accounts = []
        sorted_assessments = sorted(high_risk_list, key=lambda a: (a.health_score, -a.days_without_action))
        for a in sorted_assessments[:10]:
            ent = a.enterprise
            priority_label = 'Critique' if a.risk_level == 'CRITICAL' else 'Élevée'
            trend_val = {'DOWN': 'En baisse', 'UP': 'En hausse'}.get(a.trend, 'Stable')
            primary_sig = a.risk_reasons[0] if a.risk_reasons else "Aucun signal renseigné"
            timeline_str = f"Dans {a.renewal_days} jours" if a.renewal_days is not None else "Échéance inconnue"

            priority_accounts.append({
                "id": str(ent.id),
                "name": ent.name,
                "priority": priority_label,
                "healthScore": a.health_score,
                "trend": trend_val,
                "primarySignal": primary_sig,
                "renewalTimeline": timeline_str,
                "sector": ent.sector or "Grand Compte",
                "daysWithoutAction": a.days_without_action,
            })

        # Calcul du delta (variation sur la semaine — futur : snapshots réels)
        delta_text = ""
        if high_risk_count > 0:
            delta_text = f"{high_risk_count} compte(s) identifié(s)"

        upsell_subtitle = f"{upsell_count} compte(s) identifié(s)" if upsell_count > 0 else "Aucune opportunité détectée"

        return {
            "summary_cards": {
                "high_risk": {
                    "count": high_risk_count,
                    "delta_text": delta_text,
                    "healthy_count": healthy_count,
                    "surveillance_count": surveillance_count,
                    "total_count": total_accounts
                },
                "renewals": {
                    "count": renewals_count,
                    "subtitle": "Dans les 90 prochains jours"
                },
                "upsell": {
                    "count": upsell_count,
                    "subtitle": upsell_subtitle
                },
                "no_action": {
                    "count": no_action_count,
                    "subtitle": "Depuis plus de 14 jours"
                }
            },
            "milestones": milestones,
            "priority_accounts": priority_accounts
        }

    @classmethod
    def _build_chart_milestones(
        cls,
        enterprises: List[Enterprise],
        current_healthy: int,
        current_surveillance: int,
        current_at_risk: int
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Retourne uniquement le point courant tant que l'historique n'est pas agrégé.
        """
        current = {
            "label": "Aujourd’hui",
            "healthy": current_healthy,
            "surveillance": current_surveillance,
            "atRisk": current_at_risk,
            "retentionRate": None,
        }
        return {period: [current] for period in ("7d", "30d", "90d")}

    @classmethod
    def get_risk_accounts(cls, user) -> List[Dict[str, Any]]:
        """
        Retourne la liste des comptes à risque élevé formatée pour la page /kam/accounts/risk.
        """
        enterprises = list(cls.get_user_enterprises(user))
        cls.ensure_assessments(enterprises)

        results = []
        for ent in enterprises:
            a = getattr(ent, 'churn_assessment', None)
            if not a:
                continue

            if a.health_score < 40 or a.risk_level in ['HIGH', 'CRITICAL']:
                days_since = a.days_without_action
                last_interaction_str = f"Il y a {days_since} jours" if days_since > 0 else "Aujourd'hui"
                timeline_str = f"Dans {a.renewal_days} jours" if a.renewal_days is not None else "Échéance inconnue"
                critical_signals = " • ".join(a.risk_reasons[:2]) if a.risk_reasons else "Aucun signal renseigné"

                results.append({
                    "id": f"risk-{ent.id}",
                    "name": ent.name,
                    "industry": ent.sector or "Télécommunications & Entreprises",
                    "riskLevel": "Critique" if a.health_score < 40 else "Élevé",
                    "healthScore": a.health_score,
                    "criticalSignals": critical_signals,
                    "lastInteraction": last_interaction_str,
                    "renewalTimeline": timeline_str,
                    "accountId": str(ent.id),
                })

        results.sort(key=lambda x: x["healthScore"])
        return results

    @classmethod
    def get_renewals_accounts(cls, user) -> List[Dict[str, Any]]:
        """
        Retourne la liste des renouvellements à surveiller formatée pour la page /kam/accounts/renewals.
        """
        enterprises = list(cls.get_user_enterprises(user))
        cls.ensure_assessments(enterprises)

        results = []
        for ent in enterprises:
            a = getattr(ent, 'churn_assessment', None)
            if not a:
                continue

            # Échéance dans les 90 jours
            if a.is_renewal_imminent or (a.renewal_days is not None and a.renewal_days <= 90):
                end_str = ent.contract_end_date.strftime("%d/%m/%Y") if ent.contract_end_date else "Non renseignée"
                remaining = a.renewal_days if a.renewal_days is not None else 0
                mrr = float(ent.telecom_budget_monthly or 0)

                status_label = "Audit de renouvellement en cours" if remaining < 45 else "Fenêtre de renégociation ouverte"

                results.append({
                    "id": f"ren-{ent.id}",
                    "name": ent.name,
                    "industry": ent.sector or "Services & Industrie",
                    "renewalDate": end_str,
                    "daysRemaining": max(1, remaining),
                    "activeService": ent.current_connectivity or "Non renseigné",
                    "monthlyRevenue": f"{mrr:,.0f} $".replace(",", " ") if mrr else "Non renseigné",
                    "status": status_label,
                    "accountId": str(ent.id),
                })

        results.sort(key=lambda x: x["daysRemaining"])
        return results

    @classmethod
    def get_upsell_accounts(cls, user) -> List[Dict[str, Any]]:
        """
        Retourne la liste des opportunités d'upsell formatée pour la page /kam/accounts/upsell.
        """
        enterprises = list(cls.get_user_enterprises(user))
        cls.ensure_assessments(enterprises)

        results = []
        for ent in enterprises:
            a = getattr(ent, 'churn_assessment', None)
            if not a:
                continue

            opportunities = a.upsell_opportunities or []
            for idx, op in enumerate(opportunities):
                sol_name = op.get("solution", "Non renseignée")
                cat: str = "MULTI_SITES"
                if "fibre" in sol_name.lower() or "1gbps" in sol_name.lower():
                    cat = "CONNECTIVITE"
                elif "cloud" in sol_name.lower() or "soc" in sol_name.lower() or "cyber" in sol_name.lower():
                    cat = "CLOUD_SECURITY"

                results.append({
                    "id": f"up-{ent.id}-{idx}",
                    "name": ent.name,
                    "industry": ent.sector or "Banque & Finance",
                    "recommendedSolution": sol_name,
                    "estimatedPotential": op.get("estimated_value") or "Non renseigné",
                    "strategicAngle": op.get("talking_point") or "Non renseigné",
                    "category": cat,
                    "accountId": str(ent.id),
                })

        return results

    @classmethod
    def get_no_action_accounts(cls, user) -> List[Dict[str, Any]]:
        """
        Retourne la liste des comptes sans prochaine action formatée pour la page /kam/accounts/no-action.
        """
        enterprises = list(cls.get_user_enterprises(user))
        cls.ensure_assessments(enterprises)

        results = []
        for ent in enterprises:
            a = getattr(ent, 'churn_assessment', None)
            if not a:
                continue

            # Inactivité >= 14 jours et pas de prochain RDV
            if a.days_without_action >= 14 and a.next_action_at is None:
                last_date_str = a.last_action_at.strftime("%d/%m/%Y") if a.last_action_at else "01/09/2026"
                contact_stakeholder = ent.contact_name or ent.contact_role or "Direction Générale"
                rec_action = a.retention_plan.get("action") if a.retention_plan else "Planifier un appel d'introduction et audit télécoms"

                results.append({
                    "id": f"na-{ent.id}",
                    "name": ent.name,
                    "industry": ent.sector or "Industrie & Services",
                    "daysWithoutAction": a.days_without_action,
                    "lastContactDate": last_date_str,
                    "lastContactChannel": "Compte-rendu KAM" if a.last_action_at else "Non renseigné",
                    "keyStakeholder": contactStakeholder if (contactStakeholder := contact_stakeholder) else "Décideur IT",
                    "recommendedAction": rec_action,
                    "accountId": str(ent.id),
                })

        results.sort(key=lambda x: -x["daysWithoutAction"])
        return results

    @classmethod
    def get_account_radar_detail(cls, enterprise_id: int) -> Dict[str, Any]:
        """
        Retourne le détail complet du Radar de Churn pour une entreprise spécifique.
        """
        enterprise = Enterprise.objects.filter(id=enterprise_id).first()
        if not enterprise:
            return {"error": f"Entreprise #{enterprise_id} introuvable"}

        assessment = getattr(enterprise, 'churn_assessment', None)
        if not assessment:
            assessment = cls.refresh_account_assessment(enterprise, use_ai=False)

        return {
            "enterprise_id": enterprise.id,
            "enterprise_name": enterprise.name,
            "sector": enterprise.sector,
            "health_score": assessment.health_score,
            "churn_risk_score": assessment.churn_risk_score,
            "risk_level": assessment.risk_level,
            "priority_level": assessment.priority_level,
            "trend": assessment.trend,
            "risk_reasons": assessment.risk_reasons,
            "retention_plan": assessment.retention_plan,
            "upsell_opportunities": assessment.upsell_opportunities,
            "days_without_action": assessment.days_without_action,
            "is_renewal_imminent": assessment.is_renewal_imminent,
            "renewal_days": assessment.renewal_days,
            "last_action_at": assessment.last_action_at.isoformat() if assessment.last_action_at else None,
            "next_action_at": assessment.next_action_at.isoformat() if assessment.next_action_at else None,
            "ai_scored_at": assessment.ai_scored_at.isoformat() if assessment.ai_scored_at else None,
            "rules_version": assessment.rules_version,
        }
