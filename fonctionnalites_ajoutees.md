# INVENTAIRE DÉTAILLÉ DES FONCTIONNALITÉS AJOUTÉES DANS ONBORA
**Projet :** Onbora — Copilote d'Intelligence & d'Exécution Commerciale B2B (Télécom & Grands Comptes)  
**Version :** 2.0 (Post-Recadrage Opérationnel)  
**Date :** Septembre 2026  
**Auteur :** Lead Developer & Cloud Architect  

---

## 1. Contexte & Recadrage Produit

Suite aux retours directs d'équipes commerciales et managériales du secteur des télécommunications d'entreprise (opérateurs comme Orange Business), le projet Onbora a été recadré pour éliminer tout élément sans valeur ajoutée terrain.

### Éléments définitivement exclus du système :
* **[Exclu] Terme "Jumeau Numérique" :** Banni de l'ensemble du projet (codebase, bases de données, interfaces et documentation). Remplacé par **"Diagnostic d'Architecture Cible"** ou **"Cartographie IT"**.
* **[Exclu] Faisabilité Technique / Avant-Vente :** Retiré à 100% de la roadmap et des interfaces (commande expresse du lead : pas d'ingénierie réseau lourde dans l'outil d'action commerciale).
* **[Exclu] Modules de formation interne & quiz :** Supprimés. Les commerciaux seniors maîtrisent déjà leur métier ; ils ont besoin d'outils d'accélération, pas de cours théoriques.
* **[Exclu] Recommandateur d'offres évident :** Les commerciaux connaissent leur catalogue par cœur. L'outil n'affiche pas une liste passive d'offres génériques, mais des angles d'attaque et des phrases d'accroche spécifiques aux enjeux du prospect.

---

## 2. Pilier 1 : Pre-Call Intelligence (Préparation de RDV en 2 Minutes)

### Objectif métier
Résoudre le problème des 2 à 3 heures gaspillées par les Key Account Managers à chercher des données éparses sur le web et les réseaux avant un rendez-vous grand compte.

### Fonctionnalités implémentées :
1. **Fiche Prospect Consolidée :**
   * Synthèse immédiate du profil de l'entreprise : taille, nombre de sites, maturité digitale, secteur d'activité et contexte connu.
2. **Cartographie des Décideurs Clés :**
   * Détection des interlocuteurs à adresser lors de la négociation :
     * **DSI (Directeur des Systèmes d'Information) :** Profil technique, focus sur la disponibilité, le temps de rétablissement (GTR), la latence inter-sites.
     * **RSSI (Responsable Sécurité SI) :** Profil cyber et conformité, focus sur les attaques DDoS, le filtrage DNS et la continuité bancaire/industrielle.
     * **DAF / Direction des Opérations :** Profil ROI et rentabilité, focus sur les coûts d'interconnexion et les pertes financières liées aux pannes.
3. **Détection des Enjeux Métier :**
   * Identification automatique des points de douleur prioritaires (ex. saturation des liens provinciaux, migration cloud en cours, pannes récurrentes d'ERP).
4. **Angles de Pitch Sur-Mesure & Phrases d'Accroche :**
   * Recommandation ciblée des solutions du catalogue Orange (SD-WAN Managé, Fibre Dédiée, CyberSOC 24/7, Téléphonie Cloud Teams Phone).
   * Formulation de **phrases d'accroche directes** prêtes à être posées par le commercial en début d'entretien pour capter l'attention du décideur.
5. **Questions Critiques de Découverte :**
   * 5 questions percutantes pour faire exprimer les besoins cachés et mesurer l'impact financier des pannes chez le client.
6. **Règles d'Or de Négociation :**
   * Principes de posture commerciale B2B adaptés au profil de l'entreprise (ex. valoriser le SLA et la GTR 4h plutôt que de faire une guerre de prix sur le mégabit).

### Fichiers sources & Intégration :
* **Backend :** [`backend/kam/commercial_intelligence_service.py`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/kam/commercial_intelligence_service.py) (Méthode `generate_pre_call_briefing()`)
* **Modèle Django :** [`backend/kam/models.py`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/kam/models.py) (`PreCallBriefing`)
* **Frontend :** [`frontend/src/components/kam/KamPreCallView.tsx`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/components/kam/KamPreCallView.tsx)
* **Interface & Menu :** Espace Commercial KAM ([`frontend/src/app/kam/page.tsx`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/app/kam/page.tsx)) > Menu **`Pre-Call Briefing`** (vue par défaut du commercial).

---

## 3. Pilier 2 : Post-Call Execution & Synchronisation CRM Microsoft Dynamics 365

### Objectif métier
Éliminer la corvée administrative qui retarde de plusieurs jours l'envoi du compte-rendu au client et qui laisse le CRM d'entreprise incomplet ou non mis à jour.

### Fonctionnalités implémentées :
1. **Génération Instantanée de l'E-mail de Suivi Client :**
   * Dès la saisie des notes ou de la transcription de l'échange, l'outil rédige un e-mail commercial B2B institutionnel, structuré et personnalisé :
     * Remerciement professionnel.
     * Rappel des enjeux prioritaires abordés lors de la réunion.
     * Présentation de la démarche technique et des prochaines étapes.
     * Bouton « Copier l'e-mail » pour l'expédier en 1 clic via Outlook ou Gmail.
2. **Formatage Automatique du Payload CRM :**
   * Déduction de l'étape du deal (`deal_stage`), du pourcentage de probabilité de signature, du MRR estimé ($/mois), des produits identifiés et de la date de relance planifiée.
3. **Synchronisation 1-Clic vers Microsoft Dynamics 365 :**
   * Bouton **« Pousser vers Microsoft Dynamics 365 »** intégré sur chaque rapport de visite.
   * Indicateur d'état en temps réel :
     * `NON SYNCHRONISÉ` (Bouton d'action actif)
     * `SYNCHRONISATION...` (Animation de chargement)
     * `SYNCHRONISÉ DYNAMICS 365` (Badge vert de validation avec horodatage)
4. **Plan d'Actions & Tâches Immédiates :**
   * Génération de la liste des tâches avec échéances et niveaux de priorité (ex. demander une étude d'éligibilité réseau, envoyer le chiffrage avant vendredi, relancer mardi).

### Fichiers sources & Intégration :
* **Backend :** [`backend/kam/commercial_intelligence_service.py`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/kam/commercial_intelligence_service.py) (Méthode `generate_post_call_execution()`)
* **Endpoint REST :** `POST /api/kam/visits/<id>/sync-crm/` ([`backend/kam/commercial_intelligence_views.py`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/kam/commercial_intelligence_views.py))
* **Frontend :** [`frontend/src/components/kam/KamVisitsHistoryView.tsx`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/components/kam/KamVisitsHistoryView.tsx)
* **Interface & Menu :** Espace Commercial KAM ([`frontend/src/app/kam/page.tsx`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/app/kam/page.tsx)) > Menu **`Historique Visites`**.

---

## 4. Pilier 3 : B2B Lead Scoring & Priorisation IA

### Objectif métier
Permettre au commercial et au manager de trier instantanément les prospects chauds à fort potentiel de revenus (Tier 1) et d'arrêter de perdre du temps sur des comptes froids ou sans budget.

### Fonctionnalités implémentées :
1. **3 Cartes KPI de Vue d'Ensemble :**
   * **Tier 1 (Priorité Haute) :** Score supérieur à 75/100, probabilité élevée, budget identifié.
   * **Tier 2 (Potentiel Moyen) :** Score entre 50 et 74/100, besoin présent à mûrir.
   * **Tier 3 (Veille Commerciale) :** Score inférieur à 50/100, compte en observation.
2. **Tableau Dynamique avec Filtres Avancés :**
   * Barre de recherche par raison sociale ou secteur d'activité.
   * Filtre à bascule rapide par palier (*Tous*, *Tier 1*, *Tier 2*, *Tier 3*).
3. **Explicabilité du Score (Score Drivers) :**
   * L'IA ne donne pas un score "boîte noire" ; elle détaille précisément les critères d'attribution :
     * Ex. *« Budget validé sur trimestre en cours (+30 pts) »*
     * Ex. *« Douleur réseau critique impactant le CA (+25 pts) »*
     * Ex. *« Échéance contractuelle chez le concurrent < 60 jours (+20 pts) »*
     * Ex. *« Décisionnaire final DSI identifié et présent (+13 pts) »*
4. **Estimation de la Valeur Financière (MRR) :**
   * Calcul du revenu récurrent mensuel prévisionnel associé à l'opportunité.
5. **Recommandation Tactique & Pont Direct vers le Pre-Call :**
   * Indication de la prochaine étape optimale (ex. *« Proposer immédiatement un atelier de cadrage technique sous 48h »*).
   * Bouton direct **« Préparer le RDV »** qui ouvre instantanément la fiche Pre-Call Briefing du compte sélectionné.

### Fichiers sources & Intégration :
* **Backend :** [`backend/kam/commercial_intelligence_service.py`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/kam/commercial_intelligence_service.py) (Méthode `calculate_lead_scoring()`)
* **Endpoint REST :** `GET /api/kam/lead-scoring/` ([`backend/kam/commercial_intelligence_views.py`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/kam/commercial_intelligence_views.py))
* **Frontend :** [`frontend/src/components/kam/KamLeadScoringView.tsx`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/components/kam/KamLeadScoringView.tsx)
* **Interfaces & Menus :**
  * Espace Commercial KAM ([`frontend/src/app/kam/page.tsx`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/app/kam/page.tsx)) > Menu **`Scoring B2B`**
  * Console Manager KAM Office ([`frontend/src/app/kamoffice/page.tsx`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/app/kamoffice/page.tsx)) > Menu **`Scoring B2B`**

---

## 5. Pilier 4 : Radar Churn & Opportunités d'Upsell

### Objectif métier
Stopper les résiliations de contrats chez les clients existants vers la concurrence (Starlink, Vodacom, Airtel) et identifier des opportunités de vente additionnelle sur les comptes stables.

### Fonctionnalités implémentées :

#### A. Radar Churn (Protection du Parc Existant)
1. **Indicateurs de Risque :**
   * Détection des niveaux de risque : **Critique** (score churn > 70) et **Élevé** (score churn entre 45 et 69).
2. **Signaux Faibles Détectés :**
   * Identification automatique des indicateurs avant-coureurs de départ :
     * Mention d'une offre concurrente agressive reçue par le client.
     * Multiples tickets d'incidents non résolus dans les délais contractuels (SLA).
     * Départ du sponsor interne historique (changement de DSI).
3. **Plan de Rétention d'Urgence sous 48h :**
   * Recommandation d'action directe pour sauver le compte (ex. *« Organiser un déjeuner de compte avec le Directeur Commercial et proposer un audit gracieux de la QoS »*).
4. **Modèle d'E-mail de Crise Prêt à l'Envoi :**
   * Projet d'e-mail officiel généré pour rassurer le client et programmer l'intervention de direction.

#### B. Opportunités d'Upsell (Expansion de Revenus)
1. **Détection des Besoins d'Extension :**
   * Identification des solutions télécoms pertinentes pour équiper le compte (ex. CyberSOC Managé, Liaisons redondantes SD-WAN, Téléphonie Teams).
2. **Déclencheurs Métier (Triggers) :**
   * Ce qui motive l'opportunité (ex. *« Le client a mentionné en entretien une tentative de phishing sur son service comptabilité »*).
3. **Revenus Additionnels Estimés (MRR) :**
   * Estimation du gain mensuel potentiel (ex. *+1 200 $/mois*).
4. **Argumentaire Commercial d'Accroche :**
   * Angle de négociation suggéré pour amener le sujet lors du prochain échange.

### Fichiers sources & Intégration :
* **Backend :** [`backend/kam/commercial_intelligence_service.py`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/kam/commercial_intelligence_service.py) (Méthode `get_churn_and_upsell_radar()`)
* **Endpoint REST :** `GET /api/kam/churn-radar/` ([`backend/kam/commercial_intelligence_views.py`](file:///C:/Users/Salem/Documents/projet/Onbora/backend/kam/commercial_intelligence_views.py))
* **Frontend :** [`frontend/src/components/kam/KamChurnRadarView.tsx`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/components/kam/KamChurnRadarView.tsx)
* **Interfaces & Menus :**
  * Espace Commercial KAM ([`frontend/src/app/kam/page.tsx`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/app/kam/page.tsx)) > Menu **`Radar Churn & Upsell`**
  * Console Manager KAM Office ([`frontend/src/app/kamoffice/page.tsx`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/app/kamoffice/page.tsx)) > Menu **`Radar Churn & Upsell`**

---

## 6. Correctifs Techniques & Robustesse Système

### A. Sécurisation Cartographique WebGL2 (Anti-Crash)
* **Problème résolu :** Dans les environnements ou navigateurs n'ayant pas activé l'accélération matérielle WebGL2, la librairie cartographique vectorielle levait une exception `GPUInitializationError` fatale bloquant l'affichage de l'écran.
* **Correctif apporté :**
  * Ajout d'une vérification préventive du contexte WebGL2 avant instanciation.
  * Encadrement complet par `try / catch` dans [`frontend/src/components/supervisor/SupervisorTerritoryMap.tsx`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/components/supervisor/SupervisorTerritoryMap.tsx) et [`frontend/src/components/admin/AdminPlaqueMapOnly.tsx`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/components/admin/AdminPlaqueMapOnly.tsx).
  * Affichage d'une vue de secours fonctionnelle (Fallback UI) sous forme de grille interactive de plaques avec recherche, permettant d'affecter les commerciaux et d'ouvrir les détails sans interruption.

### B. Conformité Charte Graphique Apple (60-30-10)
* **Palette stricte :** 60% Blanc/Noir charbon (`#F6F5F2` / `#242124`), 30% Zinc/Gris structuré (`#2D2A2D` / `#FFFFFF`), 10% Bleu Cobalt (`#4F6CE8`) et indicateurs sémantiques discrets (`#10B981` vert actif, `#EF4444` rouge critique).
* **0 Couleur interdite :** Aucune utilisation de `#F97316`, orange, jaune, ambre ou violet.
* **0 Emoji Unicode :** Remplacement de tous les caractères emojis par des icônes vectorielles SVG épurées issues de [`Icons.tsx`](file:///C:/Users/Salem/Documents/projet/Onbora/frontend/src/components/shared/Icons.tsx).

---

## 7. Tableau Récapitulatif par Interface

| Fonctionnalité | Espace Commercial KAM (`/kam`) | Console Manager KAM Office (`/kamoffice`) | Backoffice Terrain (`/backoffice`) | Cockpit Super Admin (`/admin`) |
|---|---|---|---|---|
| **Pre-Call Briefing (2 min)** | Oui (Par défaut) | Non | Non | Non |
| **Post-Call CRM Sync (Dynamics 365)** | Oui (Historique Visites) | Non | Non | Non |
| **B2B Lead Scoring** | Oui (Portefeuille KAM) | Oui (Vue d'Équipe) | Non | Non |
| **Radar Churn & Upsell** | Oui (Comptes KAM) | Oui (Portefeuille Global) | Non | Non |
| **Attribution des Comptes Clés** | Consultation | Gestion & Réattribution | Non | Non |
| **Supervision Plaques & Carte** | Non | Non | Oui (Mode Sécurisé WebGL2) | Oui (Mode Sécurisé WebGL2) |
| **Seuils Financiers de Segmentation** | Non | Non | Non | Oui (Configuration Système) |
