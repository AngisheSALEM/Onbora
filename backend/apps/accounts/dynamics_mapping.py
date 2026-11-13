"""Correspondances prudentes depuis les métadonnées réelles Dataverse."""
import re
from urllib.parse import urlencode
from kam.integrations.dynamics.client import DataverseClientException


ALIASES = {
    'accounts': {
        'id': ('accountid',), 'name': ('name',), 'sector': ('industrycode', 'sector', 'secteur'),
        'employees': ('numberofemployees', 'employeecount', 'effectif'),
        'sites': ('sitecount', 'numberofsites', 'nombresites'),
        'revenue': ('revenue', 'annualrevenue'), 'currency': ('transactioncurrencyid',),
        'city': ('address1_city',), 'address': ('address1_line1',),
        'website': ('websiteurl',), 'owner': ('ownerid',),
        'description': ('description',),
        'tax_number': ('taxnumber', 'nif'), 'rccm': ('rccm',),
    },
    'contacts': {
        'id': ('contactid',), 'name': ('fullname',), 'account': ('parentcustomerid', 'accountid'),
        'role': ('jobtitle',), 'email': ('emailaddress1',), 'phone': ('telephone1', 'mobilephone'),
    },
    'offers': {
        'id': (), 'name': (), 'account': ('msdyn_account', 'accountid', 'customerid', 'enterpriseid'),
        'status': ('contractstatus', 'statutcontrat', 'statecode'),
        'bandwidth': ('bandwidthmbps', 'debitmbps'), 'licenses': ('activelicensescount', 'simcount', 'licensescount'),
        'monthly_cost': ('monthlycostmrr', 'monthlycost', 'monthlyfee'), 'currency': ('transactioncurrencyid',),
        'start_date': ('installationdate', 'activationdate', 'startdate'),
        'end_date': ('contractenddate', 'enddate', 'expirydate'), 'provider': ('provider', 'fournisseur'),
    },
    'opportunities': {
        'id': ('opportunityid',), 'name': ('name',), 'account': ('parentaccountid', 'customerid'),
        'amount': ('estimatedvalue',), 'currency': ('transactioncurrencyid',),
        'status': ('statecode',), 'close_date': ('estimatedclosedate',), 'description': ('description',),
    },
    'appointments': {
        'id': ('activityid',), 'name': ('subject',), 'account': ('regardingobjectid',),
        'start_date': ('scheduledstart',), 'end_date': ('scheduledend',),
        'description': ('description',), 'status': ('statecode',),
    },
}
STANDARD = {'accounts': 'account', 'contacts': 'contact', 'opportunities': 'opportunity', 'appointments': 'appointment'}
LOOKUPS = {'Lookup', 'Customer', 'Owner'}


def identifier(value):
    if not isinstance(value, str) or not re.fullmatch(r'[a-z][a-z0-9_]*', value):
        raise DataverseClientException('Nom de champ Dynamics invalide.')
    return value


def normal(value):
    return re.sub('[^a-z0-9]', '', value.lower())


def match_attribute(attributes, aliases):
    # Le nom exact prime ; un suffixe personnalisé n'est admis que s'il est unique.
    for alias in aliases:
        if alias in attributes:
            return attributes[alias]
    matches = [a for name, a in attributes.items()
               if normal(name.partition('_')[2]) in {normal(alias) for alias in aliases} and '_' in name]
    return matches[0] if len(matches) == 1 else None


def metadata_rows(client, path, kind, warnings):
    try:
        return list(client.read_collection(path))
    except DataverseClientException:
        if kind == 'accounts':
            raise
        warnings.append(f'{kind} : métadonnées inaccessibles ; vérifiez les droits de lecture.')
        return []


