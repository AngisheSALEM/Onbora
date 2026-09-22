import os
import sys
import logging
import tempfile

logger = logging.getLogger(__name__)

from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .models import ProspectDossier, KamAppointment, KamVisitReport, RelationshipCoverage
from twin.models import BusinessTwin
from .serializers import ProspectDossierSerializer, BusinessTwinSerializer, RelationshipCoverageSerializer
from .application.use_cases import ManageProvisioningUseCase
from .domain.exceptions import DossierNotFoundException
from accounts.permissions import IsKAMOrAdmin
from reporting.utils import log_demo_event
from onbora.exports import get_export_response
from shared.pagination import StandardResultsSetPagination


class DossierListView(generics.ListAPIView):
    serializer_class = ProspectDossierSerializer
    permission_classes = [IsKAMOrAdmin]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.role == 'KAM':
            queryset = ProspectDossier.objects.filter(kam=user).order_by('-created_at')
        else:
            queryset = ProspectDossier.objects.all().order_by('-created_at')
            
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        return queryset


class DossierDetailView(generics.RetrieveUpdateAPIView):
    queryset = ProspectDossier.objects.all()
    serializer_class = ProspectDossierSerializer
    permission_classes = [IsKAMOrAdmin]

    def perform_update(self, serializer):
        old_status = self.get_object().status
        instance = serializer.save()
        
        status_events = {
            'IN_REVIEW': ('DOSSIER_IN_REVIEW', "Dossier passé en revue par le KAM"),
            'CONTACTED': ('CLIENT_CONTACTED', "Client contacté par le KAM"),
            'MEETING_SCHEDULED': ('MEETING_SCHEDULED', "Rendez-vous planifié"),
            'NEGOTIATION': ('NEGOTIATION_STARTED', "Phase de négociation commencée"),
            'WAITING_APPROVAL': ('APPROVAL_REQUESTED', "Validation du dossier demandée"),
            'APPROVED': ('DOSSIER_APPROVED', "Dossier validé et signé"),
            'ORDER_PLACED': ('ORDER_PLACED', "Commande passée sur le SI d'Orange"),
            'PROVISIONING': ('PROVISIONING_STARTED', "Raccordement réseau initié"),
            'ACTIVATING': ('ACTIVATION_STARTED', "Activation des accès en cours"),
            'ACTIVE': ('DOSSIER_ACTIVE', "Services opérationnels et actifs"),
            'REJECTED': ('DOSSIER_REJECTED', "Dossier rejeté / Perdu"),
        }
        
        if instance.status != old_status and instance.status in status_events:
            event_type, desc = status_events[instance.status]
            log_demo_event(
                event_type,
                f"{desc} (Dossier #{instance.id})",
                user=self.request.user if self.request.user.is_authenticated else None,
                metadata={"dossier_id": instance.id, "old_status": old_status, "new_status": instance.status}
            )
        else:
            log_demo_event(
                'INTERNAL_NOTES_UPDATED',
                f"Notes internes ou statut mis à jour pour le dossier #{instance.id}",
                user=self.request.user if self.request.user.is_authenticated else None,
                metadata={"dossier_id": instance.id, "status": instance.status}
            )


class DossierBusinessTwinView(APIView):
    permission_classes = [IsKAMOrAdmin]
    
    def get(self, request, pk):
        try:
            dossier = ProspectDossier.objects.get(pk=pk)
        except ProspectDossier.DoesNotExist:
            return Response({"detail": "Dossier introuvable."}, status=status.HTTP_404_NOT_FOUND)
            
        try:
            twin = BusinessTwin.objects.get(prospect_dossier=dossier)
            serializer = BusinessTwinSerializer(twin)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except BusinessTwin.DoesNotExist:
            return Response({
                "detail": "Aucun Diagnostic d'Architecture Cible n'a été généré pour ce dossier."
            }, status=status.HTTP_404_NOT_FOUND)


from apps.kam.services.briefing_service import build_dossier_export_html


class DossierExportView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            dossier = ProspectDossier.objects.get(pk=pk)
        except ProspectDossier.DoesNotExist:
            return Response({"detail": "Dossier introuvable."}, status=status.HTTP_404_NOT_FOUND)

        log_demo_event(
            'PDF_EXPORTED',
            f"Dossier client #{dossier.id} exporté en PDF/HTML",
            user=request.user if request.user.is_authenticated else None,
            metadata={"dossier_id": dossier.id}
        )

        use_pdf = request.GET.get('format', 'pdf') == 'pdf'
        doc_type = request.GET.get('type', 'dossier')
        
        if use_pdf:
            from onbora.exports import generate_reportlab_pdf_response
            return generate_reportlab_pdf_response(doc_type, dossier)

        company_name = "Entreprise Inconnue"
        contact_name = "Contact Inconnu"
        source_label = "Inconnu"
        
        if dossier.source == ProspectDossier.INBOUND_CONVERSATION and dossier.conversation:
            profile = dossier.conversation.extracted_profile or {}
            client = dossier.conversation.client
            company_name = profile.get('company_name') or (client.company_name if client else None) or "Entreprise Inbound"
            contact_name = f"{client.first_name} {client.last_name}" if client else "Visiteur Anonyme"
            source_label = "Qualifié en ligne"
        elif dossier.source == ProspectDossier.OUTBOUND_VISIT and dossier.visit_report:
            company_name = dossier.visit_report.preparation.enterprise.name
            prep = dossier.visit_report.preparation
            contact_name = f"Commercial: {prep.salesperson.first_name} {prep.salesperson.last_name}"
            source_label = "Visite terrain"

        title = f"Dossier Client Onbora - {company_name}"
        profile_data = dossier.raw_conversation_data.get('profile', {}) if dossier.raw_conversation_data else {}
        content_html = build_dossier_export_html(dossier, company_name, contact_name, source_label, profile_data)

        return get_export_response(f"dossier_client_{pk}", title, content_html)


