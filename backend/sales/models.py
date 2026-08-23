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

    def __str__(self):
        return f"{self.name} ({self.plaque})"


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


