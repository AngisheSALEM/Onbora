from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, Optional, Type, TypeVar
from django.conf import settings
from pydantic import BaseModel, ValidationError

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
        self.model_name = model_name or getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash-lite")
        if "gemini-2.5" in self.model_name:
            self.model_name = "gemini-3.5-flash-lite"
        self._client = None
        self._init_client()

    def _init_client(self) -> None:
        if self.api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
                logger.info("[BaseAIEngine] Client Gemini initialise avec le modele %s", self.model_name)
            except Exception as exc:
                logger.warning("[BaseAIEngine] Erreur initialisation Gemini (%s), fallback actif.", exc)
                self._client = None

    def call_gemini_json(self, prompt: str, system_instruction: str = "") -> Optional[Dict[str, Any]]:
        if not self._client:
            return None
        try:
            from google.genai import types
            config_kwargs = {
                "response_mime_type": "application/json",
                "temperature": 0.2,
            }
            if system_instruction:
                config_kwargs["system_instruction"] = system_instruction

            resp = self._client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(**config_kwargs)
            )
            if resp and resp.text:
                return extract_json_payload(resp.text)
        except Exception as exc:
            logger.warning("[BaseAIEngine] Appel Gemini echoue (%s), bascule sur le fallback local.", exc)
            return None
        return None

    def parse_output(self, raw_output: str, schema_cls: Type[T]) -> T:
        payload = extract_json_payload(raw_output)
        try:
            return schema_cls.model_validate(payload)
        except ValidationError as exc:
            logger.warning("Erreur validation Pydantic : %s", exc)
            raise exc