class DossierProvisionView(APIView):
    permission_classes = [IsKAMOrAdmin]
    
    def post(self, request, pk):
        service = request.data.get('service')
        action = request.data.get('action', 'start')
        
        if not service:
            return Response({"detail": "Paramètre 'service' requis."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            dossier = ManageProvisioningUseCase().execute((pk, service, action, request.user))
            return Response(ProspectDossierSerializer(dossier).data, status=status.HTTP_200_OK)
        except DossierNotFoundException:
            return Response({"detail": "Dossier introuvable."}, status=status.HTTP_404_NOT_FOUND)


class DossierHandoverPackView(APIView):
    """
    GET: Génère et retourne le Technical Handover Pack structuré pour l'équipe réseau / provisioning.
    """
    permission_classes = [IsKAMOrAdmin]

    def get(self, request, pk):
        from kam.services.handover_service import TechnicalHandoverService
        try:
            dossier = ProspectDossier.objects.get(pk=pk)
            handover_pack = TechnicalHandoverService.build_handover_pack(dossier)
            return Response(handover_pack, status=status.HTTP_200_OK)
        except ProspectDossier.DoesNotExist:
            return Response({"detail": "Dossier introuvable."}, status=status.HTTP_404_NOT_FOUND)


# --- ENDPOINTS ONBORA KAM INTEL, BRIEFINGS & DÉBRIEFING EN BASE DE DONNÉES RÉELLE ---

from django.db.models import Q
from django.utils import timezone
from sales.models import Enterprise
from accounts.models import User


from apps.kam.services.briefing_service import serialize_enterprise_to_kam_visit


class KamStrategicAccountListView(APIView):
    """
    GET: Retourne la liste des comptes stratégiques assignés au KAM connecté.
    RÈGLE DE SÉCURITÉ ABSOLUE :
    - Un KAM ne voit STRICTEMENT QUE les comptes qui lui ont été assignés par le KAM Office (assigned_kam=request.user).
    - Les gérants du KAM Office (KAM_MANAGER) ou Admins peuvent consulter les portefeuilles individuels via ?kam_id=<id>.
    """
    permission_classes = [IsKAMOrAdmin]

    def get(self, request):
        user = request.user
        if not user or not user.is_authenticated:
            return Response({"detail": "Authentification requise."}, status=status.HTTP_401_UNAUTHORIZED)

        if user.role == User.KAM:
            enterprises = Enterprise.objects.filter(assigned_kam=user).order_by('-annual_revenue')
        elif user.role in [User.KAM_MANAGER, User.ADMIN] or user.is_superuser:
            kam_id = request.query_params.get('kam_id')
            if kam_id:
                enterprises = Enterprise.objects.filter(assigned_kam_id=kam_id).order_by('-annual_revenue')
            else:
                enterprises = Enterprise.objects.filter(
                    Q(assigned_entity='KAM_OFFICE') | Q(segment__in=['GRAND_COMPTE', 'PME'])
                ).order_by('-annual_revenue')[:100]
        else:
            enterprises = Enterprise.objects.none()

        page = request.query_params.get('page')
        if page:
            paginator = StandardResultsSetPagination()
            page_obj = paginator.paginate_queryset(enterprises, request)
            if page_obj is not None:
                visits = [serialize_enterprise_to_kam_visit(ent) for ent in page_obj]
                return paginator.get_paginated_response(visits, extra_context={'accounts': visits})

        visits = [serialize_enterprise_to_kam_visit(ent) for ent in enterprises]
        return Response({
            "count": len(visits),
            "accounts": visits
        }, status=status.HTTP_200_OK)


class KamBriefingDetailView(APIView):
    """
    GET: Retourne le briefing pré-visite complet pour un compte spécifique.
    Vérifie que le compte appartient bien au portefeuille du KAM connecté.
    """
    permission_classes = [IsKAMOrAdmin]

    def get(self, request, account_id):
        try:
            enterprise = Enterprise.objects.get(id=account_id)
        except Enterprise.DoesNotExist:
            return Response({"detail": "Compte introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == User.KAM and enterprise.assigned_kam_id != user.id:
            return Response({"detail": "Accès refusé : ce compte n'est pas assigné à votre portefeuille."}, status=status.HTTP_403_FORBIDDEN)

        visit_data = serialize_enterprise_to_kam_visit(enterprise)
        return Response(visit_data["briefing"], status=status.HTTP_200_OK)


def _build_kam_debrief_result(enterprise, user, data, ai_data, effective_transcript) -> dict:
    """Helper to assemble structured debrief data from AI output."""
    from apps.ai_core.rag_service import get_catalog_rag
    from apps.ai_core.services.session_service import AISessionService

    rag_matches = get_catalog_rag().search(query=effective_transcript, limit=3)
    recommended_packages = [
        {
            "id": m.get("service_id") or m.get("id"),
            "title": m.get("name") or m.get("nom_offre") or m.get("titre") or "Offre Orange Business",
            "category": m.get("category") or m.get("categorie") or "Connectivité & Réseaux",
            "score": m.get("score"),
            "pricing": m.get("pricing", {}).get("model") or m.get("tarification") or "Sur devis",
            "sla": m.get("pricing", {}).get("setup_fee") or m.get("sla") or "GTR 4h 99.8%",
            "summary": m.get("description") or m.get("description_commerciale") or m.get("resume") or "",
        }
        for m in rag_matches
    ]

    try:
        session_id = f"kam_account_{enterprise.id}"
        AISessionService.append_message(
            session_id=session_id,
            role="user",
            content=f"Débriefing vocal pour {enterprise.name} : {effective_transcript}",
            metadata={"account_id": enterprise.id}
        )
        AISessionService.add_report(
            session_id=session_id,
            report={
                "type": "POST_CALL_DEBRIEF",
                "executive_summary": ai_data.get("executive_summary", ""),
                "confirmed_needs": ai_data.get("confirmed_needs", []),
                "objections_raised": ai_data.get("objections_raised", []),
                "recommended_packages": recommended_packages,
            }
        )
    except Exception as exc:
        logger.warning(f"Enregistrement session AI échoué pour {enterprise.name}: {exc}")

    return {
        "visit_id": f"account-{enterprise.id}",
        "account_name": enterprise.name,
        "date": timezone.now().strftime("%d/%m/%Y %H:%M"),
        "audio_duration_seconds": int(data.get("audio_duration_seconds", 45)),
        "transcript_text": effective_transcript,
        "executive_summary": ai_data.get("executive_summary", ""),
        "confirmed_needs": ai_data.get("confirmed_needs", []),
        "objections_raised": ai_data.get("objections_raised", []),
        "recommended_packages": recommended_packages,
        "client_followup_email": ai_data.get("client_followup_email", {
            "subject": f"Suite à notre échange — {enterprise.name} / Orange Business",
            "body": "Merci pour le temps accordé ce jour."
        }),
        "commitments_extracted": [
            {
                "id": t.get("id", f"comm-{idx}"),
                "action": t.get("title", ""),
                "owner": user.get_full_name() or user.username,
                "due_date": t.get("deadline", "J+2"),
                "status": "IN_PROGRESS"
            }
            for idx, t in enumerate(ai_data.get("action_tasks", []))
        ],
        "risk_level": "LOW" if len(ai_data.get("objections_raised", [])) <= 1 else "MEDIUM",
        "next_step_recommendation": ai_data.get("crm_payload", {}).get("next_step", "Transmettre la proposition sous 48h.")
    }


def _apply_kam_debrief_updates(enterprise, user, data, conversion_notes_val):
    """Helper to update enterprise status and revenue after a debrief."""
    conversion_status_val = data.get('conversion_status', enterprise.conversion_status)
    converted_amount_val = data.get('converted_amount')
    converted_offer_val = data.get('converted_offer')

    if conversion_status_val in dict(Enterprise.CONVERSION_STATUS_CHOICES):
        enterprise.conversion_status = conversion_status_val

    if converted_amount_val is not None:
        try:
            enterprise.converted_amount = float(converted_amount_val)
        except (ValueError, TypeError):
            pass

    if converted_offer_val is not None:
        enterprise.converted_offer = str(converted_offer_val).strip()

    if conversion_notes_val is not None:
        enterprise.conversion_notes = str(conversion_notes_val).strip()

    if conversion_status_val == 'CONVERTED':
        enterprise.converted_at = timezone.now()
        enterprise.converted_by_user = user
        enterprise.converted_by_entity = 'KAM_OFFICE'

    enterprise.save()


class KamAccountDebriefView(APIView):
    """
    POST: Enregistre le compte-rendu de visite, met à jour le statut commercial
          (IN_NEGOTIATION, CONVERTED, LOST), le montant contractuel signé et les notes de débriefing.
          Ces données mettent immédiatement à jour la base SQLite et se reflètent en direct
          dans la vue Direction du KAM Office.
    """
    permission_classes = [IsKAMOrAdmin]

    def get(self, request, account_id):
        try:
            enterprise = Enterprise.objects.get(id=account_id)
        except Enterprise.DoesNotExist:
            return Response({"detail": "Compte introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == User.KAM and enterprise.assigned_kam_id != user.id:
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        from apps.ai_core.unified_engine import get_unified_core_ai
        engine = get_unified_core_ai()
        default_transcript = enterprise.conversion_notes or f"Entretien stratégique avec {enterprise.contact_name or 'la Direction'} chez {enterprise.name}."
        ai_data = engine.generate_post_call_execution(enterprise, user, default_transcript)

        debrief_result = {
            "visit_id": f"account-{enterprise.id}",
            "account_name": enterprise.name,
            "date": timezone.now().strftime("%d/%m/%Y %H:%M"),
            "audio_duration_seconds": 60,
            "transcript_text": default_transcript,
            "executive_summary": ai_data.get("executive_summary", enterprise.conversion_notes or ""),
            "confirmed_needs": ai_data.get("confirmed_needs", []),
            "objections_raised": ai_data.get("objections_raised", []),
            "client_followup_email": ai_data.get("client_followup_email", {
                "subject": f"Suite à notre échange — {enterprise.name} / Orange Business",
                "body": f"Bonjour {enterprise.contact_name or 'Madame, Monsieur'},\n\nJe vous remercie pour notre échange..."
            }),
            "commitments_extracted": [
                {
                    "id": t.get("id", f"comm-{idx}"),
                    "action": t.get("title", ""),
                    "owner": user.get_full_name() or user.username,
                    "due_date": t.get("deadline", "J+2"),
                    "status": "IN_PROGRESS"
                }
                for idx, t in enumerate(ai_data.get("action_tasks", []))
            ],
            "risk_level": "LOW" if len(ai_data.get("objections_raised", [])) <= 1 else "MEDIUM",
            "next_step_recommendation": ai_data.get("crm_payload", {}).get("next_step", "Transmettre l'offre technique sous 48h.")
        }

        return Response({
            "debrief": debrief_result,
            "visit": serialize_enterprise_to_kam_visit(enterprise)
        }, status=status.HTTP_200_OK)

    def post(self, request, account_id):
        try:
            enterprise = Enterprise.objects.get(id=account_id)
        except Enterprise.DoesNotExist:
            return Response({"detail": "Compte introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == User.KAM and enterprise.assigned_kam_id != user.id:
            return Response({"detail": "Accès refusé : vous n'êtes pas le KAM assigné à ce compte."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        conversion_notes_val = data.get('conversion_notes', '').strip()
        notes_val = data.get('notes', '').strip() or conversion_notes_val
        transcript_val = data.get('transcript', '').strip()
        generate_ai = data.get('generate_ai', False)

        from apps.ai_core.unified_engine import get_unified_core_ai
        engine = get_unified_core_ai()

        # Combinaison intelligente : Transcription vocale Whisper + Notes écrites du KAM
        if transcript_val and notes_val:
            effective_transcript = f"[Transcription Vocale Whisper] :\n{transcript_val}\n\n[Notes & Observations du KAM] :\n{notes_val}"
        elif transcript_val:
            effective_transcript = transcript_val
        elif notes_val:
            effective_transcript = notes_val
        else:
            effective_transcript = f"Compte-rendu de réunion d'affaires avec {enterprise.contact_name or 'la Direction'} chez {enterprise.name}."
        
        debrief_result = None
        if generate_ai or transcript_val or notes_val:
            ai_data = engine.generate_post_call_execution(enterprise, user, effective_transcript)
            if not conversion_notes_val and ai_data.get("executive_summary"):
                conversion_notes_val = ai_data["executive_summary"]
            debrief_result = _build_kam_debrief_result(enterprise, user, data, ai_data, effective_transcript)

        _apply_kam_debrief_updates(enterprise, user, data, conversion_notes_val or notes_val)

        log_demo_event(
            'KAM_DEBRIEF_SUBMITTED',
            f"Débriefing KAM soumis pour {enterprise.name} — Statut: {enterprise.get_conversion_status_display()}, Montant: {enterprise.converted_amount} USD",
            user=user if user.is_authenticated else None,
            metadata={
                "enterprise_id": enterprise.id,
                "status": enterprise.conversion_status,
                "amount": float(enterprise.converted_amount)
            }
        )

        resp_data = {
            "detail": f"Compte {enterprise.name} mis à jour avec succès.",
            "visit": serialize_enterprise_to_kam_visit(enterprise)
        }
        if debrief_result:
            resp_data["debrief"] = debrief_result

        return Response(resp_data, status=status.HTTP_200_OK)


class KamAccountUpdateInfoView(APIView):
    """
    PATCH / POST: Permet au KAM de mettre à jour directement les informations de son client
    (contacts, noms et fonctions des décideurs, effectif, opérateur actuel, etc.)
    depuis son briefing ou son rapport.
    """
    permission_classes = [IsKAMOrAdmin]

    def patch(self, request, account_id):
        return self._update(request, account_id)

    def post(self, request, account_id):
        return self._update(request, account_id)

    def _update(self, request, account_id):
        try:
            enterprise = Enterprise.objects.get(id=account_id)
        except Enterprise.DoesNotExist:
            return Response({"detail": "Compte introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == User.KAM and enterprise.assigned_kam_id != user.id:
            return Response({"detail": "Accès refusé : vous n'êtes pas le KAM assigné à ce compte."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data

        # Mise à jour des contacts et décideurs
        if 'contact_name' in data:
            enterprise.contact_name = str(data['contact_name']).strip()
        if 'contact_role' in data:
            enterprise.contact_role = str(data['contact_role']).strip()
        if 'contact_phone' in data:
            enterprise.contact_phone = str(data['contact_phone']).strip()
        if 'contact_email' in data:
            enterprise.contact_email = str(data['contact_email']).strip()

        # Métriques d'entreprise
        if 'employee_count' in data:
            try:
                enterprise.employee_count = max(1, int(data['employee_count']))
            except (ValueError, TypeError):
                pass
        if 'site_count' in data:
            try:
                enterprise.site_count = max(1, int(data['site_count']))
            except (ValueError, TypeError):
                pass
        if 'annual_revenue' in data:
            try:
                enterprise.annual_revenue = max(0, float(data['annual_revenue']))
            except (ValueError, TypeError):
                pass

        # Concurrence et connectivité
        if 'current_operator' in data:
            enterprise.current_operator = str(data['current_operator']).strip()
        if 'current_connectivity' in data:
            enterprise.current_connectivity = str(data['current_connectivity']).strip()

        # Adresse
        if 'address' in data:
            enterprise.address = str(data['address']).strip()
        if 'commune' in data:
            enterprise.commune = str(data['commune']).strip()
        if 'city' in data:
            enterprise.city = str(data['city']).strip()

        enterprise.save()

        log_demo_event(
            'KAM_ACCOUNT_INFO_UPDATED',
            f"Fiche client mise à jour par le KAM {user.username} pour {enterprise.name} (Contact: {enterprise.contact_name}, Rôle: {enterprise.contact_role})",
            user=user if user.is_authenticated else None,
            metadata={
                "enterprise_id": enterprise.id,
                "contact_name": enterprise.contact_name,
                "contact_role": enterprise.contact_role,
            }
        )

        return Response({
            "detail": f"Fiche client de {enterprise.name} mise à jour avec succès.",
            "visit": serialize_enterprise_to_kam_visit(enterprise)
        }, status=status.HTTP_200_OK)


# ============================================================================
# KAM APPOINTMENTS (AGENDA), VOCAL BRIEFING WITH CORE AI & VISITS HISTORY
# ============================================================================

def serialize_kam_appointment(app: KamAppointment) -> dict:
    has_rep = hasattr(app, 'report') and app.report is not None
    return {
        "id": app.id,
        "enterprise_id": app.enterprise_id,
        "enterprise_name": app.enterprise.name if app.enterprise else "Client",
        "crm_id": app.enterprise.crm_id if app.enterprise else f"CRM-{app.enterprise_id:04d}",
        "sector": app.enterprise.sector if app.enterprise else "Services",
        "title": app.title,
        "meeting_type": app.meeting_type,
        "meeting_type_label": app.get_meeting_type_display(),
        "scheduled_at": app.scheduled_at.isoformat() if hasattr(app.scheduled_at, 'isoformat') else str(app.scheduled_at),
        "duration_minutes": app.duration_minutes,
        "location": app.location or (app.enterprise.location if app.enterprise else "Kinshasa"),
        "meet_url": app.meet_url or "",
        "contact_name": app.contact_name or (app.enterprise.contact_name if app.enterprise else ""),
        "contact_role": app.contact_role or (app.enterprise.contact_role if app.enterprise else ""),
        "objective": app.objective or "",
        "status": app.status,
        "status_label": app.get_status_display(),
        "has_report": has_rep,
        "report_id": app.report.id if has_rep else None,
        "created_at": app.created_at.isoformat() if hasattr(app.created_at, 'isoformat') else str(app.created_at),
    }


def serialize_kam_visit_report(rep: KamVisitReport) -> dict:
    return {
        "id": rep.id,
        "appointment_id": rep.appointment_id,
        "enterprise_id": rep.enterprise_id,
        "enterprise_name": rep.enterprise.name if rep.enterprise else "Client",
        "enterprise_sector": rep.enterprise.sector if rep.enterprise else "Services",
        "crm_id": rep.enterprise.crm_id if rep.enterprise else f"CRM-{rep.enterprise_id:04d}",
        "meeting_type": rep.appointment.meeting_type if rep.appointment else "PHYSICAL",
        "meeting_type_label": rep.appointment.get_meeting_type_display() if rep.appointment else "Visite Terrain (Physique)",
        "contact_name": (rep.appointment.contact_name if rep.appointment and rep.appointment.contact_name else rep.enterprise.contact_name) if rep.enterprise else "",
        "contact_role": (rep.appointment.contact_role if rep.appointment and rep.appointment.contact_role else rep.enterprise.contact_role) if rep.enterprise else "",
        "raw_transcript": rep.raw_transcript,
        "executive_summary": rep.executive_summary,
        "confirmed_needs": rep.confirmed_needs or [],
        "objections_raised": rep.objections_raised or [],
        "actions_todo": rep.actions_todo or [],
        "follow_up_email_draft": rep.follow_up_email_draft,
        "bant_scores": rep.bant_scores or {},
        "conversion_status": rep.conversion_status,
        "recommended_packages": (rep.crm_payload.get("recommended_packages") if rep.crm_payload else []) or [],
        "crm_payload": rep.crm_payload or {},
        "created_at": rep.created_at.isoformat() if hasattr(rep.created_at, 'isoformat') else str(rep.created_at),
    }


class KamAppointmentListCreateView(APIView):
    """
    GET: Liste réelle des rendez-vous planifiés du KAM connecté.
    POST: Planifie un nouveau rendez-vous / meet avec un compte client assigné.
    """
    permission_classes = [IsKAMOrAdmin]

    def get(self, request):
        user = request.user
        if user.role == User.KAM:
            appointments = KamAppointment.objects.filter(kam=user).select_related('enterprise', 'report').order_by('scheduled_at')
        else:
            appointments = KamAppointment.objects.all().select_related('enterprise', 'report').order_by('scheduled_at')

        return Response([serialize_kam_appointment(app) for app in appointments], status=status.HTTP_200_OK)

    def post(self, request):
        user = request.user
        data = request.data

        enterprise_id = data.get('enterprise_id')
        title = data.get('title', '').strip()
        meeting_type = data.get('meeting_type', 'PHYSICAL')
        scheduled_at = data.get('scheduled_at')
        duration_minutes = int(data.get('duration_minutes', 45))
        location = data.get('location', '').strip()
        meet_url = data.get('meet_url', '').strip()
        contact_name = data.get('contact_name', '').strip()
        contact_role = data.get('contact_role', '').strip()
        objective = data.get('objective', '').strip()

        if not enterprise_id:
            return Response({"detail": "Le compte client est requis."}, status=status.HTTP_400_BAD_REQUEST)
        if not title:
            return Response({"detail": "Le titre ou l'objet du rendez-vous est requis."}, status=status.HTTP_400_BAD_REQUEST)
        if not scheduled_at:
            return Response({"detail": "La date et l'heure du rendez-vous sont requises."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            enterprise = Enterprise.objects.get(id=enterprise_id)
        except Enterprise.DoesNotExist:
            return Response({"detail": "Compte client introuvable."}, status=status.HTTP_404_NOT_FOUND)

        if user.role == User.KAM and enterprise.assigned_kam_id != user.id:
            return Response({"detail": "Accès refusé : ce compte n'est pas dans votre portefeuille."}, status=status.HTTP_403_FORBIDDEN)

        # Remplissage par défaut du contact si non fourni
        if not contact_name:
            contact_name = enterprise.contact_name or "Décideur Principal"
        if not contact_role:
            contact_role = enterprise.contact_role or "Directeur Général"

        app = KamAppointment.objects.create(
            kam=user,
            enterprise=enterprise,
            title=title,
            meeting_type=meeting_type,
            scheduled_at=scheduled_at,
            duration_minutes=duration_minutes,
            location=location or (enterprise.location or "Siège client"),
            meet_url=meet_url,
            contact_name=contact_name,
            contact_role=contact_role,
            objective=objective or f"Échange stratégique et revue des besoins télécoms avec {enterprise.name}",
            status='SCHEDULED'
        )

        log_demo_event(
            'KAM_APPOINTMENT_SCHEDULED',
            f"Nouveau rendez-vous planifié par {user.username} avec {enterprise.name} ({app.get_meeting_type_display()} le {app.scheduled_at})",
            user=user if user.is_authenticated else None,
            metadata={
                "appointment_id": app.id,
                "enterprise_id": enterprise.id,
                "meeting_type": app.meeting_type,
                "scheduled_at": str(app.scheduled_at)
            }
        )

        return Response(serialize_kam_appointment(app), status=status.HTTP_201_CREATED)


class KamAppointmentDetailView(APIView):
    """
    GET, PATCH, DELETE: Consultation, modification de statut ou annulation d'un rendez-vous.
    """
    permission_classes = [IsKAMOrAdmin]

    def get(self, request, pk):
        try:
            app = KamAppointment.objects.select_related('enterprise', 'report').get(pk=pk)
        except KamAppointment.DoesNotExist:
            return Response({"detail": "Rendez-vous introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == User.KAM and app.kam_id != user.id:
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        return Response(serialize_kam_appointment(app), status=status.HTTP_200_OK)

    def patch(self, request, pk):
        try:
            app = KamAppointment.objects.select_related('enterprise').get(pk=pk)
        except KamAppointment.DoesNotExist:
            return Response({"detail": "Rendez-vous introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == User.KAM and app.kam_id != user.id:
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        if 'status' in data and data['status'] in dict(KamAppointment.STATUS_CHOICES):
            app.status = data['status']
        if 'meet_url' in data:
            app.meet_url = data['meet_url'].strip()
        if 'objective' in data:
            app.objective = data['objective'].strip()
        if 'scheduled_at' in data:
            app.scheduled_at = data['scheduled_at']

        app.save()
        return Response(serialize_kam_appointment(app), status=status.HTTP_200_OK)

    def delete(self, request, pk):
        try:
            app = KamAppointment.objects.get(pk=pk)
        except KamAppointment.DoesNotExist:
            return Response({"detail": "Rendez-vous introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == User.KAM and app.kam_id != user.id:
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        app.delete()
        return Response({"detail": "Rendez-vous supprimé avec succès."}, status=status.HTTP_200_OK)


def _qualify_vocal_meeting(appointment, transcript: str, user) -> tuple:
    """Runs qualification engine and returns (executive_summary, needs, objections, actions_todo, email, bant_scores)."""
    from shared.infrastructure.ai_providers import is_insufficient_verbatim

    # Zéro hallucination si verbatim insuffisant (ex: juste 'bonjour' ou inaudible)
    if is_insufficient_verbatim(transcript):
        executive_summary = (
            f"Données insuffisantes pour formaliser un compte-rendu pour {appointment.enterprise.name}. "
            "L'enregistrement audio ne contient pas d'échange commercial exploitable pour qualifier des besoins ou objections."
        )
        confirmed_needs = []
        objections_raised = []
        actions_todo = [f"Recontacter {appointment.contact_name or 'le client'} pour planifier un entretien approfondi"]
        follow_up_email = (
            f"Bonjour {appointment.contact_name or 'Madame, Monsieur'},\n\n"
            f"Suite à notre brève prise de contact au sujet de {appointment.enterprise.name}, je me permets de revenir vers vous afin d'organiser un échange de 20 minutes pour faire le point sur vos enjeux d'infrastructure et de connectivité.\n\n"
            f"Quelles seraient vos disponibilités dans les prochains jours ?\n\n"
            f"Bien cordialement,\n{user.get_full_name() or user.username}\nKey Account Manager — Orange Business B2B"
        )
        bant_scores = {
            "budget": 0,
            "authority": 5,
            "need": 0,
            "timeline": 0,
            "total": 5,
            "status": "INSUFFICIENT_DATA"
        }
        return executive_summary, confirmed_needs, objections_raised, actions_todo, follow_up_email, bant_scores

    from sales.services.qualification_service import BANTQualificationService
    qualification_service = BANTQualificationService()

    enterprise_dict = {
        'name': appointment.enterprise.name,
        'sector': appointment.enterprise.sector or 'Services',
        'approximate_size': str(appointment.enterprise.employee_count or 25),
        'location': appointment.enterprise.location or appointment.enterprise.plaque,
        'contact_name': appointment.contact_name or appointment.enterprise.contact_name or "Direction",
    }

    try:
        qual_res = qualification_service.process_visit_transcription(transcript, enterprise_dict)
        executive_summary = qual_res.executive_summary or f"Échange avec {appointment.contact_name} chez {appointment.enterprise.name}."
        confirmed_needs = [n for n in qual_res.detected_needs if n and isinstance(n, str) and n.strip()]
        objections_raised = [o for o in qual_res.detected_objections if o and isinstance(o, str) and o.strip()]
        actions_todo = [a for a in getattr(qual_res, 'actions_todo', []) if a and isinstance(a, str) and a.strip()]
        follow_up_email = qual_res.email_follow_up_j1 or (
            f"Bonjour {appointment.contact_name},\n\n"
            f"Je tiens à vous remercier pour notre échange ce jour au sujet de {appointment.enterprise.name}.\n\n"
            f"Restant à votre entière disposition pour tout complément.\n\n"
            f"Bien cordialement,\n"
            f"{user.get_full_name() or user.username}\n"
            f"Key Account Manager — Orange Business B2B"
        )
        bant_scores = {
            "budget": qual_res.bant.budget_score,
            "authority": qual_res.bant.authority_score,
            "need": qual_res.bant.need_score,
            "timeline": qual_res.bant.timeline_score,
            "total": qual_res.bant.total_score,
            "status": qual_res.bant.status,
        }
    except Exception as exc:
        logger.warning(f"Erreur qualification vocale ({exc}), utilisation du statut insuffisant.")
        executive_summary = f"Compte-rendu de rendez-vous avec {appointment.contact_name} chez {appointment.enterprise.name}."
        confirmed_needs = []
        objections_raised = []
        actions_todo = [f"Recontacter {appointment.contact_name} pour planifier un entretien approfondi"]
        follow_up_email = (
            f"Bonjour {appointment.contact_name},\n\n"
            f"Merci pour notre rendez-vous concernant {appointment.enterprise.name}.\n\n"
            f"Cordialement,\n{user.get_full_name() or user.username}"
        )
        bant_scores = {"total": 0, "status": "INSUFFICIENT_DATA"}

    return executive_summary, confirmed_needs, objections_raised, actions_todo, follow_up_email, bant_scores


def _persist_meeting_report(appointment, user, transcript, audio_file_path, conversion_status_val,
                            executive_summary, confirmed_needs, objections_raised, actions_todo, follow_up_email, bant_scores):
    """Delegates KamVisitReport persistence and AI session memory update to briefing_service."""
    from apps.kam.services.briefing_service import persist_meeting_report
    return persist_meeting_report(
        appointment, user, transcript, audio_file_path, conversion_status_val,
        executive_summary, confirmed_needs, objections_raised, follow_up_email, bant_scores,
        actions_todo=actions_todo
    )


class KamCompleteVocalMeetingView(APIView):
    """
    POST: Clôture le rendez-vous vocal pendant la visite, le connecte directement avec Core AI
    (BANTQualificationService) et génère :
    1. Le compte-rendu exécutif de visite structuré
    2. L'analyse BANT & détection des besoins / objections réels (zéro hallucination / zéro mock)
    3. L'email formel de remerciement et de relance
    4. Enregistre le rapport en base SQLite et met à jour le statut du compte.
    """
    permission_classes = [IsKAMOrAdmin]

    def post(self, request, pk):
        try:
            appointment = KamAppointment.objects.select_related('enterprise').get(pk=pk)
        except KamAppointment.DoesNotExist:
            return Response({"detail": "Rendez-vous introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == User.KAM and appointment.kam_id != user.id:
            return Response({"detail": "Accès refusé : vous n'êtes pas l'organisateur de ce rendez-vous."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        transcript = data.get('transcript', '').strip()
        notes = data.get('notes', '').strip()
        conversion_status_val = data.get('conversion_status', 'IN_NEGOTIATION')
        audio_file_path = data.get('audio_file_path', '')

        # Combinaison intelligente : Transcription vocale Whisper + Notes écrites du KAM
        if transcript and notes:
            combined_transcript = f"[Transcription Vocale Whisper] :\n{transcript}\n\n[Notes & Observations du KAM] :\n{notes}"
        elif transcript:
            combined_transcript = transcript
        elif notes:
            combined_transcript = notes
        else:
            combined_transcript = ""

        exec_sum, needs, objections, actions_todo, email, bant_scores = _qualify_vocal_meeting(appointment, combined_transcript, user)
        report, enterprise = _persist_meeting_report(
            appointment, user, combined_transcript, audio_file_path, conversion_status_val,
            exec_sum, needs, objections, actions_todo, email, bant_scores
        )

        log_demo_event(
            'KAM_MEETING_COMPLETED_WITH_AI',
            f"Rendez-vous vocal clôturé et rapport Core AI généré pour {enterprise.name} (Rapport #{report.id})",
            user=user if user.is_authenticated else None,
            metadata={
                "appointment_id": appointment.id,
                "report_id": report.id,
                "enterprise_id": enterprise.id,
                "conversion_status": enterprise.conversion_status,
                "bant_total": bant_scores.get('total')
            }
        )

        return Response({
            "detail": "Compte-rendu et email générés par Core AI avec succès.",
            "report": serialize_kam_visit_report(report),
            "appointment": serialize_kam_appointment(appointment),
        }, status=status.HTTP_201_CREATED)


class KamVisitHistoryListView(APIView):
    """
    GET: Liste réelle de l'historique des visites du KAM connecté.
    AUCUN MOCK : Données 100% réelles issues de KamVisitReport.
    Si 0 visite en base, retourne une liste vide.
    """
    permission_classes = [IsKAMOrAdmin]

    def get(self, request):
        user = request.user
        if user.role == User.KAM:
            reports = KamVisitReport.objects.filter(kam=user).select_related('appointment', 'enterprise').order_by('-created_at')
        else:
            reports = KamVisitReport.objects.all().select_related('appointment', 'enterprise').order_by('-created_at')

        page = request.query_params.get('page')
        if page:
            paginator = StandardResultsSetPagination()
            page_obj = paginator.paginate_queryset(reports, request)
            if page_obj is not None:
                serialized = [serialize_kam_visit_report(r) for r in page_obj]
                return paginator.get_paginated_response(serialized, extra_context={'visits': serialized})

        return Response({
            "count": reports.count(),
            "visits": [serialize_kam_visit_report(r) for r in reports]
        }, status=status.HTTP_200_OK)


class KamVisitReportDetailView(APIView):
    """
    GET: Rapport de visite détaillé spécifique.
    """
    permission_classes = [IsKAMOrAdmin]

    def get(self, request, pk):
        try:
            report = KamVisitReport.objects.select_related('appointment', 'enterprise').get(pk=pk)
        except KamVisitReport.DoesNotExist:
            return Response({"detail": "Rapport introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == User.KAM and report.kam_id != user.id:
            return Response({"detail": "Accès refusé."}, status=status.HTTP_403_FORBIDDEN)

        return Response(serialize_kam_visit_report(report), status=status.HTTP_200_OK)


class KamAudioTranscribeView(APIView):
    """
    POST: Transcrit un flux ou fichier audio envoyé par le KAM (WebM, WAV, MP3, M4A, OGG)
    avec OpenAI Whisper officiel (local PyTorch ou API).
    ZÉRO hallucination / ZÉRO mock.
    """
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import tempfile
        try:
            from sales.whisper_service import transcribe_audio_file
        except ImportError:
            from apps.sales.whisper_service import transcribe_audio_file
        from shared.infrastructure.ai_providers import is_insufficient_verbatim

        audio_file = request.FILES.get('audio') or request.FILES.get('file') or request.FILES.get('audio_file')
        if not audio_file:
            return Response({"detail": "Aucun flux audio reçu par le serveur."}, status=status.HTTP_400_BAD_REQUEST)

        orig_name = getattr(audio_file, 'name', '') or 'recording.webm'
        ext = os.path.splitext(orig_name)[1] or '.webm'
        if not ext.startswith('.'):
            ext = f".{ext}"

        logger.info(f"[Whisper] Réception audio: nom={orig_name}, taille={audio_file.size} octets")
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                for chunk in audio_file.chunks():
                    tmp.write(chunk)
                tmp.flush()
                tmp_path = tmp.name

            # Utilisation du modèle 'tiny' optimisé pour CPU (réponse en 2-3s vs 2-3min sur CPU)
            res = transcribe_audio_file(tmp_path, model_name="tiny")
            transcript = (res.get("text") or "").strip()
            is_insufficient = is_insufficient_verbatim(transcript)
            logger.info(f"[Whisper] Résultat transcription: {len(transcript)} caractères, insuffisant={is_insufficient}, provider={res.get('provider')}")

            return Response({
                "success": res.get("success", False) or bool(transcript),
                "transcript": transcript,
                "language": res.get("language", "fr"),
                "provider": res.get("provider", "openai-whisper"),
                "is_insufficient": is_insufficient,
                "message": "Transcription Whisper réussie" if transcript else "Aucune voix distincte détectée dans l'enregistrement."
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"[Whisper] Erreur transcription: {e}", exc_info=True)
            return Response({
                "success": False,
                "transcript": "",
                "error": str(e),
                "provider": "openai-whisper",
                "is_insufficient": True,
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass


class RelationshipCoverageListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        enterprise_id = request.query_params.get('enterprise_id')
        qs = RelationshipCoverage.objects.select_related('enterprise', 'last_interaction_proof').all()
        if enterprise_id:
            qs = qs.filter(enterprise_id=enterprise_id)
        serializer = RelationshipCoverageSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = RelationshipCoverageSerializer(data=request.data)
        if serializer.is_valid():
            coverage = serializer.save()
            from .services.relationship_service import RelationshipCoverageService
            diag = RelationshipCoverageService.evaluate_account_relationship_coverage(coverage.enterprise_id)
            return Response({
                "coverage": RelationshipCoverageSerializer(coverage).data,
                "diagnostic": diag
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RelationshipCoverageDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RelationshipCoverageSerializer
    queryset = RelationshipCoverage.objects.select_related('enterprise', 'last_interaction_proof').all()


class RelationshipCoverageDiagnosticView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, enterprise_id):
        from .services.relationship_service import RelationshipCoverageService
        diag = RelationshipCoverageService.evaluate_account_relationship_coverage(enterprise_id)
        if "error" in diag:
            return Response(diag, status=status.HTTP_404_NOT_FOUND)
        return Response(diag, status=status.HTTP_200_OK)


# ============================================================================
# EPIC 5 VIEWS : RADAR DE RISQUE EXPLICABLE & MÉMOIRE DE COMPTE (HANDOVER)
# ============================================================================

class AccountMemoryEventListCreateView(APIView):
    """
    GET / POST: Registre de mémoire de compte (Epic 5).
    Consigne les décisions, promesses, incidents majeurs et jalons avec pièces justificatives.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, enterprise_id):
        from .models import AccountMemoryEvent
        from .serializers import AccountMemoryEventSerializer
        events = AccountMemoryEvent.objects.filter(enterprise_id=enterprise_id).select_related('created_by', 'evidence').order_by('-occurred_at')
        return Response(AccountMemoryEventSerializer(events, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, enterprise_id):
        from .services.account_memory_service import AccountMemoryService
        from .serializers import AccountMemoryEventSerializer
        event = AccountMemoryService.record_event(
            enterprise_id=enterprise_id,
            user=request.user,
            event_type=request.data.get('event_type', 'DECISION'),
            summary=request.data.get('summary', ''),
            details=request.data.get('details', ''),
            occurred_at=request.data.get('occurred_at'),
            evidence_id=request.data.get('evidence_id'),
            is_critical=bool(request.data.get('is_critical', False))
        )
        return Response(AccountMemoryEventSerializer(event).data, status=status.HTTP_201_CREATED)


class AccountHandoverPackView(APIView):
    """
    GET: Génération en un clic du dossier de passation stratégique (Handover Pack).
    Fournit au KAM entrant l'historique complet, les promesses, les risques et la cartographie.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, enterprise_id):
        from .services.account_memory_service import AccountMemoryService
        pack = AccountMemoryService.generate_handover_pack(
            enterprise_id=enterprise_id,
            outgoing_kam=request.user
        )
        if "error" in pack:
            return Response(pack, status=status.HTTP_404_NOT_FOUND)
        return Response(pack, status=status.HTTP_200_OK)


class AccountRiskSignalsView(APIView):
    """
    GET: Retourne les signaux radar explicables (échéance contrat, mono-champion, inactivité).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, enterprise_id):
        from .services.radar_service import SignalRuleEvaluator
        signals = SignalRuleEvaluator.evaluate_account_signals(enterprise_id)
        if "error" in signals:
            return Response(signals, status=status.HTTP_404_NOT_FOUND)
        return Response(signals, status=status.HTTP_200_OK)


