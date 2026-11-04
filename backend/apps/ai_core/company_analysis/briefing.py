"""Read compatible briefs and enqueue explicit refreshes without blocking the request."""
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotFound

from ..access import visible_enterprises
from .jobs import enqueue_research, latest_research, serialize_research


def briefing_account(user, account_id):
    raw_id = str(account_id).removeprefix("account-")
    if not raw_id.isdigit():
        raise NotFound("Compte introuvable.")
    return get_object_or_404(visible_enterprises(user), pk=raw_id)


def read_briefing(enterprise, user):
    from kam.models import PreCallBriefing
    from kam.commercial_intelligence_service import CommercialIntelligenceService
    briefing = PreCallBriefing.objects.filter(enterprise=enterprise, kam=user).first()
    # Discard legacy generated briefs with no traceable research or explicit human edits.
    if (briefing and briefing.analysis_data and (
            briefing.analysis_data.get("ai_summary", {}).get("model") == "research-rules-v2"
            or briefing.analysis_data.get("ai_summary", {}).get("status") == "kam_edited")):
        data = {**briefing.analysis_data, "id": briefing.pk, "enterprise_id": enterprise.pk,
            "enterprise_name": enterprise.name, "company_overview": briefing.company_overview,
            "key_decision_makers": briefing.key_decision_makers,
            "detected_business_challenges": briefing.detected_business_challenges,
            "custom_pitch_angles": briefing.custom_pitch_angles,
            "critical_discovery_questions": briefing.critical_discovery_questions,
            "golden_rules": briefing.golden_rules,
            "created_at": briefing.created_at.isoformat(), "updated_at": briefing.updated_at.isoformat()}
    else:
        data = CommercialIntelligenceService.generate_pre_call_briefing(enterprise, user)
    data["installed_offers"] = [
        {"id": offer.id, "installed_offer_name": offer.installed_offer_name,
         "name": offer.installed_offer_name, "category": offer.category,
         "provider": offer.provider, "provider_label": offer.get_provider_display(),
         "contract_status": offer.contract_status, "contract_status_label": offer.get_contract_status_display(),
         "installation_date": offer.installation_date.isoformat() if offer.installation_date else None,
         "contract_end_date": offer.contract_end_date.isoformat() if offer.contract_end_date else None,
         "monthly_cost_mrr": float(offer.monthly_cost_mrr or 0), "bandwidth_mbps": offer.bandwidth_mbps,
         "active_licenses_count": offer.active_licenses_count,
         "unresolved_tickets_count": offer.unresolved_tickets_count,
         "technical_equipment": offer.technical_equipment, "created_at": offer.created_at.isoformat()}
        for offer in enterprise.installed_offers.all().order_by("-created_at")]
    data["research_job"] = latest_research(user, enterprise)
    data["ai_engine"] = "Onbora Core AI"
    return data


def refresh_briefing(enterprise, user, key=None):
    data = read_briefing(enterprise, user)
    job = enqueue_research(user, enterprise, key=key, operation="refresh")
    data["research_job"] = serialize_research(job)
    return data
