# Registre et recherches d'une sauvegarde Analysis

Le backend lit une sauvegarde SQLite autonome en lecture seule. Il ne charge ni
le code ni les identifiants serveur contenus dans l'archive du fournisseur.

```powershell
backend/venv/Scripts/python.exe backend/manage.py import_analysis_snapshot --db "C:/path/analysis.sqlite3"
backend/venv/Scripts/python.exe backend/manage.py import_analysis_snapshot --db "C:/path/analysis.sqlite3" --apply
```

Sauvegarder la base Onbora avant `--apply`. Le premier appel est un audit sans
écriture. L'import sélectionne les entreprises déjà importées, la sélection
`showcase` et les entreprises rattachées à des recherches publiques terminées.
Le reste du registre demeure consultable dans le service Analysis.

- Rapprochement par `source_ref` ; conservation des identifiants Onbora et des
  affectations, relations commerciales, rendez-vous et éditions humaines.
- Actualisation des champs du registre et conservation du payload complet.
  Un champ modifié depuis le précédent import est conservé.
- Import des observations `public-v1` et `public-ai-v1` uniquement, lorsque le nom
  cible correspond au nom ou au sigle de la fiche liée. Les identités ambiguës,
  affirmations fournisseur non vérifiées et références non résolues ne deviennent
  pas des faits. Les fragments de navigation ne sont pas des informations métier.
- Fusion des faits distincts de plusieurs recherches avec références séparées ;
  conservation des observations existantes. Une empreinte rend la relance sans
  changement idempotente. Aucune création de parc installé ni d'historique CRM.
- Les faits et l'activité alimentent la synthèse et les documents de recherche
  vectorielle. Les questions et pistes conditionnelles sont distinctes des besoins
  confirmés. Les pistes proviennent du catalogue local, dans une catégorie adaptée
  à l'activité ; elles ne précisent aucun dimensionnement client supposé.
- La comparaison ne désigne pas de jumeau lorsque effectifs, sites et chiffre
  d'affaires manquent. Un parc non renseigné reste non évalué.

La base complète Analysis peut être restaurée dans un nouveau fichier privé,
migrée avec son propre service et sélectionnée via `ONBORA_DB_PATH`. Conserver
l'original et l'ancienne base ; renouveler les identifiants d'intégration côté
serveur sans les inclure dans les exports ou les commits.

Validation locale du 13 novembre 2026 : registre de 16 938 entreprises, 168 profils
sélectionnés (159 enrichis, 9 ajoutés), dont 11 avec des faits publics exploitables.
Exemples : COPAK (activité d'exportation, Beni, Nord-Kivu, site web), ADDH (activité,
implantation déclarée, programmes et intervention dans les 26 provinces).
