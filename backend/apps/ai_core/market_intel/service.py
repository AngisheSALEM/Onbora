from __future__ import annotations

import logging
import threading
from typing import List

from .collectors.rss_collector import RSSCollector, RawSignal
from .enricher import MarketIntelEnricher
from .resolver import EnterpriseResolver

logger = logging.getLogger(__name__)

MAX_COLLECTOR_THREADS = 3


class MarketIntelService:
    """
    Orchestrateur de la veille marche B2B.
    Coordonne la collecte RSS, l'enrichissement Gemini et la resolution/sauvegarde.
    """

    def __init__(self) -> None:
        self._collector = RSSCollector()
        self._enricher = MarketIntelEnricher()
        self._resolver = EnterpriseResolver()

    def run_discovery(self, query: str) -> dict:
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

        semaphore = threading.Semaphore(MAX_COLLECTOR_THREADS)
        threads: List[threading.Thread] = []
        results_lock = threading.Lock()
        counters = {"enriched": 0, "saved": 0}

        def _process_signal(signal: RawSignal) -> None:
            with semaphore:
                try:
                    enriched = self._enricher.enrich(signal)
                    if enriched:
                        with results_lock:
                            counters["enriched"] += 1
                        self._resolver.resolve_and_save(enriched, signal)
                        with results_lock:
                            counters["saved"] += 1
                except Exception as exc:
                    logger.error("[MarketIntelService] Erreur traitement signal : %s", exc)
                    with results_lock:
                        errors.append(str(exc))

        for signal in signals:
            t = threading.Thread(target=_process_signal, args=(signal,), daemon=True)
            threads.append(t)
            t.start()

        for t in threads:
            t.join(timeout=60)

        enriched_count = counters["enriched"]
        saved_count = counters["saved"]

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
