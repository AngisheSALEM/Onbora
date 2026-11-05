# Plan de Tests Unitaires — Onbora

Dernière mise à jour : 18 juillet 2026

Ce document répertorie tous les tests unitaires et d'intégration à écrire et à valider pour garantir la stabilité et la sécurité d'Onbora.

---

## 1. Module d'Authentification & Comptes (`backend/accounts`)

Ces tests doivent être écrits dans le fichier `backend/accounts/tests.py`.

### 1.1 Tests du Modèle Utilisateur (`User`)
*   **Test : Création d'utilisateur par défaut**
    *   *Attendu* : Un utilisateur est créé avec succès. Le rôle par défaut est `CLIENT_B2B`.
*   **Test : Création d'utilisateur avec rôle spécifique**
    *   *Attendu* : Un utilisateur avec le rôle `KAM` est créé. Les champs `phone` et `company_name` sont correctement enregistrés en base.
*   **Test : Création de superutilisateur**
    *   *Attendu* : Le superutilisateur est créé avec `role = 'ADMIN'`, `is_staff = True`, et `is_superuser = True`.

### 1.2 Tests des API d'Authentification
*   **Test : Inscription (`POST /api/auth/register/`)**
    *   *Attendu (Succès)* : L'envoi de données valides (username, email, password, role, company_name) crée l'utilisateur, associe et retourne un token d'authentification valide, ainsi que les détails du profil.
    *   *Attendu (Échec)* : L'envoi sans mot de passe ou sans nom d'utilisateur retourne une erreur `400 Bad Request`.
    *   *Attendu (Échec)* : L'inscription avec un nom d'utilisateur déjà pris retourne une erreur `400 Bad Request`.
*   **Test : Connexion (`POST /api/auth/login/`)**
    *   *Attendu (Succès)* : Des identifiants valides retournent un code `200 OK`, un jeton (token) et les détails de l'utilisateur (rôle compris).
    *   *Attendu (Échec)* : Des identifiants erronés retournent une erreur `400 Bad Request` avec un message d'erreur d'authentification.
*   **Test : Récupération du profil actuel (`GET /api/auth/me/`)**
    *   *Attendu (Succès)* : Une requête authentifiée (avec header `Authorization: Token <token>`) retourne les informations de l'utilisateur connecté avec un code `200 OK`.
    *   *Attendu (Échec)* : Une requête non authentifiée retourne un code `401 Unauthorized`.

---

## 2. Module d'Authentification Frontend (`frontend/src`)

Ces tests ou validations concernent les fonctionnalités d'authentification côté client.

### 2.1 Contexte d'Authentification (`AuthContext`)
*   **Test : Initialisation de l'état**
    *   *Attendu* : Au démarrage, l'application vérifie si un jeton existe dans le `localStorage` ou dans les cookies.
*   **Test : Connexion (Login)**
    *   *Attendu* : L'appel de la fonction de connexion stocke le jeton et les infos utilisateur dans l'état et le `localStorage`, puis redirige vers la route du rôle correspondant.
*   **Test : Déconnexion (Logout)**
    *   *Attendu* : L'appel de la déconnexion efface le jeton de l'état et du stockage, et redirige vers `/login`.

### 2.2 Protection des Routes (Route Guards / Middleware)
*   **Test : Accès invité (Guest Guard)**
    *   *Attendu* : Un utilisateur non connecté tentant d'accéder à `/client`, `/sales`, `/kam` ou `/admin` est automatiquement redirigé vers `/login`.
*   **Test : Redirection après connexion**
    *   *Attendu* : Un utilisateur connecté tentant d'aller sur `/login` est redirigé vers son espace dédié.
*   **Test : Contrôle d'accès basé sur les rôles (RBAC)**
    *   *Attendu* : Un utilisateur connecté avec le rôle `CLIENT_B2B` tentant d'accéder à `/kam` ou `/sales` reçoit une page "Accès Interdit" ou est redirigé vers `/client`.

---

## 3. Module de Découverte & Qualification B2B (`backend/discovery`)

Ces tests sont écrits dans `backend/discovery/tests.py`.

### 3.1 Tests des API de Découverte
*   **Test : Initialisation de conversation (`POST /api/discovery/conversations/`)**
    *   *Attendu* : Génère une nouvelle session de chat et retourne le premier message d'accueil de l'IA ainsi qu'un profil d'extraction vide.
