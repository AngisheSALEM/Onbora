# Plan de Tests Unitaires — Onbora

### Core AI, contexte de compte et hypothèses étayées — 12 novembre 2026

- `apps.ai_core.test_account_context` : import du registre, CRM, parc et historique lus par
  le briefing ; invalidation du cache au changement des données et préservation des corrections humaines.
- Aucune anticipation sur le seul secteur, l’effectif, le nombre de sites ou un parc non renseigné ;
  une hypothèse doit être enregistrée et reliée à des faits attribuables par identifiants de preuve.
- Index dynamique partagé alimenté par les imports CRM, les seeds et les recherches terminées ;
  texte du vecteur issu du même contexte que le Core AI, sans connectivité ou effectif inventés.
- Rafraîchissement entre processus, normalisation des accents, reconnaissance des identifiants `account-` ;
  les recommandations ne prouvent pas qu’un service est installé.
- Gemini : modèle configuré respecté, statut d’inférence explicite, un seul modèle de repli sur 404/503
  dans le budget global ; aucun cumul d’appels sur 429, erreur d’authentification ou timeout.
- Comparatif avec effectifs absents sans exception ; suppression des recommandations Web ajoutées
  automatiquement lorsque la réponse du moteur est vide et des anciens badges de score sur les fiches importées.
- Suites ciblées : 110 tests backend. API Analysis : 48 tests de collecte/recherche incluant un vrai
  serveur HTTP local avec `Connection: close`, maintien du socket pendant la lecture du corps et du délai global.

### Comptes nommés du registre et intégration KAM — 11 novembre 2026

- Émetteur : dix tests sur les noms du manifeste, absence de contacts ou montants
  inventés, identité stable et exclusion des références CRM des leads du même lot.
- Récepteur : prise en charge des références de manifeste sans UUID Company inventé.
- Parcours KAM : affectation des comptes CRM, découverte des leads, ajout au portefeuille,
  isolation entre KAM, favoris et dates conservés au rejeu, rattachement des anciens imports.
- Les marqueurs et filtres d’origine sont absents des interfaces ; la traçabilité reste interne.

### Import CRM et leads Onbora Analysis — 11 novembre 2026

- `sales.test_seed_import` : 12 tests sur l’authentification administrateur, le mapping,
  les routes v1, les rejeux, les changements de profil et la préservation du suivi commercial.
- Contrainte unique d’identité et transaction atomique ; refus des collisions avec les
  fiches CRM existantes et rollback intégral en cas d’échec.
- Leads conservés séparément des données CRM confirmées ; provenance, noms complets et
  sources conservés, sans qualification ni parc installé inventé.
- Émetteur Onbora Analysis : 8 tests autonomes couvrant lecture source seule, CLI,
  export déterministe, identité stable, reprise HTTP et absence de doublons au rejeu.
- Échange HTTP complet sur une base isolée : 20 fiches envoyées deux fois par le
  script émetteur avec un jeton administrateur ; 20 entreprises et 20 fiches CRM au total.

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

Comparatif sectoriel — 4 novembre 2026 : `kam.test_comparison_unknown` couvre le parc inconnu des deux côtés, les valeurs par défaut, l’ancienne offre 4G fictive et la reprise du scoring après saisie d’une offre réelle. `kam.test_news_feed` vérifie qu’un ajout au portefeuille ne crée ni connectivité ni offre installée fictives. Exécution avec `--settings=onbora.test_settings --noinput` (SQLite isolé).

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
# Connexion Dynamics administrateur et parc sectoriel — novembre 2026

- `accounts.test_dynamics_connection` : permissions ADMIN, URL Dynamics contrôlée,
  chiffrement et non-divulgation du secret, conservation du secret à la mise à jour,
  vérification d'identité réelle simulée par mock, refus des succès hors connexion.
- `kam.test_installed_sector` : référentiel partagé avec le comparatif, rattachement
  persistant malgré un nom personnalisé, quantités SIM réelles, exclusion des contrats
  inactifs, validation des champs et suppression du produit.
- Régressions : `kam.test_comparison_unknown`, `kam.test_epic4_dynamics_outbox`.
- Cohérence du parc : une connectivité déclarée et un effectif ne créent aucun produit ;
  sans contrat actif, les métriques et le score restent non renseignés. Un contrat
  fibre seul ne génère aucune flotte SIM, capacité cloud ou disponibilité SLA.
- Base des tests : SQLite isolée via `--settings=onbora.test_settings`.
- `kam.test_physical_appointments` : création en présentiel, rejet des autres formats,
  absence de lien distant enregistré et conservation du format des anciens rapports.
- `kam.test_comparison_identity` : exclusion du compte et de ses fiches dupliquées
  par identité métier, normalisation des noms, identifiants légaux communs, liste de
  pairs dédupliquée et repli sur la moyenne du secteur sans auto-comparaison.
- `sales.test_demo_installed_catalog` : seed catalogue local idempotent, conservation
  des visites/affectations et des produits manuels/CRM, provenance démonstration et
  cohérence des quantités entre le parc installé et le comparatif sectoriel.
- `accounts.test_dynamics_import` : découverte des champs standards/personnalisés,
  ambiguïtés et distinction catalogue/parc, import idempotent des cinq collections,
  valeurs inconnues et devises, conservation des notes/produits locaux, propriétaire
  KAM reconnu par email, permissions et visibilité du portefeuille, checkpoints,
  baux et reprise, fréquence automatique, protection des jetons lors de la pagination.


