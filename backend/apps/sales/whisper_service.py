"""
Wrapper de compatibilité — redirige vers apps.ai_core.services.audio_transcription_service.

Ce module maintient l'interface publique historique `transcribe_audio_file()` afin de
ne pas casser les imports existants dans apps.sales et apps.discovery, tout en
centralisant la logique réelle dans apps.ai_core (source unique de vérité).

AVERTISSEMENT : Ce fichier ne doit PAS contenir de logique STT.
Toute nouvelle intégration doit utiliser directement :
  from apps.ai_core.services import transcribe_audio_with_gemini
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


def transcribe_audio_file(file_path: str, model_name: str = "base") -> Dict[str, Any]:
    """
    Interface de compatibilité — délègue au service Gemini unifié de apps.ai_core.

    Le paramètre `model_name` est conservé pour ne pas casser les signatures
    d'appel existantes, mais est ignoré : Gemini gère le choix du modèle via
    la variable d'environnement GEMINI_MODEL.

    Returns:
        Dict contenant : success (bool), text (str), language (str), provider (str).
    """
    try:
        from apps.ai_core.services.audio_transcription_service import transcribe_audio_with_gemini
        return transcribe_audio_with_gemini(file_path, language="fr")
    except ImportError as exc:
        logger.error(
            "[whisper_service] Impossible d'importer audio_transcription_service : %s", exc
        )
        return {
            "success": False,
            "text": "",
            "language": "fr",
            "provider": "gemini-audio",
            "error": "Service de transcription non disponible.",
        }
