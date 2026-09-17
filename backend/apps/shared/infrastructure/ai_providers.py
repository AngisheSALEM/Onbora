import os
import json
import logging
from typing import Dict, Any, List
import requests

from shared.domain.ai_qualification import (
    IAIQualificationProvider,
    AIQualificationResult,
    BANTScore,
    COIEstimation,
    TieredPackage,
)

logger = logging.getLogger(__name__)


import re

def is_insufficient_verbatim(transcript: str) -> bool:
    """
    Vérifie si une transcription vocale ou un compte-rendu contient suffisamment
    de matière pour une qualification B2B réelle.
    Évite toute hallucination de besoins / objections sur de simples salutations
    ('bonjour', 'salut', 'test micro', etc.) ou du texte vide.
    """
    if not transcript or not isinstance(transcript, str):
        return True
    text = transcript.strip().lower()
    words = [w for w in re.findall(r'\b\w+\b', text) if len(w) > 1]
    if len(words) < 3:
        return True

    trivial_words = {
        'bonjour', 'bonsoir', 'salut', 'allo', 'hello', 'hi', 'ok', 'merci',
        'oui', 'non', 'daccord', 'test', 'micro', 'audio', 'coucou', 'yo',
        'bienvenue', 'aurevoir', 'bonne', 'journée', 'matin', 'après', 'midi',
        'remercie', 'présent', 'ça', 'va', 'comment', 'vas', 'tu'
    }
    substantive_words = [w for w in words if w not in trivial_words]
    return len(substantive_words) < 2


def extract_employees_count(size_val: Any, default: int = 10) -> int:
    """Extrait de manière robuste le nombre d'employés depuis une chaîne quelconque."""
    if isinstance(size_val, int):
        return max(1, size_val)
    if not size_val:
        return default
    match = re.search(r'\d+', str(size_val))
    if match:
        try:
            return max(1, int(match.group()))
        except (ValueError, TypeError):
            return default
    return default


