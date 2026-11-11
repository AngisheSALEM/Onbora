"""Onbora Analysis Synchronization & Intelligence Ingestion Service.
Orchestrates:
1. Queries to Onbora Analysis Service (Port 8001 / SQLite / JSON fallback).
2. Enterprise name matching with Onbora DB accounts.
3. Core AI date verification (obsolescence check).
4. Full re-analysis (Lead Scoring, Churn Radar, Briefing).
5. Automatic 768D vectorization of updated/created enterprises.
6. Feed provisioning for B2BNewsFeedItem (Front-end news feed & new leads).
"""

from __future__ import annotations

import logging
import os
import re
import unicodedata
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from sales.models import Enterprise, Plaque
from kam.models import B2BNewsFeedItem
from apps.ai_core.services.commercial_signal_scorer import commercial_signal_scorer
from apps.ai_core.services.commercial_action import build_commercial_action
from apps.ai_core.vector_search.singleton import get_vector_search_service
from apps.kam.services.churn_radar_service import ChurnRadarService

logger = logging.getLogger(__name__)

DEFAULT_ANALYSIS_URL = getattr(settings, "ONBORA_ANALYSIS_URL", "http://127.0.0.1:8001").rstrip("/")

# Legal suffixes and filler terms to clean for robust matching
LEGAL_TERMS_RE = re.compile(
    r"\b(sa|sarl|sasu|sprl|sca|sc|snc|gie|ltd|limited|inc|corp|corporation|group|groupe|rdc|congo|siège|direction|générale)\b",
    re.IGNORECASE
)


