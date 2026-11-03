from __future__ import annotations

import logging
from typing import List

from .collectors.rss_collector import RSSCollector
from .enricher import MarketIntelEnricher
from .resolver import EnterpriseResolver

logger = logging.getLogger(__name__)

class MarketIntelService:
    """
    Orchestrateur de la veille marche B2B.
    Coordonne la collecte RSS, l'enrichissement Gemini et la resolution/sauvegarde.
    """

    def __init__(self) -> None:
        self._collector = RSSCollector()
        self._enricher = MarketIntelEnricher()
        self._resolver = EnterpriseResolver()

    def run_discovery(self, query: str, heartbeat=None) -> dict:
        """
        Lance la collecte RSS, enrichit chaque signal, resout et sauvegarde.
        Retourne {"collected": N, "enriched": M, "saved": K, "errors": [...]}
        """
        errors: List[str] = []
        collected = 0
        enriched_count = 0
        saved_count = 0

        try:
            signals = self._collector.collect(query=query)
            collected = len(signals)
        except Exception as exc:
            logger.error("[MarketIntelService] Erreur collecte RSS : %s", exc)
            errors.append(str(exc))
            signals = []

        # A queue worker executes one discovery at a time. No detached daemon threads.
        for signal in signals:
            if heartbeat:
                heartbeat()
            try:
                enriched = self._enricher.enrich(signal)
                if enriched:
                    enriched_count += 1
                    if self._resolver.resolve_and_save(enriched, signal):
                        saved_count += 1
            except Exception:
                logger.exception("[MarketIntelService] Signal processing failed")
                errors.append("signal_processing_failed")
        if heartbeat:
            heartbeat()

        logger.info(
            "[MarketIntelService] Discovery termine : %d collectes, %d enrichis, %d sauvegardes, %d erreurs.",
            collected, enriched_count, saved_count, len(errors),
        )
        return {
            "collected": collected,
            "enriched": enriched_count,
            "saved": saved_count,
            "errors": errors,
        }

    def run_enrichment_for_enterprise(self, enterprise_name: str) -> dict:
        """
        Lance la collecte RSS ciblee sur le nom d'une entreprise, enrichit et sauvegarde.
        """
        return self.run_discovery(query=enterprise_name)
