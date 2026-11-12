# Contexte commercial et inférence

Le briefing et le document vectoriel lisent un contexte commun : fiche Enterprise, payload du registre,
données maîtresses CRM, projection Dynamics, produits installés et enregistrements CRM associés.
Les observations publiques restent soumises au contrôle d’identité et aux références de preuve v2.
Les informations déclarées ne deviennent pas automatiquement des preuves publiques.

Le nom ou le secteur seuls ne déterminent aucun besoin. Les hypothèses affichées doivent porter
un statut `HYPOTHESIS` ou `TO_VALIDATE` et des `fact_ids` présents dans les faits attribuables.
Les suggestions Cloud, Fibre et GTR auparavant ajoutées par défaut sont supprimées, y compris à la lecture
des anciens briefings en cache. Les besoins confirmés issus des comptes rendus terrain restent distincts.

Une lecture affiche les faits disponibles sans appel fournisseur. L’actualisation explicite sollicite Gemini
sur ces faits et le catalogue : les identifiants de faits/offres retournés doivent appartenir au contexte transmis.
Le texte des faits et des offres est repris des sources et du catalogue, pas inventé à partir de prose du modèle.
`ai_inference` conserve le statut et le modèle effectif. Les indisponibilités restent visibles dans ce statut.
Une seule alternative est autorisée sur 404 ou surcharge 503, dans le délai partagé de vingt secondes ;
aucun nouvel essai sur quota, authentification ou timeout.

`python manage.py check_core_ai --live` vérifie une réponse JSON réelle sans afficher de secret.
`python manage.py run_vector_ingest --rebuild` reconstruit les documents à partir de la base actuelle.
Les mises à jour suivantes sont persistées automatiquement dans `AIVectorDocument` par les imports et
les recherches appliquées. Les processus de recherche chargent les mises à jour partagées sans redémarrage.
L’espace lexical 768D est unique pour documents et requêtes, versionné et normalisé pour les accents ;
il ne mélange pas des vecteurs provenant de modèles différents et ne prétend pas constituer une preuve métier.

Le superviseur backend lance les workers IA, recherche d’entreprises et import Dynamics.
L’API Analysis et son worker se lancent depuis leur dépôt avec `scripts/start_local_console.py --mode live --port 8001`.
Les clés restent dans les environnements des services. Une recherche sans fait attribuable n’est pas une preuve
d’absence d’activité : ses limites sont conservées et aucun besoin ou parc installé n’en est déduit.
