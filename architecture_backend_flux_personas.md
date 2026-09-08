# ARCHITECTURE BACKEND & FLUX DE DONNÉES ENTRE PERSONAS
**Projet :** Onbora — Plateforme d'Intelligence & d'Exécution Commerciale B2B  
**Version :** 2.0  
**Date :** Septembre 2026  
**Auteur :** Lead Developer & Cloud Architect  

---

## 1. Vision d'Ensemble de l'Architecture

Onbora est articulé autour d'une architecture modulaire Django (Backend REST API) et Next.js (Frontend réactif).  
Le système sépare rigoureusement la vente commerciale en **deux filières distinctes** coordonnées par un **moteur central de segmentation financière** :

1. **La Filière Vente Complexe B2B (Grands Comptes & PME) :**
   * Cycle de vente : 3 à 9 mois.
   * Interlocuteurs : Comités de direction, DSI, RSSI, Directeurs Financiers.
   * Outils clés : Pre-Call Intelligence en 2 min, débriefing de visite, e-mails B2B, synchronisation CRM Microsoft Dynamics 365, Lead Scoring prédictif et Radar Churn/Upsell.
   * Personas impliqués : `ADMIN` -> `KAM_MANAGER` -> `KAM`.

2. **La Filière Prospection Terrain de Masse (TPE & Commerces de Proximité) :**
   * Cycle de vente : Court (1 à 7 jours), porte-à-porte, passage physique.
   * Interlocuteurs : Gérants de boutiques, artisans, professions libérales.
   * Outils clés : Cartographie des plaques géographiques, auto-dispatching par zone, fiches de passage mobiles, points d'incentive et challenges terrain.
   * Personas impliqués : `ADMIN` -> `SUPERVISOR` -> `SALESPERSON`.

```
                        +----------------------------+
                        |     SUPER ADMIN (ADMIN)    |
                        |   Gouvernance & Seuils     |
                        +--------------+-------------+
                                       |
              +------------------------+------------------------+
              | (Segmentation CA >= Seuil PME / GC)             | (Segmentation CA < Seuil PME)
              v                                                 v
+----------------------------+                    +----------------------------+
|  HEAD OF B2B (KAM_MANAGER) |                    |  SUPERVISEUR (SUPERVISOR)  |
|  Console KAM Office        |                    |  Backoffice Terrain        |
+--------------+-------------+                    +--------------+-------------+
               | (Affectation compte clé)                        | (Attribution de plaque)
               v                                                 v
+----------------------------+                    +----------------------------+
|   COMMERCIAL GRAND COMPTE  |                    |      COMMERCIAL TERRAIN    |
|   Key Account Manager (KAM)|                    |         (SALESPERSON)      |
+--------------+-------------+                    +--------------+-------------+
               |                                                 |
               | (Pre-Call, Visite, CRM Dynamics 365)            | (Passage terrain, Audit, Forfait)
               v                                                 v
+----------------------------+                    +----------------------------+
|      GRAND COMPTE / PME    |                    |     TPE / COMMERCE LOCAL   |
|   (DSI, RSSI, DAF, DG)     |                    |      (Gérant de boutique)  |
+----------------------------+                    +----------------------------+
```

---

## 2. Le Moteur Central de Segmentation Financière

Le pivot de tout le système réside dans le modèle Django [`SegmentationConfig`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/accounts/models.py) administré par le Super Admin.

### Configuration des Seuils :
* `tpe_max_revenue` : Seuil haut du segment TPE (ex. 2 400 $ / an).
* `pme_max_revenue` : Seuil haut du segment PME (ex. 30 000 $ à 1 000 000 $ / an).
* Au-delà de `pme_max_revenue` : Segment Grand Compte (> 1 000 000 $ / an).

### Logique d'Aiguillage Automatique (Backend) :
Lorsqu'une entreprise (`Enterprise`) est créée (par import CRM, scraping ou enrichissement) :

