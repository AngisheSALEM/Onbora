"""
WSGI config for onbora project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os
import sys
from pathlib import Path

base_dir = Path(__file__).resolve().parent.parent
apps_dir = base_dir / 'apps'
if str(apps_dir) not in sys.path:
    sys.path.insert(0, str(apps_dir))

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'onbora.settings')

application = get_wsgi_application()
