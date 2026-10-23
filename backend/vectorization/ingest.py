import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import json
from pathlib import Path
import chromadb
from chromadb.utils import embedding_functions

print("1. Initialisation du modele d'embedding SentenceTransformers (PyTorch)...")
embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

print("2. Connexion a ChromaDB...")
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(
    name="onbora_knowledge_base",
    embedding_function=embedding_fn
)

data_path = Path("../exports/vectorization/onbora_vectorization_full.jsonl")

if not data_path.exists():
    print(f"Erreur : Fichier introuvable a l'emplacement : {data_path.resolve()}")
else:
    ids, documents, metadatas = [], [], []

    with open(data_path, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            doc = json.loads(line)
            ids.append(str(doc["id"]))
            documents.append(str(doc["content_to_vectorize"]))
            
            meta = doc.get("metadata", {}).copy()
            meta["doc_type"] = str(doc.get("doc_type", ""))
            meta["title"] = str(doc.get("title", ""))
            
            cleaned_meta = {}
            for k, v in meta.items():
                if v is None:
                    continue
                if isinstance(v, (dict, list)):
                    cleaned_meta[k] = json.dumps(v)
                else:
                    cleaned_meta[k] = str(v)
            metadatas.append(cleaned_meta)

    print(f"Chargement de {len(documents)} documents en memoire.")
    print("3. Debut de l'ingestion par lots dans ChromaDB...")

    batch_size = 100
    total_batches = (len(documents) + batch_size - 1) // batch_size

    for i in range(0, len(documents), batch_size):
        batch_ids = ids[i:i + batch_size]
        batch_docs = documents[i:i + batch_size]
        batch_meta = metadatas[i:i + batch_size]
        
        collection.upsert(
            ids=batch_ids,
            documents=batch_docs,
            metadatas=batch_meta
        )
        print(f"   - Lot {i // batch_size + 1}/{total_batches} insere avec succes.")

    print(f"\nIngestion terminee avec succes ! Total dans ChromaDB : {collection.count()}")