```python
# Extrait conceptuel de l'aiguillage automatique backend
def segment_and_route_enterprise(enterprise, config):
    ca = enterprise.annual_revenue or 0

    if ca <= config.tpe_max_revenue:
        enterprise.segment = 'TPE_INFORMEL'
        enterprise.assigned_entity = 'BACK_OFFICE' # Prise en charge par le Superviseur Terrain
    elif ca <= config.pme_max_revenue:
        enterprise.segment = 'PME'
        enterprise.assigned_entity = 'KAM_OFFICE'   # Prise en charge par le KAM Office
    else:
        enterprise.segment = 'GRAND_COMPTE'
        enterprise.assigned_entity = 'KAM_OFFICE'   # Prise en charge par le KAM Office

    enterprise.save()
```

---

## 3. Flux Détaillé : De l'Admin vers le KAM (Filière Grands Comptes)

Ce flux décrit le cycle de vie d'un compte stratégique depuis sa configuration par l'Administrateur jusqu'à la signature et la synchronisation CRM.

```
[ADMIN]
   |
   | 1. Définit seuils de segmentation (SegmentationConfig)
   | 2. Valide catalogue solutions B2B (catalog.json)
   | 3. Importe ou supervise les comptes entreprises (Enterprise)
   v
[KAM_MANAGER (KAM Office)]
   |
   | 4. Consulte le portefeuille B2B (/api/kam/overview-accounts/)
   | 5. Analyse le Scoring IA (/api/kam/lead-scoring/) : filtre Tier 1
   | 6. Affecte le compte à un KAM (/api/kam/accounts/<id>/assign-kam/)
   | 7. Émet des directives stratégiques (/api/kam/directives/create/)
   v
[KAM (Commercial Terrain Grand Compte)]
   |
   | 8. Reçoit le compte assigné sur son interface (/kam)
   | 9. Déclenche le Pre-Call Briefing (/api/kam/pre-call/<id>/generate/)
   |    -> IA extrait décideurs (DSI/RSSI/DAF), enjeux et 5 questions
   | 10. Mène l'entretien chez le client
   | 11. Saisit le débriefing vocal ou textuel (/api/kam/visits/submit-report/)
   |    -> IA génère l'e-mail de suivi client B2B
   | 12. Clique sur "Pousser vers Microsoft Dynamics 365"
   |    -> API POST /api/kam/visits/<id>/sync-crm/
   v
[REMONTÉE AUTOMATIQUE VERS LE MANAGEMENT]
   |
   | 13. Détection des signaux de churn (/api/kam/churn-radar/)
   |     -> Alerte 48h visible par le KAM et le KAM Manager
   | 14. CA converti agrégé dans le tableau de bord Admin (/admin)
```

### Détail des Échanges Techniques :

#### A. Affectation du Compte Clé
* **Acteur :** `KAM_MANAGER` sur `/kamoffice`
* **Requête :** `POST /api/kam/accounts/<account_id>/assign-kam/`
* **Payload :** `{"kam_id": 14}`
* **Effet Backend :**  
  `Enterprise.assigned_kam = User.objects.get(id=14)`  
  Le compte n'est plus dans le vivier "En attente d'affectation" et apparaît instantanément sur l'espace personnel du KAM.

