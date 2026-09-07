from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.models import User
from sales.models import Enterprise
from accounts.permissions import IsKAMManager


class KamOfficeOverviewView(APIView):
    """
    GET: Fournit le tableau de bord de direction du KAM Office :
    - Volumétrie des comptes Grands Comptes vs PME
    - Répartition affectés vs non affectés
    - Effectifs KAMs ventilés par spécialisation (Grands Comptes vs PME)
    - Valeur globale du pipeline sous gestion
    """
    permission_classes = [IsKAMManager]

    def get(self, request):
        kam_enterprises = Enterprise.objects.filter(
            Q(assigned_entity='KAM_OFFICE') | Q(segment__in=['GRAND_COMPTE', 'PME'])
        )

        total_accounts = kam_enterprises.count()
        gc_count = kam_enterprises.filter(segment='GRAND_COMPTE').count()
        pme_count = kam_enterprises.filter(segment='PME').count()

        assigned_count = kam_enterprises.filter(assigned_kam__isnull=False).count()
        unassigned_count = kam_enterprises.filter(assigned_kam__isnull=True).count()
        unassigned_gc = kam_enterprises.filter(segment='GRAND_COMPTE', assigned_kam__isnull=True).count()
        unassigned_pme = kam_enterprises.filter(segment='PME', assigned_kam__isnull=True).count()

        total_rev = kam_enterprises.aggregate(total=Sum('annual_revenue'))['total'] or 0
        converted_qs = kam_enterprises.filter(conversion_status='CONVERTED')
        converted_count = converted_qs.count()
        converted_rev = converted_qs.aggregate(total=Sum('converted_amount'))['total'] or 0

        # Données de l'équipe KAM
        kams_qs = User.objects.filter(role=User.KAM, is_active=True)
        total_kams = kams_qs.count()
        gc_specialists = kams_qs.filter(kam_specialization='GRAND_COMPTE').count()
        pme_specialists = kams_qs.filter(kam_specialization='PME').count()

        return Response({
            "metrics": {
                "total_accounts": total_accounts,
                "grands_comptes_count": gc_count,
                "pme_count": pme_count,
                "assigned_count": assigned_count,
                "unassigned_count": unassigned_count,
                "unassigned_grands_comptes": unassigned_gc,
                "unassigned_pme": unassigned_pme,
                "assignment_rate_percent": round((assigned_count / total_accounts * 100), 1) if total_accounts > 0 else 0,
                "total_annual_revenue_usd": float(total_rev),
                "total_converted_count": converted_count,
                "total_signed_amount_usd": float(converted_rev),
                "total_kams_count": total_kams,
                "gc_specialist_kams": gc_specialists,
                "pme_specialist_kams": pme_specialists,
            }
        }, status=status.HTTP_200_OK)


