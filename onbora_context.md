# Contexte Général du Projet Onbora

Dernière mise à jour : 16 août 2026

---

## 1. Description du Projet Onbora
Onbora est un copilote commercial B2B basé sur l’intelligence artificielle, conçu pour les fournisseurs de services managés (MSP) comme Orange Business. 

La plateforme aide le MSP à :
*   Mieux comprendre et qualifier ses prospects B2B ;
*   Préparer les commerciaux avant leurs visites ;
*   Assister les commerciaux pendant leurs échanges avec les entreprises ;
*   Générer automatiquement les rapports et documents commerciaux ;
*   Recommander les services potentiellement adaptés ;
*   Transmettre au KAM un dossier client structuré ;
*   Former le client après l’intégration des services réalisée par le MSP.

Onbora ne remplace ni le prospecteur, ni le KAM, ni le CRM, ni les équipes techniques. Il facilite leur travail et assure une continuité entre le premier contact avec une entreprise, la préparation commerciale, la transmission au KAM et l’adoption des services.

---

## 2. Problématique
Les MSP proposent de nombreux services B2B (connectivité, cloud, cybersécurité, outils collaboratifs, communication, paiements, solutions digitales, services managés). Les difficultés fréquentes incluent :
*   La complexité de compréhension des offres par les entreprises.
*   La difficulté pour les prospects d'identifier les services correspondants à leurs besoins.
*   Le temps passé par les commerciaux à rechercher des informations pré-visite.
*   La saisie manuelle et chronophage des comptes rendus et rapports.
*   La dispersion des informations de prospection.
*   La transmission de prospects mal qualifiés au KAM.
*   La répétition des besoins par le client face à de multiples interlocuteurs.
*   Le manque de personnalisation des propositions commerciales.
*   Les difficultés d'adoption des services post-installation par le client.

Onbora utilise l'IA pour collecter, structurer, résumer et transformer les informations en livrables exploitables.

---

## 3. Profils Utilisateurs
1.  **Client B2B** : Accède à Onbora via le site MSP, mini-app Maxit, portail client, widget ou lien direct. Il exprime son besoin dans une conversation fluide.
2.  **Prospecteur / Commercial terrain** : Utilise Onbora (Web Next.js & App Mobile Flutter) pour préparer ses visites (briefs), enregistrer et transcrire les échanges (dictaphone IA), et générer les rapports après-visite.
3.  **KAM (Key Account Manager)** : Reçoit les dossiers structurés par Onbora, valide les propositions commerciales et gère la relation client.
4.  **Administrateur MSP** : Configure le catalogue de services, les modèles de rapports, les règles métier et les indicateurs de suivi.

---

## 4. Les Rôles Majeurs d'Onbora
*   **Qualification Client (Entrant)** : Conversation de découverte -> structuration automatique du besoin -> recommandations préliminaires -> Business Twin (Avant/Après) -> Transmission au KAM.
*   **Assistance à la Prospection (Sortant)** :
    *   *Avant la visite* : Brief de préparation (pitch, questions clés, hypothèses).
    *   *Pendant la visite* : Prise de notes assistée, dictaphone vocal, détection de besoins, objections, services.
    *   *Après la visite* : Génération du rapport de visite, email de suivi, données CRM.
