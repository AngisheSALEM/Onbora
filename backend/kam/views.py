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


# --- NOUVEAUX ENDPOINTS ONBORA KAM INTEL & BRIEFINGS ---

MOCK_KAM_ACCOUNTS = [
    {
        "id": 1,
        "name": "Rawbank RDC (Siège & Agences)",
        "legal_id": "CD/KIN/RCCM/14-B-3201",
        "sector": "Banque & Services Financiers",
        "growth_stage": "MATURE",
        "headcount": 2400,
        "sites_count": 110,
        "headquarters": "Boulevard du 30 Juin, Kinshasa (Gombe)",
        "annual_revenue": "180M $",
        "monthly_revenue_orange": "42 500 $ / mois",
        "wallet_share_percentage": 65.0,
        "health_status": "WARNING",
        "health_reason": "Renouvellement du lien Fibre Siège dans 60 jours + Appel d'offres SD-WAN",
        "business_summary": "Première institution bancaire privée en RDC. Déploiement accéléré des agences digitales, monétique mobile et besoin critique de continuité 99.99%.",
        "next_visit_date": "Aujourd'hui",
        "next_visit_time": "14h30",
        "next_visit_objective": "Négocier le renouvellement Fibre & Présenter l'offre SD-WAN Managé",
        "active_contracts": [
            {
                "service_name": "Lien Dédié Fibre Siège 100 Mbps",
                "monthly_revenue": "18 000 $",
                "end_date": "15/10/2026",
                "is_renewal_imminent": True,
                "sla_status": "Conforme (99.95%)"
            },
            {
                "service_name": "MPLS Interconnexion 85 Agences",
                "monthly_revenue": "22 500 $",
                "end_date": "30/06/2027",
                "is_renewal_imminent": False,
                "sla_status": "Conforme (99.85%)"
            },
            {
                "service_name": "Flotte Mobile Entreprise (450 lignes)",
                "monthly_revenue": "2 000 $",
                "end_date": "31/12/2026",
                "is_renewal_imminent": False,
                "sla_status": "Actif"
            }
        ],
        "stakeholders": [
            {
                "id": "stk-1",
                "full_name": "Dieudonné Mwembo",
                "job_title": "Directeur des Systèmes d'Information (DSI)",
                "role": "TECHNICAL_BUYER",
                "influence": "HAUTE",
                "stance": "FAVORABLE",
                "last_contact_date": "12/08/2026",
                "notes": "Très satisfait du support Orange mais sous pression de la DG sur les coûts et la redondance."
            },
            {
                "id": "stk-2",
                "full_name": "Patricia Lumumba",
                "job_title": "Directrice des Achats & Moyens Généraux",
                "role": "ECONOMIC_BUYER",
                "influence": "HAUTE",
                "stance": "NEUTRE",
                "last_contact_date": "05/06/2026",
                "notes": "Exige une baisse de 10% sur le renouvellement ou une mise en concurrence."
            },
            {
                "id": "stk-3",
                "full_name": "Alain Kabasele",
                "job_title": "Responsable Infrastructure & Réseaux",
                "role": "CHAMPION",
                "influence": "MOYENNE",
                "stance": "FAVORABLE",
                "last_contact_date": "Hier",
                "notes": "Notre allié technique interne. Il soutient activement la solution SD-WAN Orange."
            }
        ],
        "missing_stakeholders": [
            "Directeur Général Adjoint (Signataire final des budgets > 100k$)",
            "Responsable Cybersécurité / RSSI (Non consulté sur le volet Cloud)"
        ],
        "pain_hypotheses": [
            {
                "title": "Vulnérabilité de coupure sur le lien principal Siège",
                "context_evidence": "Incident micro-coupure noté en Juillet qui a perturbé la compensation monétique.",
                "orange_opportunity": "Lien Fibre Sécurisé Bi-adduction + Backup 5G Ultra-Haute Disponibilité."
            },
            {
                "title": "Coûts élevés et lenteur de déploiement sur les nouvelles agences provinciales",
                "context_evidence": "La banque ouvre 12 nouvelles agences dans le Grand Katanga cette année.",
                "orange_opportunity": "Solution SD-WAN Hybride Orange (Fibre + Liaison Satellite Starlink/Orange)."
            }
        ],
        "trigger_signals": [
            {
                "category": "EXPANSION",
                "title": "Ouverture de 12 agences dans le Grand Katanga",
                "description": "Communiqué officiel publié la semaine dernière annonçant un plan de croissance provincial.",
                "date": "25/08/2026"
            },
            {
                "category": "NOMINATION",
                "title": "Nouveau Directeur de la Transformation Digitale",
                "description": "Arrivée d'un ex-cadre BNP Paribas avec mandat d'accélérer le Cloud.",
                "date": "10/08/2026"
            }
        ]
    },
    {
        "id": 2,
        "name": "Tenke Fungurume Mining (TFM)",
        "legal_id": "CD/LSH/RCCM/09-B-1120",
        "sector": "Mines & Énergie",
        "growth_stage": "CONGLOMERATE",
        "headcount": 6500,
        "sites_count": 8,
        "headquarters": "Fungurume, Lualaba",
        "annual_revenue": "950M $",
        "monthly_revenue_orange": "68 000 $ / mois",
        "wallet_share_percentage": 80.0,
        "health_status": "CRITICAL",
        "health_reason": "Coupure de faisceau hertzien sur le site minier la semaine dernière (Ticket P1)",
        "business_summary": "Géant minier d'extraction de cuivre et cobalt. Sites isolés nécessitant une connectivité industrielle critique (IoT capteurs, caméras de sécurité, ERP SAP).",
        "next_visit_date": "Demain",
        "next_visit_time": "10h00",
        "next_visit_objective": "Gestion de crise SLA & Proposition de sécurisation par liaison Satellite Dédiée",
        "active_contracts": [
            {
                "service_name": "Liaison Dédiée Haute Capacité Mine-Lubumbashi",
                "monthly_revenue": "48 000 $",
                "end_date": "30/11/2027",
                "is_renewal_imminent": False,
                "sla_status": "Incident Récent (P1 résolu)"
            },
            {
                "service_name": "Réseau Privé Mobile 4G/LTE Industriel",
                "monthly_revenue": "20 000 $",
                "end_date": "15/05/2028",
                "is_renewal_imminent": False,
                "sla_status": "Conforme"
            }
        ],
        "stakeholders": [
            {
                "id": "stk-tfm-1",
                "full_name": "Marc Zhang",
                "job_title": "VP Opérations & Technologies",
                "role": "ECONOMIC_BUYER",
                "influence": "HAUTE",
                "stance": "DEFAVORABLE",
                "notes": "Très mécontent de l'incident de la semaine dernière. Exige des pénalités SLA et un plan de redondance."
            },
            {
                "id": "stk-tfm-2",
                "full_name": "Éric Tshisekedi",
                "job_title": "Superviseur Télécoms Mine",
                "role": "CHAMPION",
                "influence": "MOYENNE",
                "stance": "FAVORABLE",
                "notes": "Reconnaît la réactivité de nos équipes d'astreinte sur place."
            }
        ],
        "missing_stakeholders": ["Directeur Financier TFM"],
        "pain_hypotheses": [
            {
                "title": "Perte d'exploitation chiffrée à 40k$/heure en cas de coupure réseau sur la carrière",
                "context_evidence": "Incident du 22 août ayant bloqué la pesée des camions pendant 2h30.",
                "orange_opportunity": "Liaison Secours Satellite Hybride Automatique (Failover temps réel < 5ms)."
            }
        ],
        "trigger_signals": [
            {
                "category": "INCIDENT",
                "title": "Rapport d'incident critique clôturé",
                "description": "RCA (Root Cause Analysis) finalisée par le NOC Orange.",
                "date": "28/08/2026"
            }
        ]
    },
    {
        "id": 3,
        "name": "Bracongo (Groupe Castel)",
        "legal_id": "CD/KIN/RCCM/05-A-0941",
        "sector": "Agroalimentaire & FMCG",
        "growth_stage": "MATURE",
        "headcount": 1800,
        "sites_count": 24,
        "headquarters": "Avenue des Brasseries, Kinshasa (Barumbu)",
        "annual_revenue": "140M $",
        "monthly_revenue_orange": "19 000 $ / mois",
        "wallet_share_percentage": 45.0,
        "health_status": "HEALTHY",
        "health_reason": "Compte stable avec opportunité d'extension Cloud Microsoft 365 & Cyber",
        "business_summary": "Leader brassicole en RDC. Modernisation de la chaîne logistique et migration vers le Cloud Azure.",
        "next_visit_date": "Vendredi",
        "next_visit_time": "11h00",
        "next_visit_objective": "Présenter le pack Cybersécurité Managée (SOC Orange)",
        "active_contracts": [
            {
                "service_name": "Fibre Dédiée Usine Kinshasa & Dépôts",
                "monthly_revenue": "15 000 $",
                "end_date": "28/02/2028",
                "is_renewal_imminent": False,
                "sla_status": "Conforme (99.98%)"
            },
            {
                "service_name": "Connexions Data Flotte Véhicules",
                "monthly_revenue": "4 000 $",
                "end_date": "30/09/2027",
                "is_renewal_imminent": False,
                "sla_status": "Conforme"
            }
        ],
        "stakeholders": [
            {
                "id": "stk-bra-1",
                "full_name": "Jean-Paul Dufour",
                "job_title": "Directeur Général",
                "role": "ECONOMIC_BUYER",
                "influence": "HAUTE",
                "stance": "FAVORABLE",
                "notes": "Relation historique solide avec Orange. Sensible à la cybersécurité."
            }
        ],
        "missing_stakeholders": ["Responsable Achats Groupe"],
        "pain_hypotheses": [
            {
                "title": "Menace de ransomware sur le système ERP de gestion des stocks",
                "context_evidence": "Tentative de phishing ciblée signalée le mois dernier sur l'équipe financière.",
                "orange_opportunity": "Orange Cyberdefense (Protection des postes EDR + Filtrage DNS sécurisé)."
            }
        ],
        "trigger_signals": []
    }
]


