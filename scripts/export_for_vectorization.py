"""
Script d'exportation de la base de donnees Onbora pour la vectorisation (RAG / Embeddings / Vector DB).
Genere des fichiers JSON et JSONL prets pour l'ingestion par un ingenieur IA.
"""

import json
import os
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "backend" / "db.sqlite3"
EXPORT_DIR = BASE_DIR / "backend" / "exports" / "vectorization"

EXPORT_DIR.mkdir(parents=True, exist_ok=True)

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

all_documents = []

# ==========================================
# 1. CATALOGUE DES SERVICES / OFFRES B2B
# ==========================================
cur.execute("SELECT id, name, category, description, benefits, technical_requirements FROM catalog_servicecatalog")
services = []
for row in cur.fetchall():
    tech = row["technical_requirements"] or ""
    text_content = (
        f"Offre : {row['name']}\n"
        f"Categorie : {row['category']}\n"
        f"Description : {row['description']}\n"
        f"Benefices client : {row['benefits']}\n"
        f"Prerequis techniques : {tech}"
    )
    doc = {
        "id": f"service_{row['id']}",
        "doc_type": "service_catalog",
        "title": row["name"],
        "content_to_vectorize": text_content.strip(),
        "metadata": {
            "source_table": "catalog_servicecatalog",
            "service_id": row["id"],
            "category": row["category"]
        }
    }
    services.append(doc)
    all_documents.append(doc)

with open(EXPORT_DIR / "services_catalog.json", "w", encoding="utf-8") as f:
    json.dump(services, f, ensure_ascii=False, indent=2)

print(f"[OK] Exporte {len(services)} services dans services_catalog.json")

# ==========================================
# 2. RAPPORTS DE VISITE & COMPTES RENDUS KAM
# ==========================================
cur.execute("""
    SELECT r.id, r.raw_transcript, r.executive_summary, r.confirmed_needs, 
           r.objections_raised, r.actions_todo, r.conversion_status, r.created_at,
           e.name as enterprise_name, e.sector as enterprise_sector
    FROM kam_kamvisitreport r
    LEFT JOIN sales_enterprise e ON r.enterprise_id = e.id
""")
visit_reports = []
for row in cur.fetchall():
    ent_name = row["enterprise_name"] or "Entreprise B2B"
    ent_sector = row["enterprise_sector"] or "Non specifie"
    
    needs = row["confirmed_needs"] or ""
    objections = row["objections_raised"] or ""
    actions = row["actions_todo"] or ""
    summary = row["executive_summary"] or ""
    transcript = row["raw_transcript"] or ""
    
    text_content = (
        f"Compte rendu de visite commerciale - {ent_name} (Secteur : {ent_sector})\n"
        f"Statut : {row['conversion_status']}\n"
        f"Synthese : {summary}\n"
        f"Besoins confirmes : {needs}\n"
        f"Objections soulevees : {objections}\n"
        f"Actions convenues : {actions}\n"
        f"Transcription de l'echange : {transcript}"
    )
    doc = {
        "id": f"visit_report_{row['id']}",
        "doc_type": "visit_report",
        "title": f"Rapport de visite - {ent_name}",
        "content_to_vectorize": text_content.strip(),
        "metadata": {
            "source_table": "kam_kamvisitreport",
            "report_id": row["id"],
            "enterprise_sector": ent_sector,
            "conversion_status": row["conversion_status"],
            "created_at": str(row["created_at"])
        }
    }
    visit_reports.append(doc)
    all_documents.append(doc)

with open(EXPORT_DIR / "visit_reports.json", "w", encoding="utf-8") as f:
    json.dump(visit_reports, f, ensure_ascii=False, indent=2)

print(f"[OK] Exporte {len(visit_reports)} rapports de visite dans visit_reports.json")

# ==========================================
# 3. BRIEFS DE PREPARATION DE VISITE (PRECALL BRIEFINGS)
# ==========================================
cur.execute("""
    SELECT b.id, b.company_overview, b.detected_business_challenges, 
           b.custom_pitch_angles, b.critical_discovery_questions, b.golden_rules,
           e.name as enterprise_name, e.sector as enterprise_sector
    FROM kam_precallbriefing b
    LEFT JOIN sales_enterprise e ON b.enterprise_id = e.id
""")
briefings = []
for row in cur.fetchall():
    ent_name = row["enterprise_name"] or "Entreprise"
    ent_sector = row["enterprise_sector"] or ""
    
    text_content = (
        f"Briefing commercial pre-visite : {ent_name} (Secteur: {ent_sector})\n"
        f"Vue d'ensemble : {row['company_overview'] or ''}\n"
        f"Defis operationnels detectes : {row['detected_business_challenges'] or ''}\n"
        f"Angles d'attaque & Pitchs cibles : {row['custom_pitch_angles'] or ''}\n"
        f"Questions cles de decouverte : {row['critical_discovery_questions'] or ''}\n"
        f"Regles d'or pour le commercial : {row['golden_rules'] or ''}"
    )
    doc = {
        "id": f"precall_briefing_{row['id']}",
        "doc_type": "precall_briefing",
        "title": f"Briefing commercial - {ent_name}",
        "content_to_vectorize": text_content.strip(),
        "metadata": {
            "source_table": "kam_precallbriefing",
            "briefing_id": row["id"],
            "enterprise_sector": ent_sector
        }
    }
    briefings.append(doc)
    all_documents.append(doc)

