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


