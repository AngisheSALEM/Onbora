"""Read-only sector analysis from recorded offers and confirmed KAM needs."""
from django.db.models import Prefetch
from django.utils import timezone

from kam.models import KamVisitReport
from sales.models import Enterprise, EnterpriseInstalledOffer


def get_sector_analytics(user):
    """Load a scoped portfolio with three queries, independent of its size."""
    enterprises = Enterprise.objects.filter(assigned_kam__isnull=False)
    reports = KamVisitReport.objects.only('enterprise_id', 'confirmed_needs')
    if user.role == 'KAM' and not user.is_superuser:
        enterprises = enterprises.filter(assigned_kam=user)
        reports = reports.filter(kam=user)
    enterprises = enterprises.only('id', 'name', 'sector', 'conversion_status').prefetch_related(
        Prefetch('installed_offers', queryset=EnterpriseInstalledOffer.objects.filter(
            contract_status='ACTIVE',
        ).only('enterprise_id', 'category', 'contract_end_date'), to_attr='analytics_offers'),
        Prefetch('kam_visit_reports', queryset=reports, to_attr='analytics_reports'),
    ).order_by('name', 'id')
    accounts = []
    for enterprise in enterprises:
        needs = set()
        for report in enterprise.analytics_reports:
            if isinstance(report.confirmed_needs, list):
                needs.update(' '.join(need.split()).casefold() for need in report.confirmed_needs
                             if isinstance(need, str) and need.strip())
        accounts.append({
            'id': str(enterprise.pk),
            'name': enterprise.name,
            'sector': ' '.join((enterprise.sector or '').split()) or 'Secteur non renseigné',
            'status': enterprise.conversion_status,
            'needs': sorted(needs),
            'offers': [{
                'category': offer.category.strip().upper(),
                'end_date': offer.contract_end_date.isoformat() if offer.contract_end_date else None,
            } for offer in enterprise.analytics_offers],
        })
    return {'accounts': accounts, 'generated_at': timezone.now().isoformat(),
            'today': timezone.localdate().isoformat()}
