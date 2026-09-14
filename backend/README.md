# Architecture Backend Onbora — Monolithe Modulaire

Le backend Onbora est un **Monolithe Modulaire Django** conçu pour offrir une haute vélocité, zéro latence inter-services et une robustesse transactionnelle avec Neon PostgreSQL.

---

## 1. Cartographie des Domaines Métier (Applications Django)

Les applications Django sont organisées par domaines métier étanches :

### Applications Métier Principales (Racine `backend/`)
* **`accounts/`** : Gestion des utilisateurs, RBAC (Client B2B, Commercial Terrain, KAM, Admin MSP), tokens d'authentification.
* **`catalog/`** : Catalogue de base des services MSP géré par l'administrateur.
* **`sales/`** : Module Prospection Terrain (détection de plaques géographiques, fiches prospects, mode visite dictaphone, qualification BANT).
* **`kam/`** : Espace Key Account Management (validation des opportunités qualifiées, enrichissement, dispatching, fiches de synthèse).
* **`discovery/`** : Chat entrant de qualification conversationnelle pour les clients B2B.
* **`twin/`** : Génération du Business Twin (comparatif Avant/Après de la maturité digitale).
* **`reporting/`** : Moteur d'événements de démonstration et métriques de suivi.
* **`training/`** : Espace d'adoption post-intégration des services (guides interactifs, FAQ, tutoriels).
* **`shared/`** : Utilitaires transverses, middleware de sécurité et connecteurs externes.
* **`onbora/`** : Configuration globale du projet Django (`settings.py`, `urls.py`, `wsgi.py`, `asgi.py`).

### Hub d'Intelligence Artificielle & Rapports Avancés (`backend/apps/`)
* **`apps/ai_core/`** : **Le Hub IA Onbora unifié**. Intègre in-process :
  * Moteur RAG TF-IDF (`rag_service.py`) sur le catalogue officiel Orange Business.
  * Les 5 moteurs d'action B2B : Pre-Call, Post-Call, Lead Scoring, Churn Radar, Sales Enrichment.
  * Outils d'exécution connectés à la base de données (`tools/crm_tools.py`).
  * Mémoire de session persistante PostgreSQL & boucle Human-in-the-Loop (`models.AISessionMemory`, `services/session_service.py`).
  * Endpoints REST DRF complets sous `/api/ai/` et `/api/v1/ai/`.
* **`apps/reports/`** : Moteur de génération et validation stricte Pydantic des rapports KAM et Business Twin (`models.GeneratedReport`).
* **`apps/workbench/` & `apps/api/`** : Bancs de test et prototypes d'évaluation d'inférence.

---

## 2. Ressources Statiques & Schémas IA

* **`contracts/`** : Spécifications JSON Schema (`*.schema.json`) des contrats d'échange de données.
* **`evals/`** : Jeux de données de test et benchmarks pour l'évaluation LLM (`cases.json`, `gemini-cases.json`).
* **`prompts/`** : Modèles Markdown de prompts d'extraction.
* **`catalog_ai/`** : Historique versionné du catalogue Orange Business et scripts de validation d'intake.

---

## 3. Endpoints de l'API IA (`/api/ai/`)

| Méthode | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/ai/health/` | Diagnostic de santé, modèle configuré et disponibilité RAG |
| `GET` | `/api/ai/tools/` | Liste des outils et connecteurs CRM disponibles pour l'IA |
| `POST` | `/api/ai/catalog/search/` | Recherche RAG multicritère avec pondération TF-IDF |
| `GET` | `/api/ai/catalog/service/<id>/` | Fiche détaillée d'un service officiel Orange Business |
| `POST` | `/api/ai/pre-call/` | Génération du dossier d'attaque avant rendez-vous client |
| `POST` | `/api/ai/post-call/` | Génération de l'email commercial, CRM payload et tâches |
| `POST` | `/api/ai/lead-scoring/` | Évaluation du prospect selon le barème stratégique Orange |
| `POST` | `/api/ai/churn-radar/` | Détection d'attrition et plan d'action rétention sous 48h |
| `POST` | `/api/ai/sales-enrichment/` | Hypothèses commerciales basées sur le scraping web |
| `POST` | `/api/ai/analyze/` | Analyse d'échanges, détection de besoin de validation humaine |
| `POST` | `/api/ai/validate/` | Enregistrement de la décision humaine (approved / rejected) |
| `GET` | `/api/ai/session/<id>/` | Consultation de l'historique et de la mémoire de session |
