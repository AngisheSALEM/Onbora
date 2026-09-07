import math
from collections import defaultdict
from typing import Dict, List, Any
from django.utils import timezone
from django.db import transaction
from django.db.models import Count, Q

from sales.models import Plaque, Enterprise, VisitPreparation, VisitReport
from accounts.models import User


class AutoDispatchPlaqueSalesUseCase:
    """
    Algorithme d'affectation automatique intelligente des commerciaux terrain sur les comptes SOHO d'une plaque :
    
    1. Anti-collision stricte :
       - Exclut immédiatement tout compte déjà converti (CONVERTED) ou en négociation (IN_NEGOTIATION).
       - Exclut tout compte marqué `is_visited=True` ou possédant déjà un compte-rendu de visite `VisitReport`.
       - Empêche deux commerciaux de se croiser chez le même client (zéro doublon de tournée).
    
    2. Modélisation de l'affinité sectorielle :
       - Inspecte pour chaque commercial de la plaque l'historique de ses visites et formulaires par secteur d'activité
         (ex: Cybercafé & Télécoms, Boutiques & Commerce, Pharmacies & Santé, Bureaux & Services...).
       - Établit une matrice de compétences sectorielles pour chaque commercial.
    
    3. Optimisation & Équilibrage de charge (Load Balancing) :
       - Calcule le quota cible par commercial pour éviter toute surcharge d'un membre de l'équipe.
       - Pour chaque entreprise non prospectée, priorise le commercial ayant la plus forte affinité sectorielle
         qui n'a pas encore atteint son plafond de charge.
    
    4. Traçabilité & Synchronisation Mobile :
       - Affecte `enterprise.assigned_salesperson` et `enterprise.assigned_salesperson_at`.
       - Crée ou met à jour la `VisitPreparation` afin que le compte apparaisse immédiatement dans la liste de tournée mobile.
    """

    def execute(self, plaque_id: int, user=None) -> Dict[str, Any]:
        try:
            plaque = Plaque.objects.prefetch_related('assigned_salespersons').get(pk=plaque_id)
        except Plaque.DoesNotExist:
            raise ValueError(f"Plaque avec l'ID {plaque_id} introuvable.")

        salespersons = list(plaque.assigned_salespersons.filter(is_active=True))
        if not salespersons:
            # Fallback : si aucun commercial affecté directement à la plaque, récupérer les commerciaux actifs
            salespersons = list(User.objects.filter(role=User.SALESPERSON, is_active=True)[:5])

        if not salespersons:
            raise ValueError("Aucun commercial terrain actif disponible pour cette plaque.")

        # 1. Sélection des entreprises SOHO rattachées à la plaque
        q_filter = Q(plaque_rel=plaque) | Q(plaque=plaque.name) | Q(plaque=plaque.code)
        all_enterprises = list(Enterprise.objects.filter(q_filter))

        # Si pas d'entreprises liées directement, matcher par commune/ville de la plaque
        if not all_enterprises:
            all_enterprises = list(Enterprise.objects.filter(
                assigned_entity='BACK_OFFICE',
                city__iexact=plaque.city
            )[:50])

        total_enterprises = len(all_enterprises)

        # 2. Filtrage Anti-Collision
        visited_enterprise_ids = set(
            VisitReport.objects.filter(preparation__enterprise__in=all_enterprises)
            .values_list('preparation__enterprise_id', flat=True)
        )

        eligible_to_dispatch: List[Enterprise] = []
        skipped_collision_count = 0

        for ent in all_enterprises:
            if ent.conversion_status in ['CONVERTED', 'IN_NEGOTIATION']:
                skipped_collision_count += 1
                continue
            if ent.is_visited or ent.id in visited_enterprise_ids:
                skipped_collision_count += 1
                continue
            eligible_to_dispatch.append(ent)

        if not eligible_to_dispatch:
            return {
                "plaque_id": plaque.id,
                "plaque_code": plaque.code,
                "plaque_name": plaque.name,
                "total_enterprises": total_enterprises,
                "skipped_collision_count": skipped_collision_count,
                "dispatched_count": 0,
                "message": "Tous les comptes de cette plaque ont déjà été visités ou convertis. Zéro collision provoquée.",
                "assignments_by_salesperson": []
            }

        # 3. Calcul de l'affinité sectorielle de chaque commercial
        salesperson_sector_scores: Dict[int, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        
        for sp in salespersons:
            reports = VisitReport.objects.filter(
                preparation__salesperson=sp
            ).select_related('preparation__enterprise')
            
            for rep in reports:
                if rep.preparation and rep.preparation.enterprise:
                    sec = (rep.preparation.enterprise.sector or '').strip().lower()
                    if sec:
                        salesperson_sector_scores[sp.id][sec] += 1

        # 4. Équilibrage de charge et affectation
        target_quota = math.ceil(len(eligible_to_dispatch) / len(salespersons))
        salesperson_current_load: Dict[int, int] = {sp.id: 0 for sp in salespersons}
        assigned_results: Dict[int, List[Dict[str, Any]]] = {sp.id: [] for sp in salespersons}

        now = timezone.now()

        with transaction.atomic():
            for ent in eligible_to_dispatch:
                ent_sector = (ent.sector or '').strip().lower()

                best_sp = None
                best_score = -1

                for sp in salespersons:
                    current_load = salesperson_current_load[sp.id]
                    if current_load >= target_quota and len(eligible_to_dispatch) > len(salespersons):
                        continue
                    
                    affinity = salesperson_sector_scores[sp.id].get(ent_sector, 0)
                    composite_score = (affinity * 10) - current_load

                    if composite_score > best_score:
                        best_score = composite_score
                        best_sp = sp

                if best_sp is None:
                    best_sp = min(salespersons, key=lambda s: salesperson_current_load[s.id])

                ent.assigned_salesperson = best_sp
                ent.assigned_salesperson_at = now
                if not ent.plaque_rel:
                    ent.plaque_rel = plaque
                ent.save(update_fields=['assigned_salesperson', 'assigned_salesperson_at', 'plaque_rel'])

                VisitPreparation.objects.get_or_create(
                    enterprise=ent,
                    salesperson=best_sp,
                    defaults={
                        'meeting_objective': f"Prospection SOHO terrain ({plaque.code})",
                        'hypothesis_to_verify': ent.ai_tailored_pitch or "Besoins connectivité & outils pros",
                    }
                )

                salesperson_current_load[best_sp.id] += 1
                assigned_results[best_sp.id].append({
                    "enterprise_id": ent.id,
                    "enterprise_name": ent.name,
                    "sector": ent.sector or "Non spécifié",
                    "crm_id": ent.crm_id or f"CRM-{ent.id}",
                    "address": ent.address or ent.commune or plaque.city,
                    "affinity_matched": salesperson_sector_scores[best_sp.id].get(ent_sector, 0) > 0
                })

        summary = []
        for sp in salespersons:
            summary.append({
                "salesperson_id": sp.id,
                "salesperson_name": f"{sp.first_name} {sp.last_name}".strip() or sp.username,
                "username": sp.username,
                "assigned_count": len(assigned_results[sp.id]),
                "enterprises": assigned_results[sp.id]
            })

        return {
            "plaque_id": plaque.id,
            "plaque_code": plaque.code,
            "plaque_name": plaque.name,
            "total_enterprises": total_enterprises,
            "skipped_collision_count": skipped_collision_count,
            "dispatched_count": len(eligible_to_dispatch),
            "message": f"Affectation intelligente réussie : {len(eligible_to_dispatch)} comptes SOHO distribués sans collision.",
            "assignments_by_salesperson": summary
        }
