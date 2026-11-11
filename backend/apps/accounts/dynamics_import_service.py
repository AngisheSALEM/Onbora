"""File persistante, checkpoints par page et planification des imports Dynamics."""
import hashlib
import uuid
import logging
from urllib.parse import urlencode
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from kam.integrations.dynamics.client import DataverseClientException
from .models import DynamicsConnection, DynamicsImportRun
from .dynamics_service import DynamicsConnectionService
from .dynamics_mapping import discover, mapped_record, query_for
from .dynamics_import_records import upsert_record, ImportRecordError


ACTIVE = ('QUEUED', 'RUNNING')
KINDS = ('accounts', 'contacts', 'offers', 'opportunities', 'appointments')
SAFE_ERROR = 'Import interrompu. Vérifiez la connexion et les droits de lecture dans Dynamics, puis relancez l’import.'
logger = logging.getLogger(__name__)


def source_key(config):
    return hashlib.sha256(f'{config.tenant_id}|{config.resource_url}'.encode()).hexdigest()


def describe_run(run):
    if run is None:
        return None
    return {key: getattr(run, key) for key in (
        'id', 'status', 'counts', 'warnings', 'error', 'started_at', 'finished_at', 'created_at',
    )} | {'phase': run.cursor.get('kind'), 'pages': run.cursor.get('pages', 0)}


@transaction.atomic
def enqueue():
    config = DynamicsConnection.objects.select_for_update().filter(pk=1).first()
    if not config or not config.verified_at:
        raise DataverseClientException('Testez et validez la connexion avant l’import.')
    existing = DynamicsImportRun.objects.filter(status__in=ACTIVE).first()
    if existing:
        return existing
    run = DynamicsImportRun.objects.create(source_revision=config.updated_at)
    config.next_import_at = timezone.now() + timedelta(minutes=config.import_interval_minutes)
    config.save(update_fields=['next_import_at'])
    return run


@transaction.atomic
def schedule_due():
    config = DynamicsConnection.objects.select_for_update().filter(
        pk=1, auto_import_enabled=True, verified_at__isnull=False,
    ).first()
    if not config or (config.next_import_at and config.next_import_at > timezone.now()):
        return
    enqueue()


@transaction.atomic
def claim():
    now = timezone.now()
    candidate = DynamicsImportRun.objects.filter(
        Q(status='QUEUED') | Q(status='RUNNING', lease_until__lt=now),
    ).order_by('created_at').first()
    if candidate is None:
        return None
    token = uuid.uuid4()
    won = DynamicsImportRun.objects.filter(pk=candidate.pk).filter(
        Q(status='QUEUED') | Q(status='RUNNING', lease_until__lt=now),
    ).update(status='RUNNING', lease_token=token, lease_until=now + timedelta(minutes=20), started_at=candidate.started_at or now)
    if not won:
        return None
    candidate.refresh_from_db()
    return candidate


def currency_codes(client):
    return {str(row['transactioncurrencyid']): row['isocurrencycode'] for row in client.read_collection(
        'transactioncurrencies?$select=transactioncurrencyid,isocurrencycode',
    )}


def initialize(run, config, client):
    mapping = discover(client, config.import_mapping.get('offer_entity'))
    run.mapping = mapping
    run.warnings = list(mapping.get('warnings', []))
    try:
        run.mapping['currencies'] = currency_codes(client)
    except DataverseClientException:
        run.mapping['currencies'] = {}
        run.warnings.append('Devises indisponibles : montants conservés dans les données CRM, sans conversion en USD.')
    run.cursor = {'kind': 'accounts', 'next': query_for(mapping['scopes']['accounts']), 'pages': 0}
    DynamicsConnection.objects.filter(pk=1, updated_at=config.updated_at).update(import_mapping=mapping)


