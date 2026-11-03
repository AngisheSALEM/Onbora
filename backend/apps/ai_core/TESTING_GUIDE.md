# Guide de Test du Core AI Onbora (AI Engineer Handbook)

Ce document est le guide de référence pour **l'ingénieur IA** développant sur `backend/apps/ai_core/`.
Consultez également le guide principal à la racine : [`CORE_AI_TESTING_GUIDE.md`](file:///C:/Users/Salem/Documents/projet/Onbora/CORE_AI_TESTING_GUIDE.md).

---

## Commandes Rapides

### 1. Tests Unitaires DRF (In-Process & REST)
```bash
python manage.py test apps.ai_core
```

### 2. Évaluation Déterministe Offline (32 cas de test)
```bash
python manage.py run_ai_eval
```

### 3. Parcours Démo Bout-en-Bout Offline
```bash
python manage.py demo_ai_v1
```

### 4. Évaluation Réelle Gemini (Appels Réseau)
```bash
python manage.py run_gemini_eval --confirm-network --limit 5
```

### 5. Shell Interactif Python
```bash
python manage.py shell
```
```python
from apps.ai_core.unified_engine import get_unified_core_ai
core_ai = get_unified_core_ai()
# pre_call_engine, post_call_engine, lead_scoring_engine, churn_radar_engine
```

### 6. Health Check API
```bash
curl -s http://localhost:8000/api/v1/ai/health/
```
# Correctifs de dette technique — 3 novembre 2026

Validation isolée (SQLite en mémoire, Gemini désactivé) depuis `backend/` :

```powershell
.\venv\Scripts\python.exe manage.py test apps.ai_core kam.tests kam.test_mobile_appointment_update kam.test_news_feed kam.test_churn_radar --settings=onbora.test_settings --noinput
```

Les tests vectoriels utilisent leurs propres documents et caches temporaires. Les tests du compilateur écrivent dans un dossier temporaire. Aucun compte de production n'est requis.

Contrats et exploitation :

- Les recherches vectorielles nécessitent une authentification. Les profils, rapports et briefings sont filtrés selon les affectations courantes, avant le classement. Les documents dont la relation d'accès ne peut pas être établie sont exclus.
- Les sessions exigent un `session_id` explicite et appartiennent à leur créateur. Les anciennes sessions sans propriétaire restent inaccessibles ; aucune reprise automatique par le premier utilisateur ne doit être effectuée. Le GET ne crée plus de session.
- Une analyse concurrente devenue obsolète retourne 409 et peut être relancée. L'historique est limité à 40 messages et 20 rapports ; le prompt utilise les 12 derniers messages. Une nouvelle analyse annule l'ancienne approbation.
- Un repli indisponible renvoie des besoins et offres vides avec une provenance explicite. Les fiches techniques sont des brouillons à valider, sans IP ni équipement inventé. Les anciennes fiches en cache sont régénérées à la première lecture.
- Le moteur vectoriel utilise un espace **lexical** déterministe unique, versionné. Il ne mélange plus des vecteurs Gemini et des vecteurs de hachage. Le cache statique vérifie les documents, leur empreinte et la dimension ; les mises à jour d'entreprises sont persistées dans `AIVectorDocument` et relues par les autres processus.
- Les appels Gemini partagent un budget de 20 secondes. Une erreur de quota, de service ou de délai arrête l'appel. Un éventuel modèle de repli doit être configuré via `AI_FALLBACK_MODELS` et n'est essayé que pour une erreur 404, avec le temps restant.
- `POST /api/ai/vector/market-intel/discover/` retourne 202 avec `job_id`. `GET /api/ai/vector/market-intel/jobs/<job_id>/` expose le statut au propriétaire. La file limite chaque utilisateur à trois recherches actives et déduplique les demandes identiques.
- Lancer `python manage.py migrate --noinput` avant le démarrage, puis `python manage.py run_ai_jobs` pour traiter la file. `--once` traite au plus une tâche. Les baux expirés sont repris après dix minutes ; les échecs sont limités à trois tentatives. Les signaux déjà sauvegardés sont dédupliqués dans la même transaction que leur publication au fil.
- Render lance le serveur et le worker via `python start_services.py`, dans le service existant. Docker Compose dispose d'un service `ai-worker`. En développement hors Docker, lancer la commande worker dans un processus dédié. Aucun déploiement distant n'est exécuté par les tests.
- Le scoring de synchronisation utilise les champs enregistrés et le moteur déterministe, sans score 85/75 imposé par segment, ni probabilité élevée par défaut. Les besoins confirmés issus des visites sont conservés avec leur source.
