"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';

interface PeerOption {
  id: number;
  name: string;
  city: string;
  overall_score: number;
  employee_count?: number;
  site_count?: number;
  similarity_percentage?: number;
  is_twin?: boolean;
  sizing_tier?: string;
  is_closest_twin?: boolean;
  vector_similarity_percentage?: number;
  twin_rationale?: string;
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
  topology_match?: string;
}

interface ComparisonData {
  headline: string;
  sector: string;
  is_benchmark_comparison: boolean;
  winner: 'A' | 'B' | 'TIE';
  overall_score_a: number | null;
  overall_score_b: number | null;
  score_diff: number | null;
  meta_a: {
    is_demo?: boolean;
    has_infrastructure_data?: boolean;
    id: number;
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
  };
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
  sector_peers?: PeerOption[];
  advantages_a: Advantage[];
  advantages_b: Advantage[];
  gaps_a: Gap[];
  gaps_b: Gap[];
  criteria_breakdown: CriterionRow[];
  kam_recommendations: KamRecommendation[];
}

interface KamAccountComparisonSectionProps {
  enterpriseId: string | number;
  enterpriseName?: string;
  sector?: string;
  initialPeerId?: number;
}

export default function KamAccountComparisonSection(props: KamAccountComparisonSectionProps) {
  return <AccountComparisonContent key={String(props.enterpriseId)} {...props} />;
}

