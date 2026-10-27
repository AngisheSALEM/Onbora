from __future__ import annotations

import logging
import re
from typing import Optional

from ..common.base_engine import BaseAIEngine
from .collectors.rss_collector import RawSignal

logger = logging.getLogger(__name__)

ENRICHMENT_PROMPT_TEMPLATE = """Tu es un analyste commercial B2B expert en marches africains (RDC, Afrique centrale).
Analyse ce texte provenant de la presse economique ou du web et extrait les informations structurees.

Texte a analyser:
{raw_text}

Source: {source_name} | Date: {signal_date}

Retourne UNIQUEMENT un JSON valide avec ces champs:
{{
  "company_name": "Nom de l entreprise principale mentionnee",
  "sector": "Secteur activite (Banque|Sante|Industrie|Telecom|Commerce|Logistique|Mine|Autre)",
  "city": "Ville RDC ou Afrique centrale (Kinshasa|Lubumbashi|Goma|Autre)",
  "estimated_size": "TPE|PME|GRAND_COMPTE",
  "opportunity_type": "UPSELL|CROSS_SELL|NEW_PROSPECT|CHURN_RISK|INFO",
  "opportunity_details": "1-2 phrases expliquant l opportunite commerciale pour un operateur telecom",
  "relevant_services": ["liste des services Orange Business applicables"],
  "relevance_score": 0.0,
  "is_new_company": true
}}

Si aucune entreprise concrete n est mentionnee, retourne null.
"""

KNOWN_ENTITIES = [
    ("Rawbank", "Banque", "Kinshasa", "GRAND_COMPTE", ["Fibre Dediee Pro", "Pack Cyber EDR"]),
    ("Equity BCDC", "Banque", "Kinshasa", "GRAND_COMPTE", ["SD-WAN Manage", "Microsoft 365"]),
    ("Vodacom", "Telecom", "Kinshasa", "GRAND_COMPTE", ["Interconnexion LSI"]),
    ("Airtel", "Telecom", "Kinshasa", "GRAND_COMPTE", ["Transit IP"]),
    ("Bracongo", "Industrie", "Kinshasa", "GRAND_COMPTE", ["Fibre Pro 100M", "PABX IP"]),
    ("Bralima", "Industrie", "Kinshasa", "GRAND_COMPTE", ["Fibre Pro Symetrique"]),
    ("Tenke Fungurume", "Mine", "Kolwezi", "GRAND_COMPTE", ["Liaison Satellite VSAT", "SD-WAN"]),
    ("Kamoto Copper", "Mine", "Kolwezi", "GRAND_COMPTE", ["Secours Satellite", "Cyber SOC"]),
    ("Clinique Ngaliema", "Sante", "Kinshasa", "PME", ["Fibre Pro 50M", "Cloud Backup"]),
    ("Marsavco", "Industrie", "Kinshasa", "PME", ["Fibre Pro 50M"]),
]


class MarketIntelEnricher(BaseAIEngine):
    """
    Enrichisseur de signaux de marche via Gemini (avec fallback deterministe in-process).
    Extrait les informations commerciales structurees depuis un signal RSS brut.
    """

    def enrich(self, signal: RawSignal) -> Optional[dict]:
        """
        Analyse un RawSignal et retourne un dictionnaire enrichi
        ou None si aucune entreprise concrete n'est detectee.
        """
        prompt = ENRICHMENT_PROMPT_TEMPLATE.format(
            raw_text=signal.raw_text[:3000],
            source_name=signal.source_name,
            signal_date=signal.signal_date,
        )
        try:
            result = self.call_gemini_json(prompt)
            if isinstance(result, dict):
                company_name = result.get("company_name", "")
                if company_name and company_name.lower() not in ("null", "none", "", "n/a"):
                    return result
        except Exception as exc:
            logger.debug("[MarketIntelEnricher] Erreur appel Gemini : %s", exc)

        return self._fallback_extract(signal)

    def _fallback_extract(self, signal: RawSignal) -> Optional[dict]:
        """Extraction heuristique locale basee sur les entites et motifs B2B connus."""
        text = signal.raw_text

        # 1. Verification entites connues
        for name, sector, city, size, services in KNOWN_ENTITIES:
            if re.search(rf"\b{re.escape(name)}\b", text, re.IGNORECASE):
                return {
                    "company_name": name,
                    "sector": sector,
                    "city": city,
                    "estimated_size": size,
                    "opportunity_type": "EXPANSION",
                    "opportunity_details": f"Actualite d'activite detectee dans {signal.source_name} pour {name}.",
                    "relevant_services": services,
                    "relevance_score": 0.75,
                    "is_new_company": False,
                }

        # 2. Motifs generiques d'entreprises : "la societe X", "l'entreprise X", "le groupe X"
        patterns = [
            r"(?:la société|la societe|l'entreprise|le groupe|la banque|l'établissement)\s+([A-Z][a-zA-Z0-9\s&-]{2,30})",
            r"([A-Z][a-zA-Z0-9&-]{2,20}\s+(?:SA|SARL|SAS|RDC|Mining|Bank|Assurances|Logistics))",
        ]
        for pat in patterns:
            match = re.search(pat, text)
            if match:
                detected_name = match.group(1).strip()
                if len(detected_name) > 3 and not any(k in detected_name.lower() for k in ["republique", "gouvernement", "ministre", "president"]):
                    return {
                        "company_name": detected_name,
                        "sector": "Tertiaire & Services",
                        "city": "Kinshasa",
                        "estimated_size": "PME",
                        "opportunity_type": "NEW_PROSPECT",
                        "opportunity_details": f"Nouveau compte ou opportunite repere via {signal.source_name}.",
                        "relevant_services": ["Fibre Pro 50M", "Microsoft 365 Business"],
                        "relevance_score": 0.65,
                        "is_new_company": True,
                    }

        return None
