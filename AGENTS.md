# Onbora AI Agents Guidelines (`AGENTS.md`)

Ce fichier fait référence au document maître officiel de cadrage des agents Onbora :
👉 **Consultez [`agent.md`](file:///C:/Users/Salem/Documents/projet/Onbora/agent.md)** pour la spécification complète des 12 règles opérationnelles, des directives d'architecture, de la charte graphique et des deux hooks de contrôle.

### Synthèse Rapide des Règles Clés :
1. **Contexte obligatoire** : Consulter [`onbora_context.md`](file:///C:/Users/Salem/Documents/projet/Onbora/onbora_context.md) avant toute action.
2. **Porte de validation** : Toujours demander « *Acceptez-vous d'admettre ces modifications dans notre historique de contexte ?* » avant d'acter les changements majeurs.
3. **Zéro Émojis dans l'UI** : Interdiction formelle des émojis Unicode. Utiliser obligatoirement le pack d'icônes vectorielles ([`Icons.tsx`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/components/shared/Icons.tsx) pour le Web, `Icons.*` pour Flutter).
4. **Charte & DESIGN.md** : Règle 60-30-10, zéro ombres colorées / néon fluo, zéro bordure 1px grise brute sur mobile.
5. **Hook 1 (Design & Anti-Émojis)** : Vérification pre-commit automatique via [`scripts/verify_design_compliance.py`](file:///C:/Users/Salem/Documents/projet/Onbora/scripts/verify_design_compliance.py).
6. **Hook 2 (Dettes Techniques & Architecture)** : Audit continu via [`scripts/verify_technical_debt.py`](file:///C:/Users/Salem/Documents/projet/Onbora/scripts/verify_technical_debt.py) s'appuyant sur les skills Architect (`software-architecture-system-design`) et Django (`django-backend-python` : zéro N+1 queries, Clean SoC, vues minces).
7. **Architecture Nested Apps & AI Core unifié** : Toutes les applications Django sous `backend/apps/`, ressources sous `backend/resources/`, et AI Core in-process haute performance (`apps.ai_core` avec RAG TF-IDF, mémoire de session Neon et endpoints DRF natifs).
8. **Git Push** : Pousser systématiquement les modifications validées avec `git push origin dev`.
