import logging
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from sales.models import Enterprise, Plaque
from kam.models import B2BNewsFeedItem

logger = logging.getLogger(__name__)


class B2BNewsFeedService:
    """
    Service de veille stratégique et fil d'actualité B2B pour les Key Account Managers (KAM).
    Gère la restitution des signaux sur le portefeuille et les nouveaux comptes détectés sur le net.
    """

    @classmethod
    def get_feed(
        cls,
        user,
        feed_type: str = 'ALL',
        category: Optional[str] = None,
        search: Optional[str] = None,
        is_saved: Optional[bool] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Récupère le fil d'actualité filtré et agrégé pour le KAM connecté.
        Utilise select_related pour garantir zéro requête N+1.
        """
        # S'assurer que des actualités initiales existent
        if B2BNewsFeedItem.objects.count() == 0:
            cls.seed_sample_news(user)

        qs = B2BNewsFeedItem.objects.select_related('enterprise', 'enterprise__assigned_kam').all()

        # Filtrage par type de fil
        if feed_type == 'PORTFOLIO':
            # Nouvelles sur les comptes B2B en portefeuille
            qs = qs.filter(is_web_discovery=False)
            if hasattr(user, 'role') and user.role == 'KAM' and not user.is_staff and not user.is_superuser:
                qs = qs.filter(Q(enterprise__assigned_kam=user) | Q(enterprise__assigned_kam__isnull=True))
        elif feed_type == 'WEB_DISCOVERY':
            # Nouveaux comptes découverts sur le net
            qs = qs.filter(is_web_discovery=True)

        # Filtre catégorie
        if category and category != 'ALL':
            qs = qs.filter(category=category)

        # Filtre favoris
        if is_saved is not None:
            qs = qs.filter(is_saved=is_saved)

        # Filtre recherche textuelle
        if search:
            s = search.strip()
            qs = qs.filter(
                Q(title__icontains=s) |
                Q(summary__icontains=s) |
                Q(commercial_angle__icontains=s) |
                Q(discovered_company_name__icontains=s) |
                Q(enterprise__name__icontains=s) |
                Q(discovered_sector__icontains=s) |
                Q(discovered_location__icontains=s)
            )

        total_count = qs.count()
        items = list(qs[:limit])

        # Métriques globales rapides
        base_qs = B2BNewsFeedItem.objects.all()
        portfolio_count = base_qs.filter(is_web_discovery=False).count()
        web_discovery_count = base_qs.filter(is_web_discovery=True).count()
        unread_count = base_qs.filter(is_read=False).count()
        saved_count = base_qs.filter(is_saved=True).count()

        return {
            "items": items,
            "total_count": total_count,
            "counters": {
                "all": base_qs.count(),
                "portfolio": portfolio_count,
                "web_discovery": web_discovery_count,
                "unread": unread_count,
                "saved": saved_count,
            }
        }

    @classmethod
    def mark_as_read(cls, item_id: str, is_read: bool = True) -> B2BNewsFeedItem:
        """Marque une actualité comme lue ou non-lue."""
        item = B2BNewsFeedItem.objects.select_related('enterprise').get(id=item_id)
        item.is_read = is_read
        item.save(update_fields=['is_read', 'updated_at'])
        return item

    @classmethod
    def toggle_saved(cls, item_id: str) -> B2BNewsFeedItem:
        """Bascule l'état favori d'une actualité."""
        item = B2BNewsFeedItem.objects.select_related('enterprise').get(id=item_id)
        item.is_saved = not item.is_saved
        item.save(update_fields=['is_saved', 'updated_at'])
        return item

    @classmethod
    @transaction.atomic
    def convert_to_portfolio_account(cls, item_id: str, user) -> Dict[str, Any]:
        """
        Convertit un nouveau compte découvert sur le net en compte d'entreprise B2B formel
        dans le portefeuille du KAM connecté.
        """
        item = B2BNewsFeedItem.objects.select_related('enterprise').select_for_update().get(id=item_id)
        
        if item.enterprise:
            # Si l'entreprise est déjà liée, on l'assigne au KAM s'il n'est pas déjà assigné
            enterprise = item.enterprise
            if not enterprise.assigned_kam:
                enterprise.assigned_kam = user
                enterprise.assigned_at = timezone.now()
                enterprise.save(update_fields=['assigned_kam', 'assigned_at'])
            item.is_converted_to_portfolio = True
            item.save(update_fields=['is_converted_to_portfolio', 'updated_at'])
            return {
                "enterprise_id": enterprise.id,
                "enterprise_name": enterprise.name,
                "message": f"Compte {enterprise.name} rattaché à votre portefeuille KAM."
            }

        # Création de la nouvelle entreprise depuis les signaux web
        company_name = item.discovered_company_name or item.title[:50]
        
        # Plaque par défaut
        plaque_obj = Plaque.objects.filter(is_active=True).first()
        plaque_code = plaque_obj.name if plaque_obj else 'Kinshasa (Gombe)'

        enterprise = Enterprise.objects.create(
            name=company_name,
            website=item.discovered_website or None,
            sector=item.discovered_sector or 'Tertiaire & Services',
            approximate_size=item.discovered_size or '20-50 salariés',
            location=item.discovered_location or 'Kinshasa',
            plaque=plaque_code,
            plaque_rel=plaque_obj,
            segment='PME',
            assigned_entity='KAM_OFFICE',
            assigned_kam=user,
            assigned_at=timezone.now(),
            contact_name="Direction Générale",
            current_connectivity="4G LTE / Opérateur Tiers",
        )

        item.enterprise = enterprise
        item.is_converted_to_portfolio = True
        item.save(update_fields=['enterprise', 'is_converted_to_portfolio', 'updated_at'])

        logger.info("Nouveau compte web converti en portefeuille : %s (ID %s) par %s", enterprise.name, enterprise.id, user.username)

        return {
            "enterprise_id": enterprise.id,
            "enterprise_name": enterprise.name,
            "message": f"Nouveau compte {enterprise.name} créé et ajouté avec succès à votre portefeuille B2B."
        }

    @classmethod
    def seed_sample_news(cls, user=None) -> int:
        """
        Alimente le fil d'actualité avec des signaux réalistes et contextuels :
        - Nouvelles de veille sur les comptes B2B existants
        - Nouveaux comptes détectés sur le net (Web Sourcing)
        """
        created_count = 0
        now = timezone.now()

        # 1. Comptes existants
        enterprises = list(Enterprise.objects.all()[:15])
        ent_by_name = {e.name.lower(): e for e in enterprises}

        # Données de veille sur comptes B2B existants
        portfolio_news = [
            {
                "company_hint": "rawbank",
                "fallback_name": "Rawbank RDC",
                "title": "Ouverture de 4 nouvelles agences et déploiement de guichets intelligents au Lualaba",
                "summary": "Le groupe bancaire accélère son extension dans la ceinture minière de Kolwezi avec l'inauguration de 4 agences modernes nécessitant une redondance télécoms et une connexion temps réel vers le Datacenter central de Kinshasa.",
                "source_name": "Presse Économique RDC",
                "source_url": "https://zoom-eco.net",
                "category": "EXPANSION",
                "priority": "HIGH",
                "commercial_angle": "Besoin immédiat en liaisons louées Fibre Dédiée 100 Mbps avec bascule automatique SD-WAN 4G/Satellite sur les 4 nouveaux sites de Kolwezi.",
                "recommended_action": "Contacter la Direction des Opérations Réseau pour proposer une offre groupée Fibre Pro + SD-WAN Managé.",
                "recommended_offer": "Fibre Dédiée Sécurisée & SD-WAN Inter-sites",
                "offset_hours": 2
            },
            {
                "company_hint": "tenke",
                "fallback_name": "Tenke Fungurume Mining",
                "title": "Nomination d'un nouveau Directeur des Systèmes d'Information (DSI) et audit cybersécurité",
                "summary": "M. Alain Kanza a été nommé DSI groupe. Sa feuille de route prioritaire inclut la modernisation du réseau industriel SCADA et le renforcement de la protection contre les ransomwares suite aux recommandations internationales.",
                "source_name": "LinkedIn Pro / Mining News",
                "source_url": "https://linkedin.com",
                "category": "MANAGEMENT",
                "priority": "HIGH",
                "commercial_angle": "Changement de gouvernance IT : le nouveau DSI réévalue systématiquement les contrats de connectivité et de sécurité managée (SOC).",
                "recommended_action": "Planifier un rendez-vous institutionnel de courtoisie pour présenter notre offre Cyber Défense et Audit Télécoms.",
                "recommended_offer": "Cyber SOC Managé & Pare-feu Nouvelle Génération",
                "offset_hours": 5
            },
            {
                "company_hint": "bracongo",
                "fallback_name": "Bracongo SA",
                "title": "Incident majeur sur la boucle réseau concurrente signalée sur les sites d'embouteillage de Limete",
                "summary": "Plusieurs interruptions de liaison ont été constatées chez l'opérateur historique cette semaine, ralentissant la chaîne de logistique et la synchronisation SAP de l'usine.",
                "source_name": "Veille Télécoms & Réseaux Sociaux",
                "source_url": "https://twitter.com",
                "category": "INCIDENT",
                "priority": "HIGH",
                "commercial_angle": "Forte insatisfaction opérationnelle client. Opportunité stratégique de positionner une liaison Fibre de secours Orange avec garantie de temps de rétablissement (GTR 2h).",
                "recommended_action": "Appeler le Directeur Technique pour lui proposer une démonstration de bascule instantanée sans coupure.",
                "recommended_offer": "Liaison de Secours Haute Disponibilité GTR 2h",
                "offset_hours": 9
            },
            {
                "company_hint": "equity",
                "fallback_name": "Equity BCDC",
                "title": "Migration Cloud hybride et centralisation des flux bancaires régionaux",
                "summary": "Equity BCDC prépare la migration de son infrastructure applicative vers un cloud privé interconnecté avec ses filiales en Afrique Centrale. Le projet requiert un backbone très haut débit.",
                "source_name": "Africa Tech Review",
                "source_url": "https://africatechreview.com",
                "category": "TECH_PROJECT",
                "priority": "MEDIUM",
                "commercial_angle": "Le passage au Cloud hybride nécessite une interconnexion directe (Direct Connect) à faible latence vers les datacenters neutres.",
                "recommended_action": "Transmettre une proposition de valeur Cloud Connect Orange Business.",
                "recommended_offer": "Cloud Direct Connect & Hébergement Datacenter",
                "offset_hours": 24
            },
            {
                "company_hint": "bollore",
                "fallback_name": "Africa Global Logistics (AGL RDC)",
                "title": "Extension de la plateforme logistique multimodale au terminal portuaire de Matadi",
                "summary": "Mise en service d'une nouvelle zone de dépotage sous douane de 15 000 m². Les terminaux mobiles de manutention et les caméras de vidéosurveillance nécessitent une couverture Wi-Fi Pro outdoor et fibre optique.",
                "source_name": "Journal Maritime & Transport",
                "source_url": "https://port-matadi.cd",
                "category": "EXPANSION",
                "priority": "MEDIUM",
                "commercial_angle": "Demande en réseau sans fil haute densité industriel et liaison Fibre 200 Mbps vers le siège de Kinshasa.",
                "recommended_action": "Proposer une étude de couverture Wi-Fi Pro Outdoor avec visite terrain conjointe.",
                "recommended_offer": "Wi-Fi Pro Industriel & Fibre Optique Dédiée",
                "offset_hours": 36
            }
        ]

        for item_data in portfolio_news:
            ent = None
            for key, e in ent_by_name.items():
                if item_data["company_hint"] in key:
                    ent = e
                    break
            if not ent and enterprises:
                ent = enterprises[len(created_count) % len(enterprises)] if isinstance(created_count, list) else enterprises[created_count % len(enterprises)]

            pub_date = now - timezone.timedelta(hours=item_data["offset_hours"])
            B2BNewsFeedItem.objects.create(
                enterprise=ent,
                is_web_discovery=False,
                title=item_data["title"],
                summary=item_data["summary"],
                source_name=item_data["source_name"],
                source_url=item_data["source_url"],
                category=item_data["category"],
                priority=item_data["priority"],
                commercial_angle=item_data["commercial_angle"],
                recommended_action=item_data["recommended_action"],
                recommended_offer=item_data["recommended_offer"],
                published_at=pub_date,
            )
            created_count += 1

        # 2. Nouveaux comptes détectés sur le net (Web Sourcing)
        web_discovery_accounts = [
            {
                "company_name": "Katanga Mining Logix SARL",
                "website": "https://katangalogix.cd",
                "sector": "Mines & Logistique Lourde",
                "location": "Kolwezi (Lualaba)",
                "size": "50-100 salariés",
                "signals": ["Nouveau site web déployé", "Immatriculation RCCM récente (CD/KZI/2026)", "Offres d'emploi pour 12 ingénieurs logistiques"],
                "title": "Nouveau prestataire logistique minier immatriculé à Kolwezi avec flotte de 40 camions",
                "summary": "Détection d'une nouvelle entité logistique spécialisée dans le transport de concentrés de cuivre et cobalt entre Kolwezi et le corridor de Durban. La société vient de publier son portail d'appels d'offres en ligne.",
                "source_name": "Veille Registre RCCM & Web Sourcing",
                "source_url": "https://guichetunique.cd",
                "category": "NEW_ACCOUNT",
                "priority": "HIGH",
                "commercial_angle": "Nouveau compte B2B à fort potentiel non encore prospecté. Flotte connectée par télématique GPS et besoin critique de connectivité internet par satellite/4G sur les routes de transit.",
                "recommended_action": "Prendre contact immédiatement avec le Directeur Général pour proposer notre pack Flotte Connectée IoT + Fibre Bureau.",
                "recommended_offer": "Pack IoT Télématique Flotte & Fibre Pro",
                "offset_hours": 1
            },
            {
                "company_name": "CongoPay Gateway & Fintech",
                "website": "https://congopay.io",
                "sector": "Fintech & Paiements Numériques",
                "location": "Kinshasa (Gombe)",
                "size": "25 salariés",
                "signals": ["Levée de fonds d'amorçage de 1.8M$", "Agrément Banque Centrale obtenu", "Stack AWS + Cloudflare"],
                "title": "La fintech CongoPay lève 1,8 million USD pour son agrégateur de paiement multi-opérateurs",
                "summary": "La start-up kinoise spécialisée dans l'encaissement marchand pour le e-commerce vient de boucler son premier tour de table pour installer son hub technique à la Gombe et recruter son équipe de développeurs.",
                "source_name": "TechCabal / Presse Économique",
                "source_url": "https://techcabal.com",
                "category": "FINANCE",
                "priority": "HIGH",
                "commercial_angle": "Agrégateur de paiement : besoin impératif d'interconnexion directe aux API USSD/SMS Orange Money et de liens télécoms redondés haute sécurité.",
                "recommended_action": "Positionner Onbora comme partenaire télécoms & passerelle de paiement auprès des fondateurs.",
                "recommended_offer": "Liaison Bancaire Dédiée & Passerelle SMS/USSD",
                "offset_hours": 4
            },
            {
                "company_name": "Clinique Internationale du Fleuve (CIF)",
                "website": "https://clinique-fleuve.cd",
                "sector": "Santé & Hôpitaux Privés",
                "location": "Kinshasa (Ngaliema)",
                "size": "80 salariés",
                "signals": ["Travaux d'aménagement en phase finale", "Appel d'offres pour système PACS imagerie médicale", "Publication sur LinkedIn Recrutement"],
                "title": "Ouverture imminente d'un centre hospitalier privé de 60 lits à Ngaliema",
                "summary": "Le groupe médical CIF finalise les travaux d'un complexe hospitalier haut de gamme avec service d'urgences, imagerie par résonance magnétique (IRM) et télémédecine.",
                "source_name": "LinkedIn / Annonces Légales",
                "source_url": "https://linkedin.com",
                "category": "EXPANSION",
                "priority": "HIGH",
                "commercial_angle": "L'imagerie médicale dématérialisée (PACS) et la télémédecine requièrent une bande passante garantie et une continuité de service 24/7.",
                "recommended_action": "Contacter le Médecin Directeur pour présenter notre offre Santé Numérique & Fibre Symétrique.",
                "recommended_offer": "Fibre Pro Symétrique 100 Mbps & Téléphonie IP Centrex",
                "offset_hours": 7
            },
            {
                "company_name": "Lubumbashi Agro-Industries",
                "website": "https://lai-katanga.cd",
                "sector": "Agro-alimentaire & Minoterie",
                "location": "Lubumbashi (Annexe)",
                "size": "120 salariés",
                "signals": ["Importation d'équipements de meunerie industrielle", "Annonce dans la presse locale", "Début de recrutement de techniciens de maintenance"],
                "title": "Implantation d'une nouvelle unité industrielle de minoterie et de stockage de maïs",
                "summary": "Un consortium d'investisseurs régionaux démarre la construction d'une usine moderne de transformation de céréales d'une capacité de 200 tonnes par jour en périphérie de Lubumbashi.",
                "source_name": "Presse Régionale Katanga",
                "source_url": "https://katanga-business.com",
                "category": "NEW_ACCOUNT",
                "priority": "MEDIUM",
                "commercial_angle": "Site situé hors du coeur urbain : opportunité idéale de raccordement par faisceau hertzien ou fibre optique avec interphonie de site.",
                "recommended_action": "Effectuer une étude d'éligibilité radio/fibre pour formuler une offre préemptive avant la fin du chantier.",
                "recommended_offer": "Faisceau Hertzien Haute Capacité & PABX IP",
                "offset_hours": 18
            },
            {
                "company_name": "Kivu Data Hub SARL",
                "website": "https://kivudata.cd",
                "sector": "Technologies & Ingénierie Numérique",
                "location": "Goma (Nord-Kivu)",
                "size": "30 salariés",
                "signals": ["Partenariat avec des ONG internationales", "Lancement d'une plateforme SIG de cartographie", "Campagne de recrutement tech"],
                "title": "Création d'un centre d'ingénierie logicielle et d'analyse de données humanitaires à Goma",
                "summary": "Une société d'ingénierie vient d'ouvrir ses bureaux à Goma pour fournir des services d'analyse cartographique et de gestion de données de secours aux organisations humanitaires.",
                "source_name": "Veille Web Tech Afrique",
                "source_url": "https://tech-rdc.com",
                "category": "NEW_ACCOUNT",
                "priority": "MEDIUM",
                "commercial_angle": "Forte consommation de données cartographiques et échanges volumineux avec les sièges des ONG en Europe et aux États-Unis.",
                "recommended_action": "Proposer notre offre Satellite Très Haut Débit et VPN International sécurisé.",
                "recommended_offer": "Fibre Optique Goma & VPN International Sécurisé",
                "offset_hours": 30
            }
        ]

        for acc in web_discovery_accounts:
            pub_date = now - timezone.timedelta(hours=acc["offset_hours"])
            B2BNewsFeedItem.objects.create(
                enterprise=None,
                is_web_discovery=True,
                discovered_company_name=acc["company_name"],
                discovered_website=acc["website"],
                discovered_sector=acc["sector"],
                discovered_location=acc["location"],
                discovered_size=acc["size"],
                discovered_signals=acc["signals"],
                title=acc["title"],
                summary=acc["summary"],
                source_name=acc["source_name"],
                source_url=acc["source_url"],
                category=acc["category"],
                priority=acc["priority"],
                commercial_angle=acc["commercial_angle"],
                recommended_action=acc["recommended_action"],
                recommended_offer=acc["recommended_offer"],
                published_at=pub_date,
            )
            created_count += 1

        logger.info("%d signaux de veille B2B initialisés avec succès.", created_count)
        return created_count