#### B. Génération du Pre-Call Briefing
* **Acteur :** `KAM` sur `/kam` (Menu *Pre-Call Briefing*)
* **Requête :** `POST /api/kam/pre-call/<account_id>/generate/`
* **Traitement Backend :**  
  La classe [`CommercialIntelligenceService.generate_pre_call_briefing()`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/kam/commercial_intelligence_service.py#L32) prend en entrée l'entreprise, son secteur et le catalogue Orange Business.  
  Elle génère et persiste une instance de [`PreCallBriefing`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/kam/models.py#L320) avec :
  * `key_decision_makers` (DSI, RSSI, DAF et leurs préoccupations)
  * `detected_business_challenges` (interconnexion, pannes, sécurité)
  * `custom_pitch_angles` (offres adaptées et phrases d'accroche)
  * `critical_discovery_questions` (5 questions de qualification)
  * `golden_rules` (posture de négociation)

#### C. Post-Call & Synchronisation Microsoft Dynamics 365
* **Acteur :** `KAM` sur `/kam` (Menu *Historique Visites*)
* **Requête :** `POST /api/kam/visits/<report_id>/sync-crm/`
* **Traitement Backend :**  
  Le service [`CommercialIntelligenceService.generate_post_call_execution()`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/kam/commercial_intelligence_service.py#L132) formate l'e-mail de suivi et prépare le JSON CRM :
  * `deal_stage` (ex. `QUALIFIED_OPPORTUNITY`)
  * `probability` (ex. `75%`)
  * `estimated_mrr_euro` (ex. `4 500 $`)
  * `identified_products` (ex. `["SD-WAN Managé", "Fibre Dédiée"]`)
  * `next_step` et `next_followup_date`
  * Mise à jour du modèle : `crm_sync_status = 'SYNCED'`, `synced_at = timezone.now()`.

#### D. Radar Churn & Détection Préventive
* **Acteurs :** `KAM` et `KAM_MANAGER`
* **Requête :** `GET /api/kam/churn-radar/`
* **Traitement Backend :**  
  Le service [`CommercialIntelligenceService.get_churn_and_upsell_radar()`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/kam/commercial_intelligence_service.py#L312) analyse les derniers rapports de visite et notes de compte.  
  Si des signaux faibles de mécontentement (pannes non résolues, offre Starlink ou Vodacom reçue) sont détectés, il calcule un `churn_score` et produit un **Plan de rétention d'urgence sous 48h** accessible au manager et au commercial.

---

## 4. Flux Détaillé : De l'Admin vers le Commercial Terrain (Filière Salesperson)

Ce flux décrit le cycle de la prospection terrain de proximité (TPE et petits commerces) piloté géographiquement.

```
[ADMIN]
   |
   | 1. Crée les comptes Superviseurs (SUPERVISOR)
   | 2. Définit les règles et seuils TPE (ex. CA < 2 400 $)
   | 3. Visualise les indicateurs de conversion terrain consolidés
   v
[SUPERVISOR (Backoffice Terrain)]
   |
   | 4. Ouvre la console Backoffice (/backoffice)
   | 5. Découpe le territoire en Plaques (/api/sales/plaques/draw-zone/)
   |    -> Crée des zones géographiques polygonales ou radiales
   | 6. Affecte les Commerciaux Terrain (/api/sales/plaques/<id>/assign/)
   | 7. Lance l'Auto-Dispatching (/api/sales/plaques/<id>/auto-dispatch/)
   |    -> Les entreprises TPE de la zone sont attachées à la plaque
   | 8. Envoie des Directives Terrain (/api/sales/directives/)
   v
[SALESPERSON (Commercial Mobile Terrain)]
   |
   | 9. Ouvre son application mobile ou son espace (/sales)
   | 10. Récupère la liste des prospects de sa plaque géolocalisée
   | 11. Réalise la visite en face-à-face (audit connectivité)
   | 12. Soumet le rapport de visite (/api/sales/reports/submit/)
   |     -> Coordonnées du gérant, opérateur actuel, photo
   | 13. Si vente conclue : conversion enregistrée (is_converted = True)
   v
[REMONTÉE AUTOMATIQUE VERS LE SUPERVISEUR & L'ADMIN]
   |
   | 14. Flux de passage affiché en direct sur le Backoffice (/api/sales/supervisor/feed/)
   | 15. Calcul automatique des points d'incentive/challenges du commercial
   | 16. Chiffre d'affaires agrégé dans l'onglet "Comptes Convertis" du Super Admin
```

### Détail des Échanges Techniques :

#### A. Création & Découpage des Plaques Géographiques
* **Acteur :** `SUPERVISOR` sur `/backoffice` (Menu *Carte du Territoire* ou *Plaques*)
* **Requête :** `POST /api/sales/plaques/draw-zone/`
* **Payload :**
  ```json
  {
    "code": "PLQ-GOMBE-01",
    "name": "Plaque Centre des Affaires Gombe",
    "city": "Kinshasa",
    "center_lat": -4.3032,
    "center_lng": 15.3056,
    "radius_km": 1.5,
    "salesperson_ids": [5, 8]
  }
  ```
* **Effet Backend :**  
  Persistance du modèle [`Plaque`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/sales/models.py). Les commerciaux spécifiés ont cette plaque ajoutée dans leur champ `assigned_plaques`.

#### B. Auto-Dispatching des Entreprises
* **Acteur :** `SUPERVISOR` sur `/backoffice`
* **Requête :** `POST /api/sales/plaques/<plaque_id>/auto-dispatch/`
* **Traitement Backend :**  
  L'algorithme parcourt toutes les entreprises de la ville/commune sans affectation dont le segment est `TPE_INFORMEL`.  
  Il calcule la distance géodésique (ou vérifie l'inclusion dans le polygone GeoJSON de la plaque).  
  Les entreprises éligibles voient leur champ `plaque` mis à jour vers l'identifiant de la plaque.

#### C. Remontée de Visite Terrain & Calcul d'Incentives
* **Acteur :** `SALESPERSON` sur `/sales`
* **Requête :** `POST /api/sales/reports/submit/`
* **Traitement Backend :**  
  Création d'une instance [`VisitReport`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/sales/models.py).  
  Mise à jour de `Enterprise.is_visited = True` et `Enterprise.last_visited_at = timezone.now()`.  
  Calcul des points d'incentive du commercial (attribution de points selon qu'il s'agit d'un premier contact, d'un audit complet ou d'une conversion de forfait).

---

## 5. Matrice des Rôles, Permissions & Modèles de Données

| Entité / Donnée | `ADMIN` | `KAM_MANAGER` | `KAM` | `SUPERVISOR` | `SALESPERSON` |
|---|---|---|---|---|---|
| **Règles de Segmentation** | Lecture / Écriture | Lecture | Aucun | Lecture | Aucun |
| **Comptes Grands Comptes** | Supervision globale | Gestion & Réattribution | Consultation & Action (Portefeuille propre) | Aucun | Aucun |
| **Pre-Call Briefing** | Lecture | Consultation | Génération & Exécution | Aucun | Aucun |
| **Sync CRM Dynamics 365**| Audit global | Consultation | Déclenchement 1-clic | Aucun | Aucun |
| **Radar Churn & Upsell** | Audit macro | Supervision équipe | Traitement des alertes | Aucun | Aucun |
| **Plaques Géographiques** | Supervision globale | Aucun | Aucun | Création & Dispatching | Lecture (Plaques assignées) |
| **Comptes TPE / Informel**| Supervision globale | Aucun | Aucun | Pilotage & Répartition | Visites & Formulaires |
| **Points d'Incentive** | Consultation | Aucun | Aucun | Validation | Cumul personnel |

### Modèles Django Impliqués par Domaine :

1. **Domaine Authentification & Gouvernance (`accounts/models.py`) :**
   * [`User`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/accounts/models.py) : Modèle utilisateur unifié avec rôles (`ADMIN`, `KAM_MANAGER`, `KAM`, `SUPERVISOR`, `SALESPERSON`).
   * [`SegmentationConfig`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/accounts/models.py) : Seuils de segmentation financière TPE/PME/GC.

2. **Domaine Grands Comptes & Intelligence Commerciale (`kam/models.py`) :**
   * [`PreCallBriefing`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/kam/models.py) : Fiches d'attaque pré-RDV, décideurs, questions et argumentaires.
   * [`KamVisitReport`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/kam/models.py) : Rapports de visite B2B, e-mails générés, statuts et payloads de synchronisation Microsoft Dynamics 365 (`crm_sync_status`, `crm_payload`).
   * [`StrategicDirective`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/kam/models.py) : Consignes de la direction commerciale vers les KAMs.

3. **Domaine Prospection Terrain & Plaques (`sales/models.py`) :**
   * [`Enterprise`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/sales/models.py) : Base unifiée des entreprises avec segment (`GRAND_COMPTE`, `PME`, `TPE_INFORMEL`), localisation, CA et statut de conversion.
   * [`Plaque`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/sales/models.py) : Zones géographiques de prospection terrain avec coordonnées et périmètre.
   * [`VisitReport`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/sales/models.py) : Formulaires de passage terrain avec géolocalisation et photos.
   * [`Directive`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/sales/models.py) : Instructions du superviseur vers les agents mobiles.

---

## 6. Synthèse Technique

Cette architecture garantit :
1. **L'isolation des responsabilités :** Un commercial terrain ne voit jamais les fiches confidentielles des Grands Comptes, et un KAM n'est pas pollué par les milliers de boutiques de rue de la prospection informelle.
2. **Une gouvernance centralisée :** Le Super Admin et les Directeurs ont une visibilité à 360° sur les deux canaux de chiffre d'affaires.
3. **Une intégration native avec l'écosystème entreprise :** Grâce à l'interfaçage transparent avec Microsoft Dynamics 365 et Outlook pour les équipes de vente complexe.
