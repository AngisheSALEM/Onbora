# Guide de Test du Core AI Onbora (AI Engineer Handbook)

Ce guide est destiné à **l'ingénieur IA** travaillant sur le moteur d'intelligence commerciale Onbora (`backend/apps/ai_core/`). Il répertorie toutes les méthodes pour tester, évaluer, déboguer et benchmarker les moteurs IA en local ou en intégration continue.

---

## 1. Vue d'Ensemble de l'Architecture AI Core

Le Core AI Onbora fonctionne en **mode in-process haute performance** au sein du backend Django REST Framework. Il est accessible via :
- Le singleton Python : `from apps.ai_core.unified_engine import get_unified_core_ai`
- Les endpoints REST unifiés sous `/api/v1/ai/` (et alias `/api/ai/`)
- Les cas d'usage métier de vente terrain sous `/api/v1/sales/visit-reports/generate-from-ai/`

### Les 5 Moteurs d'Action B2B du Core AI :
1. **Pre-Call Intelligence Engine** (`apps/ai_core/pre_call/`) : Génération du dossier d'attaque avant RDV (décideurs clés, défis business, angles de pitch catalogue Orange, questions critiques).
2. **Post-Call Intelligence Engine** (`apps/ai_core/post_call/`) : Synthèse d'entretien, projet d'email commercial J+1 / J+4, payload CRM structuré et prochaines actions.
3. **Lead Scoring Engine** (`apps/ai_core/lead_scoring/`) : Évaluation du prospect de 0 à 100 selon le barème B2B Orange Business (TIER_1, TIER_2, TIER_3).
4. **Churn Radar Engine** (`apps/ai_core/churn_radar/`) : Détection préventive d'attrition sur signaux faibles et plan de rétention sous 48h.
5. **Sales Enrichment Engine** (`apps/ai_core/sales_enrichment/`) : Hypothèses commerciales automatisées.

### Composants Transverses :
- **Moteur RAG TF-IDF Catalogue** (`apps/ai_core/rag_service.py`) : Recherche inversée et scoring instantané (< 2ms) sur le catalogue officiel Orange Business (`offres_orange_b2b.json`).
- **Garde-Fou Catalogue (Anti-Hallucination)** (`apps/ai_core/common/catalog_guard.py`) : Empêche le LLM de citer des offres inexistantes en injectant les offres pertinentes issues du RAG.
- **Mémoire de Session & HITL** (`apps/ai_core/services/session_service.py`) : Persistance PostgreSQL de la mémoire d'échange et approbation humaine (Human-in-the-Loop).

---

## 2. Méthode 1 : Suite de Tests Unitaires Automatisés (Recommandé en CI/CD)

Une suite complète de tests Django REST est disponible dans `backend/apps/ai_core/tests.py`. Elle valide l'initialisation des 5 moteurs, le RAG, les schémas Pydantic, les fallbacks et l'ensemble des endpoints DRF.

### Exécution depuis le dossier `backend/` :
```bash
# Dans le dossier backend avec le venv activé :
python manage.py test apps.ai_core
```

### Options utiles :
```bash
# Mode verbeux pour voir chaque test exécuté
python manage.py test apps.ai_core -v 2

# Réutiliser la base de données de test (gain de temps)
python manage.py test apps.ai_core --keepdb
```

### Ce qui est vérifié :
- RAG search, récupération par `service_id`, gestion des identifiants inconnus.
- Initialisation correcte de tous les moteurs dans `UnifiedCoreAI`.
- Robustesse des schémas de repli (`_build_fallback`) en cas de coupure réseau ou quota Gemini dépassé.
- Fonctionnement des endpoints REST `/api/v1/ai/health/`, `/api/v1/ai/catalog/search/`, `/api/v1/ai/pre-call/`, `/api/v1/ai/lead-scoring/`, `/api/v1/ai/churn-radar/`.

---

## 3. Méthode 2 : Évaluation Déterministe sur Corpus Synthétique (Offline Benchmark)

Cette commande exécute le corpus de **32 cas de test de qualification B2B** sans appel réseau externe (zéro coût, 100% déterministe).

### Exécution :
```bash
python manage.py run_ai_eval
```

### Résultat attendu :
```text
[PASS] global-cloud-migration
[PASS] global-managed-cybersecurity
[PASS] school-connectivity-backup
[PASS] clinic-backup-security
...
[PASS] multiturn-prompt-injection-ignored
32 evaluation cases passed
```

