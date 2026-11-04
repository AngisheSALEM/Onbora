# Intégration Research API v2 dans Onbora

Le backend appelle le service autonome Research API par HTTP v2. Core AI reste dans
Onbora. Le navigateur et Flutter ne reçoivent aucune clé technique ou clé SerpApi.

## Démarrage local

Depuis la racine Onbora, après installation des dépendances du backend et du service :

```powershell
backend\venv\Scripts\python.exe scripts\setup_research_connection.py --research-dir "C:\Users\Salem\Documents\projet\analysis\onbora-analysis-api"
backend\venv\Scripts\python.exe backend\manage.py migrate
```

Le configurateur utilise le Python `.venv/Scripts/python.exe` du service. Il crée
une identité technique dans l'espace `onbora`, enregistre son secret uniquement
dans `backend/.env` et conserve une clé déjà configurée sans la remplacer.
Les autres variables existantes sont conservées. Redémarrer le backend et son
worker après configuration. Ne pas versionner les fichiers `.env`.

Trois processus sont nécessaires :

1. Le backend Onbora habituel, par exemple `backend\venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000`.
2. L'API et son worker : depuis le dossier Research API, `.venv\Scripts\python.exe scripts\start_local_console.py --mode corpus --port 8001`.
3. Le suivi côté Onbora : `backend\venv\Scripts\python.exe backend\manage.py run_company_research --loop`.

`corpus` contient uniquement des entreprises fictives. Une entreprise réelle peut
donner `no_information` dans ce mode. Pour les tests réels, injecter la clé SerpApi
dans le `.env` du service et remplacer `--mode corpus` par `--mode live`. Le lanceur
API démarre ses deux processus avec la même configuration. La console est un
outil local v1 ; Onbora utilise bien les routes v2.

## Parcours applicatif

- `GET /api/kam/pre-call/{enterprise_id}/` : lire le brief enregistré ou une fiche
  issue des seules données connues. Aucun appel fournisseur.
- `POST` sur cette même route : demander une actualisation et recevoir `202` avec
  un `research_job`. Le bouton d'actualisation Web et le client mobile suivent
  cette recherche. Les corrections manuelles plus récentes sont conservées.
- `POST /api/ai/research/enterprises/{enterprise_id}/` : création générique,
  `operation` parmi `research`, `enrich`, `refresh` ; `baseline_id` désigne un UUID
  local de recherche terminée appartenant au demandeur et à cette entreprise.
- `GET /api/ai/research/jobs/{uuid}/` : état local, résultat métier et code d'erreur.
  L'accès exige le propriétaire de la recherche et un accès actuel au compte.

Les clés d'idempotence HTTP sont facultatives côté Onbora : le serveur en crée une
si nécessaire. Le worker utilise toujours l'UUID local comme clé distante stable,
y compris après une réponse POST perdue. Une même clé locale avec un autre contenu
répond `409`. Au plus trois recherches actives par utilisateur. Un tick effectue
un seul POST ou GET ; il respecte `Retry-After`, avec délai réseau borné, bail de
60 secondes, reprise après expiration et échéance globale de cinq minutes.

La migration additive `ai_core.0006_companyresearchjob` stocke la relation compte,
demandeur, demande, identifiant distant, réponse, bail et état d'application.
Le worker applique atomiquement les observations. Les données CRM et contacts ne
sont pas écrasés : les propositions d'enrichissement restent dans les faits sourcés.
Les publications du fil d'actualité proviennent exclusivement de faits `news`
étayés, avec source ; aucune croissance ou opportunité n'est déduite par défaut.

## Contrat et confiance

`backend/resources/contracts/research-v2.schema.json` est une copie du contrat
public du service, sans dépendance Python vers le dossier voisin. Mettre à jour
la copie et les tests si le service modifie son contrat.

Les `fact_ids` du profil se résolvent vers `facts`, puis `evidence_ids` vers les
extraits et `source_id` vers les sources. Les références rompues, une autre cible
et une mauvaise version sont refusées. Les faits disputés et identités ambiguës
ne sont pas promus dans la synthèse. `provider_research` reste non vérifié et
n'alimente ni les coordonnées ni les affirmations du brief. Un traitement terminé
peut être partiel, ambigu ou sans information ; la fiche précédente est conservée
quand aucune information étayée ne permet de l'actualiser.

Le repli historique générant RCCM, preuves, SLA et opportunités arbitraires est
retiré de ce parcours. L'ancien chargement global par GET/SQLite/JSON est remplacé
par la consultation des observations v2 enregistrées par Onbora.

## Vérification

```powershell
backend\venv\Scripts\python.exe backend\manage.py test apps.ai_core.test_company_research --settings=onbora.test_settings --noinput
backend\venv\Scripts\python.exe scripts\smoke_research_integration.py --research-dir "C:\Users\Salem\Documents\projet\analysis\onbora-analysis-api"
```

Le smoke test utilise deux bases isolées, un serveur HTTP et un worker Research
séparé. Il vérifie le parcours depuis le POST Onbora jusqu'au brief sourcé et le
rejeu idempotent, sans appel fournisseur. Il ne modifie pas les bases applicatives
ou les clés existantes. Les processus temporaires sont arrêtés à la fin.

Avant un déploiement partagé : configurer HTTPS, les secrets, les processus
supervisés, le stockage persistant du service et la propagation des règles de
conservation/suppression aux copies Onbora. Le mode local ne constitue pas une
validation de pertinence, de délais ou de coût des recherches réelles.
