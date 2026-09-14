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