### Emplacement des cas de test :
- `backend/resources/evals/cases.json` : Vous pouvez y ajouter de nouveaux cas de test métier (secteur, besoin exprimé, services Orange attendus, informations manquantes).

---

## 4. Méthode 3 : Démonstration Bout-en-Bout Hors-Ligne (`demo_ai_v1`)

Permet de simuler un parcours complet de qualification d'une entreprise (ingestion de message, extraction de faits, recommandation de catalogue, rapport KAM et Business Twin) avec le modèle heuristique hors-ligne.

### Exécution standard :
```bash
python manage.py demo_ai_v1
```

### Exécution avec un message personnalisé :
```bash
python manage.py demo_ai_v1 --message "Clinique Mère-Enfant à Gombe, 40 salariés, nous avons besoin d'une fibre dédiée avec secours et d'un archivage cloud sécurisé."
```

Le résultat affiche l'ensemble du cycle JSON généré : `turn`, `recommendations`, `kam`, `business_twin`.

---

## 5. Méthode 4 : Évaluation Live avec Gemini (`run_gemini_eval`)

Permet de mesurer les performances réelles du modèle Gemini (taux de réussite, fidélité aux offres du catalogue, latence, précision des champs extraits).

> [!WARNING]
> Cette commande effectue de vrais appels réseau vers l'API Gemini. Le flag `--confirm-network` est obligatoire pour éviter tout appel involontaire.

### Exécution :
```bash
# Évaluer sur les 5 premiers cas synthétiques
python manage.py run_gemini_eval --confirm-network --limit 5

# Évaluer un cas spécifique
python manage.py run_gemini_eval --confirm-network --case clinic-backup-security

# Évaluation stricte avec seuils minimaux d'acceptation (échec si < 80% de réussite)
python manage.py run_gemini_eval --confirm-network --fail-on-thresholds --minimum-case-pass-rate 0.8
```

---

## 6. Méthode 5 : Tests Interactifs en Shell Python (REPL)

Pour prototyper ou tester une méthode du Core AI de manière interactive, lancez le shell Django :
```bash
python manage.py shell
```

### A. Tester le RAG Catalogue Orange Business :
```python
from apps.ai_core.rag_service import get_catalog_rag

rag = get_catalog_rag()
results = rag.search("fibre optique secours 4G", limit=2)
for r in results:
    print(f"[{r['service_id']}] {r['name']} (Score: {r['score']})")
```

### B. Tester le Moteur Pre-Call (Dossier d'attaque avant RDV) :
```python
from apps.ai_core.unified_engine import get_unified_core_ai
from apps.ai_core.pre_call.models import PreCallInput

core_ai = get_unified_core_ai()
inp = PreCallInput(
    company_name="Clinique Reine Elisabeth",
    sector="SANTE",
    locations_count=2,
    current_operator="Autre",
    current_connectivity="ADSL Instable",
    known_context="Coupures régulières empêchant la télétransmission des dossiers patients."
)
result = core_ai.pre_call_engine.generate(inp)
print(result.model_dump_json(indent=2))
```

### C. Tester le Lead Scoring B2B :
```python
from apps.ai_core.unified_engine import get_unified_core_ai
from apps.ai_core.lead_scoring.models import LeadScoringInput

core_ai = get_unified_core_ai()
inp = LeadScoringInput(
    company_name="Société Minière de Bisunzu (SMB)",
    sector="MINES",
    locations_count=4,
    budget_status="CONFIRMED",
    pain_level="Critique",
    decision_maker_involved=True,
    raw_notes="Besoin urgent de connecter 4 sites isolés avec une GTR de 4h."
)
score = core_ai.lead_scoring_engine.evaluate(inp)
print(f"Score: {score.lead_score}/100 | Segment: {score.scoring_tier.value}")
for driver in score.score_drivers:
    print(f"  {driver.impact} : {driver.factor}")
```

