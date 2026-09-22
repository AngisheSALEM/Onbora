"""
Idempotent Visit Completion Service
===================================
Domaine : Sales / Mobile Outbox Synchronization (Epic 3)
Rôle : Clôture de visite transactionnelle avec déduplication idempotente stricte,
détection de conflit (HTTP 409) et orchestration de la qualification/pivot de segment.
"""

import json
import hashlib
from typing import Dict, Any, Tuple
from django.utils import timezone
from django.db import transaction
from sales.models import Enterprise, VisitPreparation, VisitReport, IdempotencyRecord
from discovery.services.pivot_service import SegmentPivotService


class IdempotentVisitService:
    @classmethod
    @transaction.atomic
    def complete_visit_idempotent(
        cls,
        idempotency_key: str,
        user: Any,
        payload: Dict[str, Any]
    ) -> Tuple[int, Dict[str, Any], bool]:
        """
        Traite la clôture de visite issue de l'Outbox mobile.
        Retourne : (http_status, response_payload, is_cached_replay)
        """
        # 1. Contrôle du cache d'idempotence
        if idempotency_key:
            existing_record = IdempotencyRecord.objects.filter(idempotency_key=idempotency_key).first()
            if existing_record:
                return existing_record.response_status, existing_record.response_payload, True

        # 2. Validation de l'entreprise
        enterprise_id = payload.get("enterprise_id")
        if not enterprise_id:
            return 400, {"detail": "Le champ 'enterprise_id' est obligatoire."}, False

        enterprise = Enterprise.objects.filter(id=enterprise_id).first()
        if not enterprise:
            return 404, {"detail": f"Entreprise #{enterprise_id} introuvable."}, False

        # 3. Détection de conflit de version (Optimistic Locking / HTTP 409)
        expected_version = payload.get("expected_version")
        if expected_version and hasattr(enterprise, "crm_projection") and enterprise.crm_projection:
            current_version = enterprise.crm_projection.source_version
            if current_version and expected_version != current_version:
                return 409, {
                    "detail": "Conflit de version détecté : la fiche client a été modifiée sur le serveur.",
                    "server_version": current_version,
                    "expected_version": expected_version,
                    "enterprise_id": enterprise.id
                }, False

        # 4. Préparation et Rapport de visite
        prep_id = payload.get("preparation_id")
        preparation = None
        if prep_id:
            preparation = VisitPreparation.objects.filter(id=prep_id).first()

        if not preparation:
            preparation = VisitPreparation.objects.create(
                enterprise=enterprise,
                salesperson=user if getattr(user, 'is_authenticated', False) else None
            )

        report, _ = VisitReport.objects.get_or_create(
            preparation=preparation,
            defaults={
                "executive_summary": payload.get("executive_summary", ""),
                "confirmed_needs": payload.get("confirmed_needs", []),
                "objections_raised": payload.get("objections_raised", []),
                "actions_todo": payload.get("actions_todo", []),
                "raw_transcript": payload.get("raw_transcript", ""),
            }
        )

        if report.executive_summary != payload.get("executive_summary", ""):
            report.executive_summary = payload.get("executive_summary", report.executive_summary)
            report.confirmed_needs = payload.get("confirmed_needs", report.confirmed_needs)
            report.objections_raised = payload.get("objections_raised", report.objections_raised)
            report.actions_todo = payload.get("actions_todo", report.actions_todo)
            report.raw_transcript = payload.get("raw_transcript", report.raw_transcript)
            report.save()

        # 5. Déclenchement de la qualification et détection de pivot si réponses transmises
        qualification_res = None
        qualification_answers = payload.get("qualification_answers")
        if qualification_answers and isinstance(qualification_answers, dict):
            qualification_res = SegmentPivotService.submit_and_evaluate_qualification(
                enterprise_id=enterprise.id,
                user=user,
                answers=qualification_answers,
                notes=report.executive_summary
            )

        enterprise.refresh_from_db()

        # 6. Assemblage du résultat
        response_data = {
            "success": True,
            "report_id": report.id,
            "preparation_id": preparation.id,
            "enterprise_id": enterprise.id,
            "enterprise_name": enterprise.name,
            "effective_segment": enterprise.segment,
            "pivot_triggered": qualification_res.get("pivot_triggered", False) if qualification_res else False,
            "handoff_id": qualification_res.get("handoff_id") if qualification_res else None,
            "handoff_status": qualification_res.get("handoff_status") if qualification_res else None,
            "completed_at": timezone.now().isoformat()
        }

        # 7. Persistance de la clé d'idempotence
        if idempotency_key:
            payload_str = json.dumps(payload, sort_keys=True, default=str)
            req_hash = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()
            IdempotencyRecord.objects.create(
                idempotency_key=idempotency_key,
                user=user if getattr(user, 'is_authenticated', False) else None,
                operation_type='VISIT_COMPLETE',
                request_hash=req_hash,
                response_status=201,
                response_payload=response_data
            )

        return 201, response_data, False
