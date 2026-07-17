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

### Statut Général : Initialisation terminée (Priorité 1 validée)
L'environnement de développement complet d'Onbora (Next.js + Django DRF + Docker + Git branches `main` et `dev`) a été initialisé, configuré et validé avec un premier commit.

Les fichiers clés disponibles dans le dépôt :
*   Règles de travail : [vibe_rules.md](file:///C:/Users/Salem/Documents/projet/Onbora/vibe_rules.md)
*   Contexte global : [onbora_context.md](file:///C:/Users/Salem/Documents/projet/Onbora/onbora_context.md)
*   Architecture technique : [architecture.md](file:///C:/Users/Salem/Documents/projet/Onbora/architecture.md) & [architecture_eraser.txt](file:///C:/Users/Salem/Documents/projet/Onbora/architecture_eraser.txt)
*   Workflows métier :
    *   [workflow_client_b2b.md](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_client_b2b.md) & [workflow_client_b2b_eraser.txt](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_client_b2b_eraser.txt) (Client B2B)
    *   [workflow_prospecteur.md](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_prospecteur.md) & [workflow_prospecteur_eraser.txt](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_prospecteur_eraser.txt) (Prospecteur)
    *   [workflow_kam.md](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_kam.md) & [workflow_kam_eraser.txt](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_kam_eraser.txt) (KAM)
    *   [workflow_ai.md](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_ai.md) & [workflow_ai_eraser.txt](file:///C:/Users/Salem/Documents/projet/Onbora/workflow_ai_eraser.txt) (Intégrations IA)

### Tableau de bord de la Roadmap

| Étape | Priorité | Description | Statut | Détables / Livrables |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Priorité 1** | Initialiser le projet | **Terminé** | Dépôt Git, Branches dev/main, Squelette Frontend Next.js & Backend Django, configuration Docker & env |
| 2 | **Priorité 2** | Créer les utilisateurs & rôles | **En cours** | Client B2B, Prospecteur, KAM, Admin MSP (modèle d'authentification simple) |
| 3 | **Priorité 3** | Interface conversationnelle B2B | *À faire* | Chat de qualification, cartes de services, démo |
| 4 | **Priorité 4** | Espace KAM | *À faire* | Dashboard KAM, validation de prospects, notes, statuts |
| 5 | **Priorité 5** | Espace Prospecteur | *À faire* | Recherche entreprise, brief pré-visite, enregistrement visite |
| 6 | **Priorité 6** | Moteur de démo visuelle | *À faire* | Affichage dynamique du Business Twin (JSON) |
| 7 | **Priorité 7** | Génération documentaire | *À faire* | Export HTML/PDF de rapports, dossiers, guides |
| 8 | **Priorité 8** | Formation Post-Intégration | *À faire* | Guides d'adoption, FAQ, tutoriels |
| 9 | **Priorité 9** | Tracking & Données de démo | *À faire* | Logging d'événements, Dashboard statistiques de démo |
| 10 | **Priorité 10** | Simulations d'intégrations | *À faire* | Faux connecteurs CRM, ERP, provisioning |
| 11 | **Priorité 11** | Déploiement et tests | *À faire* | CI/CD, sécurité, comptes de démo par rôle |

---

## 8. Prochaine Action Planifiée
*   **Créer les utilisateurs et les rôles (Priorité 2)** :
    *   Configurer le modèle User personnalisé dans `backend/accounts/models.py`.
    *   Créer les endpoints d'authentification simple (Login/Register/Me).
    *   Écrire les fixtures ou scripts d'initialisation pour générer un utilisateur de démonstration pour chaque rôle (Client, Prospecteur, KAM, Administrateur).
    *   Créer la structure des pages de connexion côté frontend Next.js.