class MockAIQualificationAdapter(IAIQualificationProvider):
    """
    Adaptateur déterministe simulant parfaitement le livrable du Dev IA.
    Permet au Mobile et au Serveur de tourner avec 100% de réalisme sans dépendance bloquante.
    """

    def qualify_lead_brief(self, enterprise_data: Dict[str, Any]) -> BANTScore:
        name = enterprise_data.get('name', '').lower()
        sector = enterprise_data.get('sector', '').lower()
        size_str = str(enterprise_data.get('approximate_size', '10'))
        
        # Heuristique déterministe pour le brief
        budget = 20
        authority = 20
        need = 22
        timeline = 20

        if 'kiosque' in name or 'informel' in sector:
            budget = 5
            authority = 15
            timeline = 5
        elif 'clinique' in name or 'santé' in sector or 'hopital' in name:
            budget = 24
            authority = 22
            need = 25
            timeline = 23
        elif 'banque' in name or 'finance' in sector:
            budget = 25
            authority = 18
            need = 24
            timeline = 20

        score = BANTScore(
            budget_score=budget,
            authority_score=authority,
            need_score=need,
            timeline_score=timeline,
        )
        score.calculate_total()
        return score

    def qualify_visit(self, raw_transcript: str, enterprise_data: Dict[str, Any]) -> AIQualificationResult:
        ent_name = enterprise_data.get('name', 'Entreprise B2B')
        sector = enterprise_data.get('sector', 'Services & PME')
        contact_name = enterprise_data.get('contact_name', 'Le Dirigeant')

        if is_insufficient_verbatim(raw_transcript):
            bant = BANTScore(
                budget_score=0,
                authority_score=0,
                need_score=0,
                timeline_score=0,
                total_score=0,
                status="INSUFFICIENT_DATA",
                disqualification_reason="Verbatim insuffisant : aucun échange commercial exploitable consigné."
            )
            coi = COIEstimation(
                impacted_employees=0,
                downtime_hours_per_month=0.0,
                hourly_wage_usd=0.0,
                monthly_payroll_loss_usd=0.0,
                monthly_lost_sales_usd=0.0,
                total_monthly_coi_usd=0.0,
                annual_coi_usd=0.0
            )
            clean_text = raw_transcript.strip() if raw_transcript else ""
            verbatim_snippet = f" (« {clean_text} »)" if clean_text else ""
            return AIQualificationResult(
                enterprise_name=ent_name,
                sector=sector,
                bant=bant,
                coi=coi,
                packages=[],
                recommended_tier="NONE",
                detected_needs=[],
                detected_objections=[],
                actions_todo=[f"Recontacter {contact_name} pour planifier un entretien approfondi"],
                executive_summary=(
                    f"Données insuffisantes pour qualifier {ent_name}. "
                    f"L'enregistrement audio{verbatim_snippet} ne contient pas d'éléments exploitables "
                    "pour identifier des besoins ou évaluer le budget."
                ),
                email_follow_up_j1=(
                    f"Bonjour {contact_name},\n\n"
                    f"Suite à notre brève prise de contact concernant {ent_name}, je vous propose d'organiser "
                    "un entretien de 20 minutes cette semaine afin de faire le point sur vos infrastructures télécoms et besoins numériques.\n\n"
                    "Quelles seraient vos disponibilités ?\n\n"
                    "Bien cordialement,\n"
                    "Orange Business B2B"
                ),
                email_follow_up_j4="",
                technical_handover_specs={}
            )

        # Extraction dynamique factuelle basée sur les termes réels du verbatim
        text_lower = raw_transcript.lower()
        detected_needs = []
        if any(w in text_lower for w in ['fibre', 'connexion', 'haut débit', 'internet', 'bande passante', 'ftth']):
            detected_needs.append("Connectivité Très Haut Débit sécurisée")
        if any(w in text_lower for w in ['panne', 'coupure', 'latence', 'instab', 'disponib', 'secours', 'backup']):
            detected_needs.append("Garantie de continuité de service (SLA / Secours)")
        if any(w in text_lower for w in ['sécur', 'cyber', 'antivirus', 'firewall', 'attaque', 'donnée']):
            detected_needs.append("Protection et cybersécurité des flux")
        if any(w in text_lower for w in ['cloud', 'serveur', 'datacenter', 'héberg', 'm365', 'mail']):
            detected_needs.append("Outils collaboratifs et Cloud d'entreprise")

        detected_objections = []
        if any(w in text_lower for w in ['prix', 'coût', 'cher', 'budget', 'tarif', 'moyen']):
            detected_objections.append("Sensibilité budgétaire et maîtrise des coûts récurrents")
        if any(w in text_lower for w in ['délai', 'déploiement', 'installation', 'temps', 'coupure']):
            detected_objections.append("Contraintes de temps et d'interruption lors de l'installation")
        if any(w in text_lower for w in ['contrat', 'engag', 'opérateur', 'concurrent']):
            detected_objections.append("Contrat en cours chez un autre opérateur")

        budget = 15 if any(w in text_lower for w in ['budget', 'financ', 'valider']) else 10
        authority = 20 if any(w in text_lower for w in ['directeur', 'dg', 'dsi', 'décideur', 'responsable']) else 12
        need = 20 if detected_needs else 8
        timeline = 18 if any(w in text_lower for w in ['urgent', 'immédiat', 'mois', 'semaine', 'rapidement']) else 12

        bant = BANTScore(
            budget_score=budget,
            authority_score=authority,
            need_score=need,
            timeline_score=timeline,
        )
        bant.calculate_total()

        coi = COIEstimation(
            impacted_employees=extract_employees_count(enterprise_data.get('approximate_size'), 10),
            downtime_hours_per_month=4.0 if 'coupure' in text_lower or 'panne' in text_lower else 1.0,
            hourly_wage_usd=12.0,
            monthly_lost_sales_usd=0.0
        )
        coi.compute()

        exec_summary = (
            f"Compte-rendu d'échange avec {contact_name} chez {ent_name}. "
            f"{'Besoins identifiés : ' + ', '.join(detected_needs) + '.' if detected_needs else 'Entretien de cadrage initial.'}"
        )

        actions_todo = [
            f"Transmettre la note de cadrage à {contact_name}"
        ]

        packages = []
        if detected_needs:
            packages = [
                TieredPackage(
                    tier='ESSENTIAL',
                    name='Pack Connectivité Sécurisée Pro',
                    monthly_price_usd=180.0,
                    estimated_msp_cost_usd=90.0,
                    gross_margin_percent=50.0,
                    monthly_net_gain_usd=max(0.0, round(coi.total_monthly_coi_usd - 180.0, 2)),
                    roi_percent=round((max(0.0, coi.total_monthly_coi_usd - 180.0) / 180.0) * 100, 1),
                    key_features=['Fibre Pro 50 Mbps', 'Router Wi-Fi Pro', 'GTR 4h'],
                    pitch=f"Garantit la stabilité de vos flux pour {ent_name}.",
                    objection_killer="GTR 4h contractuelle et secours 4G."
                ),
                TieredPackage(
                    tier='PERFORMANCE',
                    name='Pack Performance & Outils Collaboratifs',
                    monthly_price_usd=320.0,
                    estimated_msp_cost_usd=160.0,
                    gross_margin_percent=50.0,
                    monthly_net_gain_usd=max(0.0, round(coi.total_monthly_coi_usd - 320.0, 2)),
                    roi_percent=round((max(0.0, coi.total_monthly_coi_usd - 320.0) / 320.0) * 100, 1),
                    key_features=['Fibre Dédiée 100 Mbps', 'Microsoft 365 Business', 'Secours 4G automatique'],
                    pitch=f"Connectivité renforcée et suite collaborative pour les équipes de {ent_name}.",
                    objection_killer="Zéro coupure avec bascule instantanée."
                ),
                TieredPackage(
                    tier='SOVEREIGN',
                    name='Pack Souveraineté & Cyberdéfense',
                    monthly_price_usd=550.0,
                    estimated_msp_cost_usd=275.0,
                    gross_margin_percent=50.0,
                    monthly_net_gain_usd=max(0.0, round(coi.total_monthly_coi_usd - 550.0, 2)),
                    roi_percent=round((max(0.0, coi.total_monthly_coi_usd - 550.0) / 550.0) * 100, 1),
                    key_features=['Fibre 200 Mbps', 'Firewall managé 24/7', 'Sauvegarde Cloud souveraine'],
                    pitch=f"Protection intégrale de vos données et conformité pour {ent_name}.",
                    objection_killer="Supervision SOC proactive 24/7."
                ),
            ]

        recommended_tier = "PERFORMANCE" if len(packages) >= 2 else ("ESSENTIAL" if packages else "STANDARD")

        return AIQualificationResult(
            enterprise_name=ent_name,
            sector=sector,
            bant=bant,
            coi=coi,
            packages=packages,
            recommended_tier=recommended_tier,
            detected_needs=detected_needs,
            detected_objections=detected_objections,
            actions_todo=actions_todo,
            executive_summary=exec_summary,
            email_follow_up_j1=(
                f"Bonjour {contact_name},\n\n"
                f"Je vous remercie pour notre échange de ce jour concernant {ent_name}.\n\n"
                f"Comme convenu, nous étudions vos besoins pour vous adresser une préconisation adaptée.\n\n"
                "Bien cordialement,\nOrange Business B2B"
            ),
            email_follow_up_j4="",
            technical_handover_specs={}
        )


