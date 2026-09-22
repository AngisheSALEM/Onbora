import uuid
import hashlib
from django.db import models
from django.conf import settings


class Plaque(models.Model):
    code = models.CharField(max_length=50, unique=True, db_index=True, help_text="Code unique de la plaque (ex: KIN-GOMBE)")
    name = models.CharField(max_length=150, help_text="Nom complet (ex: Kinshasa - Gombe)")
    city = models.CharField(max_length=100, default="Kinshasa")
    latitude = models.FloatField(default=-4.3033)
    longitude = models.FloatField(default=15.3083)
    radius_km = models.FloatField(default=5.0)
    boundary_geojson = models.JSONField(default=dict, blank=True, help_text="GeoJSON Polygon / MultiPolygon de la zone délimitée")
    kml_data = models.TextField(blank=True, default='', help_text="Fichier KML standard décrivant le tracé géographique")
    assigned_salespersons = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        limit_choices_to={'role': 'SALESPERSON'},
        related_name='assigned_plaques'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def generate_kml(self) -> str:
        """
        Génère une chaîne XML au format OGC KML standard pour la plaque.
        Prend en charge les polygones GeoJSON dessinés ou génère un polygone circulaire par défaut.
        """
        import math

        coordinates_str = ""
        # 1. Utilisation du polygone GeoJSON s'il existe
        if self.boundary_geojson and isinstance(self.boundary_geojson, dict):
            coords = self.boundary_geojson.get('coordinates', [])
            if coords and isinstance(coords, list):
                # Si format Polygon: [[ [lon, lat], [lon, lat], ... ]]
                ring = coords[0] if isinstance(coords[0], list) and isinstance(coords[0][0], list) else coords
                coord_pairs = []
                for pt in ring:
                    if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                        coord_pairs.append(f"{pt[0]},{pt[1]},0")
                coordinates_str = " ".join(coord_pairs)

        # 2. Fallback: approximation d'un cercle autour du centre
        if not coordinates_str:
            points = []
            num_points = 32
            # 1 deg lat ~ 111.32 km, 1 deg lon ~ 111.32 * cos(lat)
            lat_rad = math.radians(self.latitude)
            d_lat = (self.radius_km / 111.32)
            d_lon = (self.radius_km / (111.32 * math.cos(lat_rad) if math.cos(lat_rad) != 0 else 111.32))
            for i in range(num_points + 1):
                angle = 2 * math.pi * (i / num_points)
                p_lat = self.latitude + d_lat * math.sin(angle)
                p_lon = self.longitude + d_lon * math.cos(angle)
                points.append(f"{p_lon:.6f},{p_lat:.6f},0")
            coordinates_str = " ".join(points)

        kml = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>{self.name} ({self.code})</name>
    <description>Périmètre commercial Onbora pour {self.name} - Ville: {self.city}</description>
    <Style id="plaqueStyle">
      <LineStyle>
        <color>ffeb6325</color>
        <width>3</width>
      </LineStyle>
      <PolyStyle>
        <color>40eb6325</color>
        <fill>1</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>
    <Placemark>
      <name>{self.code}</name>
      <styleUrl>#plaqueStyle</styleUrl>
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              {coordinates_str}
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>"""
        return kml

    def save(self, *args, **kwargs):
        if not self.kml_data or kwargs.get('update_fields') is None or 'kml_data' in kwargs.get('update_fields', []):
            self.kml_data = self.generate_kml()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.code})"


class Enterprise(models.Model):
    plaque_rel = models.ForeignKey(
        Plaque,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='enterprises'
    )
    name = models.CharField(max_length=100)
    website = models.URLField(blank=True, null=True)
    sector = models.CharField(max_length=100, blank=True, null=True)
    approximate_size = models.CharField(max_length=50, blank=True, null=True)
    location = models.CharField(max_length=200, blank=True, null=True)
    
    # Plaque / Zone géographique & OpenStreetMap Geocoding
    plaque = models.CharField(max_length=100, default='Kinshasa (Gombe)', db_index=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    # Données CRM Congolaises & Métriques Financières
    crm_id = models.CharField(max_length=50, blank=True, null=True, db_index=True, help_text="Identifiant unique CRM (ex: CRM-CD-0001)")
    annual_revenue = models.DecimalField(
        max_digits=15, decimal_places=2, default=50000.00, db_index=True,
        help_text="Chiffre d'affaires annuel en USD (critère maître de segmentation)"
    )
    employee_count = models.IntegerField(default=10, help_text="Effectif salarial")
    site_count = models.IntegerField(default=1, help_text="Nombre d'implantations / agences")
    
    # Identifiants légaux RDC & Afrique
    rccm = models.CharField(max_length=100, blank=True, null=True, help_text="Registre du Commerce et du Crédit Mobilier (ex: CD/KNG/RCCM/...)")
    id_nat = models.CharField(max_length=100, blank=True, null=True, help_text="Numéro d'Identification Nationale")
    nif = models.CharField(max_length=100, blank=True, null=True, help_text="Numéro d'Impôt Fiscal")
    
    # Adresse & Géographie Détaillée
    city = models.CharField(max_length=100, default='Kinshasa')
    commune = models.CharField(max_length=100, blank=True, default='', help_text="Commune (ex: Gombe, Limete, Lingwala...)")
    address = models.CharField(max_length=255, blank=True, default='')
    
    # Contact & Décideur
    contact_name = models.CharField(max_length=150, blank=True, default='')
    contact_role = models.CharField(max_length=100, blank=True, default='', help_text="Fonction du décideur (DG, DSI, Gérant...)")
    contact_phone = models.CharField(max_length=50, blank=True, default='')
    contact_email = models.EmailField(blank=True, null=True)
    
    # Contexte Télécoms & Connectivité Actuelle
    current_connectivity = models.CharField(max_length=100, blank=True, default='4G LTE', help_text="Type d'accès actuel (Fibre, VSAT, 4G, Aucun)")
    contract_end_date = models.DateField(null=True, blank=True, db_index=True, help_text="Date d'échéance du contrat opérateur concurrent / actuel")
    incident_count = models.IntegerField(default=0, help_text="Nombre d'incidents / pannes réseau non résolus sur les 90 derniers jours")
    budget_status = models.CharField(max_length=150, blank=True, default='Non précisé', help_text="Statut budgétaire IT / Télécoms (Validé, En arbitrage, Bloqué...)")
    pain_level = models.CharField(max_length=50, blank=True, default='Modéré', choices=[('Faible', 'Faible'), ('Modéré', 'Modéré'), ('Critique', 'Critique')], help_text="Niveau de frustration ou de criticité ressenti vis-à-vis du fournisseur actuel")
    telecom_budget_monthly = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Budget télécoms mensuel estimé ou réel en USD")
    
    # Segmentation & Entité Destinataire (Moteur Backend)
    SEGMENT_CHOICES = [
        ('GRAND_COMPTE', 'Grand Compte'),
        ('PME', 'PME'),
        ('TPE_INFORMEL', 'TPE / Informel'),
    ]
    ENTITY_CHOICES = [
        ('BACK_OFFICE', 'Back-Office Terrain (Commerciaux Terrain & Plaques)'),
        ('KAM_OFFICE', 'Direction KAM & Grands Comptes (Desk KAM)'),
    ]
    segment = models.CharField(max_length=30, choices=SEGMENT_CHOICES, default='TPE_INFORMEL', db_index=True)
    assigned_entity = models.CharField(max_length=30, choices=ENTITY_CHOICES, default='BACK_OFFICE', db_index=True)
    
    # Affectation Individuelle au sein du KAM Office
    assigned_kam = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_kam_enterprises',
        help_text="Key Account Manager (KAM) individuel affecté à ce compte par le KAM Office"
    )
    assigned_at = models.DateTimeField(null=True, blank=True, help_text="Date d'affectation par le KAM Office")
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dispatched_enterprises',
        help_text="Gérant KAM Office ayant opéré l'affectation"
    )

    # Affectation Individuelle au sein du Back-Office Terrain (Commerciaux SOHO)
    assigned_salesperson = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_soho_enterprises',
        help_text="Commercial terrain individuel assigné pour la prospection"
    )
    assigned_salesperson_at = models.DateTimeField(null=True, blank=True, help_text="Date d'affectation au commercial")
    is_visited = models.BooleanField(default=False, db_index=True, help_text="Vrai si l'entreprise a déjà été prospectée/visitée")
    last_visited_at = models.DateTimeField(null=True, blank=True, help_text="Date de la dernière visite terrain")
    last_visited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='visited_enterprises',
        help_text="Dernier commercial ayant visité cette entreprise"
    )
    
    # Statut de Conversion & Traçabilité Métier
    CONVERSION_STATUS_CHOICES = [
        ('PROSPECT', 'Prospect non converti'),
        ('IN_NEGOTIATION', 'En cours de négociation'),
        ('CONVERTED', 'Converti / Signé'),
        ('LOST', 'Perdu / Non retenu'),
    ]
    conversion_status = models.CharField(max_length=30, choices=CONVERSION_STATUS_CHOICES, default='PROSPECT', db_index=True)
    converted_by_entity = models.CharField(max_length=30, choices=[('BACK_OFFICE', 'Back-Office Terrain'), ('KAM_OFFICE', 'KAM Office')], blank=True, null=True)
    converted_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Valeur contractuelle signée (USD)")
    converted_offer = models.CharField(max_length=150, blank=True, default='', help_text="Offre commerciale souscrite")
    converted_at = models.DateTimeField(null=True, blank=True)
    converted_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='converted_enterprises'
    )
    conversion_notes = models.TextField(blank=True, default='')

    # Données de Scraping & Profilage
    scraping_status = models.CharField(
        max_length=20,
        choices=[('PENDING', 'En attente'), ('SCRAPED', 'Scrapé'), ('FAILED', 'Échoué')],
        default='PENDING'
    )
    scraped_data = models.JSONField(default=dict, blank=True, help_text="Données brutes issues du web et réseaux sociaux")
    
    # Hypothèses & Brief Commercial générés par l'IA
    ai_hypotheses = models.JSONField(default=list, blank=True, help_text="Hypothèses commerciales pré-visite")
    ai_tailored_pitch = models.TextField(blank=True, default='', help_text="Pitch personnalisé généré par l'IA")
    ai_key_questions = models.JSONField(default=list, blank=True, help_text="Questions stratégiques préconisées")
    ai_potential_objections = models.JSONField(default=list, blank=True, help_text="Objections probables et contre-arguments")
    
    # Qualification Commerciale IA
    is_ready_for_conversion = models.BooleanField(default=True)
    conversion_score = models.IntegerField(default=85)  # 0 à 100%
    recommended_solution = models.CharField(max_length=200, blank=True, default='Fibre Optique Pro + Microsoft 365')
    ai_lead_scoring_data = models.JSONField(default=dict, blank=True, help_text="Dernière évaluation d'intelligence commerciale Lead Scoring (Core AI)")
    ai_churn_data = models.JSONField(default=dict, blank=True, help_text="Dernier diagnostic Churn Radar & Upsell (Core AI)")
    ai_scored_at = models.DateTimeField(null=True, blank=True, help_text="Date et heure du dernier calcul d'inférence Core AI")
    
    existing_crm_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Identifiants uniques pour la France
    siren = models.CharField(max_length=9, blank=True, null=True, unique=True, verbose_name="Numéro SIREN")
    siret = models.CharField(max_length=14, blank=True, null=True, unique=True, verbose_name="Numéro SIRET")
    
    # Identifiants dans les systèmes externes (CRM et Cloud Provisioning)
    kaabu_organization_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    arrowsphere_tenant_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    
    # Statuts de synchronisation
    sync_status = models.CharField(
        max_length=20, 
        choices=[('PENDING', 'En attente'), ('SYNCED', 'Synchronisé'), ('ERROR', 'Erreur de synchro')],
        default='PENDING'
    )
    last_sync_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'sales_enterprise'
        verbose_name = "Compte Entreprise (CRM B2B)"
        verbose_name_plural = "Répertoire CRM des Entreprises B2B"
        ordering = ['-created_at']

    @property
    def current_operator(self):
        """Propriété de rétrocompatibilité dépréciée (champ supprimé)."""
        return None

    @current_operator.setter
    def current_operator(self, val):
        pass

    def __str__(self):
        return f"{self.name} [{self.get_segment_display()}] - {self.city}"


class SegmentationConfig(models.Model):
    """
    Configuration globale des seuils financiers de segmentation CRM administrables par l'Admin.
    """
    tpe_max_revenue = models.DecimalField(
        max_digits=15, decimal_places=2, default=100000.00,
        help_text="Seuil CA max pour TPE / Informel (USD). Les entreprises en dessous vont au Back-Office Terrain."
    )
    pme_max_revenue = models.DecimalField(
        max_digits=15, decimal_places=2, default=1000000.00,
        help_text="Seuil CA max pour PME (USD). Les entreprises au dessus sont des Grands Comptes (KAM Office)."
    )
    backoffice_entity_label = models.CharField(
        max_length=100, default="Back-Office Terrain",
        help_text="Nom de l'entité dédiée aux commerciaux de terrain et plaques"
    )
    kam_entity_label = models.CharField(
        max_length=100, default="Direction KAM & Grands Comptes",
        help_text="Nom de l'entité dédiée aux Key Account Managers et comptes stratégiques"
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    @classmethod
    def get_active(cls):
        config, _ = cls.objects.get_or_create(id=1)
        return config

    def apply_segmentation_to_all(self):
        """
        Recalcule la segmentation et l'affectation d'entité pour l'ensemble des entreprises en base.
        """
        enterprises = Enterprise.objects.all()
        tpe_threshold = float(self.tpe_max_revenue)
        pme_threshold = float(self.pme_max_revenue)
        
        tpe_count = 0
        pme_count = 0
        gc_count = 0
        
        for ent in enterprises:
            rev = float(ent.annual_revenue or 0)
            if rev < tpe_threshold:
                ent.segment = 'TPE_INFORMEL'
                ent.assigned_entity = 'BACK_OFFICE'
                tpe_count += 1
            elif rev < pme_threshold:
                ent.segment = 'PME'
                ent.assigned_entity = 'KAM_OFFICE'
                pme_count += 1
            else:
                ent.segment = 'GRAND_COMPTE'
                ent.assigned_entity = 'KAM_OFFICE'
                gc_count += 1
            ent.save(update_fields=['segment', 'assigned_entity'])
            
        return {
            "total_updated": enterprises.count(),
            "tpe_informel": tpe_count,
            "pme": pme_count,
            "grand_compte": gc_count,
            "back_office_total": tpe_count,
            "kam_office_total": pme_count + gc_count
        }

    def __str__(self):
        return f"SegmentationConfig (TPE < {self.tpe_max_revenue} $ / PME < {self.pme_max_revenue} $)"


class VisitPreparation(models.Model):
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='preparations')
    salesperson = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'SALESPERSON'},
        related_name='preparations'
    )
    hypothesis_to_verify = models.TextField(blank=True, default='')
    custom_pitch = models.TextField(blank=True, default='')
    key_questions = models.TextField(blank=True, default='')
    meeting_objective = models.CharField(max_length=255, blank=True, default='')
    scheduled_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Brief: {self.enterprise.name} par {self.salesperson.username}"


class LiveVisitSession(models.Model):
    preparation = models.ForeignKey(VisitPreparation, on_delete=models.CASCADE, related_name='live_sessions')
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='live_sessions')
    salesperson = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='live_sessions')
    session_status = models.CharField(
        max_length=20,
        choices=[('ACTIVE', 'Active'), ('PAUSED', 'En pause'), ('COMPLETED', 'Terminée')],
        default='ACTIVE'
    )
    live_transcript = models.TextField(blank=True, default='', help_text="Transcription incrémentale de l'échange")
    detected_needs = models.JSONField(default=list, blank=True, help_text="Besoins détectés en temps réel")
    detected_objections = models.JSONField(default=list, blank=True, help_text="Objections formulées en direct")
    live_proposition = models.JSONField(default=dict, blank=True, help_text="JSON dynamique de proposition commerciale")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Session Live #{self.id} : {self.enterprise.name} ({self.session_status})"


class VisitReport(models.Model):
    preparation = models.OneToOneField(VisitPreparation, on_delete=models.CASCADE, related_name='report')
    raw_transcript = models.TextField(blank=True, default='')
    executive_summary = models.TextField(blank=True, default='')
    confirmed_needs = models.JSONField(default=list, blank=True)
    objections_raised = models.JSONField(default=list, blank=True)
    actions_todo = models.JSONField(default=list, blank=True)
    follow_up_email_draft = models.TextField(blank=True, default='')
    audio_file_path = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Boucle d'amélioration continue & Feedback vers Core AI
    original_ai_output = models.JSONField(default=dict, blank=True, help_text="Sortie brute originale fournie par Core AI")
    ai_feedback_rating = models.IntegerField(null=True, blank=True, help_text="Note attribuée par le commercial (1 à 5 étoiles)")
    ai_feedback_comments = models.TextField(blank=True, default='', help_text="Remarques et corrections apportées par l'humain")
    ai_feedback_sent_at = models.DateTimeField(null=True, blank=True, help_text="Date d'envoi du feedback au Core AI")

    def __str__(self):
        return f"Rapport: {self.preparation.enterprise.name} ({self.created_at.strftime('%d/%m/%Y')})"


class ScraperCredential(models.Model):
    PLATFORM_CHOICES = [
        ('LINKEDIN', 'LinkedIn'),
        ('TWITTER', 'Twitter / X'),
        ('TIKTOK', 'TikTok'),
        ('FACEBOOK', 'Facebook'),
    ]
    platform = models.CharField(max_length=50, choices=PLATFORM_CHOICES, unique=True)
    cookies_value = models.TextField(help_text="Chaîne brute des cookies ou valeur au format JSON.")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Identifiants de Scraping : {self.get_platform_display()}"


# ============================================================================
# FIELD INTELLIGENCE & LEAD SOURCING MODELS
# ============================================================================

class FieldIntelligenceReport(models.Model):
    CONVERSION_CHOICES = [
        ('SUCCESS', 'Pré-conversion réussie (Documents KYC / RCCM collectés)'),
        ('HESITATION', 'En réflexion / Hésitation'),
        ('REFUSAL', 'Refus / Non-converti'),
    ]
    NURTURING_CHOICES = [
        ('NONE', 'Aucun (Converti)'),
        ('DECIDER_ABSENT', 'Absence du décideur / gérant'),
        ('COMPETITOR_CONTRACT', 'Contrat concurrent en cours'),
        ('BUDGET_WAITING', 'Attente d\'arbitrage budgétaire'),
        ('COMMITMENT_FEAR', 'Crainte d\'engagement long terme'),
        ('TECHNICAL_DOUBT', 'Doutes sur l\'éligibilité technique / fibre'),
        ('OTHER', 'Autre motif'),
    ]

    visit_report = models.OneToOneField(VisitReport, on_delete=models.SET_NULL, null=True, blank=True, related_name='field_intelligence')
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='field_intelligence_reports')
    salesperson = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'SALESPERSON'},
        related_name='field_intelligence_reports'
    )
    
    # Résultat de la tentative de pré-conversion
    conversion_status = models.CharField(max_length=20, choices=CONVERSION_CHOICES, default='SUCCESS')
    rccm_number = models.CharField(max_length=100, blank=True, null=True, help_text="Numéro RCCM si succès")
    
    # Séquence de Nurturing / Recyclage des non-convertis
    nurturing_reason = models.CharField(max_length=30, choices=NURTURING_CHOICES, default='NONE')
    contract_expiry_date = models.DateField(null=True, blank=True, help_text="Date d'échéance du contrat concurrent actuel")
    scheduled_follow_up = models.DateField(null=True, blank=True, help_text="Date de relance recommandée")
    nurturing_notes = models.TextField(blank=True, default='', help_text="Notes contextuelles pour le rappel futur")
    
    # Points de gamification attribués pour ce rapport
    points_earned = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Field Intelligence: {self.enterprise.name} ({self.get_conversion_status_display()})"


class NearbyLead(models.Model):
    """
    Lookalike & Geofenced Lead Sourcing (100m autour du prospect visité)
    """
    STATUS_CHOICES = [
        ('NEW', 'Nouveau repérage'),
        ('ASSIGNED', 'Affecté à un commercial'),
        ('VISITED', 'Visité'),
        ('CONVERTED', 'Converti'),
    ]

    field_report = models.ForeignKey(FieldIntelligenceReport, on_delete=models.CASCADE, related_name='nearby_leads')
    source_enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='nearby_lookalikes')
    
    name = models.CharField(max_length=150, help_text="Nom de l'enseigne ou commerce voisin")
    sector = models.CharField(max_length=100, blank=True, default='Commerce / PME')
    manager_name = models.CharField(max_length=100, blank=True, default='')
    phone = models.CharField(max_length=50, blank=True, default='')
    proximity_notes = models.CharField(max_length=255, blank=True, default='', help_text="Ex: 2 portes à gauche, en face...")
    photo_url = models.TextField(blank=True, default='', help_text="Photo de la devanture (URL ou Data URI)")
    
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NEW')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Voisin 100m: {self.name} (Source: {self.source_enterprise.name})"


class ReferralLead(models.Model):
    """
    Collecte Systématique de Parrainages (Supply-Chain & Recommandations Confrères)
    """
    TYPE_CHOICES = [
        ('SUPPLIER', 'Fournisseur principal'),
        ('PARTNER', 'Partenaire commercial'),
        ('PEER', 'Confrère / Recommandation directe'),
    ]
    STATUS_CHOICES = [
        ('NEW', 'Nouveau parrainage'),
        ('CONTACTED', 'Contacté'),
        ('CONVERTED', 'Converti'),
    ]

    field_report = models.ForeignKey(FieldIntelligenceReport, on_delete=models.CASCADE, related_name='referrals')
    source_enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='generated_referrals')
    
    referral_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='SUPPLIER')
    company_name = models.CharField(max_length=150)
    contact_person = models.CharField(max_length=100, blank=True, default='')
    phone = models.CharField(max_length=50, blank=True, default='')
    notes = models.TextField(blank=True, default='', help_text="Pourquoi cette entreprise a besoin de nos solutions ?")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NEW')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Parrainage {self.get_referral_type_display()}: {self.company_name} (Par {self.source_enterprise.name})"


class TradeAudit(models.Model):
    """
    Intelligence Concurrentielle et Signalement de Friction (Trade Audit Leads)
    """
    field_report = models.ForeignKey(FieldIntelligenceReport, on_delete=models.CASCADE, related_name='trade_audits')
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='trade_audits')
    
    competitor_name = models.CharField(max_length=100, help_text="Opérateur ou FAI actuel (ex: Canalbox, Vodacom, Airtel, etc.)")
    satisfaction_score = models.IntegerField(default=3, help_text="Note de 1 (Très insatisfait) à 5 (Très satisfait)")
    friction_reasons = models.JSONField(default=list, blank=True, help_text="Motifs de mécontentement (pannes, lenteurs, prix...)")
    monthly_spend_estimated = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Facture mensuelle estimée")
    
    # Alerte SQL automatique si note <= 2
    is_priority_friction_alert = models.BooleanField(default=False)
    alert_notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.satisfaction_score <= 2:
            self.is_priority_friction_alert = True
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Audit {self.competitor_name} - {self.enterprise.name} ({self.satisfaction_score}/5)"


class SalesIncentivePoint(models.Model):
    """
    Gamification & Rémunération des Dénicheurs de Leads
    """
    ACTION_CHOICES = [
        ('PRE_CONVERSION', 'Pré-conversion réussie (KYC/RCCM) [+5 pts]'),
        ('NEARBY_LEAD', 'Lead voisin 100m qualifié (photo + contact) [+1 pt]'),
        ('REFERRAL', 'Parrainage / Fournisseur renseigné [+1 pt]'),
        ('TRADE_AUDIT', 'Audit concurrentiel renseigné [+1 pt]'),
    ]

    salesperson = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='incentive_points'
    )
    field_report = models.ForeignKey(FieldIntelligenceReport, on_delete=models.SET_NULL, null=True, blank=True, related_name='incentive_points')
    action_type = models.CharField(max_length=30, choices=ACTION_CHOICES)
    points = models.IntegerField(default=1)
    description = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"+{self.points} pts - {self.salesperson.username} ({self.get_action_type_display()})"


class SalesNotification(models.Model):
    """
    Système de Notifications Push & In-App pour les Commerciaux Terrain.
    Déclenché lors de l'assignation d'une plaque, mise à jour territoriale ou nouveaux prospects.
    """
    NOTIFICATION_TYPES = [
        ('PLAQUE_ASSIGNED', 'Plaque Assignée'),
        ('TERRITORY_UPDATE', 'Mise à jour Territoire & KML'),
        ('NEW_LEAD', 'Nouveau Prospect Détecté'),
        ('ALERT', 'Alerte Système'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'SALESPERSON'},
        related_name='sales_notifications'
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES, default='PLAQUE_ASSIGNED')
    plaque = models.ForeignKey(Plaque, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    payload = models.JSONField(default=dict, blank=True, help_text="Données supplémentaires (kml_url, coordonnées, ids)")
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification [{self.get_notification_type_display()}]: {self.title} -> {self.recipient.username}"


class VisitFormSubmission(models.Model):
    """
    Soumission de formulaire terrain guidé selon l'offre ciblée.
    Remplace la saisie libre par des questions standardisées préconfigurées par le Back-Office.
    """
    STATUS_CHOICES = [
        ('SUBMITTED', 'Soumis au Back-Office'),
        ('QUALIFIED', 'Qualifié (Transmis KAM)'),
        ('NEEDS_INFO', 'Informations Complémentaires Requises'),
        ('REJECTED', 'Non Éligible / Rejeté'),
    ]

    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='form_submissions')
    salesperson = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='form_submissions'
    )
    questionnaire = models.ForeignKey(
        'catalog.OfferQuestionnaire',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='submissions'
    )
    target_offer_name = models.CharField(max_length=150, help_text="Nom de l'offre ciblée (ex: Fibre Pro Orange 50M)")
    answers = models.JSONField(default=list, help_text="Liste des réponses formatées [{question_id, question_text, answer}]")
    ai_summary = models.TextField(blank=True, default='', help_text="Synthèse exécutive générée automatiquement pour le Back-Office")
    qualification_score = models.PositiveIntegerField(default=75, help_text="Score de qualification de 0 à 100")
    detected_needs = models.JSONField(default=list, blank=True, help_text="Besoins télécoms déduits des réponses")
    objections_noted = models.TextField(blank=True, default='', help_text="Objections ou contraintes mentionnées")
    next_action = models.CharField(max_length=255, default="Étude d'éligibilité technique & Contact KAM sous 24h")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='QUALIFIED')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Formulaire [{self.target_offer_name}] - {self.enterprise.name} ({self.created_at.strftime('%d/%m/%Y')})"


# =========================================================================
# MOTEUR DE SCORING ALGORITHMIQUE SANS IA (GOUVERNANCE MSP)
# =========================================================================

class ScoreProfile(models.Model):
    TYPE_HEALTH = 'ACCOUNT_HEALTH'       # Score 1 : Démarre à 100, pénalités si dégradation
    TYPE_UPSELL = 'EXPANSION_UPSELL'     # Score 2 : Démarre à 0, bonus si signaux positifs
    TYPE_CHOICES = [
        (TYPE_HEALTH, 'Santé & Risque de désengagement'),
        (TYPE_UPSELL, 'Potentiel d’Expansion & Upsell'),
    ]

    name = models.CharField(max_length=150, help_text="Nom affiché dans Onbora (ex: Santé relationnelle client)")
    score_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default=TYPE_HEALTH)
    objective = models.CharField(max_length=255, blank=True, help_text="Ce que le score sert à détecter")
    population = models.CharField(max_length=100, default="Tous les clients actifs", help_text="Quels comptes sont calculés")
    analysis_window_days = models.PositiveIntegerField(default=90, help_text="Fenêtre de temps à observer (ex: 90 jours)")
    recalculation_frequency = models.CharField(max_length=30, default='Chaque nuit', help_text="Fréquence de recalcul (ex: Chaque nuit)")
    base_score = models.IntegerField(default=100, help_text="Score de base initial (100 pour santé, 0 pour upsell)")

    # Dimensions actives avec leurs poids: [{"name": "engagement", "label": "Engagement client", "weight": 40}, ...]
    dimensions = models.JSONField(default=list, help_text="Liste des dimensions actives et de leurs poids")

    # Seuils de résultat: [{"min": 80, "max": 100, "label": "Sain", "color": "emerald"}, ...]
    thresholds = models.JSONField(default=list, help_text="Seuils de résultat et libellés")

    # Actions automatiques: {"CRITIQUE": "Créer une tâche KAM sous 48h", ...}
    actions = models.JSONField(default=dict, blank=True, help_text="Actions déclenchées selon le niveau d'alerte")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_score_type_display()})"


class ScoreRule(models.Model):
    profile = models.ForeignKey(ScoreProfile, on_delete=models.CASCADE, related_name='rules')
    name = models.CharField(max_length=255, help_text="Libellé lisible de la condition")
    dimension = models.CharField(max_length=50, help_text="engagement, relation, commercial, sentiment")

    field = models.CharField(max_length=100, help_text="Nom du champ métrique (ex: days_since_last_meeting)")
    operator = models.CharField(max_length=50, help_text="greater_than, less_than, is_true, equals, etc.")
    value = models.JSONField(default=dict, help_text="Valeur seuil cible (ex: 60, true, 'devis')")

    points = models.IntegerField(help_text="Points ajoutés (positif) ou retirés (négatif)")
    valid_for_days = models.PositiveIntegerField(null=True, blank=True, help_text="Durée de validité du signal en jours")
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        sign = "+" if self.points > 0 else ""
        return f"[{self.profile.name}] {self.name} ({sign}{self.points} pts)"


class AccountScoreResult(models.Model):
    enterprise = models.ForeignKey(Enterprise, on_delete=models.CASCADE, related_name='scoring_results')
    profile = models.ForeignKey(ScoreProfile, on_delete=models.CASCADE, related_name='account_results')

    score = models.IntegerField(help_text="Score final calculé entre 0 et 100")
    status_label = models.CharField(max_length=50, help_text="Ex: Sain, À surveiller, Critique")
    status_color = models.CharField(max_length=20, default="blue")

    triggered_rules = models.JSONField(default=list, help_text="Liste transparente des règles déclenchées")
    dimension_scores = models.JSONField(default=dict, help_text="Sous-totaux de points par dimension")
    metrics_snapshot = models.JSONField(default=dict, blank=True, help_text="Instantané des métriques ayant servi au calcul")

    calculated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('enterprise', 'profile')
        ordering = ['-score']

    def __str__(self):
        return f"{self.enterprise.name} - {self.profile.name}: {self.score}/100 ({self.status_label})"


class AccountProjection(models.Model):
    """
    Projection locale d'un compte maître issu du CRM (Dynamics 365 / Kaabu).
    Permet la lecture rapide et le mode hors-ligne sans devenir le système maître (SoR).
    """
    SOURCE_SYSTEM_CHOICES = [
        ('DYNAMICS_365', 'Microsoft Dynamics 365 Sales'),
        ('KAABU', 'CRM Kaabu Orange'),
        ('LOCAL_ONLY', 'Compte créé localement / Non synchronisé'),
    ]
    SYNC_STATUS_CHOICES = [
        ('IN_SYNC', 'Synchronisé et à jour'),
        ('PENDING_PULL', 'Mise à jour distante disponible'),
        ('PENDING_PUSH', 'Modifications locales en attente d\'écriture'),
        ('CONFLICT', 'Conflit de version nécessitant arbitrage'),
        ('ERROR', 'Erreur lors de la dernière tentative'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enterprise = models.OneToOneField(
        Enterprise,
        on_delete=models.CASCADE,
        related_name='crm_projection',
        help_text="Fiche entreprise Onbora rattachée à cette projection"
    )
    crm_account_id = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Identifiant unique dans Microsoft Dynamics 365 / Dataverse"
    )
    source_system = models.CharField(
        max_length=50,
        choices=SOURCE_SYSTEM_CHOICES,
        default='DYNAMICS_365'
    )
    source_version = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="Numéro de version / ETag du système source pour contrôle de concurrence"
    )
    raw_crm_payload = models.JSONField(
        default=dict,
        blank=True,
        help_text="Dernier snapshot JSON reçu du CRM maître"
    )
    last_pulled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date de dernière lecture incrémentale depuis le CRM"
    )
    last_pushed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date de dernière écriture confirmée vers le CRM"
    )
    sync_status = models.CharField(
        max_length=30,
        choices=SYNC_STATUS_CHOICES,
        default='IN_SYNC'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = "Projection CRM Compte"
        verbose_name_plural = "Projections CRM Comptes"

    def __str__(self):
        return f"Projection {self.crm_account_id} ({self.enterprise.name})"


class AccountPortfolioAssignment(models.Model):
    """
    Modèle d'affectation explicite de compte à un commercial ou KAM.
    Formalise la séparation stricte : SOHO = Prospecteur/Prestataire, PME & GC = KAM.
    """
    ASSIGNMENT_TYPES = [
        ('PRIMARY_KAM', 'KAM Titulaire (PME & Grands Comptes)'),
        ('BACKUP_KAM', 'KAM Suppléant (Binôme / Backup)'),
        ('SOHO_REPRESENTATIVE', 'Prospecteur / Prestataire Terrain (SOHO)'),
        ('TECHNICAL_SALES', 'Ingénieur Avant-Vente / Spécialiste'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enterprise = models.ForeignKey(
        Enterprise,
        on_delete=models.CASCADE,
        related_name='portfolio_assignments',
        help_text="Entreprise assignée"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='account_assignments',
        help_text="Utilisateur assigné (KAM ou Commercial SOHO)"
    )
    assignment_type = models.CharField(
        max_length=30,
        choices=ASSIGNMENT_TYPES,
        default='PRIMARY_KAM',
        db_index=True
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dispatched_assignments',
        help_text="Manager ayant validé l'affectation"
    )
    is_active = models.BooleanField(default=True, db_index=True)
    notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-assigned_at']
        verbose_name = "Affectation Portefeuille"
        verbose_name_plural = "Affectations Portefeuilles"
        unique_together = ('enterprise', 'user', 'assignment_type')

    def __str__(self):
        return f"{self.get_assignment_type_display()} : {self.user.get_full_name() or self.user.username} -> {self.enterprise.name}"


class SourceObservation(models.Model):
    """
    Observation brute et immuable collectée depuis une source externe autorisée
    (registres, site web officiel, appel d'offres, visite terrain).
    """
    SOURCE_TYPES = [
        ('PUBLIC_REGISTRY', 'Registre du Commerce / Fisc (RCCM, IdNat)'),
        ('OFFICIAL_GAZETTE', 'Journal Officiel / Marchés Publics'),
        ('COMPANY_WEBSITE', 'Site Web Officiel de l\'Entreprise'),
        ('NEWS_MEDIA', 'Presse Économique / Média Spécialisé'),
        ('FIELD_VISIT', 'Constat direct lors d\'une visite terrain'),
        ('CRM_ACTIVITY', 'Historique d\'activité CRM validé'),
    ]
    STATUS_CHOICES = [
        ('COLLECTED', 'Collectée (Brute)'),
        ('VERIFIED', 'Vérifiée par opérateur'),
        ('REJECTED', 'Rejetée (Non pertinente ou obsolète)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enterprise = models.ForeignKey(
        Enterprise,
        on_delete=models.CASCADE,
        related_name='source_observations',
        help_text="Entreprise concernée"
    )
    source_type = models.CharField(max_length=30, choices=SOURCE_TYPES, db_index=True)
    source_uri = models.CharField(max_length=500, help_text="URL de la source ou identifiant officiel")
    source_title = models.CharField(max_length=255, blank=True, default='', help_text="Titre ou description courte de la source")
    observed_at = models.DateTimeField(db_index=True, help_text="Date exacte de parution ou de constat de l'observation")
    captured_at = models.DateTimeField(auto_now_add=True, help_text="Date d'enregistrement dans Onbora")
    excerpt_text = models.TextField(help_text="Extrait textuel brut étayant l'observation")
    excerpt_hash = models.CharField(max_length=64, blank=True, default='', db_index=True, help_text="Empreinte SHA256 de l'extrait pour déduplication")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='COLLECTED')
    captured_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='captured_observations',
        help_text="Utilisateur ayant capturé l'observation (si saisie manuelle)"
    )

    class Meta:
        ordering = ['-observed_at']
        verbose_name = "Observation Sourcée"
        verbose_name_plural = "Observations Sourcées"

    def save(self, *args, **kwargs):
        if not self.excerpt_hash and self.excerpt_text:
            self.excerpt_hash = hashlib.sha256(self.excerpt_text.encode('utf-8')).hexdigest()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.get_source_type_display()}] {self.enterprise.name} ({self.observed_at.strftime('%d/%m/%Y')})"


class Evidence(models.Model):
    """
    Fait qualifié, hypothèse ou inconnue formellement rattaché à une preuve.
    Invariant : Tout fait opérationnel ('FACT') confirmé référence obligatoirement une observation traçable.
    """
    KIND_CHOICES = [
        ('FACT', 'Fait avéré et prouvé'),
        ('HYPOTHESIS', 'Hypothèse commerciale à confirmer'),
        ('UNKNOWN', 'Inconnue critique / Donnée manquante'),
    ]
    REVIEW_STATUS_CHOICES = [
        ('TO_CONFIRM', 'À confirmer en entretien'),
        ('CONFIRMED', 'Confirmé et validé'),
        ('REJECTED', 'Infirmé / Rejeté'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enterprise = models.ForeignKey(
        Enterprise,
        on_delete=models.CASCADE,
        related_name='evidences',
        help_text="Entreprise concernée"
    )
    observation = models.ForeignKey(
        SourceObservation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='derived_evidences',
        help_text="Observation source justifiant cette preuve"
    )
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default='HYPOTHESIS', db_index=True)
    category = models.CharField(
        max_length=50,
        default='BUSINESS',
        help_text="Ex: CONNECTIVITY, GOVERNANCE, BUDGET, SITES, HARDWARE, RISK"
    )
    statement = models.TextField(help_text="Énoncé clair de l'affirmation commerciale ou de l'inconnue")
    confidence_score = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=0.70,
        help_text="Score de certitude (0.00 à 1.00)"
    )
    review_status = models.CharField(max_length=20, choices=REVIEW_STATUS_CHOICES, default='TO_CONFIRM', db_index=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_evidences',
        help_text="Commercial ou KAM ayant confirmé le fait"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    valid_from = models.DateTimeField(auto_now_add=True)
    valid_until = models.DateTimeField(null=True, blank=True, help_text="Date de caducité du fait")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Preuve & Fait Qualifié"
        verbose_name_plural = "Preuves & Faits Qualifiés"

    def __str__(self):
        return f"[{self.get_kind_display()}] {self.enterprise.name}: {self.statement[:50]}..."


class IdempotencyRecord(models.Model):
    """
    Registre d'idempotence des opérations mobiles (Outbox Flutter) et intégrations.
    Garantit qu'une commande rejouée après coupure réseau retourne le résultat mis en cache
    sans dupliquer les rapports, les observations ou les dossiers de transmission.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idempotency_key = models.CharField(max_length=128, unique=True, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='idempotent_records'
    )
    operation_type = models.CharField(max_length=50, default='VISIT_COMPLETE', db_index=True)
    request_hash = models.CharField(max_length=64, blank=True, default='', help_text="SHA256 du payload requête")
    response_status = models.IntegerField(default=200)
    response_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Enregistrement d'Idempotence"
        verbose_name_plural = "Enregistrements d'Idempotence"

    def __str__(self):
        return f"Idempotency {self.idempotency_key} ({self.operation_type}) -> HTTP {self.response_status}"






