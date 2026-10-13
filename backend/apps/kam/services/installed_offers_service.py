from __future__ import annotations

import logging
import re
from datetime import timedelta
from typing import Any, Dict, List, Optional
from django.utils import timezone

from sales.models import Enterprise, EnterpriseInstalledOffer

logger = logging.getLogger(__name__)

SIGNED_KEYWORDS_REGEX = re.compile(
    r"\b(contrat\s+(?:a\s+été\s+|est\s+)?signé|accord\s+signé|bon\s+de\s+commande\s+signé|"
    r"signature\s+du\s+contrat|contrat\s+conclu|offre\s+signée|souscription\s+validée|"
    r"contrat\s+validé|a\s+signé\s+le\s+contrat|avons\s+signé|deal\s+signé|deal\s+closed|"
    r"contrat\s+signe|accord\s+conclu)\b",
    re.IGNORECASE
)


def detect_contract_signed(text: str) -> bool:
    """Détecte si un texte (compte-rendu, transcription) atteste de la signature d'un contrat."""
    if not text:
        return False
    return bool(SIGNED_KEYWORDS_REGEX.search(text))


def sync_installed_offer_on_signed_contract(
    enterprise: Enterprise,
    text_content: str = "",
    confirmed_needs: Optional[List[str]] = None,
    signed_offer_name: Optional[str] = None,
    amount: Optional[float] = None,
) -> Optional[EnterpriseInstalledOffer]:
    """
    Vérifie si un rapport stipule qu'un contrat a été signé.
    Le cas échéant, crée ou active automatiquement l'offre dans EnterpriseInstalledOffer.
    """
    is_signed = (
        enterprise.conversion_status == 'CONVERTED'
        or detect_contract_signed(text_content)
    )

    if not is_signed:
        return None

    # Détermination du nom de l'offre
    offer_name = (signed_offer_name or "").strip()
    if not offer_name and confirmed_needs:
        first_need = confirmed_needs[0] if isinstance(confirmed_needs, list) else str(confirmed_needs)
        if first_need:
            offer_name = str(first_need).strip()
    if not offer_name:
        offer_name = (enterprise.converted_offer or enterprise.recommended_solution or "Fibre Optique Pro Orange Business").strip()

    # Détermination de la catégorie
    offer_lower = offer_name.lower()
    category = "CONNECTIVITY"
    bandwidth = None
    if any(k in offer_lower for k in ["fibre", "lsi", "connectivité", "adsl", "sd-wan", "lien", "bande"]):
        category = "CONNECTIVITY"
        bandwidth = 100
        if "1gbps" in offer_lower or "gigabit" in offer_lower:
            bandwidth = 1000
    elif any(k in offer_lower for k in ["cloud", "azure", "aws", "datacenter", "serveur"]):
        category = "CLOUD"
    elif any(k in offer_lower for k in ["cyber", "soc", "firewall", "sécurité", "edr"]):
        category = "SECURITY"
    elif any(k in offer_lower for k in ["365", "office", "collaborat", "teams", "voip"]):
        category = "COLLABORATIVE"

    # Calcul du MRR estimé
    mrr = 0.0
    if amount and amount > 0:
        mrr = round(amount / 12, 2)
    elif enterprise.converted_amount and enterprise.converted_amount > 0:
        mrr = round(float(enterprise.converted_amount) / 12, 2)
    else:
        mrr = 650.00  # MRR standard forfaitaire Fibre Pro

    today = timezone.now().date()
    one_year_later = today + timedelta(days=365)

    # Création ou mise à jour
    offer, created = EnterpriseInstalledOffer.objects.get_or_create(
        enterprise=enterprise,
        installed_offer_name=offer_name,
        defaults={
            "category": category,
            "provider": "ORANGE_BUSINESS",
            "contract_status": "ACTIVE",
            "installation_date": today,
            "contract_end_date": one_year_later,
            "monthly_cost_mrr": mrr,
            "bandwidth_mbps": bandwidth,
            "technical_equipment": "Déploiement certifié Orange Business suite à contrat signé",
        }
    )

    if not created and offer.contract_status != "ACTIVE":
        offer.contract_status = "ACTIVE"
        offer.installation_date = today
        offer.contract_end_date = one_year_later
        offer.monthly_cost_mrr = mrr
        offer.save()

    # Mise à jour synchronisée de l'entreprise
    if enterprise.conversion_status != 'CONVERTED':
        enterprise.conversion_status = 'CONVERTED'
        enterprise.converted_offer = offer_name
        enterprise.contract_end_date = one_year_later
        enterprise.save(update_fields=['conversion_status', 'converted_offer', 'contract_end_date'])

    logger.info(
        f"[InstalledOffersService] Offre implantée '%s' synchronisée pour %s (créée=%s)",
        offer_name, enterprise.name, created
    )
    return offer
