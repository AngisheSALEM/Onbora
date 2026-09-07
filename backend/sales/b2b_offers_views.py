import os
import json
import logging
from pathlib import Path
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from accounts.permissions import IsAdmin
from apps.ai_core.catalog import load_catalog, CatalogDefinition, ServiceDefinition
from catalog.models import ServiceCatalog

logger = logging.getLogger(__name__)

def _get_catalog_paths():
    """Retourne les chemins vers les fichiers catalog.json (backend et core-ai)."""
    paths = []
    primary = Path(settings.ONBORA_CATALOG_PATH).resolve()
    paths.append(primary)
    
    # Chemin vers le standalone core-ai si présent
    alt = (settings.BASE_DIR.parent / 'core-ai' / 'catalog' / 'versions' / 'v1' / 'catalog.json').resolve()
    if alt.exists() and alt != primary:
        paths.append(alt)
    return paths

def _sync_to_service_catalog_db(service_dict):
    """Optionnellement synchronise un service vers le modèle Django ServiceCatalog."""
    try:
        cat_map = {
            'Connectivité': ServiceCatalog.CONNECTIVITY,
            'Internet fixe et réseaux': ServiceCatalog.CONNECTIVITY,
            'Internet mobile': ServiceCatalog.CONNECTIVITY,
            'Mobile et flotte': ServiceCatalog.CONNECTIVITY,
            'Téléphonie fixe et VoIP': ServiceCatalog.CONNECTIVITY,
            'Réseaux internationaux': ServiceCatalog.CONNECTIVITY,
            'Cloud': ServiceCatalog.CLOUD,
            'Cloud international': ServiceCatalog.CLOUD,
            'Datacenter et infrastructure': ServiceCatalog.CLOUD,
            'Cybersécurité': ServiceCatalog.SECURITY,
            'Cybersécurité internationale': ServiceCatalog.SECURITY,
            'Collaboration / Outils collaboratifs': ServiceCatalog.COLLABORATIVE,
            'Collaboration internationale': ServiceCatalog.COLLABORATIVE,
            'Orange Money Business': ServiceCatalog.PAYMENT,
        }
        raw_cat = service_dict.get('category', 'Connectivité')
        mapped_cat = cat_map.get(raw_cat, ServiceCatalog.CONNECTIVITY)
        
        ServiceCatalog.objects.update_or_create(
            name=service_dict.get('name'),
            defaults={
                'category': mapped_cat,
                'description': service_dict.get('description', ''),
                'benefits': "\n".join(service_dict.get('allowed_benefits', [])),
                'technical_requirements': {
                    'prerequisites': service_dict.get('prerequisites', []),
                    'commercial_terms': service_dict.get('commercial_terms', []),
                    'variants': service_dict.get('variants', []),
                    'match': service_dict.get('match', {})
                }
            }
        )
    except Exception as e:
        logger.warning(f"Erreur sync ServiceCatalog DB: {e}")

def _save_catalog_to_disk(catalog_obj: CatalogDefinition):
    """Sauvegarde le catalogue validé sur tous les chemins identifiés."""
    paths = _get_catalog_paths()
    data = catalog_obj.model_dump(mode='json')
    json_content = json.dumps(data, indent=2, ensure_ascii=False)
    
    for p in paths:
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, 'w', encoding='utf-8') as f:
            f.write(json_content)
    
    # Sync de tous les services vers la DB
    for s in data.get('services', []):
        _sync_to_service_catalog_db(s)


