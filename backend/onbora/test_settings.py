"""Offline test database; never connect to the configured application database."""
import os
from .settings import *  # noqa: F403

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
GEMINI_API_KEY = ""
ONBORA_AI_PROVIDER = "fake"
os.environ["GEMINI_API_KEY"] = ""
os.environ["ONBORA_AI_PROVIDER"] = "fake"
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
