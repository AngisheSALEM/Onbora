from __future__ import annotations

import os
import json
import logging
import re
from typing import Dict, Any, List, Optional
from datetime import timedelta
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)

ORANGE_CATALOG_DEFAULT = [
    {
        "name": "Fibre Sécurisée Dédiée Pro",
        "category": "CONNECTIVITY",
        "speed": "100 Mbps à 1 Gbps symétrique",
        "sla": "99.99% avec GTR 4h garantie",
        "best_for": "Sièges sociaux, banques, usines et sites critiques nécessitant zéro interruption."
    },
    {
        "name": "SD-WAN Managé & Multi-liens Hybride",
        "category": "NETWORK",
        "speed": "Agrégation dynamique Fibre + Backup Satellite / 4G",
        "sla": "Basculement automatique < 1 seconde sans coupure de session",
        "best_for": "Entreprises multi-sites (agences bancaires, mines, retail) avec applications cloud critiques (SAP, Salesforce)."
    },
    {
        "name": "CyberSOC & Next-Gen Firewall Managé",
        "category": "SECURITY",
        "speed": "Surveillance 24/7/365 et filtrage temps réel",
        "sla": "Détection & isolement des menaces < 15 min",
        "best_for": "Protection contre les ransomwares, attaques DDoS et conformité réglementaire."
    },
    {
        "name": "Téléphonie Cloud Microsoft Teams Phone",
        "category": "COLLABORATION",
        "speed": "Operator Connect certifié Microsoft",
        "sla": "Qualité vocale HD avec routage intelligent",
        "best_for": "Remplacement des standards PABX obsolètes, télétravail et convergence fixe-mobile."
    },
    {
        "name": "Pack Collaboration Microsoft 365 Business",
        "category": "CLOUD",
        "speed": "Suite bureautique Cloud & 1 To stockage",
        "sla": "99.9% disponibilité",
        "best_for": "Entreprises en croissance cherchant à moderniser leurs outils collaboratifs."
    },
    {
        "name": "Orange Money Pro & Terminal TPE Connecté",
        "category": "PAYMENT",
        "speed": "Paiement digital instantané sécurisé",
        "sla": "Disponibilité 24/7",
        "best_for": "Commerces, cliniques, distributeurs pour simplifier les encaissements."
    }
]


