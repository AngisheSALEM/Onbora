from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Enterprise, VisitPreparation, VisitReport
from .serializers import EnterpriseSerializer, VisitPreparationSerializer, VisitReportSerializer
from kam.models import ProspectDossier
from twin.models import BusinessTwin
from catalog.models import ServiceCatalog
from reporting.utils import log_demo_event

class EnterpriseSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response([])
            
        queryset = Enterprise.objects.filter(name__icontains=query)
        if not queryset.exists():
            self.create_mock_enterprise(query)
            queryset = Enterprise.objects.filter(name__icontains=query)
            
        serializer = EnterpriseSerializer(queryset, many=True)
        return Response(serializer.data)

    def create_mock_enterprise(self, name):
        name_lower = name.lower()
        website = f"https://{name_lower.replace(' ', '')}.fr"
        sector = "Services aux entreprises"
        size = "20-99 employés"
        location = "Paris"
        
        if any(k in name_lower for k in ["médical", "clinique", "cabinet", "hôpital", "médecin", "docteur", "santé"]):
            sector = "Médical / Santé"
            location = "Lyon"
        elif any(k in name_lower for k in ["tech", "soft", "digital", "numérique"]):
            sector = "Technologie / Numérique"
            size = "100-499 employés"
        elif any(k in name_lower for k in ["store", "super", "boutique", "vente", "commerce"]):
            sector = "Commerce / Retail"
            size = "2-19 employés"
            
        return Enterprise.objects.create(
            name=name,
            website=website,
            sector=sector,
            approximate_size=size,
            location=location,
            existing_crm_data={"crm_status": "PROSPECT", "last_contact": "Jamais"}
        )


class VisitPreparationCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        enterprise_id = request.data.get('enterprise')
        if not enterprise_id:
            return Response({"detail": "L'identifiant de l'entreprise est requis."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            enterprise = Enterprise.objects.get(pk=enterprise_id)
        except Enterprise.DoesNotExist:
            return Response({"detail": "Entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)
            
        prep = VisitPreparation.objects.create(
            enterprise=enterprise,
            salesperson=request.user,
            meeting_objective=f"Qualifier l'éligibilité réseau et les besoins de collaboration pour {enterprise.name}.",
            hypothesis_to_verify=(
                f"L'entreprise {enterprise.name} utilise actuellement des solutions grand public (ADSL/Box). "
                "Leur croissance récente nécessite une interconnexion réseau stable et des outils collaboratifs professionnels."
            ),
            custom_pitch=(
                f"Mettre en avant notre offre Fibre Optique Pro pour garantir un débit symétrique et stable, "
                "ainsi que Microsoft 365 pour structurer la collaboration interne."
            ),
            key_questions=(
                "1. Quelle est votre connexion internet principale actuelle ? Avez-vous des coupures ?\n"
                "2. Comment échangez-vous vos fichiers entre collègues ?\n"
                "3. Avez-vous un outil de visioconférence et de chat d'entreprise ?"
            )
        )
        
        serializer = VisitPreparationSerializer(prep)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VisitReportCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        prep_id = request.data.get('preparation')
        raw_transcript = request.data.get('raw_transcript', '').strip()
        
        if not prep_id:
            return Response({"detail": "La préparation de visite est requise."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            prep = VisitPreparation.objects.get(pk=prep_id)
        except VisitPreparation.DoesNotExist:
            return Response({"detail": "Préparation de visite introuvable."}, status=status.HTTP_404_NOT_FOUND)

        exec_summary = "Rendez-vous qualitatif. Le client confirme des lenteurs de réseau et souhaite s'équiper d'une fibre pro et d'outils collaboratifs."
        confirmed_needs = ["Fibre Optique Pro", "Microsoft 365 Pro & Teams"]
        objections = ["Coût mensuel"]
        actions = ["Envoyer devis de fibre", "Planifier démo Microsoft 365"]
        
        if raw_transcript:
            text_lower = raw_transcript.lower()
            if "sécurité" in text_lower or "virus" in text_lower or "pirat" in text_lower:
                confirmed_needs.append("Firewall Managé")
                actions.append("Faire chiffrer l'option Firewall")
            if "téléphone" in text_lower or "standard" in text_lower:
                confirmed_needs.append("Téléphonie Teams (VoIP)")
            if "hds" in text_lower or "médical" in text_lower:
                confirmed_needs.append("Hébergement de Données de Santé (HDS)")
                
        email_draft = (
            f"Bonjour,\n\nMerci pour le temps accordé lors de notre rencontre chez {prep.enterprise.name}. "
            f"Comme convenu, nous étudions vos éligibilités Fibre et vous transmettons nos préconisations.\n\nCordialement."
        )
        
        report, created = VisitReport.objects.get_or_create(
            preparation=prep,
            defaults={
                "raw_transcript": raw_transcript or "Discussion de qualification commerciale.",
                "executive_summary": exec_summary,
                "confirmed_needs": confirmed_needs,
                "objections_raised": objections,
                "actions_todo": actions,
                "follow_up_email_draft": email_draft
            }
        )
        
        if not created:
            report.raw_transcript = raw_transcript or report.raw_transcript
            report.save()
            
        log_demo_event(
            'REPORT_GENERATED',
            f"Rapport de visite commerciale généré pour: {report.preparation.enterprise.name}",
            user=request.user if request.user.is_authenticated else None,
            metadata={"report_id": report.id, "enterprise_name": report.preparation.enterprise.name}
        )
        
        serializer = VisitReportSerializer(report)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VisitReportTransmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            report = VisitReport.objects.get(pk=pk)
        except VisitReport.DoesNotExist:
            return Response({"detail": "Rapport de visite introuvable."}, status=status.HTTP_404_NOT_FOUND)
            
        enterprise = report.preparation.enterprise
        
        problems = report.objections_raised
        tools = []
        
        profile = {
            "sector": enterprise.sector or "Services",
            "company_size_estimate": enterprise.approximate_size or "2-19 employés",
            "locations_count": 1,
            "current_problems": problems,
            "current_tools": tools,
            "company_name": enterprise.name
        }
        
        dossier, created = ProspectDossier.objects.get_or_create(
            visit_report=report,
            defaults={
                "source": ProspectDossier.OUTBOUND_VISIT,
                "status": ProspectDossier.NEW,
                "raw_qualification_data": {
                    "profile": profile,
                    "executive_summary": report.executive_summary
                }
            }
        )
        
        recommended_services_data = []
        current_state = [report.executive_summary]
        proposed_state = ["Mise en place des services managés Orange Business"]
        roadmap = ["Étape 1: Audit technique", "Étape 2: Raccordement Fibre", "Étape 3: Déploiement logiciel"]
        
        for need_name in report.confirmed_needs:
            try:
                s = ServiceCatalog.objects.get(name=need_name)
                recommended_services_data.append({
                    "service_id": s.id,
                    "name": s.name,
                    "category": s.category,
                    "priority": "HIGH",
                    "reasoning": s.description
                })
            except ServiceCatalog.DoesNotExist:
                pass
                
        twin, t_created = BusinessTwin.objects.get_or_create(
            prospect_dossier=dossier,
            defaults={
                "current_state": current_state,
                "proposed_state": proposed_state,
                "recommended_services": recommended_services_data,
                "roadmap": roadmap
            }
        )
        
        log_demo_event(
            'DOSSIER_TRANSMITTED',
            f"Rapport de visite transmis au KAM pour: {report.preparation.enterprise.name}",
            user=request.user if request.user.is_authenticated else None,
            metadata={"report_id": report.id, "dossier_id": dossier.id}
        )
        
        return Response({
            "detail": "Rapport transmis au KAM avec succès.",
            "dossier_id": dossier.id
        }, status=status.HTTP_200_OK)


from onbora.exports import get_export_response

class VisitReportExportView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, pk):
        try:
            report = VisitReport.objects.get(pk=pk)
        except VisitReport.DoesNotExist:
            return Response({"detail": "Rapport de visite introuvable."}, status=status.HTTP_404_NOT_FOUND)
            
        log_demo_event(
            'PDF_EXPORTED',
            f"Rapport de visite exporté en PDF/HTML pour: {report.preparation.enterprise.name}",
            user=request.user if request.user.is_authenticated else None,
            metadata={"report_id": report.id}
        )
        
        enterprise = report.preparation.enterprise
        title = f"Rapport de Visite - {enterprise.name}"
        
        needs_html = "".join([f'<span class="badge badge-success">{need}</span>' for need in (report.confirmed_needs or [])])
        objections_html = "".join([f'<span class="badge badge-danger">{obj}</span>' for obj in (report.objections_raised or [])])
        actions_html = "".join([f'<li>{act}</li>' for act in (report.actions_todo or [])])
        
        content_html = f"""
        <h2 class="document-title">RAPPORT DE VISITE COMMERCIALE</h2>
        
        <div class="section">
            <h3 class="section-title">Entreprise Ciblée</h3>
            <div class="card">
                <ul class="list-unstyled">
                    <li><strong>Nom :</strong> {enterprise.name}</li>
                    <li><strong>Secteur :</strong> {enterprise.sector}</li>
                    <li><strong>Localisation :</strong> {enterprise.location}</li>
                    <li><strong>Taille :</strong> {enterprise.approximate_size}</li>
                    <li><strong>Site web :</strong> <a href="{enterprise.website}" target="_blank">{enterprise.website}</a></li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Résumé de la visite</h3>
            <div class="card">
                <p style="margin: 0; font-size: 13px; font-weight: 500;">{report.executive_summary}</p>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Insights de Qualification</h3>
            <div class="grid">
                <div class="card">
                    <p class="card-title">Besoins Confirmés</p>
                    {needs_html if needs_html else '<p style="font-size: 12px; color: #64748b; margin: 0;">Aucun besoin spécifié</p>'}
                </div>
                <div class="card">
                    <p class="card-title">Objections Rencontrées</p>
                    {objections_html if objections_html else '<p style="font-size: 12px; color: #64748b; margin: 0;">Aucune objection</p>'}
                </div>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Plan d'actions</h3>
            <div class="card">
                <ul class="list-unstyled" style="padding-left: 20px; list-style-type: disc;">
                    {actions_html}
                </ul>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Brouillon d'email de suivi</h3>
            <div class="email-preview">{report.follow_up_email_draft}</div>
        </div>
        """
        
        return get_export_response(f"rapport_visite_{pk}", title, content_html)

