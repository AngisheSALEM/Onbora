# Contexte Général du Projet Onbora

Dernière mise à jour : 17 juillet 2026

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
2.  **Prospecteur / Commercial terrain** : Utilise Onbora pour préparer ses visites (briefs), enregistrer et transcrire les échanges, et générer les rapports après-visite.
3.  **KAM (Key Account Manager)** : Reçoit les dossiers structurés par Onbora, valide les propositions commerciales et gère la relation client.
4.  **Administrateur MSP** : Configure le catalogue de services, les modèles de rapports, les règles métier et les indicateurs de suivi.

---

## 4. Les Rôles Majeurs d'Onbora
*   **Qualification Client (Entrant)** : Conversation de découverte -> structuration automatique du besoin -> recommandations préliminaires -> Business Twin (Avant/Après) -> Transmission au KAM.
*   **Assistance à la Prospection (Sortant)** :
    *   *Avant la visite* : Brief de préparation (pitch, questions clés, hypothèses).
    *   *Pendant la visite* : Prise de notes assistée, détection de besoins, objections, services.
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
[ Portail MSP ]   [ Mini-App Maxit ]   [ Widget ]   [ Interface Commercial ]   [ Interface KAM ]
                                           ↓
                                   [ API Onbora ]
                                           ↓
     [ Agent IA ] ↔ [ Catalogue Services ] ↔ [ Moteurs de Rapport / Business Twin / Formation ]
                                           ↓
                              [ CRM & Outils Internes MSP ]
