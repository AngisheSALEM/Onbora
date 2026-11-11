# Import des entreprises et des leads Onbora Analysis

`PUT /api/crm/seed/records/{external_id}/` (alias `/api/v1/crm/seed/records/{external_id}/`).

Authentification `Authorization: Token <jeton>` d’un compte `ADMIN` ou superutilisateur actif. Les autres rôles sont refusés. Le script émetteur est `scripts/seed_crm.py` dans le dépôt Onbora Analysis ; configurer `CRM_SEED_AUTH_SCHEME=Token` et `CRM_SEED_URL` sur cette route, barre finale comprise.

Appliquer la migration `sales.0026_seedimportrecord` avant le premier import.

Le corps JSON porte `external_id`, `kind` (`company` ou `lead`), `source` (`fictional` ou `onbora`), `is_fictitious`, `name` et les données du profil. Les leads exigent `onbora.instance`, `onbora.source_ref`, `onbora.company_id` et une identité `onbora-` suivie du SHA-256 de `instance + NUL + source_ref`. Leurs contacts restent vides. L’identifiant du corps doit correspondre à l’URL.

La réponse est `201` à la création, `200` à la mise à jour : `{"external_id":"...","enterprise_id":123,"created":true}`. Les entrées invalides répondent `400`, l’absence de jeton `401`, un rôle insuffisant `403` et une collision de provenance ou de compte CRM `409`.

L’upsert est atomique et s’appuie sur une contrainte unique et un verrou de ligne `SeedImportRecord`. La relance retrouve la même entreprise, y compris après changement du nom ou de l’UUID source. Les noms longs sont limités à 100 caractères dans le modèle `Enterprise`, mais restent complets dans le payload d’import. Le payload conserve les identifiants légaux, les sources et les marqueurs internes de provenance.

Une entreprise crée également un `CrmAccountRecord` de provenance `ONBORA_SEED`. Un lead ne crée pas de fiche CRM confirmée. Aucun rapprochement approximatif par nom n’est effectué. Une collision avec une référence CRM existante est soumise à résolution explicite.

Les champs du profil importé (nom, secteur, localisation, adresse, site) sont actualisés. Les affectations, contacts corrigés, conversions, montants commerciaux et notes de suivi sont préservés. Les estimations du payload ne sont pas recopiées comme chiffre d’affaires certifié. Les champs inconnus de parc, d’effectif et de qualification restent vides à la création. Aucune collecte, analyse payante, activation de service ou suppression n’est déclenchée.

Tests : `python manage.py test sales.test_seed_import --settings=onbora.test_settings --noinput`.
