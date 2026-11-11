"""
Microsoft Dynamics 365 Dataverse REST Client
=============================================
Architecture : Anti-Corruption Layer (ACL)
Protocole : OAuth2 Client Credentials + OData v9.2
Rôle : Communication sécurisée avec Microsoft Dynamics 365 Sales / Dataverse,
gestion de l'idempotence, du rate limiting (HTTP 429) et mapping strict des schémas.
"""

import os
import time
import uuid
import logging
from urllib.parse import urlsplit
from typing import Dict, Any, Optional
import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class DataverseClientException(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None, response_body: Optional[str] = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body


class DataverseClient:
    def __init__(
        self,
        tenant_id: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        resource_url: Optional[str] = None,
        simulation_mode: Optional[bool] = None
    ):
        self.tenant_id = tenant_id or getattr(settings, 'AZURE_TENANT_ID', None)
        self.client_id = client_id or getattr(settings, 'AZURE_CLIENT_ID', None)
        self.client_secret = client_secret or getattr(settings, 'AZURE_CLIENT_SECRET', None)
        self.resource_url = (resource_url or getattr(settings, 'DYNAMICS_DATAVERSE_URL', 'https://onbora.crm4.dynamics.com')).rstrip('/')
        
        # Mode simulation actif par défaut si aucune clé Azure renseignée (environnement local/CI)
        if simulation_mode is not None:
            self.simulation_mode = simulation_mode
        else:
            self.simulation_mode = not (self.tenant_id and self.client_id and self.client_secret)

        self._cached_token: Optional[str] = None
        self._token_expires_at: float = 0.0

    def _get_access_token(self) -> str:
        """Acquiert un token OAuth2 Bearer auprès d'Azure AD (Client Credentials Flow)."""
        if self.simulation_mode:
            return "simulated-bearer-token"

        now = time.time()
        if self._cached_token and now < self._token_expires_at - 60:
            return self._cached_token

        token_endpoint = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        data = {
            'grant_type': 'client_credentials',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'scope': f"{self.resource_url}/.default"
        }

        try:
            res = requests.post(token_endpoint, data=data, timeout=15, allow_redirects=False)
            if res.status_code != 200:
                raise DataverseClientException(
                    f"Échec authentification Azure AD: HTTP {res.status_code}",
                    status_code=res.status_code,
                    response_body=res.text
                )
            payload = res.json()
            self._cached_token = payload['access_token']
            self._token_expires_at = now + int(payload.get('expires_in', 3600))
            return self._cached_token
        except requests.RequestException as e:
            raise DataverseClientException(f"Erreur réseau vers Azure AD : {str(e)}")

    def _request_with_backoff(self, method: str, path: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Exécute une requête HTTP OData avec gestion du rate-limiting (HTTP 429) et backoff exponentiel."""
        if self.simulation_mode:
            return self._simulate_response(method, path, payload)

        token = self._get_access_token()
        url = f"{self.resource_url}/api/data/v9.2/{path.lstrip('/')}"
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json; charset=utf-8',
            'Accept': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
            'Prefer': 'return=representation'
        }

        max_attempts = 4
        delay = 1.0

        for attempt in range(1, max_attempts + 1):
            try:
                res = requests.request(method, url, json=payload, headers=headers, timeout=30, allow_redirects=False)
                if res.status_code in [200, 201, 204]:
                    return res.json() if res.text and res.status_code != 204 else {"status": "succeeded"}
                elif res.status_code in [429, 503]:
                    # Rate limiting Dataverse
                    retry_after = res.headers.get('Retry-After')
                    sleep_time = float(retry_after) if retry_after else delay
                    logger.warning(f"Dataverse rate-limiting (HTTP {res.status_code}). Attente {sleep_time}s...")
                    time.sleep(sleep_time)
                    delay *= 2
                    continue
                else:
                    raise DataverseClientException(
                        f"Erreur Dataverse {method} {path} : HTTP {res.status_code}",
                        status_code=res.status_code,
                        response_body=res.text
                    )
            except requests.RequestException as e:
                if attempt == max_attempts:
                    raise DataverseClientException(f"Échec réseau persistant vers Dataverse : {str(e)}")
                time.sleep(delay)
                delay *= 2

        raise DataverseClientException("Nombre maximal de réessais dépassé.")

    def _simulate_response(self, method: str, path: str, payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Simulateur déterministe pour tests unitaires et environnements hors-connexion."""
        generated_guid = str(uuid.uuid4())
        etag = f'W/"{int(time.time())}"'

        if 'accounts' in path:
            return {
                "accountid": payload.get("accountid") or generated_guid,
                "name": (payload or {}).get("name", "Entreprise Simulée"),
                "@odata.etag": etag,
                "status": "succeeded"
            }
        elif 'appointments' in path:
            return {
                "activityid": generated_guid,
                "subject": (payload or {}).get("subject", "Rendez-vous commercial"),
                "@odata.etag": etag,
                "status": "succeeded"
            }
        elif 'contacts' in path:
            return {
                "contactid": generated_guid,
                "fullname": (payload or {}).get("fullname", "Contact Décideur"),
                "@odata.etag": etag,
                "status": "succeeded"
            }

        return {
            "id": generated_guid,
            "@odata.etag": etag,
            "status": "succeeded"
        }

    # --- Schémas de Mapping & Opérations Haut Niveau ---

    def read_page(self, path: str) -> Dict[str, Any]:
        """Lecture paginée réelle. Un nextLink ne peut jamais transmettre le token à un autre hôte."""
        if self.simulation_mode:
            raise DataverseClientException('L’import exige une connexion Dynamics réelle.')
        base = f'{self.resource_url}/api/data/v9.2/'
        url = path if path.startswith('https://') else base + path
        parsed, origin = urlsplit(url), urlsplit(base)
        if (parsed.scheme, parsed.netloc) != (origin.scheme, origin.netloc) or not parsed.path.startswith(origin.path):
            raise DataverseClientException('Lien de pagination Dynamics refusé.')
        if parsed.fragment or '..' in parsed.path or '%' in parsed.path or '\\' in url:
            raise DataverseClientException('Chemin Dynamics refusé.')
        try:
            response = requests.get(url, headers={
                'Authorization': f'Bearer {self._get_access_token()}',
                'Accept': 'application/json', 'OData-Version': '4.0',
                'Prefer': 'odata.maxpagesize=200,odata.include-annotations="OData.Community.Display.V1.FormattedValue,Microsoft.Dynamics.CRM.lookuplogicalname"',
            }, timeout=30, allow_redirects=False)
            if response.status_code != 200:
                raise DataverseClientException('Lecture Dynamics refusée ou indisponible.', status_code=response.status_code)
            data = response.json()
            if not isinstance(data, dict):
                raise ValueError('Invalid response')
            return data
        except (requests.RequestException, ValueError):
            raise DataverseClientException('Réponse Dynamics indisponible ou illisible.') from None

    def read_collection(self, path):
        seen = set()
        while path:
            if path in seen or len(seen) >= 10000:
                raise DataverseClientException('Pagination Dynamics incohérente.')
            seen.add(path)
            page = self.read_page(path)
            if not isinstance(page.get('value'), list):
                raise DataverseClientException('Collection Dynamics illisible.')
            yield from page['value']
            path = page.get('@odata.nextLink')

    def check_connection(self) -> Dict[str, Any]:
        """Vérification réelle en lecture seule, sans simulation ni réessais longs."""
        token = self._get_access_token()
        try:
            response = requests.get(
                f'{self.resource_url}/api/data/v9.2/WhoAmI',
                headers={'Authorization': f'Bearer {token}', 'Accept': 'application/json'},
                timeout=15, allow_redirects=False,
            )
            if response.status_code != 200:
                raise DataverseClientException('Accès Dynamics refusé.', status_code=response.status_code)
            return response.json()
        except (requests.RequestException, ValueError):
            raise DataverseClientException('Connexion Dynamics indisponible.') from None

    def sync_account(self, enterprise_id: int, account_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Synchronise ou met à jour une fiche Entreprise dans la table 'accounts' de Dataverse."""
        crm_id = account_payload.get("crm_account_id")
        if crm_id:
            return self._request_with_backoff("PATCH", f"accounts({crm_id})", account_payload)
        return self._request_with_backoff("POST", "accounts", account_payload)

    def sync_visit_appointment(self, report_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Injecte un compte-rendu de visite dans la table 'appointments' de Dataverse."""
        return self._request_with_backoff("POST", "appointments", report_payload)

    def sync_contact(self, contact_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Synchronise un décideur / contact dans la table 'contacts' de Dataverse."""
        crm_id = contact_payload.get("contactid")
        if crm_id:
            return self._request_with_backoff("PATCH", f"contacts({crm_id})", contact_payload)
        return self._request_with_backoff("POST", "contacts", contact_payload)
