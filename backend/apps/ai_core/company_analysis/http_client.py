"""Bounded server-to-server client for the public Research API v2 contract."""
import json
import re
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit

import requests
from django.conf import settings
from jsonschema import Draft202012Validator, FormatChecker


class ResearchError(Exception):
    def __init__(self, code, retryable=False, retry_after=2):
        self.code, self.retryable = code, retryable
        self.retry_after = min(60, max(1, retry_after))
        super().__init__(code)


@lru_cache(maxsize=1)
def contract():
    path = Path(settings.BASE_DIR) / "resources/contracts/research-v2.schema.json"
    return json.loads(path.read_text(encoding="utf-8"))


def validate_contract(name, data):
    schema = contract()
    validator = Draft202012Validator({"$ref": f"#/$defs/{name}", "$defs": schema["$defs"]},
                                    format_checker=FormatChecker())
    if next(validator.iter_errors(data), None) is not None:
        raise ResearchError("invalid_research_response")


class ResearchHTTPClient:
    def __init__(self, base_url=None, token=None):
        self.base_url = (base_url or settings.ONBORA_ANALYSIS_URL).rstrip("/")
        self.token = token if token is not None else settings.ONBORA_RESEARCH_API_TOKEN
        parts = urlsplit(self.base_url)
        if (parts.scheme not in ("http", "https") or not parts.hostname or parts.username
                or parts.password or parts.path or parts.query or parts.fragment
                or (parts.scheme == "http" and parts.hostname not in ("127.0.0.1", "localhost", "::1"))):
            raise ResearchError("invalid_research_origin")

    def create(self, payload, key):
        validate_contract("ResearchRequest", payload)
        return self._request("POST", "/api/v2/research-jobs", payload, key)

    def get(self, job_id):
        if not re.fullmatch(r"job_[a-zA-Z0-9_]{1,36}", job_id):
            raise ResearchError("invalid_research_job_id")
        return self._request("GET", f"/api/v2/research-jobs/{job_id}")

    def _request(self, method, route, payload=None, key=None):
        if not self.token:
            raise ResearchError("research_not_configured")
        headers = {"Authorization": f"Bearer {self.token}", "Accept": "application/json"}
        if key:
            headers["Idempotency-Key"] = key
        try:
            with requests.request(method, self.base_url + route, json=payload, headers=headers,
                                  timeout=(3, 10), allow_redirects=False, stream=True) as response:
                delay = response.headers.get("Retry-After", "1")
                delay = min(60, max(1, int(delay))) if delay.isdigit() else 2
                if response.status_code not in (200, 202):
                    raise ResearchError(f"research_http_{response.status_code}",
                                        response.status_code in (429, 500, 502, 503, 504), delay)
                chunks, size = [], 0
                for chunk in response.iter_content(65536):
                    size += len(chunk)
                    if size > 2 * 1024 * 1024:
                        raise ResearchError("research_response_too_large")
                    chunks.append(chunk)
                data = json.loads(b"".join(chunks))
        except (requests.RequestException, TimeoutError):
            raise ResearchError("research_transport_unavailable", True) from None
        except (ValueError, UnicodeError):
            raise ResearchError("invalid_research_response") from None
        validate_contract("ResearchJob", data)
        if data["schema_version"] != "2.0":
            raise ResearchError("invalid_research_version")
        return data, delay
