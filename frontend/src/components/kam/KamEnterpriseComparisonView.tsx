"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';

interface SectorEnterprise {
  has_infrastructure_data?: boolean;
  is_demo?: boolean;
  id: number;
  name: string;
  segment: string;
  city: string;
  employee_count: number;
  annual_revenue: number;
  site_count: number;
  current_connectivity: string;
  overall_score: number;
}

interface SectorInfo {
  sector: string;
  count: number;
  leader: SectorEnterprise | null;
  enterprises: SectorEnterprise[];
}

interface RadarItem {
  dimension_id: string;
  label: string;
  score_a: number | null;
  score_b: number | null;
  winner: 'A' | 'B' | 'TIE';
  delta: number | null;
  weight_percentage?: number;
  description?: string;
  unit_val_a?: string;
  unit_val_b?: string;
  unit?: string;
  raw_val_a?: number | null;
  raw_val_b?: number | null;
  pack_name_a?: string;
  pack_name_b?: string;
  is_deficit_a?: boolean;
  is_winner_a?: boolean;
}

interface Advantage {
  criterion: string;
  value_main: string;
  value_peer: string;
  lead_percentage: number;
  dimension: string;
  summary: string;
}

interface Gap {
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  issue: string;
  description: string;
  solution_recommended: string;
  dimension: string;
  pitch?: string;
  impact_score?: number;
}

interface CriterionRow {
  criterion: string;
  dimension: string;
  val_a: string;
  val_b: string;
  winner: 'A' | 'B' | 'EQUAL';
  is_critical: boolean;
}

interface KamRecommendation {
  target_enterprise: string;
  target_id: number;
  solution_title: string;
  target_need: string;
  pitch_argument: string;
}

interface SizingComparison {
  similarity_percentage: number;
  is_twin: boolean;
  tier_a: string;
  tier_b: string;
  employee_diff: number;
  site_diff: number;
}

interface ComparisonData {
  headline: string;
  sector: string;
  is_benchmark_comparison: boolean;
  winner: 'A' | 'B' | 'TIE';
  overall_score_a: number | null;
  overall_score_b: number | null;
  score_diff: number | null;
  meta_a: SectorEnterprise;
  meta_b: {
    is_demo?: boolean;
    has_infrastructure_data?: boolean;
    id: number | null;
    name: string;
    sector: string;
    segment: string;
    employee_count: number;
    site_count: number;
    annual_revenue: number;
    current_connectivity: string;
    incident_count: number;
    bandwidth_total?: number;
    sizing_tier?: string;
    similarity_percentage?: number;
    vector_similarity_percentage?: number;
    is_twin?: boolean;
    is_closest_twin?: boolean;
    twin_rationale?: string;
  };
  radar: RadarItem[];
  sizing_comparison?: SizingComparison | null;
  sector_peers?: SectorEnterprise[];
  advantages_a: Advantage[];
  advantages_b: Advantage[];
  gaps_a: Gap[];
  gaps_b: Gap[];
  criteria_breakdown: CriterionRow[];
  kam_recommendations: KamRecommendation[];
}

