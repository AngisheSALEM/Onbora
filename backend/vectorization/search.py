import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import chromadb
from chromadb.utils import embedding_functions

# --- CONFIGURATION INITIALE (Partagée) ---
_CHROMA_CLIENT = None
_COLLECTION = None

def get_chroma_collection():
    """Initialise et retourne la collection ChromaDB de manière centralisée (Singleton)."""
    global _CHROMA_CLIENT, _COLLECTION
    if _COLLECTION is None:
        print("[INFO] Initialisation du client ChromaDB et du modele d'embedding...")
        embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        _CHROMA_CLIENT = chromadb.PersistentClient(path="./chroma_db")
        _COLLECTION = _CHROMA_CLIENT.get_or_create_collection(
            name="onbora_knowledge_base",
            embedding_function=embedding_fn
        )
    return _COLLECTION


# --- FONCTION CORE POUR L'INTÉGRATION (API / Tests d'intégration) ---
def search_knowledge_base(query: str, n_results: int = 5, where_filter: dict = None) -> list:
    """
    Exécute une recherche sémantique dans la base de connaissances Onbora.
    
    Args:
        query (str): La requête textuelle (générée par l'utilisateur ou par un LLM).
        n_results (int): Le nombre de résultats souhaités (défaut à 5).
        where_filter (dict, optional): Un filtre optionnel sur les métadonnées (ex: {"doc_type": "visit_report"}).
        
    Returns:
        list: Une liste de dictionnaires propres contenant les résultats structurés.
    """
    collection = get_chroma_collection()
    
    if collection.count() == 0:
        print("[AVERTISSEMENT] La base de donnees ChromaDB est vide.")
        return []

    # Paramètres de la requête ChromaDB
    query_params = {
        "query_texts": [query],
        "n_results": n_results
    }
    
    # Ajout du filtre par métadonnées si présent (très utile pour cibler les modules Onbora)
    if where_filter:
        query_params["where"] = where_filter

    results = collection.query(**query_params)

    # Formatage propre des résultats sous forme de liste de dictionnaires exploitables par l'API
    formatted_results = []
    if results and results["ids"] and len(results["ids"][0]) > 0:
        for i in range(len(results["ids"][0])):
            formatted_results.append({
                "id": results["ids"][0][i],
                "title": results["metadatas"][0][i].get("title"),
                "doc_type": results["metadatas"][0][i].get("doc_type"),
                "content": results["documents"][0][i],
                "distance": results["distances"][0][i] if "distances" in results else None,
                "metadata": results["metadatas"][0][i]
            })
            
    return formatted_results


# --- TEST UNITAIRE / CLI (Isolé et commentable) ---
if __name__ == "__main__":
    print("=== MODE TEST UNITAIRE : search.py ===")
    
    # Requête de test simulant une recherche guidée par un besoin commercial MSP
    test_query = "solution pour securite reseau et connexion fibre"
    print(f"Recherche en cours pour : '{test_query}'...\n")
    
    # Appel de la fonction modulaire
    results = search_knowledge_base(query=test_query, n_results=5)
    
    if results:
        for idx, res in enumerate(results, 1):
            print(f"--- Résultat {idx} ---")
            print(f"ID       : {res['id']}")
            print(f"Titre    : {res['title']}")
            print(f"Type     : {res['doc_type']}")
            print(f"Distance : {res['distance']:.4f}" if res['distance'] is not None else "")
            print(f"Extrait  : {res['content'][:150]}...\n")
    else:
        print("Aucun résultat trouvé.")