# Onbora — Copilote Commercial B2B pour MSP

Onbora est un copilote commercial B2B conçu pour les fournisseurs de services managés (MSP) comme Orange Business. Ce dépôt contient le code source du projet.

---

## 1. Structure des Répertoires

*   `backend/` : Projet Django REST Framework. Intègre les modules `accounts`, `catalog`, `discovery`, `sales`, `kam`, `twin`, `training` et `reporting`.
*   `frontend/` : Application Next.js (App Router, TypeScript, Tailwind CSS).
*   `docker-compose.yml` : Configuration Docker pour orchestrer les conteneurs PostgreSQL, Redis, Django et Next.js.
*   `vibe_rules.md` : Guide de contribution et règles de Vibe Coding du projet.
*   `onbora_context.md` : Le fichier de contexte et d'état d'avancement (Source of Truth).
*   `architecture.md` : Les spécifications architecturales et relations de base de données.

---

## 2. Installation et Lancement Local (Sans Docker)

### A. Prérequis
*   **Python 3.11 ou plus**
*   **Node.js 18 ou plus**

### B. Configuration du Backend
1.  Ouvrez un terminal dans le répertoire `backend/`.
2.  Activez le d'environnement virtuel pré-configuré :
    *   **Windows (PowerShell)** : `venv\Scripts\Activate.ps1`
    *   **Linux / macOS** : `source venv/bin/activate`
3.  Installez les dépendances si ce n'est pas déjà fait :
    ```bash
    pip install -r requirements.txt
    ```
4.  Appliquez les migrations initiales (SQLite par défaut en développement local si `DB_HOST` n'est pas défini dans le `.env`) :
    ```bash
    python manage.py migrate
    ```
5.  Lancez le serveur de développement :
    ```bash
    python manage.py runserver
    ```
    L'API Django REST Framework s'exécute sur [http://localhost:8000/](http://localhost:8000/).

### C. Configuration du Frontend
1.  Ouvrez un terminal dans le répertoire `frontend/`.
2.  Installez les packages npm :
    ```bash
    npm install
    ```
3.  Démarrez le serveur de développement Next.js :
    ```bash
    npm run dev
    ```
    L'interface utilisateur s'exécute sur [http://localhost:3000/](http://localhost:3000/).

---

## 3. Lancement avec Docker (Recommandé pour la Production/Simulations)

Pour construire et démarrer l'ensemble des services (PostgreSQL, Redis, Django, Next.js) en une seule commande :

```bash
docker-compose up --build
```

Les services démarreront sur les ports configurés :
*   **Frontend** : [http://localhost:3000/](http://localhost:3000/)
*   **Backend API** : [http://localhost:8000/](http://localhost:8000/)
*   **PostgreSQL** : Port `5432`
*   **Redis** : Port `6379`
