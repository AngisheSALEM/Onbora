from __future__ import annotations

import hashlib
import json
import logging
import math
import os
import re
import threading
import tempfile
import unicodedata
from functools import wraps
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from django.conf import settings

logger = logging.getLogger(__name__)


def _resolve_data_path(filename: str) -> str:
    """Trouve le chemin absolu du fichier de données ou de cache de manière robuste."""
    base_dir = Path(getattr(settings, "BASE_DIR", Path(".")))
    candidates = [
        base_dir / "exports" / "vectorization" / filename,
        base_dir / "backend" / "exports" / "vectorization" / filename,
        Path(__file__).resolve().parent.parent.parent.parent / "exports" / "vectorization" / filename,
    ]
    for p in candidates:
        if p.exists():
            return str(p)
    return str(candidates[0])


JSONL_PATH = _resolve_data_path("onbora_vectorization_full.jsonl")
CACHE_PATH = _resolve_data_path("onbora_vectors_cache_768d.json")


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
    if len(a) != len(b):
        raise ValueError("Vectors must have the same dimension")
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x ** 2 for x in a))
    norm_b = math.sqrt(sum(x ** 2 for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _synchronized(method):
    @wraps(method)
    def call(self, *args, **kwargs):
        with self._lock:
            return method(self, *args, **kwargs)
    return call


class VectorSearchService:
    """
    Service de recherche semantique et comparaison sectorielle in-process.
    Charge le dataset JSONL et les mises à jour partagées PostgreSQL,
    utilise un espace lexical déterministe 768D unique,
    stocke les vecteurs en RAM et expose des methodes de recherche et d'upsell.
    Lazy init : la vectorisation se lance au premier appel.
    """

    DIM = 768
    EMBEDDING_VERSION = "token-hash-nfkd-l2-768-v2"

    def __init__(self) -> None:
        self._documents: List[dict] = []
        self._vectors: Dict[str, List[float]] = {}
        self._indexed = False
        self._client = None
        self._lock = threading.RLock()
        self._base_documents = []
        self._overlay_signature = None

    def _fallback_hash_vector(self, text: str) -> List[float]:
        """
        Genere un vecteur d'embedding 768D deterministe et normalise L2.
        Fournit une similarité lexicale déterministe, sans prétendre à une proximité sémantique.
        """
        normalized = ''.join(char for char in unicodedata.normalize('NFKD', text.casefold())
                             if not unicodedata.combining(char))
        tokens = re.findall(r"[\w]+", normalized)
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
            vec = [round(x / norm, 5) for x in vec]
        return vec

    def _embed_text(self, text: str) -> List[float]:
        """One lexical embedding space for documents, updates and queries, with no provider mixing."""
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

    @_synchronized
    def _ensure_indexed(self) -> None:
        if not self._indexed:
            self._run_indexing()
        self._refresh_dynamic_documents()

    def _refresh_dynamic_documents(self):
        from django.db.models import Count, Max
        from ..models import AIVectorDocument
        signature = AIVectorDocument.objects.aggregate(count=Count("pk"), latest=Max("updated_at"))
        if signature == self._overlay_signature:
            return
        dynamic = [row.document for row in AIVectorDocument.objects.all()]
        combined = {d["id"]: d for d in self._base_documents}
        combined.update({d["id"]: d for d in dynamic})
        self._documents = list(combined.values())
        # Refreshing the overlay is cheap and removes documents deleted from the shared table.
        self._vectors = {d["id"]: self._embed_text(self._document_text(d)) for d in self._documents}
        self._overlay_signature = signature

    @staticmethod
    def _document_text(doc):
        return doc.get("content_to_vectorize", doc.get("content", ""))

    def _dataset_fingerprint(self):
        raw = json.dumps(self._base_documents, sort_keys=True, ensure_ascii=False).encode("utf-8")
        return hashlib.sha256(raw).hexdigest()

    @_synchronized
    def _run_indexing(self) -> None:
        self._base_documents = self._load_documents()
        self._documents = list(self._base_documents)
        ids = {d["id"] for d in self._documents}
        vectors = None
        try:
            with open(CACHE_PATH, "r", encoding="utf-8") as source:
                cached = json.load(source)
            candidate = cached.get("vectors", {})
            valid_vectors = all(isinstance(v, list) and len(v) == self.DIM and
                                all(isinstance(x, (float, int)) and math.isfinite(x) for x in v)
                                for v in candidate.values())
            if (cached.get("embedding_version") == self.EMBEDDING_VERSION and
                    cached.get("dataset_fingerprint") == self._dataset_fingerprint() and
                    set(candidate) == ids and valid_vectors):
                vectors = candidate
        except (OSError, ValueError, TypeError, AttributeError):
            pass
        self._vectors = vectors if vectors is not None else {
            d["id"]: self._embed_text(self._document_text(d)) for d in self._documents}
        self._indexed = True
        self._overlay_signature = None
        if vectors is None:
            self.persist_cache()

    def _resolve_doc_and_vector(self, identifier: Any) -> Tuple[Optional[str], Optional[List[float]], Optional[dict]]:
        """
        Retrouve l'identifiant document et son vecteur correspondant a partir
        d'un entier, d'une string ou d'un doc_id exact, avec fallback ORM Django.
        """
        str_id = str(identifier).strip().removeprefix('account-')

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
            int_id = None

        # 4. Fallback ORM dynamique si l'entreprise est en base Django mais absente du JSONL initial
        if int_id is not None:
            try:
                from sales.models import Enterprise
                ent = Enterprise.objects.filter(id=int_id).first()
                if ent:
                    from .documents import enterprise_document
                    doc = enterprise_document(ent)
                    doc_id = doc['id']
                    vec = self._embed_text(self._document_text(doc))
                    self._documents.append(doc)
                    self._vectors[doc_id] = vec
                    return doc_id, vec, doc
            except Exception as exc:
                logger.debug("[VectorSearchService] Erreur resolution ORM pour ent %s: %s", int_id, exc)

        return None, None, None

    @_synchronized
    def search(
        self,
        query: str,
        n_results: int = 5,
        doc_type_filter: Optional[str] = None,
        document_filter=None,
    ) -> List[SimilarityResult]:
        """
        Recherche semantique par similarite cosine.
        Retourne les top-n_results documents les plus proches de la requete.
        """
        self._ensure_indexed()
        query_vector = self._embed_text(query)

        scores: List[tuple] = []
        for doc in self._documents:
            if document_filter is not None and not document_filter(doc):
                continue
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

    @_synchronized
    def find_similar_enterprises(
        self,
        enterprise_id: Any,
        top_k: int = 10,
        document_filter=None,
    ) -> List[SimilarityResult]:
        """
        Trouve les entreprises similaires a partir de l'embedding du profil enterprise.
        Supporte les IDs numeriques, les slugs et les doc_id complets.
        Filtre sur doc_type == 'enterprise_profile'.
        """
        self._ensure_indexed()
        source_id, source_vec, source_doc = self._resolve_doc_and_vector(enterprise_id)
        if document_filter is not None and (not source_doc or not document_filter(source_doc)):
            return []
        if source_vec is None:
            logger.warning(
                "[VectorSearchService] enterprise_id '%s' introuvable dans l'index.", enterprise_id
            )
            return []

        scores: List[tuple] = []
        for doc in self._documents:
            if document_filter is not None and not document_filter(doc):
                continue
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

    @_synchronized
    def get_enterprise_twin(
        self,
        enterprise_id: Any,
        top_k: int = 5,
    ) -> Optional[dict]:
        """
        Trouve l'entreprise jumelle directe de l'entreprise cible avec son score de proximite
        vectorielle 768D (en pourcentage) et sa justification semantique claire (twin_rationale).
        """
        results = self.find_similar_enterprises(enterprise_id=enterprise_id, top_k=top_k)
        if not results:
            return None

        twin = results[0]
        source_id, _, source_doc = self._resolve_doc_and_vector(enterprise_id)
        source_meta = (source_doc or {}).get("metadata", {})
        twin_meta = twin.metadata or {}

        reasons = []
        if source_meta.get("sector") and source_meta.get("sector") == twin_meta.get("sector"):
            reasons.append(f"Meme secteur ({source_meta.get('sector')})")
        if twin_meta.get("segment"):
            reasons.append(f"Segment {twin_meta.get('segment')}")
        if twin_meta.get("site_count"):
            reasons.append(f"{twin_meta.get('site_count')} sites d'implantation")
        if twin_meta.get("current_connectivity"):
            reasons.append(f"Connectivite {twin_meta.get('current_connectivity')}")

        rationale = " • ".join(reasons) if reasons else "Proximite topologique et dimensionnement IT similaire"

        return {
            "target_enterprise_id": enterprise_id,
            "twin_doc_id": twin.doc_id,
            "twin_name": twin_meta.get("name") or twin.title.replace("Fiche profil - ", "").strip(),
            "similarity_percentage": max(10, min(99, round(twin.score * 100))),
            "twin_rationale": rationale,
            "metadata": twin_meta,
            "top_candidates": [
                {
                    "doc_id": r.doc_id,
                    "title": (r.metadata.get("name") or r.title.replace("Fiche profil - ", "")).strip(),
                    "similarity_percentage": max(10, min(99, round(r.score * 100))),
                    "metadata": r.metadata,
                }
                for r in results[:top_k]
            ],
        }

    @_synchronized
    def find_upsell_candidates(
        self,
        enterprise_id: Any,
        service_not_having: str,
        top_k: int = 5,
        document_filter=None,
    ) -> List[SimilarityResult]:
        """
        Trouve les entreprises similaires qui ont adopte un service que la cible n'a pas.
        Filtre sur doc_type == 'enterprise_profile' et compare les offres recommandees / installees.
        """
        self._ensure_indexed()
        source_id, source_vec, target_doc = self._resolve_doc_and_vector(enterprise_id)
        if document_filter is not None and (not target_doc or not document_filter(target_doc)):
            return []
        if source_vec is None:
            logger.warning(
                "[VectorSearchService] enterprise_id '%s' introuvable dans l'index pour upsell.", enterprise_id
            )
            return []

        service_lower = service_not_having.strip().lower()

        scores: List[tuple] = []
        for doc in self._documents:
            if document_filter is not None and not document_filter(doc):
                continue
            doc_id = doc.get("id", "")
            if doc.get("doc_type") != "enterprise_profile":
                continue
            if doc_id == source_id:
                continue
            content = doc.get("content_to_vectorize", doc.get("content", "")).lower()
            rec_sol = str(doc.get("metadata", {}).get("recommended_solution", "")).lower()

            # Verifie si le pair a adopte ou utilise ce service
            has_service = any(service_lower in name.lower() for name in doc.get('metadata', {}).get('installed_services', []))
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

    @_synchronized
    def reindex(self, force_recompute: bool = True) -> int:
        """Rebuild from current sources, including the shared database overlay."""
        self._indexed = False
        if force_recompute:
            try:
                os.remove(CACHE_PATH)
            except FileNotFoundError:
                pass
        self._ensure_indexed()
        return len(self._vectors)

    @_synchronized
    def vectorize_enterprise(self, enterprise: Any, persist_cache: bool = True) -> List[float]:
        """
        Vectorise ou re-vectorise une entreprise spécifique suite à une mise à jour ou création.
        Génère le texte d'embedding enrichi, calcule le vecteur 768D (Gemini ou fallback déterministe),
        met à jour la table des vecteurs en mémoire et sauvegarde le cache sur disque.
        """
        from .documents import persist_enterprise_document
        self._ensure_indexed()
        doc = persist_enterprise_document(enterprise)
        doc_id = doc['id']
        vec = self._embed_text(self._document_text(doc))
        self._vectors[doc_id] = vec
        self._documents = [d for d in self._documents if d.get('id') != doc_id] + [doc]
        self._overlay_signature = None
        return vec

    @_synchronized
    def persist_cache(self) -> None:
        """Write only the static dataset cache. Dynamic documents live in PostgreSQL."""
        cache_path = Path(CACHE_PATH)
        temp_path = None
        try:
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            payload = {
                "embedding_version": self.EMBEDDING_VERSION,
                "dataset_fingerprint": self._dataset_fingerprint(),
                "vectors": {d["id"]: self._embed_text(self._document_text(d)) for d in self._base_documents},
            }
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=cache_path.parent,
                                             suffix=".tmp", delete=False) as target:
                temp_path = target.name
                json.dump(payload, target)
            os.replace(temp_path, cache_path)
        except OSError:
            logger.exception("[VectorSearchService] Cache persistence failed")
        finally:
            if temp_path and os.path.exists(temp_path):
                os.unlink(temp_path)


def __getattr__(name):
    # Compatibility for old callers without constructing a second singleton.
    if name == "vector_search_service":
        from .singleton import get_vector_search_service
        return get_vector_search_service()
    raise AttributeError(name)
