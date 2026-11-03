from __future__ import annotations

import logging
import re
from typing import Any, Dict, Optional
from ..common.base_engine import BaseAIEngine

logger = logging.getLogger(__name__)

COMMERCIAL_SIGNAL_SYSTEM_PROMPT = """Tu es le moteur Core AI d'Onbora, copilote commercial B2B pour les opérateurs télécoms et fournisseurs de services managés (MSP) comme Orange Business.
Ta mission est d'évaluer une actualité ou information de veille d'une entreprise et de scorer l'intensité du signal commercial pour déclencher une opportunité de vente (connectivité Fibre/Satellite, cybersécurité SOC, Cloud, SD-WAN, VoIP, IoT/Flotte).

Définition des signaux :
1. SIGNAL FORT (STRONG) :
   - Déclencheur commercial direct, urgent ou à fort impact budgétaire :
     * Ouverture de nouveaux sites, usines, agences, filiales ou expansion régionale.
     * Changement de gouvernance IT (nouveau DSI, RSSI, Directeur Général).
     * Incident majeur ou coupure de service chez un opérateur concurrent (insatisfaction à capter sous 24h).
     * Levée de fonds significative, financement ou investissement industriel lourd.
     * Nouveau compte/lead immatriculé ou en phase d'aménagement sans infrastructure télécoms installée.
     * Projet de transformation digitale explicite (ERP, Cloud, PACS santé, télématique, SCADA).
   - Score : entre 70 et 100.

2. SIGNAL FAIBLE (WEAK) :
   - Information générale, veille continue, RSE, événementiel sans besoin d'équipement immédiat :
     * Célébration d'anniversaire, vœux, mécénat ou sponsoring culturel.
     * Participation à un salon, colloque ou conférence sans appel d'offres annoncé.
     * Mise à jour de routine, communication institutionnelle sans impact technique ou budgétaire identifié.
   - Score : entre 15 et 69.

Réponds TOUJOURS au format JSON strict avec la structure suivante :
{
  "signal_strength": "STRONG" | "WEAK",
  "signal_score": <entier de 0 à 100>,
  "signal_rationale": "<synthèse de 1 à 2 phrases expliquant pourquoi c'est un signal fort ou faible pour une opportunité commerciale>",
  "commercial_angle": "<l'angle d'attaque commercial suggéré pour le KAM>",
  "recommended_action": "<action concrète recommandée pour le KAM>",
  "recommended_offer": "<offre Orange Business recommandée>"
}
"""


