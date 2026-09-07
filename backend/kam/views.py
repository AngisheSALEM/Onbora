from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .models import ProspectDossier
from twin.models import BusinessTwin
from .serializers import ProspectDossierSerializer, BusinessTwinSerializer
from .application.use_cases import ManageProvisioningUseCase
from .domain.exceptions import DossierNotFoundException
from accounts.permissions import IsKAMOrAdmin
from reporting.utils import log_demo_event
from onbora.exports import get_export_response


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
        current_problems = profile_data.get('current_problems', [])
        current_tools = profile_data.get('current_tools', [])
        
        problems_html = "".join([f'<span class="badge badge-danger">{prob}</span>' for prob in current_problems])
        tools_html = "".join([f'<span class="badge badge-neutral">{tool}</span>' for tool in current_tools])

        twin_html = ""
        try:
            twin = BusinessTwin.objects.get(prospect_dossier=dossier)
            current_items = "".join([f"<li>⚠️ {item}</li>" for item in (twin.current_state or [])])
            proposed_items = "".join([f"<li>✓ {item}</li>" for item in (twin.proposed_state or [])])
            
            services_items = ""
            for s in (twin.recommended_services or []):
                services_items += f"""
                <div style="margin-bottom: 12px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
                    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 13px;">
                        <span>{s.get('name')}</span>
                        <span class="badge badge-success">{s.get('priority')}</span>
                    </div>
                    <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b;">{s.get('reasoning')}</p>
                </div>
                """
                
            roadmap_items = ""
            for idx, step in enumerate(twin.roadmap or []):
                roadmap_items += f"""
                <div class="timeline-item">
                    <p class="timeline-title">Étape {idx+1}</p>
                    <p class="timeline-desc">{step}</p>
                </div>
                """
                
            twin_html = f"""
            <div class="section">
                <h3 class="section-title">Diagnostic d'Architecture Cible</h3>
                <div class="grid">
                    <div class="card" style="border-color: #cbd5e1; background-color: #f8fafc;">
                        <p class="card-title" style="color: #64748b;">Situation Initiale (Avant)</p>
                        <ul class="list-unstyled">
                            {current_items}
                        </ul>
                    </div>
                    <div class="card" style="border-color: #fed7aa; background-color: #fff7ed;">
                        <p class="card-title" style="color: #ea580c;">Situation Proposée (Après)</p>
                        <ul class="list-unstyled">
                            {proposed_items}
                        </ul>
                    </div>
                </div>
            </div>

            <div class="section">
                <h3 class="section-title">Services MSP Préconisés</h3>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    {services_items}
                </div>
            </div>

            <div class="section">
                <h3 class="section-title">Roadmap de déploiement</h3>
                <div class="timeline">
                    {roadmap_items}
                </div>
            </div>
            """
        except BusinessTwin.DoesNotExist:
            twin_html = """
            <div class="section">
                <h3 class="section-title">Diagnostic d'Architecture Cible</h3>
                <div class="card">
                    <p style="margin: 0; color: #64748b; font-size: 13px; font-style: italic;">Aucun Diagnostic d'Architecture Cible n'a été généré pour ce dossier.</p>
                </div>
            </div>
            """

        content_html = f"""
        <h2 class="document-title">DOSSIER PROSPECT & SUIVI CLIENT</h2>
        
        <div class="section">
            <h3 class="section-title">Informations Administratives</h3>
            <div class="card">
                <ul class="list-unstyled">
                    <li><strong>Nom de l'entreprise :</strong> {company_name}</li>
                    <li><strong>Contact :</strong> {contact_name}</li>
                    <li><strong>Statut d'intégration :</strong> <span class="badge badge-neutral">{dossier.status}</span></li>
                    <li><strong>Origine :</strong> {source_label}</li>
                    <li><strong>Date de création :</strong> {dossier.created_at.strftime('%d/%m/%Y %H:%M')}</li>
                    <li><strong>Conseiller KAM affecté :</strong> {f"{dossier.kam.first_name} {dossier.kam.last_name}" if (dossier.kam and dossier.kam.first_name) else 'Non assigné'}</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Notes Internes du Conseiller</h3>
            <div class="card" style="background-color: #fef3c7; border-color: #fde68a;">
                <p style="margin: 0; font-size: 13px; white-space: pre-wrap; font-weight: 500;">{dossier.internal_kam_notes or 'Aucune note interne saisie pour le moment.'}</p>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Synthèse de conversation</h3>
            <div class="grid">
                <div class="card">
                    <p class="card-title">Secteur & Taille</p>
                    <ul class="list-unstyled">
                        <li><strong>Secteur :</strong> {profile_data.get('sector', 'Non qualifié')}</li>
                        <li><strong>Taille :</strong> {profile_data.get('company_size_estimate', 'Non qualifié')}</li>
                        <li><strong>Sites géographiques :</strong> {profile_data.get('locations_count', 1)} site(s)</li>
                    </ul>
                </div>
                <div class="card">
                    <p class="card-title">Problèmes & Outils</p>
                    <div style="margin-bottom: 8px;">
                        <span style="font-size: 11px; font-weight: bold; color: #64748b; display: block; margin-bottom: 4px;">Dysfonctionnements :</span>
                        {problems_html if problems_html else '<span style="font-size: 11px; color: #94a3b8; font-style: italic;">Aucun problème</span>'}
                    </div>
                    <div>
                        <span style="font-size: 11px; font-weight: bold; color: #64748b; display: block; margin-bottom: 4px;">Outils actuels :</span>
                        {tools_html if tools_html else '<span style="font-size: 11px; color: #94a3b8; font-style: italic;">Aucun outil</span>'}
                    </div>
                </div>
            </div>
        </div>

        {twin_html}
        """

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