class KamOfficeKamListView(APIView):
    """
    GET: Liste tous les KAMs avec leur spécialisation (Grands Comptes vs PME),
         leur portefeuille en cours et leurs métriques de conversion.
    POST: Crée un nouveau Key Account Manager dans le pool du KAM Office avec sa spécialisation.
    """
    permission_classes = [IsKAMManager]

    def get(self, request):
        specialization_filter = request.query_params.get('specialization', None)
        kams = User.objects.filter(role=User.KAM).order_by('first_name')

        if specialization_filter in ['GRAND_COMPTE', 'PME']:
            kams = kams.filter(kam_specialization=specialization_filter)

        kams_data = []
        for kam in kams:
            assigned_enterprises = Enterprise.objects.filter(assigned_kam=kam)
            assigned_total = assigned_enterprises.count()
            assigned_gc = assigned_enterprises.filter(segment='GRAND_COMPTE').count()
            assigned_pme = assigned_enterprises.filter(segment='PME').count()
            portfolio_rev = assigned_enterprises.aggregate(total=Sum('annual_revenue'))['total'] or 0

            converted_qs = assigned_enterprises.filter(conversion_status='CONVERTED')
            converted_count = converted_qs.count()
            converted_amount = converted_qs.aggregate(total=Sum('converted_amount'))['total'] or 0

            kams_data.append({
                "id": kam.id,
                "username": kam.username,
                "email": kam.email,
                "first_name": kam.first_name,
                "last_name": kam.last_name,
                "full_name": f"{kam.first_name} {kam.last_name}".strip() or kam.username,
                "phone": kam.phone or "",
                "location": kam.location or "Kinshasa",
                "is_available": kam.is_available,
                "is_active": kam.is_active,
                "kam_specialization": kam.kam_specialization or 'GRAND_COMPTE',
                "kam_specialization_display": "Spécialiste Grands Comptes (> 1M$)" if kam.kam_specialization == 'GRAND_COMPTE' else "Spécialiste PME (100k$ - 1M$)",
                "avatar": kam.avatar or "memoji_056.png",
                "assigned_total_count": assigned_total,
                "assigned_grands_comptes_count": assigned_gc,
                "assigned_pme_count": assigned_pme,
                "total_portfolio_revenue_usd": float(portfolio_rev),
                "converted_accounts_count": converted_count,
                "converted_amount_usd": float(converted_amount),
            })

        return Response({
            "total": len(kams_data),
            "kams": kams_data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        email = request.data.get('email', '').strip()
        phone = request.data.get('phone', '').strip()
        location = request.data.get('location', 'Kinshasa').strip()
        specialization = request.data.get('kam_specialization', 'GRAND_COMPTE')
        avatar = request.data.get('avatar', 'memoji_019.png').strip() or 'memoji_019.png'

        if not username or not password:
            return Response({"detail": "Identifiant et mot de passe requis."}, status=status.HTTP_400_BAD_REQUEST)

        if specialization not in ['GRAND_COMPTE', 'PME']:
            return Response({"detail": "La spécialisation doit être soit 'GRAND_COMPTE' soit 'PME'."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"detail": f"Un compte avec l'identifiant '{username}' existe déjà."}, status=status.HTTP_400_BAD_REQUEST)

        new_kam = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=User.KAM,
            phone=phone,
            location=location,
            kam_specialization=specialization,
            company_name="Onbora Direction Grands Comptes"
        )
        new_kam.avatar = avatar
        new_kam.save()

        return Response({
            "message": f"Compte KAM {new_kam.get_full_name()} créé avec succès ({'Grands Comptes' if specialization == 'GRAND_COMPTE' else 'PME'}).",
            "kam": {
                "id": new_kam.id,
                "username": new_kam.username,
                "full_name": f"{new_kam.first_name} {new_kam.last_name}".strip() or new_kam.username,
                "email": new_kam.email,
                "phone": new_kam.phone,
                "location": new_kam.location,
                "kam_specialization": new_kam.kam_specialization,
                "is_available": new_kam.is_available,
                "avatar": new_kam.avatar,
            }
        }, status=status.HTTP_201_CREATED)


class KamOfficeKamDetailView(APIView):
    """
    PATCH: Met à jour la spécialisation, la disponibilité ou le statut d'un KAM.
    """
    permission_classes = [IsKAMManager]

    def patch(self, request, pk):
        try:
            kam = User.objects.get(pk=pk, role=User.KAM)
        except User.DoesNotExist:
            return Response({"detail": "KAM introuvable."}, status=status.HTTP_404_NOT_FOUND)

        specialization = request.data.get('kam_specialization')
        is_available = request.data.get('is_available')
        is_active = request.data.get('is_active')
        location = request.data.get('location')
        phone = request.data.get('phone')

        updated_fields = []
        if specialization in ['GRAND_COMPTE', 'PME']:
            kam.kam_specialization = specialization
            updated_fields.append('kam_specialization')
        if is_available is not None:
            kam.is_available = bool(is_available)
            updated_fields.append('is_available')
        if is_active is not None:
            kam.is_active = bool(is_active)
            updated_fields.append('is_active')
        if location is not None:
            kam.location = location
            updated_fields.append('location')
        if phone is not None:
            kam.phone = phone
            updated_fields.append('phone')

        if updated_fields:
            kam.save(update_fields=updated_fields)

        return Response({
            "id": kam.id,
            "username": kam.username,
            "full_name": f"{kam.first_name} {kam.last_name}".strip() or kam.username,
            "kam_specialization": kam.kam_specialization,
            "is_available": kam.is_available,
            "is_active": kam.is_active,
            "message": "Fiche du KAM mise à jour avec succès."
        }, status=status.HTTP_200_OK)


class KamOfficeAccountsListView(APIView):
    """
    GET: Liste les entreprises affectées au pôle KAM Office (Grands Comptes & PME)
    avec filtrage par :
    - segment ('ALL', 'GRAND_COMPTE', 'PME')
    - assignment ('ALL', 'ASSIGNED', 'UNASSIGNED')
    - kam_id (filtrer les comptes attribués à un KAM précis)
    - search (nom, crm_id, ville, contact...)
    """
    permission_classes = [IsKAMManager]

    def get(self, request):
        segment = request.query_params.get('segment', 'ALL')
        assignment = request.query_params.get('assignment', 'ALL')
        kam_id = request.query_params.get('kam_id', None)
        search = request.query_params.get('search', '').strip()
        limit = int(request.query_params.get('limit', 1000))
        offset = int(request.query_params.get('offset', 0))

        qs = Enterprise.objects.filter(
            Q(assigned_entity='KAM_OFFICE') | Q(segment__in=['GRAND_COMPTE', 'PME'])
        ).select_related('assigned_kam')

        if segment in ['GRAND_COMPTE', 'PME']:
            qs = qs.filter(segment=segment)

        if assignment == 'ASSIGNED':
            qs = qs.filter(assigned_kam__isnull=False)
        elif assignment == 'UNASSIGNED':
            qs = qs.filter(assigned_kam__isnull=True)

        if kam_id:
            try:
                qs = qs.filter(assigned_kam_id=int(kam_id))
            except ValueError:
                pass

        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(crm_id__icontains=search) |
                Q(rccm__icontains=search) |
                Q(sector__icontains=search) |
                Q(city__icontains=search) |
                Q(commune__icontains=search) |
                Q(contact_name__icontains=search)
            )

        total_matching = qs.count()
        paged_qs = qs.order_by('-annual_revenue')[offset:offset+limit]

        accounts_data = []
        for ent in paged_qs:
            assigned_kam_data = None
            if ent.assigned_kam:
                assigned_kam_data = {
                    "id": ent.assigned_kam.id,
                    "username": ent.assigned_kam.username,
                    "full_name": f"{ent.assigned_kam.first_name} {ent.assigned_kam.last_name}".strip() or ent.assigned_kam.username,
                    "email": ent.assigned_kam.email,
                    "phone": ent.assigned_kam.phone,
                    "kam_specialization": ent.assigned_kam.kam_specialization,
                    "location": ent.assigned_kam.location,
                    "avatar": ent.assigned_kam.avatar or "memoji_056.png",
                }

            accounts_data.append({
                "id": ent.id,
                "crm_id": ent.crm_id or f"CRM-CD-{ent.id:04d}",
                "name": ent.name,
                "sector": ent.sector,
                "city": ent.city,
                "commune": ent.commune,
                "address": ent.address,
                "annual_revenue": float(ent.annual_revenue),
                "employee_count": ent.employee_count,
                "site_count": ent.site_count,
                "segment": ent.segment,
                "segment_display": ent.get_segment_display(),
                "assigned_entity": ent.assigned_entity,
                "conversion_status": ent.conversion_status,
                "conversion_status_display": ent.get_conversion_status_display(),
                "converted_amount": float(ent.converted_amount) if ent.converted_amount else 0,
                "current_operator": ent.current_operator,
                "current_connectivity": ent.current_connectivity,
                "contact_name": ent.contact_name,
                "contact_role": ent.contact_role,
                "contact_phone": ent.contact_phone,
                "rccm": ent.rccm,
                "assigned_kam": assigned_kam_data,
                "assigned_at": ent.assigned_at.isoformat() if ent.assigned_at else None,
            })

        return Response({
            "total": total_matching,
            "count": len(accounts_data),
            "offset": offset,
            "limit": limit,
            "accounts": accounts_data
        }, status=status.HTTP_200_OK)


