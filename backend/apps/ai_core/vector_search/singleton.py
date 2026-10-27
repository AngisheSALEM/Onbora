from __future__ import annotations

import threading

from .service import VectorSearchService

_instance: VectorSearchService | None = None
_lock = threading.Lock()


def get_vector_search_service() -> VectorSearchService:
    """Retourne le singleton thread-safe du VectorSearchService."""
    global _instance
    if _instance is None:
        with _lock:
            if _instance is None:
                _instance = VectorSearchService()
    return _instance