class CommercialSignalScorerEngine(BaseAIEngine):
    """
    Moteur Core AI de scoring et de qualification des signaux d'actualité B2B.
    Détermine si une nouvelle constitue un Signal Fort ou un Signal Faible
    pour engager une action commerciale proactive.
    """

    # Mots-clés déclencheurs de Signal Fort (fort impact d'infrastructure et d'achat)
    STRONG_KEYWORDS = [
        "expansion", "nouvelle agence", "nouvelles agences", "ouverture", "inauguration",
        "déploiement", "extension", "concentrateur", "cadence", "usine", "mine", "chantier",
        "dsi", "directeur des systèmes", "rssi", "gouvernance", "nomination",
        "incident", "coupure", "panne", "interruption", "insatisfaction", "opérateur historique",
        "levée de fonds", "financement", "million", "usd", "investissement", "agrément",
        "immatriculation", "rccm", "nouveau prestataire", "nouveau compte", "recrutement de",
        "modernisation", "sd-wan", "fibre", "datacenter", "cloud", "télématique", "scada",
        "iot", "pacs", "télémédecine", "appel d'offres", "sécurisation", "cybersécurité"
    ]

    # Mots-clés déclencheurs de Signal Faible (information de fond, RSE, routine)
    WEAK_KEYWORDS = [
        "rse", "mécénat", "sponsoring", "festival", "célébration", "anniversaire",
        "voeux", "conférence", "colloque", "forum", "salon", "séminaire",
        "charte graphique", "logo", "site vitrine", "communication", "rapport annuel",
        "responsabilité sociétale", "arbre de noël", "fête", "visite de courtoisie",
        "discours", "table ronde", "distinction", "trophée"
    ]

    def score_news(
        self,
        title: str,
        summary: str,
        category: str = "EXPANSION",
        company_name: str = "",
        sector: str = "",
        location: str = "",
        is_web_discovery: bool = False,
        use_ai: bool = False
    ) -> Dict[str, Any]:
        """
        Analyse une actualité et calcule son intensité de signal commercial (STRONG ou WEAK).
        """
        # Si use_ai est activé et client Gemini prêt, tentative d'évaluation LLM
        if use_ai and self._client:
            user_prompt = f"""Analyse cette actualité d'entreprise :
Entreprise : {company_name or 'Entreprise B2B'}
Secteur : {sector or 'Général'}
Localisation : {location or 'RDC'}
Catégorie déclarée : {category}
Nouveau Lead Web : {'Oui' if is_web_discovery else 'Non (portefeuille)'}

Titre : {title}
Résumé : {summary}
"""
            ai_res = self.call_gemini_json(user_prompt, system_instruction=COMMERCIAL_SIGNAL_SYSTEM_PROMPT)
            if ai_res and isinstance(ai_res, dict) and "signal_strength" in ai_res:
                try:
                    strength = str(ai_res.get("signal_strength", "STRONG")).upper()
                    if strength not in ("STRONG", "WEAK"):
                        strength = "STRONG" if ai_res.get("signal_score", 70) >= 70 else "WEAK"
                    score = int(ai_res.get("signal_score", 75))
                    score = max(5, min(100, score))
                    return {
                        "signal_strength": strength,
                        "signal_score": score,
                        "signal_rationale": str(ai_res.get("signal_rationale", "")).strip(),
                        "commercial_angle": str(ai_res.get("commercial_angle", "")).strip(),
                        "recommended_action": str(ai_res.get("recommended_action", "")).strip(),
                        "recommended_offer": str(ai_res.get("recommended_offer", "")).strip(),
                    }
                except Exception as exc:
                    logger.warning("[CommercialSignalScorer] Erreur parsing résultat Gemini (%s), fallback heuristique.", exc)

        # Moteur heuristique déterministe haute fidélité Onbora Core AI
        return self._heuristic_score(
            title=title,
            summary=summary,
            category=category,
            company_name=company_name,
            sector=sector,
            location=location,
            is_web_discovery=is_web_discovery
        )

    def _heuristic_score(
        self,
        title: str,
        summary: str,
        category: str,
        company_name: str,
        sector: str,
        location: str,
        is_web_discovery: bool
    ) -> Dict[str, Any]:
        full_text = f"{title} {summary} {sector} {category}".lower()

        # Score de départ selon la catégorie
        base_scores = {
            "INCIDENT": 88,       # Insatisfaction concurrent = opportunité d'urgence
            "NEW_ACCOUNT": 82,   # Nouveau compte sans contrat en cours
            "EXPANSION": 80,     # Nouvelles implantations / agences
            "TECH_PROJECT": 78,  # Projets SI / télécoms
            "FINANCE": 75,       # Levées de fonds / liquidités
            "MANAGEMENT": 72,    # Changement de DSI / gouvernance
        }
        score = base_scores.get(category.upper(), 65)

        strong_matches = [kw for kw in self.STRONG_KEYWORDS if kw in full_text]
        weak_matches = [kw for kw in self.WEAK_KEYWORDS if kw in full_text]

        # Ajustements
        score += min(len(strong_matches) * 5, 20)
        score -= min(len(weak_matches) * 15, 45)

        # Nouveaux leads détectés sur le net avec signaux d'infrastructure
        if is_web_discovery and len(strong_matches) > 0:
            score += 5

        # Normalisation du score entre 10 et 98
        score = max(15, min(98, score))

        if score >= 70:
            strength = "STRONG"
            if "incident" in full_text or "coupure" in full_text or "panne" in full_text:
                rationale = "Signal fort critique : dysfonctionnement chez le concurrent favorisant une bascule de secours immédiate."
            elif is_web_discovery:
                rationale = "Signal fort : nouvelle entité commerciale avec besoins de connectivité et télécoms de départ."
            elif any(w in full_text for w in ["agence", "expansion", "ouverture", "usine", "mine"]):
                rationale = "Signal fort : extension physique et opérationnelle nécessitant une interconnexion réseau multi-sites."
            elif any(w in full_text for w in ["dsi", "direction technique", "gouvernance"]):
                rationale = "Signal fort : prise de fonction d'un nouveau décideur IT prompt à réévaluer les contrats télécoms."
            elif "levée de fonds" in full_text or "financement" in full_text or "million" in full_text:
                rationale = "Signal fort : injection de capital dédiée au déploiement de solutions technologiques."
            else:
                rationale = "Signal fort : projet d'envergure avec opportunité directe de positionnement commercial."
        else:
            strength = "WEAK"
            if len(weak_matches) > 0:
                rationale = f"Signal faible : communication de notoriété ou RSE ({weak_matches[0]}) sans projet télécoms identifié à court terme."
            else:
                rationale = "Signal faible : information de veille institutionnelle sans urgence commerciale démontrée."

        return {
            "signal_strength": strength,
            "signal_score": score,
            "signal_rationale": rationale,
        }


# Singleton d'exécution Core AI
commercial_signal_scorer = CommercialSignalScorerEngine()