*   **Formation Post-Intégration** : Après installation technique par le MSP, Onbora aide le client à prendre en main les services (tutoriels, FAQ, guides d'adoption).

---

## 5. Le Concept du Business Twin
Représentation simplifiée et visuelle de la transformation numérique proposée :
```
Situation Actuelle (ex: Connexion instable, communication manuelle, cash)
       ↓
Problèmes Identifiés (ex: Perte de temps, coupures de service)
       ↓
Services MSP Recommandés (ex: Fibre Pro, Microsoft 365, Terminal Paiement)
       ↓
Situation Future (ex: Connexion fiable, outils collaboratifs, paiements digitaux)
```

---

## 6. Architecture Fonctionnelle
```
[ Portail MSP ]   [ Mini-App Maxit ]   [ App Mobile Flutter ]   [ Interface Commercial ]   [ Interface KAM ]
                                                   ↓
                                           [ API Onbora ]
                                                   ↓
     [ Agent IA ] ↔ [ Catalogue Services ] ↔ [ Moteurs de Rapport / Business Twin / Formation ]
                                                   ↓
                                      [ CRM & Outils Internes MSP ]
```

---

## 7. État Actuel du Projet et Roadmap

### Statut Général : Plateforme Web & Mobile Prête & Validée sur Render Cloud
> [!NOTE]
> La plateforme Onbora comprend désormais la web app Next.js 16, l'application mobile Flutter commerciale terrain, le backend Django REST hébergé sur Render, et un pipeline CI/CD automatisé GitHub Actions.

Les fichiers clés disponibles dans le dépôt :
*   Règles de travail : [vibe_rules.md](file:///C:/Users/Salem/Documents/projet/Onbora/vibe_rules.md)
*   Contexte global : [onbora_context.md](file:///C:/Users/Salem/Documents/projet/Onbora/onbora_context.md)
*   Architecture technique : [architecture.md](file:///C:/Users/Salem/Documents/projet/Onbora/architecture.md) & [architecture_eraser.txt](file:///C:/Users/Salem/Documents/projet/Onbora/architecture_eraser.txt)
*   Application mobile : `mobile/lib/` (Flutter MVVM)
*   Workflows métier :
    *   [workflow_client_b2b.md](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_client_b2b.md) (Client B2B)
    *   [workflow_prospecteur.md](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_prospecteur.md) (Prospecteur)
    *   [workflow_kam.md](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_kam.md) (KAM)
    *   [workflow_ai.md](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_ai.md) (Intégrations IA)

### Tableau de bord de la Roadmap

| Étape | Priorité | Description | Statut | Détails / Livrables |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Priorité 1** | Initialiser le projet | **Terminé** | Dépôt Git, Branches dev/main, Squelette Frontend Next.js & Backend Django, configuration Docker & env |
| 2 | **Priorité 2** | Créer les utilisateurs & rôles | **Terminé** | Modèle User étendu, API de login/register/me, scripts de seed, AuthContext Next.js, guards RBAC, dashboards (/client, /sales, /kam, /admin) |
| 3 | **Priorité 3** | Interface conversationnelle B2B | **Terminé** | Catalogue de services initialisé (seed), API Discovery, interface de chat client, tracker de profil temps réel, visualiseur Business Twin & Transmission KAM |
| 4 | **Priorité 4** | Espace KAM | **Terminé** | API de gestion des dossiers prospects, tableau de bord KAM (/kam), filtre par statut, assignation de dossier, édition de notes internes |
| 5 | **Priorité 5** | Espace Prospecteur Web & App Mobile | **Terminé** | Recherche & mock d'entreprises, brief de visite avec plan d'actions IA, enregistreur de visite (dictaphone commercial), rapport post-visite & transmission KAM |
| 6 | **Priorité 6** | Moteur de démo visuelle | **Terminé** | Composant BusinessTwinViewer interactif avec comparatifs Avant/Après et jauges d'impacts SVG dynamiques |
| 7 | **Priorité 7** | Application Mobile Flutter | **Terminé** | App mobile complète Flutter (`mobile/lib`) avec mode Clair/Sombre, squelettes Shimmer, recherche dédupliquée et dictaphone terrain |
| 8 | **Priorité 8** | Formation Post-Intégration | **Terminé** | Composant HelpDrawer partagé avec guides interactifs, FAQ et tutoriels contextuels |
| 9 | **Priorité 9** | Pipeline CI/CD GitHub Actions & Render | **Terminé** | Workflow `.github/workflows/ci.yml` (Node 20, Python 3.11), migrations idempotentes PostgreSQL (`0005_ensure_raw_conversation_data.py`), et déploiement Render |

---

## 8. Historique Récent des Modifications (Août 2026)

*   **Application Mobile Onbora Sales (Flutter)** :
    *   **Refonte UX & Suppression des Émojis** : Éradication complète de tous les émojis sur l'ensemble des vues mobile pour garantir un rendu sobre et ultra-professionnel.
    *   **Nettoyage du Dashboard** : Suppression du bloc météo (*Kinshasa • 29°C*) et du KPI arbitraire (*Pipeline RDC*). Simplification des termes (*"Rechercher un prospect"*).
    *   **Gestionnaire de Thème Clair / Sombre** : Ajout d'un sélecteur de thème dynamique dans l'onglet **Profil & Paramètres** ([`main_navigation_view.dart`](file:///C:/Users/Salem/Documents/projet/Onbora/mobile/lib/ui/main_navigation_view.dart)) avec persistance `SharedPreferences` et résolution du bug de transition de police (`themeAnimationDuration: Duration.zero`).
    *   **Recherche de Prospects Parité Next.js** : La recherche vide renvoie désormais l'ensemble des comptes B2B cibles (*Rawbank, Vodacom, TFM, Clinique Ngaliema, Bracongo*) avec mode fallback résilient hors-ligne.
    *   **Squelettes Shimmer High-End** : Remplacement des spinners basiques par des squelettes de chargement animés Vercel/Stripe style ([`skeleton_loader.dart`](file:///C:/Users/Salem/Documents/projet/Onbora/mobile/lib/ui/shared/skeleton_loader.dart)).

*   **Pipeline CI/CD (GitHub Actions)** :
    *   Mise à jour du runner vers **Node.js 20** ([`.github/workflows/ci.yml`](file:///C:/Users/Salem/Documents/projet/Onbora/.github/workflows/ci.yml)) pour la compatibilité avec Next.js 16 App Router.
    *   Ajustement du fichier [`backend/requirements.txt`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/requirements.txt) (`django>=5.0.0,<6.0.0`).
    *   Validation à 100% des 36/36 tests unitaires Django et du build Next.js.

*   **Résolution des Contraintes de Base de Données Render (PostgreSQL)** :
    *   Création de la migration [`backend/kam/migrations/0005_ensure_raw_conversation_data.py`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/kam/migrations/0005_ensure_raw_conversation_data.py) résolvant de manière idempotente l'absence des colonnes `raw_conversation_data` et levant les contraintes `NOT NULL` sur les anciennes colonnes héritées (`raw_qualification_data`) sur Render PostgreSQL.

*   **Refonte d'Architecture "Nested Apps Layout" & Core AI In-Process Unifié (Septembre 2026)** :
    *   **Conteneurisation `backend/apps/`** : 100% des applications Django regroupées sous `backend/apps/` (`accounts`, `sales`, `kam`, `discovery`, `ai_core`, `catalog`, `twin`, `training`, `reporting`, `workbench`, `api`) et ressources non-Python sous `backend/resources/` (`contracts`, `evals`, `prompts`, `catalog_ai`).
    *   **Moteur Core AI In-Process Haute Performance (`apps.ai_core`)** :
        *   RAG TF-IDF avec index inversé en RAM (< 2ms de latence) sur `offres_orange_b2b.json`.
        *   Registre d'outils B2B connectés directement à PostgreSQL Neon (`Enterprise`, `KAMVisitReport`).
        *   Mémoire de session persistante avec historique multi-tours et boucle Human-in-the-Loop (`AISessionMemory`, `AISessionService`).
        *   Endpoints DRF unifiés exposés sur `/api/ai/` et `/api/v1/ai/` (santé, recherche RAG, analyse de visite, validation HITL, sessions).
    *   **Éradication Intégrale de la Dette Technique (Zéro Défaut / Clean SoC)** :
        *   Résolution de l'ensemble des 16 alertes de dette technique (requêtes N+1 dans `sales/serializers.py` et déport des "Fat Views" dans `discovery`, `kam`, `sales`).
        *   Création de services découplés (`apps/kam/services/briefing_service.py`).
        *   Hook 2 (`scripts/verify_technical_debt.py --all`) validé à 100% sur 260 fichiers Python.
        *   Mise à jour des directives maîtresses [`agent.md`](file:///C:/Users/Salem/Documents/projet/Onbora/agent.md) et [`AGENTS.md`](file:///C:/Users/Salem/Documents/projet/Onbora/AGENTS.md).

---

*   **Intégration d'OpenAI Whisper Local & Dictaphone Vocal Découplé (Septembre 2026)** :
    *   **OpenAI Whisper Local 100% In-Process & Sans Clé API** :
        *   Mise en œuvre du service [`backend/apps/sales/whisper_service.py`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/apps/sales/whisper_service.py) exploitant le paquet officiel `openai-whisper` en local (CPU/GPU) via PyTorch avec binaires `ffmpeg` automatiquement injectés par `imageio-ffmpeg`.
        *   Fonctionnement 100% autonome et gratuit : aucune clé API OpenAI n'est requise pour transcrire les fichiers et flux audio (fallback API disponible uniquement si spécifié).
        *   Optimisation du modèle sur CPU (`tiny`) pour une exécution ultra-rapide (2 à 3 secondes) et fermeture propre des descripteurs de fichiers temporaires sous Windows.
        *   Endpoint DRF dédié [`KamAudioTranscribeView`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/apps/kam/views.py#L923) (`POST /api/kam/transcribe/`) avec `MultiPartParser`, `FormParser`, et permissions ouvertes pour un traitement audio stateless instantané.
    *   **Transcription en Direct & Double Canal (Web Next.js)** :
        *   Intégration de la reconnaissance vocale continue en direct (`webkitSpeechRecognition`) dans [`KamVocalVisitModal.tsx`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/components/kam/KamVocalVisitModal.tsx) et [`KamVoiceDebriefModal.tsx`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/components/kam/KamVoiceDebriefModal.tsx) : les mots s'affichent au fil de la parole avec fluidité.
        *   Élimination intégrale du jargon interne (« mots métiers ») remplacé par un indicateur de complétude ergonomique et compteur de mots transparent.
        *   Séparation nette entre la transcription vocale Whisper (canal 1) et les notes manuelles / puces rapides rédigées (canal 2) : aucune écrasement intempestif des notes.
        *   Fusion automatique côté frontend et backend : Core AI reçoit l'intégralité cumulée `[Transcription Vocale Whisper] + [Notes & Observations du KAM]`.
        *   Gestion robuste de `MediaRecorder` : synchronisation stricte du compteur avec le flux audio réel, évacuation forcée du buffer (`requestData()`), gestion des erreurs de permission micro dans le navigateur.
    *   **Éradication Complète des Hallucinations & Faux Besoins** :
        *   Suppression des phrases de fallback synthétiques.
        *   Détection de verbatim insuffisant (`is_insufficient_verbatim`) : renvoie un rapport neutre avec 0 faux besoins inventés si l'audio est trop bref ou consiste en une simple salutation.

*   **Consultation des Rapports de Visite Mobile & Backend Django (Septembre 2026)** :
    *   **Consultation Directe depuis l'Historique Mobile (Flutter)** :
        *   Liaison interactive de chaque élément de la liste dans [`VisitsHistoryScreen`](file:///C:/Users/Salem/Documents/projet/Onbora/mobile/lib/app/modules/sales/screen/visits_history_screen.dart) avec retour haptique et icône chevron.
        *   Méthode dédiée `openVisitReportFromHistory` dans [`sales_controller.dart`](file:///C:/Users/Salem/Documents/projet/Onbora/mobile/lib/app/modules/sales/controller/sales_controller.dart) chargeant le rapport complet et redirigeant sans rupture vers [`VisitReportDetailScreen`](file:///C:/Users/Salem/Documents/projet/Onbora/mobile/lib/app/modules/sales/screen/visit_report_detail_screen.dart).
        *   Enrichissement des modèles [`VisitHistoryItem`](file:///C:/Users/Salem/Documents/projet/Onbora/mobile/lib/app/modules/sales/model/visit_history_item.dart) et [`VisitReportModel`](file:///C:/Users/Salem/Documents/projet/Onbora/mobile/lib/app/modules/sales/model/visit_report_model.dart) (`reportId`, `enterpriseId`, `hasDossier`).
    *   **Endpoint de Détail de Rapport Dédié (DRF)** :
        *   Ajout de la vue [`VisitReportDetailView`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/apps/sales/views.py) sur `GET /api/sales/visit-reports/<int:pk>/` avec contrôle des permissions et sérialisation complète.
        *   Support de filtre par `preparation_id` dans [`VisitReportCreateView`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/apps/sales/views.py) et inclusion des identifiants clés dans la liste des visites.

---

## 10. Passerelle d'Échange de Données (CRM Kaabu & ArrowSphere)

Onbora agit comme **passerelle d'échange de données (Data Exchange Connector)** :
*   **GET (Kaabu)** : Lecture des données d'entreprises et SIREN.
*   **POST (Kaabu)** : Envoi des dossiers qualifiés, Business Twins et rapports.
*   **Webhook (ArrowSphere)** : Réception passive de la notification d'activation (`POST /api/v1/sales/integrations/arrowsphere/webhook/`) déverrouillant le module d'adoption.

---

## 11. Architecture Cible & Implémentation des 5 Epics (Septembre 2026)

L'alignement structurel du modèle DDD et l'implémentation complète des 5 epics de la cible Onbora sont déployés, validés et testés :
*   **Gouvernance & Répartition des Portefeuilles (Epic 1)** :
    *   PME et Grands Comptes sont exclusivement gérés par les équipes KAM (`AccountPortfolioAssignment`, `role='KAM'`).
    *   Le segment SOHO est opéré par les prestataires de services et commerciaux terrain sous supervision.
    *   L'application Mobile Flutter est partagée avec bascule dynamique de segment et d'expérience.
    *   Modélisation DDD : `AccountProjection` (idempotence CRM maître), `SourceObservation` (empreinte SHA-256 des déclarations), `Evidence` (pièces justificatives opposables) et `RelationshipCoverage` (cartographie multi-interlocuteurs avec détection déterministe du risque de mono-champion).
*   **Moteur de Qualification & Autonomie SOHO (Epic 2 - Option A)** :
    *   Pattern Strategy découplé (`SohoQualificationStrategy`, `PmeQualificationStrategy`, `KamQualificationStrategy`).
    *   **Autonomie SOHO Totale (Option A)** : Élimination de la bascule artificielle de complexité TPE vers KAM. Une TPE reste 100% SOHO, auditée et signée directement sur le terrain par le commercial/prestataire (Fibre Pro, TPE sécurisé, Box).
    *   Le dossier de transmission (`HandoffDossier`) reste réservé aux réassignations d'échelle PME vers Grands Comptes et aux arbitrages de secteur.
*   **Résilience Mobile Offline-First (Epic 3)** :
    *   Idempotence forte de bout en bout via en-tête `Idempotency-Key` (UUIDv4) gérée par `IdempotencyRecord` et `IdempotentVisitService` (détection des conflits de concurrence HTTP 409 et cache de réponse).
    *   Couche mobile Flutter autonome : `LocalCacheService` pour les données locales, `OutboxManager` avec persistance de file de commandes et `SyncService` pour le rejeu résilient avec backoff.
*   **Couche Anti-Corruption & Connecteur Contrôlé Dynamics 365 (Epic 4)** :
    *   Pattern Transactional Outbox avec `SyncOperation` garantissant le découplage asynchrone des flux CRM.
    *   Worker résilient (`DynamicsOutboxWorker`) avec verrouillage transactionnel `SELECT FOR UPDATE SKIP LOCKED`, ordonnancement temporel, gestion de backoff exponentiel et commande CLI `python manage.py run_outbox_worker [--once]`.
    *   Client Dataverse Azure AD OAuth2 avec résilience sur HTTP 429 et 503.
*   **Radar de Risque Explicable & Mémoire de Compte (Epic 5)** :
    *   `SignalRuleEvaluator` : moteur déterministe transparent avec citation des sources factuelles (Règle 1: échéance contrat J-180/120/90, Règle 2: alerte mono-champion, Règle 3: rupture de relation client > 60 jours sans contact).
    *   `AccountMemoryService` : registre immuable d'événements majeurs (`AccountMemoryEvent`: décisions, promesses, incidents SLA) et génération en un clic du dossier de passation (`Handover Pack`) pour sécuriser les rotations de KAMs.
*   **Contrôles de Qualité & Conformité** :
    *   25 tests unitaires et d'intégration Django Backend exécutés avec succès.
    *   Tests mobiles Flutter Outbox & Sync validés.
    *   Hook 1 (Conformité Charte Graphique & Zéro Émoji) : 100% conforme.
    *   Hook 2 (Architecture & Zéro Dette Technique) : 100% conforme sur l'intégralité du code.
