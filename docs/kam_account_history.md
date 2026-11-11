# Historique commercial du compte

Dans la fiche d’un compte, l’onglet **Historique** rassemble uniquement les actions passées.
La liste est chronologique, de la plus récente à la plus ancienne,
avec date, heure locale de l’appareil, auteur, interlocuteur et résultat lorsqu’ils sont renseignés.

## Données reprises automatiquement

- Rendez-vous et comptes rendus KAM liés au compte, y compris les visites antérieures.
- Décisions, engagements, incidents et jalons consignés dans la mémoire du compte.
- Actions commerciales réalisées et consignées depuis cet onglet.

Un rendez-vous associé à une action programmée n’apparaît qu’une fois. Lorsqu’un compte rendu
est enregistré pour ce rendez-vous, il remplace l’action dans la liste passée et permet de
consulter le rapport. Une préparation ou un brouillon d’email ne constitue pas un envoi effectué.
Les appels et échanges réalisés hors d’Onbora se consignent avec le bouton **+**.

## Consigner une action

Le bouton **+**, libellé « Consigner une action » pour les lecteurs d’écran, ouvre une modale :
type, intitulé, date et heure de réalisation, interlocuteur, contexte et résultat obligatoire.
Les types proposés sont relance, appel, email, proposition commerciale, visite en présentiel
et autre action. Une visite exige un lieu. La date ne peut pas être dans le futur.

La modale se ferme après enregistrement et l’historique s’actualise avec une confirmation.
Elle permet la fermeture par croix, Annuler ou Échap ; la fermeture est bloquée pendant
l’enregistrement. Le focus reste dans la modale puis revient au bouton **+**.
Le bouton de programmation, la section des actions à venir et le sous-titre descriptif
ont été retirés de cet écran. Les enregistrements antérieurs et les rendez-vous sont conservés.

## API et stockage

- `GET /api/kam/accounts/<account_id>/activity/` : `{history, planned}`.
- `POST /api/kam/accounts/<account_id>/activity/` : le formulaire transmet une action réalisée
  avec `status: COMPLETED` ; les anciennes capacités de programmation restent compatibles côté API.
- `PATCH /api/kam/accounts/<account_id>/actions/<action_id>/` : clôturer avec
  `status: COMPLETED|CANCELLED` et `result` obligatoire.
- Modèle `kam.AccountCommercialAction`, migration `0020_account_commercial_action`.
- Rôles KAM, responsable KAM et administrateur ; un KAM ne peut accéder qu’aux comptes
  qui lui sont actuellement assignés. Les actions antérieures restent visibles après passation.
- Services métier séparés des vues, transactions pour les écritures, relations préchargées
  et lecture sans mutation (5 requêtes SQL, indépendamment du nombre d’actions).

La consignation enregistre une action déclarée par le KAM ; elle ne passe aucun appel et n’envoie aucun email.
