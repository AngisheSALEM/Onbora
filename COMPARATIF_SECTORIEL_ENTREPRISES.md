# Module de Comparaison Sectorielle des Entreprises (KAM) — Onbora

Ce document récapitule l'implémentation complète du **comparateur d'entreprises du même secteur d'activité**, conçu pour outiller les Key Account Managers (KAM) d'Orange Business lors de leurs négociations et rendez-vous stratégiques C-Level.

---

## 1. Objectif Métier & Valeur Ajoutée pour le KAM

Lorsqu'un KAM prépare un rendez-vous ou analyse un compte client, il a besoin d'éléments de comparaison concrets avec les acteurs pairs du même secteur géographique ou d'activité en RDC (secteurs banques, mines, télécoms, distribution, etc.) :
- **Identifier les forces (« Où elle se démarque »)** : Valoriser ce que l'entreprise fait mieux que ses pairs (débit, redondance, certification).
- **Déceler les lacunes & SPOF (« Ce qui lui manque »)** : Détecter les vulnérabilités opérationnelles (absence de lien de secours, backup cloud non externalisé, supervision non 24/7, pas de SOC managé).
- **Proposer la solution Orange Business adaptée** : Mapper chaque lacune avec l'offre catalogue adéquate (*Fibre Dédiée Procezo, SD-WAN Managé, CyberSOC, Sauvegarde Cloud souverain RDC*).
- **Fournir un pitch de négociation prêt à l'emploi** : Disposer d'un argumentaire chiffré et percutant (« *Copier le pitch* ») pour interpeller le DSI ou le Directeur Général.

---

## 2. Parcours Utilisateur & Ergonomie (Conformité Minimaliste)

Conformément à la demande de simplification ergonomique et au respect du style Procezo / Image 3 :
1. **Suppression de l'onglet latéral dédié** : Le comparateur n'encombre plus la barre de navigation principale (`KamSidebar`).
2. **Accès contextuel direct depuis la fiche entreprise** :
   - Dans le tableau des comptes (`KamAccountsTable`), un bouton épuré `Comparer` renvoie directement à la vue briefing avec l'onglet comparatif pré-sélectionné.
   - Dans la fiche de préparation d'appel (`KamPreCallView`), un onglet minimaliste souligné **`Comparatif sectoriel`** ainsi qu'un bouton d'action contextuel permettent d'ouvrir la comparaison sans quitter le dossier client.
3. **Sélecteur de pairs fluide** : Possibilité de comparer le compte sélectionné soit avec un pair spécifique de son secteur, soit avec la moyenne sectorielle (*Benchmark*).

---

## 3. Architecture Technique Hybride : Core AI & Script Python Ultra-Optimisé

Le système résout le défi de la dynamique du catalogue sans sacrifier les performances grâce à une séparation des responsabilités stricte :

```
[Catalogue Solutions Orange / MSP (catalog.json)]
                       │
                       ▼
             ┌──────────────────┐
             │     CORE AI      │  <── Exécuté UNIQUEMENT lors d'une mise à jour catalogue
             │  (apps.ai_core)  │      Définit : Poids sectoriels, Pénalités, Ratios postes/débit
             └─────────┬────────┘
                       │
                       ▼
             [sector_scoring_rules.json] (Registre de règles compilé & versionné)
                       │
                       ▼
             ┌─────────────────────────┐
             │  MOTEUR PYTHON OPTIMISÉ │  <── Exécuté en temps réel (< 1 ms, pur Python déterministe)
             │   (apps.kam.services)   │      Applique : Base 100, Ratios réels, Détection manques
             └─────────┬───────────────┘
                       │
                       ▼
             [Interface KAM Instantanée : Radar, Scores, Atouts & Pitchs]
```

### A. Le Core AI Compiler (`apps/ai_core/services/sector_rules_compiler.py`)
- Analyse le catalogue officiel actif (`backend/resources/catalog_ai/versions/v1/catalog.json`).
- Extrait dynamiquement pour chaque secteur d'activité :
  - **Le panier de solutions indispensables (`ideal_basket`)** : offres requises avec criticité (*CRITICAL, HIGH, MEDIUM*) et pénalités associées.
  - **Les règles de dimensionnement (`sizing_rules`)** : seuil de débit minimal par poste/machine (ex: 0,30 Mbps/poste en Banque, 0,20 en Mines, 0,15 en Retail), seuils multi-sites.
  - **Les pondérations radar (`radar_weights`)** : calibrées selon la criticité sectorielle (ex: sécurité et SLA prédominants en finance).
  - **L'offre catalogue exacte et le pitch d'argumentaire associé**.
- Commande d'actualisation : `py backend/manage.py compile_sector_rules`.

### B. Le Moteur Python Déterministe (`apps/kam/services/enterprise_comparison_service.py`)
- Charge les règles compilées en mémoire ($O(1)$ sub-milliseconde).
- Calcule le score avec une formule mathématique pure et déterministe :
  - Score de base : **100 points**.
  - Déduction des pénalités du panier sectoriel pour toute capacité absente des offres souscrites.
  - Déduction de sous-dimensionnement si le ratio réel $\frac{\text{Débit}}{\text{Postes}}$ est inférieur au seuil recommandé.
  - Déduction pour manque de résilience (incidents récurrents ou absence de lien de secours).
- Requêtes optimisées `select_related("crm_record")` et `prefetch_related("installed_offers")` garantissant **zéro requête N+1** et un temps de réponse < 1 ms.

---

## 4. Respect Strict de la Charte Graphique & Anti-Dette

Le développement s'est conformé aux directives strictes :
- **Palette 60-30-10 Onbora** :
  - Fond dominant sombre/clair : `#242124` / `#F6F5F2`
  - Conteneurs et cartes : `#2F2C30` / `#ECEAE5` / blanc
  - Accent unique : `#4F6CE8` (bleu signature Onbora)
- **Zéro Couleur Interdite** :
  - Aucun usage de vert émeraude, ambre, rose ou orange.
  - Remplacement des pastilles colorées par des badges monochromes zinc et des accents `#4F6CE8`.
- **Suppression des Icônes au Début des Textes** :
  - Suppression systématique des icônes décoratives placées immédiatement avant les libellés de boutons et d'onglets (`Comparer`, `Fiche technique`, `Copier le pitch`, etc.) pour préserver l'élégance typographique épurée.
- **Zéro Émojis Unicode** : Aucune présence d'émojis dans les interfaces.

---

## 5. Validation & Tests

- **Tests Unitaires Backend** : 1 060 tests exécutés avec succès (`Ran 1060 tests ... OK`).
- **Typage TypeScript** : Compilation `tsc --noEmit` sans aucune erreur (exit code 0).
- **Hook 1 (Charte Graphique & Anti-Émojis)** : `py scripts/verify_design_compliance.py --all` validé à 100% sur l'ensemble des 319 fichiers audités.
- **Hook 2 (Architecture & Dettes Techniques)** : `py scripts/verify_technical_debt.py --all` validé avec succès sans aucune anomalie.
