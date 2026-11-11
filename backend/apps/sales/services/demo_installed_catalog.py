"""Parcs de démonstration reproductibles, tirés du catalogue local publié."""
import hashlib
import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from apps.ai_core.catalog import load_catalog
from apps.ai_core.services.sector_rules_compiler import DEFAULT_CATALOG_PATH
from catalog.models import ServiceCatalog
from kam.services.enterprise_comparison_service import EnterpriseComparisonService
from sales.models import Enterprise, EnterpriseInstalledOffer


MARKER = 'catalog_demo_v1'


def eligible_demo_accounts():
    return Enterprise.objects.filter(
        Q(crm_id__regex=r'^CRM-CD-[0-9]{4}$') | Q(crm_id__startswith='DEMO-KAM-'),
        crm_record__isnull=True, crm_projection__isnull=True, dynamics_records__isnull=True,
    ).distinct()


def catalog_services():
    catalog = load_catalog(DEFAULT_CATALOG_PATH)
    definitions = {s.service_id: s for s in catalog.services
                   if s.portfolio_scope == 'rdc' and s.rdc_availability == 'published_local'}
    if not definitions:
        raise CommandError('Le catalogue ne contient aucune offre locale publiée.')
    by_name = {s.name: s for s in ServiceCatalog.objects.filter(name__in=[s.name for s in definitions.values()]).order_by('-pk')}
    for service in definitions.values():
        if service.name not in by_name:
            category = ServiceCatalog.CONNECTIVITY
            if 'cyber' in service.category.lower():
                category = ServiceCatalog.SECURITY
            elif 'cloud' in service.category.lower() or 'datacenter' in service.category.lower():
                category = ServiceCatalog.CLOUD
            elif 'money' in service.category.lower():
                category = ServiceCatalog.PAYMENT
            by_name[service.name] = ServiceCatalog.objects.create(
                name=service.name, category=category, description=service.description,
                benefits='\n'.join(service.allowed_benefits),
                technical_requirements={'catalog_service_id': service.service_id},
            )
    return catalog.catalog_version, definitions, by_name


def choose_offers(enterprise, definitions):
    rng = random.Random(int(hashlib.sha256(enterprise.crm_id.encode()).hexdigest()[:16], 16))
    sector = EnterpriseComparisonService.get_canonical_sector_key(enterprise.sector)
    available = {key: s for key, s in definitions.items()
                 if sector not in s.match.excluded_sectors and (not s.match.sectors or sector in s.match.sectors)}
    pillars = EnterpriseComparisonService.get_sector_policy(enterprise.sector).get('pillars', [])
    chosen = []
    if enterprise.segment == 'TPE_INFORMEL':
        base = [key for key in ('airbox_4g', 'business_box', 'office_box') if key in available]
    else:
        base = [key for key in ('internet_fibre_illimite', 'liaison_specialisee_internet') if key in available]
    if base:
        chosen.append(('connectivity', rng.choice(base)))
    for pillar in pillars:
        if pillar['id'] == 'connectivity' or len(chosen) >= (2 if enterprise.segment == 'TPE_INFORMEL' else 4):
            continue
        candidates = [s['id'] for s in pillar.get('catalog_services', [])
                      if s['id'] in available and s['id'] not in {key for _, key in chosen}]
        if candidates and rng.random() < (0.75 if enterprise.segment == 'GRAND_COMPTE' else 0.55):
            chosen.append((pillar['id'], rng.choice(candidates)))
    return chosen, rng


def offer_values(enterprise, definition, service, pillar, rng):
    today = timezone.localdate()
    is_access = definition.service_id in {'internet_fibre_illimite', 'liaison_specialisee_internet', 'business_box', 'office_box', 'airbox_4g'}
    bandwidth = None
    if is_access:
        choices = [10, 20, 30] if enterprise.segment == 'TPE_INFORMEL' else ([30, 50, 100] if enterprise.segment == 'PME' else [100, 200, 500])
        bandwidth = rng.choice(choices)
    mobile = definition.service_id in {'essentiel_m2m', 'business_gfu', 'business_flex', 'business_mix_pro'}
    licenses = max(1, round((enterprise.employee_count or 5) * rng.uniform(0.02, 0.08))) if mobile else (
        max(1, round((enterprise.employee_count or 5) * rng.uniform(0.3, 0.8))) if 'microsoft_365' in definition.service_id else None
    )
    return {
        'enterprise': enterprise, 'service': service, 'installed_offer_name': definition.name,
        'sector_pillar_id': pillar, 'category': definition.category[:50], 'provider': 'ORANGE_BUSINESS',
        'contract_status': 'ACTIVE', 'installation_date': today - timedelta(days=rng.randint(90, 600)),
        'contract_end_date': today + timedelta(days=rng.choice([20, 45, 120, 240, 330])),
        'monthly_cost_mrr': Decimal(rng.choice([35, 60, 100]) if enterprise.segment == 'TPE_INFORMEL' else rng.choice([150, 300, 650, 1200])),
        'bandwidth_mbps': bandwidth, 'active_licenses_count': licenses,
        'unresolved_tickets_count': rng.choice([0, 0, 0, 1]), 'is_demo': True,
    }


@transaction.atomic
def seed_installed_catalog(accounts=None):
    version, definitions, db_services = catalog_services()
    eligible = eligible_demo_accounts()
    if accounts is not None:
        eligible = eligible.filter(pk__in=accounts.values('pk'))
    enterprises = list(eligible.prefetch_related('installed_offers').order_by('crm_id'))
    created = updated = skipped = 0
    for enterprise in enterprises:
        # Un parc saisi à la main ou importé reste prioritaire sur le scénario de démonstration.
        if any(not offer.is_demo for offer in enterprise.installed_offers.all()):
            skipped += 1
            continue
        selected, rng = choose_offers(enterprise, definitions)
        keys = []
        access_label = ''
        for pillar, service_id in selected:
            definition = definitions[service_id]
            key = f'{MARKER}:{enterprise.crm_id}:{service_id}'
            keys.append(key)
            defaults = offer_values(enterprise, definition, db_services[definition.name], pillar, rng)
            _, new = EnterpriseInstalledOffer.objects.update_or_create(demo_key=key, defaults=defaults)
            created += int(new)
            updated += int(not new)
            if pillar == 'connectivity':
                access_label = f'{definition.name} {defaults["bandwidth_mbps"]} Mbps'
        EnterpriseInstalledOffer.objects.filter(enterprise=enterprise, is_demo=True, demo_key__startswith=MARKER + ':').exclude(demo_key__in=keys).delete()
        data = dict(enterprise.existing_crm_data or {})
        data['catalog_demo'] = {'seed': MARKER, 'catalog_version': version, 'is_demo': True}
        Enterprise.objects.filter(pk=enterprise.pk).update(
            existing_crm_data=data, current_connectivity=access_label,
            ai_churn_data={}, ai_scored_at=None,
        )
    return {'accounts': len(enterprises) - skipped, 'created': created, 'updated': updated, 'skipped': skipped}
