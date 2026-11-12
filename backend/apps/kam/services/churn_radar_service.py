"""
Churn Radar & Upsell Business Service
=====================================
Domaine : KAM (Portefeuille Grands Comptes & PME)
Rôle : Moteur de scoring déterministe auditable (health_score 0-100) enrichi par Core AI
(explicabilité, plan d'action de rétention, catalogue Orange Business).
"""

from __future__ import annotations

import logging
from types import SimpleNamespace
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from django.utils import timezone
from django.db.models import Q, Prefetch, Count
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

        # 1. RÈGLE : Échéance contractuelle (vérifie le contrat global et le parc d'offres installées)
        target_end_date = enterprise.contract_end_date
        installed_offers = list(getattr(enterprise, 'installed_offers', []).all()) if hasattr(enterprise, 'installed_offers') else []
        for offer in installed_offers:
            if offer.contract_status == 'ACTIVE' and offer.contract_end_date:
                if not target_end_date or offer.contract_end_date < target_end_date:
                    target_end_date = offer.contract_end_date

        if target_end_date:
            days_until_end = (target_end_date - today).days
            renewal_days = days_until_end
            if days_until_end <= 30:
                score -= 25
                is_renewal_imminent = True
                reasons.append(f"Contrat expirant dans {max(0, days_until_end)} jours (< 30 jours)")
            elif days_until_end <= 90:
                score -= 15
                is_renewal_imminent = True
                reasons.append(f"Contrat arrivant à échéance dans {days_until_end} jours (< 90 jours)")

        # 2. RÈGLE : Incidents et tickets non résolus
        incidents = int(enterprise.incident_count or 0)
        offer_tickets = sum(int(o.unresolved_tickets_count or 0) for o in installed_offers)
        total_incidents = incidents + offer_tickets
        if total_incidents > 0:
            deduction = min(total_incidents * 15, 30)
            score -= deduction
            reasons.append(f"{total_incidents} incident(s) / ticket(s) réseau non résolu(s) signalés")

        # 2.bis RÈGLE : Comportement de paiement CRM certifié
        crm_record = getattr(enterprise, 'crm_record', None)
        if crm_record and crm_record.payment_health:
            if crm_record.payment_health == 'CONTENTIEUX':
                score -= 35
                reasons.append("Compte en contentieux / recouvrement dans le CRM")
            elif crm_record.payment_health == 'RETARD_60J':
                score -= 20
                reasons.append("Retard de paiement critique (> 60 jours) signalé par le CRM")
            elif crm_record.payment_health == 'RETARD_30J':
                score -= 10
                reasons.append("Retard de paiement (< 30 jours) signalé par le CRM")

        # 3. RÈGLE : Insatisfaction client dans les rapports ou niveau de douleur
        pain = getattr(enterprise, 'pain_level', '')
        has_pain = pain in ['HIGH', 'CRITICAL', 'Critique']
        if not has_pain:
            # Vérification des derniers rapports de visite
            recent_reports = getattr(enterprise, 'radar_recent_reports', None)
            if recent_reports is None:
                recent_reports = enterprise.kam_visit_reports.all()[:3]
            for rep in recent_reports:
                notes = (rep.executive_summary or rep.raw_transcript or '').lower()
                if any(w in notes for w in ['insatisfaction', 'mécontent', 'panne', 'coupure', 'rupture', 'dégradation', 'litige']):
                    has_pain = True
                    break

        if has_pain:
            score -= 15
            reasons.append("Insatisfaction client ou signaux de friction opérationnelle détectés")

        # 4. RÈGLE : Rupture d'interaction / Inactivité
        last_action_date: Optional[datetime] = None
        latest_report = (enterprise.radar_recent_reports[0] if enterprise.radar_recent_reports else None) if hasattr(enterprise, 'radar_recent_reports') else enterprise.kam_visit_reports.order_by('-created_at').first()
        if latest_report:
            last_action_date = latest_report.created_at

        # Vérification des rendez-vous passés
        past_appt = (enterprise.radar_past_appointments[0] if enterprise.radar_past_appointments else None) if hasattr(enterprise, 'radar_past_appointments') else enterprise.kam_appointments.filter(scheduled_at__lte=now).order_by('-scheduled_at').first()
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
        next_appt = (enterprise.radar_next_appointments[0] if enterprise.radar_next_appointments else None) if hasattr(enterprise, 'radar_next_appointments') else enterprise.kam_appointments.filter(scheduled_at__gte=now).order_by('scheduled_at').first()
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
        use_ai: bool = False,
        use_analysis_service: bool = False
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

        # Enrichissement via Onbora Analysis si demandé
        if use_analysis_service and (not upsell_opportunities or not retention_plan):
            try:
                from apps.ai_core.company_analysis.service import CompanyAnalysisClient
                analysis_client = CompanyAnalysisClient()
                analysis = analysis_client.get_analysis_for_enterprise(
                    company_name=enterprise.name,
                    sector=enterprise.sector,
                    rccm=getattr(enterprise, 'rccm', None),
                    province=getattr(enterprise, 'city', None) or 'Kinshasa',
                    site_count=getattr(enterprise, 'site_count', 1),
                )
                if not upsell_opportunities and analysis.upsell_opportunities:
                    upsell_opportunities = analysis.upsell_opportunities
                if not retention_plan and analysis.churn_risk and analysis.churn_risk.get("retention_plan"):
                    retention_plan = analysis.churn_risk["retention_plan"]
                if analysis.churn_risk and analysis.churn_risk.get("signals"):
                    for sig in analysis.churn_risk["signals"]:
                        if sig not in det["risk_reasons"]:
                            det["risk_reasons"].append(sig)
            except Exception as exc:
                logger.debug("[ChurnRadarService] Enrichissement onbora-analysis non disponible: %s", exc)

        # L'analyse externe est uniquement déclenchée sur demande explicite.
        if use_ai:
            try:
                from apps.ai_core.churn_radar.service import ChurnRadarEngine
                from apps.ai_core.churn_radar.models import ChurnRadarInput

                notes_list = [f"Secteur: {enterprise.sector or 'B2B'}", f"Opérateur actuel: {enterprise.current_operator or 'Non renseigné'}"]
                for r in enterprise.kam_visit_reports.all()[:2]:
                    if r.executive_summary:
                        notes_list.append(f"Rapport: {r.executive_summary}")
                notes = "\n".join(notes_list)

                installed_names = [o.installed_offer_name for o in enterprise.installed_offers.filter(contract_status='ACTIVE')] if hasattr(enterprise, 'installed_offers') else []
                current_services = installed_names if installed_names else ([enterprise.current_connectivity] if enterprise.current_connectivity else ["Fibre Pro standard"])

                inp = ChurnRadarInput(
                    company_name=enterprise.name,
                    current_services=current_services,
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

        now = timezone.now()
        return qs.select_related('churn_assessment', 'crm_record').prefetch_related(
            'installed_offers',
            Prefetch('kam_visit_reports', queryset=KamVisitReport.objects.only(
                'enterprise_id', 'created_at', 'executive_summary', 'raw_transcript'
            ).order_by('-created_at')[:3], to_attr='radar_recent_reports'),
            Prefetch('kam_appointments', queryset=KamAppointment.objects.only(
                'enterprise_id', 'scheduled_at'
            ).filter(scheduled_at__lte=now).order_by('-scheduled_at')[:1], to_attr='radar_past_appointments'),
            Prefetch('kam_appointments', queryset=KamAppointment.objects.only(
                'enterprise_id', 'scheduled_at'
            ).filter(scheduled_at__gte=now).order_by('scheduled_at')[:1], to_attr='radar_next_appointments'),
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
        # Reads never regenerate assessments or write snapshots.
        assessments = [getattr(ent, 'churn_assessment', None) or SimpleNamespace(
            enterprise=ent, trend='STABLE', upsell_opportunities=[],
            **cls.calculate_deterministic_health_score(ent)
        ) for ent in enterprises]
        total_accounts = len(enterprises)
        high_risk_list = [a for a in assessments if a.risk_level in ['HIGH', 'CRITICAL'] or a.health_score < 40]
        surveillance_list = [a for a in assessments if a not in high_risk_list and a.health_score < 70]
        healthy_list = [a for a in assessments if a not in high_risk_list and a.health_score >= 70]

        high_risk_count = len(high_risk_list)
        surveillance_count = len(surveillance_list)
        healthy_count = len(healthy_list)

        renewals_list = [a for a in assessments if a.is_renewal_imminent or (a.renewal_days is not None and a.renewal_days <= 90)]
        renewals_count = len(renewals_list)

        from .portfolio_upsell_count import count_portfolio_upsells
        upsell_count = count_portfolio_upsells(enterprises)
        no_action_list = [a for a in assessments if a.days_without_action >= 14 and a.next_action_at is None]
        no_action_count = len(no_action_list)

        # Calcul des nouveaux comptes potentiels (prospects, récemment ajoutés, opérateurs tiers)
        new_potentials_count = 0
        for ent in enterprises:
            is_recent = bool(ent.assigned_at and (timezone.now() - ent.assigned_at).total_seconds() < 86400 * 3)
            is_conquest = ent.conversion_status in ['LEAD', 'CONTACTED'] or (
                ent.current_operator and 'orange' not in ent.current_operator.lower()
            )
            if is_recent or is_conquest:
                new_potentials_count += 1

        from kam.models import B2BNewsFeedItem
        news_counts = B2BNewsFeedItem.objects.aggregate(
            discoveries=Count('pk', filter=Q(is_web_discovery=True, is_converted_to_portfolio=False)),
            signals=Count('pk', filter=Q(enterprise_id__in=[ent.pk for ent in enterprises]) | Q(is_web_discovery=True)),
        )
        new_potentials_count += news_counts['discoveries']
        signals_count = news_counts['signals']

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
                "b2b_accounts": {
                    "count": total_accounts,
                    "subtitle": "Portefeuille actif sous gestion",
                    "new_potentials_count": new_potentials_count,
                    "signals_count": signals_count,
                },
                "high_risk": {
                    "count": high_risk_count,
                    "delta_text": delta_text,
                    "healthy_count": healthy_count,
                    "surveillance_count": surveillance_count,
                    "total_count": total_accounts,
                    "b2b_count": total_accounts,
                    "new_potentials_count": new_potentials_count,
                    "signals_count": signals_count,
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
        Retourne la liste des opportunités d'upsell pour /kam/accounts/upsell.
        Couvre les 2 sources requises :
        1. COMPARATEUR : Comptes dont le compte de référence / benchmark sectoriel
           affiche un score supérieur au leur (score_ref > score_compte).
           => Redirection vers le Comparateur (/kam/briefing?id=...&tab=compare).
        2. SIGNAUX : Comptes dont les signaux d'actualité (croissance, tech, incidents)
           indiquent une opportunité d'upsell active.
           => Redirection vers les Signaux (/kam/briefing?id=...&tab=news).
        """
        enterprises = list(cls.get_user_enterprises(user))
        cls.ensure_assessments(enterprises)

        results: List[Dict[str, Any]] = []

        from kam.models import B2BNewsFeedItem
        from .enterprise_comparison_service import EnterpriseComparisonService

        for ent in enterprises:
            ent_has_upsell = False

            # --- SOURCE 1 : COMPARATEUR (Score supérieur du pair de référence) ---
            try:
                peers = EnterpriseComparisonService.get_sector_peers_by_sizing(ent)
                my_scores = EnterpriseComparisonService._compute_enterprise_scores(ent)
                my_overall = my_scores.get('overall_score', 0)
                higher_peers = [p for p in peers if p.get('overall_score', 0) > my_overall]

                if higher_peers:
                    ref_peer = higher_peers[0]
                    comp = EnterpriseComparisonService.compare(ent.id, ref_peer['id'])
                    ref_score = comp.get('overall_score_b', ref_peer.get('overall_score', 0))
                    ref_name = comp.get('meta_b', {}).get('name', ref_peer.get('name', 'Pair de référence'))

                    kam_recomms = [
                        r for r in comp.get('kam_recommendations', [])
                        if r.get('target_id') == ent.id or r.get('target_enterprise') == ent.name
                    ]
                    if not kam_recomms and comp.get('kam_recommendations'):
                        kam_recomms = comp.get('kam_recommendations')

                    if kam_recomms:
                        sol_title = kam_recomms[0].get('solution_title', 'Montée en débit Fibre Dédiée 1 Gbps (LSI)')
                        pitch = kam_recomms[0].get(
                            'pitch_argument',
                            f"Le compte de référence {ref_name} affiche un score de {ref_score}/100 contre {my_overall}/100."
                        )
                    elif comp.get('gaps_a'):
                        top_gap = comp.get('gaps_a')[0]
                        sol_title = top_gap.get('solution_recommended', 'Liaison Sécurisée & Redondance')
                        pitch = f"Écart de maturité réseau : {top_gap.get('issue')}. Le pair de référence ({ref_name}) affiche {ref_score}/100 vs {my_overall}/100."
                    else:
                        sol_title = 'Montée en débit Fibre Dédiée 1 Gbps (LSI)'
                        pitch = f"Le compte de référence {ref_name} affiche un score de {ref_score}/100 contre {my_overall}/100 pour ce compte."

                    cat = "CONNECTIVITE"
                    if "fibre" in sol_title.lower() or "1gbps" in sol_title.lower() or "lsi" in sol_title.lower() or "débit" in sol_title.lower():
                        cat = "CONNECTIVITE"
                    elif "cloud" in sol_title.lower() or "soc" in sol_title.lower() or "cyber" in sol_title.lower():
                        cat = "CLOUD_SECURITY"
                    else:
                        cat = "MULTI_SITES"

                    results.append({
                        "id": f"up-comp-{ent.id}",
                        "name": ent.name,
                        "industry": ent.sector or "Services & Industrie",
                        "recommendedSolution": sol_title,
                        "estimatedPotential": "+3 500 $ / mois",
                        "strategicAngle": pitch,
                        "category": cat,
                        "accountId": str(ent.id),
                        "source": "COMPARATEUR",
                        "sourceLabel": "Comparateur sectoriel",
                        "sourceDetail": f"{ref_name} ({ref_score}/100 vs {my_overall}/100)",
                        "referenceAccountName": ref_name,
                        "referencePeerId": ref_peer.get('id'),
                        "scoreAccount": my_overall,
                        "scoreReference": ref_score,
                        "actionLabel": "Voir dans le comparateur",
                        "targetUrl": f"/kam/briefing?id={ent.id}&tab=compare&peer={ref_peer.get('id')}",
                    })
                    ent_has_upsell = True
            except Exception as exc:
                logger.debug("[ChurnRadarService] Erreur détection upsell comparateur pour %s: %s", ent.name, exc)

            # --- SOURCE 2 : SIGNAUX (Actualités d'expansion, tech, incidents) ---
            try:
                news_items = list(B2BNewsFeedItem.objects.filter(
                    Q(enterprise=ent) | Q(discovered_company_name__iexact=ent.name)
                ).exclude(category='NEW_ACCOUNT', signal_score=0).order_by('-published_at')[:2])

                for n in news_items:
                    sol_title = n.recommended_offer or "Liaison Sécurisée & Cloud B2B"
                    pitch = n.commercial_angle or n.summary or "Signal d'expansion stratégique détecté."
                    cat = "CONNECTIVITE"
                    if "fibre" in sol_title.lower() or "vsat" in sol_title.lower():
                        cat = "CONNECTIVITE"
                    elif "cloud" in sol_title.lower() or "cyber" in sol_title.lower():
                        cat = "CLOUD_SECURITY"
                    else:
                        cat = "MULTI_SITES"

                    results.append({
                        "id": f"up-sig-{ent.id}-{n.id}",
                        "name": ent.name,
                        "industry": ent.sector or "Services & Industrie",
                        "recommendedSolution": sol_title,
                        "estimatedPotential": "+2 800 $ / mois",
                        "strategicAngle": pitch,
                        "category": cat,
                        "accountId": str(ent.id),
                        "source": "SIGNAUX",
                        "sourceLabel": "Signal d’actualité",
                        "sourceDetail": n.title,
                        "signalId": str(n.id),
                        "actionLabel": "Voir le signal d'actualité",
                        "targetUrl": f"/kam/briefing?id={ent.id}&tab=news",
                    })
                    ent_has_upsell = True
            except Exception as exc:
                logger.debug("[ChurnRadarService] Erreur détection upsell signaux pour %s: %s", ent.name, exc)

            # Si aucune opportunité détectée via comparateur ou signaux, repli sur l'évaluation existante
            if not ent_has_upsell:
                a = getattr(ent, 'churn_assessment', None)
                if a and a.upsell_opportunities:
                    for idx, op in enumerate(a.upsell_opportunities):
                        sol_name = op.get("solution", "Non renseignée")
                        cat = "MULTI_SITES"
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
                            "source": "COMPARATEUR",
                            "sourceLabel": "Opportunité de compte",
                            "sourceDetail": "Catalogue Orange Business",
                            "actionLabel": "Voir le compte",
                            "targetUrl": f"/kam/briefing?id={ent.id}",
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
