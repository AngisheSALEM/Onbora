# Onbora — Copilote Commercial B2B pour MSP

Onbora est un copilote commercial B2B conçu pour les fournisseurs de services managés (MSP) comme Orange Business.
La plateforme rassemble une suite complète : un backend API Django REST avec IA embarquée, une application web Next.js 16 et une application mobile commerciale terrain Flutter.

---

## 1. Vue d'Ensemble des Composants

*   [`backend/`](file:///C:/Users/Salem/Documents/projet/Onbora/backend) : Backend Django REST Framework avec AI Core natif in-process (`apps.ai_core`), gestion des catalogues, comptes, visites commerciales terrain et génération de rapports. Écoute par défaut sur le port `8000`.
*   [`frontend/`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend) : Application Web Next.js 16 (App Router, Tailwind CSS, TypeScript). Espaces dédiés pour Client B2B, Commercial, KAM et Superviseur. Écoute par défaut sur le port `3000`.
*   [`mobile/`](file:///C:/Users/Salem/Documents/projet/Onbora/mobile) : Application mobile Flutter pour les commerciaux terrain (briefs de visite, dictaphone intelligent, détection de besoins hors-ligne et rapports de visite).

---

## 2. Lancement Rapide (1 Clic)

Des scripts automatisés sont disponibles à la racine du projet pour démarrer simultanément le Backend Django et le Frontend Next.js sur toutes les interfaces réseau (`0.0.0.0`) :

### Sous Windows
Double-cliquez sur le fichier ou exécutez dans un terminal :
```cmd
start.bat
```
*(Deux fenêtres distinctes s'ouvriront pour afficher les logs en temps réel du Backend et du Frontend).*

Alternativement, vous pouvez utiliser [`onborarun.bat`](file:///C:/Users/Salem/Documents/projet/Onbora/onborarun.bat) qui regroupe les flux dans une seule fenêtre.

### Sous Linux / macOS
```bash
chmod +x start.sh
./start.sh
```

---

## 3. Procédure : Connecter un Smartphone physique au Backend Local

Pour que l'application mobile Flutter sur votre smartphone ou tablette communique avec le backend exécuté sur votre ordinateur, suivez ces étapes :

### Étape 1 : Vérifier que les deux appareils sont sur le même réseau
Votre ordinateur et votre smartphone **doivent impérativement** être connectés au même réseau Wi-Fi local (ou sur le point d'accès 4G/5G partagé de votre smartphone).

### Étape 2 : Récupérer l'adresse IP locale de votre ordinateur
*   **Windows (PowerShell)** :
    ```powershell
    Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback|vEthernet|VirtualBox" -and $_.IPAddress -notmatch "^127\." -and $_.IPAddress -notmatch "^169\.254\." } | Select-Object IPAddress, InterfaceAlias
    ```
    *Ou simplement la commande `ipconfig` (recherchez l'Adresse IPv4 de votre carte Wi-Fi ou Ethernet).*
*   **macOS / Linux** :
    ```bash
    ipconfig getifaddr en0   # macOS
    ip a                     # Linux
    ```

*Exemple d'adresse IP obtenue : `10.195.185.137`*

### Étape 3 : Configurer l'IP dans l'application mobile
Ouvrez le fichier [`mobile/.env`](file:///C:/Users/Salem/Documents/projet/Onbora/mobile/.env) et renseignez votre IP avec le port 8000 :

```env
API_BASE_URL=http://10.195.185.137:8000
```
*(Remplacez `10.195.185.137` par l'adresse IP relevée à l'Étape 2).*

### Étape 4 : Configurer l'IP dans le frontend Web (Optionnel mais recommandé)
Ouvrez [`frontend/.env.local`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/.env.local) :

```env
NEXT_PUBLIC_API_URL=http://10.195.185.137:8000
```

### Étape 5 : Démarrer le Backend avec l'écoute sur toutes les interfaces
Pour accepter les connexions en provenance d'autres appareils du réseau (comme votre smartphone), Django doit impérativement écouter sur `0.0.0.0:8000` et non sur `127.0.0.1:8000` :

```powershell
# Depuis la racine ou le dossier backend/
backend\venv\Scripts\python.exe backend\manage.py runserver 0.0.0.0:8000
```

### Étape 6 : Valider la connexion depuis le smartphone
Avant de lancer l'application mobile, ouvrez le navigateur web (Chrome / Safari) de votre smartphone et accédez à :
```text
http://<VOTRE_IP_LOCALE>:8000/api/catalog/services/
```
*Exemple : `http://10.195.185.137:8000/api/catalog/services/`*

Si une liste JSON s'affiche, le smartphone accède parfaitement au backend.

---

## 4. Lancement Manuel Détaillé Composant par Composant

### A. Backend Django
1. Ouvrez un terminal dans le dossier [`backend/`](file:///C:/Users/Salem/Documents/projet/Onbora/backend).
2. Activez l'environnement virtuel Python :
   * **Windows** : `venv\Scripts\activate`
   * **Linux / macOS** : `source venv/bin/activate`
3. Installez les dépendances si nécessaire :
   ```bash
   pip install -r requirements.txt
   ```
4. Appliquez les migrations de la base de données :
   ```bash
   python manage.py migrate
   ```
5. Lancez le serveur :
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```
   * Accès local PC : `http://localhost:8000/`
   * Accès réseau / mobile : `http://<VOTRE_IP_LOCALE>:8000/`

### B. Frontend Next.js
1. Ouvrez un terminal dans le dossier [`frontend/`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend).
2. Installez les dépendances si nécessaire :
   ```bash
   npm install
   ```
3. Lancez le serveur en écoute sur toutes les interfaces :
   ```bash
   npx next dev -H 0.0.0.0 -p 3000
   ```
   * Accès local PC : `http://localhost:3000/`
   * Accès réseau / mobile : `http://<VOTRE_IP_LOCALE>:3000/`

### C. Application Mobile Flutter
1. Ouvrez un terminal dans le dossier [`mobile/`](file:///C:/Users/Salem/Documents/projet/Onbora/mobile).
2. Vérifiez la détection de votre smartphone connecté en USB (Débogage USB activé) ou de votre émulateur :
   ```bash
   flutter devices
   ```
3. Téléchargez les dépendances :
   ```bash
   flutter pub get
   ```
4. Lancez l'application sur votre appareil :
   ```bash
   flutter run
   ```
   *Si plusieurs périphériques sont connectés, précisez l'identifiant : `flutter run -d <DEVICE_ID>`.*

---

## 5. Données de Test & Comptes de Démonstration

Pour initialiser le catalogue MSP et les comptes utilisateurs de test, exécutez dans le dossier `backend/` :

```bash
python manage.py seed_catalog
python manage.py seed_demo_users
```

### Identifiants de Démonstration Prédéfinis :

| Rôle Métier | Utilisateur | Mot de passe | Rôle & Espace Accessible |
| :--- | :--- | :--- | :--- |
| **Commercial Terrain** | `sales` | `salespass` | App Mobile Flutter & `/sales` (Web) |
| **Client B2B** | `client` | `clientpass` | Espace Découverte & Copilot B2B (`/client`) |
| **KAM (Conseiller MSP)** | `kam` | `kampass` | Espace Traitement & Validation (`/kam`) |
| **Superviseur / Admin** | `admin` | `adminpass` | Backoffice & Territoires (`/admin`, `/backoffice`) |

---

## 6. Dépannage & Erreurs Fréquentes

*   **Le smartphone n'accède pas au backend (Timeout / Connexion refusée)** :
    1. Vérifiez que Django a bien été lancé avec `0.0.0.0:8000` et non `127.0.0.1:8000`.
    2. Vérifiez que l'ordinateur et le téléphone sont sur le **même réseau Wi-Fi** (désactivez les VPNs actifs sur le PC et sur le téléphone).
    3. **Pare-feu Windows** : Si Windows bloque les connexions entrantes, autorisez le port 8000 ou autorisez l'exécutable `python.exe` dans le Pare-feu Windows Defender.
*   **L'application mobile n'applique pas la nouvelle IP** :
    *   Les modifications du fichier `.env` dans Flutter nécessitent un rechargement complet de l'application (touche `R` en mode debug, ou relancez `flutter run`).
*   **Erreur CORS** :
    *   Le backend Django a `CORS_ALLOW_ALL_ORIGINS = True` et `ALLOWED_HOSTS = ['*']` en mode `DEBUG=True`, autorisant les requêtes provenant du réseau local.
