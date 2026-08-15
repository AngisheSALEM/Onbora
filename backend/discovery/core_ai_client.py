import os
import requests
from typing import Dict, Any, Optional

CORE_AI_URL = os.getenv("CORE_AI_URL", "http://localhost:8001/api/v1")


def is_core_ai_available() -> bool:
    """Check if the external Core AI microservice is online."""
    try:
        response = requests.get(f"{CORE_AI_URL}/health/", timeout=2)
        return response.status_code == 200
    except Exception:
        return False


import time
import uuid

def call_core_ai_turn(conversation_id: int, message: str, idempotency_key: str = "") -> Optional[Dict[str, Any]]:
    """Send a turn message to Core AI microservice."""
    try:
        url = f"{CORE_AI_URL}/conversations/{conversation_id}/turn/"
        if not idempotency_key:
            idempotency_key = f"turn-{conversation_id}-{int(time.time()*1000)}-{uuid.uuid4().hex[:6]}"
        payload = {
            "message": message,
            "idempotency_key": idempotency_key
        }
        res = requests.post(url, json=payload, timeout=20)
        if res.status_code == 200:
            return res.json()
        print(f"[CoreAI Client Error] Status {res.status_code}: {res.text}")
        return None
    except Exception as exc:
        print(f"[CoreAI Client Exception] {exc}")
        return None


def call_core_ai_quick_match(sector: str, needs: list, locations: list, company_name: str = "Entreprise") -> Optional[Dict[str, Any]]:
    """Perform quick profile matching against Orange catalog via Core AI service."""
    try:
        url = f"{CORE_AI_URL}/quick-match/"
        payload = {
            "sector": sector,
            "needs": needs,
            "locations": locations,
            "company_name": company_name
        }
        res = requests.post(url, json=payload, timeout=15)
        if res.status_code == 200:
            return res.json()
        return None
    except Exception:
        return None