class OnboraAnalysisSyncService:
    """Service d'ingestion et de synchronisation d'intelligence Onbora Analysis."""

    def __init__(self, base_url: Optional[str] = None, timeout: float = 4.0) -> None:
        self.base_url = (base_url or DEFAULT_ANALYSIS_URL).rstrip("/")
        self.timeout = timeout
        self._enterprise_cache: Optional[List[Tuple[int, str, set]]] = None

    @staticmethod
    def normalize_company_name(name: str) -> str:
        """Normalise un nom pour maximiser la précision du matching."""
        if not name:
            return ""
        norm = unicodedata.normalize("NFKD", name)
        clean = "".join(c for c in norm if not unicodedata.combining(c)).lower()
        clean = re.sub(r"[#\-_.,/()'\"]+", " ", clean)
        clean = LEGAL_TERMS_RE.sub(" ", clean)
        return " ".join(clean.split())

    def _preload_enterprise_index(self) -> None:
        """Charge en mémoire les identifiants et noms normalisés des entreprises existantes."""
        self._enterprise_cache = []
        rows = Enterprise.objects.values_list("id", "name")
        for ent_id, raw_name in rows:
            norm = self.normalize_company_name(raw_name)
            tokens = set(norm.split())
            self._enterprise_cache.append((ent_id, norm, tokens))
        logger.info("[OnboraAnalysisSync] Index en mémoire préchargé avec %d entreprises.", len(self._enterprise_cache))

    def fetch_jobs_from_service(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Read only v2 observations tracked by Onbora, never the old mock DB/export."""
        from apps.ai_core.models import CompanyResearchJob
        return list(CompanyResearchJob.objects.filter(state="completed", applied_at__isnull=False)
                    .exclude(response_data={}).values_list("response_data", flat=True)[:limit])

    def match_enterprise(self, target_name: str) -> Optional[Enterprise]:
        """
        Recherche une entreprise existante dans Onbora par nom :
        Utilise l'index préchargé en mémoire pour une performance maximale (< 1ms).
        """
        if not target_name:
            return None

        norm_target = self.normalize_company_name(target_name)
        if not norm_target:
            return None

        target_tokens = set(norm_target.split())

        if self._enterprise_cache is None:
            self._preload_enterprise_index()

        matches = [ent_id for ent_id, cand_norm, _ in self._enterprise_cache if cand_norm == norm_target]
        if len(matches) == 1:
            return Enterprise.objects.filter(id=matches[0]).first()
        if len(matches) > 1:
            raise ValueError("Ambiguous enterprise name; manual resolution required")
        return None

    @staticmethod
    def parse_job_datetime(dt_str: Optional[str]) -> Optional[datetime]:
        """Parse une date ISO 8601 (avec support du suffixe Z) en datetime timezone-aware."""
        if not dt_str:
            return None
        clean_str = dt_str.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(clean_str)
        except Exception:
            return None

    def is_job_data_fresh(self, job_dt: Optional[datetime], enterprise: Enterprise) -> bool:
        """
        Décision du Core AI : vérifie si l'information récupérée n'est pas obsolète
        par rapport aux données déjà enregistrées dans Onbora.
        """
        if not job_dt:
            return True

        # S'il n'y a jamais eu de synchro, l'information est neuve
        if not enterprise.last_sync_date:
            return True

        # Comparaison temporelle : la donnée doit être plus récente que la dernière synchro
        return job_dt > enterprise.last_sync_date

    def reanalyze_enterprise_with_core_ai(self, enterprise: Enterprise, job_data: Dict[str, Any]) -> None:
        """
        Exécute la ré-analyse complète de l'entreprise par le Core AI :
        1. Lead Scoring B2B et attribution des signaux.
        2. Recalcul déterministe du Churn Radar & Upsell.
        3. Génération des hypothèses commerciales pré-visite et pitch sur-mesure.
        """
        from ..unified_engine import get_unified_core_ai
        from ..lead_scoring.models import LeadScoringInput
        core = get_unified_core_ai()
        scoring = core.lead_scoring_engine._build_fallback(LeadScoringInput(
            company_name=enterprise.name, sector=enterprise.sector,
            locations_count=enterprise.site_count, budget_status=enterprise.budget_status,
            pain_level=enterprise.pain_level,
            decision_maker_involved=False))
        scoring_data = scoring.model_dump(mode="json")
        scoring_data["score_drivers"] = [
            {"factor": driver.factor, "points": driver.impact, "positive": driver.type.value == "POSITIVE"}
            for driver in scoring.score_drivers]
        scoring_data["provenance"] = "deterministic_recorded_fields"
        scoring_data["requires_confirmation"] = True
        enterprise.ai_lead_scoring_data = scoring_data
        enterprise.conversion_score = scoring.lead_score

        # 2. Churn Radar & Upsell Core AI
        churn_res = ChurnRadarService.calculate_deterministic_health_score(enterprise)
        try:
            assessment = ChurnRadarService.refresh_account_assessment(enterprise, use_ai=False)
            upsell_res = assessment.upsell_opportunities or []
            signals = churn_res.get("risk_reasons", [])
            retention_plan = assessment.retention_plan or {}
        except Exception:
            logger.exception("Unable to refresh churn assessment for enterprise %s", enterprise.pk)
            upsell_res, signals, retention_plan = [], churn_res.get("risk_reasons", []), {}

        enterprise.ai_churn_data = {
            "health_score": churn_res.get("health_score", 100),
            "churn_risk_score": churn_res.get("churn_risk_score", 0),
            "risk_level": churn_res.get("risk_level", "LOW"),
            "priority_level": churn_res.get("priority_level", "P3"),
            "signals": signals,
            "upsell": upsell_res,
            "retention_plan": retention_plan,
            "evaluated_at": timezone.now().isoformat()
        }

        # Only sourced research is retained as evidence. No default multisite claims or SLA.
        real_needs, _ = core._extract_real_and_predicted_needs(enterprise)
        enterprise.ai_hypotheses = [
            {"hypothesis": item["need"], "evidence": item["source"], "visit_id": item["visit_id"],
             "status": "CONFIRMED"} for item in real_needs]
        enterprise.ai_tailored_pitch = ""
        enterprise.ai_key_questions = [
            "Quels usages et contraintes souhaitez-vous améliorer ?",
            "Quels services sont déjà installés et avec quels engagements ?"]
        enterprise.ai_potential_objections = []

        enterprise.ai_scored_at = timezone.now()

    def create_news_feed_item(
        self,
        enterprise: Optional[Enterprise],
        job_data: Dict[str, Any],
        is_new_lead: bool
    ) -> B2BNewsFeedItem:
        """Crée un item de fil d'actualité enrichi par le Core AI."""
        result = job_data.get("result", {})
        subject = result.get("subject", {})
        provider_research = result.get("provider_research", {})
        blocks = provider_research.get("blocks", [])
        sources = result.get("sources", [])

        company_name = subject.get("name", "Entreprise Détectée")
        city = subject.get("city", "Kinshasa")
        sector = (
            result.get("profile", {}).get("activities", {}).get("items", ["Services B2B"])[0]
            if result.get("profile", {}).get("activities", {}).get("items")
            else "Services B2B & Commerce"
        )

        # Synthesize summary from blocks or summary
        summary_sentences = result.get("summary", {}).get("sentences", [])
        if summary_sentences:
            summary = " ".join([s.get("text", "") for s in summary_sentences if isinstance(s, dict)])
        else:
            from .adapter import supported_facts
            summary = " ".join(f["statement"] for f in supported_facts(result)[:3])

        job_dt = self.parse_job_datetime(job_data.get("completed_at") or job_data.get("created_at")) or timezone.now()

        source_name = sources[0].get("publisher", "Onbora Analysis") if sources else "Onbora Analysis Intelligence"
        source_url = sources[0].get("url", "") if sources else ""

        category = "NEW_ACCOUNT" if is_new_lead else "EXPANSION"
        raw_title = (
            f"Nouveau Lead : {company_name} — Opportunité B2B ({sector})"
            if is_new_lead
            else f"{company_name} — Actualisation d'activité et veille stratégique"
        )

        # Core AI Commercial Signal Scoring
        scored_signal = commercial_signal_scorer.score_news(
            title=raw_title,
            summary=summary,
            category=category,
            company_name=company_name,
            sector=sector,
            location=city,
            is_web_discovery=is_new_lead
        )

        signal_strength = scored_signal.get("signal_strength", "STRONG" if is_new_lead else "WEAK")
        signal_score = scored_signal.get("signal_score", 90 if is_new_lead else 75)
        signal_rationale = scored_signal.get("signal_rationale", "Signal d'opportunité commerciale qualifié par Core AI.")
        commercial_action = build_commercial_action(
            company_name=company_name,
            commercial_angle=scored_signal.get("commercial_angle"),
            signal_rationale=signal_rationale,
            recommended_offer=scored_signal.get("recommended_offer"),
            recommended_action=scored_signal.get("recommended_action"),
        )
        commercial_angle = commercial_action["interest_reason"]
        recommended_action = commercial_action["next_action"]
        recommended_offer = commercial_action["recommended_solution"]
        priority = "HIGH" if is_new_lead or signal_strength == "STRONG" else "MEDIUM"

        news_item = B2BNewsFeedItem.objects.create(
            enterprise=enterprise,
            is_web_discovery=is_new_lead,
            discovered_company_name=company_name if is_new_lead else "",
            discovered_website=sources[0].get("url", "") if sources and is_new_lead else "",
            discovered_sector=sector if is_new_lead else "",
            discovered_location=f"{city}, RD Congo" if is_new_lead else "",
            discovered_size="PME / Grand Compte" if is_new_lead else "",
            discovered_signals=result.get("facts", [])[:3],
            title=raw_title,
            summary=summary[:1000],
            source_name=source_name,
            source_url=source_url,
            category=category,
            priority=priority,
            signal_strength=signal_strength,
            signal_score=signal_score,
            signal_rationale=signal_rationale,
            commercial_angle=commercial_angle,
            recommended_action=recommended_action,
            recommended_offer=recommended_offer,
            published_at=job_dt,
        )
        return news_item

    def process_job(self, job_data: Dict[str, Any], persist_vector_cache: bool = False) -> Dict[str, Any]:
        """Traite une fiche de recherche Onbora Analysis selon les règles métier."""
        from .adapter import supported_facts
        if job_data.get("schema_version") != "2.0" or job_data.get("state") != "completed":
            return {"status": "ignored", "reason": "Recherche v2 terminée requise"}
        result = job_data.get("result") or {}
        facts = supported_facts(result)
        if not facts:
            return {"status": "ignored", "reason": "Aucun fait attribuable"}
        subject = result.get("subject", {})
        target_name = subject.get("name", "").strip()

        if not target_name:
            return {"status": "ignored", "reason": "Nom d'entreprise manquant"}

        job_dt = self.parse_job_datetime(job_data.get("completed_at") or job_data.get("created_at")) or timezone.now()
        resolved = result.get("identity", {}).get("resolved_subject") or {}
        phone = next((f["normalized_value"] for f in facts if f.get("kind") == "phone"), None)
        website = resolved.get("website")
        addr = next((f["value"] for f in facts if f.get("kind") == "headquarters"), "")
        city = subject.get("city", "")
        rccm = resolved.get("identifiers", {}).get("rccm")
        sector = next((f["value"] for f in facts if f["field"] == "activities"), "")

        matched_enterprise = self.match_enterprise(target_name)

        if matched_enterprise:
            # CAS 1 : Entreprise déjà enregistrée dans le système
            # VÉRIFICATION DE LA DATE PAR CORE AI (Anti-Obsolescence)
            if not self.is_job_data_fresh(job_dt, matched_enterprise):
                logger.info(
                    "[OnboraAnalysisSync] Donnée ignorée pour '%s' : le job (%s) est antérieur ou égal à la dernière synchronisation (%s).",
                    matched_enterprise.name, job_dt, matched_enterprise.last_sync_date
                )
                return {
                    "status": "skipped_obsolete",
                    "enterprise_id": matched_enterprise.id,
                    "enterprise_name": matched_enterprise.name,
                    "reason": "Information obsolète ou déjà intégrée"
                }

            # Mise à jour avec les informations fraîches
            with transaction.atomic():
                if phone and not matched_enterprise.contact_phone:
                    matched_enterprise.contact_phone = phone
                if website and not matched_enterprise.website:
                    matched_enterprise.website = website
                if addr and not matched_enterprise.address:
                    matched_enterprise.address = addr
                if rccm and not matched_enterprise.rccm:
                    matched_enterprise.rccm = rccm
                if city and matched_enterprise.city in ("", "Kinshasa") and city.lower() != "kinshasa":
                    matched_enterprise.city = city.capitalize()

                matched_enterprise.scraped_data = result
                matched_enterprise.last_sync_date = job_dt

                # Ré-analyse complète Core AI
                self.reanalyze_enterprise_with_core_ai(matched_enterprise, job_data)
                matched_enterprise.save()

            # Vectorisation immédiate
            get_vector_search_service().vectorize_enterprise(matched_enterprise, persist_cache=persist_vector_cache)

            # Provisioning du fil d'actualité
            news_item = self.create_news_feed_item(matched_enterprise, job_data, is_new_lead=False)

            logger.info(
                "[OnboraAnalysisSync] Compte existant mis à jour, ré-analysé et vectorisé : %s (ID %s)",
                matched_enterprise.name, matched_enterprise.id
            )
            return {
                "status": "updated",
                "enterprise_id": matched_enterprise.id,
                "enterprise_name": matched_enterprise.name,
                "news_id": str(news_item.id)
            }

        else:
            # CAS 2 : Le nom ne matche pas -> NOUVEAU LEAD DÉTECTÉ
            with transaction.atomic():
                # Résolution ou affectation de plaque par défaut
                default_plaque = Plaque.objects.filter(city__iexact=city).first() or Plaque.objects.first()

                new_enterprise = Enterprise.objects.create(
                    name=target_name,
                    sector=sector,
                    city=city.capitalize(),
                    address=addr or "",
                    contact_phone=phone or "",
                    website=website,
                    rccm=rccm,
                    segment="GRAND_COMPTE" if any(k in sector.lower() for k in ("banque", "mine", "télécom", "brasserie")) else "PME",
                    assigned_entity="KAM_OFFICE" if any(k in sector.lower() for k in ("banque", "mine", "télécom")) else "BACK_OFFICE",
                    conversion_status="PROSPECT",
                    plaque_rel=default_plaque,
                    scraped_data=result,
                    last_sync_date=job_dt,
                )

                # Analyse initiale complète par Core AI
                self.reanalyze_enterprise_with_core_ai(new_enterprise, job_data)
                new_enterprise.save()

            # Mettre à jour l'index en mémoire pour les jobs suivants
            norm = self.normalize_company_name(new_enterprise.name)
            if self._enterprise_cache is not None:
                self._enterprise_cache.append((new_enterprise.id, norm, set(norm.split())))

            # Vectorisation immédiate
            get_vector_search_service().vectorize_enterprise(new_enterprise, persist_cache=persist_vector_cache)

            # Provisioning du fil d'actualité comme nouveau prospect
            news_item = self.create_news_feed_item(new_enterprise, job_data, is_new_lead=True)

            logger.info(
                "[OnboraAnalysisSync] Nouveau lead créé, analysé et vectorisé : %s (ID %s)",
                new_enterprise.name, new_enterprise.id
            )
            return {
                "status": "created_new_lead",
                "enterprise_id": new_enterprise.id,
                "enterprise_name": new_enterprise.name,
                "news_id": str(news_item.id)
            }

    def sync_all_jobs(self, limit: int = 100) -> Dict[str, Any]:
        """
        Lance la synchronisation complète des fiches Onbora Analysis.
        Retourne le bilan d'ingestion.
        """
        self._preload_enterprise_index()
        jobs = self.fetch_jobs_from_service(limit=limit)
        stats = {
            "total_jobs_fetched": len(jobs),
            "updated_accounts": 0,
            "created_new_leads": 0,
            "skipped_obsolete": 0,
            "errors": 0,
            "details": []
        }

        for j in jobs:
            try:
                res = self.process_job(j, persist_vector_cache=False)
                st = res.get("status")
                if st == "updated":
                    stats["updated_accounts"] += 1
                elif st == "created_new_lead":
                    stats["created_new_leads"] += 1
                elif st == "skipped_obsolete":
                    stats["skipped_obsolete"] += 1
                stats["details"].append(res)
            except Exception as exc:
                logger.error("[OnboraAnalysisSync] Erreur traitement job : %s", exc, exc_info=True)
                stats["errors"] += 1
                stats["details"].append({"status": "error", "error": str(exc)})

        # Persistance unique du cache vectoriel à la fin du lot
        get_vector_search_service().persist_cache()

        logger.info(
            "[OnboraAnalysisSync] Bilan synchro : %d MAJ, %d nouveaux leads, %d ignorés (obsolètes), %d erreurs.",
            stats["updated_accounts"], stats["created_new_leads"], stats["skipped_obsolete"], stats["errors"]
        )
        return stats


# Instance globale
onbora_analysis_sync_service = OnboraAnalysisSyncService()
