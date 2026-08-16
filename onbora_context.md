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

---

## 9. Prochaine Action Planifiée
*   **Surveillance du Déploiement Render** : Vérification des logs d'exécution du `python manage.py migrate` post-commit sur Render Cloud.
*   **Recette Globale Web & Mobile** : Tests d'intégration de bout en bout entre l'app mobile Flutter, l'API REST Render et le dashboard KAM Next.js.

---

## 10. Passerelle d'Échange de Données (CRM Kaabu & ArrowSphere)

Onbora agit comme **passerelle d'échange de données (Data Exchange Connector)** :
*   **GET (Kaabu)** : Lecture des données d'entreprises et SIREN.
*   **POST (Kaabu)** : Envoi des dossiers qualifiés, Business Twins et rapports.
*   **Webhook (ArrowSphere)** : Réception passive de la notification d'activation (`POST /api/v1/sales/integrations/arrowsphere/webhook/`) déverrouillant le module d'adoption.
