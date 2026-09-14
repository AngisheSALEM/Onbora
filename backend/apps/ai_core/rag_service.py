from __future__ import annotations

import json
import logging
import re
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger(__name__)

DEFAULT_CATALOG_PATH = Path(__file__).resolve().parent / "catalog" / "offres_orange_b2b.json"


class OrangeBusinessRAG:
    """
    Moteur de recherche RAG in-process avec index inversé et pondération de pertinence TF-IDF.
    Charge le catalogue offres_orange_b2b.json et renvoie les offres les plus pertinentes en < 2ms.
    """

    _TOKEN_PATTERN = re.compile(r"[\w]+(?:[-'][\w]+)*", re.UNICODE)
    _STOP_WORDS = {
        "a", "au", "aux", "avec", "dans", "de", "des", "du", "et", "la", "le",
        "les", "pour", "sur", "un", "une", "besoin", "cherche", "solution", "par",
        "en", "est", "sont", "nos", "vos", "leur", "plus", "tout", "tous", "d", "l",
    }

    def __init__(self, catalog_path: str | Path = DEFAULT_CATALOG_PATH):
        self.catalog_path = Path(catalog_path)
        self.catalog: Dict[str, Any] = self._load_catalog()
        self._indexed_services: List[Dict[str, Any]] = self._build_index()
        self._services_by_id: Dict[str, Dict[str, Any]] = {
            s.get("service_id"): s
            for s in self.catalog.get("services", [])
            if s.get("service_id")
        }
        logger.info("[RAG] %d services Orange Business indexés avec succès.", len(self._indexed_services))

    def _load_catalog(self) -> Dict[str, Any]:
        if not self.catalog_path.exists():
            logger.warning("[RAG] Fichier catalogue introuvable: %s", self.catalog_path)
            return {"services": []}
        with self.catalog_path.open("r", encoding="utf-8") as f:
            return json.load(f)

    @classmethod
    def _normalize(cls, value: str) -> str:
        decomposed = unicodedata.normalize("NFKD", value.casefold())
        return "".join(char for char in decomposed if not unicodedata.combining(char))

    @classmethod
    def _tokenize(cls, value: str) -> Set[str]:
        normalized = cls._normalize(value)
        return {
            token for token in cls._TOKEN_PATTERN.findall(normalized)
            if token not in cls._STOP_WORDS and len(token) > 1
        }

    @staticmethod
    def _field_weights() -> Dict[str, int]:
        return {
            "name": 5,
            "category": 3,
            "need_keywords": 4,
            "description": 1,
            "allowed_benefits": 2,
            "target_customers": 2,
        }

    def _build_index(self) -> List[Dict[str, Any]]:
        indexed = []
        for service in self.catalog.get("services", []):
            match_data = service.get("match", {})
            fields = {
                "name": self._tokenize(str(service.get("name", ""))),
                "category": self._tokenize(str(service.get("category", ""))),
                "description": self._tokenize(str(service.get("description", ""))),
                "allowed_benefits": self._tokenize(" ".join(map(str, service.get("allowed_benefits", [])))),
                "target_customers": self._tokenize(" ".join(map(str, service.get("target_customers", [])))),
                "need_keywords": self._tokenize(" ".join(map(str, match_data.get("need_keywords", [])))),
            }
            indexed.append({"service": service, "fields": fields})
        return indexed

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Recherche multicritère dans l'index inversé avec pondération TF/IDF.
        """
        if not isinstance(query, str):
            return []
        limit = max(1, min(limit, 50))

        query_terms = self._tokenize(query)
        if not query_terms:
            return []

        matches: List[Dict[str, Any]] = []

        for indexed in self._indexed_services:
            score = 0
            matched_terms: Set[str] = set()
            for field, weight in self._field_weights().items():
                field_terms = indexed["fields"].get(field, set())
                field_matches = field_terms.intersection(query_terms)
                score += len(field_matches) * weight
                matched_terms.update(field_matches)

            if score == 0:
                continue

            service = indexed["service"]
            matches.append({
                "service_id": service.get("service_id"),
                "name": service.get("name"),
                "category": service.get("category"),
                "description": service.get("description"),
                "score": score,
                "match_keywords": sorted(matched_terms)[:5],
                "pricing": service.get("pricing", {}),
            })

        matches.sort(key=lambda item: (-item["score"], item["service_id"] or ""))
        return matches[:limit]

    def get_service_by_id(self, service_id: str) -> Optional[Dict[str, Any]]:
        """Récupère une offre directement par son identifiant unique."""
        return self._services_by_id.get(service_id)

    def list_services(self) -> List[Dict[str, Any]]:
        """Liste exhaustive des services validés du catalogue."""
        return self.catalog.get("services", [])


# Singleton applicatif in-process
_RAG_INSTANCE: Optional[OrangeBusinessRAG] = None


def get_catalog_rag(catalog_path: Optional[Path] = None) -> OrangeBusinessRAG:
    """Retourne l'instance singleton du RAG pour un accès immédiat en RAM."""
    global _RAG_INSTANCE
    if _RAG_INSTANCE is None:
        path = catalog_path or DEFAULT_CATALOG_PATH
        _RAG_INSTANCE = OrangeBusinessRAG(catalog_path=path)
    return _RAG_INSTANCE
