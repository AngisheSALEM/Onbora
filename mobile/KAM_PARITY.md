# Espace KAM mobile

L’espace KAM Flutter reprend les données et les actions de l’interface web locale, en utilisant les mêmes API authentifiées. Les anciens écrans de démonstration ne sont plus utilisés par les routes KAM principales.

| Parcours | Implémentation mobile | API partagée avec le web |
| --- | --- | --- |
| Portefeuille | Recherche, statuts commerciaux, pagination, indicateurs | `accounts/`, `portfolio-summary/` |
| Pilotage des comptes | Comptes à risque, renouvellements, opportunités, comptes sans action, priorisation | `churn-radar/*`, `lead-scoring/` |
| Fiche compte | Briefing, diagnostic, modification des contacts et signaux | `briefing/{id}/`, `accounts/{id}/radar/`, `accounts/{id}/update-info/` |
| Avant rendez-vous | Analyse, besoins réels/anticipés, sources, édition de la synthèse et des solutions, actualisation | `pre-call/{id}/` |
| Parc installé | Consultation, ajout, retrait avec confirmation | `accounts/{id}/installed-offers/` |
| Comparateur | Secteurs, entreprises, référence sectorielle, critères et recommandations | `comparisons/sectors/`, `comparisons/` |
| Veille | Portefeuille, découvertes web, favoris, signaux forts/faibles, recherche, lecture, conversion d’une entreprise | `feed/` et actions associées |
| Rendez-vous | Création, format, date/heure, durée, contact, objectif et type de visite suggéré | `appointments/`, `appointments/purpose-suggestion/` |
| Préparation | Faits vérifiables, historique et questions à confirmer | `appointments/{id}/preparation/` |
| Visite | Enregistrement audio, transcription serveur, dictée et notes distinctes, statut commercial | `transcribe/`, `appointments/{id}/complete-vocal/` |
| Rapports | Historique, synthèse, qualification, objections, actions, email copiable et synchronisation CRM | `visits/`, `visits/{id}/`, `visits/{id}/sync-crm/` |
| Fiche technique | Consultation, régénération et export PDF par la feuille de partage native | `pre-call/{id}/technical-specs/` et `pdf/` |
| Paramètres | Photo par URL, disponibilité, thème clair/sombre/système et déconnexion | `accounts/me/` |

Les ressources du tableau sont relatives à `/api/kam/`, sauf `accounts/me/` qui utilise `/api/accounts/me/`.

## États et conservation des données

- Chargements par squelettes, erreurs avec action de reprise et états vides explicites.
- Aucune synthèse de réunion fictive générée côté mobile.
- Les brouillons sont isolés par serveur, utilisateur et rendez-vous/compte. La voix et les notes restent séparées jusqu’à la génération du rapport.
- Les enregistrements temporaires sont supprimés après transcription réussie ; un échec permet une nouvelle tentative.
- Les notes restent disponibles si la génération échoue. Après une réponse réseau ambiguë, l’interface demande de consulter l’historique avant une nouvelle tentative.

## Validation

`flutter test` couvre les contrats d’authentification, les identifiants, l’isolation des brouillons, les parcours compte/briefing et rendez-vous/préparation, les actions de veille, la génération depuis des notes et la conservation après erreur. Les tests de mise en page couvrent 320 et 768 pixels, les deux thèmes et du texte agrandi.

La compilation Android et les contrôles du dépôt complètent ces tests. La capture physique du microphone, les permissions et la feuille de partage nécessitent encore une vérification sur appareil ; les tests automatisés ne les certifient pas. Aucun test de cette intervention ne crée de rendez-vous ni de rapport dans une base distante.

Les endpoints de veille par compte et de lecture globale font partie des modifications backend déjà présentes dans le répertoire de travail. Leur disponibilité dépend du déploiement de ce backend.