def discover(client, offer_entity=None):
    entities = list(client.read_collection('EntityDefinitions?$select=LogicalName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute'))
    result = {'scopes': {}, 'warnings': [], 'offer_entity': offer_entity}
    for kind, aliases in ALIASES.items():
        candidates = [e for e in entities if e.get('LogicalName') == STANDARD.get(kind)] if kind != 'offers' else [
            e for e in entities if e.get('LogicalName') == 'msdyn_customerasset'
            or normal(e.get('LogicalName', '').partition('_')[2]) in {'installedoffer', 'installedproduct', 'subscription', 'parcinstalle'}]
        if kind == 'offers' and offer_entity:
            identifier(offer_entity)
            candidates = [e for e in entities if e.get('LogicalName') == offer_entity]
        if len(candidates) != 1:
            result['warnings'].append(f'{kind} : table absente ou ambiguë ; import ignoré.')
            continue
        entity = candidates[0]
        logical = identifier(entity['LogicalName'])
        path = f"EntityDefinitions(LogicalName='{logical}')/Attributes"
        attributes = {a['LogicalName']: a for a in metadata_rows(client, path + '?$select=LogicalName,AttributeType,IsValidForRead', kind, result['warnings'])
                      if a.get('IsValidForRead') is not False}
        fields = {}
        for target, names in aliases.items():
            if target == 'id':
                names = (entity['PrimaryIdAttribute'],)
            elif target == 'name':
                names = (entity['PrimaryNameAttribute'],)
            attr = match_attribute(attributes, names)
            if attr:
                attr_name = identifier(attr['LogicalName'])
                fields[target] = f'_{attr_name}_value' if attr['AttributeType'] in LOOKUPS else attr_name
        required = {'id', 'name'} | ({'account'} if kind != 'accounts' else set())
        if not required.issubset(fields):
            result['warnings'].append(f'{kind} : champs indispensables manquants ; import ignoré.')
            continue
        # Vérifier que la relation cible bien une entreprise, jamais un contact ou un produit catalogue.
        polymorphic = False
        if kind != 'accounts':
            lookup_name = fields['account'][1:-6] if fields['account'].startswith('_') else ''
            lookups = metadata_rows(client, path + '/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,Targets', kind, result['warnings'])
            if not any(a['LogicalName'] == lookup_name and 'account' in a.get('Targets', []) for a in lookups):
                result['warnings'].append(f'{kind} : relation entreprise non vérifiée ; import ignoré.')
                continue
            polymorphic = any(a['LogicalName'] == lookup_name and len(a.get('Targets', [])) > 1 for a in lookups)
        states = {}
        if kind == 'offers' and fields.get('status') == 'statecode':
            try:
                state = client.read_page(f"EntityDefinitions(LogicalName='{logical}')/Attributes(LogicalName='statecode')/Microsoft.Dynamics.CRM.StateAttributeMetadata?$expand=OptionSet")
            except DataverseClientException:
                state = {}
                result['warnings'].append('offers : libellés des statuts indisponibles ; aucun statut actif ne sera supposé.')
            states = {str(o['Value']): o.get('InvariantName', '') for o in state.get('OptionSet', {}).get('Options', [])}
        missing = sorted(set(aliases) - set(fields))
        if missing:
            result['warnings'].append(f"{kind} : champs non disponibles : {', '.join(missing)}.")
        result['scopes'][kind] = {
            'entity': logical, 'entity_set': identifier(entity['EntitySetName']), 'fields': fields,
            'states': states, 'modified': 'modifiedon' if 'modifiedon' in attributes else None,
            'polymorphic_account': polymorphic,
        }
    if 'accounts' not in result['scopes']:
        raise DataverseClientException('Impossible de reconnaître la table des comptes Dynamics.')
    return result


def query_for(scope):
    columns = set(scope['fields'].values())
    if scope.get('modified'):
        columns.add(scope['modified'])
    return scope['entity_set'] + '?' + urlencode({'$select': ','.join(sorted(columns)), '$orderby': scope['fields']['id'] + ' asc'})


def mapped_record(scope, row):
    values = {}
    if scope.get('modified') and scope['modified'] in row:
        values['source_modified_at'] = row[scope['modified']]
    if row.get('@odata.etag'):
        values['source_version'] = row['@odata.etag']
    for target, field in scope['fields'].items():
        if field not in row:
            continue
        value = row[field]
        formatted = row.get(field + '@OData.Community.Display.V1.FormattedValue')
        if target in ('sector', 'provider') and formatted:
            value = formatted
        if target == 'owner' and formatted:
            values['owner_label'] = formatted
        values[target] = value
        if target == 'account':
            values['account_type'] = row.get(field + '@Microsoft.Dynamics.CRM.lookuplogicalname', '' if scope.get('polymorphic_account') else 'account')
        if target == 'status':
            values['status_label'] = scope.get('states', {}).get(str(value)) or formatted or (value if isinstance(value, str) else '')
    return values