## Comptes rendus KAM à partir des traces commerciales — novembre 2026

- `kam.test_meeting_reports` : brouillon sans écriture, validation explicite, corrections
  conservées, idempotence, droits d’accès, signature du brouillon et protection de
  l’historique ; aucun changement automatique du statut commercial.
- Sources : notes, messages de suivi, proposition et retour avant-vente. Une proposition
  ou un périmètre technique ne confirme aucun besoin client automatiquement.
- Documents : texte UTF-8, PDF contenant du texte et DOCX, taille maximale 5 Mo,
  extraction sans conservation du fichier, rejet des fichiers illisibles ou non pris en charge.
- `mobile/test/kam_workspace_test.dart` : saisie vide bloquée, absence de microphone,
  notes vers brouillon, relecture et correction avant enregistrement, reprise après erreur.
- Vérifications : SQLite isolée (`onbora.test_settings`), TypeScript, ESLint ciblé,
  analyse Dart et hooks de conformité design/architecture sur les fichiers concernés.

### Analyse Core AI des traces commerciales et présentation en cartes

- `kam.test_meeting_reports` : connexion à la façade Core AI, traitement des notes
  courtes et des propositions, sélection d’extraits présents dans la source, rejet
  des montants/décisions/actions sans preuve et restitution des questions de suivi.
- Le périmètre proposé et les décisions relevées restent distincts des besoins
  confirmés ; les résultats sont relus avant validation et conservés avec leur source.
- Vérification visuelle du formulaire Web dans le navigateur : cartes distinctes,
  disposition adaptative, absence de cartes imbriquées et maintien d’un seul CTA principal.


### Action commerciale des actualités — 10 novembre 2026

- Contrat Core AI : raison de l’intérêt, solution et prochaine action ; conservation des analyses enregistrées et qualification explicite lorsque les informations manquent.
- API `GET /api/kam/feed/<uuid>/commercial-action/` : authentification, rôles KAM/Admin, isolation des portefeuilles, actualité absente, lecture sans mutation et une seule requête ORM.
- Validation : `manage.py test kam.test_commercial_action kam.test_news_feed --settings=onbora.test_settings --noinput` : 17 tests réussis.
- Frontend : contrôle TypeScript, ESLint ciblé et conformité design ; route dédiée en remplacement du lecteur modal.


### Performances de lecture KAM — 11 novembre 2026

- Flux : 3 requêtes SQL, compteurs agrégés et sérialisation incluse ; une lecture vide ne crée plus de données.
- Comptes : 2 requêtes SQL pour 20 comptes, relations préchargées et statut de conversion annoté par EXISTS.
- Résumé : 10 requêtes, nombre constant entre 1 et 20 comptes ; aucun INSERT/UPDATE/DELETE, aucune comparaison détaillée ni écriture de snapshots à la lecture.
- Concordance du nombre d’opportunités avec le détail pour les signaux et le comparatif sectoriel.
- Briefing : lecture du fallback sans persistance ; affichage du dernier état enregistré pendant la recherche asynchrone, sans écraser une édition en cours.
- Client API : tests Node de regroupement des GET simultanés, isolation des sessions, reprise après erreur, invalidation après mutation et annulation indépendante.
- Validation : tests Django ciblés et Core AI, tests Node, TypeScript, ESLint ciblé et build de production Next.js ; hooks design et architecture.
- Mesure serveur sur la base de développement configurée : comptes 14 ms / 2 requêtes, leads 49 ms / 3 requêtes, résumé 137 ms / 10 requêtes. Mesure ponctuelle sans réseau navigateur ni concurrence ; voir `docs/performance_kam.md`.

### Historique commercial par compte et programmation d’actions — 11 novembre 2026

- `kam.test_account_activity` : 19 tests couvrant l’isolation des portefeuilles, les rôles,
  les comptes absents, la validation des dates, des résultats et des lieux de visite.
- Reprise des visites, comptes rendus et événements existants, y compris ceux des anciens KAM ;
  lecture sans écriture et sans doublon entre rendez-vous, action programmée et compte rendu.
- Programmation d’une action ; création atomique d’un rendez-vous physique pour une visite ;
  réalisation et annulation avec résultat/motif obligatoire, horodatage et auteur conservés.
- Clôture immuable, rejeu identique sans changement d’horodatage, cohérence avec les statuts
  de l’agenda, visite en cours et clôture depuis le parcours de compte rendu.
- Lecture constante de 5 requêtes SQL avec plusieurs actions/rapports et utilisateurs ;
  absence de chargement des transcriptions brutes pour la liste d’activité.
- Vérification Web : onglet Historique indépendant du chargement du briefing, états vide,
  chargement, erreur et confirmation ; formulaire accessible avec date locale, types d’action,
  interlocuteur, lieu conditionnel et résultat ; TypeScript, ESLint ciblé, build Next.js et hooks.

### Simplification de l’historique du compte — 11 novembre 2026

- L’écran affiche seulement les actions passées ; suppression du sous-titre et de la programmation.
- Un bouton « + » accessible ouvre la consignation dans une modale native : focus contenu,
  fermeture par croix, Annuler ou Échap, retour du focus et défilement interne sur petit écran.
- Le formulaire enregistre uniquement des actions réalisées, avec date passée et résultat obligatoire ;
  les informations saisies sont conservées lors d’une erreur et la fermeture est bloquée pendant l’envoi.
- Vérifications : TypeScript, ESLint ciblé et hook design sur les deux composants modifiés.