```

---

## 7. État Actuel du Projet et Roadmap

### Statut Général : Prototype One-Shot Prêt & Validé
> [!NOTE]
> La première partie qui est le prototype en one-shot (devant être recorrigé et validé) est d'ores et déjà prête et totalement opérationnelle.
> L'ensemble du design system Orange/Noir/Blanc premium, les espaces de découverte Client, le dictaphone de prospection, le provisioning de services MSP et les tests unitaires ont été implémentés avec succès.

Les fichiers clés disponibles dans le dépôt :
*   Règles de travail : [vibe_rules.md](file:///C:/Users/Salem/Documents/projet/Onbora/vibe_rules.md)
*   Contexte global : [onbora_context.md](file:///C:/Users/Salem/Documents/projet/Onbora/onbora_context.md)
*   Architecture technique : [architecture.md](file:///C:/Users/Salem/Documents/projet/Onbora/architecture.md) & [architecture_eraser.txt](file:///C:/Users/Salem/Documents/projet/Onbora/architecture_eraser.txt)
*   Cadrage CRM / Provisioning : [integration_kaabu_arrowsphere.md](file:///C:/Users/Salem/Documents/projet/Onbora/integration_kaabu_arrowsphere.md)
*   Workflows métier :
    *   [workflow_client_b2b.md](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_client_b2b.md) & [workflow_client_b2b_eraser.txt](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_client_b2b_eraser.txt) (Client B2B)
    *   [workflow_prospecteur.md](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_prospecteur.md) & [workflow_prospecteur_eraser.txt](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_prospecteur_eraser.txt) (Prospecteur)
    *   [workflow_kam.md](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_kam.md) & [workflow_kam_eraser.txt](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_kam_eraser.txt) (KAM)
    *   [workflow_ai.md](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_ai.md) & [workflow_ai_eraser.txt](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_ai_eraser.txt) (Intégrations IA)

### Tableau de bord de la Roadmap

| Étape | Priorité | Description | Statut | Détables / Livrables |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Priorité 1** | Initialiser le projet | **Terminé** | Dépôt Git, Branches dev/main, Squelette Frontend Next.js & Backend Django, configuration Docker & env |
| 2 | **Priorité 2** | Créer les utilisateurs & rôles | **Terminé** | Modèle User étendu, API de login/register/me, scripts de seed, AuthContext Next.js, guards RBAC, pages de dashboards (/client, /sales, /kam, /admin) |
| 3 | **Priorité 3** | Interface conversationnelle B2B | **Terminé** | Catalogue de services initialisé (seed), API Discovery (messages, qualification, twin, transmission), interface de chat client, tracker de profil temps réel, visualiseur Business Twin & Roadmap, transmission KAM |
| 4 | **Priorité 4** | Espace KAM | **Terminé** | API de gestion des dossiers prospects, tableau de bord KAM (/kam), filtre par statut, assignation de dossier, édition de notes internes, visualiseur de dossier & Business Twin |
| 5 | **Priorité 5** | Espace Prospecteur | **Terminé** | Recherche & mock d'entreprises (scraping & CRM), brief de visite avec plan d'actions IA, enregistreur de visite (dictaphone commercial), rapport post-visite & détection de mots-clés, transmission KAM |
| 6 | **Priorité 6** | Moteur de démo visuelle | **Terminé** | Composant BusinessTwinViewer interactif avec onglets, comparatifs Avant/Après, jauges d'impacts SVG dynamiques, et chronologie interactive (Gantt) par phases de déploiement |
| 7 | **Priorité 7** | Génération documentaire | **Terminé** | Endpoints d'export HTML imprimable / PDF pour les synthèses client, rapports commerciaux, et dossiers KAM, avec boutons d'export intégrés aux dashboards |
| 8 | **Priorité 8** | Formation Post-Intégration | **Terminé** | Composant HelpDrawer partagé avec guides interactifs, FAQ et tutoriels contextuels pour les Clients B2B, Commerciaux et KAMs |
| 9 | **Priorité 9** | Tracking & Données de démo | **Terminé** | Modèle DemoEvent et helper log_demo_event, endpoints d'agrégation d'indicateurs (KPIs, pipe, logs), tests unitaires et dashboard administrateur (/admin) en temps réel |
| 10 | **Priorité 10** | Simulations d'intégrations | **Terminé** | Faux connecteurs CRM, ERP, API de provisioning de services (Fibre, M365, EDR & Firewall) avec logs d'audit en temps réel et tests unitaires |
| 11 | **Priorité 11** | Déploiement et tests | **Terminé** | Configuration de la CI/CD (GitHub Actions), table des comptes de démo par rôle documentée, test builds Next.js et suite de tests Django validés à 100% |

---

## 8. Historique Récent des Modifications
*   **Business Twin PowerPoint** : Restructuration complète du diagnostic sous forme de présentation PowerPoint interactive de 5 diapositives (Situation comparative, Graphique SVG d'impact, Services préconisés, et Roadmap chronologique). Un aperçu miniature (preview) est généré à la fin du chat B2B, s'agrandissant au clic.
*   **Graphiques SVG** : Intégration de diagrammes comparatifs de débits dans le jumeau numérique et d'un graphique linéaire d'adoption hebdomadaire (Inbound vs Outbound) sur la console de supervision MSP.
*   **Exportations PDF (Branding)** : Alignement de la feuille de style globale des exports sur la charte Orange/Noir/Blanc, et intégration du véritable logo vectoriel Onbora (main OK).
*   **Ajustement du Thème Clair & Bascule de Thème** : Suppression complète des fonds gris (`bg-zinc-50`) au profit d'un blanc pur (`bg-white` / `#FFFFFF`) sur toutes les pages de rôles (KAM, Client B2B, Prospecteur, Admin, Layout). Le texte par défaut en mode clair a été défini à `#000000` (Noir Pur). L'icône de bascule de thème a été corrigée pour afficher l'état actif (Lune en mode sombre, Soleil en mode clair) et le bouton s'adapte dynamiquement au thème.
*   **Charte Graphique Onbora** : Création d'une charte graphique officielle et exhaustive définissant la palette de couleurs, typographie, règles d'utilisation, styles des boutons, des champs de conversation, des bulles de chatbot, des cartes de services et prospects, des timelines, des fenêtres, et des alertes. Un export PDF officiel ([charte_graphique.pdf](file:///C:/Users/Salem/Documents/projet/Onbora/charte_graphique.pdf)) a été généré via ReportLab avec des illustrations vectorielles précises des éléments UI (champs de conversation, bulles de chatbot, boutons, cartes de services), les swatches couleur et la palette typographique.
*   **Remplacement du Logo par l'Image Officielle** : Copie du fichier `onbora logo.png` vers le dossier public du frontend (`frontend/public/onbora_logo.png`) et remplacement de l'ancien logo SVG dans le composant global [Logo.tsx](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/components/shared/Logo.tsx), garantissant que le nouveau logo s'affiche partout sur le site (connexion, dashboards, sliders, jumeau numérique).

## 9. Prochaine Action Planifiée
*   **Chantiers en attente du livrable IA** :
    1.  **Parcours Prospecteur (Audio réel)** : **Terminé** (Web Audio + upload backend configurés).
    2.  **Parcours Client B2B → KAM** : **Terminé** (12 statuts de cycle de vie + notifications par polling implémentés).
    3.  **Business Twin Dynamique** : **Terminé** (Rendu SVG & timeline Gantt réactifs branchés sur le KAM Dashboard).
    4.  **Exports PDF** : **Terminé** (Les 7 documents requis avec ReportLab & canvas de numérotation).
    5.  **Administration** : **Terminé** (Interface CRUD complète Next.js + endpoints Django REST pour le catalogue MSP et FAQ).
    6.  **Tracking & Connecteurs Simulés** : **Terminé** (Tracking précis des 14 événements du cycle de vie + Bannières d'information MVP).
    7.  **Sécurité, Fiabilité & Tests E2E** : **Terminé** (Classes de permission RBAC par rôle, validation des tailles limites d'upload, sauvegarde et bouton de réessai pour timeout IA, et tests Playwright E2E rédigés).
*   **Prochaine étape (Choisie)** : **Recherche & Cadrage CRM & Provisioning (10 jours)**. Mettre de côté temporairement l'intégration finale de l'IA et se concentrer sur l'exploration de l'API d'Orange Kaabu (CRM interne) et d'ArrowSphere (outil de provisioning Orange pour SaaS/licences) afin d'anticiper leur intégration future.

---

## 10. Module de Formation & Moteur de Simulation d'IA (Tool-Calling JSON)

### A. Onboarding par Produit Orange
Le module de formation interactive pas-à-pas est conçu comme un outil d'onboarding déclenché par l'acquisition des produits d'Orange (MFA, VPN Cisco, SharePoint, Teams Phone).
*   **Lancement ciblé** : Dès qu'un service passe au statut `COMMANDÉ` ou `PROVISIONNÉ` dans le suivi de commandes, l'utilisateur reçoit une alerte contextuelle lui recommandant de suivre le parcours d'adoption correspondant.
*   **Médiathèque interactive (CSS/SVG)** : Les étapes présentent visuellement la solution d'Orange à l'aide de mockups interactifs animés en CSS/SVG simulant les applications réelles (ex: l'écran d'approbation Microsoft Authenticator d'Orange, la fenêtre du client Cisco VPN, et l'explorateur SharePoint synchronisé localement).

### B. Passerelle Conversationnelle en Pleine Formation
À tout moment en cours de tutoriel, si l'utilisateur est bloqué ou s'il a une interrogation, il dispose du bouton **"Demander à l'IA"**. Ce bouton :
1.  Ferme le tiroir de formation.
2.  Pré-remplit l'input du chat principal d'Onbora avec une question contextuelle descriptive (ex: *"Je suis bloqué à l'étape X du module Y..."*).
3.  Positionne automatiquement le curseur de saisie pour que l'utilisateur puisse immédiatement dialoguer avec le copilote.

### C. Moteur d'IA Factice (Mock AI Agent & Tool Calling)
Pour simuler l'intégration d'un LLM capable d'interagir en temps réel avec les briques de l'interface en tant qu'outils (Tool Calling), un projet Node.js autonome a été créé dans le dossier `mock-ai-server/`.
*   **Port & Route** : Écoute sur le port `3001` à l'adresse `POST /api/chat`.
*   **Payload JSON Structuré** : Si l'utilisateur demande une action par chat textuel ou vocal (ex: *"Lance la formation du VPN"* ou *"Génère les slides"*), l'API intercepte la requête et retourne :
    ```json
    {
      "reply": "D'accord, je lance le guide d'adoption SharePoint OneDrive pour vous...",
      "tool_calls": [
        {
          "name": "launch_training",
          "arguments": { "moduleId": "sharepoint-collab" }
        }
      ]
    }
    ```
*   **Orchestration Frontend réactive** :
    *   `launch_training` : Ouvre le drawer sur le module demandé.
    *   `generate_slides` : Bascule l'onglet de droite sur le Business Twin PowerPoint et déploie les diapositives.
    *   `execute_setup` : Déclenche l'automatisation en arrière-plan d'une configuration ("Do It For Me").
    *   *Résilience* : Si le serveur d'IA (port 3001) est déconnecté, le frontend bascule de manière transparente sur l'API Django standard (port 8000).

---

## 11. Passerelle d'Échange de Données & Architecture de Mock (Kaabu CRM & ArrowSphere)

Onbora **n'orchestre aucun système et ne passe aucune commande**. C'est une **passerelle d'échange de données (Data Exchange Connector)** :
*   **Récupération (GET)** : Onbora lit les données d'entreprises, les SIREN et l'historique commercial depuis le CRM Orange Kaabu pour effectuer la déduplication et préparer les briefs.
*   **Envoi (POST/PATCH)** : Onbora transmet l'opportunité qualifiée, le Business Twin PDF et le rapport de visite vers Orange Kaabu.
*   **Réception Passive (POST Webhook)** : Onbora reçoit les notifications d'activation d'ArrowSphere (`POST /api/v1/sales/integrations/arrowsphere/webhook/`) pour mettre à jour le statut du service et déverrouiller l'adoption/formation ([HelpDrawer](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/components/shared/HelpDrawer.tsx)).

```
 [ Orange Kaabu CRM ] (GET Données Entreprise / POST Opportunités)
         ↕
 [ Onbora Backend ] (Passerelle de Données - Django)
         ↑ (Réception Webhook d'Activation)
 [ ArrowSphere Provisioning ] (Notification POST externe)
```

### A. Composants de l'Architecture de Simulation
1.  **`KaabuClient`** ([backend/sales/integrations/kaabu.py](file:///C:/Users/Salem/Documents/projet/Onbora/backend/sales/integrations/kaabu.py)) : 
    *   Authentification OAuth2 (jeton JWT avec fallback local résilient).
    *   `fetch_organization_data()` : Recherche par SIREN (100%), Domaine (95%), ou Jaro-Winkler (>70%).
    *   `send_opportunity_data()` : Envoi des dossiers qualifiés vers le CRM.
2.  **`ArrowSphereClient` & Webhook** ([backend/sales/integrations/arrowsphere.py](file:///C:/Users/Salem/Documents/projet/Onbora/backend/sales/integrations/arrowsphere.py)) :
    *   `ArrowSphereWebhookView` (`POST /api/v1/sales/integrations/arrowsphere/webhook/`) : Récepteur passif de la donnée d'activation.
    *   Simulateur local pour les démos sans dépendance externe.





