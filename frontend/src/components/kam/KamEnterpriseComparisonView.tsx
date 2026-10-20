"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';

interface SectorEnterprise {
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
  meta_a: SectorEnterprise;
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

export default function KamEnterpriseComparisonView() {
  const router = useRouter();
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
  const [copiedPitchIndex, setCopiedPitchIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'gaps' | 'criteria'>('overview');

  // 1. Charger la liste des secteurs & entreprises
  useEffect(() => {
    let isMounted = true;
    setLoadingSectors(true);
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
  const loadComparison = useCallback(async (aId: number, bId: number | null) => {
    setLoadingComparison(true);
    setError(null);
    try {
      let url = `/api/kam/comparisons/?enterprise_a=${aId}`;
      if (bId) {
        url += `&enterprise_b=${bId}`;
      }
      const data: ComparisonData = await fetchAPI(url);
      setComparison(data);
    } catch (err: any) {
      console.error('Erreur comparateur KAM:', err);
      setError(err.message || 'Erreur lors de la comparaison.');
      setComparison(null);
    } finally {
      setLoadingComparison(false);
    }
  }, []);

  useEffect(() => {
    if (enterpriseAId) {
      loadComparison(enterpriseAId, enterpriseBId);
    }
  }, [enterpriseAId, enterpriseBId, loadComparison]);

  // Inverser A et B
  const handleSwap = () => {
    if (enterpriseAId && enterpriseBId) {
      const prevA = enterpriseAId;
      setEnterpriseAId(enterpriseBId);
      setEnterpriseBId(prevA);
    }
  };

  // Copier le pitch KAM
  const handleCopyPitch = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedPitchIndex(index);
    setTimeout(() => setCopiedPitchIndex(null), 2500);
  };

  // Coordonnées pour le Radar SVG
  const radarDimensions = comparison?.radar || [];
  const size = 320;
  const center = size / 2;
  const radius = size * 0.38;

  // Calcul des polygones pour le radar
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
            Analysez les écarts concurrentiels entre deux entreprises d'un même secteur pour identifier les manques et opportunités d'upsell.
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
              {currentSectorEnterprises
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
          <Icons.Sparkles size={32} className="animate-spin text-[#4F6CE8]" />
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Calcul de l'analyse comparative sectorielle...
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
                <span className="text-zinc-900 dark:text-white">{comparison.meta_a.name} ({comparison.overall_score_a} pts)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1 bg-zinc-400 dark:bg-zinc-500 rounded-full"></span>
                <span className="text-zinc-500 dark:text-zinc-400">{comparison.meta_b.name} ({comparison.overall_score_b} pts)</span>
              </div>
            </div>
          </div>

          {/* 4. Coeur Comparatif : Radar Chart (Gauche) + Où il se démarque (Droite) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Colonne Gauche : Radar Chart Interactif */}
            <div className="lg:col-span-5 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5 flex flex-col items-center justify-between shadow-sm">
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Radar des 6 Piliers
                </span>
                {activeDimension && (
                  <button
                    onClick={() => setActiveDimension(null)}
                    className="text-[11px] text-[#4F6CE8] hover:underline cursor-pointer"
                  >
                    Réinitialiser le filtre
                  </button>
                )}
              </div>

              {/* Rendu SVG du Radar Chart */}
              <div className="relative flex items-center justify-center w-full max-w-[340px] aspect-square">
                <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
                  {/* Cercles / Toiles concentriques */}
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

                  {/* Rayons / Axes */}
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

                  {/* Polygone Entreprise B (Gris / Pointillé) */}
                  <polygon
                    points={polygonBPoints}
                    fill="currentColor"
                    fillOpacity="0.08"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    className="text-zinc-400 dark:text-zinc-500 transition-all duration-300"
                  />

                  {/* Polygone Entreprise A (Bleu Cobalt Onbora) */}
                  <polygon
                    points={polygonAPoints}
                    fill="#4F6CE8"
                    fillOpacity="0.25"
                    stroke="#4F6CE8"
                    strokeWidth="2.5"
                    className="transition-all duration-300"
                  />

                  {/* Sommets cliquables & Infobulles */}
                  {radarDimensions.map((dim, i) => {
                    const cA = getCoordinates(i, radarDimensions.length, dim.score_a / 100);
                    const cB = getCoordinates(i, radarDimensions.length, dim.score_b / 100);
                    const cLabel = getCoordinates(i, radarDimensions.length, 1.18);
                    const isSelected = activeDimension === dim.dimension_id;

                    return (
                      <g key={dim.dimension_id}>
                        {/* Point B */}
                        <circle cx={cB.x} cy={cB.y} r={3} fill="#A1A1AA" />
                        {/* Point A */}
                        <circle
                          cx={cA.x}
                          cy={cA.y}
                          r={isSelected ? 6 : 4}
                          fill="#4F6CE8"
                          className="cursor-pointer transition-all hover:scale-125"
                          onClick={() => setActiveDimension(isSelected ? null : dim.dimension_id)}
                        />
                        {/* Label Axe */}
                        <text
                          x={cLabel.x}
                          y={cLabel.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          onClick={() => setActiveDimension(isSelected ? null : dim.dimension_id)}
                          className={`text-[9px] md:text-[10px] font-semibold cursor-pointer select-none transition-colors ${
                            isSelected
                              ? 'fill-[#4F6CE8] font-bold'
                              : 'fill-zinc-600 dark:fill-zinc-400 hover:fill-zinc-900 dark:hover:fill-white'
                          }`}
                        >
                          {dim.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Indicateur de score en bas du radar */}
              <div className="w-full grid grid-cols-2 gap-2 mt-4 pt-3 text-center border-t border-black/5 dark:border-white/5">
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase">Indice Connectivité A</span>
                  <span className="text-lg font-black text-[#4F6CE8]">
                    {radarDimensions.find((d) => d.dimension_id === 'connectivity')?.score_a || 0}/100
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase">Indice Cybersécurité A</span>
                  <span className="text-lg font-black text-[#4F6CE8]">
                    {radarDimensions.find((d) => d.dimension_id === 'security')?.score_a || 0}/100
                  </span>
                </div>
              </div>
            </div>

            {/* Colonne Droite : Où il se démarque (Style Versus) */}
            <div className="lg:col-span-7 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                      Où il se démarque
                    </span>
                    <span className="text-[10px] bg-[#4F6CE8]/10 text-[#4F6CE8] dark:text-[#6885FF] font-bold px-2 py-0.5 rounded-full">
                      {comparison.advantages_a.length} atout{comparison.advantages_a.length > 1 ? 's' : ''} clé{comparison.advantages_a.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Face à {comparison.meta_b.name}
                  </span>
                </div>

                {comparison.advantages_a.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    Aucun écart majeur détecté en faveur de cette entreprise sur les critères actuels.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comparison.advantages_a.map((adv, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-[#ECEAE5] dark:bg-[#242124] flex flex-col gap-2 transition-all hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">
                            {adv.criterion}
                          </span>
                          <span className="text-xs font-bold text-[#4F6CE8] dark:text-[#6885FF]">
                            {adv.value_main}
                          </span>
                        </div>

                        {/* Barre de progression & Pourcentage d'avance */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#4F6CE8] rounded-full transition-all duration-500"
                              style={{ width: `${adv.lead_percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 shrink-0">
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

              {/* Bouton pour basculer vers les manques */}
              <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">
                  Découvrez les vulnérabilités exploitables par le KAM
                </span>
                <button
                  onClick={() => setActiveTab('gaps')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4F6CE8] hover:underline cursor-pointer"
                >
                  <span>Voir ce qui lui manque</span>
                  <Icons.ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* 5. Navigation par Onglets de Détails (Ce qui lui manque / Plan d'Action KAM / Tableau Complet) */}
          <div className="flex items-center gap-2 pt-2">
            {[
              { id: 'overview' as const, label: 'Tableau Comparatif & Caractéristiques', icon: Icons.List },
              { id: 'gaps' as const, label: 'Ce qui lui manque (Lacunes & Vulnérabilités)', icon: Icons.AlertTriangle },
              { id: 'criteria' as const, label: 'Recommandations & Pitch KAM', icon: Icons.Award },
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
                            <span className="text-zinc-400 dark:text-zinc-500">Égalité</span>
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
                    Félicitations ! Aucune vulnérabilité majeure identifiée sur ce compte.
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
                          <Icons.Sparkles size={12} />
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
                    Aucune vulnérabilité identifiée ou benchmark conforme.
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
                          <Icons.Sparkles size={12} />
                          <span>Offre Orange Business : {gap.solution_recommended}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Onglet 3 : Recommandations & Pitch KAM */}
          {activeTab === 'criteria' && (
            <section className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Argumentaires de négociation prêts à l'emploi (Pitchs KAM)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Utilisez ces éléments de langage valorisant les standards sectoriels pour convertir les manques constatés en contrats signés.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {comparison.kam_recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-[#ECEAE5] dark:bg-[#242124] flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-zinc-900 dark:text-white">
                          Cible : {rec.target_enterprise}
                        </span>
                        <span className="text-[10px] font-bold text-[#4F6CE8] dark:text-[#6885FF] uppercase">
                          Opportunité d'Upsell
                        </span>
                      </div>
                      <div className="p-3 bg-white/70 dark:bg-black/20 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {rec.solution_title}
                      </div>
                      <p className="text-xs italic text-zinc-600 dark:text-zinc-300 leading-relaxed pt-1">
                        {rec.pitch_argument}
                      </p>
                    </div>

                    <div className="flex items-center justify-end pt-2">
                      <button
                        onClick={() => handleCopyPitch(rec.pitch_argument, idx)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4F6CE8] hover:bg-[#3D57C5] text-white text-xs font-semibold transition-all cursor-pointer"
                      >
                        {copiedPitchIndex === idx ? (
                          <>
                            <Icons.CheckCheck size={13} />
                            <span>Pitch copié !</span>
                          </>
                        ) : (
                          <>
                            <Icons.Copy size={13} />
                            <span>Copier l'argumentaire</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
