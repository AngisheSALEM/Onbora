from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from django.conf import settings

from .common.base_engine import BaseAIEngine
from .pre_call.service import PreCallIntelligenceEngine
from .pre_call.models import PreCallInput
from .company_analysis.service import CompanyAnalysisClient
from .post_call.service import PostCallExecutionEngine
from .post_call.models import PostCallInput
from .sales_enrichment.service import SalesEnrichmentEngine
from .sales_enrichment.models import SalesEnrichmentInput
from .lead_scoring.service import B2BLeadScoringEngine
from .lead_scoring.models import LeadScoringInput
from .churn_radar.service import ChurnRadarEngine
from .churn_radar.models import ChurnRadarInput

logger = logging.getLogger(__name__)


class UnifiedCoreAIEngine:
    """
    Facade unifiee d'orchestration pour Onbora Core AI.
    Centralise l'acces aux moteurs specialises modulaires :
    1. PreCallIntelligenceEngine   (briefing avant RDV)
    2. PostCallExecutionEngine     (compte-rendu, mail et CRM post-RDV)
    3. SalesEnrichmentEngine       (hypotheses et analyse scraping terrain)
    4. B2BLeadScoringEngine        (hierarchisation du pipeline)
    5. ChurnRadarEngine            (detection d'attrition et retention)
    """

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or getattr(settings, 'GEMINI_API_KEY', '')
        self.model_name = model_name or getattr(settings, 'GEMINI_MODEL', 'gemini-3.6-flash')
        if 'gemini-2.5' in self.model_name:
            self.model_name = 'gemini-3.6-flash'

        # Instanciation modulaire propre
        self.base_engine = BaseAIEngine(api_key=self.api_key, model_name=self.model_name)
        self.pre_call_engine = PreCallIntelligenceEngine(api_key=self.api_key, model_name=self.model_name)
        self.post_call_engine = PostCallExecutionEngine(api_key=self.api_key, model_name=self.model_name)
        self.sales_enrichment_engine = SalesEnrichmentEngine(api_key=self.api_key, model_name=self.model_name)
        self.lead_scoring_engine = B2BLeadScoringEngine(api_key=self.api_key, model_name=self.model_name)
        self.churn_radar_engine = ChurnRadarEngine(api_key=self.api_key, model_name=self.model_name)
        self.company_analysis_client = CompanyAnalysisClient()

    @property
    def _client(self):
        """Propriete de compatibilite avec les inspections d'etat."""
        return self.base_engine._client

    def _call_gemini_json(self, prompt: str, system_instruction: str = "") -> Optional[Dict[str, Any]]:
        """Delegation directe au moteur commun d'inférence."""
        return self.base_engine.call_gemini_json(prompt, system_instruction=system_instruction)

    # -------------------------------------------------------------------------
    # 1. PRE-CALL BRIEFING (ONBORA ANALYSIS PROVISIONING)
    # -------------------------------------------------------------------------
    def generate_pre_call_briefing(self, enterprise: Any, kam_user: Any) -> dict:
        """
        Génère le brief de pré-visite selon le nouveau paradigme Onbora Analysis,
        en interrogeant le service externe sur le port 8001 avec fallback résilient.
        """
        analysis_brief = self.company_analysis_client.get_analysis_for_enterprise(
            company_name=enterprise.name,
            sector=getattr(enterprise, 'sector', None),
            rccm=getattr(enterprise, 'rccm', None),
            province=getattr(enterprise, 'city', None) or "Kinshasa",
            dossier_number=getattr(enterprise, 'crm_id', None),
            site_count=getattr(enterprise, 'site_count', 1),
        )
        res = analysis_brief.model_dump()

        # Rétro-compatibilité ascendante pour préserver l'intégrité DB et les vues historiques
        ai_sum = res.get("ai_summary", {})
        overview_text = ai_sum.get("overview", {}).get("text", "")
        challenges = [contra.get("text", "") for contra in ai_sum.get("contradictions", [])] + ai_sum.get("gaps", [])

        journeys = res.get("lead_qualification", {}).get("journeys", [])
        pitch_angles = []
        questions = []
        for j in journeys:
            for off in j.get("offers", []):
                pitch_angles.append({
                    "target_offer": off.get("name", "Offre Orange Business"),
                    "why_relevant": j.get("reason", "Pertinence commerciale avérée sur preuves."),
                    "hook_sentence": j.get("next_question", "") or "Comment vos sites communiquent-ils aujourd'hui ?"
                })
            if j.get("next_question"):
                questions.append(j.get("next_question"))

        rev = float(getattr(enterprise, 'annual_revenue', 50000.0) or 50000.0)
        res["company_overview"] = {
            "company_name": enterprise.name,
            "summary": overview_text or f"Entreprise {enterprise.name} ({enterprise.sector or 'Services'}).",
            "estimated_employees": "50-200 collaborateurs",
            "digital_maturity": "HIGH" if res.get("identity_status") == "confirmed" else "MEDIUM",
            "annual_revenue_usd": f"{rev:,.0f} USD",
            "estimated_sites": getattr(enterprise, 'site_count', 1) or 1,
            "telecom_budget_monthly_usd": round(rev * 0.015 / 12, 2)
        }
        res["key_decision_makers"] = [
            {
                "role": "Direction Générale & Décideur Agréé",
                "name": getattr(enterprise, 'contact_name', '') or "Direction",
                "profile_type": "Stratégie & ROI",
                "concerns": "Sécurisation des opérations et conformité ARSP.",
                "influence": "HIGH"
            }
        ]
        res["detected_business_challenges"] = challenges or [
            "Fiabilisation des flux de données et continuité de service",
            "Sécurisation des liaisons inter-sites et agences"
        ]
        res["custom_pitch_angles"] = pitch_angles or [
            {
                "target_offer": "Fibre Sécurisée Dédiée Pro (GTR 4h)",
                "why_relevant": "Garantit zéro coupure avec SLA 99.99%.",
                "hook_sentence": "Quel est l'impact financier d'une rupture de connexion pour vos opérations ?"
            }
        ]
        res["critical_discovery_questions"] = questions or [
            "Quelle est la criticité de votre connexion internet au quotidien pour la facturation ?",
            "Disposez-vous d'une ligne de secours active qui bascule sans coupure ?"
        ]
        res["golden_rules"] = [
            f"Ne jamais dénigrer directement {getattr(enterprise, 'current_operator', None) or 'le concurrent'} : valoriser nos engagements SLA 99.99% et notre GTR 4h signée.",
            "Faire verbaliser la douleur financière avant d'aborder tout chiffre ou prix.",
            "Valider la concordance des éléments ARSP et registres OHADA dès les premières minutes de l'entretien."
        ]
        return res

    def resynthesize_briefing(
        self,
        enterprise_name: str,
        key_facts: list,
        contradictions: list,
        gaps: list,
        current_overview: str = "",
        current_solutions: list = None
    ) -> dict:
        """
        Regénère dynamiquement la synthèse exécutive et recalcule les solutions Orange Business
        recommandées suite aux modifications / ajouts manuels effectués par le KAM.
        """
        key_facts_str = "\n".join([f"- {f}" for f in key_facts]) if key_facts else "Non spécifié."
        contradictions_str = "\n".join([f"- {c}" for c in contradictions]) if contradictions else "Aucune."
        gaps_str = "\n".join([f"- {g}" for g in gaps]) if gaps else "Aucune."

        system_instruction = (
            "Tu es le moteur Core AI d'Orange Business RDC. Tu assistes les Key Account Managers (KAM). "
            "À partir des faits vérifiés, contradictions et manques renseignés, produis une synthèse commerciale "
            "exécutive percutante (1 à 2 paragraphes continus, sans puces ni tirets) et sélectionne 2 à 4 "
            "solutions Orange Business RDC parfaitement ciblées. "
            "Réponds UNIQUEMENT en JSON valide avec les clés 'overview' et 'recommended_solutions'."
        )

        prompt = (
            f"Entreprise : {enterprise_name}\n\n"
            f"Faits vérifiés :\n{key_facts_str}\n\n"
            f"Contradictions & Points de vigilance :\n{contradictions_str}\n\n"
            f"Informations manquantes / Enjeux :\n{gaps_str}\n\n"
            "Format JSON attendu :\n"
            "{\n"
            '  "overview": "Texte complet de la synthèse réactualisée...",\n'
            '  "recommended_solutions": [\n'
            '    {\n'
            '      "name": "Nom de la solution Orange",\n'
            '      "category": "Connectivité / Réseaux / Cyber / Cloud / Monétique",\n'
            '      "description": "Explication claire de la valeur pour le client",\n'
            '      "sla": "SLA 99.9% · GTR 4h"\n'
            '    }\n'
            '  ]\n'
            "}"
        )

        try:
            ai_res = self._call_gemini_json(prompt, system_instruction=system_instruction)
            if ai_res and isinstance(ai_res, dict) and ai_res.get("overview"):
                solutions = ai_res.get("recommended_solutions", [])
                if isinstance(solutions, list) and len(solutions) > 0:
                    return {
                        "overview": ai_res["overview"].strip(),
                        "recommended_solutions": solutions
                    }
                return {
                    "overview": ai_res["overview"].strip(),
                    "recommended_solutions": current_solutions or []
                }
        except Exception:
            pass

        return self._fallback_resynthesize(enterprise_name, key_facts, contradictions, gaps, current_overview, current_solutions)

    def _fallback_resynthesize(
        self,
        enterprise_name: str,
        key_facts: list,
        contradictions: list,
        gaps: list,
        current_overview: str = "",
        current_solutions: list = None
    ) -> dict:
        """Génération locale intelligente de repli pour la synthèse et les solutions adaptées."""
        facts_summary = " ".join([f.rstrip('.') + '.' for f in key_facts[:3]]) if key_facts else ""
        vigilance_summary = f" Une attention spécifique doit être portée sur : {'; '.join(contradictions[:2])}." if contradictions else ""
        gaps_summary = f" L'entretien ciblera en priorité la clarification de : {', '.join(gaps[:2])}." if gaps else ""

        overview = f"{enterprise_name} présente une dynamique commerciale active. {facts_summary}{vigilance_summary}{gaps_summary}"
        if not overview.strip():
            overview = current_overview or f"{enterprise_name} : acteur stratégique nécessitant une infrastructure de connectivité et de sécurité résiliente."

        # Détection contextuelle des solutions adaptées
        full_context = f"{enterprise_name} {' '.join(key_facts)} {' '.join(contradictions)} {' '.join(gaps)}".lower()
        solutions = []

        # 1. Connectivité dédiée (socle obligatoire)
        solutions.append({
            "name": "Fibre Dédiée Pro 100 Mbps",
            "category": "Connectivité",
            "description": "Liaison symétrique sécurisée avec débit garanti et supervision proactive 24/7.",
            "sla": "SLA 99.9% · GTR 4h"
        })

        # 2. Multi-sites / SD-WAN
        if any(w in full_context for w in ["site", "agence", "filiale", "réseau", "katanga", "lubumbashi", "goma"]):
            solutions.append({
                "name": "SD-WAN Managé Multi-Sites",
                "category": "Réseaux",
                "description": "Interconnexion résiliente avec routage applicatif intelligent et chiffrement IPsec.",
                "sla": "Supervision 24/7"
            })

        # 3. Cybersécurité & Vigilance
        if any(w in full_context for w in ["sécurité", "fraude", "vigilance", "usurpation", "cyber", "fuite", "banque", "rccm"]):
            solutions.append({
                "name": "CyberSOC 24/7 & Firewall Managé",
                "category": "Cybersécurité",
                "description": "Protection périmétrique avancée, filtrage des menaces et détection d'intrusions.",
                "sla": "Alerte < 15 min"
            })

        # 4. Monétique / Paiements
        if any(w in full_context for w in ["banque", "finance", "paiement", "monnaie", "salaire", "collecte"]):
            solutions.append({
                "name": "Orange Money B2B & API Bulk Payments",
                "category": "Monétique",
                "description": "Paiement de salaires en masse et encaissement sécurisé par API.",
                "sla": "Disponibilité 99.9%"
            })

        # S'il n'y a que 1 ou 2 solutions, ajouter le Cloud
        if len(solutions) < 3:
            solutions.append({
                "name": "Cloud Backup Datacenter Kinshasa",
                "category": "Cloud & Hébergement",
                "description": "Sauvegarde automatique et hébergement souverain en Datacenter Tier III.",
                "sla": "RPO 1h · RTO 2h"
            })

        return {
            "overview": overview.strip(),
            "recommended_solutions": solutions
        }

    # -------------------------------------------------------------------------
    # 2. POST-CALL EXECUTION
    # -------------------------------------------------------------------------
    def generate_post_call_execution(self, enterprise: Any, kam_user: Any, meeting_transcript: str) -> dict:
        kam_name = kam_user.get_full_name() or kam_user.username if kam_user else "Commercial"
        inp = PostCallInput(
            kam_name=kam_name,
            client_name=enterprise.contact_name or "Direction",
            client_role=enterprise.contact_role or "DSI",
            company_name=enterprise.name,
            meeting_transcript=meeting_transcript or f"Entretien commercial avec {enterprise.name}."
        )
        out = self.post_call_engine.generate(inp)
        res = out.model_dump()
        # Normalisation pour retro-compatibilite avec les vues KAM
        rev = float(getattr(enterprise, 'annual_revenue', 50000) or 50000)
        res["crm_payload"]["deal_size_estimate_usd"] = round(rev * 0.012, 2)
        res["crm_payload"]["account_name"] = enterprise.name
        return res

    # -------------------------------------------------------------------------
    # 3. SALES HYPOTHESES & ENRICHMENT
    # -------------------------------------------------------------------------
    def generate_sales_hypotheses(
        self,
        company_name: str,
        sector: str = "Services B2B",
        website: Optional[str] = None,
        scraped_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        inp = SalesEnrichmentInput(
            company_name=company_name,
            sector=sector,
            website=website,
            scraped_data=scraped_data or {}
        )
        out = self.sales_enrichment_engine.generate(inp)
        return out.model_dump()

    # -------------------------------------------------------------------------
    # 4. POST-VISIT REPORT
    # -------------------------------------------------------------------------
    def generate_post_visit_report(
        self,
        full_transcript: str,
        enterprise_name: str,
        prep_objective: str = "",
        salesperson_name: str = "Commercial Terrain"
    ) -> Dict[str, Any]:
        inp = PostCallInput(
            kam_name=salesperson_name,
            client_name="Direction",
            client_role="Décideur",
            company_name=enterprise_name,
            meeting_transcript=full_transcript or f"Objectif : {prep_objective}"
        )
        out = self.post_call_engine.generate(inp)
        return {
            "executive_summary": out.executive_summary,
            "confirmed_needs": out.confirmed_needs,
            "objections_raised": out.objections_raised,
            "actions_todo": [t.task for t in out.action_tasks],
            "follow_up_email": out.client_followup_email.body
        }

    # -------------------------------------------------------------------------
    # 5. LEAD SCORING B2B & CHURN RADAR DATA EXTRACTOR
    # -------------------------------------------------------------------------
    def _extract_enterprise_notes(self, enterprise: Any) -> str:
        """Consolide l'ensemble des retours terrain, comptes-rendus et observations sur le compte."""
        notes = []
        if getattr(enterprise, 'conversion_notes', None):
            notes.append(f"Notes commerciales : {enterprise.conversion_notes}")
        
        # Rapports KAM récents
        if hasattr(enterprise, 'kam_visit_reports'):
            try:
                reports = sorted(enterprise.kam_visit_reports.all(), key=lambda x: x.created_at, reverse=True)[:3]
                for r in reports:
                    part = f"Rapport KAM ({r.created_at.strftime('%d/%m/%Y')}) : {r.executive_summary or ''}"
                    if r.confirmed_needs:
                        part += f" | Besoins : {', '.join(r.confirmed_needs)}"
                    if r.objections_raised:
                        part += f" | Objections : {', '.join(r.objections_raised)}"
                    notes.append(part)
            except Exception:
                pass

        # Retours terrain commerciaux SOHO
        if hasattr(enterprise, 'field_intelligence_reports'):
            try:
                firs = sorted(enterprise.field_intelligence_reports.all(), key=lambda x: x.created_at, reverse=True)[:2]
                for fir in firs:
                    if fir.nurturing_notes:
                        notes.append(f"Feedback terrain : {fir.nurturing_notes}")
            except Exception:
                pass

        # Briefing pre-call existant
        if hasattr(enterprise, 'pre_call_briefings'):
            try:
                briefings = sorted(enterprise.pre_call_briefings.all(), key=lambda x: x.created_at, reverse=True)
                if briefings and briefings[0].detected_business_challenges:
                    notes.append(f"Défis business identifiés : {', '.join(briefings[0].detected_business_challenges)}")
            except Exception:
                pass

        return "\n".join(notes) if notes else "Compte suivi par l'équipe commerciale Orange Business B2B."

    def evaluate_lead_scoring(self, enterprise: Any) -> dict:
        rev = float(getattr(enterprise, 'annual_revenue', 0) or 0)
        telecom_budget = float(getattr(enterprise, 'telecom_budget_monthly', 0) or (rev * 0.015 / 12 if rev > 0 else 2500.0))
        budget_label = getattr(enterprise, 'budget_status', '') or 'Non précisé'
        if budget_label != 'Non précisé':
            budget_str = f"{budget_label} (Budget mensuel estimé : {telecom_budget:,.0f} USD, CA annuel : {rev:,.0f} USD)"
        else:
            budget_str = f"CA annuel : {rev:,.0f} USD, Budget télécom mensuel estimé : {telecom_budget:,.0f} USD"

        # Échéance du contrat concurrent
        contract_end = getattr(enterprise, 'contract_end_date', None)
        if contract_end:
            expiry_str = f"Échéance au {contract_end.strftime('%d/%m/%Y')}"
        else:
            expiry_str = "Non renseignée"

        # Décideur impliqué
        contact_name = getattr(enterprise, 'contact_name', '') or ''
        contact_role = (getattr(enterprise, 'contact_role', '') or '').upper()
        decision_maker = bool(contact_name) and any(
            t in contact_role for t in ['DG', 'DIRECTEUR', 'DSI', 'DAF', 'GÉRANT', 'GERANT', 'HEAD', 'VP', 'CIO', 'CEO']
        )

        raw_notes = self._extract_enterprise_notes(enterprise)
        curr_op = getattr(enterprise, 'current_operator', 'Non renseigné') or 'Non renseigné'
        curr_conn = getattr(enterprise, 'current_connectivity', 'N/A') or 'N/A'
        pain = getattr(enterprise, 'pain_level', 'Modéré') or 'Modéré'
        incidents = getattr(enterprise, 'incident_count', 0) or 0

        extended_notes = f"{raw_notes}\n[Contexte Télécoms] Opérateur actuel : {curr_op} ({curr_conn}). Niveau de frustration : {pain}. Incidents non résolus : {incidents}."

        inp = LeadScoringInput(
            company_name=enterprise.name,
            sector=getattr(enterprise, 'sector', 'Services B2B') or "Services B2B",
            locations_count=getattr(enterprise, 'site_count', 1) or 1,
            budget_status=budget_str,
            pain_level=pain,
            competitor_contract_expiry=expiry_str,
            decision_maker_involved=decision_maker,
            raw_notes=extended_notes
        )
        out = self.lead_scoring_engine.evaluate(inp)
        res = out.model_dump()

        # Normalisation pour le frontend et le KAM Office
        tier = res.get("scoring_tier", "TIER_2_PROSPECT")
        if tier == "TIER_2_MEDIUM":
            tier = "TIER_2_PROSPECT"
        res["scoring_tier"] = tier

        formatted_drivers = []
        for d in res.get("score_drivers", []):
            formatted_drivers.append({
                "factor": d.get("factor", ""),
                "points": d.get("impact", "+10 pts"),
                "positive": d.get("type", "POSITIVE") == "POSITIVE",
            })
        res["score_drivers"] = formatted_drivers
        res["estimated_mrr_usd"] = round(telecom_budget, 2)
        res["recommended_approach"] = res.get("recommended_sales_angle", "")
        return res

    # -------------------------------------------------------------------------
    # 6. CHURN RADAR & RETENTION
    # -------------------------------------------------------------------------
    def analyze_churn_radar(self, enterprise: Any) -> dict:
        rev = float(getattr(enterprise, 'annual_revenue', 0) or 0)
        telecom_budget = float(getattr(enterprise, 'telecom_budget_monthly', 0) or (rev * 0.015 / 12 if rev > 0 else 2500.0))
        contract_end = getattr(enterprise, 'contract_end_date', None)
        contract_end_str = contract_end.strftime('%Y-%m-%d') if contract_end else None

        incidents = getattr(enterprise, 'incident_count', 0) or 0
        curr_op = getattr(enterprise, 'current_operator', 'Orange') or 'Orange'
        curr_conn = getattr(enterprise, 'current_connectivity', 'Fibre Pro') or 'Fibre Pro'
        pain = getattr(enterprise, 'pain_level', 'Modéré') or 'Modéré'

        # Services actuels
        services = [curr_conn]
        conv_offer = getattr(enterprise, 'converted_offer', None)
        if conv_offer and conv_offer not in services:
            services.append(conv_offer)

        raw_notes = self._extract_enterprise_notes(enterprise)
        notes = f"{raw_notes}\n[Audit Opérateur] Fournisseur : {curr_op}. Niveau de risque : {pain}. Incidents récents non résolus : {incidents}."

        inp = ChurnRadarInput(
            company_name=enterprise.name,
            current_services=services,
            recent_interactions_notes=notes,
            unresolved_incidents_count=incidents,
            contract_end_date=contract_end_str,
        )
        out = self.churn_radar_engine.analyze(inp)
        res = out.model_dump()

        # Normalisation pour affichage radar KAM
        res["enterprise_id"] = enterprise.id
        res["enterprise_name"] = enterprise.name
        res["sector"] = getattr(enterprise, 'sector', 'Grand Compte') or "Grand Compte"
        res["at_stake_monthly_revenue_usd"] = round(telecom_budget, 2)
        res["signals_detected"] = res.get("churn_reasons", [])
        retention = res.get("retention_plan", {})
        res["retention_action_plan"] = {
            "urgency": retention.get("urgency", "IMMEDIATE_48H"),
            "action": retention.get("action", "Organiser un point de gouvernance"),
            "recommended_talk_track": retention.get("email_draft", "")
        }
        return res


# Singleton applicatif Core AI unifié
_ENGINE = None


def get_unified_core_ai() -> UnifiedCoreAIEngine:
    global _ENGINE
    if _ENGINE is None:
        _ENGINE = UnifiedCoreAIEngine()
    return _ENGINE