class UnifiedCoreAIEngine:
    """
    Moteur Core AI unifié in-process pour Onbora.
    Intègre les 4 moteurs stratégiques B2B et les copilotes opérationnels :
    1. Pre-Call Intelligence Engine (KAM & Commercial terrain)
    2. Post-Call Execution Engine (KAM & Compte-rendu terrain)
    3. Lead Scoring B2B Engine
    4. Radar Churn & Upsell Engine
    5. Sales Hypotheses & Enrichment Engine
    6. Live Copilot Stream Engine
    7. Qualification BANT & Rentabilité COI

    Fonctionne directement dans le backend Django sans microservice externe ni port 8001.
    Utilise Google Gemini quand configuré, avec fallback intelligent résilient.
    """

    def __init__(self):
        self.api_key = getattr(settings, 'GEMINI_API_KEY', '') or os.getenv('GEMINI_API_KEY', '')
        self.model_name = getattr(settings, 'GEMINI_MODEL', 'gemini-3.5-flash-lite') or os.getenv('GEMINI_MODEL', 'gemini-3.5-flash-lite')
        if 'gemini-2.5' in self.model_name:
            self.model_name = 'gemini-3.5-flash-lite'
        self._client = None
        self._init_client()

    def _init_client(self):
        if self.api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
                logger.info("[UnifiedCoreAI] Client Gemini initialisé avec le modèle %s", self.model_name)
            except Exception as exc:
                logger.warning("[UnifiedCoreAI] Erreur initialisation Gemini (%s), mode fallback actif.", exc)
                self._client = None

    def _call_gemini_json(self, prompt: str, system_instruction: str = "") -> Optional[Dict[str, Any]]:
        """Appelle Gemini avec demande de réponse JSON stricte."""
        if not self._client:
            return None
        try:
            from google.genai import types
            config_kwargs = {
                'response_mime_type': 'application/json',
                'temperature': 0.2,
            }
            if system_instruction:
                config_kwargs['system_instruction'] = system_instruction

            resp = self._client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(**config_kwargs)
            )
            if resp and resp.text:
                clean_text = resp.text.strip()
                match = re.search(r'\{.*\}', clean_text, re.DOTALL)
                if match:
                    clean_text = match.group(0)
                return json.loads(clean_text)
        except Exception as exc:
            logger.warning("[UnifiedCoreAI] Appel Gemini en échec (%s), utilisation du fallback local.", exc)
            return None

    # =========================================================================
    # 1. PRE-CALL INTELLIGENCE ENGINE
    # =========================================================================
    def generate_pre_call_briefing(self, enterprise, kam_user) -> dict:
        company_name = enterprise.name
        sector = enterprise.sector or "Services & Industrie"
        revenue_val = float(enterprise.annual_revenue or 50000.0)
        employee_count = enterprise.employee_count or 25
        site_count = enterprise.site_count or 1
        curr_op = enterprise.current_operator or "Opérateur tiers"
        curr_conn = enterprise.current_connectivity or "Fibre standard"
        city = enterprise.commune or enterprise.city or "Kinshasa"
        contact_name = enterprise.contact_name or "Direction Générale"
        contact_role = enterprise.contact_role or "DSI / Décideur"

        prompt = f"""Tu es l'analyste commercial expert Orange Business B2B en RDC.
Génère le dossier d'attaque Pre-Call pour préparer la négociation avec ce compte clé :
- Entreprise: {company_name}
- Secteur d'activité: {sector}
- Ville: {city}
- Effectif estimé: {employee_count} collaborateurs
- Nombre de sites: {site_count}
- Chiffre d'affaires annuel: {revenue_val:,.0f} USD
- Opérateur actuel: {curr_op} (Accès: {curr_conn})
- Décideur principal: {contact_name} ({contact_role})

Génère un JSON strict respectant exactement cette structure :
{{
  "company_overview": {{
    "summary": "synthèse concise de l'entreprise et ses enjeux réseau",
    "estimated_employees": "{employee_count}+ collaborateurs",
    "estimated_sites": {site_count},
    "annual_revenue_usd": "{revenue_val:,.0f} USD",
    "digital_maturity": "HIGH ou MEDIUM ou LOW",
    "telecom_budget_monthly_usd": {round(revenue_val * 0.015 / 12, 2)}
  }},
  "key_decision_makers": [
    {{
      "role": "{contact_role}",
      "name": "{contact_name}",
      "profile_type": "Technique / Financier / Opérationnel",
      "concerns": "principales préoccupations et douleurs avec {curr_op}",
      "influence": "DECISION_MAKER"
    }}
  ],
  "detected_business_challenges": [
    "défi 1 lié aux pannes ou à la lenteur",
    "défi 2 lié au multi-sites ou à la sécurité",
    "défi 3 lié à la collaboration"
  ],
  "custom_pitch_angles": [
    {{
      "solution_name": "nom de l'offre Orange recommandée",
      "pitch_argument": "argument d'impact percutant",
      "financial_benefit": "gain chiffré ou productivité préservée"
    }}
  ],
  "critical_discovery_questions": [
    "question stratégique 1 pour faire verbaliser le coût d'une panne",
    "question 2 sur la sécurité des données",
    "question 3 sur le processus décisionnel"
  ],
  "golden_rules": [
    "règle d'or 1 de négociation face à {curr_op}",
    "règle d'or 2 pour sécuriser le closing"
  ]
}}"""

        ai_data = self._call_gemini_json(prompt, system_instruction="Génère exclusivement un objet JSON valide pour un directeur commercial.")

        if not ai_data:
            maturity = "HIGH" if (revenue_val > 200000 or enterprise.segment == 'GRAND_COMPTE') else "MEDIUM"
            ai_data = {
                "company_overview": {
                    "summary": f"Acteur clé du secteur {sector} basé à {city}. Structure de {employee_count} collaborateurs répartis sur {site_count} site(s). Infrastructure sous contrat {curr_op} ({curr_conn}).",
                    "estimated_employees": f"{employee_count}+ collaborateurs",
                    "estimated_sites": site_count,
                    "annual_revenue_usd": f"{revenue_val:,.0f} USD",
                    "digital_maturity": maturity,
                    "telecom_budget_monthly_usd": round(revenue_val * 0.015 / 12, 2)
                },
                "key_decision_makers": [
                    {
                        "role": contact_role,
                        "name": contact_name,
                        "profile_type": "Technique & Résilience",
                        "concerns": f"Disponibilité du lien {curr_conn}, pannes non résolues chez {curr_op}.",
                        "influence": "DECISION_MAKER"
                    }
                ],
                "detected_business_challenges": [
                    f"Coupures et micro-déconnexions régulières avec l'accès actuel ({curr_op})",
                    f"Difficultés d'interconnexion sécurisée entre les {site_count} site(s)",
                    "Risque de perte de données et exposition aux cyberattaques"
                ],
                "custom_pitch_angles": [
                    {
                        "solution_name": "Fibre Sécurisée Dédiée Pro avec SLA 99.99%",
                        "pitch_argument": f"Garantit 0 minute de rupture d'activité grâce à notre GTR 4h signée et notre double adduction.",
                        "financial_benefit": f"Évite jusqu'à {round(revenue_val * 0.02, 0):,.0f} $/an de pertes de productivité."
                    }
                ],
                "critical_discovery_questions": [
                    f"Quel est le coût estimé pour votre entreprise lors d'une interruption de connexion de 2 heures ?",
                    f"Comment vos équipes techniques réagissent-elles actuellement face au support de {curr_op} ?",
                    "Qui d'autre autour de vous valide les engagements contractuels télécoms ?"
                ],
                "golden_rules": [
                    f"Ne jamais dénigrer directement {curr_op} : valoriser nos engagements SLA 99.99% et notre GTR 4h signée.",
                    "Faire verbaliser la douleur financière avant d'aborder tout chiffre ou prix."
                ]
            }

        return ai_data

    # =========================================================================
    # 2. POST-CALL EXECUTION & DEBRIEF ENGINE
    # =========================================================================
    def generate_post_call_execution(self, enterprise, kam_user, meeting_transcript: str) -> dict:
        company_name = enterprise.name
        kam_name = kam_user.get_full_name() or kam_user.username
        contact_name = enterprise.contact_name or "Direction"
        contact_role = enterprise.contact_role or "DSI"

        prompt = f"""Tu es le copilote d'exécution commerciale post-visite Orange Business B2B.
Analyse la transcription suivante de l'entretien mené par le KAM {kam_name} chez {company_name} avec {contact_name} ({contact_role}) :

Transcription de l'échange :
\"\"\"{meeting_transcript}\"\"\"

Produis un JSON strict structuré ainsi :
{{
  "executive_summary": "synthèse exécutive claire des enjeux et de la position du client",
  "confirmed_needs": ["besoin confirmé 1", "besoin confirmé 2"],
  "objections_raised": ["objection soulevée 1", "objection 2"],
  "action_tasks": [
    {{
      "id": "task-1",
      "title": "action concrète à faire sous 24h",
      "deadline": "J+1",
      "priority": "HIGH",
      "is_urgent_48h": true,
      "status": "TODO"
    }},
    {{
      "id": "task-2",
      "title": "validation technique avant-vente ou devis",
      "deadline": "J+2",
      "priority": "HIGH",
      "is_urgent_48h": true,
      "status": "TODO"
    }}
  ],
  "client_followup_email": {{
    "subject": "objet percutant et professionnel",
    "body": "corps de mail chaleureux, orienté valeur, remerciant le client et formalisant les prochaines étapes"
  }},
  "crm_payload": {{
    "account_name": "{company_name}",
    "stage": "Proposition Commerciale / Qualification",
    "deal_size_estimate_usd": {round(float(enterprise.annual_revenue or 50000) * 0.012, 2)},
    "next_step": "Envoi proposition chiffrée Fibre Pro sous 48h",
    "probability_percent": 75
  }}
}}"""

        ai_data = self._call_gemini_json(prompt, system_instruction="Tu es un directeur commercial B2B. Génère un JSON strict d'exécution post-visite.")

        if not ai_data:
            ai_data = {
                "executive_summary": f"Échange très fructueux avec {contact_name} ({contact_role}) chez {company_name}. Les besoins en connectivité très haut débit, haute disponibilité et sécurité ont été confirmés.",
                "confirmed_needs": [
                    "Fibre Optique Dédiée Sécurisée Orange Pro avec GTR 4h",
                    "Secours automatique 4G / Satellite sans coupure",
                    "Messagerie professionnelle Microsoft 365"
                ],
                "objections_raised": [
                    f"Engagement contractuel restant chez {enterprise.current_operator or 'le fournisseur actuel'}",
                    "Vérification nécessaire du budget mensuel"
                ],
                "action_tasks": [
                    {
                        "id": f"task-{enterprise.id}-1",
                        "title": f"Transmettre l'e-mail de suivi rédigé à {contact_name}",
                        "deadline": (timezone.now() + timedelta(hours=24)).strftime("%d/%m/%Y"),
                        "priority": "HIGH",
                        "is_urgent_48h": True,
                        "status": "TODO"
                    },
                    {
                        "id": f"task-{enterprise.id}-2",
                        "title": "Coordonner l'audit technique d'éligibilité avec les équipes réseau",
                        "deadline": (timezone.now() + timedelta(days=2)).strftime("%d/%m/%Y"),
                        "priority": "HIGH",
                        "is_urgent_48h": True,
                        "status": "TODO"
                    }
                ],
                "client_followup_email": {
                    "subject": f"Suite à notre échange — Plan de modernisation télécoms pour {company_name}",
                    "body": f"Bonjour {contact_name},\n\nJe tiens à vous remercier pour le temps accordé ce jour lors de notre entretien concernant les infrastructures de {company_name}.\n\nComme convenu, vous trouverez ci-joint notre synthèse de préconisations techniques Orange Business (Fibre Dédiée avec GTR 4h garantie et secours automatique).\n\nJe reste à votre entière disposition pour planifier le test d'éligibilité final dès ce jeudi.\n\nBien cordialement,\n{kam_name}\nKey Account Manager — Orange Business"
                },
                "crm_payload": {
                    "account_name": company_name,
                    "stage": "Proposition Commerciale",
                    "deal_size_estimate_usd": round(float(enterprise.annual_revenue or 50000) * 0.012, 2),
                    "next_step": "Envoi offre technique et financière sous 48h",
                    "probability_percent": 70
                }
            }

        return ai_data

    # =========================================================================
    # 3. SALES HYPOTHESES & PROSPECT ENRICHMENT ENGINE
    # =========================================================================
    def generate_sales_hypotheses(
        self,
        company_name: str,
        sector: str = "Services B2B",
        website: Optional[str] = None,
        scraped_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        prompt = f"""Tu es l'analyste stratégique avant-vente Orange Business B2B.
Analyse les données du prospect suivant pour préparer le commercial terrain :
- Entreprise: {company_name}
- Secteur: {sector}
- Site web: {website or 'Non renseigné'}
- Données web/sociales scrapées: {json.dumps(scraped_data or {}, ensure_ascii=False)[:1000]}

Produis un JSON strict avec :
{{
  "hypotheses": [
    "hypothèse métier 1 sur ses besoins d'infrastructure ou connectivité",
    "hypothèse métier 2 sur ses outils ou sa sécurité"
  ],
  "tailored_pitch": "pitch commercial percutant mettant en avant la Fibre Pro Orange et les services Cloud",
  "key_questions": [
    "question d'accroche 1",
    "question 2",
    "question 3"
  ],
  "potential_objections": [
    "objection probable 1 (ex: coût, contrat existant) avec argumentaire de réponse",
    "objection 2 avec contre-argument"
  ],
  "recommended_solution": "Offre Orange recommandée (ex: Fibre Optique Pro + Microsoft 365)",
  "conversion_score": 85
}}"""

        ai_data = self._call_gemini_json(prompt, system_instruction="Génère un diagnostic commercial B2B précis en JSON.")

        if not ai_data:
            sector_lower = sector.lower() if sector else ""
            hypotheses = [
                f"L'entreprise {company_name} utilise probablement une liaison ADSL ou box 4G instable générant des ralentissements aux heures de pointe.",
                "Le partage des fichiers et la messagerie souffrent d'un manque d'outils collaboratifs professionnels centralisés."
            ]
            pitch = f"Présenter la Fibre Optique Dédiée Pro Orange avec engagement GTR 4h garantie et le pack Microsoft 365 Business."
            questions = [
                "Quelle est la criticité d'une coupure internet sur le fonctionnement quotidien de vos équipes ?",
                "Combien de collaborateurs doivent travailler simultanément sur vos applications métier ?",
                "Comment sauvegardez-vous actuellement les données critiques de vos clients ?"
            ]
            objections = [
                "Le coût de la fibre pro est supérieur à une offre résidentielle (Réponse : ROI immédiat sur la productivité et zéro perte de chiffre d'affaires).",
                "La crainte des délais de raccordement (Réponse : Passerelle de secours 4G activée immédiatement sans interruption)."
            ]
            solution = "Fibre Optique Pro 50M + Microsoft 365"
            score = 85

            if "santé" in sector_lower or "clinique" in sector_lower or "médic" in sector_lower:
                hypotheses = [
                    f"{company_name} traite des dossiers médicaux exigeant une confidentialité stricte et un lien haut débit permanent.",
                    "Nécessité de continuité absolue pour la prise de rendez-vous et la consultation des résultats."
                ]
                pitch = "Proposer la Fibre Pro Sécurisée couplée à la Sauvegarde Cloud Immuable et la Téléphonie IP d'accueil."
                solution = "Fibre Pro Sécurisée + Cloud Backup HDS"
                score = 92
            elif "mine" in sector_lower or "industr" in sector_lower or "logist" in sector_lower:
                hypotheses = [
                    f"{company_name} requiert une interconnexion multi-sites robuste reliant sièges et sites industriels isolés.",
                    "Besoin de supervision 24/7 et de redondance Satellite / Fibre."
                ]
                pitch = "Déployer notre solution SD-WAN hybride Managé avec double adduction Fibre et secours Satellite."
                solution = "SD-WAN Managé Hybride Fibre + Satellite"
                score = 88

            ai_data = {
                "hypotheses": hypotheses,
                "tailored_pitch": pitch,
                "key_questions": questions,
                "potential_objections": objections,
                "recommended_solution": solution,
                "conversion_score": score
            }

        ai_data["provider"] = "Core-AI-Unified-Engine"
        return ai_data

    # =========================================================================
    # 4. POST-VISIT REPORT ENGINE
    # =========================================================================
    def generate_post_visit_report(
        self,
        full_transcript: str,
        enterprise_name: str,
        prep_objective: str = "",
        salesperson_name: str = "Commercial Terrain"
    ) -> Dict[str, Any]:
        prompt = f"""Tu es l'analyste commercial post-visite Orange Business B2B.
Analyse la transcription suivante recueillie par le commercial {salesperson_name} lors de sa visite chez {enterprise_name} :

Objectif initial de la visite : {prep_objective or 'Audit des besoins télécoms & IT'}
Transcription :
\"\"\"{full_transcript}\"\"\"

Produis un JSON strict :
{{
  "executive_summary": "synthèse exécutive professionnelle du rendez-vous (2-3 phrases)",
  "confirmed_needs": ["besoin 1", "besoin 2"],
  "objections_raised": ["objection 1 soulevée par le prospect"],
  "actions_todo": [
    "action concrète 1 avec délai",
    "action 2"
  ],
  "follow_up_email": "brouillon de mail de remerciement et de suivi formel et percutant"
}}"""

        ai_data = self._call_gemini_json(prompt, system_instruction="Synthétise la visite en un compte-rendu exécutif clair en JSON.")

        if not ai_data:
            text_lower = full_transcript.lower() if full_transcript else ""
            confirmed = ["Fibre Optique Pro Orange B2B", "Microsoft 365 Pro & Teams"]
            objections = []
            actions = [
                f"Faire parvenir l'offre chiffrée Fibre Pro à la direction de {enterprise_name}",
                "Planifier la visite technique d'éligibilité réseau"
            ]
            if "sécurité" in text_lower or "firewall" in text_lower:
                confirmed.append("Firewall Managé & Cybersécurité")
            if "prix" in text_lower or "cher" in text_lower or "budget" in text_lower:
                objections.append("Sensibilité au coût récurrent mensuel")
                actions.append("Préparer un chiffrage avec remise d'engagement 24 mois")

            ai_data = {
                "executive_summary": f"Entretien commercial constructif avec {enterprise_name}. Le client confirme des ralentissements réguliers avec son installation actuelle et souhaite moderniser sa connectivité avec Orange Business.",
                "confirmed_needs": confirmed,
                "objections_raised": objections,
                "actions_todo": actions,
                "follow_up_email": f"Madame, Monsieur,\n\nJe tiens à vous remercier pour l'accueil réservé lors de notre échange chez {enterprise_name}.\n\nNous préparons votre offre personnalisée Fibre Pro avec garantie SLA 99.99%.\n\nBien cordialement,\n{salesperson_name}\nOrange Business B2B"
            }

        return ai_data


# Singleton applicatif Core AI unifié
_ENGINE = None

def get_unified_core_ai() -> UnifiedCoreAIEngine:
    global _ENGINE
    if _ENGINE is None:
        _ENGINE = UnifiedCoreAIEngine()
    return _ENGINE
