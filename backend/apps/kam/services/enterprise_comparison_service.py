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
from .comparison_identity import same_enterprise, distinct_peers
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

    @staticmethod
    def _has_known_infrastructure(ent: Enterprise) -> bool:
        """Ignore les valeurs par défaut et l'ancienne offre de conversion fictive."""
        offers = [o for o in ent.installed_offers.all() if o.contract_status == "ACTIVE"]
        connectivity = (ent.current_connectivity or "").strip()
        legacy_placeholder = (
            not ent.crm_record_id
            and connectivity == "4G LTE / Opérateur Tiers"
            and len(offers) == 1
            and offers[0].installed_offer_name == "Liaison Internet 4G LTE Opérateur Tiers"
            and offers[0].provider == "CONCURRENT"
            and offers[0].bandwidth_mbps == 20
            and float(offers[0].monthly_cost_mrr or 0) == 150.0
        )
        if legacy_placeholder:
            return False
        # Une connectivité déclarée sur la fiche ne constitue pas un produit du parc.
        return bool(offers)

    @classmethod
    def _apply_unknown_infrastructure(cls, result, ent_a, ent_b):
        """Restitue une absence de données, jamais un déficit ou un parc supposé."""
        known = {"a": cls._has_known_infrastructure(ent_a),
                 "b": ent_b is None or cls._has_known_infrastructure(ent_b)}
        for side, has_data in known.items():
            ent = ent_a if side == 'a' else ent_b
            result[f'meta_{side}']['is_demo'] = bool(ent and any(o.is_demo for o in ent.installed_offers.all()))
            result[f"meta_{side}"]["has_infrastructure_data"] = has_data
            if has_data:
                continue
            result[f"overall_score_{side}"] = None
            for field in ("current_connectivity", "bandwidth_total"):
                result[f"meta_{side}"][field] = None
            result[f"gaps_{side}"] = []
            for row in result["radar"]:
                row[f"score_{side}"] = None
                row[f"raw_val_{side}"] = None
                row[f"unit_val_{side}"] = "Non renseigné"
                row[f"pack_name_{side}"] = ""
            for row in result["criteria_breakdown"]:
                row[f"val_{side}"] = "Non renseigné"
        if all(known.values()):
            return result
        result.update(winner="TIE", score_diff=None, advantages_a=[], advantages_b=[],
                      kam_recommendations=[], sizing_comparison=None)
        result["headline"] = "Parc à renseigner pour établir la comparaison"
        for row in result["radar"]:
            row.update(winner="TIE", delta=None, is_deficit_a=False, is_winner_a=False)
        for row in result["criteria_breakdown"]:
            row["winner"] = "EQUAL"
        # Les écarts entre entreprises ne sont pas interprétables sans données des deux côtés.
        result["gaps_a"] = []
        result["gaps_b"] = []
        result["synthesis"].update(
            headline=result["headline"], overall_score_a=result["overall_score_a"],
            overall_score_b=result["overall_score_b"], score_diff=None,
            positioning_summary="Le parc de l'entreprise doit être renseigné avant toute évaluation.",
            critical_gaps_count=0, top_solutions=[], recommended_pitch="",
        )
        return result

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
    def get_canonical_sector_key(cls, sector_name: Optional[str]) -> str:
        """
        Détermine la clé sectorielle canonique (finance, energy, healthcare, technology, etc.)
        à partir de la taxonomie du Core AI et de règles sémantiques.
        """
        rules = cls._get_compiled_rules()
        taxonomy = rules.get("taxonomy_mapping", {})
        s_clean = (sector_name or "").strip().lower()

        canonical_key = taxonomy.get(s_clean)
        if not canonical_key:
            for raw_k, mapped_canon in taxonomy.items():
                if raw_k in s_clean or s_clean in raw_k:
                    canonical_key = mapped_canon
                    break

        if not canonical_key:
            if any(k in s_clean for k in ["santé", "sante", "médic", "medic", "hôpital", "hopital", "clinique", "pharma"]):
                canonical_key = "healthcare"
            elif any(k in s_clean for k in ["mine", "minier", "énergie", "energie", "pétrole", "petrole", "gaz", "carrière"]):
                canonical_key = "energy"
            elif any(k in s_clean for k in ["banque", "finance", "fintech", "crédit", "credit", "assurance", "money", "paiement"]):
                canonical_key = "finance"
            elif any(k in s_clean for k in ["tech", "télécom", "telecom", "informatique", "logiciel", "digital", "it"]):
                canonical_key = "technology"
            elif any(k in s_clean for k in ["distrib", "commerce", "vente", "magasin", "boutique", "retail"]):
                canonical_key = "retail"
            elif any(k in s_clean for k in ["transport", "logistique", "fret", "aviation"]):
                canonical_key = "logistics"
            elif any(k in s_clean for k in ["industrie", "usine", "manufact"]):
                canonical_key = "industry"
            elif any(k in s_clean for k in ["éduc", "educ", "école", "ecole", "enseign", "universit"]):
                canonical_key = "education"
            else:
                canonical_key = "default"
        return canonical_key

    @classmethod
    def get_sector_policy(cls, sector_name: Optional[str]) -> Dict[str, Any]:
        """
        Retourne les piliers d'infrastructure télécoms, poids et panier idéal
        compilés par le Core AI à partir du catalogue pour ce secteur.
        """
        rules = cls._get_compiled_rules()
        sectors = rules.get("sectors", {})
        canonical_key = cls.get_canonical_sector_key(sector_name)
        policy = sectors.get(canonical_key) or sectors.get("default", {})
        return policy

    @classmethod
    def _extract_bandwidth_mbps(
        cls, ent: Enterprise, active_offers: List[EnterpriseInstalledOffer]
    ) -> int:
        """
        Détermine la bande passante réelle (en Mbps) à partir des offres installées
        ou par analyse de la connectivité déclarée (regex & standards sectoriels).
        """
        total_offers = sum(o.bandwidth_mbps or 0 for o in active_offers if o.bandwidth_mbps)
        if total_offers > 0:
            return total_offers

        conn = (ent.current_connectivity or "").strip().lower()
        if not conn:
            return 30

        import re
        # Gbps explicite (ex: "1 Gbps", "2.5 Gbps", "1 Giga")
        giga_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:gbps|giga|gb)", conn)
        if giga_match:
            try:
                return int(float(giga_match.group(1)) * 1000)
            except ValueError:
                pass

        # Mbps explicite (ex: "100 Mbps", "50 Mbps", "500 Mega")
        mega_match = re.search(r"(\d+)\s*(?:mbps|mega|mb)", conn)
        if mega_match:
            try:
                return int(mega_match.group(1))
            except ValueError:
                pass

        # Heuristiques technologiques déterministes
        if "très haut débit" in conn or "10g" in conn:
            return 500
        if "fibre optique dédiée" in conn or "fibre dédiée" in conn or "lsi" in conn:
            return 200
        if "fibre" in conn:
            return 100
        if "faisceau" in conn or "hertzien" in conn:
            return 50
        if "moyen débit" in conn:
            return 30
        if "4g" in conn or "lte" in conn:
            return 20
        if "vsat" in conn or "satellite" in conn or "faible débit" in conn:
            return 10

        return 30

    @classmethod
    def _get_sizing_tier_label(cls, employees: Optional[int], sites: Optional[int]) -> str:
        """
        Retourne le libellé du segment de dimensionnement selon les machines et sites.
        """
        emp = max(employees or 1, 1)
        s = max(sites or 1, 1)
        if emp >= 1000:
            return f"Grand Compte ({emp:,} postes • {s} site{'s' if s > 1 else ''})".replace(",", " ")
        elif emp >= 250:
            return f"ETI ({emp:,} postes • {s} site{'s' if s > 1 else ''})".replace(",", " ")
        elif emp >= 20:
            return f"PME ({emp:,} postes • {s} site{'s' if s > 1 else ''})".replace(",", " ")
        else:
            return f"TPE ({emp:,} postes • {s} site{'s' if s > 1 else ''})".replace(",", " ")

    @classmethod
    def _compute_sizing_similarity(
        cls, ent_a: Enterprise, ent_b: Enterprise
    ) -> Dict[str, Any]:
        """
        Calcule la proximité de dimensionnement multi-dimensionnelle et non-linéaire :
        - Volume de machines / postes informatiques (échelle logarithmique)
        - Dispersion géographique & sites distants (échelle topologique)
        - Densité opérationnelle par site (machines par site)
        - Échelle économique (chiffre d'affaires)
        """
        import math

        if not all(value is not None and value > 0 for value in (
                ent_a.employee_count, ent_b.employee_count, ent_a.site_count, ent_b.site_count,
                ent_a.annual_revenue, ent_b.annual_revenue)):
            return {'similarity_percentage': 0, 'is_twin': False, 'data_sufficient': False,
                    'tier_a': 'Non renseigné', 'tier_b': 'Non renseigné',
                    'topology_a': 'Non renseignée', 'topology_b': 'Non renseignée',
                    'employee_diff': None, 'site_diff': None}

        e_a = max(ent_a.employee_count or 1, 1)
        e_b = max(ent_b.employee_count or 1, 1)
        s_a = max(ent_a.site_count or 1, 1)
        s_b = max(ent_b.site_count or 1, 1)
        r_a = max(float(ent_a.annual_revenue or 0), 1000.0)
        r_b = max(float(ent_b.annual_revenue or 0), 1000.0)

        # Densité de postes par site (Architecture : campus dense vs agences distribuées)
        density_a = e_a / s_a
        density_b = e_b / s_b

        # 1. Distance logarithmique sur le volume de machines
        log_e_a = math.log(1 + e_a)
        log_e_b = math.log(1 + e_b)
        d_emp = abs(log_e_a - log_e_b) / max(log_e_a, log_e_b, 1.0)

        # 2. Distance logarithmique sur le nombre de sites distants
        log_s_a = math.log(1 + s_a)
        log_s_b = math.log(1 + s_b)
        d_sites = abs(log_s_a - log_s_b) / max(log_s_a, log_s_b, 1.0)

        # 3. Distance sur la densité opérationnelle par site
        log_d_a = math.log(1 + density_a)
        log_d_b = math.log(1 + density_b)
        d_density = abs(log_d_a - log_d_b) / max(log_d_a, log_d_b, 1.0)

        # 4. Distance sur l'échelle économique
        log_r_a = math.log(1 + r_a)
        log_r_b = math.log(1 + r_b)
        d_rev = abs(log_r_a - log_r_b) / max(log_r_a, log_r_b, 1.0)

        # Pondération multi-dimensionnelle non-linéaire :
        # 35% Volume Postes, 30% Dispersion Sites, 20% Densité/Topologie, 15% Envergure CA
        composite_distance = (
            0.35 * d_emp +
            0.30 * d_sites +
            0.20 * d_density +
            0.15 * d_rev
        )

        similarity = max(5, min(99, round((1.0 - composite_distance) * 100)))

        # Typologie topologique
        def get_topology_type(sites: int, density: float) -> str:
            if sites == 1:
                return "Mono-site (Campus Centralisé)"
            elif sites >= 4 and density < 200:
                return f"Multi-sites Distribué ({sites} agences • Réseau Maillé)"
            elif sites >= 2 and density >= 200:
                return f"Multi-sites Haute Densité ({sites} hubs régionaux)"
            else:
                return f"Multi-sites ({sites} implantations)"

        topology_a = get_topology_type(s_a, density_a)
        topology_b = get_topology_type(s_b, density_b)

        return {
            "similarity_percentage": similarity,
            "data_sufficient": True,
            "is_twin": similarity >= 80,
            "tier_a": cls._get_sizing_tier_label(e_a, s_a),
            "tier_b": cls._get_sizing_tier_label(e_b, s_b),
            "topology_a": topology_a,
            "topology_b": topology_b,
            "employee_diff": e_a - e_b,
            "site_diff": s_a - s_b,
        }

    @classmethod
    def get_sector_peers_by_sizing(
        cls, ent_a: Enterprise
    ) -> List[Dict[str, Any]]:
        """
        Retourne la liste des entreprises du même secteur classées par proximité
        de dimensionnement (les pairs aux tailles les plus proches en premier).
        """
        sector = ent_a.sector
        if not sector:
            return []

        qs = (
            Enterprise.objects.filter(sector=sector)
            .exclude(id=ent_a.id)
            .select_related("crm_record")
            .prefetch_related(
                Prefetch(
                    "installed_offers",
                    queryset=EnterpriseInstalledOffer.objects.filter(contract_status="ACTIVE"),
                )
            )
        )

        candidates = distinct_peers(ent_a, qs)
        # Compter les entreprises distinctes avant d'élargir le secteur.
        if len(candidates) < 3:
            canonical_key = cls.get_canonical_sector_key(sector)
            all_sectors = Enterprise.objects.exclude(sector="").values_list("sector", flat=True).distinct()
            matching_sectors = [s for s in all_sectors if cls.get_canonical_sector_key(s) == canonical_key]
            if matching_sectors:
                qs = (
                    Enterprise.objects.filter(sector__in=matching_sectors)
                    .exclude(id=ent_a.id)
                    .select_related("crm_record")
                    .prefetch_related(
                        Prefetch(
                            "installed_offers",
                            queryset=EnterpriseInstalledOffer.objects.filter(contract_status="ACTIVE"),
                        )
                    )
                )
                candidates = distinct_peers(ent_a, qs)

        # Rapprochement vectoriel sémantique (768D Core AI)
        vector_scores_by_id: Dict[int, float] = {}
        try:
            from apps.ai_core.vector_search.singleton import get_vector_search_service
            vec_svc = get_vector_search_service()
            sim_vecs = vec_svc.find_similar_enterprises(ent_a.id, top_k=50)
            for sv in sim_vecs:
                meta = sv.metadata or {}
                eid = meta.get("enterprise_id")
                if not eid:
                    try:
                        eid = int(str(sv.doc_id).replace("enterprise_profile_", "").replace("enterprise_", ""))
                    except (ValueError, TypeError):
                        continue
                if eid:
                    vector_scores_by_id[int(eid)] = sv.score
        except Exception as exc:
            logger.debug("[EnterpriseComparisonService] Vector search fallback: %s", exc)

        peers_with_sim = []
        for ent_b in candidates:
            sim_data = cls._compute_sizing_similarity(ent_a, ent_b)
            score_b = cls._compute_enterprise_scores(ent_b)

            # Pondération hybride sémantique vectorielle (65%) + dimensionnement matériel (35%)
            vec_sim = vector_scores_by_id.get(ent_b.id)
            if vec_sim is not None:
                vec_pct = max(10, min(99, round(vec_sim * 100)))
                hybrid_pct = max(10, min(99, round(0.65 * vec_pct + 0.35 * sim_data["similarity_percentage"])))
            else:
                vec_pct = sim_data["similarity_percentage"]
                hybrid_pct = sim_data["similarity_percentage"]

            reasons = []
            if ent_a.sector == ent_b.sector:
                reasons.append(f"Même secteur ({ent_b.sector})")
            if ent_a.segment == ent_b.segment and ent_b.segment != 'UNKNOWN':
                reasons.append(f"Segment {ent_b.segment}")
            if ent_b.site_count and ent_b.site_count > 1:
                reasons.append(f"{ent_b.site_count} sites distants")
            if ent_b.current_connectivity:
                reasons.append(f"Liaison {ent_b.current_connectivity}")
            twin_rationale = " • ".join(reasons) if reasons else "Topologie et dimensionnement comparables"

            is_twin = hybrid_pct >= 75 and sim_data.get('data_sufficient', False)

            peers_with_sim.append({
                "id": ent_b.id,
                "name": ent_b.name,
                "city": ent_b.city or "",
                "segment": ent_b.segment,
                "employee_count": ent_b.employee_count,
                "site_count": ent_b.site_count,
                "annual_revenue": float(ent_b.annual_revenue) if ent_b.annual_revenue is not None else None,
                "current_connectivity": ent_b.current_connectivity or "",
                "overall_score": score_b["overall_score"],
                "similarity_percentage": hybrid_pct,
                "vector_similarity_percentage": vec_pct,
                "sizing_similarity_percentage": sim_data["similarity_percentage"],
                "is_twin": is_twin,
                "twin_rationale": twin_rationale,
                "sizing_tier": sim_data["tier_b"],
                "is_closest_twin": False,
            })

        # Trier par pourcentage de similarité décroissant
        peers_with_sim.sort(key=lambda x: x["similarity_percentage"], reverse=True)
        if peers_with_sim and peers_with_sim[0]['is_twin']:
            peers_with_sim[0]["is_closest_twin"] = True

        return peers_with_sim

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
    def _recorded_pillar_metrics(cls, p_id, label, ent_a, ent_b):
        """Restitue exclusivement les produits actifs du parc enregistré."""
        offers_a = [o for o in ent_a.installed_offers.all()
                    if o.contract_status == 'ACTIVE' and o.sector_pillar_id == p_id]
        offers_b = [o for o in ent_b.installed_offers.all()
                    if o.contract_status == 'ACTIVE' and o.sector_pillar_id == p_id] if ent_b else []
        if not offers_a and not offers_b:
            return None
        label_lower = label.lower()
        is_mobile = any(word in label_lower for word in ('iot', 'm2m', 'flotte', 'mobile'))
        is_bandwidth = p_id == 'connectivity' or any(word in label_lower for word in ('fibre', 'débit', 'vsat'))
        unit = 'SIM' if is_mobile else ('Mbps' if is_bandwidth else 'service(s)')
        result = {'unit': unit}
        for side, offers in (('a', offers_a), ('b', offers_b)):
            value = None
            if offers:
                if is_mobile:
                    known = [o.active_licenses_count for o in offers if o.active_licenses_count is not None]
                    value = sum(known) if len(known) == len(offers) else None
                elif is_bandwidth:
                    known = [o.bandwidth_mbps for o in offers if o.bandwidth_mbps is not None]
                    value = sum(known) if len(known) == len(offers) else None
                else:
                    value = len(offers)
            result[f'raw_val_{side}'] = value
            result[f'unit_val_{side}'] = f'{value} {unit}' if value is not None else 'Non renseigné'
            result[f'pack_name_{side}'] = ', '.join(o.installed_offer_name for o in offers)
        a, b = result['raw_val_a'], result['raw_val_b']
        result['is_deficit_a'] = a is not None and b is not None and a < b
        result['is_winner_a'] = a is not None and b is not None and a > b
        return result

    @classmethod
    def _compute_pillar_metric_units(
        cls,
        p_id: str,
        label: str,
        ent_a: Enterprise,
        scores_a: Dict[str, Any],
        ent_b: Optional[Enterprise],
        scores_b: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Aucune estimation d'effectif, de SLA ou de chiffre d'affaires ne crée un produit."""
        recorded = cls._recorded_pillar_metrics(p_id, label, ent_a, ent_b)
        if recorded is not None:
            return recorded
        return {
            "unit_val_a": "Non renseigné", "unit_val_b": "Non renseigné", "unit": "",
            "raw_val_a": None, "raw_val_b": None,
            "pack_name_a": "", "pack_name_b": "",
            "is_deficit_a": False, "is_winner_a": False,
        }

    @classmethod
    def compare(
        cls, enterprise_a_id: int, enterprise_b_id: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Compare deux entreprises ou une entreprise vis-à-vis du benchmark sectoriel.
        Par défaut (enterprise_b_id non renseigné), compare automatiquement avec le pair
        du même secteur ayant le dimensionnement le plus proche (nombre de postes/machines et sites).
        """
        try:
            ent_a = (
                Enterprise.objects.select_related("crm_record")
                .prefetch_related("installed_offers")
                .get(pk=enterprise_a_id)
            )
        except Enterprise.DoesNotExist:
            raise ValueError(f"Entreprise A (ID: {enterprise_a_id}) introuvable.")

        # Récupérer l'ensemble des pairs du secteur classés par dimensionnement similaire
        sector_peers = cls.get_sector_peers_by_sizing(ent_a)

        ent_b = None
        is_benchmark_comparison = False

        if enterprise_b_id in ("benchmark", "0", 0):
            is_benchmark_comparison = True
        elif enterprise_b_id is not None:
            try:
                b_id_int = int(enterprise_b_id)
                if b_id_int != ent_a.id:
                    ent_b = (
                        Enterprise.objects.select_related("crm_record")
                        .prefetch_related("installed_offers")
                        .get(pk=b_id_int)
                    )
                else:
                    is_benchmark_comparison = True
            except (Enterprise.DoesNotExist, ValueError):
                is_benchmark_comparison = True
        else:
            # PAR DÉFAUT : Choisir le pair du même secteur au dimensionnement le plus proche
            if sector_peers:
                closest_id = sector_peers[0]["id"]
                try:
                    ent_b = (
                        Enterprise.objects.select_related("crm_record")
                        .prefetch_related("installed_offers")
                        .get(pk=closest_id)
                    )
                except Enterprise.DoesNotExist:
                    is_benchmark_comparison = True
            else:
                is_benchmark_comparison = True

        # Même une sélection explicite ou ancienne ne doit pas contourner l'identité métier.
        if ent_b is not None and same_enterprise(ent_a, ent_b):
            ent_b = None
            is_benchmark_comparison = True

        scores_a = cls._compute_enterprise_scores(ent_a)

        if ent_b:
            scores_b = cls._compute_enterprise_scores(ent_b)
            name_b = ent_b.name
            sizing_data = cls._compute_sizing_similarity(ent_a, ent_b)

            matched_peer = next((p for p in sector_peers if p["id"] == ent_b.id), None)
            vec_pct = matched_peer.get("vector_similarity_percentage", sizing_data["similarity_percentage"]) if matched_peer else sizing_data["similarity_percentage"]
            twin_rationale = matched_peer.get("twin_rationale", "") if matched_peer else ""
            hybrid_pct = matched_peer.get("similarity_percentage", sizing_data["similarity_percentage"]) if matched_peer else sizing_data["similarity_percentage"]
            is_closest = matched_peer.get("is_closest_twin", False) if matched_peer else False

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
                "bandwidth_total": scores_b.get("bandwidth_total", 0),
                "sizing_tier": sizing_data["tier_b"],
                "similarity_percentage": hybrid_pct,
                "vector_similarity_percentage": vec_pct,
                "is_twin": hybrid_pct >= 75 and sizing_data.get('data_sufficient', False),
                "is_closest_twin": is_closest,
                "twin_rationale": twin_rationale,
            }
            sizing_data["similarity_percentage"] = hybrid_pct
            sizing_data["vector_similarity_percentage"] = vec_pct
            sizing_data["twin_rationale"] = twin_rationale
            sizing_data["is_twin"] = meta_b['is_twin']
            sizing_data["is_closest_twin"] = is_closest
        else:
            # Calcul de la moyenne sectorielle réelle
            scores_b = cls._compute_sector_benchmark(ent_a.sector, exclude_id=ent_a.id)
            name_b = f"Moyenne du secteur ({ent_a.sector or 'Global'})"
            sizing_data = {
                "similarity_percentage": 50,
                "is_twin": False,
                "tier_a": cls._get_sizing_tier_label(ent_a.employee_count, ent_a.site_count),
                "tier_b": "Moyenne Sectorielle",
                "employee_diff": 0,
                "site_diff": 0,
            }
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
                "bandwidth_total": 50,
                "sizing_tier": "Moyenne Sectorielle",
                "similarity_percentage": 50,
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

        # Piliers d'Infrastructure Télécoms Dynamiques établis par le Core AI pour ce secteur
        policy = cls.get_sector_policy(ent_a.sector)
        pillars = policy.get("pillars", [])
        if not pillars:
            pillars = [
                {"id": "connectivity", "label": "Connectivité & Débit", "weight": 0.25, "description": "Accès principal et bande passante"},
                {"id": "security", "label": "Cybersécurité Périmétrique", "weight": 0.25, "description": "Protection pare-feu et filtrage"},
                {"id": "cloud", "label": "Cloud & Sauvegarde Souveraine", "weight": 0.20, "description": "Sauvegarde externalisée datacenter"},
                {"id": "sla", "label": "SLA & Haute Disponibilité", "weight": 0.15, "description": "Résilience et secours automatique"},
                {"id": "equipment", "label": "Multi-sites & SD-WAN", "weight": 0.15, "description": "Interconnexion agences"},
            ]

        radar_data = []
        for p in pillars:
            d_id = p["id"]
            label = p["label"]
            desc = p.get("description", "")
            weight = p.get("weight", 0.20)
            val_a = scores_a["dimensions"].get(d_id, 50)
            val_b = scores_b["dimensions"].get(d_id, 50)

            metric_units = cls._compute_pillar_metric_units(
                p_id=d_id,
                label=label,
                ent_a=ent_a,
                scores_a=scores_a,
                ent_b=ent_b,
                scores_b=scores_b,
            )

            is_deficit = metric_units["is_deficit_a"]
            is_winner = metric_units["is_winner_a"]
            if metric_units['raw_val_a'] is None:
                val_a = None
            if metric_units['raw_val_b'] is None:
                val_b = None
            comparable = val_a is not None and val_b is not None
            pillar_winner = ('B' if is_deficit else ('A' if is_winner else 'TIE')) if comparable else 'TIE'

            radar_data.append({
                "dimension_id": d_id,
                "label": label,
                "description": desc,
                "weight": weight,
                "weight_percentage": int(round(weight * 100)),
                "score_a": val_a,
                "score_b": val_b,
                "winner": pillar_winner,
                "delta": round(val_a - val_b, 1) if comparable else None,
                "unit_val_a": metric_units["unit_val_a"],
                "unit_val_b": metric_units["unit_val_b"],
                "unit": metric_units["unit"],
                "raw_val_a": metric_units["raw_val_a"],
                "raw_val_b": metric_units["raw_val_b"],
                "pack_name_a": metric_units["pack_name_a"],
                "pack_name_b": metric_units["pack_name_b"],
                "is_deficit_a": is_deficit,
                "is_winner_a": is_winner,
            })

        # Tri stratégique par priorité métier (Déficits en premier, puis Atouts, puis Égalités) :
        # 1. ROUGE (0) : Là où l'entreprise analysée est en déficit / manque par rapport au pair
        # 2. BLEU (1)  : Là où l'entreprise analysée excelle et devance le pair
        # 3. GRIS (2)  : Là où il y a égalité parfaite entre les deux entreprises
        def _pillar_sort_priority(item: Dict[str, Any]) -> int:
            if item.get("is_deficit_a") or item.get("winner") == "B":
                return 0
            elif item.get("is_winner_a") or item.get("winner") == "A":
                return 1
            return 2

        radar_data.sort(key=_pillar_sort_priority)

        # Forces comparatives ("Où elle se démarque")
        advantages_a = cls._extract_advantages(ent_a, scores_a, ent_b, scores_b, name_b)
        advantages_b = (
            cls._extract_advantages(ent_b, scores_b, ent_a, scores_a, ent_a.name)
            if ent_b
            else []
        )

        # Lacunes & Vulnérabilités ("Ce qui lui manque" - Priorité commerciale absolue)
        comp_gaps_a = cls._extract_comparative_gaps(ent_a, scores_a, ent_b, scores_b, name_b)
        existing_issues_a = {g.get("issue") for g in scores_a.get("gaps", [])}
        all_gaps_a = list(scores_a.get("gaps", []))
        for cg in comp_gaps_a:
            if cg.get("issue") not in existing_issues_a:
                all_gaps_a.append(cg)
                existing_issues_a.add(cg.get("issue"))

        # Tri strict : CRITICAL en premier, puis HIGH, puis MEDIUM
        severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2}
        all_gaps_a.sort(key=lambda g: severity_order.get(g.get("severity", "MEDIUM"), 3))

        all_gaps_b = list(scores_b.get("gaps", []))
        if ent_b:
            comp_gaps_b = cls._extract_comparative_gaps(ent_b, scores_b, ent_a, scores_a, ent_a.name)
            existing_issues_b = {g.get("issue") for g in all_gaps_b}
            for cg in comp_gaps_b:
                if cg.get("issue") not in existing_issues_b:
                    all_gaps_b.append(cg)
                    existing_issues_b.add(cg.get("issue"))
            all_gaps_b.sort(key=lambda g: severity_order.get(g.get("severity", "MEDIUM"), 3))

        # Tableau détaillé des critères
        criteria_breakdown = cls._build_criteria_breakdown(ent_a, scores_a, ent_b, scores_b)

        # Recommandations stratégiques & Pitch KAM
        kam_recommendations = cls._generate_kam_recommendations(ent_a, all_gaps_a, ent_b, all_gaps_b)

        # Synthèse Exécutive Core AI
        synthesis = {
            "headline": headline,
            "overall_score_a": overall_a,
            "overall_score_b": overall_b,
            "score_diff": round(diff, 1),
            "positioning_summary": f"{ent_a.name} affiche {overall_a}/100 de maturité face à {name_b} ({overall_b}/100).",
            "critical_gaps_count": len([g for g in all_gaps_a if g.get("severity") in ("CRITICAL", "HIGH")]),
            "top_solutions": [g.get("solution_recommended") for g in all_gaps_a[:3] if g.get("solution_recommended")],
            "recommended_pitch": kam_recommendations[0].get("pitch_argument") if kam_recommendations else "",
            "is_portfolio_account": ent_a.assigned_kam is not None,
        }

        result = {
            "synthesis": synthesis,
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
                "bandwidth_total": scores_a.get("bandwidth_total", 0),
                "sizing_tier": sizing_data["tier_a"],
            },
            "meta_b": meta_b,
            "radar": radar_data,
            "pillars": radar_data,
            "sector_pillars_count": len(radar_data),
            "sector_rules_origin": "core_ai_catalog_compiler",
            "sizing_comparison": sizing_data,
            "sector_peers": sector_peers,
            "advantages_a": advantages_a,
            "advantages_b": advantages_b,
            "gaps_a": all_gaps_a,
            "gaps_b": all_gaps_b,
            "criteria_breakdown": criteria_breakdown,
            "kam_recommendations": kam_recommendations,
        }
        return cls._apply_unknown_infrastructure(result, ent_a, ent_b)

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

        active_offers = [offer for offer in ent.installed_offers.all() if offer.contract_status == "ACTIVE"]
        installed_pillars = {o.sector_pillar_id for o in active_offers if o.sector_pillar_id}
        offers_text = " ".join([
            o.installed_offer_name.lower() + " " + (getattr(o, "solution_category", None) or getattr(o, "category", "") or "").lower()
            for o in active_offers
        ])
        conn_text = (ent.current_connectivity or "").lower()
        combined_text = f"{offers_text} {conn_text}"

        bandwidth_total = cls._extract_bandwidth_mbps(ent, active_offers)
        sites = ent.site_count or 1
        employees = ent.employee_count or 10

        # Drapeaux de présence
        has_fiber = "fibre" in combined_text or "lsi" in combined_text
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
        pillars = policy.get("pillars", [])
        dim_penalties: Dict[str, float] = {p["id"]: 0.0 for p in pillars}
        for fallback_k in ["connectivity", "security", "cloud", "sla", "equipment", "budget"]:
            dim_penalties.setdefault(fallback_k, 0.0)

        for item in ideal_basket:
            category = item.get("category", "")
            dim = item.get("dimension", "connectivity")
            match_kws = item.get("match_keywords", [])
            penalty = float(item.get("penalty", 15))

            # Vérifie si au moins un mot-clé correspond dans les offres détenues
            matched = dim in installed_pillars or any(kw.lower() in combined_text for kw in match_kws)
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
                    "impact_score": int(penalty),
                })

        # 2. ADÉQUATION DU DIMENSIONNEMENT (Ratio Mbps par poste / machine)
        min_mbps = float(sizing_rules.get("min_mbps_per_workstation", 0.20))
        max_sizing_penalty = float(sizing_rules.get("min_mbps_penalty_max", 25))
        actual_ratio = bandwidth_total / max(employees, 1)

        if actual_ratio < min_mbps:
            # Pénalité proportionnelle au déficit de bande passante
            deficiency = (min_mbps - actual_ratio) / min_mbps
            sizing_pen = round(min(max_sizing_penalty, max(6.0, deficiency * max_sizing_penalty)))
            current_score -= sizing_pen
            dim_penalties["connectivity"] += sizing_pen

            recommended_offer = (
                "Fibre Dédiée Entreprise 1 Gbps (LSI)"
                if employees >= 1000
                else (
                    "Fibre Dédiée Entreprise 500 Mbps"
                    if employees >= 300
                    else "Fibre Pro Entreprise 100 Mbps"
                )
            )

            min_bw_needed = round(employees * min_mbps)

            site_detail_str = (
                f" (soit seulement ~{round(bandwidth_total / sites)} Mbps pour chacun de vos {sites} sites hébergeant ~{round(employees / sites)} machines)"
                if sites > 1 else ""
            )

            gaps.append({
                "category": "Dimensionnement",
                "severity": "CRITICAL" if deficiency > 0.6 else "HIGH",
                "issue": f"Débit critique sous-dimensionné ({bandwidth_total} Mbps pour {employees} machines/postes)",
                "description": (
                    f"Ratio actuel de {actual_ratio:.2f} Mbps/machine contre {min_mbps:.2f} Mbps/machine "
                    f"requis pour le secteur {ent.sector}{site_detail_str}. "
                    f"Déficit capacitaire de {round(deficiency * 100)}% provoquant saturation et lenteurs applicatives."
                ),
                "solution_recommended": f"Montée en débit {recommended_offer}",
                "dimension": "connectivity",
                "pitch": (
                    f"« Avec {employees} machines actives réparties sur vos {sites} sites, votre bande passante de {bandwidth_total} Mbps est saturée. "
                    f"Orange Business vous propose {recommended_offer} avec débit garanti et SLA Pro pour absorber votre croissance. »"
                ),
                "impact_score": sizing_pen,
            })

        # 3. MULTI-SITES & SD-WAN
        sdwan_threshold = int(sizing_rules.get("multi_site_sdwan_threshold", 2))
        multi_pen = float(sizing_rules.get("multi_site_missing_penalty", 15))
        if sites >= sdwan_threshold and not has_sdwan:
            current_score -= multi_pen
            dim_penalties["equipment"] += multi_pen

            if not any("sd-wan" in g.get("issue", "").lower() or "interconnexion" in g.get("issue", "").lower() for g in gaps):
                gaps.append({
                    "category": "Architecture Réseau",
                    "severity": "CRITICAL" if sites >= 4 else "HIGH",
                    "issue": f"Absence d'interconnexion SD-WAN ({sites} sites distants)",
                    "description": (
                        f"L'entreprise opère {sites} sites distants sans pilotage centralisé du trafic réseau. "
                        f"Chaque site fonctionne en silo sans bascule automatique ni priorisation des flux critiques métier."
                    ),
                    "solution_recommended": "Solution Business SD-WAN Managé Orange",
                    "dimension": "equipment",
                    "pitch": (
                        f"« Avec {sites} implantations distantes, le SD-WAN Orange Business vous permet d'unifier vos liaisons, "
                        f"d'optimiser vos coûts d'exploitation et de prioriser vos flux ERP sans rupture. »"
                    ),
                    "impact_score": int(multi_pen),
                })

        # 4. RÉSILIENCE OPÉRATIONNELLE & SLA
        incidents = ent.incident_count or 0
        if incidents > 0:
            incident_pen = min(25, incidents * 8)
            current_score -= incident_pen
            dim_penalties["sla"] += incident_pen

        # Borner le score global entre 10 et 100
        overall_score = round(max(10.0, min(100.0, current_score)))

        # 5. SCORES DES PILIERS SECTORIELS DU CORE AI (Indexés sur les pénalités)
        dim_scores = {}
        for p in pillars:
            p_id = p["id"]
            pen = dim_penalties.get(p_id, 0.0)
            sc = round(max(15, 100 - pen * 1.5))
            if "connectivity" in p_id and has_dedicated:
                sc = min(100, sc + 10)
            if "security" in p_id and (has_firewall or has_vpn):
                sc = min(100, sc + 10)
            if "sla" in p_id and has_backup_link:
                sc = min(100, sc + 10)
            if "equipment" in p_id and has_sdwan:
                sc = min(100, sc + 10)
            if "cloud" in p_id and (has_cloud_backup or has_collab):
                sc = min(100, sc + 10)
            dim_scores[p_id] = sc

        for fallback_k in ["connectivity", "security", "cloud", "sla", "equipment", "budget"]:
            if fallback_k not in dim_scores:
                dim_scores[fallback_k] = round(max(15, 100 - dim_penalties.get(fallback_k, 0.0) * 1.5))

        if has_dedicated:
            dim_scores["connectivity"] = min(100, dim_scores["connectivity"] + 10)
        if has_firewall and has_vpn:
            dim_scores["security"] = min(100, dim_scores["security"] + 10)
        if has_backup_link:
            dim_scores["sla"] = min(100, dim_scores["sla"] + 10)

        # Calcul du score global pondéré par les poids réels des piliers du secteur
        if pillars:
            weighted_sum = sum(dim_scores.get(p["id"], 50) * p.get("weight", 0.20) for p in pillars)
            overall_score = round(max(10.0, min(100.0, weighted_sum)))

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
        policy = cls.get_sector_policy(sector)
        pillars = policy.get("pillars", [])
        pillar_ids = [p["id"] for p in pillars] if pillars else ["connectivity", "security", "cloud", "sla", "equipment", "budget"]
        for fallback_k in ["connectivity", "security", "cloud", "sla", "equipment", "budget"]:
            if fallback_k not in pillar_ids:
                pillar_ids.append(fallback_k)

        avg_dims = {}
        for d in pillar_ids:
            avg_dims[d] = round(sum(s["dimensions"].get(d, 50) for s in all_scores) / len(all_scores))

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
    def _extract_comparative_gaps(
        cls,
        ent_main: Enterprise,
        scores_main: Dict[str, Any],
        ent_peer: Optional[Enterprise],
        scores_peer: Dict[str, Any],
        peer_name: str,
    ) -> List[Dict[str, Any]]:
        """
        Extrait les lacunes comparatives où le pair surclasse nettement l'entreprise cible.
        Transforme les atouts du pair en propositions concrètes Orange Business pour le client.
        """
        comp_gaps: List[Dict[str, Any]] = []
        if not ent_peer:
            return comp_gaps

        # 1. Liens de secours (Redondance / SPOF)
        if scores_peer.get("has_backup_link") and not scores_main.get("has_backup_link"):
            comp_gaps.append({
                "category": "Résilience Réseau",
                "severity": "CRITICAL",
                "issue": f"Absence de lien de secours (Actif chez {peer_name})",
                "description": (
                    f"{peer_name} sécurise ses flux critiques avec une double adduction "
                    f"alors que {ent_main.name} dépend d'un lien unique (SPOF)."
                ),
                "solution_recommended": "Lien de Secours 4G LTE Pro / VSAT Backup Managé",
                "dimension": "sla",
                "pitch": (
                    f"« Votre pair {peer_name} a éliminé le risque de coupure avec un lien de secours. "
                    f"Orange Business déploie une liaison secondaire en bascule automatique sous 7 jours. »"
                ),
                "impact_score": 15,
            })

        # 2. Cybersécurité périmétrique
        if scores_peer.get("has_firewall") and not scores_main.get("has_firewall"):
            comp_gaps.append({
                "category": "Cybersécurité",
                "severity": "CRITICAL",
                "issue": f"Pare-feu managé non déployé (Déployé chez {peer_name})",
                "description": (
                    f"Contrairement à {peer_name}, les accès Internet de {ent_main.name} "
                    f"ne disposent pas de pare-feu nouvelle génération ni de filtrage d'intrusion."
                ),
                "solution_recommended": "Firewall Next-Gen Managé Fortinet Orange Business",
                "dimension": "security",
                "pitch": (
                    f"« Dans votre secteur d'activité, la protection périmétrique est devenue incontournable. "
                    f"{peer_name} est déjà équipé. Orange Business sécurise l'ensemble de vos flux. »"
                ),
                "impact_score": 15,
            })

        # 3. Écart de bande passante relatif
        bw_main = scores_main.get("bandwidth_total", 0)
        bw_peer = scores_peer.get("bandwidth_total", 0)
        if bw_peer >= bw_main * 2 and bw_peer >= 50:
            comp_gaps.append({
                "category": "Connectivité",
                "severity": "HIGH",
                "issue": f"Bande passante 2x inférieure à son pair ({bw_main} Mbps vs {bw_peer} Mbps)",
                "description": (
                    f"{peer_name} dispose de {bw_peer} Mbps contre seulement {bw_main} Mbps pour {ent_main.name}, "
                    f"offrant une bien meilleure vélocité applicative."
                ),
                "solution_recommended": "Upgrade Débit Fibre Dédiée Entreprise (LSI)",
                "dimension": "connectivity",
                "pitch": (
                    f"« Votre pair direct {peer_name} opère avec {bw_peer} Mbps. "
                    f"Pour maintenir votre niveau de service, nous recommandons d'aligner votre bande passante. »"
                ),
                "impact_score": 10,
            })

        # 4. SD-WAN multi-sites
        sites_main = ent_main.site_count or 1
        if sites_main >= 2 and scores_peer.get("has_sdwan") and not scores_main.get("has_sdwan"):
            comp_gaps.append({
                "category": "Équipements & Réseau",
                "severity": "HIGH",
                "issue": f"Interconnexion SD-WAN absente (Active chez {peer_name})",
                "description": (
                    f"{peer_name} pilote ses liaisons inter-sites avec SD-WAN. "
                    f"{ent_main.name} gère ses {sites_main} sites sans priorisation dynamique."
                ),
                "solution_recommended": "Solution SD-WAN Managé Orange Business",
                "dimension": "equipment",
                "pitch": (
                    f"« Pour vos {sites_main} sites, le SD-WAN optimise la répartition de charge "
                    f"et réduit vos coûts d'exploitation comme chez {peer_name}. »"
                ),
                "impact_score": 10,
            })

        return comp_gaps

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
        employees_b = ent_b.employee_count if ent_b else scores_b.get('avg_employees')
        employees_known = ent_a.employee_count is not None and employees_b is not None
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
                "val_a": f"{ent_a.employee_count} employés" if ent_a.employee_count is not None else 'Non renseigné',
                "val_b": f"{employees_b} employés" if employees_b is not None else 'Non renseigné',
                "winner": ('A' if ent_a.employee_count > employees_b else 'B' if employees_b > ent_a.employee_count else 'EQUAL') if employees_known else None,
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
