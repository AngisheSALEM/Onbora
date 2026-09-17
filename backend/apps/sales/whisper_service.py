import os
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Cache global models by name
_whisper_models: Dict[str, Any] = {}


def ensure_ffmpeg_on_path():
    """Ensure ffmpeg is available in PATH using imageio_ffmpeg binary if available."""
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        ffmpeg_dir = os.path.dirname(ffmpeg_exe)
        target = os.path.join(ffmpeg_dir, "ffmpeg.exe")
        if not os.path.exists(target):
            import shutil
            shutil.copyfile(ffmpeg_exe, target)
        if ffmpeg_dir not in os.environ.get("PATH", ""):
            os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
    except Exception as e:
        logger.debug(f"imageio_ffmpeg check: {e}")


def get_whisper_model(model_name: str = "base"):
    """Load local OpenAI Whisper model lazily with CPU fp16=False safety."""
    global _whisper_models
    if model_name in _whisper_models:
        return _whisper_models[model_name]

    ensure_ffmpeg_on_path()
    try:
        import whisper
        logger.info(f"Chargement du modèle OpenAI Whisper local: {model_name}")
        model = whisper.load_model(model_name)
        _whisper_models[model_name] = model
        return model
    except Exception as e:
        logger.warning(f"Impossible de charger le modèle Whisper local {model_name} ({e}).")
        if model_name != "tiny":
            try:
                import whisper
                logger.info("Tentative de repli sur le modèle Whisper local 'tiny'...")
                model = whisper.load_model("tiny")
                _whisper_models["tiny"] = model
                return model
            except Exception as e2:
                logger.warning(f"Échec chargement Whisper 'tiny' ({e2}).")
        return None


def transcribe_audio_file(file_path: str, model_name: str = "base") -> Dict[str, Any]:
    """
    Transcrit un fichier audio (.mp3, .wav, .webm, .m4a, .ogg) avec OpenAI Whisper officiel.
    ZÉRO hallucination / ZÉRO mock : si l'enregistrement est vide, silencieux ou inaudible,
    renvoie une chaîne vide sans jamais inventer de faux besoins.
    """
    if not os.path.exists(file_path):
        return {"success": False, "text": "", "error": f"Fichier introuvable: {file_path}", "provider": "openai-whisper"}

    ensure_ffmpeg_on_path()

    # 1. Essai avec le modèle local OpenAI Whisper
    try:
        model = get_whisper_model(model_name)
        if model is not None:
            result = model.transcribe(file_path, fp16=False, language="fr")
            text = (result.get("text") or "").strip()
            return {
                "success": True,
                "text": text,
                "language": result.get("language", "fr"),
                "segments": result.get("segments", []),
                "provider": "openai-whisper-local"
            }
    except Exception as e:
        logger.warning(f"Échec de la transcription Whisper locale: {e}")

    # 2. Essai avec l'API OpenAI Whisper (si clé disponible)
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if openai_api_key:
        try:
            import requests
            url = "https://api.openai.com/v1/audio/transcriptions"
            headers = {"Authorization": f"Bearer {openai_api_key}"}
            with open(file_path, "rb") as f:
                files = {"file": f}
                data = {"model": "whisper-1", "language": "fr"}
                response = requests.post(url, headers=headers, files=files, data=data, timeout=30)
                if response.status_code == 200:
                    json_data = response.json()
                    return {
                        "success": True,
                        "text": json_data.get("text", "").strip(),
                        "language": "fr",
                        "provider": "openai-whisper-api"
                    }
        except Exception as e:
            logger.warning(f"Échec de l'appel API OpenAI Whisper: {e}")

    # 3. Zéro mock : échec explicite sans inventer de faux texte
    return {
        "success": False,
        "text": "",
        "error": "Aucune voix exploitable détectée dans l'audio ou modèle Whisper indisponible.",
        "provider": "openai-whisper"
    }
