"""
URL configuration for onbora project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def api_root(request):
    return JsonResponse({
        "status": "running",
        "project": "Onbora API",
        "version": "1.0.0",
        "endpoints": {
            "admin": "/admin/",
            "auth": "/api/auth/",
            "discovery": "/api/discovery/",
            "kam": "/api/kam/",
            "sales": "/api/sales/",
            "reporting": "/api/reporting/",
            "catalog": "/api/catalog/"
        }
    })

urlpatterns = [
    path('', api_root),
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/accounts/', include('accounts.urls')),
    path('api/discovery/', include('discovery.urls')),
    path('api/kam/', include('kam.urls')),
    path('api/sales/', include('sales.urls')),
    path('api/reporting/', include('reporting.urls')),
    path('api/catalog/', include('catalog.urls')),
    path('api/twin/', include('twin.urls')),
    
    # Aliases v1
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/accounts/', include('accounts.urls')),
    path('api/v1/discovery/', include('discovery.urls')),
    path('api/v1/kam/', include('kam.urls')),
    path('api/v1/sales/', include('sales.urls')),
    path('api/v1/reporting/', include('reporting.urls')),
    path('api/v1/catalog/', include('catalog.urls')),
    path('api/v1/twin/', include('twin.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)