*   **Test : Envoi de messages & qualification (`POST /api/discovery/conversations/<id>/messages/`)**
    *   *Attendu* : L'envoi de messages enrichit le profil d'extraction (secteur, taille, outils, problèmes). Une fois le profil complété, la conversation bascule à l'état qualifié (`is_qualified = True`).
*   **Test : Transmission KAM (`POST /api/discovery/conversations/<id>/transmit/`)**
    *   *Attendu* : Une conversation qualifiée peut être transmise au KAM, créant automatiquement un dossier prospect et son Business Twin associé.

---

## 4. Module Espace KAM (`backend/kam`)

Ces tests sont écrits dans `backend/kam/tests.py`.

### 4.1 Tests des API KAM
*   **Test : Sécurité des endpoints (RBAC)**
    *   *Attendu* : Les requêtes sans authentification ou provenant d'utilisateurs avec les rôles `CLIENT_B2B` ou `SALESPERSON` reçoivent un code `403 Forbidden` ou `401 Unauthorized`. Seuls les rôles `KAM` et `ADMIN` ont accès.
*   **Test : Liste et filtre des dossiers (`GET /api/kam/dossiers/`)**
    *   *Attendu* : Retourne la liste unifiée des prospects qualifiés (inbound et outbound), triés par date décroissante. Supporte le filtrage par statut (`status=NEW`, etc.).
*   **Test : Détails et Mise à jour (`GET` / `PATCH /api/kam/dossiers/<id>/`)**
    *   *Attendu* : Permet de lire et de mettre à jour le statut, d'ajouter des notes internes, et d'affecter un KAM au dossier.
*   **Test : Récupération du Business Twin (`GET /api/kam/dossiers/<id>/business-twin/`)**
    *   *Attendu* : Retourne la proposition d'état cible (avant/après), les services MSP associés, et la roadmap de transition.

---

## 5. Module Commercial & Visites (`backend/sales`)

Ces tests sont écrits dans `backend/sales/tests.py`.

### 5.1 Tests des API Prospecteur
*   **Test : Recherche & Mocking d'entreprise (`GET /api/sales/enterprises/search/`)**
    *   *Attendu* : Recherche les entreprises par nom. Si aucune entreprise n'existe avec ce nom, elle est automatiquement créée et pré-remplie avec des données simulées selon le secteur d'activité détecté.
*   **Test : Brief pré-visite (`POST /api/sales/visit-preparations/`)**
    *   *Attendu* : Génère un brief avec les hypothèses de pitch, les objectifs de réunion et les questions d'accroche clés.
*   **Test : Rapport post-visite & analyse de mots-clés (`POST /api/sales/visit-reports/`)**
    *   *Attendu* : Enregistre le compte-rendu textuel de la réunion et en extrait automatiquement les besoins spécifiques (ex: HDS, standard téléphonique) en fonction des mots-clés du transcript.
*   **Test : Transmission Outbound au KAM (`POST /api/sales/visit-reports/<id>/transmit/`)**
    *   *Attendu* : Crée le dossier prospect et son Business Twin dans le workspace du KAM, avec le statut `NEW`.

---

## 6. Passerelle d'Intégration & Mocks (`backend/sales/integrations`)

Ces tests sont écrits dans `backend/sales/tests.py`.

### 6.1 Tests du Client Kaabu CRM (`KaabuClient`)
*   **Test : Authentification OAuth2 & Cache Token**
    *   *Attendu* : Récupère le jeton JWT, le conserve dans le cache Redis/Django, et bascule en mode résilient local si l'API est indisponible.
*   **Test : Recherche & Déduplication Multi-Niveaux**
    *   *Attendu* : Calcule des scores de similarité exacts : SIREN (100%), Domaine Web (95%), et Levenshtein / Jaro-Winkler (> 70%).

### 6.2 Tests du Récepteur Webhook ArrowSphere (`ArrowSphereWebhookView`)
*   **Test : Réception du Webhook d'Activation (`POST /api/v1/sales/integrations/arrowsphere/webhook/`)**
    *   *Attendu* : Accepte les payloads Cloud (Pipedream), met à jour le statut `Enterprise.sync_status = "SYNCED"` et déverrouille les tutoriels d'adoption dans l'espace client.

