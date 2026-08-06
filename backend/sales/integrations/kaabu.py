import os
import requests
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)

class KaabuClient:
    def __init__(self):
        self.api_url = os.getenv("KAABU_API_URL", "https://kaabu.wiremockapi.cloud").rstrip("/")
        self.client_id = os.getenv("KAABU_CLIENT_ID", "mock-client-id")
        self.client_secret = os.getenv("KAABU_CLIENT_SECRET", "mock-client-secret")
        self.cache_key = "kaabu_access_token"

    def get_access_token(self):
        """
        Retrieves the access token, using the cached one if still valid.
        """
        token = cache.get(self.cache_key)
        if token:
            return token

        # If not cached, fetch it from the OAuth2 endpoint
        token_url = f"{self.api_url}/oauth/token"
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret
        }
        try:
            response = requests.post(token_url, json=payload, timeout=10)
            response.raise_for_status()
            data = response.json()
            access_token = data.get("access_token")
            expires_in = data.get("expires_in", 3600)  # default to 1 hour
            
            # Cache the token (subtract a buffer of 60 seconds)
            cache.set(self.cache_key, access_token, max(expires_in - 60, 60))
            return access_token
        except Exception as e:
            logger.error(f"Error fetching Kaabu access token: {e}")
            # Fallback to mock token for local testing if API is unreachable
            return "mock-jwt-token"

    def get_auth_headers(self):
        token = self.get_access_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def search_organizations(self, name=None, siren=None, domain=None):
        """
        Queries Kaabu's search API.
        """
        search_url = f"{self.api_url}/api/v1/organizations/search/"
        params = {}
        if name:
            params["name"] = name
        if siren:
            params["siren"] = siren
        if domain:
            params["domain"] = domain

        try:
            response = requests.get(search_url, params=params, headers=self.get_auth_headers(), timeout=10)
            response.raise_for_status()
            return response.json()  # Expecting a list of matched organizations
        except Exception as e:
            logger.error(f"Error searching organization in Kaabu: {e}")
            return []

    def create_or_update_opportunity(self, opportunity_data):
        """
        Pushes a new or updated opportunity to Kaabu CRM.
        """
        opp_url = f"{self.api_url}/api/v1/opportunities/"
        
        # If opportunity_id is specified in data, we can call PUT or PATCH to update it
        opp_id = opportunity_data.get("id")
        method = "POST"
        url = opp_url
        if opp_id:
            method = "PATCH"
            url = f"{opp_url}{opp_id}/"

        try:
            response = requests.request(
                method, 
                url, 
                json=opportunity_data, 
                headers=self.get_auth_headers(), 
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error syncing opportunity to Kaabu: {e}")
            return None
