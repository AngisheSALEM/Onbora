# Onbora - Dataset d'Export pour Vectorisation (RAG & Embeddings)

Ce dossier contient les données textuelles de la plateforme Onbora, structurées et prêtes pour l'ingestion par un modèle d'embedding (OpenAI `text-embedding-3`, Gemini `text-embedding-004`, Mistral `mistral-embed`, Hugging Face `all-MiniLM-L6-v2`, etc.) et une base vectorielle (ChromaDB, Pinecone, Qdrant, Weaviate, pgvector).

---

## 1. Fichiers Disponibles

| Fichier | Nb Documents | Description |
| :--- | :---: | :--- |
| **`onbora_vectorization_full.json`** | **1 207** | **Dataset complet unifié (format tableau JSON)**. |
| **`onbora_vectorization_full.jsonl`** | **1 207** | **Dataset complet au format JSON Lines (1 ligne = 1 document)**. |
| `services_catalog.json` | 54 | Catalogue complet des offres & services B2B (Fibre, Cybersécurité, SD-WAN, Cloud, etc.). |
| `visit_reports.json` | 110 | Comptes rendus de visites commerciales réels, synthèses, besoins détectés et objections. |
| `precall_briefings.json` | 13 | Briefings IA de préparation avant rendez-vous client (pitchs sur-mesure, défis, questions). |
| `b2b_news_feed.json` | 30 | Flux de veille économique B2B avec angles commerciaux et recommandations. |
| `enterprises_profiles.json` | 1 000 | Fiches d'entreprises qualifiées avec problématiques télécoms, secteur et pitchs adaptés. |

---

## 2. Structure Standard d'un Document

Chaque document respecte le schéma standard suivant :

```json
{
  "id": "service_37",
  "doc_type": "service_catalog",
  "title": "Ligne de Secours 4G/5G",
  "content_to_vectorize": "Offre : Ligne de Secours 4G/5G\nCatégorie : CONNECTIVITY\nDescription : Bascule automatique (failover) sur le réseau mobile Orange...\nBénéfices client : Continuité de service garantie...\nPrérequis techniques : Double WAN, SIM Orange Pro",
  "metadata": {
    "source_table": "catalog_servicecatalog",
    "service_id": 37,
    "category": "CONNECTIVITY"
  }
}
```

* `id` : Identifiant unique du document (clé primaire pour la base vectorielle).
* `doc_type` : Type de document (`service_catalog`, `visit_report`, `precall_briefing`, `b2b_news_intelligence`, `enterprise_profile`).
* `title` : Titre lisible du document.
* `content_to_vectorize` : **Texte brut dénormalisé**, enrichi et prêt à être envoyé directement à l'API d'embedding ou au splitter/chunker.
* `metadata` : Métadonnées associées utilisables pour les filtres lors des requêtes RAG (ex: filtrer par secteur ou catégorie).

---

## 3. Exemple d'Ingestion Rapide (Python)

```python
import json
from pathlib import Path

# Chargement du dataset complet
data_path = Path("onbora_vectorization_full.jsonl")

with open(data_path, "r", encoding="utf-8") as f:
    documents = [json.loads(line) for line in f]

print(f"Chargé {len(documents)} documents.")

# Exemple d'itération pour embedding :
for doc in documents:
    doc_id = doc["id"]
    text = doc["content_to_vectorize"]
    metadata = doc["metadata"]
    metadata["doc_type"] = doc["doc_type"]
    metadata["title"] = doc["title"]
    
    # embedding = embedding_model.embed_query(text)
    # vector_store.upsert(id=doc_id, vector=embedding, metadata=metadata)
```
