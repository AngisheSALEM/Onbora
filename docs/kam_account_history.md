# Historique commercial du compte

Dans la fiche d’un compte, l’onglet **Historique** rassemble les actions à venir et les
actions passées. La liste passée est chronologique, de la plus récente à la plus ancienne,
avec date, heure locale de l’appareil, auteur, interlocuteur et résultat lorsqu’ils sont renseignés.

## Données reprises automatiquement

- Rendez-vous et comptes rendus KAM liés au compte, y compris les visites antérieures.
- Décisions, engagements, incidents et jalons consignés dans la mémoire du compte.
- Actions commerciales enregistrées ou programmées depuis cet onglet.

Un rendez-vous associé à une action programmée n’apparaît qu’une fois. Lorsqu’un compte rendu
est enregistré pour ce rendez-vous, il remplace l’action dans la liste passée et permet de
consulter le rapport. Une préparation ou un brouillon d’email ne constitue pas un envoi effectué.
Les appels et échanges réalisés hors d’Onbora se consignent avec **Consigner une action**.

## Programmer et clôturer

**Programmer une action** ouvre un formulaire : type, intitulé, date et heure futures,
interlocuteur et notes. Les types proposés sont relance, appel, email, proposition commerciale,
visite en présentiel et autre action. Une visite exige un lieu et crée également un rendez-vous
physique dans l’agenda. Les autres types restent des actions de suivi du compte.

**Marquer comme réalisée** demande un résultat. **Annuler l’action** demande un motif.
La clôture conserve son auteur, son horodatage et la date prévue d’origine ; elle ne supprime
pas l’action. Les statuts du rendez-vous lié sont répercutés dans l’historique. Une visite peut
aussi être clôturée par son compte rendu via le lien présent dans les actions à venir.

## API et stockage

- `GET /api/kam/accounts/<account_id>/activity/` : `{history, planned}`.
- `POST /api/kam/accounts/<account_id>/activity/` : consigner ou programmer une action.
- `PATCH /api/kam/accounts/<account_id>/actions/<action_id>/` : clôturer avec
  `status: COMPLETED|CANCELLED` et `result` obligatoire.
- Modèle `kam.AccountCommercialAction`, migration `0020_account_commercial_action`.
- Rôles KAM, responsable KAM et administrateur ; un KAM ne peut accéder qu’aux comptes
  qui lui sont actuellement assignés. Les actions antérieures restent visibles après passation.
- Services métier séparés des vues, transactions pour les écritures, relations préchargées
  et lecture sans mutation (5 requêtes SQL, indépendamment du nombre d’actions).

Les appels ne sont pas passés et les emails ne sont pas envoyés par la programmation.