### D. Tester le Churn Radar (Risque d'attrition & rétention) :
```python
from apps.ai_core.unified_engine import get_unified_core_ai
from apps.ai_core.churn_radar.models import ChurnRadarInput

core_ai = get_unified_core_ai()
inp = ChurnRadarInput(
    company_name="Supermarché Express",
    current_services=["Fibre Pro 50 Mbps"],
    recent_interactions_notes="3 coupures de caisse enregistreuse ce mois-ci, le gérant menace de résilier pour la concurrence.",
    unresolved_incidents_count=3
)
churn = core_ai.churn_radar_engine.analyze(inp)
print(f"Niveau de risque : {churn.churn_risk_level.value} (Score: {churn.churn_score})")
print(f"Action 48h : {churn.retention_plan.action}")
print(f"Email proposé : {churn.retention_plan.email_draft}")
```

---

## 7. Méthode 6 : Tests via Requêtes HTTP / REST (cURL & API Client)

Avec le serveur en écoute (`python manage.py runserver 0.0.0.0:8000`) :

### A. Vérification de santé (`GET /api/v1/ai/health/`)
```bash
curl -s http://localhost:8000/api/v1/ai/health/
```
**Réponse :**
```json
{
  "status": "healthy",
  "service": "Onbora Core AI In-Process",
  "model": "gemini-2.5-flash",
  "has_api_key": true,
  "rag_available": true
}
```

### B. Recherche RAG Catalogue (`POST /api/v1/ai/catalog/search/`)
```bash
curl -X POST http://localhost:8000/api/v1/ai/catalog/search/ \
  -H "Content-Type: application/json" \
  -d '{"query": "cybersecurite firewall soc", "limit": 2}'
```

### C. Génération de Briefing Pre-Call (`POST /api/v1/ai/pre-call/`)
```bash
curl -X POST http://localhost:8000/api/v1/ai/pre-call/ \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Cabinet Notarial Maître Mamba",
    "sector": "JURIDIQUE",
    "locations_count": 1,
    "known_context": "Manipulation d actes confidentiels, besoin de haute securite."
  }'
```

### D. Lead Scoring (`POST /api/v1/ai/lead-scoring/`)
```bash
curl -X POST http://localhost:8000/api/v1/ai/lead-scoring/ \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Hôtel Palm Beach",
    "sector": "HOTELLERIE",
    "locations_count": 1,
    "budget_status": "CONFIRMED",
    "decision_maker_involved": true
  }'
```

### E. Churn Radar (`POST /api/v1/ai/churn-radar/`)
```bash
curl -X POST http://localhost:8000/api/v1/ai/churn-radar/ \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Pharmacie Centrale",
    "current_services": ["Fibre Pro 20 Mbps"],
    "recent_interactions_notes": "Le pharmacien titulaire se plaint de lenteurs sur le serveur de télétransmission et consulte la concurrence.",
    "unresolved_incidents_count": 2
  }'
```

---

## 8. Gestion de la Clé API Gemini & Mode Dégradé (Fallback)

### Configuration de la clé :
Dans votre fichier `backend/.env` :
```env
GEMINI_API_KEY=AIzaSy...votre_cle...
GEMINI_MODEL=gemini-2.5-flash
```

### Comportement en cas de panne externe :
Tous les moteurs du Core AI Onbora héritent de `BaseAIEngine` (`apps/ai_core/common/base_engine.py`) :
1. Si `GEMINI_API_KEY` est absente, invalide ou si les quotas Google sont épuisés (HTTP 429), le Core AI loggue un warning mais **ne lève jamais d'erreur 500**.
2. Il déclenche immédiatement sa méthode `_build_fallback(input_data, catalog_offers)` qui calcule des réponses basées sur les règles expertes Orange Business et le RAG local.
3. Pour tester le comportement en mode dégradé, commentez temporairement `GEMINI_API_KEY` dans `.env` et relancez `python manage.py test apps.ai_core`.

---

## 9. Bonnes Pratiques pour l'Ingénieur IA

1. **Validation Stricte Pydantic** : Chaque sortie LLM doit être validée par un modèle Pydantic (`PreCallOutput`, `PostCallOutput`, `LeadScoringOutput`). Utilisez des `@field_validator(..., mode='before')` pour normaliser les variations textuelles du LLM (ex : "MODERATE" -> "MEDIUM").
2. **Respect des Hooks Onbora** :
   - Lancez toujours `python scripts/verify_technical_debt.py` avant de pousser vos modifications.
   - Respectez l'architecture Clean SoC : aucune requête ORM directe dans les prompts ou les moteurs purs.
3. **Zéro Émojis** : Conformément à la charte Onbora, les prompts de génération de compte-rendu ou d'emails doivent instruire le modèle de ne jamais générer d'émojis Unicode.
