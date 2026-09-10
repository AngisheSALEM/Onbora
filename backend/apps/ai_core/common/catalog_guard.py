from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Iterable, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_ORANGE_OFFERS = [
    "Fibre Sécurisée Dédiée Pro avec SLA 99.99% et GTR 4h",
    "SD-WAN Managé & Multi-liens Hybride (Fibre + Satellite/4G)",
    "CyberSOC & Next-Gen Firewall Managé 24/7",
    "Pack Collaboration Microsoft 365 Business & Teams",
    "Téléphonie Cloud Teams Phone & Flotte Mobile Pro",
    "Orange Money Pro & Terminal TPE Connecté",
]


def load_official_orange_catalog() -> List[dict]:
    """Charge le catalogue officiel Orange B2B JSON depuis le disque."""
    catalog_path = Path(__file__).resolve().parent.parent / "catalog" / "offres_orange_b2b.json"
    if catalog_path.exists():
        try:
            with open(catalog_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("services", [])
        except Exception as exc:
            logger.warning("[CatalogGuard] Erreur lecture catalogue officiel (%s)", exc)
    return []


def build_catalog_context_prompt(
    catalog_context: Optional[Iterable[str]] = None,
    query: Optional[str] = None,
    max_items: int = 8,
) -> List[str]:
    """Construit et normalise la liste des offres disponibles pour le prompt LLM."""
    if catalog_context:
        items = [str(c).strip() for c in catalog_context if str(c).strip()]
        if items:
            return items

    services = load_official_orange_catalog()
    if services:
        results = []
        q_lower = query.lower() if query else ""
        for s in services:
            name = s.get("name", "")
            desc = s.get("description", "")
            benefits = ", ".join(s.get("allowed_benefits", [])[:2])
            entry = f"{name} ({s.get('category', 'Télécoms')}) : {desc}"
            if benefits:
                entry += f" [Bénéfices : {benefits}]"

            # Si query fournie, scorer légèrement
            if q_lower and (q_lower in name.lower() or q_lower in desc.lower()):
                results.insert(0, entry)
            else:
                results.append(entry)

        return results[:max_items]

    return list(DEFAULT_ORANGE_OFFERS)


def sanitize_offers_against_context(
    extracted_offers: Iterable[str],
    allowed_catalog: Iterable[str],
) -> List[str]:
    """Garantit zéro hallucination en validant que l'offre correspond au catalogue."""
    allowed_lower = [a.lower() for a in allowed_catalog if a]
    if not allowed_lower:
        return list(extracted_offers)

    valid_offers: List[str] = []
    for offer in extracted_offers:
        off_lower = offer.lower()
        if any(allowed in off_lower or off_lower in allowed for allowed in allowed_lower):
            valid_offers.append(offer)
        else:
            logger.warning("[CatalogGuard] Offre non reconnue dans le catalogue Orange : %r", offer)

    return valid_offers
