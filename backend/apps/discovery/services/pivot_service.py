"""
Segment Pivot & Handoff Service
===============================
Architecture : Clean Architecture / Domain Service
Domaine : Discovery / Qualification & Transmission Handoff
Rôle : Évalue les formulaires de qualification, déclenche le pivot de segment (SOHO -> PME / KAM),
génère le dossier de transmission (HandoffDossier) et gère le cycle de vie de prise en charge KAM.
"""

from typing import Dict, Any, Optional
from django.utils import timezone
from django.db import transaction
from accounts.models import User
from sales.models import Enterprise, AccountPortfolioAssignment, SourceObservation, Evidence
from discovery.models import QualificationRecord, HandoffDossier
from discovery.strategies.registry import get_qualification_strategy


class SegmentPivotService:
    @classmethod
    @transaction.atomic
    def submit_and_evaluate_qualification(
        cls,
        enterprise_id: int,
        user: Any,
        answers: Dict[str, Any],
        notes: str = ""
    ) -> Dict[str, Any]:
        """
        Soumet et évalue une session de qualification selon la stratégie du segment :
        1. Valide les règles bloquantes du segment initial.
        2. Calcule la complétude.
        3. Évalue le déclenchement d'un Segment Pivot (ex: SOHO -> PME).
        4. Si pivot, met à jour l'entreprise, crée l'observation/preuve et le HandoffDossier.
        """
        enterprise = Enterprise.objects.filter(id=enterprise_id).first()
        if not enterprise:
            return {"success": False, "error": f"Entreprise #{enterprise_id} introuvable."}

        initial_segment = enterprise.segment or "SOHO"
        strategy = get_qualification_strategy(initial_segment)

        # 1. Validation métier
        is_valid, validation_errors = strategy.validate_answers(answers)
        if not is_valid:
            return {
                "success": False,
                "error": "La qualification ne respecte pas les critères bloquants.",
                "details": validation_errors
            }

        # 2. Complétude et détection de pivot
        completeness = strategy.calculate_completeness(answers)
        pivot_data = strategy.detect_segment_pivot(answers)

        pivot_triggered = pivot_data is not None
        effective_segment = pivot_data["target_segment"] if pivot_triggered else initial_segment
        pivot_reason = pivot_data["reason"] if pivot_triggered else ""

        # 3. Création de l'enregistrement de qualification
        qualification = QualificationRecord.objects.create(
            enterprise=enterprise,
            conducted_by=user,
            initial_segment=initial_segment,
            effective_segment=effective_segment,
            pivot_triggered=pivot_triggered,
            pivot_reason=pivot_reason,
            completeness_score=completeness,
            answers=answers,
            status='PIVOTED' if pivot_triggered else 'COMPLETED'
        )

        handoff = None
        if pivot_triggered:
            # Requalification du segment de l'entreprise
            enterprise.segment = effective_segment
            enterprise.save(update_fields=['segment'])

            # Recherche d'un KAM titulaire assigné ou éligible
            target_kam = enterprise.assigned_kam
            if not target_kam:
                target_kam = User.objects.filter(role=User.KAM, is_active=True).first()

            # Création du dossier de passation (Handoff)
            from_role = 'SOHO_REPRESENTATIVE'
            if getattr(user, 'role', None) == User.KAM:
                from_role = 'OUTGOING_KAM'

            handoff = HandoffDossier.objects.create(
                enterprise=enterprise,
                qualification=qualification,
                from_user=user,
                from_role=from_role,
                to_kam=target_kam,
                target_segment=effective_segment,
                status='PENDING',
                transfer_notes=notes or pivot_reason
            )

            # Chaîne de preuve traçable : observation terrain + fait audité
            obs = SourceObservation.objects.create(
                enterprise=enterprise,
                source_type='FIELD_VISIT',
                source_uri=f"onbora://qualification/{qualification.id}",
                source_title=f"Qualification Terrain : Bascule {initial_segment} -> {effective_segment}",
                observed_at=timezone.now(),
                excerpt_text=f"Pivot déclenché par {user.username}. Motif : {pivot_reason}. Réponses clés : {answers}",
                captured_by=user
            )

            Evidence.objects.create(
                enterprise=enterprise,
                observation=obs,
                statement=f"Compte requalifié en {effective_segment} suite au constat terrain. Motif : {pivot_reason}",
                kind='FACT',
                category='GOVERNANCE',
                confidence_score=0.95,
                review_status='CONFIRMED',
                reviewed_by=user
            )

        return {
            "success": True,
            "qualification_id": str(qualification.id),
            "enterprise_id": enterprise.id,
            "initial_segment": initial_segment,
            "effective_segment": effective_segment,
            "pivot_triggered": pivot_triggered,
            "pivot_reason": pivot_reason,
            "completeness_score": float(completeness),
            "handoff_id": str(handoff.id) if handoff else None,
            "handoff_status": handoff.status if handoff else None,
            "assigned_kam_id": handoff.to_kam.id if (handoff and handoff.to_kam) else None,
            "message": (
                f"Bascule de segment validée : le compte a été transféré au KAM référent ({effective_segment})."
                if pivot_triggered
                else f"Qualification enregistrée avec succès pour le segment {effective_segment}."
            )
        }

    @classmethod
    @transaction.atomic
    def accept_handoff(
        cls,
        handoff_id: str,
        kam_user: Any,
        notes: str = ""
    ) -> Dict[str, Any]:
        """
        Validation et prise en charge du dossier par le KAM référent :
        - Bascule le statut à ACCEPTED.
        - Affecte officiellement le KAM au portefeuille (PRIMARY_KAM).
        - Enregistre la décision et l'horodatage.
        """
        handoff = HandoffDossier.objects.select_related('enterprise', 'qualification', 'from_user').filter(id=handoff_id).first()
        if not handoff:
            return {"success": False, "error": f"Dossier de Handoff #{handoff_id} introuvable."}

        if handoff.status == 'ACCEPTED':
            return {"success": True, "message": "Ce dossier est déjà accepté.", "handoff_id": str(handoff.id)}

        now = timezone.now()
        handoff.status = 'ACCEPTED'
        handoff.decided_at = now
        handoff.decided_by = kam_user
        if notes:
            handoff.transfer_notes = f"{handoff.transfer_notes}\n[Prise en charge KAM] : {notes}".strip()
        handoff.to_kam = kam_user
        handoff.save()

        # Affectation officielle du KAM à l'entreprise
        enterprise = handoff.enterprise
        enterprise.assigned_kam = kam_user
        enterprise.segment = handoff.target_segment
        enterprise.save(update_fields=['assigned_kam', 'segment'])

        # Inscription dans la table d'affectation explicite (Epic 1)
        AccountPortfolioAssignment.objects.update_or_create(
            enterprise=enterprise,
            assignment_type='PRIMARY_KAM',
            defaults={
                'user': kam_user,
                'is_active': True,
                'notes': f"Assignation validée suite au Handoff #{handoff.id} émis par {handoff.from_user.username}"
            }
        )

        return {
            "success": True,
            "handoff_id": str(handoff.id),
            "status": handoff.status,
            "enterprise_id": enterprise.id,
            "enterprise_name": enterprise.name,
            "assigned_kam_id": kam_user.id,
            "assigned_kam_name": kam_user.get_full_name() or kam_user.username,
            "message": f"Dossier accepté. Le compte {enterprise.name} fait désormais partie de votre portefeuille {handoff.target_segment}."
        }

    @classmethod
    @transaction.atomic
    def return_handoff(
        cls,
        handoff_id: str,
        kam_user: Any,
        return_reason: str
    ) -> Dict[str, Any]:
        """
        Renvoi motivé du dossier au prospecteur terrain si non éligible PME/GC :
        - Statut positionné à RETURNED avec motif obligatoire.
        - Rétablissement du segment SOHO si approprié.
        """
        if not return_reason or not return_reason.strip():
            return {"success": False, "error": "Un motif de retour explicite est obligatoire."}

        handoff = HandoffDossier.objects.select_related('enterprise').filter(id=handoff_id).first()
        if not handoff:
            return {"success": False, "error": f"Dossier de Handoff #{handoff_id} introuvable."}

        now = timezone.now()
        handoff.status = 'RETURNED'
        handoff.return_reason = return_reason.strip()
        handoff.decided_at = now
        handoff.decided_by = kam_user
        handoff.save()

        # Rétablissement du segment initial SOHO sur l'entreprise
        enterprise = handoff.enterprise
        enterprise.segment = 'SOHO'
        enterprise.save(update_fields=['segment'])

        return {
            "success": True,
            "handoff_id": str(handoff.id),
            "status": handoff.status,
            "enterprise_id": enterprise.id,
            "return_reason": handoff.return_reason,
            "message": f"Dossier renvoyé au prospecteur. Le compte {enterprise.name} est repositionné en SOHO."
        }