### 6.3 Test d'Écosystème Boucle Fermée (`scripts/simulate_ecosystem.py`)
*   **Test : Orchestration complète en 4 étapes**
    *   *Attendu* : Exécute le flux bout-en-bout : Onbora ➔ POST Kaabu CRM ➔ ArrowSphere ➔ Webhook POST ➔ Déverrouillage des formations dans l'espace client.



## Portefeuille KAM, churn et upsell

- `kam.test_seed_portfolios` : seed réexécutable sans doublons, préservation des entreprises existantes, quatre combinaisons churn/upsell, compteurs alimentés, API paginée et isolation entre KAM.
- `kam.test_churn_radar` : règles de santé, persistance, snapshots, compteurs et endpoints du radar.
- Navigateur : dashboard limité à six comptes, lien Voir tout sans fond ni bordure, pagination et recherche, onglets conditionnels sur les quatre cohortes, sheets sans bordure, un seul CTA primaire et palette neutre sur admin/KAM office/back office.

## Agenda et pages de rapport de visite (30 septembre 2026)

- `cd frontend` puis `node --test tests/backofficeReport.test.mjs` : six tests couvrent la séparation des identifiants des rapports et formulaires, le retour à la page source, la conservation des synthèses, besoins, objections, actions, emails, transcriptions et réponses au questionnaire, le score zéro, les URL directes et les rapports introuvables.
- Navigateur KAM : six rendez-vous par page, filtres et recherche réinitialisant la pagination, dernière page désactivée, navigation au clavier et affichage à 390 px.
- Navigateur KAM Office : ouverture et rechargement d'une page de rapport, onglets et retour à la liste, absence de fenêtre modale, menus scoring et churn retirés.
- Navigation KAM, KAM Office, administrateur et back-office : élément actif en bleu primaire. Recherche KAM alignée à droite dans l'espace de travail.
- Back-office : vérifier les rapports dictés et les formulaires guidés avec leurs données propres. L'adaptateur est couvert par les tests ; les listes locales ne contenaient aucune visite lors de la vérification navigateur.


## KAM mobile, rapports et conservation de la transcription (30 septembre 2026)

- `cd mobile` puis `flutter test` : 32 tests passent, dont la conservation et la reprise des segments vocaux, les brouillons séparés par utilisateur et réunion, les écritures ordonnées, le payload exact envoyé au backend, la conservation après erreur et le nettoyage après succès, le blocage des générations concurrentes et des réunions vides.
- Navigation : balayage entre onglets, sélection cohérente lors des sauts, conservation de l'état, gestes depuis les bords lorsqu'une carte utilise ses propres gestes. Le parcours Comptes → Agenda → Visites → Rapport est vérifié avec les contrats API.
- Rapports : une action primaire visible, aucune icône, onglets rapport/email/transcription, largeur 320/390/768 px et thèmes clair/sombre. Captures des écrans réels Flutter avec la police SFPro pour la vérification visuelle.
- `flutter analyze --no-pub` : aucune anomalie. `flutter build apk --debug` : compilation Android réussie.
- `cd backend` puis `manage.py test kam.tests kam.test_mobile_appointment_update --noinput` avec base SQLite de test : 22 tests passent. Les nouveaux tests couvrent tous les champs éditables d'un rendez-vous, la validation atomique, l'isolation entre KAM et la conservation en base du texte vocal combiné aux notes.
- Les tests automatisés vérifient le transport et la persistance de la transcription. La reconnaissance d'une voix réelle par le microphone Android/iOS reste à valider sur appareil ; aucun enregistrement réel ni envoi CRM externe n'a été effectué pendant la validation.
# Core AI — corrections du 3 novembre 2026

| Zone | Vérifications de régression |
| --- | --- |
| Accès | Recherche anonyme refusée, isolation des portefeuilles et des sessions, anciennes sessions non revendicables, GET sans création, réindexation administrateur |
| Validation | Identifiant de session requis, limites numériques invalides/négatives/excessives rejetées en 400 |
| Mémoire | Historique injecté et borné, analyse concurrente rejetée sans perte, ancienne approbation réinitialisée |
| Preuves | Repli sans besoin inventé, fiche technique sans IP fictive, invalidation des anciens brouillons en cache, scoring fondé sur les données |
| Vecteurs | Même espace pour index et requêtes, cache invalidé sur changement, mises à jour visibles entre instances et après redémarrage |
| Délais | Pas de cascade sur quota, modèle de repli limité au temps restant |
| Tâches | File persistante et bornée, demande dédupliquée, bail exclusif/repris, résultats persistés, arrêt après trois échecs, signaux dédupliqués |
| Parcours KAM | Rapport et rendez-vous mobile, PDF technique, radar de churn, rafraîchissement du fil sans lecture des sources réelles dans les tests |