def serialize_enterprise_to_kam_visit(ent: Enterprise) -> dict:
    """
    Transforme une instance d'Enterprise de la base SQLite en objet StrategicVisit
    richement typé pour le desk opérationnel KAM (/kam).
    """
    dot_color = 'green' if ent.conversion_status == 'CONVERTED' else ('blue' if ent.conversion_status == 'IN_NEGOTIATION' else 'orange')
    revenue_val = float(ent.annual_revenue or 0)
    converted_amt = float(ent.converted_amount or 0)

    # Calcul estimation MRR et part de marché
    if converted_amt > 0:
        mrr = round(converted_amt / 12, 2)
        wallet_share = 100.0 if ent.conversion_status == 'CONVERTED' else 50.0
    else:
        mrr = round(revenue_val * 0.004, 2)
        wallet_share = 30.0 if ent.current_operator == 'Orange' else 0.0

    # Formatage affichage du chiffre d'affaires
    if revenue_val >= 1_000_000:
        rev_str = f"{revenue_val / 1_000_000:.1f}M $ USD"
    else:
        rev_str = f"{int(revenue_val):,} $ USD".replace(',', ' ')

    primary_contact_name = ent.contact_name or "Direction Générale"
    primary_contact_role = ent.contact_role or "Décideur Exécutif"

    # Hypothèses et opportunités IA pré-remplies
    pains = []
    if ent.ai_hypotheses and isinstance(ent.ai_hypotheses, list):
        for h in ent.ai_hypotheses:
            if isinstance(h, dict):
                pains.append({
                    "hypothesis": h.get("hypothesis") or h.get("title") or "Besoin d'interconnexion réseau haut débit sécurisée",
                    "trigger_evidence": h.get("evidence") or h.get("context_evidence") or f"Activité multi-sites ({ent.site_count} agences) sur lien {ent.current_operator}.",
                    "discovery_angle": h.get("angle") or h.get("discovery_angle") or "Audit de latence et de bande passante aux heures de pointe"
                })
            elif isinstance(h, str):
                pains.append({
                    "hypothesis": h,
                    "trigger_evidence": f"Contrat d'infrastructure actuellement opéré par {ent.current_operator}.",
                    "discovery_angle": "Comment gérez-vous la continuité d'activité lors des coupures de fibre ?"
                })
    if not pains:
        pains = [
            {
                "hypothesis": f"Instabilité et saturation du lien {ent.current_connectivity} opéré par {ent.current_operator}",
                "trigger_evidence": f"Périmètre de {ent.site_count} agences nécessitant une haute disponibilité (99.9%).",
                "discovery_angle": "Quel est l'impact financier d'une interruption de service de 2 heures sur vos opérations ?"
            },
            {
                "hypothesis": "Besoin de souveraineté des données, cybersécurité et téléphonie unifiée Cloud",
                "trigger_evidence": f"Effectif de {ent.employee_count} collaborateurs avec interconnexion du siège.",
                "discovery_angle": "Vos applications de gestion (ERP, messagerie) sont-elles hébergées en local ou dans un Cloud sécurisé ?"
            }
        ]

    opportunities = [
        {
            "solution_category": ent.recommended_solution or "Fibre Dédiée Très Haut Débit + SD-WAN Managé",
            "value_proposition": ent.ai_tailored_pitch or f"Lien optique symétrique avec bascule automatique 4G/Satellite sans interruption pour {ent.name}.",
            "potential_mrr": round(revenue_val * 0.006, 2)
        }
    ]

    location_str = f"{ent.commune or ent.city}, {ent.address}" if ent.address else (ent.commune or ent.city or "Kinshasa (Gombe)")

    return {
        "id": f"account-{ent.id}",
        "account_id": str(ent.id),
        "account_name": ent.name,
        "crm_id": ent.crm_id or f"CRM-CD-{ent.id:04d}",
        "meeting_title": f"Revue Stratégique C-Level — {ent.name}",
        "meeting_time": "10:30",
        "meeting_date": ent.assigned_at.strftime('%Y-%m-%d') if ent.assigned_at else timezone.now().strftime('%Y-%m-%d'),
        "duration_minutes": 45,
        "location": location_str,
        "dot_color": dot_color,
        "status_label": ent.get_conversion_status_display(),
        "conversion_status": ent.conversion_status,
        "converted_amount": converted_amt,
        "converted_offer": ent.converted_offer or "",
        "conversion_notes": ent.conversion_notes or "",
        "is_prepared": True,
        "preparation_time_minutes": 15,
        "golden_rule": f"Ne jamais aborder le prix avant d'avoir validé l'inadéquation du lien {ent.current_operator} actuel.",
        "debrief_completed": ent.conversion_status in ['CONVERTED', 'IN_NEGOTIATION'],
        "briefing": {
            "account_id": str(ent.id),
            "account_name": ent.name,
            "industry": ent.sector or "Services & Entreprise",
            "growth_stage": "CONGLOMERATE" if ent.segment == 'GRAND_COMPTE' else "SCALING",
            "firmographics": {
                "headcount": ent.employee_count or 25,
                "estimated_annual_revenue": rev_str,
                "locations_count": ent.site_count or 1,
                "countries": ["RDC"],
                "business_model_summary": f"Acteur de référence ({ent.get_segment_display()}) basé à {ent.commune or ent.city}. {ent.employee_count} collaborateurs répartis sur {ent.site_count} implantations raccordées."
            },
            "orange_relationship": {
                "client_status": "PARTIAL_CLIENT" if ent.conversion_status == 'CONVERTED' else "NON_CLIENT",
                "wallet_share_percentage": wallet_share,
                "mrr_current": mrr,
                "total_telecom_cloud_budget": round(revenue_val * 0.015, 2),
                "active_contracts": [
                    {
                        "service_name": f"Lien {ent.current_connectivity or 'Fibre'} ({ent.current_operator or 'Opérateur tiers'})",
                        "end_date": "31/12/2026",
                        "is_renewal_imminent": True,
                        "sla_status": "WARNING" if ent.current_operator != 'Orange' else "HEALTHY",
                        "monthly_value": round(mrr * 0.8, 2)
                    }
                ],
                "recent_incidents_count_30d": 1 if ent.current_operator != 'Orange' else 0,
                "critical_incidents_summary": f"Instabilités constatées sur le lien d'accès {ent.current_operator}.",
                "last_interactions_summary": [
                    f"Compte affecté au portefeuille KAM le {ent.assigned_at.strftime('%d/%m/%Y') if ent.assigned_at else 'récemment'}."
                ],
                "open_commitments": []
            },
            "stakeholders_mapping": [
                {
                    "id": f"stk-{ent.id}-1",
                    "full_name": primary_contact_name,
                    "job_title": primary_contact_role,
                    "role_in_decision": "ECONOMIC_BUYER",
                    "influence_level": "HIGH",
                    "stance_towards_orange": "POSITIVE" if ent.conversion_status == 'CONVERTED' else "NEUTRAL",
                    "last_contacted_date": ent.assigned_at.strftime('%Y-%m-%d') if ent.assigned_at else None,
                    "last_contacted_by": ent.assigned_kam.get_full_name() if ent.assigned_kam else "KAM Office",
                    "key_notes": f"Décideur joignable au {ent.contact_phone or 'N/A'} ({ent.contact_email or 'email non renseigné'}). Priorité stratégique sur la continuité de service et la réactivité du support."
                },
                {
                    "id": f"stk-{ent.id}-2",
                    "full_name": "Directeur des Systèmes d'Information (DSI)",
                    "job_title": "Responsable Infrastructure & IT",
                    "role_in_decision": "TECHNICAL_BUYER",
                    "influence_level": "MEDIUM",
                    "stance_towards_orange": "POSITIVE",
                    "last_contacted_date": None,
                    "last_contacted_by": None,
                    "key_notes": "Sensible aux SLAs de disponibilité réseau (99.9%) et à la sécurité périmétrique."
                }
            ],
            "missing_stakeholders_alert": ["Responsable Achats / DAF non encore audité"] if ent.conversion_status != 'CONVERTED' else [],
            "trigger_signals": [
                {
                    "id": f"sig-{ent.id}-1",
                    "category": "EXPANSION",
                    "title": f"Plan de modernisation réseau chez {ent.name}",
                    "description": f"Audit de migration d'infrastructure télécoms actuellement sous contrat {ent.current_operator}.",
                    "source": "CRM Onbora & Intelligence Télécoms",
                    "date": timezone.now().strftime('%d/%m/%Y'),
                    "is_urgent": True if ent.conversion_status == 'PROSPECT' else False
                }
            ],
            "technical_environment": {
                "current_competitors": [ent.current_operator] if ent.current_operator else ["Opérateur tiers"],
                "installed_cloud_telecom_stack": [ent.current_connectivity or "Fibre Dédiée", "Réseau Local LAN", "Microsoft 365"],
                "known_constraints": ["Disponibilité garantie 99.8%", "Facturation en USD"],
                "cybersecurity_compliance_needs": ["Protection anti-DDoS", "Conformité ARPTC RDC"]
            },
            "ai_hypotheses_and_playbook": {
                "pain_hypotheses": pains,
                "orange_opportunities": opportunities
            },
            "visit_strategy": {
                "primary_objective": f"Convertir le raccordement télécoms de {ent.name} vers l'infrastructure Onbora",
                "ideal_outcome": "Validation de la proposition commerciale et signature du bon de commande.",
                "suggested_agenda": [
                    f"1. Diagnostic des incidents sur le lien {ent.current_operator} actuel (10 min)",
                    f"2. Démonstration de la solution {ent.recommended_solution or 'Fibre Dédiée Pro'} (15 min)",
                    "3. Chiffrage budgétaire et planification du raccordement (15 min)",
                    "4. Accord et contractualisation (5 min)"
                ],
                "traps_to_avoid": [
                    f"Ne pas dénigrer {ent.current_operator} : insister sur notre engagement de rétablissement en moins de 2 heures.",
                    "Obtenir la validation du DAF avant d'arrêter l'architecture technique finale."
                ]
            }
        }
    }


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


class KamAccountDebriefView(APIView):
    """
    POST: Enregistre le compte-rendu de visite, met à jour le statut commercial
          (IN_NEGOTIATION, CONVERTED, LOST), le montant contractuel signé et les notes de débriefing.
          Ces données mettent immédiatement à jour la base SQLite et se reflètent en direct
          dans la vue Direction du KAM Office.
    """
    permission_classes = [IsKAMOrAdmin]

    def post(self, request, account_id):
        try:
            enterprise = Enterprise.objects.get(id=account_id)
        except Enterprise.DoesNotExist:
            return Response({"detail": "Compte introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == User.KAM and enterprise.assigned_kam_id != user.id:
            return Response({"detail": "Accès refusé : vous n'êtes pas le KAM assigné à ce compte."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        conversion_status_val = data.get('conversion_status', enterprise.conversion_status)
        converted_amount_val = data.get('converted_amount')
        converted_offer_val = data.get('converted_offer')
        conversion_notes_val = data.get('conversion_notes')

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

        return Response({
            "detail": f"Compte {enterprise.name} mis à jour avec succès.",
            "visit": serialize_enterprise_to_kam_visit(enterprise)
        }, status=status.HTTP_200_OK)
