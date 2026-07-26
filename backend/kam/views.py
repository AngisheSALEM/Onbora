from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .models import ProspectDossier
from twin.models import BusinessTwin
from .serializers import ProspectDossierSerializer, BusinessTwinSerializer
from accounts.permissions import IsKAMOrAdmin
from reporting.utils import log_demo_event

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
        instance = serializer.save()
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
                "detail": "Aucun Business Twin n'a été généré pour ce dossier."
            }, status=status.HTTP_404_NOT_FOUND)


from onbora.exports import get_export_response

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
        
        profile_data = dossier.raw_qualification_data.get('profile', {}) if dossier.raw_qualification_data else {}
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
                <h3 class="section-title">Étude comparative (Business Twin)</h3>
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
                <h3 class="section-title">Étude comparative (Business Twin)</h3>
                <div class="card">
                    <p style="margin: 0; color: #64748b; font-size: 13px; font-style: italic;">Aucun Business Twin n'a été généré pour ce dossier.</p>
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
            <h3 class="section-title">Synthèse de Qualification</h3>
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
        try:
            dossier = ProspectDossier.objects.get(pk=pk)
        except ProspectDossier.DoesNotExist:
            return Response({"detail": "Dossier introuvable."}, status=status.HTTP_404_NOT_FOUND)
            
        service = request.data.get('service')
        action = request.data.get('action', 'start') # 'start' or 'complete'
        
        if not service:
            return Response({"detail": "Paramètre 'service' requis."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Initialize raw_qualification_data if needed
        if not isinstance(dossier.raw_qualification_data, dict):
            dossier.raw_qualification_data = {}
            
        if 'provisioning' not in dossier.raw_qualification_data:
            dossier.raw_qualification_data['provisioning'] = {}
            
        prov = dossier.raw_qualification_data['provisioning']
        
        # Get company name
        company_name = "l'entreprise"
        if dossier.source == ProspectDossier.INBOUND_CONVERSATION and dossier.conversation:
            profile = dossier.conversation.extracted_profile or {}
            company_name = profile.get('company_name') or "Client Inbound"
        elif dossier.source == ProspectDossier.OUTBOUND_VISIT and dossier.visit_report:
            company_name = dossier.visit_report.preparation.enterprise.name

        service_labels = {
            'fibre': 'Fibre Optique Pro',
            'm365': 'Microsoft 365 Cloud',
            'firewall': 'Pare-feu Centralisé & EDR'
        }
        label = service_labels.get(service, service)
        
        if action == 'start':
            prov[service] = 'PROVISIONING'
            log_demo_event(
                'PROVISIONING_STARTED',
                f"Provisioning {label} initialisé pour {company_name}",
                user=request.user if request.user.is_authenticated else None,
                metadata={"dossier_id": dossier.id, "service": service}
            )
        elif action == 'complete':
            prov[service] = 'COMPLETED'
            log_demo_event(
                'PROVISIONING_COMPLETED',
                f"Provisioning {label} activé avec succès pour {company_name}",
                user=request.user if request.user.is_authenticated else None,
                metadata={"dossier_id": dossier.id, "service": service}
            )
        else:
            prov[service] = 'PENDING'
            
        dossier.save()
        return Response(ProspectDossierSerializer(dossier).data, status=status.HTTP_200_OK)

