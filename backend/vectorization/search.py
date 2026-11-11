"""
Module de recherche vectorielle et detection d'entreprise jumelle (Onbora Vector Search).
========================================================================================
Architecture :
- Moteur principal : VectorSearchService (apps.ai_core.vector_search) base sur les embeddings 768D
  Google Gemini et cache persistant in-process ultra-rapide (compatible Cloud Render < 30 Mo RAM).
- Supporte la recherche semantique libre et la detection de l'entreprise jumelle (Twin Enterprise).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Initialisation securisee de l'environnement Django si appele hors serveur web
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
APPS_DIR = BACKEND_DIR / "apps"
if str(APPS_DIR) not in sys.path:
    sys.path.insert(0, str(APPS_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "onbora.settings")

try:
    import django
    if not django.apps.apps.ready:
        django.setup()
except Exception:
    pass

from apps.ai_core.vector_search.singleton import get_vector_search_service


def get_vector_search_engine():
    """Initialise et retourne le singleton du moteur vectoriel 768D."""
    return get_vector_search_service()


def search_knowledge_base(
    query: str,
    n_results: int = 5,
    where_filter: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Execute une recherche semantique haute precision dans la base de connaissances Onbora.
    
    Args:
        query: Requete textuelle
        n_results: Nombre de resultats souhaites
        where_filter: Filtre optionnel (ex: {"doc_type": "enterprise_profile"})
    """
    svc = get_vector_search_engine()
    doc_type = None
    if where_filter and "doc_type" in where_filter:
        doc_type = where_filter["doc_type"]

    raw_results = svc.search(query=query, n_results=n_results, doc_type_filter=doc_type)

    formatted = []
    for r in raw_results:
        formatted.append({
            "id": r.doc_id,
            "title": r.title,
            "doc_type": r.doc_type,
            "content": r.content,
            "similarity_score": r.score,
            "distance": round(1.0 - r.score, 4),
            "metadata": r.metadata,
        })
    return formatted


def find_twin_enterprise(
    enterprise_id: Any,
    top_k: int = 5,
) -> Optional[Dict[str, Any]]:
    """
    Trouve l'entreprise jumelle (Twin Enterprise) d'une entreprise cible a partir de son
    vecteur sémantique complet (secteur, connectivite, sites, problematiques, parc).
    
    Args:
        enterprise_id: Identifiant de l'entreprise (ex: 3495 ou 'enterprise_profile_3495')
        top_k: Nombre de candidats proches a remonter
        
    Returns:
        Dictionnaire detaille contenant l'entreprise jumelle recommandee, le score
        de proximite vectorielle (10-99%) et la justification semantique (twin_rationale).
    """
    svc = get_vector_search_engine()
    return svc.get_enterprise_twin(enterprise_id=enterprise_id, top_k=top_k)


# --- MODE TEST CLI ---
if __name__ == "__main__":
    print("=== TEST DU MODULE VECTORIEL ONBORA (768D IN-PROCESS) ===\n")
    
    # 1. Test Recherche Textuelle
    test_query = "solution pour securite reseau et connexion fibre"
    print(f"1. Recherche semantique pour : '{test_query}'...")
    results = search_knowledge_base(query=test_query, n_results=3)
    for idx, res in enumerate(results, 1):
        print(f"   [{idx}] {res['title']} ({res['doc_type']}) - Score: {res['similarity_score']:.2f}")

    # 2. Test Detection Entreprise Jumelle
    test_ent_id = 3495
    print(f"\n2. Detection de l'entreprise jumelle pour le compte #{test_ent_id}...")
    twin_data = find_twin_enterprise(test_ent_id, top_k=3)
    if twin_data:
        print(f"   Jumeau detecte : {twin_data['twin_name']}")
        print(f"   Proximite      : {twin_data['similarity_percentage']}%")
        print(f"   Justification  : {twin_data['twin_rationale']}")
        print("   Top candidats  :")
        for cand in twin_data["top_candidates"]:
            print(f"    - {cand['title']} ({cand['similarity_percentage']}%)")
    else:
        print("   Aucun jumeau identifie.")
