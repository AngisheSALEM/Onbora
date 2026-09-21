"""
Service de transcription audio unifié pour Onbora Core AI.

Remplace OpenAI Whisper par Google Gemini multimodal (SDK google-genai déjà installé).
Supporte les formats : WebM, MP3, WAV, M4A, OGG.

Architecture : Ce service est la source unique de vérité pour toute transcription
audio dans Onbora. Il est consommé par :
  - apps.sales.whisper_service (wrapper de compatibilité)
  - apps.discovery.views (messages vocaux clients B2B)
  - apps.ai_core.views (endpoint DRF /api/ai/transcribe/)
"""
from __future__ import annotations

import base64
import logging
import mimetypes
import os
from typing import Any, Dict

logger = logging.getLogger(__name__)

# Correspondance extension -> MIME type pour les formats audio courants
_AUDIO_MIME_MAP: Dict[str, str] = {
    ".webm": "audio/webm",
    ".mp3": "audio/mpeg",
    ".mp4": "audio/mp4",
    ".m4a": "audio/mp4",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".aac": "audio/aac",
    ".opus": "audio/opus",
}

_SYSTEM_PROMPT = (
    "Tu es un moteur de transcription professionnelle pour Onbora, "
    "un copilote commercial B2B francophone. "
    "Transcris le contenu audio fourni mot pour mot, sans ajouter de commentaires ni d'explications. "
    "Preserve la ponctuation naturelle et les pauses. "
    "Si l'audio est inaudible, retourne exactement : [AUDIO_INAUDIBLE]. "
    "Reponds UNIQUEMENT avec la transcription brute."
)


def _get_audio_mime_type(file_path: str) -> str:
    """Détermine le MIME type du fichier audio à partir de son extension."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext in _AUDIO_MIME_MAP:
        return _AUDIO_MIME_MAP[ext]
    guessed, _ = mimetypes.guess_type(file_path)
    return guessed or "audio/webm"


def transcribe_audio_with_gemini(file_path: str, language: str = "fr") -> Dict[str, Any]:
    """
    Transcrit un fichier audio en utilisant Google Gemini.

    Args:
        file_path: Chemin absolu vers le fichier audio.
        language: Code langue ISO 639-1 (défaut: 'fr' pour le français).

    Returns:
        Dict contenant :
          - success (bool)
          - text (str) : transcription brute
          - language (str)
          - provider (str) : 'gemini-audio'
          - error (str, optionnel) : message d'erreur si success=False
    """
    if not os.path.exists(file_path):
        return {
            "success": False,
            "text": "",
            "language": language,
            "provider": "gemini-audio",
            "error": f"Fichier introuvable : {file_path}",
        }

    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        logger.warning(
            "[AudioTranscription] GEMINI_API_KEY absent. "
            "Transcription impossible sans cle API."
        )
        return {
            "success": False,
            "text": "",
            "language": language,
            "provider": "gemini-audio",
            "error": "GEMINI_API_KEY non configuree. Ajoutez la variable d'environnement.",
        }

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(
                timeout=60_000,
                retry_options=types.HttpRetryOptions(attempts=2),
            ),
        )

        mime_type = _get_audio_mime_type(file_path)
        with open(file_path, "rb") as audio_f:
            audio_data = audio_f.read()

        audio_part = types.Part.from_bytes(data=audio_data, mime_type=mime_type)

        prompt = (
            f"Langue attendue : {language}. "
            "Transcris cet enregistrement audio professionnel."
        )

        model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        response = client.models.generate_content(
            model=model_name,
            contents=[audio_part, prompt],
            config=types.GenerateContentConfig(
                system_instruction=_SYSTEM_PROMPT,
                temperature=0.0,
                max_output_tokens=4096,
            ),
        )

        transcript = (response.text or "").strip()

        if not transcript or transcript == "[AUDIO_INAUDIBLE]":
            return {
                "success": False,
                "text": "",
                "language": language,
                "provider": "gemini-audio",
                "error": "Contenu audio non reconnu ou inaudible.",
            }

        logger.info(
            "[AudioTranscription] Gemini — transcription reussie (%d caracteres).",
            len(transcript),
        )
        return {
            "success": True,
            "text": transcript,
            "language": language,
            "provider": "gemini-audio",
        }

    except Exception as exc:
        logger.error("[AudioTranscription] Echec Gemini : %s", exc, exc_info=True)
        return {
            "success": False,
            "text": "",
            "language": language,
            "provider": "gemini-audio",
            "error": str(exc),
        }


class AudioTranscriptionService:
    """
    Service singleton pour la transcription audio via Google Gemini.
    Point d'entree principal recommande pour toute transcription dans Onbora.
    """

    def transcribe(self, file_path: str, language: str = "fr") -> Dict[str, Any]:
        """Transcrit un fichier audio. Voir transcribe_audio_with_gemini()."""
        return transcribe_audio_with_gemini(file_path, language=language)
