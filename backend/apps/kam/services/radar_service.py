"""
Explainable Risk & Renewal Radar Service
=========================================
Domaine : KAM (PME & Grands Comptes) — Epic 5
Rôle : Moteur de règles déterministe et transparent détectant les risques de churn,
les opportunités de renouvellement et les ruptures d'interaction sans score opaque.
"""

from datetime import timedelta
from typing import Dict, Any, List, Optional
from django.utils import timezone
from sales.models import Enterprise
from kam.models import KamVisitReport, RelationshipCoverage
from kam.services.relationship_service import RelationshipCoverageService


class SignalRuleEvaluator:
    """
    Évalue les comptes sur la base de règles métier déterministes transparentes.
    Chaque signal produit référence la règle, les sources factuelles et l'action recommandée.
    """

    @classmethod
    def evaluate_account_signals(cls, enterprise_id: int) -> Dict[str, Any]:
        enterprise = Enterprise.objects.filter(id=enterprise_id).first()
        if not enterprise:
            return {"error": f"Entreprise #{enterprise_id} introuvable"}

        now = timezone.now()
        today = now.date()
        signals: List[Dict[str, Any]] = []

        # ====================================================================
        # RÈGLE 1 : Échéance Contractuelle (J-180, J-120, J-90)
        # ====================================================================
        if enterprise.contract_end_date:
            days_remaining = (enterprise.contract_end_date - today).days
            if days_remaining <= 90:
                signals.append({
                    "rule_code": "RULE_RENEWAL_URGENT",
                    "severity": "CRITICAL",
                    "title": "Échéance contractuelle imminente (J-90)",
                    "detected_value": f"Contrat concurrent/actuel expire dans {days_remaining} jours",
                    "data_sources": [f"Fiche compte: contract_end_date = {enterprise.contract_end_date.strftime('%d/%m/%Y')}"],
                    "recommended_action": "Initier d'urgence un rendez-vous de reconduction ou contre-proposition avec le décideur économique."
                })
            elif days_remaining <= 120:
                signals.append({
                    "rule_code": "RULE_RENEWAL_ACTIVE",
                    "severity": "WARNING",
                    "title": "Fenêtre de renégociation ouverte (J-120)",
                    "detected_value": f"Contrat expire dans {days_remaining} jours",
                    "data_sources": [f"Fiche compte: contract_end_date = {enterprise.contract_end_date.strftime('%d/%m/%Y')}"],
                    "recommended_action": "Présenter l'offre de modernisation SD-WAN/Fibre Pro et l'analyse comparative de rentabilité."
                })
            elif days_remaining <= 180:
                signals.append({
                    "rule_code": "RULE_RENEWAL_PREPARATION",
                    "severity": "INFO",
                    "title": "Préparation de renouvellement (J-180)",
                    "detected_value": f"Contrat expire dans {days_remaining} jours",
                    "data_sources": [f"Fiche compte: contract_end_date = {enterprise.contract_end_date.strftime('%d/%m/%Y')}"],
                    "recommended_action": "Vérifier la satisfaction des utilisateurs et consolider la mémoire de compte."
                })

        # ====================================================================
        # RÈGLE 2 : Détection Mono-Champion (Point Unique de Défaillance)
        # ====================================================================
        coverage_diag = RelationshipCoverageService.evaluate_account_relationship_coverage(enterprise.id)
        if isinstance(coverage_diag, dict) and coverage_diag.get("is_mono_champion_risk"):
            signals.append({
                "rule_code": "RULE_MONO_CHAMPION",
                "severity": "CRITICAL",
                "title": "Alerte Mono-Champion : Point unique de défaillance",
                "detected_value": f"1 seul champion interne identifié sans acheteur économique couvert",
                "data_sources": [
                    f"Cartographie relationnelle: {coverage_diag.get('champions_count', 0)} champion, {coverage_diag.get('economic_buyers_count', 0)} acheteur",
                    f"Rôles manquants: {', '.join(coverage_diag.get('missing_critical_roles', []))}"
                ],
                "recommended_action": "Multi-threader le compte : solliciter un rendez-vous auprès de la Direction Générale / DAF."
            })

        # ====================================================================
        # RÈGLE 3 : Rupture d'Interaction (> 60 jours sans contact prouvé)
        # ====================================================================
        latest_report = KamVisitReport.objects.filter(enterprise=enterprise).order_by('-created_at').first()
        latest_contact = RelationshipCoverage.objects.filter(
            enterprise=enterprise,
            last_interaction_at__isnull=False
        ).order_by('-last_interaction_at').first()

        last_dates = []
        if latest_report:
            last_dates.append(latest_report.created_at)
        if latest_contact and latest_contact.last_interaction_at:
            last_dates.append(latest_contact.last_interaction_at)

        days_since_contact: Optional[int] = None
        if last_dates:
            most_recent = max(last_dates)
            days_since_contact = (now - most_recent).days
        else:
            days_since_contact = 999  # Jamais contacté

        if days_since_contact > 60:
            signals.append({
                "rule_code": "RULE_INACTIVITY_DECAY",
                "severity": "WARNING",
                "title": "Rupture de relation client (> 60 jours sans contact)",
                "detected_value": f"{days_since_contact if days_since_contact != 999 else 'Aucun'} jours depuis la dernière interaction prouvée",
                "data_sources": [
                    f"Dernier compte-rendu KAM : {latest_report.created_at.strftime('%d/%m/%Y') if latest_report else 'Aucun'}",
                    f"Dernier échange contact : {latest_contact.last_interaction_at.strftime('%d/%m/%Y') if (latest_contact and latest_contact.last_interaction_at) else 'Aucun'}"
                ],
                "recommended_action": "Programmer une visite de courtoisie ou un point d'étape trimestriel avec les équipes opérationnelles."
            })

        # Synthèse globale du niveau de risque
        has_critical = any(s["severity"] == "CRITICAL" for s in signals)
        has_warning = any(s["severity"] == "WARNING" for s in signals)

        if has_critical:
            risk_level = "CRITICAL"
            risk_score = 85
        elif has_warning:
            risk_level = "WARNING"
            risk_score = 55
        elif signals:
            risk_level = "INFO"
            risk_score = 25
        else:
            risk_level = "HEALTHY"
            risk_score = 10

        return {
            "enterprise_id": enterprise.id,
            "enterprise_name": enterprise.name,
            "segment": enterprise.segment,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "signals_count": len(signals),
            "signals": signals,
            "evaluated_at": now.isoformat()
        }
