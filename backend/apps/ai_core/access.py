"""Authorization shared by the AI endpoints and vector retrieval."""
from django.db.models import Q
from rest_framework.exceptions import NotFound

from sales.models import Enterprise


def visible_enterprises(user):
    qs = Enterprise.objects.all()
    if not user or not user.is_authenticated:
        return qs.none()
    role = getattr(user, "role", "")
    if user.is_superuser or role == "ADMIN":
        return qs
    if role == "KAM_MANAGER":
        return qs.filter(assigned_entity="KAM_OFFICE")
    if role == "SUPERVISOR":
        return qs.filter(assigned_entity="BACK_OFFICE")
    if role not in {"KAM", "SALESPERSON"}:
        return qs.none()
    direct = Q(assigned_kam=user) if role == "KAM" else Q(assigned_salesperson=user)
    return qs.filter(direct | Q(portfolio_assignments__user=user,
                                portfolio_assignments__is_active=True)).distinct()


def enterprise_identifier(value):
    text = str(value)
    for prefix in ("enterprise_profile_", "enterprise_", "account-"):
        if text.startswith(prefix):
            text = text[len(prefix):]
            break
    try:
        return int(text)
    except (ValueError, TypeError):
        raise NotFound("Compte introuvable.")


def require_visible_enterprise(user, value):
    pk = enterprise_identifier(value)
    if not visible_enterprises(user).filter(pk=pk).exists():
        raise NotFound("Compte introuvable.")
    return pk


def document_filter_for(user):
    """Fail closed for exports without an unambiguous authorized source relation."""
    from kam.models import KamVisitReport, PreCallBriefing
    enterprises = visible_enterprises(user)
    enterprise_ids = set(enterprises.values_list("pk", flat=True))
    report_ids = set(KamVisitReport.objects.filter(enterprise_id__in=enterprise_ids).values_list("pk", flat=True))
    briefing_ids = set(PreCallBriefing.objects.filter(enterprise_id__in=enterprise_ids).values_list("pk", flat=True))

    def allowed(doc):
        kind = doc.get("doc_type")
        meta = doc.get("metadata") or {}
        if kind == "service_catalog":
            return True
        if kind == "visit_report":
            return meta.get("report_id") in report_ids
        if kind == "precall_briefing":
            return meta.get("briefing_id") in briefing_ids
        if kind == "enterprise_profile":
            return meta.get("enterprise_id") in enterprise_ids
        return False
    return allowed