class B2BOffersListView(APIView):
    """
    GET: Liste toutes les offres B2B du Core AI avec filtrage par catégorie, statut et recherche.
    POST: Crée une nouvelle offre B2B dans le catalogue Core AI et met à jour les fichiers JSON.
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        try:
            catalog = load_catalog(settings.ONBORA_CATALOG_PATH)
        except Exception as e:
            return Response({"error": f"Impossible de charger le catalogue: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        category = request.query_params.get('category', '').strip()
        rdc_availability = request.query_params.get('rdc_availability', '').strip()
        search = request.query_params.get('search', '').strip().lower()

        services = [s.model_dump(mode='json') for s in catalog.services]

        # Extraire toutes les catégories existantes
        all_categories = sorted(list(set(s.get('category', 'Autres') for s in services)))

        # Filtrage
        if category and category != 'ALL':
            services = [s for s in services if s.get('category') == category]

        if rdc_availability and rdc_availability != 'ALL':
            services = [s for s in services if s.get('rdc_availability') == rdc_availability]

        if search:
            services = [
                s for s in services
                if search in s.get('name', '').lower()
                or search in s.get('service_id', '').lower()
                or search in s.get('description', '').lower()
                or any(search in kw.lower() for kw in s.get('match', {}).get('need_keywords', []))
            ]

        return Response({
            "catalog_version": catalog.catalog_version,
            "status": catalog.status,
            "source_name": catalog.source_name,
            "source_url": catalog.source_url,
            "source_checked_on": str(catalog.source_checked_on) if catalog.source_checked_on else None,
            "total_services": len(catalog.services),
            "filtered_count": len(services),
            "categories": all_categories,
            "services": services
        }, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            catalog = load_catalog(settings.ONBORA_CATALOG_PATH)
        except Exception as e:
            return Response({"error": f"Catalogue indisponible: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        payload = request.data
        service_id = payload.get('service_id', '').strip().lower()
        if not service_id:
            return Response({"error": "Le champ 'service_id' est obligatoire (ex: fibre_pro_kinshasa)."}, status=status.HTTP_400_BAD_REQUEST)

        # Vérifier unicité
        if service_id in catalog.allowed_service_ids:
            return Response({"error": f"Une offre B2B avec l'identifiant '{service_id}' existe déjà."}, status=status.HTTP_400_BAD_REQUEST)

        # Normalisation des listes si reçues sous forme de chaînes séparées par des virgules
        def normalize_list(val):
            if isinstance(val, list):
                return [str(v).strip() for v in val if str(v).strip()]
            elif isinstance(val, str):
                return [v.strip() for v in val.split('\n') if v.strip()]
            return []

        # Construction du ServiceDefinition
        match_data = payload.get('match', {})
        if not isinstance(match_data, dict):
            match_data = {}

        need_keywords = normalize_list(match_data.get('need_keywords', payload.get('need_keywords', [])))
        if not need_keywords:
            need_keywords = [payload.get('name', service_id)]

        service_data = {
            "service_id": service_id,
            "name": payload.get('name', '').strip(),
            "category": payload.get('category', 'Connectivité').strip(),
            "description": payload.get('description', '').strip(),
            "allowed_benefits": normalize_list(payload.get('allowed_benefits', ["Gain de productivité"])),
            "target_customers": normalize_list(payload.get('target_customers', [])),
            "variants": payload.get('variants', []),
            "commercial_terms": normalize_list(payload.get('commercial_terms', [])),
            "prerequisites": normalize_list(payload.get('prerequisites', [])),
            "exclusions": normalize_list(payload.get('exclusions', [])),
            "source_url": payload.get('source_url', 'https://www.orange-business.com/en/products'),
            "source_status": payload.get('source_status', 'official_page'),
            "provider_name": payload.get('provider_name', 'Orange Business'),
            "portfolio_scope": payload.get('portfolio_scope', 'rdc'),
            "portfolio_level": payload.get('portfolio_level', 'local_offer'),
            "rdc_availability": payload.get('rdc_availability', 'published_local'),
            "availability_note": payload.get('availability_note', ''),
            "match": {
                "need_keywords": need_keywords,
                "sectors": normalize_list(match_data.get('sectors', [])),
                "excluded_sectors": normalize_list(match_data.get('excluded_sectors', [])),
                "required_profile_fields": normalize_list(match_data.get('required_profile_fields', []))
            }
        }

        try:
            new_service = ServiceDefinition.model_validate(service_data)
        except Exception as e:
            return Response({"error": f"Validation de l'offre échouée: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # Ajouter au catalogue
        catalog.services.append(new_service)

        try:
            _save_catalog_to_disk(catalog)
        except Exception as e:
            return Response({"error": f"Erreur écriture disque: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "message": f"Offre B2B '{new_service.name}' ({new_service.service_id}) créée avec succès.",
            "service": new_service.model_dump(mode='json'),
            "total_services": len(catalog.services)
        }, status=status.HTTP_201_CREATED)


class B2BOfferDetailView(APIView):
    """
    GET: Détail d'une offre B2B.
    PUT / PATCH: Mise à jour complète ou partielle d'une offre B2B.
    DELETE: Suppression d'une offre B2B du catalogue Core AI.
    """
    permission_classes = [IsAdmin]

    def get(self, request, service_id):
        try:
            catalog = load_catalog(settings.ONBORA_CATALOG_PATH)
        except Exception as e:
            return Response({"error": f"Catalogue indisponible: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        target = next((s for s in catalog.services if s.service_id == service_id), None)
        if not target:
            return Response({"error": f"Offre '{service_id}' non trouvée."}, status=status.HTTP_404_NOT_FOUND)

        return Response(target.model_dump(mode='json'), status=status.HTTP_200_OK)

    def put(self, request, service_id):
        try:
            catalog = load_catalog(settings.ONBORA_CATALOG_PATH)
        except Exception as e:
            return Response({"error": f"Catalogue indisponible: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        idx = next((i for i, s in enumerate(catalog.services) if s.service_id == service_id), None)
        if idx is None:
            return Response({"error": f"Offre '{service_id}' non trouvée."}, status=status.HTTP_404_NOT_FOUND)

        payload = request.data
        current = catalog.services[idx].model_dump(mode='json')

        def normalize_list(val, default):
            if val is None:
                return default
            if isinstance(val, list):
                return [str(v).strip() for v in val if str(v).strip()]
            if isinstance(val, str):
                return [v.strip() for v in val.split('\n') if v.strip()]
            return default

        # Mise à jour des champs
        current['name'] = payload.get('name', current['name']).strip()
        current['category'] = payload.get('category', current['category']).strip()
        current['description'] = payload.get('description', current['description']).strip()
        current['allowed_benefits'] = normalize_list(payload.get('allowed_benefits'), current.get('allowed_benefits', []))
        current['target_customers'] = normalize_list(payload.get('target_customers'), current.get('target_customers', []))
        if 'variants' in payload and isinstance(payload['variants'], list):
            current['variants'] = payload['variants']
        current['commercial_terms'] = normalize_list(payload.get('commercial_terms'), current.get('commercial_terms', []))
        current['prerequisites'] = normalize_list(payload.get('prerequisites'), current.get('prerequisites', []))
        current['exclusions'] = normalize_list(payload.get('exclusions'), current.get('exclusions', []))
        current['source_url'] = payload.get('source_url', current.get('source_url', ''))
        current['rdc_availability'] = payload.get('rdc_availability', current.get('rdc_availability', 'published_local'))
        current['availability_note'] = payload.get('availability_note', current.get('availability_note', ''))

        if 'match' in payload and isinstance(payload['match'], dict):
            m = payload['match']
            current['match']['need_keywords'] = normalize_list(m.get('need_keywords'), current['match'].get('need_keywords', []))
            current['match']['sectors'] = normalize_list(m.get('sectors'), current['match'].get('sectors', []))
            current['match']['excluded_sectors'] = normalize_list(m.get('excluded_sectors'), current['match'].get('excluded_sectors', []))

        try:
            updated_service = ServiceDefinition.model_validate(current)
        except Exception as e:
            return Response({"error": f"Validation de l'offre mise à jour échouée: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        catalog.services[idx] = updated_service

        try:
            _save_catalog_to_disk(catalog)
        except Exception as e:
            return Response({"error": f"Erreur écriture disque: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "message": f"Offre B2B '{updated_service.name}' mise à jour avec succès.",
            "service": updated_service.model_dump(mode='json')
        }, status=status.HTTP_200_OK)

    def delete(self, request, service_id):
        try:
            catalog = load_catalog(settings.ONBORA_CATALOG_PATH)
        except Exception as e:
            return Response({"error": f"Catalogue indisponible: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        idx = next((i for i, s in enumerate(catalog.services) if s.service_id == service_id), None)
        if idx is None:
            return Response({"error": f"Offre '{service_id}' non trouvée."}, status=status.HTTP_404_NOT_FOUND)

        if len(catalog.services) <= 1:
            return Response({"error": "Impossible de supprimer la dernière offre du catalogue."}, status=status.HTTP_400_BAD_REQUEST)

        deleted = catalog.services.pop(idx)

        try:
            _save_catalog_to_disk(catalog)
        except Exception as e:
            return Response({"error": f"Erreur écriture disque: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "message": f"Offre '{deleted.name}' ({service_id}) supprimée du catalogue.",
            "total_services": len(catalog.services)
        }, status=status.HTTP_200_OK)


class B2BOffersImportView(APIView):
    """
    POST: Importe ou réinitialise un catalogue JSON complet de solutions B2B.
    """
    permission_classes = [IsAdmin]

    def post(self, request):
        raw_catalog = request.data.get('catalog') or request.data
        if not isinstance(raw_catalog, dict) or 'services' not in raw_catalog:
            return Response({"error": "Le payload doit contenir un objet JSON valide avec une liste de 'services'."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validated_catalog = CatalogDefinition.model_validate(raw_catalog)
        except Exception as e:
            return Response({"error": f"Le catalogue soumis n'est pas conforme au schéma: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            _save_catalog_to_disk(validated_catalog)
        except Exception as e:
            return Response({"error": f"Erreur enregistrement catalogue: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "message": f"Catalogue importé avec succès. {len(validated_catalog.services)} offres B2B synchronisées avec le Core AI.",
            "catalog_version": validated_catalog.catalog_version,
            "total_services": len(validated_catalog.services)
        }, status=status.HTTP_200_OK)
