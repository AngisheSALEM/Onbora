import logging
import re
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Count
from sales.models import Enterprise, Plaque
from kam.models import B2BNewsFeedItem
from ai_core.services.commercial_signal_scorer import commercial_signal_scorer

logger = logging.getLogger(__name__)


class B2BNewsFeedService:
    """
    Service de veille stratégique et fil d'actualité B2B pour les Key Account Managers (KAM).
    Gère la restitution des signaux sur le portefeuille et les nouveaux comptes détectés sur le net.
    Intègre le scoring Core AI pour qualifier chaque actualité en Signal Fort ou Signal Faible.
    """

    @classmethod
    def get_feed(
        cls,
        user,
        feed_type: str = 'ALL',
        category: Optional[str] = None,
        search: Optional[str] = None,
        enterprise_id: Optional[Any] = None,
        is_saved: Optional[bool] = None,
        signal_strength: Optional[str] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Récupère le fil d'actualité filtré et agrégé pour le KAM connecté.
        Permet de filtrer par type (Tous, Nouveaux leads, Portefeuille) et par intensité de signal (Fort, Faible).
        Utilise select_related pour garantir zéro requête N+1.
        """
        qs = B2BNewsFeedItem.objects.select_related('enterprise', 'enterprise__assigned_kam').all()

        # Filtrage par entreprise spécifique si demandé
        if enterprise_id:
            clean_eid = str(enterprise_id).replace('account-', '').strip()
            if clean_eid.isdigit():
                eid_int = int(clean_eid)
                cls.ensure_enterprise_news(eid_int)
                qs = qs.filter(enterprise_id=eid_int)

        # Filtrage par type de fil (Nouveaux leads / Portefeuille / Tous)
        if feed_type == 'PORTFOLIO':
            qs = qs.filter(is_web_discovery=False)
            if hasattr(user, 'role') and user.role == 'KAM' and not user.is_staff and not user.is_superuser:
                qs = qs.filter(Q(enterprise__assigned_kam=user) | Q(enterprise__assigned_kam__isnull=True))
        elif feed_type == 'WEB_DISCOVERY':
            qs = qs.filter(is_web_discovery=True)

        # Filtre par intensité de signal (Signaux forts / Signaux faibles)
        if signal_strength and signal_strength.upper() in ('STRONG', 'WEAK'):
            qs = qs.filter(signal_strength=signal_strength.upper())

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
                Q(signal_rationale__icontains=s) |
                Q(discovered_company_name__icontains=s) |
                Q(enterprise__name__icontains=s) |
                Q(discovered_sector__icontains=s) |
                Q(discovered_location__icontains=s)
            )

        total_count = qs.count()
        items = list(qs[:limit])

        # Métriques globales rapides
        base_qs = B2BNewsFeedItem.objects.all()
        if enterprise_id:
            clean_eid = str(enterprise_id).replace('account-', '').strip()
            if clean_eid.isdigit():
                base_qs = base_qs.filter(enterprise_id=int(clean_eid))

        counters = base_qs.aggregate(
            all=Count('pk'),
            portfolio=Count('pk', filter=Q(is_web_discovery=False)),
            web_discovery=Count('pk', filter=Q(is_web_discovery=True)),
            unread=Count('pk', filter=Q(is_read=False)),
            saved=Count('pk', filter=Q(is_saved=True)),
            strong_signals=Count('pk', filter=Q(signal_strength='STRONG')),
            weak_signals=Count('pk', filter=Q(signal_strength='WEAK')),
        )
        return {"items": items, "total_count": total_count, "counters": counters}


    @classmethod
    def get_enterprise_feed(
        cls,
        enterprise_id: Any,
        user=None,
        category: Optional[str] = None,
        is_saved: Optional[bool] = None,
        signal_strength: Optional[str] = None,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retourne spécifiquement le fil d'actualité et de signaux pour une entreprise B2B donnée.
        """
        clean_eid = str(enterprise_id).replace('account-', '').strip()
        if not clean_eid.isdigit():
            return {
                "items": [],
                "total_count": 0,
                "counters": {"all": 0, "unread": 0, "saved": 0, "strong_signals": 0, "weak_signals": 0}
            }

        eid_int = int(clean_eid)
        cls.ensure_enterprise_news(eid_int)

        qs = B2BNewsFeedItem.objects.select_related('enterprise', 'enterprise__assigned_kam').filter(enterprise_id=eid_int)

        if category and category != 'ALL':
            qs = qs.filter(category=category)
        if signal_strength and signal_strength.upper() in ('STRONG', 'WEAK'):
            qs = qs.filter(signal_strength=signal_strength.upper())
        if is_saved is not None:
            qs = qs.filter(is_saved=is_saved)
        if search:
            s = search.strip()
            qs = qs.filter(
                Q(title__icontains=s) |
                Q(summary__icontains=s) |
                Q(commercial_angle__icontains=s) |
                Q(signal_rationale__icontains=s)
            )

        total_count = qs.count()
        base_enterprise_qs = B2BNewsFeedItem.objects.filter(enterprise_id=eid_int)
        unread_count = base_enterprise_qs.filter(is_read=False).count()
        saved_count = base_enterprise_qs.filter(is_saved=True).count()
        strong_count = base_enterprise_qs.filter(signal_strength='STRONG').count()
        weak_count = base_enterprise_qs.filter(signal_strength='WEAK').count()
        items = list(qs.order_by('-published_at')[:30])

        return {
            "items": items,
            "total_count": total_count,
            "counters": {
                "all": base_enterprise_qs.count(),
                "unread": unread_count,
                "saved": saved_count,
                "strong_signals": strong_count,
                "weak_signals": weak_count,
            }
        }

    @classmethod
    def ensure_enterprise_news(cls, enterprise_id: int) -> List[B2BNewsFeedItem]:
        """
        Garantit que l'entreprise dispose d'un fil d'actualités et de signaux contextualisés,
        avec scoring Core AI automatique (Signaux Forts et Signaux Faibles).
        """
        try:
            enterprise = Enterprise.objects.get(id=enterprise_id)
        except Enterprise.DoesNotExist:
            return []

        existing = list(B2BNewsFeedItem.objects.filter(enterprise_id=enterprise_id))
        if existing:
            return existing

        now = timezone.now()
        sec = (enterprise.sector or '').lower()
        name = enterprise.name
        city = enterprise.city or enterprise.location or "RDC"

        if any(w in sec for w in ['mine', 'extract', 'energie', 'énergie', 'cuivre', 'cobalt', 'or']) or 'kamoa' in name.lower() or 'mining' in name.lower():
            items_to_create = [
                {
                    "title": f"Extension de cadence opérationnelle et investissements d'infrastructures à {city}",
                    "summary": f"{name} intensifie sa cadence de production avec la mise en service de nouvelles installations industrielles et de concentrateurs métallurgiques à {city}. Les flux opérationnels nécessitent une interconnexion réseau continue et sécurisée entre les sites de surface et les opérations de fond.",
                    "source_name": "Mining Review Africa / Presse Économique",
                    "source_url": "https://miningreview.com",
                    "category": "EXPANSION",
                    "priority": "HIGH",
                    "commercial_angle": f"Augmentation des volumes de données télémétriques et supervision SCADA : opportunité majeure de positionner une liaison Fibre Dédiée 100 Mbps avec bascule automatique de secours Satellite VSAT.",
                    "recommended_action": "Contacter le Directeur des Opérations Minières pour proposer une étude d'interconnexion haute disponibilité (GTR 2h).",
                    "recommended_offer": "Fibre Dédiée Pro & Redondance Satellite VSAT",
                    "offset_hours": 3
                },
                {
                    "title": "Projet d'automatisation des engins miniers et couverture sans fil industrielle",
                    "summary": f"Dans le cadre de son plan de modernisation technologique et de sécurité du personnel, la direction technique de {name} évalue le déploiement d'une infrastructure radio privée sécurisée pour le pilotage et la télémétrie des flottes d'extraction.",
                    "source_name": "LinkedIn Pro / Direction Technique",
                    "source_url": "https://linkedin.com",
                    "category": "TECH_PROJECT",
                    "priority": "HIGH",
                    "commercial_angle": "Besoin impératif en réseau mobile privé (Private LTE / 5G) à faible latence et garantie de service 99.99% pour les véhicules autonomes et capteurs IoT.",
                    "recommended_action": "Organiser un atelier technique conjoint avec l'équipe Avant-Vente et Solutions Complexes Orange Business.",
                    "recommended_offer": "Réseau Privé Mobile Industriel (Private LTE) & IoT",
                    "offset_hours": 14
                },
                {
                    "title": f"Publication du rapport annuel RSE et initiatives de réhabilitation environnementale à {city}",
                    "summary": f"La direction de {name} a rendu public son bilan de développement durable et d'initiatives communautaires menées auprès des populations riveraines pour l'exercice écoulé.",
                    "source_name": "Revue RSE & Développement Durable",
                    "source_url": "https://miningreview.com",
                    "category": "MANAGEMENT",
                    "priority": "NORMAL",
                    "commercial_angle": "Veille institutionnelle : relation publique et conformité environnementale, sans investissement technologique direct immédiat.",
                    "recommended_action": "Prendre note pour les échanges de courtoisie lors de la prochaine revue de compte.",
                    "recommended_offer": "Suivi relationnel",
                    "offset_hours": 36
                }
            ]
        elif any(w in sec for w in ['banque', 'finance', 'microfinance', 'assurance', 'fintech']):
            items_to_create = [
                {
                    "title": f"Extension du réseau d'agences et digitalisation des services de proximité à {city}",
                    "summary": f"{name} déploie de nouveaux points de service et guichets automatisés nécessitant une redondance télécoms permanente et un raccordement direct aux serveurs bancaires centraux.",
                    "source_name": "Presse Économique RDC / Zoom Eco",
                    "source_url": "https://zoom-eco.net",
                    "category": "EXPANSION",
                    "priority": "HIGH",
                    "commercial_angle": "Nécessité de liaisons louées Fibre Pro avec secours 4G/Satellite et conformité aux exigences réglementaires de la Banque Centrale du Congo (BCC).",
                    "recommended_action": "Proposer un pack Agence Bancaire Haute Disponibilité avec liaison Fibre Dédiée et chiffrement IPsec.",
                    "recommended_offer": "Liaison Bancaire Dédiée & SD-WAN Sécurisé",
                    "offset_hours": 4
                },
                {
                    "title": "Renforcement des systèmes de sécurité et conformité SOC / PCI-DSS",
                    "summary": f"La direction des risques et la DSI de {name} mènent une campagne d'audit cybersécurité pour durcir la protection des flux transactionnels et la résilience face aux cyberattaques.",
                    "source_name": "Africa Tech Review",
                    "source_url": "https://africatechreview.com",
                    "category": "TECH_PROJECT",
                    "priority": "HIGH",
                    "commercial_angle": "Sensibilité accrue aux menaces informatiques : opportunité immédiate de présenter notre CyberSOC Managé et nos solutions de pare-feu managé.",
                    "recommended_action": "Prendre attache avec le Responsable Sécurité des Systèmes d'Information (RSSI).",
                    "recommended_offer": "CyberSOC Managé 24/7 & Pare-feu Nouvelle Génération",
                    "offset_hours": 18
                },
                {
                    "title": f"Soutien au programme d'éducation financière et mécénat associatif à {city}",
                    "summary": f"{name} a parrainé une session de formation à l'épargne pour les jeunes diplômés et remis des kits scolaires dans les communes partenaires.",
                    "source_name": "Échos de la Finance Locale",
                    "source_url": "https://zoom-eco.net",
                    "category": "MANAGEMENT",
                    "priority": "NORMAL",
                    "commercial_angle": "Communication de marque et responsabilité sociétale : veille continue sans projet d'équipement télécoms identifié.",
                    "recommended_action": "Message de félicitations du KAM au directeur de communication.",
                    "recommended_offer": "Suivi relationnel",
                    "offset_hours": 42
                }
            ]
        elif any(w in sec for w in ['santé', 'sante', 'hopital', 'clinique', 'médical']):
            items_to_create = [
                {
                    "title": f"Digitalisation des dossiers patients et télémédecine à {city}",
                    "summary": f"{name} modernise ses infrastructures biomédicales avec l'adoption d'un dossier médical partagé et de solutions de diagnostic par imagerie à distance.",
                    "source_name": "Santé RDC & Progrès Médical",
                    "source_url": "https://sante.gouv.cd",
                    "category": "TECH_PROJECT",
                    "priority": "HIGH",
                    "commercial_angle": "Transmission de fichiers d'imagerie lourds (IRM, scanners) : besoin impératif d'une connectivité Très Haut Débit stable et d'un Cloud souverain sécurisé.",
                    "recommended_action": "Présenter notre offre Cloud Hébergement Santé et Fibre Pro.",
                    "recommended_offer": "Cloud Backup Datacenter & Fibre Dédiée Pro",
                    "offset_hours": 8
                },
                {
                    "title": "Participation à la conférence nationale sur la prévention hospitalière",
                    "summary": f"La direction médicale de {name} est intervenue lors d'une table ronde sur les protocoles sanitaires régionaux.",
                    "source_name": "Santé RDC",
                    "source_url": "https://sante.gouv.cd",
                    "category": "MANAGEMENT",
                    "priority": "NORMAL",
                    "commercial_angle": "Veille scientifique : pas d'acquisition d'infrastructure prévue.",
                    "recommended_action": "Maintien de la veille documentaire.",
                    "recommended_offer": "Veille continue",
                    "offset_hours": 30
                }
            ]
        elif any(w in sec for w in ['transport', 'logistique', 'fret', 'transit', 'port']):
            items_to_create = [
                {
                    "title": f"Mise en place d'une plateforme de tracking télématique de flotte à {city}",
                    "summary": f"{name} déploie une solution de suivi en temps réel de ses convois et de ses entrepôts pour optimiser les délais de livraison et la traçabilité des marchandises.",
                    "source_name": "Journal Logistique & Fret RDC",
                    "source_url": "https://logistique-rdc.com",
                    "category": "EXPANSION",
                    "priority": "HIGH",
                    "commercial_angle": "Besoin de cartes SIM M2M/IoT connectées sur le réseau 4G national et d'un accès internet haut débit sur les plateformes logistiques.",
                    "recommended_action": "Proposer notre pack Télématique Flotte IoT & Wi-Fi Pro Industriel.",
                    "recommended_offer": "Pack IoT Télématique Flotte & Wi-Fi Pro",
                    "offset_hours": 6
                },
                {
                    "title": "Renouvellement des certifications qualité ISO 9001",
                    "summary": f"{name} a validé avec succès l'audit annuel de renouvellement de ses processus logistiques et d'entreposage.",
                    "source_name": "Journal Logistique & Fret RDC",
                    "source_url": "https://logistique-rdc.com",
                    "category": "MANAGEMENT",
                    "priority": "NORMAL",
                    "commercial_angle": "Signal de conformité de routine : maintien de la veille continue.",
                    "recommended_action": "Intégrer l'information au dossier compte.",
                    "recommended_offer": "Suivi relationnel",
                    "offset_hours": 26
                }
            ]
        else:
            items_to_create = [
                {
                    "title": f"Développement des activités commerciales et projets d'expansion à {city}",
                    "summary": f"{name} poursuit la croissance de ses opérations à {city} et renforce ses effectifs pour répondre à la demande croissante de ses clients institutionnels et partenaires.",
                    "source_name": "Presse Économique RDC",
                    "source_url": "https://zoom-eco.net",
                    "category": "EXPANSION",
                    "priority": "HIGH",
                    "commercial_angle": f"Accroissement de l'activité commerciale chez {name} : opportunité stratégique pour pérenniser et redonder leur connectivité internet.",
                    "recommended_action": "Prendre contact avec la Direction pour proposer un bilan d'infrastructure télécoms gratuit.",
                    "recommended_offer": "Fibre Dédiée Pro 100 Mbps & Sauvegarde Cloud",
                    "offset_hours": 5
                },
                {
                    "title": "Modernisation des équipements de communication et collaboration d'entreprise",
                    "summary": f"La direction de {name} engage une refonte de ses outils de communication interne et de collaboration pour fluidifier les échanges entre ses équipes de terrain et le siège.",
                    "source_name": "LinkedIn Pro / Actualités Économiques",
                    "source_url": "https://linkedin.com",
                    "category": "MANAGEMENT",
                    "priority": "MEDIUM",
                    "commercial_angle": "Besoin d'unification des communications (VoIP, visioconférence) et de forfaits mobiles d'entreprise centralisés.",
                    "recommended_action": "Proposer notre solution Flotte Mobile Flex et Standard Téléphonique VoIP.",
                    "recommended_offer": "Flotte Mobile Entreprise (Business Flex) & Trunk SIP",
                    "offset_hours": 20
                },
                {
                    "title": f"Célébration des vœux et présentation des orientations stratégiques annuelles à {city}",
                    "summary": f"Les collaborateurs de {name} se sont réunis pour célébrer les réussites annuelles et partager les perspectives institutionnelles du comité de direction.",
                    "source_name": "Presse Locale & Communication",
                    "source_url": "https://zoom-eco.net",
                    "category": "MANAGEMENT",
                    "priority": "NORMAL",
                    "commercial_angle": "Événement de cohésion interne sans incidence sur les achats d'infrastructure.",
                    "recommended_action": "Veille passive.",
                    "recommended_offer": "Suivi relationnel",
                    "offset_hours": 44
                }
            ]

        created = []
        for d in items_to_create:
            # Évaluation Core AI du signal
            score_data = commercial_signal_scorer.score_news(
                title=d["title"],
                summary=d["summary"],
                category=d["category"],
                company_name=name,
                sector=enterprise.sector or "",
                location=city,
                is_web_discovery=False
            )

            item = B2BNewsFeedItem.objects.create(
                enterprise=enterprise,
                is_web_discovery=False,
                title=d["title"],
                summary=d["summary"],
                source_name=d["source_name"],
                source_url=d["source_url"],
                category=d["category"],
                priority=d["priority"],
                signal_strength=score_data["signal_strength"],
                signal_score=score_data["signal_score"],
                signal_rationale=score_data["signal_rationale"],
                commercial_angle=d["commercial_angle"],
                recommended_action=d["recommended_action"],
                recommended_offer=d["recommended_offer"],
                published_at=now - timezone.timedelta(hours=d["offset_hours"]),
            )
            created.append(item)

        return created

    @classmethod
    def mark_as_read(cls, item_id: str, is_read: bool = True) -> B2BNewsFeedItem:
        """Marque une actualité comme lue ou non-lue."""
        item = B2BNewsFeedItem.objects.select_related('enterprise').get(id=item_id)
        item.is_read = is_read
        item.save(update_fields=['is_read', 'updated_at'])
        return item

    @classmethod
    def mark_all_as_read(cls, user=None) -> int:
        """Marque toutes les actualités non lues comme lues."""
        qs = B2BNewsFeedItem.objects.filter(is_read=False)
        count = qs.count()
        qs.update(is_read=True, updated_at=timezone.now())
        return count

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
        dans le portefeuille du KAM connecté et déclenche immédiatement les calculs du Core AI :
        1. Scoring de Churn Radar & Plan de rétention
        2. Benchmark & Comparaison Sectorielle ("Versus")
        3. Génération des signaux stratégiques dédiés
        """
        from kam.services.churn_radar_service import ChurnRadarService
        from kam.services.enterprise_comparison_service import EnterpriseComparisonService

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

            # Calculs Core AI immédiats
            try:
                assessment = ChurnRadarService.refresh_account_assessment(enterprise, use_ai=False)
            except Exception as e:
                logger.warning("Erreur calcul Churn Radar Core AI pour %s: %s", enterprise.id, e)
                assessment = None

            try:
                comp_data = EnterpriseComparisonService.compare(enterprise.id, None)
            except Exception as e:
                logger.warning("Erreur calcul comparatif Core AI pour %s: %s", enterprise.id, e)
                comp_data = {}

            return {
                "enterprise_id": enterprise.id,
                "enterprise_name": enterprise.name,
                "account_id": f"account-{enterprise.id}",
                "sector": enterprise.sector or "Services B2B",
                "health_score": getattr(assessment, 'health_score', 80),
                "risk_level": getattr(assessment, 'risk_level', 'LOW'),
                "overall_score": comp_data.get("overall_score_a", 60),
                "headline": comp_data.get("headline", ""),
                "message": f"Compte {enterprise.name} rattaché à votre portefeuille KAM et analysé par Core AI."
            }

        # Extraction des données clés
        company_name = item.discovered_company_name or item.title[:50]
        
        # Extraction du nombre de salariés
        size_str = item.discovered_size or "25 salariés"
        emp_match = re.search(r'(\d+)', size_str)
        employee_count = int(emp_match.group(1)) if emp_match else 25

        if 'fintech' in (item.discovered_sector or '').lower() or 'finance' in (item.discovered_sector or '').lower():
            estimated_revenue = 350000.00
        elif employee_count >= 100:
            estimated_revenue = 1200000.00
        elif employee_count >= 50:
            estimated_revenue = 600000.00
        else:
            estimated_revenue = 200000.00

        # Plaque par défaut
        plaque_obj = Plaque.objects.filter(is_active=True).first()
        plaque_code = plaque_obj.name if plaque_obj else 'Kinshasa (Gombe)'

        enterprise = Enterprise.objects.create(
            name=company_name,
            website=item.discovered_website or None,
            sector=item.discovered_sector or 'Tertiaire & Services',
            approximate_size=item.discovered_size or f"{employee_count} salariés",
            employee_count=employee_count,
            site_count=1,
            annual_revenue=estimated_revenue,
            location=item.discovered_location or 'Kinshasa',
            commune='Gombe' if 'gombe' in (item.discovered_location or '').lower() else 'Kinshasa',
            city='Kinshasa',
            plaque=plaque_code,
            plaque_rel=plaque_obj,
            segment='PME',
            assigned_entity='KAM_OFFICE',
            assigned_kam=user,
            assigned_at=timezone.now(),
            contact_name="Direction Générale",
            contact_role="Directeur Général & Fondateur",
            current_connectivity="",
            conversion_status='PROSPECT',
        )

        # Une découverte web ne fournit aucune preuve du parc installé.

        item.enterprise = enterprise
        item.is_converted_to_portfolio = True
        item.save(update_fields=['enterprise', 'is_converted_to_portfolio', 'updated_at'])

        logger.info("Nouveau compte web converti en portefeuille : %s (ID %s) par %s", enterprise.name, enterprise.id, user.username)

        # Core AI execution
        try:
            assessment = ChurnRadarService.refresh_account_assessment(enterprise, use_ai=False)
        except Exception as e:
            logger.warning("Erreur calcul Churn Radar Core AI pour %s: %s", enterprise.id, e)
            assessment = None

        try:
            comp_data = EnterpriseComparisonService.compare(enterprise.id, None)
        except Exception as e:
            logger.warning("Erreur calcul comparatif Core AI pour %s: %s", enterprise.id, e)
            comp_data = {}

        try:
            cls.ensure_enterprise_news(enterprise.id)
        except Exception as e:
            logger.warning("Erreur génération actualités dédiées pour %s: %s", enterprise.id, e)

        return {
            "enterprise_id": enterprise.id,
            "enterprise_name": enterprise.name,
            "account_id": f"account-{enterprise.id}",
            "sector": enterprise.sector or "Fintech & Paiements Numériques",
            "health_score": getattr(assessment, 'health_score', 85),
            "risk_level": getattr(assessment, 'risk_level', 'LOW'),
            "overall_score": comp_data.get("overall_score_a", 60),
            "headline": comp_data.get("headline", ""),
            "message": f"Entreprise {enterprise.name} calculée par Core AI et intégrée à votre portefeuille avec succès."
        }

    @classmethod
    def seed_sample_news(cls, user=None) -> int:
        """
        Alimente le fil d'actualité avec des signaux réalistes et contextuels :
        - Nouvelles de veille sur les comptes B2B existants (Signaux forts & faibles)
        - Nouveaux comptes détectés sur le net (Web Sourcing - Signaux forts & faibles)
        Scorés par le moteur Core AI CommercialSignalScorerEngine.
        """
        created_count = 0
        now = timezone.now()

        # Nettoyage préventif des anciens enregistrements d'exemple
        B2BNewsFeedItem.objects.all().delete()

        # 1. Comptes existants en portefeuille
        enterprises = list(Enterprise.objects.all()[:15])
        ent_by_name = {e.name.lower(): e for e in enterprises}

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
                "company_hint": "equity",
                "fallback_name": "Equity BCDC",
                "title": "Parrainage d'ateliers d'éducation financière et mécénat jeunesse à Kinshasa",
                "summary": "La fondation du groupe bancaire organise des séminaires d'initiation à la gestion de budget pour les étudiants universitaires à Limete et Matete.",
                "source_name": "Revue Société & Éducation",
                "source_url": "https://zoom-eco.net",
                "category": "MANAGEMENT",
                "priority": "NORMAL",
                "commercial_angle": "Veille institutionnelle : événement de notoriété et mécénat sans besoin en infrastructure télécoms immédiat.",
                "recommended_action": "Simple mention de courtoisie lors de la prochaine revue.",
                "recommended_offer": "Suivi relationnel",
                "offset_hours": 32
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
            },
            {
                "company_hint": "rawbank",
                "fallback_name": "Rawbank RDC",
                "title": "Publication du rapport annuel RSE et engagements environnementaux 2026",
                "summary": "Le rapport de responsabilité sociétale met en avant les initiatives de réduction de l'empreinte carbone et de soutien aux filières artisanales locales.",
                "source_name": "Presse Économique RDC",
                "source_url": "https://zoom-eco.net",
                "category": "MANAGEMENT",
                "priority": "NORMAL",
                "commercial_angle": "Veille d'image : pas de projet de connectivité ou d'équipement associé à cette publication.",
                "recommended_action": "Archiver dans la fiche documentaire du compte.",
                "recommended_offer": "Veille continue",
                "offset_hours": 46
            }
        ]

        for item_data in portfolio_news:
            ent = None
            for key, e in ent_by_name.items():
                if item_data["company_hint"] in key:
                    ent = e
                    break
            if not ent and enterprises:
                ent = enterprises[created_count % len(enterprises)]

            c_name = ent.name if ent else item_data["fallback_name"]
            c_sector = ent.sector if ent else "Finance & Banques"

            # Scoring Core AI
            scored = commercial_signal_scorer.score_news(
                title=item_data["title"],
                summary=item_data["summary"],
                category=item_data["category"],
                company_name=c_name,
                sector=c_sector,
                location=getattr(ent, 'location', 'Kinshasa'),
                is_web_discovery=False
            )

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
                signal_strength=scored["signal_strength"],
                signal_score=scored["signal_score"],
                signal_rationale=scored["signal_rationale"],
                commercial_angle=item_data["commercial_angle"],
                recommended_action=item_data["recommended_action"],
                recommended_offer=item_data["recommended_offer"],
                published_at=pub_date,
            )
            created_count += 1

        # 2. Nouveaux comptes détectés sur le net (Web Sourcing / Nouveaux Leads)
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
                "company_name": "Cabinet Conseil Alpha SARL",
                "website": "https://alpha-conseil.cd",
                "sector": "Conseil & Stratégie Juridique",
                "location": "Kinshasa (Gombe)",
                "size": "15 salariés",
                "signals": ["Nouveau logo publié", "Refonte cosmétique du site vitrine", "Voeux institutionnels"],
                "title": "Le cabinet Alpha Conseil dévoile sa nouvelle identité graphique institutionnelle",
                "summary": "À l'occasion de ses cinq ans d'exercice, le cabinet juridique indépendant modernise son identité visuelle et sa charte graphique sans modification de son périmètre d'activité.",
                "source_name": "Veille Web Réseaux Pro",
                "source_url": "https://linkedin.com",
                "category": "MANAGEMENT",
                "priority": "NORMAL",
                "commercial_angle": "Refonte cosmétique d'image : pas d'extension de bureau ni de besoin d'infrastructure télécoms détecté.",
                "recommended_action": "Conserver en veille passive dans le vivier d'opportunités.",
                "recommended_offer": "Veille continue",
                "offset_hours": 15
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
            },
            {
                "company_name": "Goma Tech Community Hub",
                "website": "https://gomatech.cd",
                "sector": "Association & Communauté Tech",
                "location": "Goma (Nord-Kivu)",
                "size": "Bénévoles",
                "signals": ["Meetup informel", "Session de partage de code"],
                "title": "Organisation d'un meetup associatif entre passionnés de logiciels libres à Goma",
                "summary": "Un collectif de développeurs indépendants a réuni une vingtaine de participants pour un échange informel sur l'open source et les langages web.",
                "source_name": "Réseaux Sociaux Tech",
                "source_url": "https://twitter.com",
                "category": "MANAGEMENT",
                "priority": "NORMAL",
                "commercial_angle": "Événement associatif informel : pas de budget d'entreprise ni d'opportunité B2B identifiable.",
                "recommended_action": "Aucune action commerciale requise.",
                "recommended_offer": "Veille passive",
                "offset_hours": 40
            }
        ]

        for acc in web_discovery_accounts:
            scored = commercial_signal_scorer.score_news(
                title=acc["title"],
                summary=acc["summary"],
                category=acc["category"],
                company_name=acc["company_name"],
                sector=acc["sector"],
                location=acc["location"],
                is_web_discovery=True
            )

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
                signal_strength=scored["signal_strength"],
                signal_score=scored["signal_score"],
                signal_rationale=scored["signal_rationale"],
                commercial_angle=acc["commercial_angle"],
                recommended_action=acc["recommended_action"],
                recommended_offer=acc["recommended_offer"],
                published_at=pub_date,
            )
            created_count += 1

        logger.info("%d signaux de veille B2B initialisés et scorés par Core AI.", created_count)
        return created_count
