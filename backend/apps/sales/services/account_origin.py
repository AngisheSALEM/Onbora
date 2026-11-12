"""Account service provenance shared by portfolio and news serializers."""


def account_origin(enterprise):
    if enterprise is None:
        return {'code': 'WEB', 'label': 'Veille web'}
    imported = getattr(enterprise, 'seed_import', None)
    if imported and imported.payload.get('kind') == 'lead':
        return {'code': 'ANALYSIS', 'label': 'Onbora Analysis'}
    if enterprise.crm_record_id or enterprise.crm_id or (imported and imported.payload.get('kind') == 'company'):
        return {'code': 'CRM', 'label': 'CRM'}
    return {'code': 'ONBORA', 'label': 'Onbora'}