class UnifiedAIQualificationAdapter(IAIQualificationProvider):
    """
    Adaptateur unifié direct connecté au moteur Core AI (Gemini / In-process).
    Garantit 0 dépendance envers un microservice distant tout en offrant la pleine puissance de Gemini.
    """
    def __init__(self):
        self.fallback = MockAIQualificationAdapter()

    def qualify_lead_brief(self, enterprise_data: Dict[str, Any]) -> BANTScore:
        try:
            from apps.ai_core.unified_engine import get_unified_core_ai
            engine = get_unified_core_ai()
            prompt = f"""Tu es l'analyste de qualification B2B Orange Business.
Évalue le score BANT (Budget, Authority, Need, Timeline) pour ce lead :
- Nom: {enterprise_data.get('name', 'Entreprise')}
- Secteur: {enterprise_data.get('sector', 'Services')}
- Taille/Effectif: {enterprise_data.get('approximate_size', '10')}
- Localisation: {enterprise_data.get('location', 'Kinshasa')}

Génère un JSON strict avec :
{{
  "budget_score": 20,
  "authority_score": 20,
  "need_score": 22,
  "timeline_score": 20
}}"""
            ai_res = engine._call_gemini_json(prompt, system_instruction="Évalue le scoring BANT B2B avec rigueur en JSON.")
            if ai_res and all(k in ai_res for k in ["budget_score", "authority_score", "need_score", "timeline_score"]):
                score = BANTScore(
                    budget_score=int(ai_res["budget_score"]),
                    authority_score=int(ai_res["authority_score"]),
                    need_score=int(ai_res["need_score"]),
                    timeline_score=int(ai_res["timeline_score"]),
                )
                score.calculate_total()
                return score
        except Exception as e:
            logger.warning(f"Erreur évaluation Gemini BANT ({e}), bascule sur le fallback local.")

        return self.fallback.qualify_lead_brief(enterprise_data)

    def qualify_visit(self, raw_transcript: str, enterprise_data: Dict[str, Any]) -> AIQualificationResult:
        ent_name = enterprise_data.get('name', 'Entreprise B2B')
        sector = enterprise_data.get('sector', 'Services & PME')
        contact_name = enterprise_data.get('contact_name', 'Le Dirigeant')

        if is_insufficient_verbatim(raw_transcript):
            return self.fallback.qualify_visit(raw_transcript, enterprise_data)

        try:
            from apps.ai_core.unified_engine import get_unified_core_ai
            from apps.ai_core.rag_service import get_catalog_rag
            engine = get_unified_core_ai()

            # 1. Recherche d'offres réelles du catalogue RAG Onbora pour le contexte
            rag_matches = get_catalog_rag().search(query=raw_transcript, limit=4)
            catalog_snippets = []
            for m in rag_matches:
                m_name = m.get("name", "")
                m_desc = m.get("description", "")
                m_cat = m.get("category", "")
                catalog_snippets.append(f"- {m_name} ({m_cat}): {m_desc}")
            catalog_context_str = "\n".join(catalog_snippets) if catalog_snippets else "Offres standards Orange Business (Fibre, Secours 4G, M365)"

            prompt = f"""Tu es l'expert avant-vente et directeur commercial B2B d'Orange Business.
Analyse avec la plus grande rigueur la transcription réelle de la rencontre pour {ent_name} ({sector}, contact: {contact_name}).

CATALOGUE PRODUITS OFFICIEL ORANGE BUSINESS DISPONIBLE :
{catalog_context_str}

TRANSCRIPTION RÉELLE :
\"\"\"{raw_transcript}\"\"\"

INSTRUCTIONS CRITIQUES :
1. RÈGLE STRICTE ANTI-HALLUCINATION : N'invente AUCUN besoin non mentionné expressément par le client. Si aucun besoin n'est exprimé, "detected_needs" doit être [].
2. N'invente AUCUNE objection non exprimée. Si aucune objection n'est soulevée, "detected_objections" doit être [].
3. Évalue les scores BANT (0 à 25 chacun) STRICTEMENT selon les faits prouvés par la transcription :
   - budget_score : 0 si le budget n'est pas abordé.
   - authority_score : selon le rôle décisionnaire attesté du contact (0 à 25).
   - need_score : 0 si aucun besoin d'infrastructure télécoms n'est mentionné.
   - timeline_score : 0 si aucune échéance de projet n'est mentionnée.
4. Si des besoins télécoms/numériques réels sont confirmés, structure 1 à 3 offres pertinentes ("packages") basées sur le catalogue ci-dessus avec des prix mensuels réalistes en USD, calcul de gain net et ROI face aux pertes COI estimées. Si aucun besoin n'est confirmé, "packages" doit être [].
5. "actions_todo" doit lister les prochaines actions concrètes et réalistes convenues ou à mener.

Génère un JSON strict :
{{
  "bant": {{
    "budget_score": 0,
    "authority_score": 0,
    "need_score": 0,
    "timeline_score": 0
  }},
  "coi": {{
    "impacted_employees": 0,
    "downtime_hours_per_month": 0.0,
    "hourly_wage_usd": 0.0,
    "monthly_lost_sales_usd": 0.0
  }},
  "packages": [
    {{
      "tier": "ESSENTIAL",
      "name": "Nom de l'offre Orange Business",
      "monthly_price_usd": 150.0,
      "gross_margin_percent": 40.0,
      "monthly_net_gain_usd": 0.0,
      "roi_percent": 0.0,
      "key_features": ["Caractéristiques clés"],
      "pitch": "Argument de valeur",
      "objection_killer": "Réponse aux réticences"
    }}
  ],
  "detected_needs": [],
  "detected_objections": [],
  "actions_todo": [],
  "executive_summary": "synthèse concise et fidèle aux faits réels de l'échange",
  "email_follow_up_j1": "email de suivi professionnel reprenant les points discutés",
  "email_follow_up_j4": "email de relance ultérieure"
}}"""
            ai_res = engine._call_gemini_json(
                prompt,
                system_instruction="Analyse commerciale B2B factuelle. Réponds exclusivement en JSON strict sans inventer de faits non présents dans la transcription."
            )
            if ai_res and 'bant' in ai_res:
                bant_data = ai_res['bant']
                bant = BANTScore(
                    budget_score=max(0, min(25, int(bant_data.get('budget_score', 0)))),
                    authority_score=max(0, min(25, int(bant_data.get('authority_score', 0)))),
                    need_score=max(0, min(25, int(bant_data.get('need_score', 0)))),
                    timeline_score=max(0, min(25, int(bant_data.get('timeline_score', 0)))),
                )
                bant.calculate_total()

                coi_data = ai_res.get('coi', {})
                impacted = int(coi_data.get('impacted_employees', 0))
                downtime = float(coi_data.get('downtime_hours_per_month', 0.0))
                wage = float(coi_data.get('hourly_wage_usd', 0.0))
                lost_sales = float(coi_data.get('monthly_lost_sales_usd', 0.0))
                coi = COIEstimation(
                    impacted_employees=impacted,
                    downtime_hours_per_month=downtime,
                    hourly_wage_usd=wage,
                    monthly_lost_sales_usd=lost_sales
                )
                coi.compute()

                # Construction des packages tierés
                packages: List[TieredPackage] = []
                raw_pkgs = ai_res.get('packages', [])
                if isinstance(raw_pkgs, list):
                    for p in raw_pkgs:
                        if isinstance(p, dict) and p.get('name'):
                            price = float(p.get('monthly_price_usd', 0.0) or 0.0)
                            gain = float(p.get('monthly_net_gain_usd', 0.0) or 0.0)
                            if gain == 0.0 and coi.total_monthly_coi_usd > price:
                                gain = round(coi.total_monthly_coi_usd - price, 2)
                            roi = float(p.get('roi_percent', 0.0) or 0.0)
                            if roi == 0.0 and price > 0:
                                roi = round((gain / price) * 100, 1)
                            packages.append(TieredPackage(
                                tier=str(p.get('tier', 'RECOMMENDED')),
                                name=str(p.get('name', 'Offre Orange Business')),
                                monthly_price_usd=price,
                                estimated_msp_cost_usd=float(p.get('estimated_msp_cost_usd', price * 0.6) or 0.0),
                                gross_margin_percent=float(p.get('gross_margin_percent', 40.0) or 40.0),
                                monthly_net_gain_usd=gain,
                                roi_percent=roi,
                                key_features=p.get('key_features', []) if isinstance(p.get('key_features'), list) else [],
                                pitch=str(p.get('pitch', f"Solution calibrée pour {ent_name}.")),
                                objection_killer=str(p.get('objection_killer', "Garantie de continuité de service Orange Business."))
                            ))

                # Si aucun package mais des offres RAG trouvées et des besoins avérés
                detected_needs = [n for n in ai_res.get('detected_needs', []) if isinstance(n, str) and n.strip()]
                if not packages and detected_needs and rag_matches:
                    for idx, m in enumerate(rag_matches[:2]):
                        p_name = m.get("name") or "Offre Orange Business"
                        p_price = 180.0 if idx == 0 else 320.0
                        packages.append(TieredPackage(
                            tier="ESSENTIAL" if idx == 0 else "PERFORMANCE",
                            name=p_name,
                            monthly_price_usd=p_price,
                            estimated_msp_cost_usd=p_price * 0.6,
                            gross_margin_percent=40.0,
                            monthly_net_gain_usd=max(0.0, round(coi.total_monthly_coi_usd - p_price, 2)),
                            roi_percent=round((max(0.0, coi.total_monthly_coi_usd - p_price) / p_price) * 100, 1) if p_price > 0 else 0.0,
                            key_features=[m.get("description") or ""],
                            pitch=f"Solution catalogue Orange Business recommandée pour {ent_name}.",
                            objection_killer="SLA garanti et assistance technique 24/7."
                        ))

                detected_objections = [o for o in ai_res.get('detected_objections', []) if isinstance(o, str) and o.strip()]
                actions_todo = [a for a in ai_res.get('actions_todo', []) if isinstance(a, str) and a.strip()]
                if not actions_todo:
                    actions_todo = [f"Transmettre la synthèse de l'entretien à {contact_name}"]

                return AIQualificationResult(
                    enterprise_name=ent_name,
                    sector=sector,
                    bant=bant,
                    coi=coi,
                    packages=packages,
                    recommended_tier="PERFORMANCE" if len(packages) > 1 else ("ESSENTIAL" if packages else "STANDARD"),
                    detected_needs=detected_needs,
                    detected_objections=detected_objections,
                    actions_todo=actions_todo,
                    executive_summary=ai_res.get('executive_summary', ''),
                    email_follow_up_j1=ai_res.get('email_follow_up_j1', ''),
                    email_follow_up_j4=ai_res.get('email_follow_up_j4', ''),
                    technical_handover_specs={},
                )
        except Exception as e:
            logger.warning(f"Erreur qualification Gemini ({e}), bascule sur le fallback local.")

        return self.fallback.qualify_visit(raw_transcript, enterprise_data)


