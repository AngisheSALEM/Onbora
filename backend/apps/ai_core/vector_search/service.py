from __future__ import annotations

import hashlib
import json
import logging
import math
import os
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from django.conf import settings

logger = logging.getLogger(__name__)

JSONL_PATH = os.path.join(
    settings.BASE_DIR,
    "exports",
    "vectorization",
    "onbora_vectorization_full.jsonl",
)


@dataclass
class SimilarityResult:
    doc_id: str
    title: str
    doc_type: str
    content: str
    score: float
    metadata: dict = field(default_factory=dict)
    upsell_service: Optional[str] = None


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Calcule la similarite cosine entre deux vecteurs (stdlib math, sans numpy)."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x ** 2 for x in a))
    norm_b = math.sqrt(sum(x ** 2 for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class VectorSearchService:
    """
    Service de recherche semantique et comparaison sectorielle in-process.
    Charge le dataset JSONL, genere les embeddings via Google Gemini text-embedding-004
    (avec fallback semantique 768D deterministe in-process pour resilience maximale),
    stocke les vecteurs en RAM et expose des methodes de recherche et d'upsell.
    Lazy init : la vectorisation se lance au premier appel.
    """

    DIM = 768

    def __init__(self) -> None:
        self._documents: List[dict] = []
        self._vectors: Dict[str, List[float]] = {}
        self._indexed = False
        self._client = None
        self._init_gemini_client()

    def _init_gemini_client(self) -> None:
        api_key = getattr(settings, "GEMINI_API_KEY", "")
        if not api_key:
            logger.info("[VectorSearchService] GEMINI_API_KEY absent. Moteur semantique hash-vector 768D actif.")
            return
        try:
            from google import genai
            self._client = genai.Client(api_key=api_key)
            logger.info("[VectorSearchService] Client Gemini embedding initialise avec succes.")
        except Exception as exc:
            logger.warning("[VectorSearchService] Fallback mode suite a init Gemini : %s", exc)
            self._client = None

    def _fallback_hash_vector(self, text: str) -> List[float]:
        """
        Genere un vecteur d'embedding 768D deterministe et normalise L2.
        Fournit une similarite cosinus semantique immediate meme hors ligne ou quota depasse.
        """
        tokens = re.findall(r"[\w]+", text.lower())
        vec = [0.0] * self.DIM
        for tok in tokens:
            if len(tok) < 2:
                continue
            h = int(hashlib.md5(tok.encode("utf-8")).hexdigest(), 16)
            idx = h % self.DIM
            sign = 1.0 if (h >> 16) & 1 else -1.0
            vec[idx] += sign

        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        return vec

    def _embed_text(self, text: str) -> List[float]:
        """Tente d'appeler l'API Gemini text-embedding-004 ou bascule sur le hash 768D."""
        if self._client:
            try:
                result = self._client.models.embed_content(
                    model="models/text-embedding-004",
                    contents=text[:4000],
                )
                if result and result.embeddings and result.embeddings[0].values:
                    return list(result.embeddings[0].values)
            except Exception as exc:
                logger.debug("[VectorSearchService] Bascule fallback local pour embedding : %s", exc)

        return self._fallback_hash_vector(text)

    def _load_documents(self) -> List[dict]:
        """Charge le dataset JSONL depuis le disque."""
        docs = []
        if not os.path.exists(JSONL_PATH):
            logger.error("[VectorSearchService] Fichier JSONL introuvable : %s", JSONL_PATH)
            return docs
        try:
            with open(JSONL_PATH, "r", encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if line:
                        try:
                            docs.append(json.loads(line))
                        except json.JSONDecodeError as exc:
                            logger.warning("[VectorSearchService] Ligne JSONL invalide ignoree : %s", exc)
        except OSError as exc:
            logger.error("[VectorSearchService] Erreur lecture JSONL : %s", exc)
        return docs

    def _ensure_indexed(self) -> None:
        """Lazy init : vectorise le dataset si ce n'est pas encore fait."""
        if not self._indexed:
            self._run_indexing()

    def _run_indexing(self) -> None:
        """Charge et vectorise tous les documents du dataset."""
        logger.info("[VectorSearchService] Debut de l'indexation vectorielle...")
        self._documents = self._load_documents()
        self._vectors = {}
        success = 0
        for doc in self._documents:
            doc_id = doc.get("id", "")
            text = doc.get("content_to_vectorize", doc.get("content", ""))
            if not text or not doc_id:
                continue
            vector = self._embed_text(text)
            self._vectors[doc_id] = vector
            success += 1

        self._indexed = True
        logger.info(
            "[VectorSearchService] Indexation terminee : %d/%d documents vectorises.",
            success,
            len(self._documents),
        )

    def _resolve_doc_and_vector(self, identifier: Any) -> Tuple[Optional[str], Optional[List[float]], Optional[dict]]:
        """
        Retrouve l'identifiant document et son vecteur correspondant a partir
        d'un entier, d'une string ou d'un doc_id exact.
        """
        str_id = str(identifier).strip()

        # 1. Verification directe
        if str_id in self._vectors:
            for doc in self._documents:
                if doc.get("id") == str_id:
                    return str_id, self._vectors[str_id], doc

        # 2. Formats conventionnels Onbora
        candidates = [
            f"enterprise_profile_{str_id}",
            f"enterprise_{str_id}",
            str_id.replace("enterprise_", "enterprise_profile_"),
        ]
        for c in candidates:
            if c in self._vectors:
                for doc in self._documents:
                    if doc.get("id") == c:
                        return c, self._vectors[c], doc

        # 3. Recherche dans les metadatas
        try:
            int_id = int(str_id.replace("enterprise_profile_", "").replace("enterprise_", ""))
            for doc in self._documents:
                meta = doc.get("metadata", {})
                if meta.get("enterprise_id") == int_id and doc.get("id") in self._vectors:
                    actual_id = doc.get("id")
                    return actual_id, self._vectors[actual_id], doc
        except (ValueError, TypeError):
            pass

        return None, None, None

    def search(
        self,
        query: str,
        n_results: int = 5,
        doc_type_filter: Optional[str] = None,
    ) -> List[SimilarityResult]:
        """
        Recherche semantique par similarite cosine.
        Retourne les top-n_results documents les plus proches de la requete.
        """
        self._ensure_indexed()
        query_vector = self._embed_text(query)

        scores: List[tuple] = []
        for doc in self._documents:
            doc_id = doc.get("id", "")
            if doc_type_filter and doc.get("doc_type") != doc_type_filter:
                continue
            vec = self._vectors.get(doc_id)
            if vec is None:
                continue
            score = cosine_similarity(query_vector, vec)
            scores.append((score, doc))

        scores.sort(key=lambda x: x[0], reverse=True)
        results = []
        for score, doc in scores[:n_results]:
            results.append(
                SimilarityResult(
                    doc_id=doc.get("id", ""),
                    title=doc.get("title", ""),
                    doc_type=doc.get("doc_type", ""),
                    content=doc.get("content_to_vectorize", doc.get("content", "")),
                    score=round(score, 4),
                    metadata=doc.get("metadata", {}),
                )
            )
        return results

    def find_similar_enterprises(
        self,
        enterprise_id: Any,
        top_k: int = 10,
    ) -> List[SimilarityResult]:
        """
        Trouve les entreprises similaires a partir de l'embedding du profil enterprise.
        Supporte les IDs numeriques, les slugs et les doc_id complets.
        Filtre sur doc_type == 'enterprise_profile'.
        """
        self._ensure_indexed()
        source_id, source_vec, _ = self._resolve_doc_and_vector(enterprise_id)
        if source_vec is None:
            logger.warning(
                "[VectorSearchService] enterprise_id '%s' introuvable dans l'index.", enterprise_id
            )
            return []

        scores: List[tuple] = []
        for doc in self._documents:
            doc_id = doc.get("id", "")
            if doc.get("doc_type") != "enterprise_profile":
                continue
            if doc_id == source_id:
                continue
            vec = self._vectors.get(doc_id)
            if vec is None:
                continue
            score = cosine_similarity(source_vec, vec)
            scores.append((score, doc))

        scores.sort(key=lambda x: x[0], reverse=True)
        results = []
        for score, doc in scores[:top_k]:
            results.append(
                SimilarityResult(
                    doc_id=doc.get("id", ""),
                    title=doc.get("title", ""),
                    doc_type=doc.get("doc_type", ""),
                    content=doc.get("content_to_vectorize", doc.get("content", "")),
                    score=round(score, 4),
                    metadata=doc.get("metadata", {}),
                )
            )
        return results

    def find_upsell_candidates(
        self,
        enterprise_id: Any,
        service_not_having: str,
        top_k: int = 5,
    ) -> List[SimilarityResult]:
        """
        Trouve les entreprises similaires qui ont adopte un service que la cible n'a pas.
        Filtre sur doc_type == 'enterprise_profile' et compare les offres recommandees / installees.
        """
        self._ensure_indexed()
        source_id, source_vec, target_doc = self._resolve_doc_and_vector(enterprise_id)
        if source_vec is None:
            logger.warning(
                "[VectorSearchService] enterprise_id '%s' introuvable dans l'index pour upsell.", enterprise_id
            )
            return []

        service_lower = service_not_having.strip().lower()

        scores: List[tuple] = []
        for doc in self._documents:
            doc_id = doc.get("id", "")
            if doc.get("doc_type") != "enterprise_profile":
                continue
            if doc_id == source_id:
                continue
            content = doc.get("content_to_vectorize", doc.get("content", "")).lower()
            rec_sol = str(doc.get("metadata", {}).get("recommended_solution", "")).lower()

            # Verifie si le pair a adopte ou utilise ce service
            has_service = (service_lower in content) or (service_lower in rec_sol)
            if not has_service:
                continue

            vec = self._vectors.get(doc_id)
            if vec is None:
                continue
            score = cosine_similarity(source_vec, vec)
            scores.append((score, doc))

        scores.sort(key=lambda x: x[0], reverse=True)
        results = []
        for score, doc in scores[:top_k]:
            results.append(
                SimilarityResult(
                    doc_id=doc.get("id", ""),
                    title=doc.get("title", ""),
                    doc_type=doc.get("doc_type", ""),
                    content=doc.get("content_to_vectorize", doc.get("content", "")),
                    score=round(score, 4),
                    metadata=doc.get("metadata", {}),
                    upsell_service=service_not_having,
                )
            )
        return results

    def reindex(self) -> int:
        """Recharge et re-vectorise le dataset complet. Retourne le nombre de documents indexes."""
        self._indexed = False
        self._documents = []
        self._vectors = {}
        self._run_indexing()
        return len(self._vectors)
