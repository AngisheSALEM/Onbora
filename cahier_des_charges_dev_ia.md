# CAHIER DES CHARGES TECHNIQUE — MOTEUR CORE AI (V2)
**Destinataire :** Développeur IA / NLP Engineer  
**Projet :** Onbora — Copilote d'Intelligence & d'Exécution Commerciale B2B  
**Version :** 2.0 (Post-Recadrage Stratégique)  
**Date :** Septembre 2026  

---

## 1. Contexte & Changement de Paradigme

Le produit Onbora a été recadré suite aux retours terrain chez les opérateurs télécoms (comme Orange Business).  
**Ce que nous n'implémentons plus :**
* [Exclu] Pas de "jumeau numérique" (terme banni : nous faisons du diagnostic d'architecture IT).
* [Exclu] Pas de résumés passifs génériques (un résumé brut sans action immédiate n'a aucune valeur).
* [Exclu] Pas de modules de formation interne / quiz.
* [Exclu] Pas de recommandateur d'offres évident (les commerciaux seniors connaissent déjà leur catalogue par cœur).

**Notre mission pour le Core AI :**
Délivrer une IA d'action qui résout les 4 points de blocage majeurs qui font perdre entre 126 et 270 M€/an aux opérateurs :
1. **Pre-Call Intelligence :** Préparer un RDV complexe en 2 minutes chrono avec argumentaire ciblé et cartographie des décideurs.
2. **Post-Call Execution :** Générer immédiatement un e-mail commercial prêt à l'envoi et les données structurées pour le CRM.
3. **Lead Scoring B2B :** Qualifier et prioriser les prospects chauds selon les signaux faibles et l'adéquation télécom.
4. **Radar Churn & Upsell :** Détecter proactivement les clients en risque de départ ou les opportunités d'expansion.

---

## 2. Les 4 Moteurs IA à Livrer (Spécifications Détaillées)

---

### MOTEUR 1 : Pre-Call Intelligence Engine
> **Objectif :** Prendre le nom d'un prospect/client et son secteur, et générer en moins de 5 secondes un dossier de préparation d'attaque pour le commercial avant son rendez-vous.

#### A. Entrées requises (Input JSON) :
```json
{
  "company_name": "RAWBANK RDC",
  "sector": "Banque & Finance",
  "locations_count": 45,
  "website_url": "https://www.rawbank.com",
  "known_context": "Banque commerciale majeure en RDC, forte expansion d'agences régionales, digitalisation des flux bancaires.",
  "orange_catalog_context": [
    "Fibre Sécurisée Pro (100M-1G, GTR 4h)",
    "SD-WAN Managé & Multi-liens (Fibre + VSAT + Backup 4G/5G)",
    "CyberSOC Managé & Firewall Fortinet haute disponibilité",
    "Téléphonie Cloud Microsoft Teams Phone Operator Connect"
  ]
}
```

#### B. Sortie attendue (Output JSON strict) :
```json
{
  "company_overview": {
    "summary": "Leader bancaire avec fort enjeu de continuité de service sur ses agences réparties sur le territoire.",
    "estimated_employees": "1500+",
    "digital_maturity": "HIGH"
  },
  "key_decision_makers": [
    {
      "role": "DSI (Directeur des Systèmes d'Information)",
      "profile_type": "Technique & Disponibilité",
      "concerns": "Latence des transactions, pannes de liens sur les agences isolées, conformité bancaire."
    },
    {
      "role": "RSSI (Responsable Sécurité SI)",
      "profile_type": "Sécurité & Audit",
      "concerns": "Attaques DDoS sur l'e-banking, conformité PCI-DSS, fuite de données."
    },
    {
      "role": "Directeur des Opérations / DAF",
      "profile_type": "ROI & Coûts",
      "concerns": "Coût des pannes réseau, budget d'interconnexion télécom."
    }
  ],
  "detected_business_challenges": [
    "Interconnexion stable des agences provinciales (Lubumbashi, Goma, Matadi)",
    "Bascule des sauvegardes quotidiennes vers un Cloud sécurisé sans saturer la bande passante",
    "Migration vers la téléphonie collaborative unifiée"
  ],
  "custom_pitch_angles": [
    {
      "target_offer": "SD-WAN Managé Multi-liens",
      "why_relevant": "Permet d'agréger leur lien fibre avec un backup satellite et de prioriser les flux de caisse bancaires en cas de coupure.",
      "hook_sentence": "Monsieur le DSI, comment vos agences de province gèrent-elles les coupures pendant les heures d'ouverture de guichet ?"
    },
    {
      "target_offer": "CyberSOC Managé 24/7",
      "why_relevant": "Répond directement aux exigences réglementaires de la Banque Centrale sur la cyber-résilience.",
      "hook_sentence": "Avez-vous une équipe dédiée 24/7 pour monitorer les tentatives d'intrusion sur vos passerelles de paiement ?"
    }
  ],
  "critical_discovery_questions": [
    "Combien d'heures de coupure réseau avez-vous subies sur vos agences le mois dernier et quel a été l'impact en agence ?",
    "Quelle est votre stratégie de secours si votre lien principal à Lubumbashi tombe un jour de paie ?",
    "Vos équipes utilisent-elles déjà Microsoft 365, et comment gérez-vous vos appels téléphoniques fixes aujourd'hui ?"
  ]
}
```

---

### MOTEUR 2 : Post-Call Execution Engine
> **Objectif :** Prendre la transcription brute ou les notes vocales d'une visite et produire immédiatement un e-mail commercial personnalisé prêt à envoyer au client, ainsi que les données pour mettre à jour le CRM (Dynamics 365 / Salesforce).

#### A. Entrées requises (Input JSON) :
```json
{
  "kam_name": "Marc Lemaire",
  "client_name": "M. Jean-Paul Kasongo",
  "client_role": "DSI",
  "company_name": "Tenke Fungurume Mining",
  "meeting_transcript": "On a discuté avec le DSI Jean-Paul. Ils ouvrent une nouvelle zone d'extraction le mois prochain avec 80 personnes. Actuellement ils ont un lien VSAT qui coupe dès qu'il y a un orage, ça bloque l'ERP SAP. Ils veulent une solution redondante urgente. Il m'a demandé de lui envoyer un chiffrage pour du SD-WAN et un lien dédié avant vendredi. Le budget est validé pour Q4. Il faut que je le relance mardi prochain.",
  "orange_catalog_context": ["Fibre Dédiée", "SD-WAN", "Backup Satellite O3b", "Support Platinum"]
}
```

#### B. Sortie attendue (Output JSON strict) :
```json
{
  "client_followup_email": {
    "subject": "Suite à notre échange — Sécurisation et connectivité de votre nouvelle zone d'extraction",
    "body": "Bonjour Monsieur Kasongo,\n\nJe vous remercie pour le temps accordé ce matin lors de notre échange concernant l'extension de vos activités minières.\n\nComme évoqué, l'enjeu prioritaire est de garantir la disponibilité continue de votre ERP SAP sur la nouvelle zone d'extraction (80 collaborateurs), sans interruption liée aux aléas météorologiques sur vos liens actuels.\n\nNous finalisons actuellement une proposition technique associant notre offre SD-WAN Managé à un double lien sécurisé (Fibre dédiée + Backup haute résilience) afin d'assurer un basculement automatique et transparent de vos flux critiques.\n\nJe vous ferai parvenir notre chiffrage détaillé d'ici ce vendredi comme convenu. Je me permettrai de revenir vers vous mardi prochain pour caler un court point de cadrage avec notre ingénieur d'affaires.\n\nRestant à votre entière disposition,\n\nBien cordialement,\nMarc Lemaire — Orange Business"
  },
  "crm_payload": {
    "deal_stage": "QUALIFIED_OPPORTUNITY",
    "probability": 75,
    "estimated_mrr_euro": 4500,
    "identified_products": ["SD-WAN", "Fibre Dédiée", "Support Platinum"],
    "next_step": "Envoyer chiffrage SD-WAN + lien sécurisé avant vendredi",
    "next_followup_date": "2026-09-15",
    "key_contacts": [
      {
        "name": "Jean-Paul Kasongo",
        "role": "DSI",
        "influence": "DECISION_MAKER"
      }
    ]
  },
  "action_tasks": [
    {
      "task": "Demander l'étude de faisabilité et éligibilité réseau à l'avant-vente pour la nouvelle zone",
      "deadline": "2026-09-11",
      "priority": "HIGH"
    },
    {
      "task": "Envoyer la proposition commerciale chiffrée à M. Kasongo",
      "deadline": "2026-09-12",
      "priority": "HIGH"
    },
    {
      "task": "Relance téléphonique de M. Kasongo",
      "deadline": "2026-09-15",
      "priority": "MEDIUM"
    }
  ]
}
```

---

### MOTEUR 3 : B2B Lead Scoring Engine
> **Objectif :** Évaluer et classer automatiquement un prospect dans le pipeline commercial selon sa probabilité de signature et sa valeur stratégique pour les offres Orange.

#### Sortie attendue (Output JSON strict) :
```json
{
  "lead_score": 88,
  "scoring_tier": "TIER_1_PRIORITY",
  "conversion_probability": "HIGH",
  "score_drivers": [
    {
      "factor": "Budget validé sur trimestre en cours",
      "impact": "+30 pts",
      "type": "POSITIVE"
    },
    {
      "factor": "Douleur réseau critique avec impact direct sur le chiffre d'affaires",
      "impact": "+25 pts",
      "type": "POSITIVE"
    },
    {
      "factor": "Échéance contractuelle chez le concurrent dans moins de 60 jours",
      "impact": "+20 pts",
      "type": "POSITIVE"
    },
    {
      "factor": "Décisionnaire final DSI identifié et impliqué dans la discussion",
      "impact": "+13 pts",
      "type": "POSITIVE"
    }
  ],
  "recommended_approach": "Proposer immédiatement un atelier de cadrage technique avec l'architecte réseau sous 48h."
}
```

---

### MOTEUR 4 : Radar Churn & Upsell Engine
> **Objectif :** Analyser les conversations et notes de suivi sur un client existant pour lever des alertes préventives de churn ou détecter des signaux d'achat additionnels.

#### Sortie attendue (Output JSON strict) :
```json
{
  "churn_risk_level": "CRITICAL",
  "churn_score": 78,
  "churn_signals": [
    "Le client mentionne avoir reçu une offre concurrente agressive (Starlink / Vodacom)",
    "Trois incidents de coupure non résolus dans le SLA signalés ces 30 derniers jours",
    "Le sponsor historique DSI a quitté l'entreprise, nouveau DSI en poste"
  ],
  "retention_action_plan": {
    "urgency": "IMMEDIATE_48H",
    "action": "Organiser un déjeuner de compte avec le Directeur Commercial et proposer un audit gracieux de la QoS réseau.",
    "email_draft": "Objet : Point d'étape dédié à la qualité de vos liens — Direction Orange Business..."
  },
  "upsell_opportunities": [
    {
      "solution": "CyberSOC Managé",
      "trigger": "Le client a mentionné une tentative de phishing ayant ciblé le département comptabilité.",
      "estimated_value": "+1200€/mois",
      "talking_point": "Sensibiliser sur la protection des postes de travail et le filtrage DNS managé."
    }
  ]
}
```

---

## 3. Contraintes Techniques & Qualité pour le Dev IA

1. **Format de Réponse Strict :**  
   Toutes les fonctions ou endpoints de l'IA doivent retourner du **JSON valide et typé** respectant rigoureusement les schemas ci-dessus (utiliser `pydantic` ou les JSON Schemas / Structured Outputs de l'API OpenAI / Gemini / Claude).
2. **Zéro hallucination sur le catalogue :**  
   L'IA ne doit JAMAIS inventer un service télécom qu'Orange ne vend pas. Toutes les recommandations doivent s'appuyer sur le contexte fourni en entrée (`orange_catalog_context`).
3. **Temps de Réponse Cible :**
   * Pre-Call Briefing : < 3 secondes.
   * Post-Call Email + CRM Payload : < 4 secondes.
   * Lead Scoring & Churn : < 2 secondes.
4. **Langue :**  
   Français professionnel, soutenu et direct (style B2B entreprise / grand compte télécom).

---

## 4. Répartition des Personas & Menus de Navigation

Pour assurer une ergonomie sans friction, chaque fonctionnalité est assignée au persona adéquat :

| Fonctionnalité | Persona Cible | Interface / Route | Menu de Navigation |
|---|---|---|---|
| **Pre-Call Intelligence** | Commercial Terrain (KAM) | Espace KAM (`/kam`) | `Pre-Call Briefing` (Accès direct en 2 min) |
| **Post-Call & Sync CRM** | Commercial Terrain (KAM) | Espace KAM (`/kam`) | `Historique Visites` > Génération e-mail & "Pousser vers Dynamics 365" |
| **Lead Scoring B2B** | KAM & Manager Commercial | Espace KAM (`/kam`) & KAM Office (`/kamoffice`) | `Scoring B2B` |
| **Radar Churn & Upsell** | KAM & Manager Commercial | Espace KAM (`/kam`) & KAM Office (`/kamoffice`) | `Radar Churn & Upsell` |
| **Supervision Portefeuille & KPIs** | Manager Commercial (Head of B2B) | KAM Office (`/kamoffice`) | `Portefeuille & KPIs`, `Équipe KAM`, `Directives` |
| **Copilote Stratégique IA** | KAM & Manager Commercial | Espace KAM & KAM Office | `Copilote IA` |

---
*Ce document sert de contrat de spécification entre l'équipe Core AI et l'équipe Backend Django / Frontend Next.js.*
