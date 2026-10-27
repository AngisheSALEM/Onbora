from __future__ import annotations

import logging

from django.utils import timezone

from .collectors.rss_collector import RawSignal

logger = logging.getLogger(__name__)

OPPORTUNITY_CATEGORY_MAP = {
    "UPSELL": "TECH_PROJECT",
    "CROSS_SELL": "TECH_PROJECT",
    "NEW_PROSPECT": "NEW_ACCOUNT",
    "CHURN_RISK": "INCIDENT",
    "INFO": "EXPANSION",
}


class EnterpriseResolver:
    """
    Rapproche un signal enrichi avec la base de donnees Enterprise
    et cree le B2BNewsFeedItem correspondant.
    """

    def resolve_and_save(self, enriched: dict, raw_signal: RawSignal) -> None:
        """
        1. Cherche si une Enterprise avec ce nom existe en base (icontains).
        2. Si trouvee : cree B2BNewsFeedItem lie (is_web_discovery=False).
        3. Si non trouvee : cree B2BNewsFeedItem (is_web_discovery=True) avec les champs discovered_*.
        """
        from sales.models import Enterprise
        from kam.models import B2BNewsFeedItem

        company_name = enriched.get("company_name", "").strip()
        if not company_name:
            logger.warning("[EnterpriseResolver] company_name absent, signal ignore.")
            return

        opportunity_details = enriched.get("opportunity_details", "")
        opportunity_type = enriched.get("opportunity_type", "INFO")
        relevance_score = float(enriched.get("relevance_score", 0.0))
        relevant_services = enriched.get("relevant_services", [])

        category = OPPORTUNITY_CATEGORY_MAP.get(opportunity_type, "EXPANSION")

        if relevance_score > 0.7:
            priority = "HIGH"
        elif relevance_score > 0.4:
            priority = "MEDIUM"
        else:
            priority = "NORMAL"

        title = f"{company_name} — {opportunity_details[:100]}"
        recommended_offer = relevant_services[0] if relevant_services else ""

        try:
            enterprise = Enterprise.objects.filter(name__icontains=company_name).first()

            if enterprise:
                B2BNewsFeedItem.objects.create(
                    enterprise=enterprise,
                    is_web_discovery=False,
                    title=title,
                    summary=opportunity_details,
                    category=category,
                    priority=priority,
                    commercial_angle=opportunity_details,
                    recommended_offer=recommended_offer,
                    source_name=raw_signal.source_name,
                    source_url=raw_signal.source_url,
                    published_at=timezone.now(),
                )
                logger.info(
                    "[EnterpriseResolver] NewsItem cree pour l'entreprise existante : %s", enterprise.name
                )
            else:
                B2BNewsFeedItem.objects.create(
                    enterprise=None,
                    is_web_discovery=True,
                    discovered_company_name=company_name,
                    discovered_sector=enriched.get("sector", ""),
                    discovered_location=enriched.get("city", ""),
                    discovered_size=enriched.get("estimated_size", ""),
                    title=title,
                    summary=opportunity_details,
                    category=category,
                    priority=priority,
                    commercial_angle=opportunity_details,
                    recommended_offer=recommended_offer,
                    source_name=raw_signal.source_name,
                    source_url=raw_signal.source_url,
                    published_at=timezone.now(),
                )
                logger.info(
                    "[EnterpriseResolver] NewsItem cree pour nouveau compte detecte : %s", company_name
                )
        except Exception as exc:
            logger.error("[EnterpriseResolver] Erreur lors de la sauvegarde : %s", exc)
