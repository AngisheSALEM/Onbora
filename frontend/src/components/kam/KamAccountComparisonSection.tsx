"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';

interface PeerOption {
  id: number;
  name: string;
  city: string;
  overall_score: number;
}

interface SectorData {
  sector: string;
  count: number;
  enterprises: PeerOption[];
}

interface RadarItem {
  dimension_id: string;
  label: string;
  score_a: number;
  score_b: number;
  winner: 'A' | 'B' | 'TIE';
  delta: number;
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

interface ComparisonData {
  headline: string;
  sector: string;
  is_benchmark_comparison: boolean;
  winner: 'A' | 'B' | 'TIE';
  overall_score_a: number;
  overall_score_b: number;
  score_diff: number;
  meta_a: {
    id: number;
    name: string;
    sector: string;
    segment: string;
    employee_count: number;
    site_count: number;
    annual_revenue: number;
    current_connectivity: string;
    incident_count: number;
  };
  meta_b: {
    id: number | null;
    name: string;
    sector: string;
    segment: string;
    employee_count: number;
    site_count: number;
    annual_revenue: number;
    current_connectivity: string;
    incident_count: number;
  };
  radar: RadarItem[];
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
}

export default function KamAccountComparisonSection({
  enterpriseId,
  enterpriseName,
  sector,
}: KamAccountComparisonSectionProps) {
  const cleanId = String(enterpriseId).replace('account-', '').replace(/\D/g, '') || String(enterpriseId);
  const numericId = parseInt(cleanId, 10);

  // States
  const [peers, setPeers] = useState<PeerOption[]>([]);
  const [selectedPeerId, setSelectedPeerId] = useState<number | null>(null); // null = Moyenne du secteur
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedPitchIndex, setCopiedPitchIndex] = useState<number | null>(null);
  const [activeDimension, setActiveDimension] = useState<string | null>(null);