with open(EXPORT_DIR / "precall_briefings.json", "w", encoding="utf-8") as f:
    json.dump(briefings, f, ensure_ascii=False, indent=2)

print(f"[OK] Exporte {len(briefings)} briefings pre-visite dans precall_briefings.json")

# ==========================================
# 4. ACTUALITES & VEILLE D'INTELLIGENCE B2B
# ==========================================
cur.execute("""
    SELECT id, title, summary, category, priority, commercial_angle, 
           recommended_action, recommended_offer, source_name, published_at
    FROM kam_b2bnewsfeeditem
""")
news_items = []
for row in cur.fetchall():
    text_content = (
        f"Actualite B2B : {row['title']}\n"
        f"Categorie : {row['category']} (Priorite : {row['priority']})\n"
        f"Source : {row['source_name']} ({row['published_at']})\n"
        f"Resume des faits : {row['summary']}\n"
        f"Angle commercial identifie : {row['commercial_angle']}\n"
        f"Action recommandee : {row['recommended_action']}\n"
        f"Offre a pousser : {row['recommended_offer']}"
    )
    doc = {
        "id": f"b2b_news_{row['id']}",
        "doc_type": "b2b_news_intelligence",
        "title": row["title"],
        "content_to_vectorize": text_content.strip(),
        "metadata": {
            "source_table": "kam_b2bnewsfeeditem",
            "category": row["category"],
            "priority": row["priority"],
            "recommended_offer": row["recommended_offer"],
            "published_at": str(row["published_at"])
        }
    }
    news_items.append(doc)
    all_documents.append(doc)

with open(EXPORT_DIR / "b2b_news_feed.json", "w", encoding="utf-8") as f:
    json.dump(news_items, f, ensure_ascii=False, indent=2)

print(f"[OK] Exporte {len(news_items)} flux B2B dans b2b_news_feed.json")

# ==========================================
# 5. PROFILS QUALIFIES D'ENTREPRISES B2B (Anonymises / Scenarises)
# ==========================================
cur.execute("""
    SELECT id, name, sector, location, segment, approximate_size,
           current_connectivity, pain_level, recommended_solution,
           conversion_notes, ai_tailored_pitch
    FROM sales_enterprise
    WHERE recommended_solution IS NOT NULL AND recommended_solution != ''
""")
enterprises = []
for row in cur.fetchall():
    text_content = (
        f"Entreprise B2B : {row['name']} | Secteur : {row['sector']} | Segment : {row['segment']}\n"
        f"Localisation : {row['location']} | Taille : {row['approximate_size']}\n"
        f"Connectivite actuelle : {row['current_connectivity']} | Niveau d'urgence/douleur : {row['pain_level']}\n"
        f"Solution recommandee par Onbora : {row['recommended_solution']}\n"
        f"Pitch commercial personnalise : {row['ai_tailored_pitch'] or 'Non renseigne'}\n"
        f"Notes de conversion / Retours : {row['conversion_notes'] or 'Non renseigne'}"
    )
    doc = {
        "id": f"enterprise_profile_{row['id']}",
        "doc_type": "enterprise_profile",
        "title": f"Fiche profil - {row['name']}",
        "content_to_vectorize": text_content.strip(),
        "metadata": {
            "source_table": "sales_enterprise",
            "enterprise_id": row["id"],
            "sector": row["sector"],
            "segment": row["segment"],
            "recommended_solution": row["recommended_solution"]
        }
    }
    enterprises.append(doc)
    all_documents.append(doc)

with open(EXPORT_DIR / "enterprises_profiles.json", "w", encoding="utf-8") as f:
    json.dump(enterprises, f, ensure_ascii=False, indent=2)

print(f"[OK] Exporte {len(enterprises)} profils d'entreprises dans enterprises_profiles.json")

# ==========================================
# 6. EXPORT GLOBAL UNIFIE (JSON & JSONL)
# ==========================================
with open(EXPORT_DIR / "onbora_vectorization_full.json", "w", encoding="utf-8") as f:
    json.dump(all_documents, f, ensure_ascii=False, indent=2)

with open(EXPORT_DIR / "onbora_vectorization_full.jsonl", "w", encoding="utf-8") as f:
    for doc in all_documents:
        f.write(json.dumps(doc, ensure_ascii=False) + "\n")

print("\n==========================================")
print(f"Total documents prepares pour vectorisation : {len(all_documents)}")
print(f"Dossier de sortie : {EXPORT_DIR}")
print("==========================================")
