# Guide & Directives des Agents IA — Onbora (`agent.md`)

Bienvenue dans le cadre de gouvernance et d'exécution d'**Onbora**. Ce document formalise l'intégralité des règles opérationnelles, architecturales, de design et de collaboration régissant l'assistant et tous les sous-agents.

---

## 1. Identité & Vision Produit

**Onbora** est un **Copilote Commercial B2B pour MSP (Fournisseurs de Services Managés)**. Toutes les décisions de conception, d'interface et d'architecture doivent s'aligner sur ses 4 personas clés :
1. **Client B2B** : Découverte conversationnelle des besoins télécoms/cloud/sécurité, visualiseur Business Twin (avant/après), sélection de services.
2. **Prospecteur / Commercial Terrain** : Détection des opportunités de zone (plaques), brief avant-visite assisté par IA, dictaphone et mode visite guidée, compte-rendu instantané.
3. **KAM (Key Account Manager)** : Workspace centralisé, validation des opportunités qualifiées, enrichissement des dossiers, suivi contractuel.
4. **Administrateur MSP** : Configuration globale, catalogue d'offres et matrice d'intégration.

---

## 2. Règles Fondamentales d'Opération (Directives d'Exécution)

### Règle 1 : Consultation Systématique du Contexte
Avant **chaque action ou modification**, l'assistant et tout sous-agent invoqué doivent impérativement lire le fichier de contexte principal :
*   [`onbora_context.md`](file:///C:/Users/Salem/Documents/projet/Onbora/onbora_context.md)

*Objectif : Garantir l'alignement permanent avec l'état d'avancement, les arbitrages récents et l'architecture globale sans régression.*

---

### Règle 2 : Respect Strict de la Description et des Objectifs d'Onbora
Aucune fonctionnalité non alignée sur le coeur de métier MSP ne doit être introduite. Les workflows doivent fluidifier la chaîne :
`Client / Prospecteur` ➔ `Qualification IA` ➔ `Validation KAM` ➔ `Passerelle CRM / Déploiement`.

---

### Règle 3 : Porte de Validation de l'Historique par l'Utilisateur
Après **chaque étape ou modification majeure**, l'assistant doit obligatoirement poser la question rituelle à l'utilisateur :
> **« Acceptez-vous d'admettre ces modifications dans notre historique de contexte ? »**

*Directive absolue : Aucune mise à jour définitive du fichier `onbora_context.md` ne doit être effectuée sans l'accord explicite de l'utilisateur afin d'éviter toute corruption du contexte projet.*

---

### Règle 4 : Alignement sur la Feuille de Route (Roadmap des Priorités)
Le développement progresse de façon ordonnée selon la roadmap suivante :
1. **Priorité 1** : Initialisation du projet (Git/GitHub, branches, frontend Next.js & backend Django, Docker, documentation).
2. **Priorité 2** : Utilisateurs & Rôles (Client B2B, Prospecteur, KAM, Administrateur MSP).
3. **Priorité 3** : Interface conversationnelle (Découverte client, cartes de services, démo interactive, demande de KAM).
4. **Priorité 4** : Espace KAM (Liste des prospects, résumé qualifié, validation, notes, statuts).
5. **Priorité 5** : Espace Prospecteur (Recherche d'entreprise, brief avant-visite, mode visite, compte-rendu).
6. **Priorité 6** : Moteur de démo visuelle (Business Twin : situation actuelle vs cible, roadmap).
7. **Priorité 7** : Génération des documents (PDF/HTML pour rapports, dossiers KAM, fiches de synthèse).
8. **Priorité 8** : Espace de formation après intégration (Guides, FAQ, étapes d'adoption des services).
9. **Priorité 9** : Tracking & Données de démonstration (Dashboard synthétique d'événements).
10. **Priorité 10** : Simulation des intégrations externes (Connecteurs CRM, ERP, provisioning).
11. **Priorité 11** : Déploiement & Tests (Sécurité, comptes de démonstration, validation finale).

---

### Règle 5 : Architecture Logicielle & Découplage (Clean SoC & Nested Apps Layout)
*   **Monolithe Modulaire ("Nested Apps Layout - Option B")** :
    *   **100% des applications Django** sont regroupées sous `backend/apps/` (`accounts`, `sales`, `kam`, `discovery`, `ai_core`, `catalog`, `twin`, `training`, `reporting`, `workbench`, `api`).
    *   **Ressources transverses non-Python** regroupées sous `backend/resources/` (`contracts/`, `evals/`, `prompts/`, `catalog_ai/`).
    *   **Configuration racine** contenue dans `backend/onbora/` avec auto-découverte des apps via `sys.path.insert(0, str(BASE_DIR / 'apps'))`.
*   **Moteur IA In-Process Unifié (`apps.ai_core`)** :
    *   Le Core AI est exécuté **in-process** au sein du backend Django, éliminant tout microservice externe ou surcharge réseau.
    *   *Moteur RAG Haute Performance* : Index inversé et TF-IDF en mémoire vive (< 2ms) sur le catalogue d'offres Orange B2B (`rag_service.py`).
    *   *Outils Métier Directs* : Registre d'outils (`apps/ai_core/tools/`) connectés à la base PostgreSQL Neon (`Enterprise`, `KAMVisitReport`).
    *   *Mémoire de Session & HITL* : Modèle `AISessionMemory` et service `AISessionService` pour conversations multi-tours et boucle d'approbation humaine (*Human-in-the-Loop*).
    *   *Exposition DRF Native* : Endpoints unifiés sous `/api/ai/` et `/api/v1/ai/`.
*   **Separation of Concerns (SoC)** :
    *   **Vues minces** (< 90 lignes par fonction de vue) : toute logique métier d'assemblage, de filtrage complexe ou de calcul doit être déportée dans des Services ou Use Cases applicatifs dédiés (`apps/<app>/services/`).
    *   Avant de commencer un nouveau ticket ou d'invoquer un sous-agent de développement (`dev-agent`), celui-ci doit obligatoirement être briefé avec :
        1. Le contexte actuel ([`onbora_context.md`](file:///C:/Users/Salem/Documents/projet/Onbora/onbora_context.md))
        2. La priorité active
        3. Les contraintes d'architecture (Clean SoC, Nested Apps, Zéro N+1)

---

### Règle 6 : Tests Unitaires et Validation Continue
*   Chaque fonctionnalité majeure doit obligatoirement être couverte par des tests (unitaires et intégration).
*   Le plan de test et la matrice de validation doivent être maintenus à jour dans :
    *   [`unit_tests_plan.md`](file:///C:/Users/Salem/Documents/projet/Onbora/unit_tests_plan.md)
*   Les tests doivent être exécutés et passer avec succès avant de considérer une étape comme achevée.

---

### Règle 7 : Respect de la Charte Graphique, de `DESIGN.md` et Interdiction Formelle des Émojis
L'interface d'Onbora se distingue par une rigueur visuelle premium et professionnelle :
*   **INTERDICTION FORMELLE DES ÉMOJIS UNICODE DANS L'UI** :
    *   Aucun émoji Unicode (ex: 🥇, 🥈, 🥉, 👑, ⚡, 🏆, 🗺️, ✉️, 🎤, ⚠️, 🎓, etc.) ne doit être présent dans les boutons, titres, badges, podiums ou textes de composants.
    *   **Obligation d'utiliser le Pack d'Icônes Officiel** :
        *   **Web / Next.js** : Utiliser exclusivement le composant centralisé [`Icons.tsx`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/components/shared/Icons.tsx) (ex: `<Icons.Crown />`, `<Icons.Trophy />`, `<Icons.Zap />`, `<Icons.Mic />`, `<Icons.AlertTriangle />`).
        *   **Mobile / Flutter** : Utiliser les icônes vectorielles Material/Cupertino (`Icon(Icons.emoji_events)`, `Icon(Icons.mic)`, `Icon(Icons.warning_amber_rounded)`).
*   **Règle Chromatique 60 - 30 - 10** ([`DESIGN.md`](file:///C:/Users/Salem/Documents/projet/Onbora/DESIGN.md)) :
    *   *60% Fond dominant* : Noir chaud `#242124` / Blanc craie `#F6F5F2` (ou fond blanc pur / `#050508`).
    *   *30% Structure & surfaces* : Cartes `#2F2C30`, containers neutres, typographie hiérarchisée.
    *   *10% Accent unique* : Bleu Cobalt `#4F6CE8` / Orange Onbora `#F97316` (exclusivement pour CTAs d'action clé et pastilles de notification).
*   **Zéro Bordure 1px Brute (Mobile)** : Bannir `Border.all(color: Colors.grey, width: 1)` ; le relief s'obtient par le contraste de fond et l'espace négatif.
*   **Zéro Ombre Colorée / Néon ("AI Slop")** : Interdiction des halos fluo (`shadow-[#4F6CE8]/20`, `shadow-emerald-500/10`). Seules les ombres neutres douces (`shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-none`) sont admises.
*   **Zéro Cartes Imbriquées** : Éviter les sous-cartes grises dans des cartes déjà grises.
*   **Hook de Vérification Automatisé** :
    *   Un script de conformité [`scripts/verify_design_compliance.py`](file:///C:/Users/Salem/Documents/projet/Onbora/scripts/verify_design_compliance.py) est installé comme hook Git pre-commit (`.git/hooks/pre-commit`). Tout commit contenant un émoji ou une violation de la charte est rejeté automatiquement.

---

### Règle 8 : Activation du Skill UX lors des Refontes et Travaux UI
Dès qu'une tâche concerne une **refonte d'interface**, la **création/modification d'un composant UI**, ou du travail sur le style (CSS, Tailwind, accessibilité, contrastes WCAG AA) :
*   L'assistant et tout sous-agent doivent obligatoirement charger et appliquer les directives du skill `ux-ui-design-frontend` :
    *   [`ux-ui-design-frontend/SKILL.md`](file:///C:/Users/Salem/Documents/projet/Onbora/.agents/skills/ux-ui-design-frontend/SKILL.md)

---

### Règle 9 : Cadre d'Intégration du Scraping
Pour toute tâche liée au module de scraping automatisé d'entreprises et d'enrichissement d'Onbora, l'assistant et les sous-agents doivent suivre scrupuleusement la spécification :
*   [`etapes_scraping.md`](file:///C:/Users/Salem/Documents/projet/Onbora/etapes_scraping.md)

---

### Règle 10 : Push Git Obligatoire après Validation
Après chaque lot de modifications de code ou de documentation validé avec succès (tests et hooks au vert) :
*   Exécuter le push vers le dépôt distant :
    ```bash
    git push origin dev
    ```

---

### Règle 11 : Passerelle d'Échange de Données (Aucune Orchestration Externe)
Onbora **n'orchestre pas** les systèmes externes (CRM, ERP, Provisioning) et **ne passe aucune commande directe**. Il agit uniquement comme une passerelle d'échange de données sécurisée :
*   **Kaabu CRM** : Lecture (GET) des fiches d'entreprises pour la déduplication et Envoi (POST/PATCH) des opportunités qualifiées / rapports de visite.
*   **ArrowSphere** : Réception passive via Webhook HTTP POST des notifications d'activation pour déverrouiller l'adoption/formation ([`HelpDrawer.tsx`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/components/shared/HelpDrawer.tsx)).

---

### Règle 12 : Contrôle Continu des Dettes Techniques & Hook d'Audit Architectural (Skills Architect & Django)
Afin d'assurer la maintenabilité, la robustesse et la haute vélocité d'Onbora sur le long terme, nous utilisons un second hook d'audit dont le rôle est de **traquer, détecter et bloquer l'accumulation des dettes techniques** dans la base de code, en s'appuyant sur les expertises combinées :

1.  **Skills d'Architecture Logicielle (`software-architecture-system-design` & `architecture-agent`)** :
    *   **Clean Architecture (Dependency Rule)** : Vérification que les couches externes (Web, base de données, frameworks) ne polluent pas le domaine métier. Les flux de dépendances doivent impérativement pointer vers le centre (Use Cases et Entités pures).
    *   **Domain-Driven Design (DDD)** : Respect de l'isolation des contextes délimités (*Bounded Contexts* : Sales, KAM, Discovery B2B, Admin, Core-AI) sans couplages circulaires.
    *   **Zéro "Fat Views" / "God Objects"** : Interdiction d'accumuler de la logique métier dans les vues de routage ou les contrôleurs. Toute méthode dépassant les seuils de complexité doit être déportée dans des Use Cases ou Services applicatifs.

2.  **Skills Backend Django & Python (`django-backend-python`)** :
    *   **Éradication des Requêtes N+1** : Contrôle systématique des requêtes ORM dans les sérialiseurs et vues. Obligation d'utiliser `select_related()` (clés étrangères/relations 1-à-1) et `prefetch_related()` (relations Many-to-Many ou inverses).
    *   **Sérialisation DRF Efficace** : Interdiction des requêtes de base de données non indexées ou répétées dans les méthodes `SerializerMethodField` sans annotations en amont.
    *   **Atomicité & Sécurité** : Détection des opérations critiques d'écriture sans bloc `transaction.atomic()`, interdiction absolue des secrets ou clés API en dur dans le code, et conformité OWASP.

*   **Hook & Script Automatisé** :
    *   Le script d'audit [`scripts/verify_technical_debt.py`](file:///C:/Users/Salem/Documents/projet/Onbora/scripts/verify_technical_debt.py) scanne le code Django et l'architecture pour faire remonter toute dette technique et anti-pattern avant la validation des tickets.

---

## 3. Commandes Utiles de Contrôle & Qualité

| Action | Commande | Description |
| :--- | :--- | :--- |
| **Vérification Charte & Émojis (Staged)** | `python scripts/verify_design_compliance.py --staged` | Vérifie les fichiers en attente de commit (hook Git pre-commit). |
| **Vérification Complète du Design** | `python scripts/verify_design_compliance.py --all` | Scanne l'ensemble des composants Web & Mobile (anti-émojis, tokens). |
| **Audit Dette Technique (Staged)** | `python scripts/verify_technical_debt.py --staged` | Vérifie l'absence de dette technique et N+1 queries sur les fichiers modifiés. |
| **Audit Dette Technique Complète** | `python scripts/verify_technical_debt.py --all` | Scanne l'ensemble du backend Django avec les règles Architect & Django. |
| **Vérification Frontend (NPM)** | `npm run check:design` (dans `frontend/`) | Raccourci de vérification du design frontend. |
| **Linter Frontend** | `npm run lint` (dans `frontend/`) | Vérification ESLint Next.js. |
| **Tests Mobile** | `flutter test` (dans `mobile/`) | Exécution de la suite de tests Flutter. |
