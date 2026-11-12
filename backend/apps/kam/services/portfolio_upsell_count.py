"""Count dashboard opportunities without building detailed comparisons or pitches."""
from collections import defaultdict

from django.db.models import Count, Prefetch, Q
from django.db.models.functions import Lower

from sales.models import Enterprise, EnterpriseInstalledOffer
from kam.models import B2BNewsFeedItem
from .comparison_identity import distinct_peers
from .enterprise_comparison_service import EnterpriseComparisonService as Comparison


def count_portfolio_upsells(enterprises):
    if not enterprises:
        return 0
    sectors = {ent.sector for ent in enterprises if ent.sector}
    canonical = {Comparison.get_canonical_sector_key(sector) for sector in sectors}
    available = Enterprise.objects.exclude(sector="").order_by().values_list('sector', flat=True).distinct()
    matching = [sector for sector in available
                if sector and Comparison.get_canonical_sector_key(sector) in canonical]
    candidates = list(Enterprise.objects.filter(sector__in=matching).only(
        'name', 'sector', 'current_connectivity', 'employee_count', 'site_count',
        'incident_count', 'siren', 'crm_id', 'crm_record_id', 'rccm', 'nif', 'id_nat',
    ).prefetch_related(Prefetch('installed_offers', queryset=EnterpriseInstalledOffer.objects.filter(
        contract_status='ACTIVE').only('enterprise_id', 'contract_status', 'sector_pillar_id',
                                      'installed_offer_name', 'category', 'bandwidth_mbps'))))
    groups = defaultdict(list)
    for candidate in candidates:
        groups[candidate.sector].append(candidate)
    news = list(B2BNewsFeedItem.objects.annotate(company_key=Lower('discovered_company_name')).filter(
        Q(enterprise_id__in=[ent.pk for ent in enterprises])
        | Q(company_key__in=[ent.name.lower() for ent in enterprises])
    ).exclude(category='NEW_ACCOUNT', signal_score=0).order_by().values(
        'enterprise_id', 'company_key').annotate(total=Count('pk')))
    scores = {}

    def score(ent):
        if ent.pk not in scores:
            scores[ent.pk] = Comparison._compute_enterprise_scores(ent)['overall_score']
        return scores[ent.pk]

    total = 0
    for ent in enterprises:
        peers = distinct_peers(ent, groups.get(ent.sector, [])) if ent.sector else []
        if ent.sector and len(peers) < 3:
            key = Comparison.get_canonical_sector_key(ent.sector)
            peers = distinct_peers(ent, [candidate for sector, group in groups.items()
                                       if Comparison.get_canonical_sector_key(sector) == key
                                       for candidate in group])
        comparison_count = int(any(score(peer) > score(ent) for peer in peers))
        signal_count = min(2, sum(row['total'] for row in news
                                 if row['enterprise_id'] == ent.pk or row['company_key'] == ent.name.lower()))
        if comparison_count or signal_count:
            total += comparison_count + signal_count
        else:
            assessment = getattr(ent, 'churn_assessment', None)
            total += len(assessment.upsell_opportunities or []) if assessment else 0
    return total
