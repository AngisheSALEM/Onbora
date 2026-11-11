"""Exclusion des fiches représentant une même entreprise dans le comparatif."""
import re
import unicodedata


def normalized(value):
    text = unicodedata.normalize('NFKD', str(value or '').casefold())
    return re.sub(r'[^a-z0-9]', '', ''.join(char for char in text if not unicodedata.combining(char)))


def identity_keys(enterprise):
    keys = {('pk', enterprise.pk)}
    for field in ('name', 'crm_id', 'crm_record_id', 'rccm', 'nif', 'siren', 'id_nat'):
        value = normalized(getattr(enterprise, field, None))
        if value and value not in {'na', 'none', 'inconnu', 'nonrenseigne', 'sansnom', '0'}:
            keys.add((field, value))
    return keys


def same_enterprise(first, second):
    return bool(identity_keys(first) & identity_keys(second))


def distinct_peers(source, candidates):
    # Conserver en priorité la fiche renseignée lorsqu'un pair possède plusieurs fiches.
    candidates = sorted(candidates, key=lambda e: (
        not any(o.contract_status == 'ACTIVE' for o in e.installed_offers.all()),
        not bool(e.crm_record_id or e.crm_id), e.pk,
    ))
    seen = identity_keys(source)
    result = []
    for candidate in candidates:
        keys = identity_keys(candidate)
        if not keys & seen:
            result.append(candidate)
            seen.update(keys)
    return result