function AccountComparisonContent({
  enterpriseId,
  initialPeerId,
}: KamAccountComparisonSectionProps) {
  const cleanId = String(enterpriseId).replace('account-', '').replace(/\D/g, '') || String(enterpriseId);
  const numericId = parseInt(cleanId, 10);

  // States
  const [peers, setPeers] = useState<PeerOption[]>([]);
  const [selectedPeerId, setSelectedPeerId] = useState<number | 'AUTO' | 'BENCHMARK'>(initialPeerId && initialPeerId !== numericId ? initialPeerId : 'AUTO');
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les données de comparaison
  const fetchComparisonData = useCallback(async (aId: number, bId: number | 'AUTO' | 'BENCHMARK') => {
    let url = `/api/kam/comparisons/?enterprise_a=${aId}`;
    if (bId !== 'AUTO') {
      url += `&enterprise_b=${bId === 'BENCHMARK' ? 'benchmark' : bId}`;
    }
    return await fetchAPI(url);
  }, []);

  useEffect(() => {
    let ignore = false;
    if (!isNaN(numericId)) {
      fetchComparisonData(numericId, selectedPeerId)
        .then((data: ComparisonData) => {
          if (!ignore) {
            setComparison(data);
            setPeers((data.sector_peers || []).filter(peer => peer.id !== numericId));
            const resolvedPeer = data.meta_b?.id ?? 'BENCHMARK';
            if (selectedPeerId !== resolvedPeer) setSelectedPeerId(resolvedPeer);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (!ignore) {
            console.error("Erreur lors du chargement de la comparaison :", err);
            setError("Impossible de charger les données comparatives pour ce compte.");
            setLoading(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [numericId, selectedPeerId, fetchComparisonData]);

  // Tri d'impact : ROUGE (Manques / Déficits) en premier -> BLEU (Excellence / Atouts) en deuxième -> GRIS (Égalités) en dernier
  const radarDimensions = React.useMemo(() => {
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

  return (
    <div className="space-y-4 select-none">
      {/* 1. Barre d'action Épurée : Choix du Pair */}
      <div className="flex justify-end pb-1">
        {/* Sélecteur du Pair épuré */}
        <div className="flex items-center gap-2 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-full px-3 py-1.5 border border-black/5 dark:border-white/5">
          <span className="text-xs font-medium text-zinc-500 shrink-0">
            Comparer avec :
          </span>
          <select
            value={selectedPeerId}
            onChange={(e) => {
              if (e.target.value === 'BENCHMARK') {
                setSelectedPeerId('BENCHMARK');
              } else {
                setSelectedPeerId(Number(e.target.value));
              }
              setLoading(true);
              setError(null);
            }}
            disabled={loading}
            className="bg-transparent border-none text-xs font-bold text-zinc-900 dark:text-white outline-none cursor-pointer max-w-[320px] pr-2"
          >
            {selectedPeerId === 'AUTO' && <option value="AUTO">Sélection du pair…</option>}
            {peers.map((p) => {
              const prefix = p.is_closest_twin
                ? `[Jumeau ${p.similarity_percentage}%] `
                : p.is_twin
                ? `[Pair ${p.similarity_percentage}%] `
                : '';
              return (
                <option key={p.id} value={p.id} className="bg-white dark:bg-[#2D2A2D]">
                  {prefix}{p.name}
                </option>
              );
            })}
            <option value="BENCHMARK" className="bg-white dark:bg-[#2D2A2D]">
              Moyenne du secteur
            </option>
          </select>
        </div>
      </div>

      {/* 2. État de Chargement / Erreur */}
      {loading ? (
        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <Icons.RefreshCw size={24} className="animate-spin text-[#4F6CE8]" />
          <span className="text-xs font-semibold text-zinc-500">
            Chargement de la comparaison...
          </span>
        </div>
      ) : error ? (
        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-xl p-6 text-center space-y-2">
          <p className="text-xs text-zinc-500">{error}</p>
        </div>
      ) : comparison ? (
        <>
          {/* 3. Comparaison Directe Minimaliste : Entreprise 1 vs Entreprise 2 */}
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-xl p-6 md:p-8 border border-black/5 dark:border-white/5 shadow-xs space-y-6">
            {/* Cartes d'En-tête Versus (2 colonnes aérées sans badge VS pour afficher le nom complet) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pb-4 border-b border-black/5 dark:border-white/5">
              {/* Entreprise 1 */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">

                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#4F6CE8]">
                    Entreprise  analysé
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
                    className={`text-xl font-black ${
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
                    Entreprise de Référence
                  </span>
                  {comparison.meta_b?.is_closest_twin && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#4F6CE8]/10 text-[#4F6CE8] border border-[#4F6CE8]/20">
                      Jumeau Vectoriel {comparison.meta_b?.similarity_percentage}%
                    </span>
                  )}
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
                  <span className="text-xl font-black text-zinc-900 dark:text-white">
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

            {comparison.meta_b?.is_twin && comparison.meta_b?.twin_rationale && (
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

            {/* Grille Match-Stats Face-à-face des Piliers Clés (Inspirée du tableau de bord de confrontation) */}
            <div className="space-y-2.5 pt-1">
              {radarDimensions.map((dim) => {
                const isDeficitA = dim.is_deficit_a !== undefined ? dim.is_deficit_a : dim.score_a !== null && dim.score_b !== null && dim.score_a < dim.score_b;
                const isWinnerA = dim.is_winner_a !== undefined ? dim.is_winner_a : dim.score_a !== null && dim.score_b !== null && dim.score_a > dim.score_b;
                const isWinnerB = dim.winner === 'B' || (!isWinnerA && !isDeficitA && dim.score_b !== null && dim.score_a !== null && dim.score_b > dim.score_a);

                const displayValA = dim.unit_val_a || `${dim.score_a}%`;
                const displayValB = dim.unit_val_b || `${dim.score_b}%`;

                return (
                  <div
                    key={dim.dimension_id}
                    className="grid grid-cols-12 items-center gap-2 md:gap-4 py-2.5 px-0.5 rounded-2xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Colonne Gauche : Entreprise Analysée (Pastille Match-Stats alignée à gauche sous le nom) */}
                    <div className="col-span-3 flex flex-col items-start justify-center text-left">
                      <span
                        className={`inline-flex items-center justify-center px-3.5 py-1.5 min-w-[72px] md:min-w-[88px] rounded-lg text-xs md:text-sm font-bold tracking-tight text-center transition-all ${
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
                        className={`inline-flex items-center justify-center px-3.5 py-1.5 min-w-[72px] md:min-w-[88px] rounded-lg text-xs md:text-sm font-bold tracking-tight text-center transition-all ${
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
            {/* {(comparison.gaps_a.length > 0 || comparison.advantages_a.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-black/5 dark:border-white/5">

                <div className="p-4 rounded-2xl bg-white dark:bg-[#242124] border border-black/5 dark:border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">

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
            )} */}
          </div>

          {/* 5. Tableau Comparatif Détaillé
          <section className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">
              Détail des caractéristiques comparées
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left border-collapse" aria-label="Tableau comparatif détaillé">
                <thead>
                  <tr className="text-[11px] text-zinc-500 dark:text-zinc-400 border-b border-black/5 dark:border-white/5">
                    <th scope="col" className="pb-3 pr-4 font-semibold">Caractéristique</th>
                    <th scope="col" className="pb-3 pr-4 font-semibold text-[#4F6CE8]">
                      {comparison.meta_a.name}
                    </th>
                    <th scope="col" className="pb-3 pr-4 font-semibold">
                      {comparison.meta_b.name}
                    </th>
                    <th scope="col" className="pb-3 font-semibold text-right">Avantage</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.criteria_breakdown.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors border-b border-black/5 dark:border-white/5 last:border-b-0"
                    >
                      <td className="py-3 pr-4 text-xs font-semibold text-zinc-900 dark:text-white">
                        {row.criterion}
                      </td>
                      <td className="py-3 pr-4 text-xs font-bold text-zinc-900 dark:text-white">
                        {row.val_a}
                      </td>
                      <td className="py-3 pr-4 text-xs text-zinc-600 dark:text-zinc-300">
                        {row.val_b}
                      </td>
                      <td className="py-3 text-xs font-bold text-right">
                        {row.winner === 'A' ? (
                          <span className="text-[#4F6CE8] dark:text-[#6885FF] bg-[#4F6CE8]/10 px-2 py-0.5 rounded-md">
                            {comparison.meta_a.name}
                          </span>
                        ) : row.winner === 'B' ? (
                          <span className="text-zinc-700 dark:text-zinc-300 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-md">
                            {comparison.meta_b.name}
                          </span>
                        ) : (
                          <span className="text-zinc-400">Égalité</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section> */}
        </>
      ) : null}
    </div>
  );
}
