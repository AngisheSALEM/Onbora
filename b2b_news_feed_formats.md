# Contrats d'Échange JSON — Fil d'Actualité B2B & Veille Web KAM

Ce document détaille l'intégralité des formats et structures JSON attendus par l'API REST d'Onbora pour la fonctionnalité de **Fil d'actualité B2B & Veille Web Sourcing** dédiée aux Key Account Managers (KAM).

---

## 1. Vue d'Ensemble des Endpoints

| Méthode | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/kam/feed/` | Liste des signaux filtrables avec compteurs agrégés |
| `POST` | `/api/kam/feed/<uuid:id>/read/` | Marquer un signal comme lu / non lu |
| `POST` | `/api/kam/feed/<uuid:id>/save/` | Mettre en favori ou retirer des favoris |
| `POST` | `/api/kam/feed/<uuid:id>/convert/` | Convertir un nouveau compte web en compte portefeuille B2B |
| `POST` | `/api/kam/feed/refresh/` | Déclencher une réactualisation de la veille web |

---

## 2. Contrat JSON : Consultation du Fil (`GET /api/kam/feed/`)

### Paramètres de Requête (Query Params)
* `type` : `'ALL'` (par défaut) \| `'PORTFOLIO'` (comptes actifs) \| `'WEB_DISCOVERY'` (nouveaux comptes repérés sur le net)
* `category` : `'ALL'` \| `'EXPANSION'` \| `'MANAGEMENT'` \| `'TECH_PROJECT'` \| `'INCIDENT'` \| `'FINANCE'` \| `'NEW_ACCOUNT'`
* `search` : Terme de recherche textuelle (titre, nom entreprise, ville, angle commercial)
* `saved` : `'true'` \| `'false'` (filtrer sur les favoris)

### Schéma de Réponse JSON

```json
{
  "count": 10,
  "counters": {
    "all": 10,
    "portfolio": 5,
    "web_discovery": 5,
    "unread": 8,
    "saved": 2
  },
  "results": [
    {
      "id": "e67e3ec2-9f69-4da4-8b63-0d331908bf99",
      "enterprise": 4485,
      "enterprise_name": "Rawbank RDC",
      "enterprise_sector": "Banque & Finance",
      "enterprise_location": "Kinshasa (Gombe)",
      "enterprise_assigned_kam": "kam2",
      "is_web_discovery": false,
      "discovered_company_name": "",
      "discovered_website": "",
      "discovered_sector": "",
      "discovered_location": "",
      "discovered_size": "",
      "discovered_signals": [],
      "title": "Ouverture de 4 nouvelles agences et déploiement de guichets intelligents au Lualaba",
      "summary": "Le groupe bancaire accélère son extension dans la ceinture minière de Kolwezi avec l'inauguration de 4 agences modernes nécessitant une redondance télécoms et une connexion temps réel vers le Datacenter central de Kinshasa.",
      "source_name": "Presse Économique RDC",
      "source_url": "https://zoom-eco.net",
      "category": "EXPANSION",
      "category_display": "Croissance & Expansion",
      "priority": "HIGH",
      "priority_display": "Haute priorité (Action sous 24h)",
      "commercial_angle": "Besoin immédiat en liaisons louées Fibre Dédiée 100 Mbps avec bascule automatique SD-WAN 4G/Satellite sur les 4 nouveaux sites de Kolwezi.",
      "recommended_action": "Contacter la Direction des Opérations Réseau pour proposer une offre groupée Fibre Pro + SD-WAN Managé.",
      "recommended_offer": "Fibre Dédiée Sécurisée & SD-WAN Inter-sites",
      "is_read": false,
      "is_saved": true,
      "is_converted_to_portfolio": false,
      "published_at": "2026-10-19T14:30:00Z",
      "created_at": "2026-10-19T14:35:12Z",
      "updated_at": "2026-10-19T15:10:04Z"
    }
  ]
}
```

---

## 3. Contrat JSON : Nouveau Compte Découvert sur le Net (`is_web_discovery: true`)

Lorsqu'une opportunité est détectée sur le web (immatriculation RCCM, levée de fonds, recrutement de masse, nouveau site web), le champ `enterprise` est initialement `null` et les métadonnées de sourcing sont renseignées.

### Exemple de Payload JSON

```json
{
  "id": "7ac19532-15f2-45e3-a4f6-8bbec6ca4de3",
  "enterprise": null,
  "enterprise_name": null,
  "enterprise_sector": null,
  "enterprise_location": null,
  "enterprise_assigned_kam": null,
  "is_web_discovery": true,
  "discovered_company_name": "Katanga Mining Logix SARL",
  "discovered_website": "https://katangalogix.cd",
  "discovered_sector": "Mines & Logistique Lourde",
  "discovered_location": "Kolwezi (Lualaba)",
  "discovered_size": "50-100 salariés",
  "discovered_signals": [
    "Nouveau site web déployé",
    "Immatriculation RCCM récente (CD/KZI/2026)",
    "Offres d'emploi pour 12 ingénieurs logistiques"
  ],
  "title": "Nouveau prestataire logistique minier immatriculé à Kolwezi avec flotte de 40 camions",
  "summary": "Détection d'une nouvelle entité logistique spécialisée dans le transport de concentrés de cuivre et cobalt entre Kolwezi et le corridor de Durban. La société vient de publier son portail d'appels d'offres en ligne.",
  "source_name": "Veille Registre RCCM & Web Sourcing",
  "source_url": "https://guichetunique.cd",
  "category": "NEW_ACCOUNT",
  "category_display": "Nouveau Compte Détecté",
  "priority": "HIGH",
  "priority_display": "Haute priorité (Action sous 24h)",
  "commercial_angle": "Nouveau compte B2B à fort potentiel non encore prospecté. Flotte connectée par télématique GPS et besoin critique de connectivité internet par satellite/4G sur les routes de transit.",
  "recommended_action": "Prendre contact immédiatement avec le Directeur Général pour proposer notre pack Flotte Connectée IoT + Fibre Bureau.",
  "recommended_offer": "Pack IoT Télématique Flotte & Fibre Pro",
  "is_read": false,
  "is_saved": false,
  "is_converted_to_portfolio": false,
  "published_at": "2026-10-19T16:00:00Z",
  "created_at": "2026-10-19T16:05:00Z",
  "updated_at": "2026-10-19T16:05:00Z"
}
```

---

## 4. Contrat JSON : Conversion en Compte Portefeuille (`POST /api/kam/feed/<id>/convert/`)

Permet au KAM d'ajouter instantanément un nouveau compte repéré sur le web à son portefeuille CRM officiel sans saisie manuelle.

### Requête (Body optionnel)
`POST /api/kam/feed/7ac19532-15f2-45e3-a4f6-8bbec6ca4de3/convert/`
Headers : `Authorization: Bearer <token>`

### Réponse JSON Succès (`200 OK`)

```json
{
  "enterprise_id": 4501,
  "enterprise_name": "Katanga Mining Logix SARL",
  "message": "Nouveau compte Katanga Mining Logix SARL créé et ajouté avec succès à votre portefeuille B2B."
}
```

*Effet côté backend :*
* Création de l'entité `Enterprise` avec `segment="PME"`, `assigned_entity="KAM_OFFICE"`, `assigned_kam=request.user`.
* Mise à jour de l'item de veille : `is_converted_to_portfolio = true` et `enterprise = 4501`.

---

## 5. Contrat JSON : Statuts de Lecture & Favoris

### A. Marquer comme Lu / Non Lu (`POST /api/kam/feed/<id>/read/`)

**Payload de Requête :**
```json
{
  "is_read": true
}
```

**Payload de Réponse :**
```json
{
  "id": "e67e3ec2-9f69-4da4-8b63-0d331908bf99",
  "is_read": true,
  "updated_at": "2026-10-19T17:15:30Z"
}
```

### B. Basculer Favori (`POST /api/kam/feed/<id>/save/`)

**Payload de Réponse :**
```json
{
  "id": "e67e3ec2-9f69-4da4-8b63-0d331908bf99",
  "is_saved": true,
  "updated_at": "2026-10-19T17:15:42Z"
}
```

---

## 6. Contrat JSON : Déclenchement de Veille (`POST /api/kam/feed/refresh/`)

Lance une synchronisation et réévaluation des signaux du web pour le secteur B2B.

**Payload de Réponse Succès (`200 OK`) :**
```json
{
  "message": "10 nouveaux signaux de veille B2B synchronisés avec succès.",
  "count": 10
}
```

---

## 7. Dictionnaire des Énumérations (Enums)

### Catégories (`category`)
| Clé | Libellé | Usage |
| :--- | :--- | :--- |
| `EXPANSION` | Croissance & Expansion | Ouverture d'agences, nouveaux sites, recrutement d'ampleur |
| `MANAGEMENT` | Gouvernance & DSI | Changement de DSI, nouveau DG, réorganisation IT |
| `TECH_PROJECT` | Projet Tech & Télécoms | Migration Cloud, projet ERP/SAP, refonte infrastructure |
| `INCIDENT` | Incident & Insatisfaction Concurrent | Panne réseau chez l'opérateur concurrent, bad buzz |
| `FINANCE` | Financement & Levée de Fonds | Levée de fonds fintech/startup, prêt d'investissement, subvention |
| `NEW_ACCOUNT` | Nouveau Compte Détecté | Nouvelle entreprise B2B repérée sur le net (Web Sourcing) |

### Niveaux d'Urgence (`priority`)
| Clé | Libellé | Seuil de Réactivité |
| :--- | :--- | :--- |
| `HIGH` | Haute priorité | Contact recommandé sous 24h |
| `MEDIUM` | Moyenne priorité | Opportunité active à intégrer au plan de tournée |
| `NORMAL` | Veille normale | Suivi régulier et capitalisation documentaire |
