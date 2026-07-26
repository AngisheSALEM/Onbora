# Étapes d'Intégration du Module de Scraping (Onbora)

Ce document décrit la roadmap technique étape par étape pour intégrer le module de scraping basé sur **Agent-Reach** au sein de l'architecture Onbora.

---

## Étape 1 : Installation et Diagnostics (Agent-Reach CLI)
*   **Action** : Configurer l'environnement Python du backend pour installer et lister les outils requis.
*   **Tâches** :
    1.  Ajouter `agent-reach` dans le fichier `backend/requirements.txt`.
    2.  Créer une commande d'initialisation Django (ex: `python manage.py setup_scrapers`) qui exécute `agent-reach install` pour télécharger les modules amont (parsers, yt-dlp, etc.).
    3.  Lancer `agent-reach doctor` via un sous-processus de test pour vérifier la validité des dépendances système locales (ex: Chrome/Chromium si nécessaire).

## Étape 2 : Injection Sécurisée des Cookies de Session
*   **Action** : Permettre l'authentification des comptes de test sans coder les identifiants en dur.
*   **Tâches** :
    1.  Créer un modèle Django `ScraperCredential` ou utiliser le stockage des variables d'environnement (`.env`) pour renseigner les cookies des plateformes (LinkedIn, X).
    2.  Ajouter une interface d'administration simple (réservée à l'administrateur MSP) permettant d'injecter ou de mettre à jour les chaînes de cookies de session.
    3.  Configurer le script d'appel pour copier ces cookies dans le répertoire local attendu par Agent-Reach avant le lancement des commandes.

## Étape 3 : Endpoints de Commande Django (Orchestration Asynchrone)
*   **Action** : Créer l'API Django REST pour déclencher et surveiller le scraping.
*   **Tâches** :
    1.  Créer la vue `ScrapeProspectView` accessible via `POST /api/sales/scraping/run/` (sécurisée par la permission `IsSalespersonOrAdmin`).
    2.  Puisque le scraping prend plusieurs secondes, exécuter la tâche de manière asynchrone (via Celery ou via un thread d'arrière-plan d'Onbora).
    3.  Utiliser la bibliothèque Python `subprocess` pour appeler le CLI `agent-reach` :
        *   LinkedIn : `agent-reach linkedin "Nom Prenom"` ou via l'URL du profil.
        *   Twitter : `agent-reach twitter "search_query"`.
        *   TikTok / Web : parsing direct.

## Étape 4 : Parsing et Consolidation Structurée
*   **Action** : Nettoyer les retours HTML/JSON d'Agent-Reach et les transformer en profil consolidé.
*   **Tâches** :
    1.  Développer les fonctions de nettoyage dans `backend/catalog/parser.py` (ou un nouveau module `sales/scraping_parser.py`) pour supprimer les balises HTML inutiles et réduire la taille des tokens.
    2.  Regrouper les données sous le format JSON unifié défini dans le document `contexte_scraping.md`.

## Étape 5 : Raccordement IA (AI Engineer) et Profilage
*   **Action** : Envoyer le JSON consolidé au modèle de l'AI Engineer pour générer les hypothèses de vente.
*   **Tâches** :
    1.  Appeler la fonction de prompt de l'AI Engineer avec le JSON de scraping.
    2.  Demander à l'IA de retourner :
        *   Les 3 principales hypothèses techniques (ex: pannes de fibre, migration Cloud en cours).
        *   Des idées d'ice-breakers ultra-personnalisés basés sur les centres d'intérêt ou posts du décideur.
    3.  Sauvegarder ce rapport final enrichi dans la table `VisitPreparation` ou `ProspectDossier`.

## Étape 6 : Interface Utilisateur (Dashboard Commercial)
*   **Action** : Afficher les fiches enrichies dans l'espace commercial.
*   **Tâches** :
    1.  Ajouter un bouton *« Lancer la recherche IA de profilage »* sur le panneau de préparation de visite du commercial (`frontend/src/app/sales/page.tsx`).
    2.  Afficher une barre de progression dynamique montrant le statut du scraping en temps réel.
    3.  Une fois terminé, afficher de façon ergonomique le profilage sous forme de cartes d'insights (Ice-breakers, Sujets chauds, Stack Tech).
