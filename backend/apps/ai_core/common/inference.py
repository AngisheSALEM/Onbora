"""A shared request deadline for Gemini calls, including any model fallback."""
from time import monotonic
from google.genai import types


def generate_with_budget(client, *, model, contents, config, budget_ms=20000, fallback_models=()):
    deadline = monotonic() + budget_ms / 1000
    models = list(dict.fromkeys([model, *fallback_models]))[:2]
    for index, current in enumerate(models):
        remaining = int((deadline - monotonic()) * 1000)
        if remaining <= 0:
            raise TimeoutError("inference_deadline_exceeded")
        attempt_config = config.model_copy(update={"http_options": types.HttpOptions(
            timeout=remaining, retry_options=types.HttpRetryOptions(attempts=1))})
        try:
            return client.models.generate_content(model=current, contents=contents, config=attempt_config)
        except Exception as exc:
            # Only an unavailable model identifier justifies trying another model.
            # Rate limits, timeouts, credentials and service errors terminate this request.
            if getattr(exc, "code", None) != 404 or index == len(models) - 1:
                raise
    raise TimeoutError("inference_deadline_exceeded")
