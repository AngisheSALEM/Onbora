"""
Sector Rules Compiler (Core AI)
================================
Domaine : AI Core & Catalogue Orange Business / MSP
Rôle : Analyse le catalogue actif des solutions (backend/resources/catalog_ai/catalog.json)
et compile les règles de scoring sectorielles (poids, paniers d'offres indispensables,
pénalités pour manques et ratios de dimensionnement par poste/machine).

Les règles compilées sont sauvegardées dans `backend/resources/catalog_ai/sector_scoring_rules.json`
pour être consommées de manière déterministe et ultra-rapide (<1ms) par le moteur Python de comparaison.
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
    "éducation supérieure": "education",
    "éducation & enseignement": "education",

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
}


class SectorRulesCompiler:
    """
    Compilateur de règles de scoring sectorielles piloté par le Core AI.
    """

    @classmethod
    def compile(
        cls,
        catalog_path: Optional[Path] = None,
        output_path: Optional[Path] = None,
    ) -> Dict[str, Any]:
        """
        Compile les règles sectorielles à partir du catalogue actif.
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
                "compiler_version": "2.0-core-ai",
                "total_catalog_services": len(catalog.services),
                "author": "Onbora AI Core Policy Engine",
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
    def _find_matching_services(
        cls, sector_key: str, catalog: CatalogDefinition
    ) -> List[ServiceDefinition]:
        """
        Retient les services du catalogue dont le secteur est explicitement listé
        ou dont la cible correspond à ce secteur.
        """
        matches = []
        for s in catalog.services:
            if s.portfolio_scope != "rdc":
                continue
            sectors = [x.lower() for x in s.match.sectors]
            if sector_key in sectors or not sectors:
                matches.append(s)
        return matches

    @classmethod
    def _find_service_by_keywords(
        cls, catalog: CatalogDefinition, keywords: List[str]
    ) -> Optional[ServiceDefinition]:
        """
        Trouve le premier service correspondant à une liste de mots-clés prioritaires.
        """
        for kw in keywords:
            for s in catalog.services:
                if s.portfolio_scope != "rdc":
                    continue
                name_l = s.name.lower()
                id_l = s.service_id.lower()
                desc_l = s.description.lower()
                if kw in name_l or kw in id_l or kw in desc_l:
                    return s
        return None

    @classmethod
    def _build_sector_policy(
        cls, sector_key: str, catalog: CatalogDefinition
    ) -> Dict[str, Any]:
        """
        Construit la politique de scoring (poids, panier idéal, pénalités, ratios)
        pour un secteur donné à partir des offres du catalogue.
        """
        # Récupération des services phares du catalogue Orange RDC
        fiber_srv = cls._find_service_by_keywords(catalog, ["fibre", "procezo", "fttb"])
        backup_srv = cls._find_service_by_keywords(catalog, ["secours", "backup", "dual", "4g"])
        firewall_srv = cls._find_service_by_keywords(catalog, ["sécurité", "firewall", "fortinet", "cyber"])
        sdwan_srv = cls._find_service_by_keywords(catalog, ["sd-wan", "interconnexion", "mpls"])
        cloud_srv = cls._find_service_by_keywords(catalog, ["cloud", "sauvegarde", "datacenter", "hébergement"])
        collab_srv = cls._find_service_by_keywords(catalog, ["365", "workspace", "teams", "voip", "sip"])

        # Paramètres par défaut de dimensionnement
        min_mbps_workstation = 0.20
        min_mbps_penalty = 15
        radar_weights = {
            "connectivity": 0.20,
            "security": 0.20,
            "cloud": 0.15,
            "sla": 0.15,
            "equipment": 0.15,
            "budget": 0.15,
        }

        ideal_basket: List[Dict[str, Any]] = []

        if sector_key in ["finance", "fintech"]:
            min_mbps_workstation = 0.30
            min_mbps_penalty = 20
            radar_weights = {
                "security": 0.25,
                "sla": 0.25,
                "connectivity": 0.20,
                "cloud": 0.15,
                "equipment": 0.10,
                "budget": 0.05,
            }
            # 1. Connectivité dédiée garantie
            ideal_basket.append({
                "category": "CONNECTIVITY",
                "label": "Fibre Dédiée Très Haut Débit",
                "criticality": "HIGH",
                "penalty": 20,
                "dimension": "connectivity",
                "match_keywords": ["fibre", "dédiée", "procezo", "symétrique"],
                "recommended_offer": fiber_srv.name if fiber_srv else "Fibre Dédiée Procezo",
                "recommended_offer_id": fiber_srv.service_id if fiber_srv else "fibre_dediee",
                "pitch": "Débit garanti symétrique avec engagement de service GTR 4h obligatoire pour les flux financiers.",
            })
            # 2. Lien de secours / Haute disponibilité
            ideal_basket.append({
                "category": "SLA",
                "label": "Lien de Secours Automatique (Dual Homing)",
                "criticality": "CRITICAL",
                "penalty": 25,
                "dimension": "sla",
                "match_keywords": ["secours", "backup", "dual", "redondance", "4g pro"],
                "recommended_offer": backup_srv.name if backup_srv else "Liaison de Secours Managée",
                "recommended_offer_id": backup_srv.service_id if backup_srv else "backup_link",
                "pitch": "Bascule instantanée sans coupure en cas de section de fibre, évitant l'arrêt des opérations bancaires.",
            })
            # 3. Sécurité périmétrique & Next-Gen Firewall
            ideal_basket.append({
                "category": "SECURITY",
                "label": "Pare-feu Managé & Filtrage Avancé",
                "criticality": "CRITICAL",
                "penalty": 25,
                "dimension": "security",
                "match_keywords": ["firewall", "sécurité", "fortinet", "utm", "périmétrique"],
                "recommended_offer": firewall_srv.name if firewall_srv else "Firewall Managé Next-Gen",
                "recommended_offer_id": firewall_srv.service_id if firewall_srv else "managed_firewall",
                "pitch": "Conformité réglementaire bancaire et protection contre les cyberattaques et fuites de données financières.",
            })
            # 4. Interconnexion des agences (SD-WAN)
            ideal_basket.append({
                "category": "EQUIPMENT",
                "label": "Interconnexion Multi-Agences SD-WAN",
                "criticality": "HIGH",
                "penalty": 15,
                "dimension": "equipment",
                "match_keywords": ["sd-wan", "interconnexion", "mpls", "vpn ipsec"],
                "recommended_offer": sdwan_srv.name if sdwan_srv else "SD-WAN Managé Multi-Sites",
                "recommended_offer_id": sdwan_srv.service_id if sdwan_srv else "sdwan_interconnect",
                "pitch": "Routage applicatif intelligent et supervision centralisée en temps réel de toutes les agences.",
            })
            # 5. Sauvegarde Cloud Souverain
            ideal_basket.append({
                "category": "CLOUD",
                "label": "Sauvegarde Externalisée Cloud Souverain RDC",
                "criticality": "HIGH",
                "penalty": 15,
                "dimension": "cloud",
                "match_keywords": ["sauvegarde", "cloud", "backup", "datacenter"],
                "recommended_offer": cloud_srv.name if cloud_srv else "Cloud Datacenter RDC",
                "recommended_offer_id": cloud_srv.service_id if cloud_srv else "cloud_backup",
                "pitch": "Réplication externalisée en datacenter local garantissant la souveraineté des données financières.",
            })

        elif sector_key in ["energy", "industry"]:
            min_mbps_workstation = 0.20
            min_mbps_penalty = 15
            radar_weights = {
                "equipment": 0.25,
                "sla": 0.25,
                "connectivity": 0.20,
                "security": 0.15,
                "cloud": 0.10,
                "budget": 0.05,
            }
            ideal_basket.append({
                "category": "CONNECTIVITY",
                "label": "Liaison Résiliente Hybride (Fibre / VSAT)",
                "criticality": "CRITICAL",
                "penalty": 30,
                "dimension": "connectivity",
                "match_keywords": ["fibre", "vsat", "satellite", "procezo", "hybride"],
                "recommended_offer": fiber_srv.name if fiber_srv else "Liaison Hybride Fibre / VSAT",
                "recommended_offer_id": fiber_srv.service_id if fiber_srv else "hybrid_connectivity",
                "pitch": "Continuité de transmission pour les sites miniers et industriels isolés même en zone blanche.",
            })
            ideal_basket.append({
                "category": "EQUIPMENT",
                "label": "Réseau Industriel & Interconnexion Sites Distants",
                "criticality": "HIGH",
                "penalty": 20,
                "dimension": "equipment",
                "match_keywords": ["sd-wan", "interconnexion", "mpls", "ot"],
                "recommended_offer": sdwan_srv.name if sdwan_srv else "SD-WAN Industriel",
                "recommended_offer_id": sdwan_srv.service_id if sdwan_srv else "sdwan_industrial",
                "pitch": "Liaison sécurisée entre le siège de direction et les sites d'extraction ou usines de production.",
            })
            ideal_basket.append({
                "category": "SECURITY",
                "label": "Cybersécurité Industrielle (OT/IT)",
                "criticality": "HIGH",
                "penalty": 20,
                "dimension": "security",
                "match_keywords": ["firewall", "sécurité", "ot", "fortinet"],
                "recommended_offer": firewall_srv.name if firewall_srv else "Pare-feu Industriel Managé",
                "recommended_offer_id": firewall_srv.service_id if firewall_srv else "firewall_industrial",
                "pitch": "Isolation et protection des automates industriels et des flux SCADA contre les ransomwares.",
            })
            ideal_basket.append({
                "category": "SLA",
                "label": "Supervision & Garantie de Temps de Rétablissement",
                "criticality": "HIGH",
                "penalty": 15,
                "dimension": "sla",
                "match_keywords": ["secours", "sla", "gtr", "supervision"],
                "recommended_offer": backup_srv.name if backup_srv else "Lien de Secours Satellite / 4G",
                "recommended_offer_id": backup_srv.service_id if backup_srv else "sla_supervision",
                "pitch": "Garantie de continuité de service pour maintenir la traçabilité des expéditions 24/7.",
            })

        elif sector_key in ["retail", "commerce", "logistics", "transport"]:
            min_mbps_workstation = 0.15
            min_mbps_penalty = 15
            radar_weights = {
                "connectivity": 0.25,
                "equipment": 0.20,
                "cloud": 0.20,
                "security": 0.15,
                "sla": 0.10,
                "budget": 0.10,
            }
            ideal_basket.append({
                "category": "CONNECTIVITY",
                "label": "Fibre Pro Haut Débit",
                "criticality": "HIGH",
                "penalty": 25,
                "dimension": "connectivity",
                "match_keywords": ["fibre", "procezo", "fttb", "haut débit"],
                "recommended_offer": fiber_srv.name if fiber_srv else "Fibre Pro",
                "recommended_offer_id": fiber_srv.service_id if fiber_srv else "fibre_pro",
                "pitch": "Bande passante fluide pour les encaissements, la gestion d'entrepôt et l'accès ERP en temps réel.",
            })
            ideal_basket.append({
                "category": "EQUIPMENT",
                "label": "SD-WAN Points de Vente & Entrepôts",
                "criticality": "HIGH",
                "penalty": 20,
                "dimension": "equipment",
                "match_keywords": ["sd-wan", "interconnexion", "points de vente"],
                "recommended_offer": sdwan_srv.name if sdwan_srv else "SD-WAN Retail",
                "recommended_offer_id": sdwan_srv.service_id if sdwan_srv else "sdwan_retail",
                "pitch": "Interconnexion temps réel des caisses et magasins avec le siège sans rupture d'inventaire.",
            })
            ideal_basket.append({
                "category": "CLOUD",
                "label": "Outils Collaboratifs & Sauvegarde ERP",
                "criticality": "MEDIUM",
                "penalty": 15,
                "dimension": "cloud",
                "match_keywords": ["cloud", "365", "sauvegarde", "teams"],
                "recommended_offer": collab_srv.name if collab_srv else "Microsoft 365 & Cloud Backup",
                "recommended_offer_id": collab_srv.service_id if collab_srv else "collab_cloud",
                "pitch": "Collaboration fluide inter-équipes et sauvegarde sécurisée des transactions commerciales.",
            })
            ideal_basket.append({
                "category": "SECURITY",
                "label": "Protection des Postes & Filtrage Caisses",
                "criticality": "MEDIUM",
                "penalty": 15,
                "dimension": "security",
                "match_keywords": ["firewall", "antivirus", "sécurité", "filtrage"],
                "recommended_offer": firewall_srv.name if firewall_srv else "Pack Sécurité Pro",
                "recommended_offer_id": firewall_srv.service_id if firewall_srv else "security_pack",
                "pitch": "Protection des postes de caisse et blocage des tentatives de phishing.",
            })

        else:
            # Secteur tertiaire / Services / Santé / Éducation
            min_mbps_workstation = 0.20
            min_mbps_penalty = 15
            ideal_basket.append({
                "category": "CONNECTIVITY",
                "label": "Accès Internet Très Haut Débit",
                "criticality": "HIGH",
                "penalty": 25,
                "dimension": "connectivity",
                "match_keywords": ["fibre", "procezo", "internet pro"],
                "recommended_offer": fiber_srv.name if fiber_srv else "Fibre Pro",
                "recommended_offer_id": fiber_srv.service_id if fiber_srv else "fibre_pro",
                "pitch": "Connexion rapide et stable pour les outils métiers et le travail collaboratif.",
            })
            ideal_basket.append({
                "category": "SECURITY",
                "label": "Protection Cyber & Antivirus Managé",
                "criticality": "HIGH",
                "penalty": 20,
                "dimension": "security",
                "match_keywords": ["firewall", "sécurité", "antivirus"],
                "recommended_offer": firewall_srv.name if firewall_srv else "Pack Cyber Sécurité",
                "recommended_offer_id": firewall_srv.service_id if firewall_srv else "cyber_security",
                "pitch": "Protection des postes de travail et confidentialité des dossiers clients.",
            })
            ideal_basket.append({
                "category": "CLOUD",
                "label": "Suite Bureautique Cloud & Sauvegarde",
                "criticality": "MEDIUM",
                "penalty": 20,
                "dimension": "cloud",
                "match_keywords": ["cloud", "365", "sauvegarde"],
                "recommended_offer": collab_srv.name if collab_srv else "Microsoft 365 Managé",
                "recommended_offer_id": collab_srv.service_id if collab_srv else "m365_cloud",
                "pitch": "Productivité bureautique, messagerie professionnelle et sauvegarde centralisée.",
            })

        return {
            "sector_key": sector_key,
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
        fiber = cls._find_service_by_keywords(catalog, ["fibre", "procezo"])
        sec = cls._find_service_by_keywords(catalog, ["sécurité", "firewall"])
        cloud = cls._find_service_by_keywords(catalog, ["cloud", "sauvegarde", "365"])
        backup = cls._find_service_by_keywords(catalog, ["secours", "4g"])

        return {
            "sector_key": "default",
            "radar_weights": {
                "connectivity": 0.20,
                "security": 0.20,
                "cloud": 0.15,
                "sla": 0.15,
                "equipment": 0.15,
                "budget": 0.15,
            },
            "sizing_rules": {
                "min_mbps_per_workstation": 0.20,
                "min_mbps_penalty_max": 15,
                "multi_site_sdwan_threshold": 2,
                "multi_site_missing_penalty": 15,
            },
            "ideal_basket": [
                {
                    "category": "CONNECTIVITY",
                    "label": "Accès Internet Professionnel",
                    "criticality": "HIGH",
                    "penalty": 25,
                    "dimension": "connectivity",
                    "match_keywords": ["fibre", "procezo", "internet"],
                    "recommended_offer": fiber.name if fiber else "Fibre Procezo",
                    "recommended_offer_id": fiber.service_id if fiber else "fibre_procezo",
                    "pitch": "Bande passante garantie pour soutenir les activités numériques du compte.",
                },
                {
                    "category": "SECURITY",
                    "label": "Sécurité Réseau & Pare-feu",
                    "criticality": "HIGH",
                    "penalty": 20,
                    "dimension": "security",
                    "match_keywords": ["firewall", "sécurité"],
                    "recommended_offer": sec.name if sec else "Firewall Managé",
                    "recommended_offer_id": sec.service_id if sec else "firewall_managed",
                    "pitch": "Protection périmétrique essentielle contre les cybermenaces.",
                },
                {
                    "category": "SLA",
                    "label": "Continuité de Service & Secours",
                    "criticality": "HIGH",
                    "penalty": 20,
                    "dimension": "sla",
                    "match_keywords": ["secours", "backup", "4g"],
                    "recommended_offer": backup.name if backup else "Liaison de Secours 4G",
                    "recommended_offer_id": backup.service_id if backup else "backup_4g",
                    "pitch": "Garantie de maintien d'activité lors d'incidents sur l'accès principal.",
                },
                {
                    "category": "CLOUD",
                    "label": "Sauvegarde & Outils Collaboratifs",
                    "criticality": "MEDIUM",
                    "penalty": 15,
                    "dimension": "cloud",
                    "match_keywords": ["cloud", "sauvegarde", "365"],
                    "recommended_offer": cloud.name if cloud else "Sauvegarde Cloud RDC",
                    "recommended_offer_id": cloud.service_id if cloud else "cloud_backup",
                    "pitch": "Préservation des données sensibles en datacenter sécurisé.",
                },
            ],
        }