export default function KamEnterpriseComparisonView() {
  const searchParams = useSearchParams();

  // State
  const [sectors, setSectors] = useState<SectorInfo[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [enterpriseAId, setEnterpriseAId] = useState<number | null>(null);
  const [enterpriseBId, setEnterpriseBId] = useState<number | null>(null); // null = benchmark

  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loadingSectors, setLoadingSectors] = useState<boolean>(true);
  const [loadingComparison, setLoadingComparison] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activeDimension, setActiveDimension] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'gaps'>('overview');


  // 1. Charger la liste des secteurs & entreprises
  useEffect(() => {
    let isMounted = true;
        fetchAPI('/api/kam/comparisons/sectors/')
      .then((data) => {
        if (!isMounted) return;
        const list: SectorInfo[] = data.sectors || [];
        setSectors(list);

        if (list.length > 0) {
          // Vérifier si des paramètres d'URL sont spécifiés
          const paramSector = searchParams?.get('sector');
          const paramA = searchParams?.get('enterprise_a') || searchParams?.get('a');
          const paramB = searchParams?.get('enterprise_b') || searchParams?.get('b');

          let targetSector = list[0];
          if (paramSector) {
            const found = list.find((s) => s.sector.toLowerCase() === paramSector.toLowerCase());
            if (found) targetSector = found;
          }

          setSelectedSector(targetSector.sector);

          if (paramA) {
            const idA = parseInt(paramA, 10);
            if (!isNaN(idA)) setEnterpriseAId(idA);
          } else if (targetSector.enterprises.length > 0) {
            setEnterpriseAId(targetSector.enterprises[0].id);
          }

          if (paramB) {
            const idB = parseInt(paramB, 10);
            if (!isNaN(idB)) setEnterpriseBId(idB);
          } else if (targetSector.enterprises.length > 1) {
            setEnterpriseBId(targetSector.enterprises[1].id);
          } else {
            setEnterpriseBId(null); // Benchmark
          }
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Impossible de charger les secteurs.');
      })
      .finally(() => {
        if (isMounted) setLoadingSectors(false);
      });

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  // Entreprises du secteur sélectionné
  const currentSectorObj = useMemo(() => {
    return sectors.find((s) => s.sector === selectedSector) || null;
  }, [sectors, selectedSector]);

  const currentSectorEnterprises = useMemo(() => {
    return currentSectorObj?.enterprises || [];
  }, [currentSectorObj]);

  // Gérer le changement de secteur
  const handleSectorChange = (newSector: string) => {
    setSelectedSector(newSector);
    const secObj = sectors.find((s) => s.sector === newSector);
    if (secObj && secObj.enterprises.length > 0) {
      setEnterpriseAId(secObj.enterprises[0].id);
      if (secObj.enterprises.length > 1) {
        setEnterpriseBId(secObj.enterprises[1].id);
      } else {
        setEnterpriseBId(null);
      }
    } else {
      setEnterpriseAId(null);
      setEnterpriseBId(null);
    }
  };

  // 2. Charger les données de comparaison
  useEffect(() => {
    if (!enterpriseAId) return;
    let isSubscribed = true;
    let url = `/api/kam/comparisons/?enterprise_a=${enterpriseAId}`;
    url += `&enterprise_b=${enterpriseBId ?? 'benchmark'}`;
    fetchAPI(url)
      .then((data: ComparisonData) => {
        if (isSubscribed) {
          setComparison(data);
          if (enterpriseBId !== data.meta_b.id) setEnterpriseBId(data.meta_b.id);
          setError(null);
          setLoadingComparison(false);
        }
      })
      .catch((err: unknown) => {
        if (isSubscribed) {
          const message = err instanceof Error ? err.message : 'Erreur lors de la comparaison.';
          setError(message);
          setComparison(null);
          setLoadingComparison(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [enterpriseAId, enterpriseBId]);

  // Inverser A et B
  const handleSwap = () => {
    if (enterpriseAId && enterpriseBId) {
      const prevA = enterpriseAId;
      setEnterpriseAId(enterpriseBId);
      setEnterpriseBId(prevA);
    }
  };

  // Tri d'impact : ROUGE (Manques / Déficits) en premier -> BLEU (Excellence / Atouts) en deuxième -> GRIS (Égalités) en dernier
  const radarDimensions = useMemo(() => {
    return [...(comparison?.radar || [])].sort((a, b) => {
      const isDeficitA = a.is_deficit_a !== undefined ? a.is_deficit_a : a.score_a !== null && a.score_b !== null && a.score_a < a.score_b;
      const isWinnerA = a.is_winner_a !== undefined ? a.is_winner_a : a.score_a !== null && a.score_b !== null && a.score_a > a.score_b;
      const priorityA = isDeficitA ? 0 : (isWinnerA ? 1 : 2);

      const isDeficitB = b.is_deficit_a !== undefined ? b.is_deficit_a : b.score_a !== null && b.score_b !== null && b.score_a < b.score_b;
      const isWinnerB = b.is_winner_a !== undefined ? b.is_winner_a : b.score_a !== null && b.score_b !== null && b.score_a > b.score_b;
      const priorityB = isDeficitB ? 0 : (isWinnerB ? 1 : 2);

      return priorityA - priorityB;
    });
  }, [comparison?.radar]);

  // Filtrage des critères par dimension active si sélectionnée
  const filteredCriteria = useMemo(() => {
    if (!comparison) return [];
    if (!activeDimension) return comparison.criteria_breakdown;
    const labelMap: Record<string, string> = {
      connectivity: 'Connectivité',
      security: 'Sécurité',
      cloud: 'Cloud',
      sla: 'Fiabilité & SLA',
      equipment: 'Équipements',
      budget: 'Budget',
    };
    const targetLabel = labelMap[activeDimension];
    if (!targetLabel) return comparison.criteria_breakdown;
    return comparison.criteria_breakdown.filter((c) => c.dimension.toLowerCase().includes(targetLabel.toLowerCase()));
  }, [comparison, activeDimension]);

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 md:p-8 overflow-y-auto select-none bg-[#ECEAE5] dark:bg-[#242124] text-zinc-900 dark:text-white transition-colors duration-300">
      {/* 1. En-tête : Titre & Sélecteurs de Secteur et d'Entreprises */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4F6CE8] dark:text-[#6885FF] bg-[#4F6CE8]/10 dark:bg-[#4F6CE8]/20 px-2.5 py-0.5 rounded-full">
              Intelligence B2B & Benchmarking
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1 text-zinc-900 dark:text-white">
            Comparateur Sectoriel Versus
          </h1>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
            Analysez les écarts concurrentiels entre deux entreprises d&apos;un même secteur pour identifier les manques et opportunités d&apos;upsell.
          </p>
        </div>

        {/* Sélecteur de secteur compact */}
        <div className="flex items-center gap-2 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl p-1.5 border border-black/5 dark:border-white/5 shadow-xs">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 pl-2">
            Secteur :
          </span>
          <select
            value={selectedSector}
            onChange={(e) => handleSectorChange(e.target.value)}
            disabled={loadingSectors}
            className="bg-transparent border-none text-xs font-bold text-zinc-900 dark:text-white outline-none cursor-pointer py-1.5 pr-3"
          >
            {sectors.map((s) => (
              <option key={s.sector} value={s.sector} className="bg-white dark:bg-[#2D2A2D] text-zinc-900 dark:text-white">
                {s.sector} ({s.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Barre de Sélection des Deux Entreprises (A vs B) */}
      <section className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-4 md:p-5 border border-black/5 dark:border-white/5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Entreprise A */}
          <div className="md:col-span-5 flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#4F6CE8] dark:text-[#6885FF] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4F6CE8]"></span>
              Entreprise A (Compte Référence)
            </label>
            <select
              value={enterpriseAId || ''}
              onChange={(e) => setEnterpriseAId(Number(e.target.value))}
              disabled={loadingComparison || currentSectorEnterprises.length === 0}
              className="w-full bg-[#ECEAE5] dark:bg-[#242124] rounded-xl px-3 py-2.5 text-xs font-bold text-zinc-900 dark:text-white border-none outline-none cursor-pointer"
            >
              {currentSectorEnterprises.map((ent) => (
                <option key={ent.id} value={ent.id} className="bg-white dark:bg-[#2D2A2D]">
                  {ent.name} — Score {ent.overall_score}/100 ({ent.city})
                </option>
              ))}
            </select>
          </div>

          {/* Bouton Swap A ⇄ B */}
          <div className="md:col-span-2 flex justify-center py-1">
            <button
              onClick={handleSwap}
              disabled={!enterpriseBId}
              title="Inverser les deux entreprises"
              className="p-2.5 rounded-full bg-[#ECEAE5] dark:bg-[#242124] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Icons.RefreshCw size={16} />
            </button>
          </div>

          {/* Entreprise B */}
          <div className="md:col-span-5 flex flex-col gap-1">
            <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 dark:bg-zinc-500"></span>
              Entreprise B (Comparatif ou Moyenne)
            </label>
            <select
              value={enterpriseBId === null ? 'BENCHMARK' : enterpriseBId}
              onChange={(e) => {
                if (e.target.value === 'BENCHMARK') {
                  setEnterpriseBId(null);
                } else {
                  setEnterpriseBId(Number(e.target.value));
                }
              }}
              disabled={loadingComparison}
              className="w-full bg-[#ECEAE5] dark:bg-[#242124] rounded-xl px-3 py-2.5 text-xs font-bold text-zinc-900 dark:text-white border-none outline-none cursor-pointer"
            >
              <option value="BENCHMARK" className="bg-white dark:bg-[#2D2A2D]">
                Moyenne du secteur ({selectedSector || 'Benchmark Global'})
              </option>
              {(comparison?.meta_a.id === enterpriseAId ? comparison.sector_peers || [] : currentSectorEnterprises)
                .filter((ent) => ent.id !== enterpriseAId)
                .map((ent) => (
                  <option key={ent.id} value={ent.id} className="bg-white dark:bg-[#2D2A2D]">
                    {ent.name} — Score {ent.overall_score}/100 ({ent.city})
                  </option>
                ))}
            </select>
          </div>
        </div>
      </section>

      {/* État de Chargement / Erreur */}
      {loadingComparison ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 gap-3">

          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Calcul de l&apos;analyse comparative sectorielle...
          </p>
        </div>
      ) : error ? (
        <div className="p-8 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] text-center space-y-3">
          <Icons.AlertTriangle size={32} className="text-zinc-500 mx-auto" />
          <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">Analyse indisponible</h3>
          <p className="text-xs text-zinc-500">{error}</p>
        </div>
      ) : comparison ? (
        <>
          {/* 3. Hero Header Versus & Cartouches de Score */}
          <div className="text-center py-2 space-y-2">
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
              {comparison.headline}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Touchez un domaine du radar ou un critère pour afficher les détails comparatifs.
            </p>

            {/* Légende interactive */}
            <div className="flex items-center justify-center gap-6 pt-2 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-3 h-1 bg-[#4F6CE8] rounded-full"></span>
                <span className="text-zinc-900 dark:text-white">{comparison.meta_a.name} ({comparison.overall_score_a ?? "—"} pts)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1 bg-zinc-400 dark:bg-zinc-500 rounded-full"></span>
                <span className="text-zinc-500 dark:text-zinc-400">{comparison.meta_b.name} ({comparison.overall_score_b ?? "—"} pts)</span>
              </div>
            </div>
          </div>

          {/* 4. Comparaison Directe Minimaliste : Entreprise 1 vs Entreprise 2 */}
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[28px] p-6 md:p-8 border border-black/5 dark:border-white/5 shadow-xs space-y-6">
            {/* Cartes d'En-tête Versus (2 colonnes aérées sans badge VS pour afficher le nom complet) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pb-4 border-b border-black/5 dark:border-white/5">
              {/* Entreprise 1 */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4F6CE8]" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#4F6CE8]">
                    Entreprise 1 • Référence
                  </span>
                </div>
                <div className="relative group">
                  <h3
                    title={comparison.meta_a.name}
                    className="text-base md:text-lg font-bold text-zinc-900 dark:text-white leading-snug tracking-tight truncate cursor-help"
                  >
                    {comparison.meta_a.name}
                  </h3>
                  <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:flex items-center z-30 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900/95 dark:bg-zinc-800/95 backdrop-blur-md rounded-xl shadow-xl whitespace-normal max-w-sm pointer-events-none transition-all duration-150 border border-white/10">
                    {comparison.meta_a.name}
                  </div>
                </div>
                <div className="flex items-baseline gap-2 pt-0.5">
                  <span
                    className={`text-2xl font-black ${
                      comparison.overall_score_a !== null && comparison.overall_score_b !== null && comparison.overall_score_a < comparison.overall_score_b
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-zinc-900 dark:text-white'
                    }`}
                  >
                    {comparison.overall_score_a ?? "—"}
                  </span>
                  <span className="text-xs text-zinc-400 font-bold">{comparison.overall_score_a === null ? "Non évalué" : "/ 100 pts de maturité"}</span>
                </div>
              </div>

              {/* Entreprise 2 */}
              <div className="space-y-1.5 md:text-right min-w-0">
                <div className="flex items-center md:justify-end gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                    Entreprise 2 • Comparatif
                  </span>
                  {comparison.meta_b?.is_closest_twin && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#4F6CE8]/10 text-[#4F6CE8] border border-[#4F6CE8]/20">
                      Jumeau Vectoriel {comparison.meta_b?.similarity_percentage}%
                    </span>
                  )}
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
                </div>
                <div className="relative group flex md:justify-end">
                  <h3
                    title={comparison.meta_b.name}
                    className="text-base md:text-lg font-bold text-zinc-900 dark:text-white leading-snug tracking-tight truncate cursor-help max-w-full"
                  >
                    {comparison.meta_b.name}
                  </h3>
                  <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:flex items-center z-30 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900/95 dark:bg-zinc-800/95 backdrop-blur-md rounded-xl shadow-xl whitespace-normal max-w-sm pointer-events-none transition-all duration-150 border border-white/10 text-left">
                    {comparison.meta_b.name}
                  </div>
                </div>
                <div className="flex items-baseline md:justify-end gap-2 pt-0.5">
                  <span className="text-2xl font-black text-zinc-900 dark:text-white">
                    {comparison.overall_score_b ?? "—"}
                  </span>
                  <span className="text-xs text-zinc-400 font-bold">{comparison.overall_score_b === null ? "Non évalué" : "/ 100 pts de maturité"}</span>
                </div>
              </div>
            </div>

            {/* Justification de Correspondance Vectorielle IA */}
            {(comparison.meta_a.has_infrastructure_data === false || comparison.meta_b.has_infrastructure_data === false) && (
              <p className="text-[13px] leading-[21px] text-zinc-500 dark:text-zinc-400">
                Parc non renseigné. Complétez les informations de l’entreprise pour établir la comparaison.
              </p>
            )}

            {comparison.meta_b?.twin_rationale && (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-zinc-900 dark:text-white shrink-0">
                    Correspondance vectorielle IA :
                  </span>
                  <span className="truncate text-zinc-500 dark:text-zinc-400">
                    {comparison.meta_b.twin_rationale}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-[#4F6CE8] shrink-0">
                  {comparison.meta_b.similarity_percentage}% proximité
                </div>
              </div>
            )}

            {/* Grille Match-Stats Face-à-face des Piliers Clés (Établis par le Core AI pour le secteur) */}
            <div className="space-y-2.5 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1 border-b border-black/5 dark:border-white/5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">

                  <span>Piliers Télécoms établis par le Core AI • {comparison.sector}</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">
                  {radarDimensions.length} piliers sectoriels analysés
                </span>
              </div>
              {radarDimensions.map((dim) => {
                const isDeficitA = dim.is_deficit_a !== undefined ? dim.is_deficit_a : dim.score_a !== null && dim.score_b !== null && dim.score_a < dim.score_b;
                const isWinnerA = dim.is_winner_a !== undefined ? dim.is_winner_a : dim.score_a !== null && dim.score_b !== null && dim.score_a > dim.score_b;
                const isWinnerB = dim.winner === 'B' || (!isWinnerA && !isDeficitA && dim.score_b !== null && dim.score_a !== null && dim.score_b > dim.score_a);

                const displayValA = dim.unit_val_a || `${dim.score_a}%`;
                const displayValB = dim.unit_val_b || `${dim.score_b}%`;

                return (
                  <div
                    key={dim.dimension_id}
                    onClick={() => setActiveDimension(prev => prev === dim.dimension_id ? null : dim.dimension_id)}
                    className="grid grid-cols-12 items-center gap-2 md:gap-4 py-2.5 px-0.5 rounded-2xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    {/* Colonne Gauche : Entreprise 1 (Pastille Match-Stats alignée à gauche sous le nom) */}
                    <div className="col-span-3 flex flex-col items-start justify-center text-left">
                      <span
                        className={`inline-flex items-center justify-center px-3.5 py-1.5 min-w-[72px] md:min-w-[88px] rounded-full text-xs md:text-sm font-bold tracking-tight text-center transition-all ${
                          isDeficitA
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/25 shadow-xs'
                            : isWinnerA
                            ? 'bg-[#4F6CE8]/10 text-[#4F6CE8] dark:text-[#6885FF] border border-[#4F6CE8]/25 font-extrabold'
                            : 'bg-black/5 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/5'
                        }`}
                        title={dim.score_a === null ? "Parc non renseigné" : dim.pack_name_a || `${displayValA} (Score: ${dim.score_a}%)`}
                      >
                        {displayValA}
                      </span>
                      {dim.pack_name_a && (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium truncate max-w-[140px] mt-0.5 text-left hidden sm:block">
                          {dim.pack_name_a}
                        </span>
                      )}
                    </div>

                    {/* Colonne Centrale : Libellé du Pilier Catalogue */}
                    <div className="col-span-6 text-center px-2">
                      <span className="text-xs md:text-sm font-bold text-zinc-800 dark:text-zinc-200 block leading-snug">
                        {dim.label}
                      </span>
                      {dim.description && (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 line-clamp-1 hidden md:block mt-0.5">
                          {dim.description}
                        </span>
                      )}
                    </div>

                    {/* Colonne Droite : Entreprise de Référence (Pastille Match-Stats alignée à droite sous le nom) */}
                    <div className="col-span-3 flex flex-col items-end justify-center text-right">
                      <span
                        className={`inline-flex items-center justify-center px-3.5 py-1.5 min-w-[72px] md:min-w-[88px] rounded-full text-xs md:text-sm font-bold tracking-tight text-center transition-all ${
                          isWinnerB
                            ? 'bg-zinc-800/10 dark:bg-white/15 text-zinc-900 dark:text-white border border-black/10 dark:border-white/15 font-extrabold'
                            : 'bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border border-black/5 dark:border-white/5'
                        }`}
                        title={dim.score_b === null ? "Parc non renseigné" : dim.pack_name_b || `${displayValB} (Score: ${dim.score_b}%)`}
                      >
                        {displayValB}
                      </span>
                      {dim.pack_name_b && (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium truncate max-w-[140px] mt-0.5 text-right hidden sm:block">
                          {dim.pack_name_b}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Synthèse Face-à-face Épurée */}
            {(comparison.gaps_a.length > 0 || comparison.advantages_a.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-black/5 dark:border-white/5">
                {/* Colonne Entreprise 1 : Ce qui lui manque / Opportunités */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#242124] border border-black/5 dark:border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#4F6CE8]" />
                      Opportunités à positionner ({comparison.gaps_a.length})
                    </span>
                    <span className="text-[10px] text-zinc-400 truncate max-w-[150px]">{comparison.meta_a.name}</span>
                  </div>
                  <ul className="space-y-2">
                    {comparison.gaps_a.slice(0, 3).map((gap, i) => (
                      <li key={i} className="text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-2">
                        <span className="text-[#4F6CE8] font-bold shrink-0">•</span>
                        <div className="space-y-0.5">
                          <span className="font-semibold text-zinc-900 dark:text-white">{gap.issue}</span>
                          <span className="block text-[11px] text-zinc-500">Solution Orange : {gap.solution_recommended}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Colonne Entreprise 2 : Points forts du pair */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#242124] border border-black/5 dark:border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-zinc-400" />
                      Points forts de référence ({comparison.advantages_a.length > 0 ? comparison.advantages_a.length : 'Standards'})
                    </span>
                    <span className="text-[10px] text-zinc-400 truncate max-w-[150px]">{comparison.meta_b.name}</span>
                  </div>
                  <ul className="space-y-2">
                    {comparison.advantages_a.length > 0 ? (
                      comparison.advantages_a.slice(0, 3).map((adv, i) => (
                        <li key={i} className="text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-2">
                          <span className="text-zinc-400 font-bold shrink-0">•</span>
                          <div className="space-y-0.5">
                            <span className="font-semibold text-zinc-900 dark:text-white">{adv.criterion}</span>
                            <span className="block text-[11px] text-zinc-500">{adv.summary}</span>
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-zinc-500 italic">Conforme aux standards de référence du secteur.</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>

                    {/* 5. Navigation par Onglets de Détails (Ce qui lui manque / Plan d'Action KAM / Tableau Complet) */}
          <div className="flex items-center gap-2 pt-2">
            {[
              { id: 'overview' as const, label: 'Tableau Comparatif & Caractéristiques', icon: Icons.List },
              { id: 'gaps' as const, label: 'Ce qui lui manque (Lacunes & Vulnérabilités)', icon: Icons.AlertTriangle },
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[#4F6CE8] text-white shadow-xs'
                      : 'bg-[#F6F5F2] dark:bg-[#2D2A2D] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <IconComp size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Onglet 1 : Tableau Comparatif Détaillé */}
          {activeTab === 'overview' && (
            <section className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Comparaison critère par critère ({filteredCriteria.length} caractéristiques)
                </h3>
                {activeDimension && (
                  <span className="text-xs text-[#4F6CE8] font-semibold">
                    Filtre actif : {activeDimension}
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left border-collapse" aria-label="Tableau comparatif détaillé">
                  <thead>
                    <tr className="text-[11px] text-zinc-500 dark:text-zinc-400 border-b border-black/5 dark:border-white/5">
                      <th scope="col" className="pb-3 pr-4 font-semibold">Caractéristique</th>
                      <th scope="col" className="pb-3 pr-4 font-semibold">Pilier</th>
                      <th scope="col" className="pb-3 pr-4 font-semibold text-[#4F6CE8] dark:text-[#6885FF]">
                        {comparison.meta_a.name}
                      </th>
                      <th scope="col" className="pb-3 pr-4 font-semibold">
                        {comparison.meta_b.name}
                      </th>
                      <th scope="col" className="pb-3 font-semibold text-right">Avantage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCriteria.map((row, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors border-b border-black/5 dark:border-white/5 last:border-b-0"
                      >
                        <td className="py-3.5 pr-4 text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                          {row.is_critical && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4F6CE8]" title="Critère stratégique"></span>
                          )}
                          <span>{row.criterion}</span>
                        </td>
                        <td className="py-3.5 pr-4 text-xs text-zinc-500 dark:text-zinc-400">
                          {row.dimension}
                        </td>
                        <td className="py-3.5 pr-4 text-xs font-bold text-zinc-900 dark:text-white">
                          {row.val_a}
                        </td>
                        <td className="py-3.5 pr-4 text-xs text-zinc-600 dark:text-zinc-300">
                          {row.val_b}
                        </td>
                        <td className="py-3.5 text-xs font-bold text-right">
                          {row.winner === 'A' ? (
                            <span className="text-[#4F6CE8] dark:text-[#6885FF] bg-[#4F6CE8]/10 dark:bg-[#4F6CE8]/20 px-2 py-0.5 rounded-md">
                              {comparison.meta_a.name}
                            </span>
                          ) : row.winner === 'B' ? (
                            <span className="text-zinc-700 dark:text-zinc-300 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-md">
                              {comparison.meta_b.name}
                            </span>
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-500">{comparison.score_diff === null ? "Non comparable" : "Égalité"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Onglet 2 : Ce qui lui manque (Lacunes & Vulnérabilités pour le KAM) */}
          {activeTab === 'gaps' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Manques de l'Entreprise A */}
              <section className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4F6CE8]"></span>
                    Ce qui manque à {comparison.meta_a.name}
                  </h3>
                  <span className="text-xs text-zinc-500">
                    {comparison.gaps_a.length} point{comparison.gaps_a.length > 1 ? 's' : ''} à équiper
                  </span>
                </div>

                {comparison.gaps_a.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-500">
                    {comparison.score_diff === null ? "Parc à renseigner avant d’évaluer les écarts." : "Aucune vulnérabilité majeure identifiée sur ce compte."}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comparison.gaps_a.map((gap, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-[#ECEAE5] dark:bg-[#242124] space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-zinc-900 dark:text-white">
                            {gap.issue}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            gap.severity === 'CRITICAL'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : gap.severity === 'HIGH'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                          }`}>
                            {gap.severity === 'CRITICAL' ? 'Critique' : gap.severity === 'HIGH' ? 'Prioritaire' : 'Secondaire'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {gap.description}
                        </p>
                        <div className="pt-2 border-t border-black/5 dark:border-white/5 text-[11px] font-semibold text-[#4F6CE8] dark:text-[#6885FF] flex items-center gap-1.5">

                          <span>Offre Orange Business : {gap.solution_recommended}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Manques de l'Entreprise B */}
              <section className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 dark:bg-zinc-500"></span>
                    Ce qui manque à {comparison.meta_b.name}
                  </h3>
                  <span className="text-xs text-zinc-500">
                    {comparison.gaps_b.length} point{comparison.gaps_b.length > 1 ? 's' : ''} à équiper
                  </span>
                </div>

                {comparison.gaps_b.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-500">
                    {comparison.score_diff === null ? "Parc à renseigner avant d’évaluer les écarts." : "Aucune vulnérabilité identifiée ou benchmark conforme."}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comparison.gaps_b.map((gap, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-[#ECEAE5] dark:bg-[#242124] space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-zinc-900 dark:text-white">
                            {gap.issue}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            gap.severity === 'CRITICAL'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : gap.severity === 'HIGH'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                          }`}>
                            {gap.severity === 'CRITICAL' ? 'Critique' : gap.severity === 'HIGH' ? 'Prioritaire' : 'Secondaire'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {gap.description}
                        </p>
                        <div className="pt-2 border-t border-black/5 dark:border-white/5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">

                          <span>Offre Orange Business : {gap.solution_recommended}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
