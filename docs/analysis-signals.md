# Historique des signaux Onbora Analysis

La page KAM `/kam/analysis` conserve et analyse les faits attribuables reçus de Research API v2. `/kam/sectors` redirige vers cette page. La vue initiale d’équipement sectoriel est remplacée.

## Conservation et intégration

Le worker appelle `retain_analysis_signals` dans la transaction qui finalise une recherche. Les faits suivent la même validation d’identité, de références, de sources accessibles et de contradictions que le briefing existant. Aucun résumé libre, besoin supposé ou score de démonstration n’est transformé en preuve.

- `AnalysisSignalRun` conserve chaque recherche terminée, même sans faits exploitables, et son secteur à l’import. Le lien au job peut disparaître sans supprimer cette observation.
- `AnalysisSignal` identifie un fait distinct pour une entreprise. Son empreinte utilise le champ, le type, la valeur normalisée et la date de validité reçue, indépendamment des identifiants de faits, sources et jobs. Un rafraîchissement identique ne crée pas de nouveau signal. Sans date ni valeur permettant de distinguer deux événements identiques, ils restent consolidés.
- `AnalysisSignalObservation` conserve une version sourcée par recherche : fait original, attribution, statut de l’identité et références des sources. Les nouvelles recherches ne remplacent pas les anciennes versions. Une absence dans une recherche ultérieure n’est pas interprétée comme une rétractation.
- `AnalysisSignalReview` et `AnalysisSignalReviewEvent` conservent le suivi personnel du KAM et ses modifications. La première action engagée exige une note et garde sa date ; la clôture ne la supprime pas. Les recherches n’écrasent jamais ce suivi.

Les types reflètent les champs réels du contrat : activités, implantations, contacts, projets, actualités, identité, offres et présentation. Le niveau de preuve indique « sourcé », « recoupé » ou « identité à confirmer ». Ce ne sont pas des probabilités statistiques. La priorité commerciale commence à « à qualifier » et est renseignée par le KAM.

## Dates et indicateurs

Les séries comptent la première recherche ayant observé chaque fait distinct, selon les journées de `Africa/Kinshasa`. La date d’un fait (`valid_at`) et la date d’import restent séparées et peuvent être inconnues. La même entreprise ne compte qu’une fois dans l’indicateur d’entreprises concernées.

La période filtre les nouvelles détections, pas les redétections de faits déjà connus. Les versions disponibles avant la fin de la période déterminent le niveau de preuve du graphique ; une recherche ultérieure ne modifie pas rétrospectivement ce niveau. Le suivi et la priorité restent explicitement actuels et personnels. « Actions engagées » compte les signaux détectés dans la période avec une action consignée par le KAM, à une date quelconque ; cet indicateur n’est pas un nombre de ventes.

La couverture de veille compte les entreprises distinctes analysées sur la période et le secteur, même sans nouveau signal. Elle reste indépendante des filtres de type, recherche textuelle et suivi. Les volumes ne constituent pas un classement de l’activité économique des secteurs.

## API

- `GET /api/kam/analysis-signals/` : indicateurs, série quotidienne complète, types, secteurs, matrice priorité/preuve, suivi et liste paginée (20 résultats).
- Filtres : `days=7|30|90|365` ou `start`/`end` (366 jours maximum), `sector`, `category`, `confidence`, `priority`, `state`, `q` et `page`.
- Les paramètres `focus_sector`, `focus_category`, `focus_confidence`, `focus_priority`, `focus_state`, `focus_day` filtrent uniquement la liste après un clic dans un graphique, en conservant le périmètre de comparaison des graphiques.
- `GET /api/kam/analysis-signals/<uuid>/` : fait, sources, historique des observations paginé (`history_page`, 10 résultats) et les 20 dernières modifications personnelles du suivi. Toutes les modifications sont conservées.
- `PATCH /api/kam/analysis-signals/<uuid>/` : `state`, `priority`, `note` (2 000 caractères maximum). Les autres comptes restent inaccessibles, y compris par identifiant direct.

Les accès utilisent `visible_enterprises`, y compris les affectations de portefeuille actives. Les rôles autorisés sont ceux du desk KAM ; le suivi de deux utilisateurs autorisés reste séparé. Les lectures ne déclenchent aucune recherche externe et ne créent aucune donnée.

## Installation et reprise

La migration `kam.0019` crée les tables et contraintes. Le script de déploiement `backend/build.sh` applique les migrations puis exécute `python manage.py backfill_analysis_signals`. Cette commande reprend les jobs v2 terminés, appliqués et validables déjà conservés, sans réseau et sans modifier les champs CRM. Elle est idempotente. Les données de démonstration et anciens exports non attribuables ne sont pas importés comme signaux réels.

Lors de la mise en service locale du 5 novembre 2026, la migration a été appliquée et l’API a répondu HTTP 200. La base ne contenait aucun job v2 terminé à reprendre ; l’interface reste donc vide jusqu’aux prochaines recherches terminées.

Le plan de validation est décrit dans `unit_tests_plan.md`.