  // 1. Charger la liste des pairs du même secteur
  useEffect(() => {
    let isMounted = true;
    fetchAPI('/api/kam/comparisons/sectors/')
      .then((data) => {
        if (!isMounted) return;
        const allSectors: SectorData[] = data.sectors || [];
        const currentSectorName = sector || '';
        let matchedSector = allSectors.find(
          (s) => s.sector.toLowerCase() === currentSectorName.toLowerCase()
        );

        if (!matchedSector) {
          matchedSector = allSectors.find((s) =>
            s.enterprises.some((e) => e.id === numericId)
          );
        }

        if (matchedSector) {
          const eligiblePeers = matchedSector.enterprises.filter((e) => e.id !== numericId);
          setPeers(eligiblePeers);
          if (eligiblePeers.length > 0) {
            setSelectedPeerId(eligiblePeers[0].id);
          } else {
            setSelectedPeerId(null);
          }
        }
      })
      .catch((err) => {
        console.warn('Erreur chargement des pairs du secteur:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [sector, numericId]);

  // 2. Charger les données de comparaison
  const loadComparison = useCallback(async (aId: number, bId: number | null) => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/kam/comparisons/?enterprise_a=${aId}`;
      if (bId) {
        url += `&enterprise_b=${bId}`;
      }
      const data: ComparisonData = await fetchAPI(url);
      setComparison(data);
    } catch (err: any) {
      console.error('Erreur chargement comparatif:', err);
      setError(err?.message || 'Impossible de charger la comparaison.');
      setComparison(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isNaN(numericId)) {
      loadComparison(numericId, selectedPeerId);
    }
  }, [numericId, selectedPeerId, loadComparison]);

  // Copier le pitch KAM
  const handleCopyPitch = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedPitchIndex(index);
    setTimeout(() => setCopiedPitchIndex(null), 2500);
  };

  // Coordonnées pour le Radar SVG
  const radarDimensions = comparison?.radar || [];
  const size = 300;
  const center = size / 2;
  const radius = size * 0.36;

  const getCoordinates = (index: number, total: number, valueRatio: number) => {
    const angle = (Math.PI * 2 / total) * index - Math.PI / 2;
    const r = radius * Math.max(0.1, Math.min(1, valueRatio));
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const polygonAPoints = useMemo(() => {
    if (!radarDimensions.length) return '';
    return radarDimensions
      .map((item, i) => {
        const coords = getCoordinates(i, radarDimensions.length, item.score_a / 100);
        return `${coords.x},${coords.y}`;
      })
      .join(' ');
  }, [radarDimensions]);

  const polygonBPoints = useMemo(() => {
    if (!radarDimensions.length) return '';
    return radarDimensions
      .map((item, i) => {
        const coords = getCoordinates(i, radarDimensions.length, item.score_b / 100);
        return `${coords.x},${coords.y}`;
      })
      .join(' ');
  }, [radarDimensions]);

  return (
    <div className="space-y-6 select-none">
      {/* 1. Barre de Contrôle Minimaliste : Choix du Pair à Comparer */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-5 border border-black/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
            Benchmark & Analyse Sectorielle
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Secteur : {sector || comparison?.sector || 'Général'}
          </p>
        </div>

        {/* Sélecteur du Pair */}
        <div className="flex items-center gap-2 bg-[#ECEAE5] dark:bg-[#242124] rounded-full px-3 py-1.5 border-none">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Comparer avec :
          </span>
          <select
            value={selectedPeerId === null ? 'BENCHMARK' : selectedPeerId}
            onChange={(e) => {
              if (e.target.value === 'BENCHMARK') {
                setSelectedPeerId(null);
              } else {
                setSelectedPeerId(Number(e.target.value));
              }
            }}
            disabled={loading}
            className="bg-transparent border-none text-xs font-bold text-zinc-900 dark:text-white outline-none cursor-pointer pr-2"
          >
            <option value="BENCHMARK" className="bg-white dark:bg-[#2D2A2D]">
              Moyenne du secteur ({comparison?.sector || 'Benchmark'})
            </option>
            {peers.map((p) => (
              <option key={p.id} value={p.id} className="bg-white dark:bg-[#2D2A2D]">
                {p.name} ({p.overall_score} pts)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. État de Chargement / Erreur */}
      {loading ? (
        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-12 text-center flex flex-col items-center justify-center gap-3">
          <Icons.RefreshCw size={24} className="animate-spin text-[#4F6CE8]" />
          <span className="text-xs font-semibold text-zinc-500">
            Calcul de l'analyse comparative sectorielle...
          </span>
        </div>
      ) : error ? (
        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 text-center space-y-2">
          <p className="text-xs text-zinc-500">{error}</p>
        </div>
      ) : comparison ? (
        <>
          {/* 3. Titre Dynamique & Légende Minimaliste */}
          <div className="text-center py-1 space-y-2">
            <h4 className="text-lg md:text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
              {comparison.headline}
            </h4>

            <div className="flex items-center justify-center gap-6 text-xs font-semibold">
              <span className="text-zinc-900 dark:text-white">
                {comparison.meta_a.name} ({comparison.overall_score_a} pts)
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {comparison.meta_b.name} ({comparison.overall_score_b} pts)
              </span>
            </div>
          </div>

          {/* 4. Radar des 6 Piliers + Où il se démarque */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Radar Chart Minimaliste */}
            <div className="lg:col-span-5 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5 flex flex-col items-center justify-between shadow-sm">
              <div className="w-full flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Radar des 6 Piliers
                </span>
                {activeDimension && (
                  <button
                    onClick={() => setActiveDimension(null)}
                    className="text-[11px] text-[#4F6CE8] hover:underline cursor-pointer"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>

              <div className="relative flex items-center justify-center w-full max-w-[280px] aspect-square">
                <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
                  {[0.25, 0.5, 0.75, 1.0].map((step, idx) => (
                    <polygon
                      key={idx}
                      points={radarDimensions
                        .map((_, i) => {
                          const c = getCoordinates(i, radarDimensions.length, step);
                          return `${c.x},${c.y}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      className="text-black/5 dark:text-white/5"
                    />
                  ))}

                  {radarDimensions.map((dim, i) => {
                    const c = getCoordinates(i, radarDimensions.length, 1.0);
                    return (
                      <line
                        key={dim.dimension_id}
                        x1={center}
                        y1={center}
                        x2={c.x}
                        y2={c.y}
                        stroke="currentColor"
                        strokeWidth="1"
                        className="text-black/10 dark:text-white/10"
                      />
                    );
                  })}

                  <polygon
                    points={polygonBPoints}
                    fill="currentColor"
                    fillOpacity="0.08"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    className="text-zinc-400 dark:text-zinc-500"
                  />

                  <polygon
                    points={polygonAPoints}
                    fill="#4F6CE8"
                    fillOpacity="0.25"
                    stroke="#4F6CE8"
                    strokeWidth="2"
                  />

                  {radarDimensions.map((dim, i) => {
                    const cA = getCoordinates(i, radarDimensions.length, dim.score_a / 100);
                    const cB = getCoordinates(i, radarDimensions.length, dim.score_b / 100);
                    const cLabel = getCoordinates(i, radarDimensions.length, 1.22);
                    const isSelected = activeDimension === dim.dimension_id;

                    return (
                      <g key={dim.dimension_id}>
                        <circle cx={cB.x} cy={cB.y} r={3} fill="#A1A1AA" />
                        <circle
                          cx={cA.x}
                          cy={cA.y}
                          r={isSelected ? 5 : 3.5}
                          fill="#4F6CE8"
                          className="cursor-pointer"
                          onClick={() => setActiveDimension(isSelected ? null : dim.dimension_id)}
                        />
                        <text
                          x={cLabel.x}
                          y={cLabel.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          onClick={() => setActiveDimension(isSelected ? null : dim.dimension_id)}
                          className={`text-[9px] font-semibold cursor-pointer select-none ${
                            isSelected
                              ? 'fill-[#4F6CE8] font-bold'
                              : 'fill-zinc-600 dark:fill-zinc-400'
                          }`}
                        >
                          {dim.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t border-black/5 dark:border-white/5 text-center">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Connectivité</span>
                  <span className="text-base font-black text-[#4F6CE8]">
                    {radarDimensions.find((d) => d.dimension_id === 'connectivity')?.score_a || 0}/100
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Cybersécurité</span>
                  <span className="text-base font-black text-[#4F6CE8]">
                    {radarDimensions.find((d) => d.dimension_id === 'security')?.score_a || 0}/100
                  </span>
                </div>
              </div>
            </div>

            {/* Où il se démarque (Forces) */}
            <div className="lg:col-span-7 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                    Où il se démarque ({comparison.advantages_a.length} atout{comparison.advantages_a.length > 1 ? 's' : ''})
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Face à {comparison.meta_b.name}
                  </span>
                </div>

                {comparison.advantages_a.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-500">
                    Ce compte est au même niveau ou en retrait sur les critères actuels.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comparison.advantages_a.map((adv, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-[#ECEAE5] dark:bg-[#242124] flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">
                            {adv.criterion}
                          </span>
                          <span className="text-xs font-bold text-[#4F6CE8]">
                            {adv.value_main}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#4F6CE8] rounded-full"
                              style={{ width: `${adv.lead_percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-bold text-zinc-500 shrink-0">
                            devance {adv.lead_percentage}%
                          </span>
                        </div>

                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {adv.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. Ce qui lui manque (Lacunes & Vulnérabilités) */}
          <section className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Ce qui manque à {comparison.meta_a.name} ({comparison.gaps_a.length} point{comparison.gaps_a.length > 1 ? 's' : ''} à équiper)
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Points de vulnérabilité identifiés à transformer en propositions Orange Business.
                </p>
              </div>
            </div>

            {comparison.gaps_a.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500">
                Ce compte dispose déjà d'un équipement complet sans vulnérabilité majeure.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {comparison.gaps_a.map((gap, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#ECEAE5] dark:bg-[#242124] space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">
                          {gap.issue}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-400">
                          {gap.severity === 'CRITICAL' ? 'Priorité 1' : gap.severity === 'HIGH' ? 'Priorité 2' : 'Priorité 3'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        {gap.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-black/5 dark:border-white/5 text-[11px] font-semibold text-[#4F6CE8] dark:text-[#6885FF]">
                      <span>Offre Orange Business : {gap.solution_recommended}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 6. Pitch & Recommandations KAM */}
          {comparison.kam_recommendations.length > 0 && (
            <section className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5 shadow-sm space-y-4">
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Argumentaires de négociation prêts à l'emploi (Pitchs KAM)
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Éléments de discours basés sur les standards sectoriels pour aborder le DSI ou le DG.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {comparison.kam_recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#ECEAE5] dark:bg-[#242124] flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">
                          Cible : {rec.target_enterprise}
                        </span>
                        <span className="text-[10px] font-bold text-[#4F6CE8] uppercase">
                          Upsell Recommandé
                        </span>
                      </div>
                      <div className="p-2.5 bg-white/70 dark:bg-black/20 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {rec.solution_title}
                      </div>
                      <p className="text-xs italic text-zinc-600 dark:text-zinc-300 leading-relaxed">
                        {rec.pitch_argument}
                      </p>
                    </div>

                    <div className="flex items-center justify-end pt-1">
                      <button
                        onClick={() => handleCopyPitch(rec.pitch_argument, idx)}
                        className="px-3 py-1.5 rounded-lg bg-[#4F6CE8] hover:bg-[#3D57C5] text-white text-xs font-semibold transition-all cursor-pointer"
                      >
                        <span>{copiedPitchIndex === idx ? 'Pitch copié !' : 'Copier le pitch'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 7. Tableau Comparatif Détaillé */}
          <section className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5 shadow-sm">
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
          </section>
        </>
      ) : null}
    </div>
  );
}
