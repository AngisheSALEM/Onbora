"""
Sector Rules Compiler (Core AI)
================================
Domaine : AI Core & Catalogue Orange Business / MSP
Rôle : Analyse le catalogue actif des solutions (backend/resources/catalog_ai/catalog.json)
et compile les piliers d'infrastructure télécoms sectoriels, les règles de scoring,
les paniers d'offres indispensables et les ratios de dimensionnement.

Les règles et piliers compilés sont sauvegardés dans `backend/resources/catalog_ai/sector_scoring_rules.json`
pour être consommés de manière déterministe et ultra-rapide (<1ms) par le moteur Python de comparaison et l'UI.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from django.conf import settings

from ..catalog import load_catalog, CatalogDefinition, ServiceDefinition

logger = logging.getLogger(__name__)

DEFAULT_CATALOG_PATH = Path(settings.BASE_DIR) / "resources" / "catalog_ai" / "versions" / "v1" / "catalog.json"
RULES_OUTPUT_PATH = Path(settings.BASE_DIR) / "resources" / "catalog_ai" / "sector_scoring_rules.json"

# Normalisation des taxonomies de secteurs vers les clés canoniques du catalogue
SECTOR_TAXONOMY_MAP: Dict[str, str] = {
    # Finance / Fintech
    "banque & services financiers": "finance",
    "banque": "finance",
    "finance": "finance",
    "fintech": "fintech",
    "fintech & proximité": "fintech",
    "microfinance": "finance",
    "assurance": "finance",

    # Mines & Industrie lourde
    "mines & énergie": "energy",
    "mines": "energy",
    "énergie & pétrole": "energy",
    "énergie & eau": "energy",
    "industrie & agroalimentaire": "industry",
    "industrie & btp": "industry",
    "industrie & brasserie": "industry",
    "industrie": "industry",
    "btp & génie civil": "industry",

    # Commerce, Retail & Distribution
    "distribution & retail": "retail",
    "commerce de gros": "commerce",
    "commerce de détail": "retail",
    "commerce & bureautique": "commerce",
    "commerce alimentaire": "retail",
    "commerce électronique & mobile": "retail",
    "boissons & distribution": "commerce",

    # Télécoms, IT & Technologie
    "télécoms & it b2b": "technology",
    "technologie": "technology",
    "technologies & it": "technology",
    "télécommunications": "telecommunications",
    "bureautique & connectivité": "technology",
    "ingénierie & consulting": "technology",

    # Transport & Logistique
    "transport & logistique": "logistics",
    "transport & aviation": "transport",
    "logistique & fret": "logistics",
    "transport": "transport",

    # Santé & Éducation
    "santé & hôpitaux": "healthcare",
    "santé & diagnostics": "healthcare",
    "santé de proximité": "healthcare",
    "pharmacie & santé": "healthcare",
    "santé": "healthcare",
    "éducation supérieure": "education",
    "éducation & enseignement": "education",
    "éducation": "education",

    # Services généraux
    "hôtellerie & tourisme": "services",
    "tourisme & billetterie": "services",
    "sécurité privée": "services",
    "audit & fiscalité": "services",
    "services juridiques & conseils": "services",
    "services véhicules": "services",
    "services personnels": "services",
    "médias & graphisme": "services",
    "médias & télévision": "services",
    "services": "services",
}


class SectorRulesCompiler:
    """
    Compilateur de règles et piliers de scoring sectoriels piloté par le Core AI.
    Analyse le catalogue de solutions et génère les piliers d'infrastructure spécifiques à chaque secteur.
    """

    @classmethod
    def compile(
        cls,
        catalog_path: Optional[Path] = None,
        output_path: Optional[Path] = None,
    ) -> Dict[str, Any]:
        """
        Compile les règles et piliers sectoriels à partir du catalogue actif.
        """
        source_path = catalog_path or DEFAULT_CATALOG_PATH
        target_path = output_path or RULES_OUTPUT_PATH

        if not source_path.exists():
            raise FileNotFoundError(f"Catalogue introuvable : {source_path}")

        catalog = load_catalog(source_path)
        logger.info("[SectorRulesCompiler] Chargement du catalogue version: %s (%d services)", catalog.catalog_version, len(catalog.services))

        compiled_sectors: Dict[str, Any] = {}

        # 1. Analyser les secteurs canoniques
        canonical_sectors = [
            "finance",
            "fintech",
            "energy",
            "industry",
            "retail",
            "commerce",
            "technology",
            "telecommunications",
            "logistics",
            "transport",
            "healthcare",
            "education",
            "services",
        ]

        for canonical in canonical_sectors:
            rules = cls._build_sector_policy(canonical, catalog)
            compiled_sectors[canonical] = rules

        # 2. Règle par défaut (fallback universel équilibré)
        compiled_sectors["default"] = cls._build_default_policy(catalog)

        compiled_payload: Dict[str, Any] = {
            "meta": {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "catalog_version": catalog.catalog_version,
                "compiler_version": "3.0-core-ai-dynamic-pillars",
                "total_catalog_services": len(catalog.services),
                "author": "Onbora AI Core Policy & Pillar Engine",
            },
            "taxonomy_mapping": SECTOR_TAXONOMY_MAP,
            "sectors": compiled_sectors,
        }

        # Sauvegarde sur disque
        target_path.parent.mkdir(parents=True, exist_ok=True)
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(compiled_payload, f, indent=2, ensure_ascii=False)

        logger.info("[SectorRulesCompiler] Règles compilées enregistrées avec succès dans %s", target_path)
        return compiled_payload

    @classmethod
    def _find_service_by_keywords(
        cls, catalog: CatalogDefinition, keywords: List[str]
    ) -> Optional[ServiceDefinition]:
        """
        Trouve le premier service correspondant à une liste de mots-clés prioritaires.
        """
        for kw in keywords:
            kw_l = kw.lower()
            for s in catalog.services:
                if s.portfolio_scope != "rdc":
                    continue
                name_l = s.name.lower()
                id_l = s.service_id.lower()
                desc_l = s.description.lower()
                if kw_l in id_l or kw_l in name_l or kw_l in desc_l:
                    return s
        return None

    @classmethod
    def _find_all_services_by_keywords(
        cls, catalog: CatalogDefinition, keywords: List[str]
    ) -> List[Dict[str, str]]:
        """
        Retourne la liste des identifiants et libellés des services correspondant à des mots-clés.
        """
        found = []
        seen = set()
        for kw in keywords:
            kw_l = kw.lower()
            for s in catalog.services:
                if s.portfolio_scope != "rdc":
                    continue
                name_l = s.name.lower()
                id_l = s.service_id.lower()
                if (kw_l in id_l or kw_l in name_l) and s.service_id not in seen:
                    seen.add(s.service_id)
                    found.append({"id": s.service_id, "name": s.name, "category": s.category})
        return found

    @classmethod
    def _build_sector_policy(
        cls, sector_key: str, catalog: CatalogDefinition
    ) -> Dict[str, Any]:
        """
        Construit dynamiquement les piliers d'infrastructure télécoms et la politique de scoring
        pour un secteur donné à partir des offres du catalogue.
        """
        # Récupération des services phares du catalogue Orange RDC
        lsi_srv = cls._find_service_by_keywords(catalog, ["liaison_specialisee_internet", "lsi", "fibre dédiée"])
        fiber_srv = cls._find_service_by_keywords(catalog, ["internet_fibre_illimite", "fibre"]) or lsi_srv
        backup_srv = cls._find_service_by_keywords(catalog, ["airbox_4g", "secours", "backup", "dual"])
        soc_srv = cls._find_service_by_keywords(catalog, ["micro_soc", "soc"])
        firewall_srv = cls._find_service_by_keywords(catalog, ["ocd_managed_services", "sécurité", "cyber_diagnostic"]) or soc_srv
        sdwan_srv = cls._find_service_by_keywords(catalog, ["business_sd_wan", "sd-wan", "liaison_specialisee_vpn"])
        dc_srv = cls._find_service_by_keywords(catalog, ["hebergement_datacenter", "datacenter", "hébergement"])
        cloud_srv = cls._find_service_by_keywords(catalog, ["microsoft_365_entreprise", "microsoft_365", "cloud"]) or dc_srv
        m2m_srv = cls._find_service_by_keywords(catalog, ["essentiel_m2m", "m2m", "iot"])
        flotte_srv = cls._find_service_by_keywords(catalog, ["business_gfu", "business_flex", "flotte"])
        om_srv = cls._find_service_by_keywords(catalog, ["api_orange_money", "bulk_payment_orange_money"])

        pillars: List[Dict[str, Any]] = []

        # =====================================================================
        # 1. SECTEUR BANQUE, FINANCE & FINTECH
        # =====================================================================
        if sector_key in ["finance", "fintech"]:
            min_mbps_workstation = 0.30
            min_mbps_penalty = 20

            pillars = [
                {
                    "id": "connectivity",
                    "label": "Liaison Spécialisée Dédiée & Débit Garanti (LSI)",
                    "weight": 0.25,
                    "description": "Liaison dédiée symétrique et débit 100% garanti avec GTR 4h contractuelle obligatoire pour les transactions financières.",
                    "category": "Internet fixe et réseaux",
                    "catalog_services": [
                        {"id": lsi_srv.service_id if lsi_srv else "liaison_specialisee_internet", "name": lsi_srv.name if lsi_srv else "Liaison Spécialisée Internet"},
                        {"id": fiber_srv.service_id if fiber_srv else "internet_fibre_illimite", "name": fiber_srv.name if fiber_srv else "Internet illimité Fibre"}
                    ],
                    "match_keywords": ["fibre", "dédiée", "lsi", "symétrique", "procezo"],
                    "penalty": 25,
                    "criticality": "CRITICAL",
                    "recommended_offer": lsi_srv.name if lsi_srv else "Liaison Spécialisée Internet Dédiée",
                    "recommended_offer_id": lsi_srv.service_id if lsi_srv else "liaison_specialisee_internet",
                    "pitch": "Débit symétrique 100% garanti avec engagement contractuel de rétablissement sous 4h (GTR), indispensable pour les transactions interbancaires.",
                },
                {
                    "id": "security",
                    "label": "Cybersécurité Périmétrique & Micro-SOC",
                    "weight": 0.25,
                    "description": "Protection pare-feu managée Next-Gen, surveillance Micro-SOC 24/7 et conformité aux standards réglementaires bancaires.",
                    "category": "Cybersécurité",
                    "catalog_services": [
                        {"id": soc_srv.service_id if soc_srv else "micro_soc", "name": soc_srv.name if soc_srv else "Micro-SOC"},
                        {"id": firewall_srv.service_id if firewall_srv else "ocd_managed_services", "name": firewall_srv.name if firewall_srv else "Services managés Orange Cyberdefense"}
                    ],
                    "match_keywords": ["firewall", "sécurité", "soc", "fortinet", "utm", "cyber"],
                    "penalty": 25,
                    "criticality": "CRITICAL",
                    "recommended_offer": soc_srv.name if soc_srv else "Micro-SOC Orange Cyberdefense",
                    "recommended_offer_id": soc_srv.service_id if soc_srv else "micro_soc",
                    "pitch": "Surveillance Micro-SOC 24/7 et pare-feu Next-Gen managé pour garantir la conformité réglementaire bancaire et prévenir les fraudes.",
                },
                {
                    "id": "sla",
                    "label": "Haute Disponibilité & Lien de Secours Automatique (Dual Homing)",
                    "weight": 0.20,
                    "description": "Double adduction réseau automatique (Fibre + Secours 4G/Satellite) pour supprimer tout risque d'interruption SPOF des opérations de guichet.",
                    "category": "Internet fixe et réseaux",
                    "catalog_services": [
                        {"id": backup_srv.service_id if backup_srv else "airbox_4g", "name": backup_srv.name if backup_srv else "Liaison de Secours Managée"}
                    ],
                    "match_keywords": ["secours", "backup", "dual", "redondance", "4g pro", "double adduction"],
                    "penalty": 20,
                    "criticality": "CRITICAL",
                    "recommended_offer": backup_srv.name if backup_srv else "Liaison de Secours Managée Dual Homing",
                    "recommended_offer_id": backup_srv.service_id if backup_srv else "backup_link",
                    "pitch": "Bascule instantanée sur lien de secours sans interruption de service en cas de section de fibre, évitant l'arrêt des opérations de caisse.",
                },
                {
                    "id": "equipment",
                    "label": "Interconnexion Agences & SD-WAN Sécurisé",
                    "weight": 0.15,
                    "description": "Réseau privé maillé inter-agences avec pilotage intelligent et priorisation des flux critiques de core banking.",
                    "category": "Internet fixe et réseaux",
                    "catalog_services": [
                        {"id": sdwan_srv.service_id if sdwan_srv else "business_sd_wan", "name": sdwan_srv.name if sdwan_srv else "Business SD-WAN"}
                    ],
                    "match_keywords": ["sd-wan", "interconnexion", "mpls", "vpn ipsec", "vpn"],
                    "penalty": 15,
                    "criticality": "HIGH",
                    "recommended_offer": sdwan_srv.name if sdwan_srv else "Business SD-WAN Managé",
                    "recommended_offer_id": sdwan_srv.service_id if sdwan_srv else "business_sd_wan",
                    "pitch": "Interconnexion chiffrée de l'ensemble de vos agences avec priorisation dynamique des requêtes bancaires et supervision temps réel.",
                },
                {
                    "id": "cloud",
                    "label": "Hébergement Datacenter & Cloud Souverain RDC",
                    "weight": 0.15,
                    "description": "Hébergement en datacenter certifié à Kinshasa et sauvegarde souveraine des données financières.",
                    "category": "Datacenter et infrastructure",
                    "catalog_services": [
                        {"id": dc_srv.service_id if dc_srv else "hebergement_datacenter", "name": dc_srv.name if dc_srv else "Hébergement Datacenter"},
                        {"id": cloud_srv.service_id if cloud_srv else "microsoft_365_entreprise", "name": cloud_srv.name if cloud_srv else "Microsoft 365 Entreprise"}
                    ],
                    "match_keywords": ["datacenter", "cloud", "sauvegarde", "hébergement", "backup"],
                    "penalty": 15,
                    "criticality": "HIGH",
                    "recommended_offer": dc_srv.name if dc_srv else "Hébergement Datacenter Kinshasa Tier III",
                    "recommended_offer_id": dc_srv.service_id if dc_srv else "hebergement_datacenter",
                    "pitch": "Hébergement des serveurs critiques en Datacenter certifié à Kinshasa assurant la souveraineté territoriale des données bancaires.",
                },
            ]

        # =====================================================================
        # 2. SECTEUR MINES, ÉNERGIE & INDUSTRIE
        # =====================================================================
        elif sector_key in ["energy", "industry"]:
            min_mbps_workstation = 0.20
            min_mbps_penalty = 15

            pillars = [
                {
                    "id": "connectivity",
                    "label": "Liaison Hybride Résiliente Fibre & VSAT",
                    "weight": 0.25,
                    "description": "Couverture continue des concessions minières et sites industriels isolés combinant fibre optique et satellite VSAT.",
                    "category": "Internet fixe et réseaux",
                    "catalog_services": [
                        {"id": lsi_srv.service_id if lsi_srv else "liaison_specialisee_internet", "name": lsi_srv.name if lsi_srv else "Liaison Spécialisée Internet"},
                        {"id": fiber_srv.service_id if fiber_srv else "internet_fibre_illimite", "name": fiber_srv.name if fiber_srv else "Internet illimité Fibre"}
                    ],
                    "match_keywords": ["fibre", "vsat", "satellite", "procezo", "hybride", "lsi"],
                    "penalty": 30,
                    "criticality": "CRITICAL",
                    "recommended_offer": lsi_srv.name if lsi_srv else "Liaison Hybride Fibre Dédiée & VSAT",
                    "recommended_offer_id": lsi_srv.service_id if lsi_srv else "hybrid_connectivity",
                    "pitch": "Transmission continue et sécurisée pour vos sites miniers et usines de raffinage, même en zone d'extraction reculée.",
                },
                {
                    "id": "equipment",
                    "label": "Interconnexion Sites Distants & SD-WAN Industriel",
                    "weight": 0.25,
                    "description": "Liaison sécurisée unifiée entre la direction générale, les sites miniers et les installations logistiques portuaires.",
                    "category": "Internet fixe et réseaux",
                    "catalog_services": [
                        {"id": sdwan_srv.service_id if sdwan_srv else "business_sd_wan", "name": sdwan_srv.name if sdwan_srv else "Business SD-WAN"}
                    ],
                    "match_keywords": ["sd-wan", "interconnexion", "mpls", "ot", "sites distants"],
                    "penalty": 20,
                    "criticality": "HIGH",
                    "recommended_offer": sdwan_srv.name if sdwan_srv else "Business SD-WAN Industriel",
                    "recommended_offer_id": sdwan_srv.service_id if sdwan_srv else "business_sd_wan",
                    "pitch": "Unification de vos liaisons distantes permettant un pilotage centralisé de vos flux ERP industriels sans rupture de chaîne.",
                },
                {
                    "id": "sla",
                    "label": "Continuité d'Exploitation & SLA Industriel 24/7",
                    "weight": 0.20,
                    "description": "Dispositif de maintien opérationnel 24/7 avec secours automatique 4G/Satellite et astreinte technique dédiée.",
                    "category": "Internet fixe et réseaux",
                    "catalog_services": [
                        {"id": backup_srv.service_id if backup_srv else "airbox_4g", "name": backup_srv.name if backup_srv else "AirBox 4G"}
                    ],
                    "match_keywords": ["secours", "sla", "gtr", "supervision", "astreinte", "4g"],
                    "penalty": 20,
                    "criticality": "HIGH",
                    "recommended_offer": backup_srv.name if backup_srv else "Lien de Secours Critique Industriel",
                    "recommended_offer_id": backup_srv.service_id if backup_srv else "backup_industrial",
                    "pitch": "Garantie de continuité de service pour maintenir la traçabilité des tonnages et des expéditions 24 heures sur 24.",
                },
                {
                    "id": "security",
                    "label": "Cybersécurité Opérationnelle (OT/IT & Pare-feu)",
                    "weight": 0.15,
                    "description": "Isolation et protection des automates industriels (SCADA) et des flux de gestion d'extraction contre les attaques ciblées.",
                    "category": "Cybersécurité",
                    "catalog_services": [
                        {"id": firewall_srv.service_id if firewall_srv else "ocd_managed_services", "name": firewall_srv.name if firewall_srv else "Services managés Orange Cyberdefense"}
                    ],
                    "match_keywords": ["firewall", "sécurité", "ot", "fortinet", "cyber", "scada"],
                    "penalty": 15,
                    "criticality": "HIGH",
                    "recommended_offer": firewall_srv.name if firewall_srv else "Pare-feu Industriel Managé",
                    "recommended_offer_id": firewall_srv.service_id if firewall_srv else "ocd_managed_services",
                    "pitch": "Ségrégation stricte entre réseau bureautique et automates industriels pour immuniser la production contre les ransomwares.",
                },
                {
                    "id": "cloud",
                    "label": "Flotte Mobile & IoT / Télémétrie M2M Chantier",
                    "weight": 0.15,
                    "description": "Cartes SIM M2M pour la télémétrie d'engins lourds, suivi du carburant et flotte mobile d'astreinte sur site.",
                    "category": "IoT et M2M",
                    "catalog_services": [
                        {"id": m2m_srv.service_id if m2m_srv else "essentiel_m2m", "name": m2m_srv.name if m2m_srv else "Essentiel M2M"},
                        {"id": flotte_srv.service_id if flotte_srv else "business_gfu", "name": flotte_srv.name if flotte_srv else "Flotte Mobile GFU"}
                    ],
                    "match_keywords": ["m2m", "iot", "flotte", "gfu", "télémétrie", "business flex"],
                    "penalty": 15,
                    "criticality": "MEDIUM",
                    "recommended_offer": m2m_srv.name if m2m_srv else "Essentiel M2M Suivi de Flotte",
                    "recommended_offer_id": m2m_srv.service_id if m2m_srv else "essentiel_m2m",
                    "pitch": "Suivi en temps réel de vos engins et consommation de carburant via le réseau M2M d'Orange RDC.",
                },
            ]

        # =====================================================================
        # 3. SECTEUR DISTRIBUTION, RETAIL, COMMERCE & LOGISTIQUE
        # =====================================================================
        elif sector_key in ["retail", "commerce", "logistics", "transport"]:
            min_mbps_workstation = 0.15
            min_mbps_penalty = 15

            pillars = [
                {
                    "id": "connectivity",
                    "label": "Fibre Pro & Connectivité Points de Vente",
                    "weight": 0.25,
                    "description": "Bande passante stable et continue pour la synchronisation des caisses, des stocks et de la plateforme e-commerce.",
                    "category": "Internet fixe et réseaux",
                    "catalog_services": [
                        {"id": fiber_srv.service_id if fiber_srv else "internet_fibre_illimite", "name": fiber_srv.name if fiber_srv else "Internet illimité Fibre"}
                    ],
                    "match_keywords": ["fibre", "procezo", "fttb", "haut débit", "box"],
                    "penalty": 25,
                    "criticality": "HIGH",
                    "recommended_offer": fiber_srv.name if fiber_srv else "Internet Illimité Fibre Pro",
                    "recommended_offer_id": fiber_srv.service_id if fiber_srv else "internet_fibre_illimite",
                    "pitch": "Bande passante fluide pour les encaissements en caisse, la gestion d'entrepôt et l'accès ERP en temps réel.",
                },
                {
                    "id": "equipment",
                    "label": "Interconnexion Magasins & SD-WAN Caisses",
                    "weight": 0.20,
                    "description": "Interconnexion temps réel de l'ensemble des boutiques, supermarchés et entrepôts régionaux vers le siège.",
                    "category": "Internet fixe et réseaux",
                    "catalog_services": [
                        {"id": sdwan_srv.service_id if sdwan_srv else "business_sd_wan", "name": sdwan_srv.name if sdwan_srv else "Business SD-WAN"}
                    ],
                    "match_keywords": ["sd-wan", "interconnexion", "points de vente", "magasins", "vpn"],
                    "penalty": 20,
                    "criticality": "HIGH",
                    "recommended_offer": sdwan_srv.name if sdwan_srv else "Business SD-WAN Retail",
                    "recommended_offer_id": sdwan_srv.service_id if sdwan_srv else "business_sd_wan",
                    "pitch": "Interconnexion temps réel de vos caisses et dépôts avec le siège, sans risque de rupture d'inventaire.",
                },
                {
                    "id": "cloud",
                    "label": "Sauvegarde Cloud ERP & Outils Collaboratifs 365",
                    "weight": 0.20,
                    "description": "Sauvegarde externalisée sécurisée des bases de données de vente et suite bureautique pour les équipes administratives.",
                    "category": "Cloud et collaboration",
                    "catalog_services": [
                        {"id": cloud_srv.service_id if cloud_srv else "microsoft_365", "name": cloud_srv.name if cloud_srv else "Microsoft 365"},
                        {"id": dc_srv.service_id if dc_srv else "hebergement_datacenter", "name": dc_srv.name if dc_srv else "Hébergement Datacenter"}
                    ],
                    "match_keywords": ["cloud", "365", "sauvegarde", "teams", "datacenter"],
                    "penalty": 20,
                    "criticality": "MEDIUM",
                    "recommended_offer": cloud_srv.name if cloud_srv else "Microsoft 365 Managé & Backup Cloud",
                    "recommended_offer_id": cloud_srv.service_id if cloud_srv else "microsoft_365",
                    "pitch": "Sauvegarde automatisée de vos données commerciales en Datacenter sécurisé et collaboration fluide entre agences.",
                },
                {
                    "id": "security",
                    "label": "Sécurisation Caisses & Filtrage Réseau",
                    "weight": 0.20,
                    "description": "Filtrage web, protection des terminaux de paiement et pare-feu d'agence contre les intrusions.",
                    "category": "Cybersécurité",
                    "catalog_services": [
                        {"id": firewall_srv.service_id if firewall_srv else "ocd_managed_services", "name": firewall_srv.name if firewall_srv else "Services managés Orange Cyberdefense"}
                    ],
                    "match_keywords": ["firewall", "antivirus", "sécurité", "filtrage", "cyber"],
                    "penalty": 20,
                    "criticality": "MEDIUM",
                    "recommended_offer": firewall_srv.name if firewall_srv else "Pack Sécurité & Filtrage Réseau Pro",
                    "recommended_offer_id": firewall_srv.service_id if firewall_srv else "ocd_managed_services",
                    "pitch": "Protection des postes de caisse et blocage des tentatives de phishing visant les transactions commerciales.",
                },
                {
                    "id": "sla",
                    "label": "Solutions de Paiement Mobile & Continuité Encaissement",
                    "weight": 0.15,
                    "description": "Intégration d'Orange Money Business aux caisses et ligne de secours 4G pour encaissement permanent.",
                    "category": "Orange Money Business",
                    "catalog_services": [
                        {"id": om_srv.service_id if om_srv else "api_orange_money", "name": om_srv.name if om_srv else "API Orange Money"},
                        {"id": backup_srv.service_id if backup_srv else "airbox_4g", "name": backup_srv.name if backup_srv else "AirBox 4G"}
                    ],
                    "match_keywords": ["orange money", "paiement", "encaissement", "secours", "4g", "api"],
                    "penalty": 15,
                    "criticality": "MEDIUM",
                    "recommended_offer": om_srv.name if om_srv else "API Orange Money & Backup 4G",
                    "recommended_offer_id": om_srv.service_id if om_srv else "api_orange_money",
                    "pitch": "Encaissement direct Orange Money à vos caisses et bascule 4G pour ne perdre aucune vente lors d'une coupure.",
                },
            ]

        # =====================================================================
        # 4. SECTEUR SANTÉ & HÔPITAUX
        # =====================================================================
        elif sector_key in ["healthcare"]:
            min_mbps_workstation = 0.25
            min_mbps_penalty = 20

            pillars = [
                {
                    "id": "connectivity",
                    "label": "Très Haut Débit Télémédecine & Imagerie Médicale",
                    "weight": 0.30,
                    "description": "Liaison dédiée très haut débit pour le transfert instantané des scans, IRM, dossiers radiologiques et téléconsultations.",
                    "category": "Internet fixe et réseaux",
                    "catalog_services": [
                        {"id": lsi_srv.service_id if lsi_srv else "liaison_specialisee_internet", "name": lsi_srv.name if lsi_srv else "Liaison Spécialisée Internet"}
                    ],
                    "match_keywords": ["fibre", "dédiée", "lsi", "imagerie", "haut débit"],
                    "penalty": 30,
                    "criticality": "CRITICAL",
                    "recommended_offer": lsi_srv.name if lsi_srv else "Fibre Dédiée Médicale Procezo",
                    "recommended_offer_id": lsi_srv.service_id if lsi_srv else "liaison_specialisee_internet",
                    "pitch": "Transfert instantané des examens d'imagerie lourde et fluidité absolue des consultations de télémédecine.",
                },
                {
                    "id": "cloud",
                    "label": "Hébergement Datacenter & Données Patients RDC",
                    "weight": 0.25,
                    "description": "Sauvegarde en datacenter souverain certifié garantissant l'intégrité et la haute disponibilité des dossiers patients.",
                    "category": "Datacenter et infrastructure",
                    "catalog_services": [
                        {"id": dc_srv.service_id if dc_srv else "hebergement_datacenter", "name": dc_srv.name if dc_srv else "Hébergement Datacenter"}
                    ],
                    "match_keywords": ["datacenter", "cloud", "sauvegarde", "dossier patient"],
                    "penalty": 25,
                    "criticality": "CRITICAL",
                    "recommended_offer": dc_srv.name if dc_srv else "Hébergement Datacenter Santé",
                    "recommended_offer_id": dc_srv.service_id if dc_srv else "hebergement_datacenter",
                    "pitch": "Sauvegarde souveraine des dossiers médicaux en datacenter local, protégés contre toute perte matérielle.",
                },
                {
                    "id": "sla",
                    "label": "Continuité Critique Télécoms & Secours Urgences (SLA 24/7)",
                    "weight": 0.25,
                    "description": "Lien de secours automatique sans coupure pour les services d'urgence, laboratoires et blocs opératoires.",
                    "category": "Internet fixe et réseaux",
                    "catalog_services": [
                        {"id": backup_srv.service_id if backup_srv else "airbox_4g", "name": backup_srv.name if backup_srv else "Liaison de Secours"}
                    ],
                    "match_keywords": ["secours", "sla", "urgences", "dual", "4g"],
                    "penalty": 25,
                    "criticality": "CRITICAL",
                    "recommended_offer": backup_srv.name if backup_srv else "Liaison de Secours Urgences Santé",
                    "recommended_offer_id": backup_srv.service_id if backup_srv else "backup_link",
                    "pitch": "Garantie de continuité absolue pour les admissions d'urgence et le monitoring des patients hospitalisés.",
                },
                {
                    "id": "security",
                    "label": "Confidentialité & Protection Cyber des Données Médicales",
                    "weight": 0.20,
                    "description": "Chiffrement des flux et protection périmétrique contre les attaques rançongicielles ciblant les établissements de santé.",
                    "category": "Cybersécurité",
                    "catalog_services": [
                        {"id": firewall_srv.service_id if firewall_srv else "ocd_managed_services", "name": firewall_srv.name if firewall_srv else "Services managés Orange Cyberdefense"}
                    ],
                    "match_keywords": ["firewall", "sécurité", "chiffrement", "cyber"],
                    "penalty": 20,
                    "criticality": "HIGH",
                    "recommended_offer": firewall_srv.name if firewall_srv else "Pare-feu Managé Santé & Chiffrement",
                    "recommended_offer_id": firewall_srv.service_id if firewall_srv else "ocd_managed_services",
                    "pitch": "Respect du secret médical et rempart contre les rançongiciels qui paralysent les systèmes hospitaliers.",
                },
            ]

        # =====================================================================
        # 5. SECTEUR TECHNOLOGIE, IT & TÉLÉCOMMUNICATIONS
        # =====================================================================
        elif sector_key in ["technology", "telecommunications"]:
            min_mbps_workstation = 0.35
            min_mbps_penalty = 20

            pillars = [
                {
                    "id": "connectivity",
                    "label": "Débit Symétrique Garanti & Cloud Peering",
                    "weight": 0.30,
                    "description": "Liaison fibre dédiée avec latence minimale pour les serveurs de production, API et pipelines CI/CD.",
                    "category": "Internet fixe et réseaux",
                    "catalog_services": [
                        {"id": lsi_srv.service_id if lsi_srv else "liaison_specialisee_internet", "name": lsi_srv.name if lsi_srv else "Liaison Spécialisée Internet"}
                    ],
                    "match_keywords": ["fibre", "lsi", "symétrique", "dédiée", "peering"],
                    "penalty": 30,
                    "criticality": "CRITICAL",
                    "recommended_offer": lsi_srv.name if lsi_srv else "Fibre Dédiée Entreprise 1 Gbps LSI",
                    "recommended_offer_id": lsi_srv.service_id if lsi_srv else "liaison_specialisee_internet",
                    "pitch": "Débit symétrique ultra-rapide et latence optimisée pour vos serveurs de production et équipes de développement.",
                },
                {
                    "id": "security",
                    "label": "Cybersécurité Avancée & Surveillance Micro-SOC",
                    "weight": 0.25,
                    "description": "Audit de vulnérabilités PenTest, protection anti-DDoS et surveillance proactive Micro-SOC.",
                    "category": "Cybersécurité",
                    "catalog_services": [
                        {"id": soc_srv.service_id if soc_srv else "micro_soc", "name": soc_srv.name if soc_srv else "Micro-SOC"}
                    ],
                    "match_keywords": ["soc", "pentest", "sécurité", "cyber", "firewall", "ddos"],
                    "penalty": 25,
                    "criticality": "HIGH",
                    "recommended_offer": soc_srv.name if soc_srv else "Micro-SOC & Audit PenTest",
                    "recommended_offer_id": soc_srv.service_id if soc_srv else "micro_soc",
                    "pitch": "Détection préventive des failles de sécurité et protection contre les cyberattaques visant vos plateformes.",
                },
                {
                    "id": "cloud",
                    "label": "Infrastructure Hybride Datacenter & Cloud",
                    "weight": 0.25,
                    "description": "Baies dédiées en Datacenter Tier III à Kinshasa et interconnectivité cloud hybride.",
                    "category": "Datacenter et infrastructure",
                    "catalog_services": [
                        {"id": dc_srv.service_id if dc_srv else "hebergement_datacenter", "name": dc_srv.name if dc_srv else "Hébergement Datacenter"}
                    ],
                    "match_keywords": ["datacenter", "cloud", "hébergement", "sauvegarde"],
                    "penalty": 20,
                    "criticality": "HIGH",
                    "recommended_offer": dc_srv.name if dc_srv else "Hébergement Datacenter Tier III",
                    "recommended_offer_id": dc_srv.service_id if dc_srv else "hebergement_datacenter",
                    "pitch": "Hébergement de vos clusters de serveurs en Datacenter certifié avec alimentation et climatisation garanties.",
                },
                {
                    "id": "equipment",
                    "label": "SD-WAN & Télétravail Sécurisé Développeurs",
                    "weight": 0.20,
                    "description": "Réseau privé étendu chiffré VPN/SD-WAN reliant bureaux, hubs tech et télétravailleurs.",
                    "category": "Internet fixe et réseaux",
                    "catalog_services": [
                        {"id": sdwan_srv.service_id if sdwan_srv else "business_sd_wan", "name": sdwan_srv.name if sdwan_srv else "Business SD-WAN"}
                    ],
                    "match_keywords": ["sd-wan", "vpn", "télétravail", "interconnexion"],
                    "penalty": 15,
                    "criticality": "MEDIUM",
                    "recommended_offer": sdwan_srv.name if sdwan_srv else "Business SD-WAN Managé Tech",
                    "recommended_offer_id": sdwan_srv.service_id if sdwan_srv else "business_sd_wan",
                    "pitch": "Accès distant chiffré et priorisation des flux pour vos ingénieurs et développeurs en mobilité.",
                },
            ]

        # =====================================================================
        # 6. SECTEUR SERVICES GÉNÉRAUX, ÉDUCATION & TERTIAIRE
        # =====================================================================
        else:
            min_mbps_workstation = 0.20
            min_mbps_penalty = 15

            pillars = [
                {
                    "id": "connectivity",
                    "label": "Accès Internet Haut Débit Professionnel",
                    "weight": 0.25,
                    "description": "Connectivité fibre stable pour soutenir la navigation bureautique, visioconférence et outils métier.",
                    "category": "Internet fixe et réseaux",
                    "catalog_services": [
                        {"id": fiber_srv.service_id if fiber_srv else "internet_fibre_illimite", "name": fiber_srv.name if fiber_srv else "Internet illimité Fibre"}
                    ],
                    "match_keywords": ["fibre", "procezo", "internet", "box"],
                    "penalty": 25,
                    "criticality": "HIGH",
                    "recommended_offer": fiber_srv.name if fiber_srv else "Internet Illimité Fibre Pro",
                    "recommended_offer_id": fiber_srv.service_id if fiber_srv else "internet_fibre_illimite",
                    "pitch": "Connexion rapide et sans coupure pour le travail quotidien de l'ensemble de vos collaborateurs.",
                },
                {
                    "id": "security",
                    "label": "Protection Postes & Pare-feu Managé",
                    "weight": 0.25,
                    "description": "Sécurisation périmétrique, filtrage anti-phishing et protection des données confidentielles des clients.",
                    "category": "Cybersécurité",
                    "catalog_services": [
                        {"id": firewall_srv.service_id if firewall_srv else "ocd_managed_services", "name": firewall_srv.name if firewall_srv else "Services managés Orange Cyberdefense"}
                    ],
                    "match_keywords": ["firewall", "sécurité", "antivirus", "cyber"],
                    "penalty": 20,
                    "criticality": "HIGH",
                    "recommended_offer": firewall_srv.name if firewall_srv else "Services managés Orange Cyberdefense",
                    "recommended_offer_id": firewall_srv.service_id if firewall_srv else "ocd_managed_services",
                    "pitch": "Protection efficace de votre réseau d'entreprise contre les logiciels malveillants et fuites de données.",
                },
                {
                    "id": "cloud",
                    "label": "Suite Bureautique Cloud & Sauvegarde Centralisée",
                    "weight": 0.25,
                    "description": "Productivité collaborative Microsoft 365 et sauvegarde cloud automatique des documents clés.",
                    "category": "Cloud et collaboration",
                    "catalog_services": [
                        {"id": cloud_srv.service_id if cloud_srv else "microsoft_365", "name": cloud_srv.name if cloud_srv else "Microsoft 365"}
                    ],
                    "match_keywords": ["cloud", "365", "sauvegarde", "teams"],
                    "penalty": 20,
                    "criticality": "MEDIUM",
                    "recommended_offer": cloud_srv.name if cloud_srv else "Microsoft 365 Entreprise Managé",
                    "recommended_offer_id": cloud_srv.service_id if cloud_srv else "microsoft_365",
                    "pitch": "Outils collaboratifs modernes pour vos équipes et sauvegarde automatisée de vos documents d'entreprise.",
                },
                {
                    "id": "sla",
                    "label": "Continuité de Service & Secours 4G",
                    "weight": 0.15,
                    "description": "Garantie de maintien d'activité lors d'incidents locaux grâce à un routeur 4G de secours.",
                    "category": "Internet mobile",
                    "catalog_services": [
                        {"id": backup_srv.service_id if backup_srv else "airbox_4g", "name": backup_srv.name if backup_srv else "AirBox 4G"}
                    ],
                    "match_keywords": ["secours", "backup", "4g", "airbox"],
                    "penalty": 15,
                    "criticality": "MEDIUM",
                    "recommended_offer": backup_srv.name if backup_srv else "AirBox 4G Secours Pro",
                    "recommended_offer_id": backup_srv.service_id if backup_srv else "airbox_4g",
                    "pitch": "Bascule automatique en 4G pour continuer à travailler même lors d'une rupture sur la ligne principale.",
                },
                {
                    "id": "equipment",
                    "label": "Flotte Mobile & Mobilité Collaborateurs",
                    "weight": 0.10,
                    "description": "Forfaits mobiles entreprise mutualisés pour les appels professionnels et données mobiles.",
                    "category": "Mobile et flotte",
                    "catalog_services": [
                        {"id": flotte_srv.service_id if flotte_srv else "business_flex", "name": flotte_srv.name if flotte_srv else "Offre Mobile Postpayé (Business Flex)"}
                    ],
                    "match_keywords": ["flotte", "gfu", "business flex", "mobile"],
                    "penalty": 10,
                    "criticality": "MEDIUM",
                    "recommended_offer": flotte_srv.name if flotte_srv else "Business Flex Flotte Mobile",
                    "recommended_offer_id": flotte_srv.service_id if flotte_srv else "business_flex",
                    "pitch": "Maîtrise de votre budget télécoms et communications gratuites intra-entreprise pour vos collaborateurs.",
                },
            ]

        # Construction du panier idéal et des poids de dimensions directement issus des piliers
        ideal_basket = [
            {
                "category": p["category"],
                "label": p["label"],
                "criticality": p["criticality"],
                "penalty": p["penalty"],
                "dimension": p["id"],
                "match_keywords": p["match_keywords"],
                "recommended_offer": p["recommended_offer"],
                "recommended_offer_id": p["recommended_offer_id"],
                "pitch": p["pitch"],
            }
            for p in pillars
        ]

        radar_weights = {p["id"]: p["weight"] for p in pillars}

        return {
            "sector_key": sector_key,
            "pillars": pillars,
            "radar_weights": radar_weights,
            "sizing_rules": {
                "min_mbps_per_workstation": min_mbps_workstation,
                "min_mbps_penalty_max": min_mbps_penalty,
                "multi_site_sdwan_threshold": 2,
                "multi_site_missing_penalty": 15,
            },
            "ideal_basket": ideal_basket,
        }

    @classmethod
    def _build_default_policy(cls, catalog: CatalogDefinition) -> Dict[str, Any]:
        """
        Politique de repli par défaut pour les secteurs non classifiés.
        """
        return cls._build_sector_policy("services", catalog)
