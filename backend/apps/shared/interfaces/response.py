from rest_framework.response import Response
from rest_framework import status
from typing import Any, Optional


def api_success(data: Any = None, message: Optional[str] = None, status_code: int = status.HTTP_200_OK) -> Response:
    """Standardized successful API response helper."""
    payload = {}
    if data is not None:
        if isinstance(data, dict):
            payload.update(data)
        elif isinstance(data, list):
            return Response(data, status=status_code)
        else:
            payload['data'] = data
    if message:
        payload['detail'] = message
    return Response(payload, status=status_code)


def api_error(message: str, code: str = "BAD_REQUEST", status_code: int = status.HTTP_400_BAD_REQUEST, details: Any = None) -> Response:
    """Standardized error API response helper."""
    payload = {
        "detail": message,
        "error_code": code
    }
    if details:
        payload["errors"] = details
    return Response(payload, status=status_code)
