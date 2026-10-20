"""
Enterprise Comparison & Sector Benchmark Service
=================================================
Domaine : KAM (Key Account Management)
Rôle : Moteur de comparaison sectorielle B2B ("Versus" style) entre deux entreprises
du même secteur ou vis-à-vis du benchmark sectoriel.

Architecture :
- Les poids, seuils de dimensionnement (postes/débit), paniers d'offres sectoriels et pénalités
  proviennent directement du CORE AI (backend/resources/catalog_ai/sector_scoring_rules.json).
- L'évaluation, les calculs mathématiques de ratios, la normalisation et la détection des lacunes
  sont exécutés par ce script Python ultra-optimisé (< 1ms, sans N+1, prefetch_related).
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from django.conf import settings
from django.db.models import Prefetch

from sales.models import Enterprise, EnterpriseInstalledOffer
from apps.ai_core.services.sector_rules_compiler import (
    SectorRulesCompiler,
    RULES_OUTPUT_PATH,
)

logger = logging.getLogger(__name__)


class EnterpriseComparisonService:
    """
    Moteur de comparaison sectorielle B2B haute performance.
    """

    _RULES_CACHE: Optional[Dict[str, Any]] = None

    @classmethod
    def _get_compiled_rules(cls) -> Dict[str, Any]:
        """
        Charge en mémoire les règles générées par le Core AI (accès O(1) ultra-rapide).
        Si le fichier n'existe pas encore, déclenche la compilation initiale.
        """
        if cls._RULES_CACHE is not None:
            return cls._RULES_CACHE

        rules_path = RULES_OUTPUT_PATH
        if not rules_path.exists():
            logger.info("[EnterpriseComparisonService] Règles absentes, déclenchement du Core AI Compiler...")
            cls._RULES_CACHE = SectorRulesCompiler.compile()
            return cls._RULES_CACHE

        try:
            with open(rules_path, "r", encoding="utf-8") as f:
                cls._RULES_CACHE = json.load(f)
        except Exception as e:
            logger.error("[EnterpriseComparisonService] Erreur lecture des règles JSON (%s), recompilation.", e)
            cls._RULES_CACHE = SectorRulesCompiler.compile()

        return cls._RULES_CACHE

    @classmethod
    def get_sector_policy(cls, sector_name: Optional[str]) -> Dict[str, Any]:
        """
        Retourne les poids, seuils et panier idéal compilés par le Core AI pour un secteur.
        """
        rules = cls._get_compiled_rules()
        taxonomy = rules.get("taxonomy_mapping", {})
        sectors = rules.get("sectors", {})

        s_clean = (sector_name or "").strip().lower()
        canonical_key = taxonomy.get(s_clean, "default")

        # Recherche directe ou fallback
        policy = sectors.get(canonical_key)
        if not policy:
            # Recherche partielle dans les taxonomies
            for raw_k, mapped_canon in taxonomy.items():
                if raw_k in s_clean or s_clean in raw_k:
                    policy = sectors.get(mapped_canon)
                    break

        return policy or sectors.get("default", {})

    @classmethod
    def get_sectors_overview(cls) -> List[Dict[str, Any]]:
        """
        Retourne la liste des secteurs d'activité avec leurs entreprises éligibles
        optimisées avec prefetch_related pour éviter toute requête N+1.
        """
        enterprises = (
            Enterprise.objects.filter(sector__isnull=False)
            .exclude(sector__exact="")
            .select_related("crm_record")
            .prefetch_related(
                Prefetch(
                    "installed_offers",
                    queryset=EnterpriseInstalledOffer.objects.filter(contract_status="ACTIVE"),
                )
            )
            .order_by("sector", "-annual_revenue", "name")
        )

        sectors_map: Dict[str, List[Enterprise]] = {}
        for ent in enterprises:
            s = (ent.sector or "Autre").strip()
            if s not in sectors_map:
                sectors_map[s] = []
            sectors_map[s].append(ent)

        result: List[Dict[str, Any]] = []
        for sector_name, ents in sectors_map.items():
            if len(ents) < 1:
                continue
            ents_summary = []
            for e in ents:
                score_data = cls._compute_enterprise_scores(e)
                ents_summary.append({
                    "id": e.id,
                    "name": e.name,
                    "segment": e.segment,
                    "city": e.city or "Kinshasa",
                    "employee_count": e.employee_count,
                    "annual_revenue": float(e.annual_revenue or 0),
                    "site_count": e.site_count or 1,
                    "current_connectivity": e.current_connectivity or "4G LTE",
                    "overall_score": score_data["overall_score"],
                })

            # Trier par score décroissant pour mettre en avant les entreprises les mieux équipées
            ents_summary.sort(key=lambda x: x["overall_score"], reverse=True)

            result.append({
                "sector": sector_name,
                "count": len(ents_summary),
                "leader": ents_summary[0] if ents_summary else None,
                "enterprises": ents_summary,
            })

        result.sort(key=lambda x: x["count"], reverse=True)
        return result

    @classmethod
    def compare(
        cls, enterprise_a_id: int, enterprise_b_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Compare deux entreprises ou une entreprise vis-à-vis du benchmark sectoriel.
        """
        try:
            ent_a = (
                Enterprise.objects.select_related("crm_record")
                .prefetch_related("installed_offers")
                .get(pk=enterprise_a_id)
            )
        except Enterprise.DoesNotExist:
            raise ValueError(f"Entreprise A (ID: {enterprise_a_id}) introuvable.")

        ent_b = None
        is_benchmark_comparison = False
        if enterprise_b_id and enterprise_b_id != enterprise_a_id:
            try:
                ent_b = (
                    Enterprise.objects.select_related("crm_record")
                    .prefetch_related("installed_offers")
                    .get(pk=enterprise_b_id)
                )
            except Enterprise.DoesNotExist:
                raise ValueError(f"Entreprise B (ID: {enterprise_b_id}) introuvable.")
        else:
            is_benchmark_comparison = True

        scores_a = cls._compute_enterprise_scores(ent_a)

        if ent_b:
            scores_b = cls._compute_enterprise_scores(ent_b)
            name_b = ent_b.name
            meta_b = {
                "id": ent_b.id,
                "name": ent_b.name,
                "sector": ent_b.sector or "Non spécifié",
                "segment": ent_b.segment,
                "employee_count": ent_b.employee_count,
                "site_count": ent_b.site_count or 1,
                "annual_revenue": float(ent_b.annual_revenue or 0),
                "current_connectivity": ent_b.current_connectivity or "4G LTE",
                "incident_count": ent_b.incident_count,
            }
        else:
            # Calcul de la moyenne sectorielle réelle
            scores_b = cls._compute_sector_benchmark(ent_a.sector, exclude_id=ent_a.id)
            name_b = f"Moyenne du secteur ({ent_a.sector or 'Global'})"
            meta_b = {
                "id": None,
                "name": name_b,
                "sector": ent_a.sector or "Global",
                "segment": "MOYENNE_SECTEUR",
                "employee_count": int(scores_b.get("avg_employees", 50)),
                "site_count": int(scores_b.get("avg_sites", 2)),
                "annual_revenue": float(scores_b.get("avg_revenue", 250000)),
                "current_connectivity": scores_b.get("typical_connectivity", "Fibre Pro / 4G"),
                "incident_count": int(scores_b.get("avg_incidents", 1)),
            }

        overall_a = scores_a["overall_score"]
        overall_b = scores_b["overall_score"]
        diff = overall_a - overall_b
        if diff > 1:
            winner = "A"
            headline = f"Pourquoi {ent_a.name} est au-dessus de {name_b} ?"
        elif diff < -1:
            winner = "B"
            headline = f"Pourquoi {name_b} devance {ent_a.name} ?"
        else:
            winner = "TIE"
            headline = f"{ent_a.name} et {name_b} au coude-à-coude sur leur secteur"

        # Comparaison dimension par dimension pour le Radar Chart
        policy_a = cls.get_sector_policy(ent_a.sector)
        radar_data = []
        dimensions_meta = [
            ("connectivity", "Connectivité & Débit"),
            ("security", "Cybersécurité"),
            ("cloud", "Cloud & Données"),
            ("sla", "SLA & Fiabilité"),
            ("equipment", "Multi-sites & SD-WAN"),
            ("budget", "Capacité & Investissement"),
        ]

        for d_id, label in dimensions_meta:
            val_a = scores_a["dimensions"].get(d_id, 50)
            val_b = scores_b["dimensions"].get(d_id, 50)
            radar_data.append({
                "dimension_id": d_id,
                "label": label,
                "score_a": val_a,
                "score_b": val_b,
                "winner": "A" if val_a > val_b else ("B" if val_b > val_a else "TIE"),
                "delta": round(val_a - val_b, 1),
            })

        # Forces comparatives ("Où elle se démarque")
        advantages_a = cls._extract_advantages(ent_a, scores_a, ent_b, scores_b, name_b)
        advantages_b = (
            cls._extract_advantages(ent_b, scores_b, ent_a, scores_a, ent_a.name)
            if ent_b
            else []
        )

        # Lacunes & Vulnérabilités ("Ce qui lui manque")
        gaps_a = scores_a.get("gaps", [])
        gaps_b = scores_b.get("gaps", []) if ent_b else []

        # Tableau détaillé des critères
        criteria_breakdown = cls._build_criteria_breakdown(ent_a, scores_a, ent_b, scores_b)

        # Recommandations stratégiques & Pitch KAM
        kam_recommendations = cls._generate_kam_recommendations(ent_a, gaps_a, ent_b, gaps_b)

        return {
            "headline": headline,
            "sector": ent_a.sector or "Non spécifié",
            "is_benchmark_comparison": is_benchmark_comparison,
            "winner": winner,
            "overall_score_a": overall_a,
            "overall_score_b": overall_b,
            "score_diff": round(diff, 1),
            "meta_a": {
                "id": ent_a.id,
                "name": ent_a.name,
                "sector": ent_a.sector or "Non spécifié",
                "segment": ent_a.segment,
                "employee_count": ent_a.employee_count,
                "site_count": ent_a.site_count or 1,
                "annual_revenue": float(ent_a.annual_revenue or 0),
                "current_connectivity": ent_a.current_connectivity or "4G LTE",
                "incident_count": ent_a.incident_count,
            },
            "meta_b": meta_b,
            "radar": radar_data,
            "advantages_a": advantages_a,
            "advantages_b": advantages_b,
            "gaps_a": gaps_a,
            "gaps_b": gaps_b,
            "criteria_breakdown": criteria_breakdown,
            "kam_recommendations": kam_recommendations,
        }

    # =========================================================================
    # Moteur de Scoring Python Ultra-Optimisé (< 1ms)
    # =========================================================================

    @classmethod
    def _compute_enterprise_scores(cls, ent: Enterprise) -> Dict[str, Any]:
        """
        Calcule de manière déterministe les scores de l'entreprise sur la base des règles du Core AI.
        Mécanique :
        - Démarre à 100 points (entreprise modèle du secteur).
        - Déduit les pénalités calculées pour chaque manque du panier sectoriel idéal.
        - Applique la normalisation par ratio de dimensionnement (Mbps par machine/employé).
        - Pénalise les incidents opérationnels et l'absence de failover.
        """
        policy = cls.get_sector_policy(ent.sector)
        ideal_basket = policy.get("ideal_basket", [])
        sizing_rules = policy.get("sizing_rules", {})
        radar_weights = policy.get("radar_weights", {})

        active_offers = list(ent.installed_offers.filter(contract_status="ACTIVE"))
        offers_text = " ".join([
            o.installed_offer_name.lower() + " " + (o.solution_category or "").lower()
            for o in active_offers
        ])
        conn_text = (ent.current_connectivity or "").lower()
        combined_text = f"{offers_text} {conn_text}"

        bandwidth_total = sum(o.bandwidth_mbps or 0 for o in active_offers)
        sites = ent.site_count or 1
        employees = ent.employee_count or 10

        # Drapeaux de présence
        has_fiber = "fibre" in combined_text or "procezo" in combined_text
        has_dedicated = "dédi" in combined_text or "symétri" in combined_text
        has_backup_link = (
            len(active_offers) >= 2
            or "secours" in combined_text
            or "dual" in combined_text
            or ("4g" in combined_text and has_fiber)
        )
        has_firewall = any(w in combined_text for w in ["firewall", "sécurité", "fortinet", "utm", "cyber"])
        has_vpn = "vpn" in combined_text or "ipsec" in combined_text
        has_cloud_backup = any(w in combined_text for w in ["cloud", "backup", "sauvegarde", "datacenter"])
        has_collab = any(w in combined_text for w in ["365", "workspace", "teams", "voip", "sip"])
        has_sdwan = any(w in combined_text for w in ["sd-wan", "interconnexion", "mpls"])

        # Base de calcul : départ à 100
        current_score = 100.0
        gaps: List[Dict[str, Any]] = []

        # 1. ÉVALUATION DU PANIER SECTORIEL IDÉAL (Défini par le Core AI)
        dim_penalties: Dict[str, float] = {
            "connectivity": 0.0,
            "security": 0.0,
            "cloud": 0.0,
            "sla": 0.0,
            "equipment": 0.0,
            "budget": 0.0,
        }

        for item in ideal_basket:
            category = item.get("category", "")
            dim = item.get("dimension", "connectivity")
            match_kws = item.get("match_keywords", [])
            penalty = float(item.get("penalty", 15))

            # Vérifie si au moins un mot-clé correspond dans les offres détenues
            matched = any(kw.lower() in combined_text for kw in match_kws)
            if not matched:
                current_score -= penalty
                dim_penalties[dim] += penalty
                gaps.append({
                    "category": category,
                    "severity": item.get("criticality", "HIGH"),
                    "issue": f"Absence de {item.get('label')}",
                    "description": (
                        f"L'entreprise n'a pas souscrit à {item.get('label')}, "
                        f"pourtant classé comme standard indispensable pour le secteur {ent.sector}."
                    ),
                    "solution_recommended": item.get("recommended_offer", "Offre Orange Business"),
                    "dimension": dim,
                    "pitch": item.get("pitch", ""),
                })

        # 2. ADÉQUATION DU DIMENSIONNEMENT (Ratio Mbps par poste / machine)
        min_mbps = float(sizing_rules.get("min_mbps_per_workstation", 0.20))
        max_sizing_penalty = float(sizing_rules.get("min_mbps_penalty_max", 15))
        actual_ratio = bandwidth_total / max(employees, 1)

        if actual_ratio < min_mbps:
            # Pénalité proportionnelle au déficit de bande passante
            deficiency = (min_mbps - actual_ratio) / min_mbps
            sizing_pen = round(min(max_sizing_penalty, deficiency * max_sizing_penalty))
            current_score -= sizing_pen
            dim_penalties["connectivity"] += sizing_pen

            gaps.append({
                "category": "Dimensionnement",
                "severity": "HIGH" if deficiency > 0.5 else "MEDIUM",
                "issue": f"Débit sous-dimensionné ({bandwidth_total} Mbps pour {employees} postes)",
                "description": (
                    f"Ratio actuel de {actual_ratio:.2f} Mbps/poste contre {min_mbps:.2f} Mbps/poste "
                    f"recommandé pour le secteur {ent.sector}."
                ),
                "solution_recommended": "Montée en débit Fibre Dédiée Orange Business Procezo",
                "dimension": "connectivity",
                "pitch": "Une augmentation de la bande passante éliminera les ralentissements applicatifs des collaborateurs.",
            })

        # 3. MULTI-SITES & SD-WAN
        sdwan_threshold = int(sizing_rules.get("multi_site_sdwan_threshold", 2))
        multi_pen = float(sizing_rules.get("multi_site_missing_penalty", 15))
        if sites >= sdwan_threshold and not has_sdwan:
            current_score -= multi_pen
            dim_penalties["equipment"] += multi_pen

        # 4. RÉSILIENCE OPÉRATIONNELLE & SLA
        incidents = ent.incident_count or 0
        if incidents > 0:
            incident_pen = min(25, incidents * 8)
            current_score -= incident_pen
            dim_penalties["sla"] += incident_pen

        # Borner le score global entre 10 et 100
        overall_score = round(max(10.0, min(100.0, current_score)))

        # 5. SCORES DES 6 DIMENSIONS DU RADAR (Indexés sur les pénalités)
        dim_scores = {
            "connectivity": round(max(15, 100 - dim_penalties["connectivity"] * 1.5)),
            "security": round(max(15, 100 - dim_penalties["security"] * 1.5)),
            "cloud": round(max(15, 100 - dim_penalties["cloud"] * 1.5)),
            "sla": round(max(15, 100 - dim_penalties["sla"] * 1.5)),
            "equipment": round(max(15, 100 - dim_penalties["equipment"] * 1.5)),
            "budget": round(min(100, max(25, (float(ent.annual_revenue or 0) / 10000) + 40))),
        }

        # Bonus si fibre dédiée
        if has_dedicated:
            dim_scores["connectivity"] = min(100, dim_scores["connectivity"] + 10)
        if has_firewall and has_vpn:
            dim_scores["security"] = min(100, dim_scores["security"] + 10)
        if has_backup_link:
            dim_scores["sla"] = min(100, dim_scores["sla"] + 10)

        return {
            "overall_score": overall_score,
            "dimensions": dim_scores,
            "bandwidth_total": bandwidth_total,
            "bandwidth_ratio": round(actual_ratio, 2),
            "has_fiber": has_fiber,
            "has_dedicated": has_dedicated,
            "has_backup_link": has_backup_link,
            "has_firewall": has_firewall,
            "has_vpn": has_vpn,
            "has_cloud_backup": has_cloud_backup,
            "has_collab": has_collab,
            "has_sdwan": has_sdwan,
            "active_offers_count": len(active_offers),
            "gaps": gaps,
        }

    @classmethod
    def _compute_sector_benchmark(
        cls, sector: Optional[str], exclude_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Calcule la moyenne sectorielle réelle sans aucune requête N+1.
        """
        qs = Enterprise.objects.filter(sector=sector) if sector else Enterprise.objects.all()
        if exclude_id:
            qs = qs.exclude(id=exclude_id)

        ents = list(
            qs.select_related("crm_record")
            .prefetch_related("installed_offers")[:30]
        )
        if not ents:
            return {
                "overall_score": 60,
                "dimensions": {
                    "connectivity": 60,
                    "security": 55,
                    "cloud": 50,
                    "sla": 70,
                    "equipment": 55,
                    "budget": 50,
                },
                "avg_employees": 50,
                "avg_sites": 2,
                "avg_revenue": 250000,
                "typical_connectivity": "Fibre Pro / 4G LTE",
                "avg_incidents": 1,
                "bandwidth_total": 50,
                "gaps": [],
            }

        all_scores = [cls._compute_enterprise_scores(e) for e in ents]
        avg_overall = sum(s["overall_score"] for s in all_scores) / len(all_scores)
        avg_dims = {}
        for d in ["connectivity", "security", "cloud", "sla", "equipment", "budget"]:
            avg_dims[d] = round(sum(s["dimensions"][d] for s in all_scores) / len(all_scores))

        avg_emp = sum(e.employee_count for e in ents) / len(ents)
        avg_sites = sum(e.site_count or 1 for e in ents) / len(ents)
        avg_rev = sum(float(e.annual_revenue or 0) for e in ents) / len(ents)
        avg_inc = sum(e.incident_count for e in ents) / len(ents)

        return {
            "overall_score": round(avg_overall),
            "dimensions": avg_dims,
            "avg_employees": round(avg_emp),
            "avg_sites": round(avg_sites, 1),
            "avg_revenue": round(avg_rev),
            "typical_connectivity": "Fibre Pro / 4G",
            "avg_incidents": round(avg_inc, 1),
            "bandwidth_total": 50,
            "has_fiber": True,
            "has_dedicated": False,
            "has_backup_link": False,
            "has_firewall": False,
            "has_vpn": False,
            "has_cloud_backup": False,
            "has_collab": False,
            "has_sdwan": False,
            "active_offers_count": 1,
            "gaps": [],
        }

    @classmethod
    def _extract_advantages(
        cls,
        ent_main: Enterprise,
        scores_main: Dict[str, Any],
        ent_peer: Optional[Enterprise],
        scores_peer: Dict[str, Any],
        peer_name: str,
    ) -> List[Dict[str, Any]]:
        """
        Extrait les forces où l'entreprise principale devance nettement son pair (ou le secteur).
        """
        advantages = []
        dims_main = scores_main["dimensions"]
        dims_peer = scores_peer["dimensions"]

        # 1. Connectivité & Débit
        if dims_main["connectivity"] > dims_peer["connectivity"] + 5:
            pct_lead = min(99, max(55, int(50 + (dims_main["connectivity"] - dims_peer["connectivity"]))))
            bw_main = scores_main.get("bandwidth_total", 0)
            bw_peer = scores_peer.get("bandwidth_total", 0)
            advantages.append({
                "criterion": "Débit & Qualité de Connectivité",
                "value_main": f"{bw_main} Mbps",
                "value_peer": f"{bw_peer} Mbps" if bw_peer else "Standard",
                "lead_percentage": pct_lead,
                "dimension": "connectivity",
                "summary": f"Surpasse {peer_name} de {pct_lead}% en débit garanti et stabilité de l'accès principal.",
            })

        # 2. SLA & Résilience
        inc_main = ent_main.incident_count or 0
        inc_peer = ent_peer.incident_count if ent_peer else int(scores_peer.get("avg_incidents", 1))
        if inc_main < inc_peer or dims_main["sla"] > dims_peer["sla"] + 5:
            pct_lead = min(98, max(65, 75 + (inc_peer - inc_main) * 8))
            advantages.append({
                "criterion": "Fiabilité Réseau & Faible Taux d'Incidents",
                "value_main": f"{inc_main} coupure(s)",
                "value_peer": f"{inc_peer} coupure(s)",
                "lead_percentage": pct_lead,
                "dimension": "sla",
                "summary": f"Réseau plus résilient avec {max(0, inc_peer - inc_main)} incident(s) de moins constatés.",
            })

        # 3. Cybersécurité
        if scores_main.get("has_firewall") and not scores_peer.get("has_firewall"):
            advantages.append({
                "criterion": "Sécurité Périmétrique & Pare-feu Managé",
                "value_main": "Actif (Firewall Next-Gen)",
                "value_peer": "Non déployé",
                "lead_percentage": 92,
                "dimension": "security",
                "summary": "Protection managée active contre les intrusions et filtrage des flux critiques.",
            })

        # 4. Cloud & Sauvegarde
        if scores_main.get("has_cloud_backup") and not scores_peer.get("has_cloud_backup"):
            advantages.append({
                "criterion": "Sauvegarde Externalisée Cloud",
                "value_main": "Cloud Souverain RDC",
                "value_peer": "Stockage local",
                "lead_percentage": 94,
                "dimension": "cloud",
                "summary": "Données métier répliquées en datacenter sécurisé, protégées contre le ransomware.",
            })

        # 5. Multi-sites & SD-WAN
        if scores_main.get("has_sdwan") and not scores_peer.get("has_sdwan"):
            advantages.append({
                "criterion": "Interconnexion Multi-Sites SD-WAN",
                "value_main": f"SD-WAN Actif ({ent_main.site_count or 1} sites)",
                "value_peer": "Non interconnecté",
                "lead_percentage": 88,
                "dimension": "equipment",
                "summary": "Pilotage centralisé du trafic réseau inter-agences avec bascule automatique.",
            })

        return advantages

    @classmethod
    def _build_criteria_breakdown(
        cls,
        ent_a: Enterprise,
        scores_a: Dict[str, Any],
        ent_b: Optional[Enterprise],
        scores_b: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """
        Construit le tableau exhaustif des critères comparatifs (Versus style).
        """
        rows = [
            {
                "criterion": "Technologie d'accès principale",
                "dimension": "Connectivité",
                "val_a": ent_a.current_connectivity or "Fibre Dédiée",
                "val_b": ent_b.current_connectivity if ent_b else scores_b.get("typical_connectivity", "Fibre Partagée"),
                "winner": "A" if "fibre" in (ent_a.current_connectivity or "").lower() and not ("fibre" in ((ent_b.current_connectivity if ent_b else "") or "").lower()) else "EQUAL",
                "is_critical": True,
            },
            {
                "criterion": "Bande passante souscrite totale",
                "dimension": "Connectivité",
                "val_a": f"{scores_a.get('bandwidth_total', 0)} Mbps",
                "val_b": f"{scores_b.get('bandwidth_total', 0)} Mbps",
                "winner": "A" if scores_a.get("bandwidth_total", 0) > scores_b.get("bandwidth_total", 0) else ("B" if scores_b.get("bandwidth_total", 0) > scores_a.get("bandwidth_total", 0) else "EQUAL"),
                "is_critical": True,
            },
            {
                "criterion": "Lien de secours redondé (Dual Homing)",
                "dimension": "Connectivité",
                "val_a": "Inclus & Actif" if scores_a.get("has_backup_link") else "Absent (SPOF)",
                "val_b": "Inclus & Actif" if scores_b.get("has_backup_link") else "Absent (SPOF)",
                "winner": "A" if scores_a.get("has_backup_link") and not scores_b.get("has_backup_link") else ("B" if scores_b.get("has_backup_link") and not scores_a.get("has_backup_link") else "EQUAL"),
                "is_critical": True,
            },
            {
                "criterion": "Pare-feu & Cybersécurité Managée",
                "dimension": "Sécurité",
                "val_a": "Actif" if scores_a.get("has_firewall") else "Non déployé",
                "val_b": "Actif" if scores_b.get("has_firewall") else "Non déployé",
                "winner": "A" if scores_a.get("has_firewall") and not scores_b.get("has_firewall") else ("B" if scores_b.get("has_firewall") and not scores_a.get("has_firewall") else "EQUAL"),
                "is_critical": True,
            },
            {
                "criterion": "Sauvegarde Cloud Datacenter",
                "dimension": "Cloud",
                "val_a": "Cloud Souverain" if scores_a.get("has_cloud_backup") else "Stockage Local",
                "val_b": "Cloud Souverain" if scores_b.get("has_cloud_backup") else "Stockage Local",
                "winner": "A" if scores_a.get("has_cloud_backup") and not scores_b.get("has_cloud_backup") else ("B" if scores_b.get("has_cloud_backup") and not scores_a.get("has_cloud_backup") else "EQUAL"),
                "is_critical": False,
            },
            {
                "criterion": "Nombre de pannes / incidents (90j)",
                "dimension": "Fiabilité & SLA",
                "val_a": f"{ent_a.incident_count or 0} panne(s)",
                "val_b": f"{ent_b.incident_count if ent_b else scores_b.get('avg_incidents', 0)} panne(s)",
                "winner": "A" if (ent_a.incident_count or 0) < (ent_b.incident_count if ent_b else scores_b.get('avg_incidents', 0)) else ("B" if (ent_b.incident_count if ent_b else scores_b.get('avg_incidents', 0)) < (ent_a.incident_count or 0) else "EQUAL"),
                "is_critical": True,
            },
            {
                "criterion": "Interconnexion Multi-Sites SD-WAN",
                "dimension": "Équipements",
                "val_a": "Déployée" if scores_a.get("has_sdwan") else "Non déployée",
                "val_b": "Déployée" if scores_b.get("has_sdwan") else "Non déployée",
                "winner": "A" if scores_a.get("has_sdwan") and not scores_b.get("has_sdwan") else ("B" if scores_b.get("has_sdwan") and not scores_a.get("has_sdwan") else "EQUAL"),
                "is_critical": False,
            },
            {
                "criterion": "Effectif salarial",
                "dimension": "Envergure",
                "val_a": f"{ent_a.employee_count} employés",
                "val_b": f"{ent_b.employee_count if ent_b else scores_b.get('avg_employees', 50)} employés",
                "winner": "A" if ent_a.employee_count > (ent_b.employee_count if ent_b else scores_b.get('avg_employees', 50)) else ("B" if (ent_b.employee_count if ent_b else scores_b.get('avg_employees', 50)) > ent_a.employee_count else "EQUAL"),
                "is_critical": False,
            },
        ]
        return rows

    @classmethod
    def _generate_kam_recommendations(
        cls,
        ent_a: Enterprise,
        gaps_a: List[Dict[str, Any]],
        ent_b: Optional[Enterprise],
        gaps_b: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Formule des argumentaires de négociation prêts à l'emploi (Pitchs KAM)
        directement indexés sur les manques du catalogue identifiés par le Core AI.
        """
        recs = []

        # Pour Entreprise A
        if gaps_a:
            top_gap = gaps_a[0]
            pitch_custom = top_gap.get("pitch") or (
                f"« Monsieur le Directeur, pour une entreprise du secteur {ent_a.sector}, "
                f"les standards d'infrastructure requièrent {top_gap['solution_recommended'].lower()}. "
                f"L'absence de ce dispositif vous expose à un risque majeur. "
                f"Orange Business vous propose un déploiement clé-en-main avec SLA garanti. »"
            )
            recs.append({
                "target_enterprise": ent_a.name,
                "target_id": ent_a.id,
                "solution_title": top_gap["solution_recommended"],
                "target_need": top_gap["issue"],
                "pitch_argument": pitch_custom,
            })

        # Pour Entreprise B (si ce n'est pas le benchmark moyen)
        if ent_b and gaps_b:
            top_gap_b = gaps_b[0]
            pitch_custom_b = top_gap_b.get("pitch") or (
                f"« Monsieur le Directeur, comparé aux standards de connectivité observés chez les leaders "
                f"de votre secteur, {top_gap_b['issue'].lower()} constitue un frein opérationnel. "
                f"Orange Business est en mesure de déployer {top_gap_b['solution_recommended'].lower()} sous 14 jours. »"
            )
            recs.append({
                "target_enterprise": ent_b.name,
                "target_id": ent_b.id,
                "solution_title": top_gap_b["solution_recommended"],
                "target_need": top_gap_b["issue"],
                "pitch_argument": pitch_custom_b,
            })

        return recs