class CoreAIHttpAdapter(IAIQualificationProvider):
    """
    Adaptateur réseau pour se connecter à un microservice externe si configuré explicitement.
    """
    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.getenv('CORE_AI_URL', 'http://127.0.0.1:8001/api/v1')
        self.fallback = UnifiedAIQualificationAdapter()

    def qualify_lead_brief(self, enterprise_data: Dict[str, Any]) -> BANTScore:
        try:
            resp = requests.post(f"{self.base_url}/qualify/brief/", json=enterprise_data, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                score = BANTScore(**data)
                score.calculate_total()
                return score
        except Exception as e:
            logger.warning(f"Échec appel distant Core AI brief ({e}), bascule unifiée.")
        return self.fallback.qualify_lead_brief(enterprise_data)

    def qualify_visit(self, raw_transcript: str, enterprise_data: Dict[str, Any]) -> AIQualificationResult:
        try:
            payload = {
                "raw_transcript": raw_transcript,
                "enterprise_data": enterprise_data
            }
            resp = requests.post(f"{self.base_url}/qualify/visit/", json=payload, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                bant = BANTScore(**data['bant'])
                coi = COIEstimation(**data['coi'])
                packages = [TieredPackage(**p) for p in data.get('packages', [])]
                return AIQualificationResult(
                    enterprise_name=data.get('enterprise_name', enterprise_data.get('name', '')),
                    sector=data.get('sector', enterprise_data.get('sector', '')),
                    bant=bant,
                    coi=coi,
                    packages=packages,
                    recommended_tier=data.get('recommended_tier', 'PERFORMANCE'),
                    detected_needs=data.get('detected_needs', []),
                    detected_objections=data.get('detected_objections', []),
                    executive_summary=data.get('executive_summary', ''),
                    email_follow_up_j1=data.get('email_follow_up_j1', ''),
                    email_follow_up_j4=data.get('email_follow_up_j4', ''),
                    technical_handover_specs=data.get('technical_handover_specs', {}),
                )
        except Exception as e:
            logger.warning(f"Échec appel distant Core AI visit ({e}), bascule unifiée.")
        return self.fallback.qualify_visit(raw_transcript, enterprise_data)


def get_ai_qualification_provider() -> IAIQualificationProvider:
    """
    Factory pour instancier le provider unifié Core AI.
    Par défaut, utilise le moteur in-process UnifiedAIQualificationAdapter.
    """
    provider_name = os.getenv('AI_QUALIFICATION_PROVIDER', 'unified').lower()
    if provider_name in ['remote', 'external']:
        return CoreAIHttpAdapter()
    return UnifiedAIQualificationAdapter()