Commande : `venv/Scripts/python.exe manage.py test apps.ai_core kam.tests kam.test_mobile_appointment_update kam.test_news_feed kam.test_churn_radar --settings=onbora.test_settings --noinput` depuis `backend/`.

## Parité KAM Flutter — 4 novembre 2026

| Domaine | Couverture automatisée |
| --- | --- |
| API partagée | Identifiants de comptes, authentification Token, payload de clôture avec voix et notes séparées |
| Portefeuille | Ouverture d’un compte puis analyse réelle, recherche vide, reprise après erreur réseau |
| Rendez-vous | Préparation depuis un rendez-vous, faits et questions renvoyés par le backend |
| Veille | Enregistrement des actions lu/non lu et favori sur les endpoints du web |
| Visite | Rejet du contenu vide, rapport réel depuis des notes, conservation des notes après échec |
| Brouillons | Persistance et isolation par serveur, utilisateur et rendez-vous |
| Mise en page | 320/768 px, clair/sombre, texte agrandi à 130 % |

Commandes depuis `mobile/` : `flutter test`, `dart analyze`, `flutter build apk --debug`. Le microphone et la feuille de partage PDF restent à vérifier sur un appareil Android/iOS. Matrice fonctionnelle détaillée : `mobile/KAM_PARITY.md`.

# Research API v2 — intégration du 4 novembre 2026

Tests `apps.ai_core.test_company_research` : contrat v2, Bearer et absence de
redirections, idempotence locale/distante, réponse POST perdue, suivi GET sans
nouvelle création, accès propriétaire/compte, bail concurrent, échéance, preuves
manquantes, absence de références fabriquées et conservation des corrections KAM.

Parcours reproductible : `scripts/smoke_research_integration.py` utilise le corpus
fictif avec un serveur HTTP et un worker Research séparé, jusqu'au brief Onbora.
Les bases du test sont isolées ; aucun appel fournisseur payant.

## Historique des signaux Onbora Analysis — 5 novembre 2026

- Backend : `kam.test_analysis_signals` vérifie l’archivage automatique par le worker, la déduplication entre recherches et dans une même réponse, la conservation des sources, la reprise hors réseau idempotente, les permissions, le suivi personnel audité et la stabilité du nombre de requêtes. Les tests couvrent aussi la réserve sur l’identité, les périodes vides, les filtres, les journées de Kinshasa et le niveau de preuve disponible à la fin d’une période passée.
- Régression : `apps.ai_core.test_company_research` et `kam.test_news_feed` couvrent le parcours de recherche et le fil d’actualité existants.
- Reprise antérieure à v2 : import hors réseau des résultats déjà présents dans les comptes, références et identité contrôlées, réserve « Historique à revalider », absence de faux jobs v2, dates conservées, reprise idempotente et conservation du suivi lors du passage au format v2. L’API signale les faits disponibles hors période. Vérification locale : 70 observations et 116 faits distincts repris ; 2 signaux accessibles au compte salim sur les 30 derniers jours.
- Frontend : `node --test tests/analysisSignals.test.mjs` depuis `frontend/` (7 tests) vérifie les filtres encodés, les liens de sources, les dates, les séries nulles et le rendu accessible des graphiques et matrices.
- Contrôles : compilation Next.js de production, TypeScript, ESLint ciblé, migration sans dérive et hooks design/dette technique ciblés.
- Vérification navigateur automatisée non réalisée : accès à l’aperçu local refusé précédemment. Vérifier manuellement les thèmes clair/sombre, le tableau défilant sur mobile, les graphiques cliquables, la pagination et l’enregistrement du suivi sans perte de notes.
- Vérification sur la base utilisée par le backend : migration `kam.0019` appliquée, reprise exécutée sans appel externe et réponse analytique authentifiée HTTP 200. Aucun job v2 terminé n’était disponible à reprendre au moment de cette vérification.

Commande backend depuis `backend/` : `venv/Scripts/python.exe manage.py test kam.test_analysis_signals apps.ai_core.test_company_research kam.test_news_feed --settings=onbora.test_settings --noinput` (SQLite en mémoire).