class KamOfficeAssignAccountView(APIView):
    """
    POST: Affecte ou désaffecte un compte clé (Grand Compte ou PME) à un KAM individuel.
    Body:
    {
      "enterprise_id": 123,
      "kam_id": 45  // ou null pour désaffecter
    }
    """
    permission_classes = [IsKAMManager]

    def post(self, request):
        enterprise_id = request.data.get('enterprise_id')
        kam_id = request.data.get('kam_id')

        if not enterprise_id:
            return Response({"detail": "L'identifiant de l'entreprise (enterprise_id) est requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            enterprise = Enterprise.objects.get(pk=enterprise_id)
        except Enterprise.DoesNotExist:
            return Response({"detail": "Entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)

        if kam_id is None or kam_id == "" or kam_id == 0:
            # Désaffectation
            enterprise.assigned_kam = None
            enterprise.assigned_at = None
            enterprise.assigned_by = None
            enterprise.save(update_fields=['assigned_kam', 'assigned_at', 'assigned_by'])
            return Response({
                "status": "unassigned",
                "message": f"Le compte '{enterprise.name}' a été remis dans le vivier non affecté.",
                "enterprise_id": enterprise.id,
                "assigned_kam": None
            }, status=status.HTTP_200_OK)

        try:
            target_kam = User.objects.get(pk=kam_id, role=User.KAM)
        except User.DoesNotExist:
            return Response({"detail": "Le KAM sélectionné est introuvable ou n'a pas le rôle KAM."}, status=status.HTTP_404_NOT_FOUND)

        enterprise.assigned_kam = target_kam
        enterprise.assigned_at = timezone.now()
        enterprise.assigned_by = request.user
        enterprise.save(update_fields=['assigned_kam', 'assigned_at', 'assigned_by'])

        kam_full_name = f"{target_kam.first_name} {target_kam.last_name}".strip() or target_kam.username

        return Response({
            "status": "assigned",
            "message": f"Le compte '{enterprise.name}' ({enterprise.get_segment_display()}) a été affecté à {kam_full_name}.",
            "enterprise_id": enterprise.id,
            "assigned_kam": {
                "id": target_kam.id,
                "username": target_kam.username,
                "full_name": kam_full_name,
                "kam_specialization": target_kam.kam_specialization,
                "email": target_kam.email,
                "phone": target_kam.phone,
            },
            "assigned_at": enterprise.assigned_at.isoformat()
        }, status=status.HTTP_200_OK)
