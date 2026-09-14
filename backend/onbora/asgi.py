"""
ASGI config for onbora project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os
import sys
from pathlib import Path

base_dir = Path(__file__).resolve().parent.parent
apps_dir = base_dir / 'apps'
if str(apps_dir) not in sys.path:
    sys.path.insert(0, str(apps_dir))

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'onbora.settings')

application = get_asgi_application()
