from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, Optional, Type, TypeVar
from django.conf import settings
from pydantic import BaseModel, ValidationError
from .inference import generate_with_budget

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


def extract_json_payload(raw_text: str) -> Dict[str, Any]:
    """
    Extrait un dictionnaire JSON valide depuis un texte genere par un LLM.
    Gere les blocs markdown ```json ... ```, les espaces et textes environnants.
    """
    text = raw_text.strip()

    if "```" in text:
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if match:
            text = match.group(1).strip()

    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        text = text[first_brace: last_brace + 1]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    cleaned = re.sub(r",\s*([}\]])", r"\1", text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("Impossible d'extraire un JSON valide depuis la reponse LLM. Extrait : %s", text[:300])
        raise exc


class BaseAIEngine:
    """
    Classe de base d'execution IA pour tous les moteurs Onbora Core AI.
    Centralise l'appel a Google Gemini, l'extraction JSON et les fallbacks.
    """

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None) -> None:
        self.api_key = api_key or getattr(settings, "GEMINI_API_KEY", "")
        self.model_name = model_name or getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash")
        self.last_inference_status = {'status': 'not_requested', 'model': self.model_name}
        self._client = None
        self._init_client()

    def _init_client(self) -> None:
        if self.api_key:
            try:
                from google import genai
                from google.genai import types
                self._client = genai.Client(
                    api_key=self.api_key,
                    http_options=types.HttpOptions(
                        timeout=20_000,
                        retry_options=types.HttpRetryOptions(attempts=1),
                    ),
                )
                logger.info("[BaseAIEngine] Client Gemini initialise avec le modele %s", self.model_name)
            except Exception as exc:
                logger.warning("[BaseAIEngine] Erreur initialisation Gemini (%s), fallback actif.", exc)
                self._client = None

    def call_gemini_json(self, prompt: str, system_instruction: str = "") -> Optional[Dict[str, Any]]:
        if not self._client:
            self.last_inference_status = {'status': 'unavailable', 'model': self.model_name}
            return None
        try:
            from google.genai import types
            config_kwargs = {
                "response_mime_type": "application/json",
                "temperature": 0.2,
                "max_output_tokens": 4096,
            }
            if system_instruction:
                config_kwargs["system_instruction"] = system_instruction

            response = generate_with_budget(
                self._client, model=self.model_name, contents=prompt,
                config=types.GenerateContentConfig(**config_kwargs),
                budget_ms=getattr(settings, "AI_INFERENCE_BUDGET_MS", 20000),
                fallback_models=getattr(settings, "AI_FALLBACK_MODELS", ()))
            if response and response.text:
                payload = extract_json_payload(response.text)
                actual_model = getattr(response, 'model_version', None) or self.model_name
                self.last_inference_status = {'status': 'generated', 'model': actual_model}
                return payload if isinstance(payload, dict) else None
            self.last_inference_status = {'status': 'empty_response', 'model': self.model_name}
        except Exception as exc:
            self.last_inference_status = {'status': 'failed', 'model': self.model_name,
                                          'code': getattr(exc, 'code', None)}
            logger.warning("[BaseAIEngine] Erreur globale Gemini (%s), bascule sur le fallback local.", exc)
            return None
        return None

    def parse_output(self, raw_output: str, schema_cls: Type[T]) -> T:
        payload = extract_json_payload(raw_output)
        try:
            return schema_cls.model_validate(payload)
        except ValidationError as exc:
            logger.warning("Erreur validation Pydantic : %s", exc)
            raise exc
