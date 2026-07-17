# Règles de Vibe Coding - Onbora

Bienvenue dans le cadre de développement d'Onbora. Ces règles régissent toutes les interactions, analyses et modifications du code par l'assistant et ses sous-agents.

## Règle 1 : Consultation systématique du Contexte
Avant **chaque action**, l'assistant et tout sous-agent invoqué doivent impérativement lire le fichier de contexte principal :
*   [onbora_context.md](file:///C:/Users/Salem/Documents/projet/Onbora/onbora_context.md)

Cela permet de s'assurer que nous ne perdons jamais de vue les objectifs, l'état actuel et l'architecture globale.

## Règle 2 : Respect de la Description et des Objectifs d'Onbora
Toutes les décisions de conception, d'interface et d'architecture doivent s'aligner sur la description fonctionnelle d'Onbora (B2B Copilot pour MSP). Les rôles principaux doivent être respectés :
*   Client B2B (Découverte conversationnelle & Business Twin)
*   Prospecteur (Recherche, brief avant-visite, mode visite assistée, rapport automatique)
*   KAM (Workspace de validation, transmission qualifiée, notes)
*   Administrateur MSP (Configuration, catalogue de services)

## Règle 3 : Validation de l'Historique par l'Utilisateur
Après **chaque étape ou modification majeure**, l'assistant doit obligatoirement demander à l'utilisateur :
*   **« Acceptez-vous d'admettre ces modifications dans notre historique de contexte ? »**
*   Aucune mise à jour définitive du fichier de contexte ne doit être validée sans l'accord explicite de l'utilisateur. Cela évite d'introduire des données erronées ou de corrompre l'alignement du projet.

## Règle 4 : Alignement sur la Roadmap des Priorités
Le développement progresse de manière ordonnée selon la roadmap suivante :
1.  **Priorité 1** : Initialiser le projet (Git/GitHub, branches, frontend & backend, Docker, environnements de dev, documentation).
2.  **Priorité 2** : Créer les utilisateurs et les rôles (Client B2B, Prospecteur, KAM, Administrateur MSP).
3.  **Priorité 3** : Construire l'interface conversationnelle (Découverte client, cartes de services, démo, demande de KAM).
4.  **Priorité 4** : Créer l'espace KAM (Liste des prospects, résumé, validation, notes, statuts).
5.  **Priorité 5** : Créer l'espace prospecteur (Recherche d'entreprise, brief, mode visite, rapport).
6.  **Priorité 6** : Moteur de démo visuelle (Business Twin : situation actuelle / proposée, roadmap).
7.  **Priorité 7** : Génération des documents (PDF/HTML pour rapports, dossiers KAM, guides).
8.  **Priorité 8** : Espace de formation après intégration (Guides, FAQ, étapes d'adoption).
9.  **Priorité 9** : Tracking et données de démonstration (Dashboard synthétique d'événements).
10. **Priorité 10** : Simulation des intégrations externes (Faux connecteurs CRM, ERP, provisioning).
11. **Priorité 11** : Déploiement et tests (Déploiement, sécurité, comptes démo, validation finale).

## Règle 5 : Architecture et Directives Techniques
*   L'architecture finale (définie en Priorité 1) doit être strictement suivie.
*   Avant de commencer un nouveau ticket ou d'invoquer un agent de développement (`dev-agent`), celui-ci doit être briefé avec :
    1. Le contexte actuel ([onbora_context.md](file:///C:/Users/Salem/Documents/projet/Onbora/onbora_context.md))
    2. La priorité active
    3. Les contraintes d'architecture