class KamStrategicAccountListView(APIView):
    """
    GET: Retourne la liste des comptes stratégiques assignés au KAM.
    Accessible avec authentification ou en consultation rapide.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(MOCK_KAM_ACCOUNTS, status=status.HTTP_200_OK)


class KamBriefingDetailView(APIView):
    """
    GET: Retourne le briefing pré-visite structuré pour un compte donné.
    """
    permission_classes = [AllowAny]

    def get(self, request, account_id):
        account = next((a for a in MOCK_KAM_ACCOUNTS if a["id"] == int(account_id)), None)
        if not account:
            account = MOCK_KAM_ACCOUNTS[0]

        briefing_data = {
            "account_id": account["id"],
            "account_name": account["name"],
            "sector": account["sector"],
            "visit_date": account["next_visit_date"],
            "visit_time": account["next_visit_time"],
            "visit_location": account["headquarters"],
            "primary_objective": account["next_visit_objective"],
            "ideal_outcome": "Accord de principe pour le lancement d'un POC SD-WAN et validation du budget.",
            "traps_to_avoid": [
                "Ne PAS démarrer par un pitch commercial sans avoir d'abord adressé le rapport d'incident ou l'échéance de contrat." if account["health_status"] in ["WARNING", "CRITICAL"] else "Éviter d'aborder les remises tarifaires avant d'avoir qualifié le périmètre global.",
                "Valider le rôle de chacun des participants avant de dévoiler l'architecture technique."
            ],
            "meeting_attendees": account["stakeholders"],
            "missing_key_people": account["missing_stakeholders"],
            "current_orange_services": account["active_contracts"],
            "pain_hypotheses": account["pain_hypotheses"],
            "suggested_agenda": [
                "1. Bilan qualité de service Orange & écoute des priorités (10 min)",
                "2. Présentation de la proposition stratégique sur mesure (15 min)",
                "3. Échange & levée des objections techniques et budgétaires (15 min)",
                "4. Accord sur les prochaines étapes et calendrier (5 min)"
            ],
            "open_incidents_count": 1 if account["health_status"] == "CRITICAL" else 0,
            "incidents_summary": account["health_reason"],
            "last_interactions": [
                "12/08/2026 : Échange téléphonique avec le DSI sur la performance réseau.",
                "28/07/2026 : Envoi du rapport mensuel de disponibilité SLA (99.95%)."
            ],
            "is_prepared": False
        }
        return Response(briefing_data, status=status.HTTP_200_OK)
