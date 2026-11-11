# Import automatique Dynamics 365

Périmètre : une instance Onbora dédiée à un MSP. Aucune écriture n'est effectuée
dans Dynamics par le module d'import. Les exports existants restent séparés.

## Activation et exécution

1. Administration → Paramètres → Microsoft Dynamics 365 : enregistrer les identifiants.
2. Tester la connexion réelle. L'import automatique est activé par défaut, à une
   fréquence de 15 minutes ; l'administrateur peut désactiver ou modifier cette fréquence.
3. Le worker programme le premier import après validation. « Importer maintenant »
   permet également un import manuel, avec suivi persistant du statut et des compteurs.

Appliquer `python manage.py migrate` avant démarrage. Le point d'entrée Render
`python start_services.py` supervise maintenant aussi `python manage.py run_dynamics_imports`.
En développement avec `runserver`, démarrer ce worker séparément. `--once` traite
au plus une page, utile pour une exécution par un ordonnanceur externe.

Le worker traite des pages OData de 200 lignes, suit les `@odata.nextLink` du même
environnement et sauvegarde un checkpoint après chaque page. Un bail empêche deux
workers de traiter simultanément le même import ; après un arrêt brutal, le bail
expire sous 20 minutes. Les écritures et le checkpoint sont atomiques par page.
Un échec laisse les pages déjà validées disponibles. La relance est idempotente.
L'actualisation périodique relit l'ensemble des collections reconnues.

## Correspondances

Les métadonnées `EntityDefinitions` et `Attributes` sont relues à chaque import.
Les noms standards sont prioritaires. Les champs personnalisés sont reconnus par
un suffixe figurant dans la liste d'alias du mapper, uniquement sans ambiguïté.
Un champ inconnu n'est pas deviné. Les noms logiques détectés et les champs
manquants sont consultables dans l'administration.

| Source | Données | Destination |
| --- | --- | --- |
| account | Identifiant, nom, secteur, adresse, site web, effectif, sites, revenu et devise, identifiants légaux, propriétaire | Enterprise et AccountProjection |
| contact | Identifiant, compte parent, nom, fonction, email, téléphone | RelationshipCoverage |
| msdyn_customerasset ou table de parc personnalisée reconnue | Identifiant, compte parent, nom, statut, débit, quantités, coût/devise, dates et fournisseur disponibles | EnterpriseInstalledOffer |
| opportunity | Nom, compte, statut, montant/devise, clôture prévue et description | DynamicsImportedRecord et historique CRM de la fiche compte |
| appointment | Sujet, compte, statut, dates et description | DynamicsImportedRecord et historique CRM de la fiche compte |

Une table personnalisée du parc peut être indiquée explicitement dans les réglages
avancés puis reconnue par le même mapper. Sa relation vers `account` est vérifiée
dans les métadonnées. Les produits du catalogue `product`, les devis et les lignes
de commande ne constituent jamais automatiquement un parc installé.

Le propriétaire CRM n'est associé à un KAM Onbora que si son email correspond
exactement à un seul utilisateur KAM actif déjà existant et si la fiche n'a pas de
KAM affecté. Aucun utilisateur ni droit d'accès n'est créé. Les adresses des
responsables ne sont lues que pour les propriétaires présents sur la page importée.

## Intégrité et limites

- L'unicité combine l'environnement CRM, la table et le GUID distant. Aucun
  rapprochement approximatif par nom d'entreprise n'est effectué.
- Les notes locales des contacts, les produits saisis manuellement et les affectations
  KAM existantes sont conservés. Un compte ayant des modifications CRM locales en
  attente est ignoré avec avertissement pour éviter leur écrasement.
- Les métriques absentes restent nulles. Les montants autres qu'USD restent dans
  l'enregistrement CRM avec leur devise ; ils ne remplissent pas les champs USD historiques.
- Un statut de contrat inconnu reste `UNKNOWN`. Un actif CRM inactif devient `INACTIVE`,
  sans conclure à une résiliation. Seuls les produits explicitement actifs alimentent
  les métriques du comparatif. Un rattachement sectoriel n'est automatique que si un
  seul pilier correspond au nom commercial.
- La disparition d'une ligne d'une collection ne déclenche aucune suppression locale :
  une restriction de droits CRM peut également rendre une ligne invisible. Les états
  explicitement renvoyés par Dynamics actualisent le statut des produits.
- Les opportunités et rendez-vous importés sont consultables dans l'historique CRM ;
  ils ne déclenchent pas de création automatique de visite ou d'envoi commercial.
- Les droits de lecture CRM doivent couvrir les tables concernées, les métadonnées,
  les devises et, pour l'affectation, les propriétaires. Une table facultative inaccessible
  est signalée. Aucun import simulé n'est présenté comme une réussite réelle.

## Références Microsoft

- Métadonnées : https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-metadata-web-api
- Pagination : https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query/page-results
- Parc : https://learn.microsoft.com/en-us/dynamics365/developer/reference/entities/msdyn_customerasset

## Vérification

`python manage.py test accounts.test_dynamics_import accounts.test_dynamics_connection kam.test_installed_sector kam.test_comparison_unknown kam.test_epic4_dynamics_outbox --settings=onbora.test_settings --noinput`

Les tests utilisent des métadonnées et pages distantes factices et une base SQLite
isolée. La validation sur un environnement Dynamics réel nécessite ses identifiants.