def owner_emails(run, client, page):
    if run.cursor['kind'] != 'accounts':
        return {}
    field = run.mapping['scopes']['accounts']['fields'].get('owner')
    ids = set()
    for row in page['value']:
        if field and row.get(field):
            try:
                ids.add(str(uuid.UUID(row[field])))
            except ValueError:
                pass
    if not ids:
        return {}
    try:
        path = 'systemusers?' + urlencode({'$select': 'systemuserid,internalemailaddress', '$filter': ' or '.join(f'systemuserid eq {key}' for key in sorted(ids))})
        return {str(row['systemuserid']): row.get('internalemailaddress', '') for row in client.read_collection(path)}
    except DataverseClientException:
        warning = 'Responsables CRM indisponibles : les affectations KAM locales sont conservées.'
        if warning not in run.warnings:
            run.warnings.append(warning)
        return {}


def apply_page(run, config, page, owners):
    kind = run.cursor['kind']
    scope = run.mapping['scopes'][kind]
    count = run.counts.setdefault(kind, {'imported': 0, 'skipped': 0})
    for row in page['value']:
        try:
            values = mapped_record(scope, row)
            if kind == 'accounts' and values.get('owner'):
                values['owner_email'] = owners.get(str(values['owner']))
            upsert_record(source_key(config), kind, scope, values, run.mapping.get('currencies', {}))
            count['imported'] += 1
        except (ImportRecordError, ValueError) as exc:
            # Aucun contenu client brut ni identifiant sensible dans les erreurs présentées.
            count['skipped'] += 1
            warning = f'{kind} : ligne ignorée ({str(exc) if isinstance(exc, ImportRecordError) else "format incompatible"}).'
            if warning not in run.warnings and len(run.warnings) < 50:
                run.warnings.append(warning)


def advance(run, page):
    run.cursor['pages'] += 1
    visited = run.cursor.setdefault('visited', [])
    visited.append(hashlib.sha256(run.cursor['next'].encode()).hexdigest())
    next_link = page.get('@odata.nextLink')
    if next_link:
        if hashlib.sha256(next_link.encode()).hexdigest() in visited or len(visited) >= 10000:
            raise DataverseClientException('Pagination Dynamics répétée.')
        run.cursor['next'] = next_link
        return
    remaining = [kind for kind in KINDS[KINDS.index(run.cursor['kind']) + 1:] if kind in run.mapping['scopes']]
    if remaining:
        kind = remaining[0]
        run.cursor.update(kind=kind, next=query_for(run.mapping['scopes'][kind]))
    else:
        run.status = 'PARTIAL' if run.warnings else 'SUCCEEDED'
        run.finished_at = timezone.now()
        run.cursor['next'] = None


def process_next_import():
    schedule_due()
    run = claim()
    if run is None:
        return False
    try:
        config = DynamicsConnection.objects.get(pk=1)
        if config.updated_at != run.source_revision or not config.verified_at:
            raise DataverseClientException('Configuration CRM modifiée pendant l’import.')
        client = DynamicsConnectionService.client()
        if not run.mapping:
            initialize(run, config, client)
        page = client.read_page(run.cursor['next'])
        if not isinstance(page.get('value'), list):
            raise DataverseClientException('Page Dynamics invalide.')
        owners = owner_emails(run, client, page)
        with transaction.atomic():
            locked = DynamicsImportRun.objects.select_for_update().get(pk=run.pk)
            current = DynamicsConnection.objects.select_for_update().get(pk=1)
            if locked.lease_token != run.lease_token:
                return True
            if current.updated_at != run.source_revision or not current.verified_at:
                raise DataverseClientException('Configuration CRM modifiée pendant l’import.')
            apply_page(run, config, page, owners)
            advance(run, page)
            # Relâcher le bail entre les pages ; un autre worker peut reprendre au checkpoint.
            run.lease_until = timezone.now() - timedelta(seconds=1)
            run.save()
    except Exception as exc:
        logger.warning('Import Dynamics #%s interrompu (%s).', run.pk, type(exc).__name__)
        # Ne pas recopier les réponses distantes ou les données de contacts dans les logs.
        DynamicsImportRun.objects.filter(pk=run.pk, lease_token=run.lease_token).update(
            status='FAILED', error=SAFE_ERROR, finished_at=timezone.now(), lease_until=None,
        )
    return True
