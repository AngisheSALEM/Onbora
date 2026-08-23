"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from '@/components/shared/Icons';

interface FunnelStage {
  id: string;
  name: string;
  subtitle: string;
  count: number;
  percentage: number;
  drop_rate: number;
  color: string;
}

interface DropOffReason {
  reason: string;
  count: number;
  percentage: number;
  severity: 'CRITICAL' | 'WARNING' | 'NORMAL';
}

interface DropOffMetrics {
  total_unconverted: number;
  overall_drop_rate: number;
  critical_abandon_count: number;
  pipeline_recovery_potential: string;
  top_reasons: DropOffReason[];
}

interface UnconvertedClient {
  id: number;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  source: 'INBOUND' | 'OUTBOUND';
  status: string;
  status_display: string;
  drop_off_stage: string;
  days_inactive: number;
  urgency: 'CRITICAL' | 'WARNING' | 'NORMAL';
  conversion_score: number;
  estimated_mrr: string;
  recommended_action: string;
  assigned_kam: string;
  sector: string;
}

interface TimelinePoint {
  date: string;
  day: string;
  inbound: number;
  outbound: number;
  conversions: number;
  dropoffs: number;
  volume: number;
}

interface ZoneMetric {
  zone: string;
  leads: number;
  conversions: number;
  unconverted: number;
  mrr: string;
}

interface SectorMetric {
  sector: string;
  count: number;
  percentage: number;
}

interface LogEvent {
  id: number;
  event_type: string;
  event_type_display: string;
  description: string;
  user: string;
  created_at: string;
  metadata?: any;
}

export interface BackOfficeData {
  total_dossiers: number;
  inbound_count: number;
  outbound_count: number;
  conversion_rate: number;
  status_counts: {
    NEW: number;
    IN_REVIEW: number;
    ACCEPTED: number;
  };
  funnel_stages?: FunnelStage[];
  drop_off_metrics?: DropOffMetrics;
  unconverted_clients?: UnconvertedClient[];
  activity_timeline?: TimelinePoint[];
  zone_distribution?: ZoneMetric[];
  sector_distribution?: SectorMetric[];
  kpis?: {
    avg_cycle_days: number;
    pipeline_potential_arr: string;
    active_kam_count: number;
    fastest_conversion: string;
    average_deal_mrr: string;
    active_plaques_count: number;
  };
  recent_logs?: LogEvent[];
}

interface BackOfficeDashboardProps {
  initialData?: BackOfficeData | null;
  onRefresh?: () => Promise<void>;
  onSelectClient?: (clientId: number) => void;
}

export default function BackOfficeDashboard({
  initialData,
  onRefresh,
  onSelectClient
}: BackOfficeDashboardProps) {
  const [data, setData] = useState<BackOfficeData | null>(initialData || null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'funnel' | 'dropoffs' | 'territories' | 'audit'>('overview');

  // Chart Filters & Interaction States
  const [timelinePeriod, setTimelinePeriod] = useState<'7d' | '14d' | '30d'>('7d');
  const [chartMetric, setChartMetric] = useState<'all' | 'inbound' | 'outbound' | 'conversions'>('all');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Unconverted Clients Search & Filter States
  const [dropOffFilter, setDropOffFilter] = useState<'ALL' | 'CRITICAL' | 'INCOMPLETE_KYC' | 'ESTIMATE_PENDING' | 'AI_DROPOFF'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientModal, setSelectedClientModal] = useState<UnconvertedClient | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [whatsappDraftMessage, setWhatsappDraftMessage] = useState('');

  // Sync data when initialData prop changes
  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  const handleManualRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const handleOpenActionModal = (client: UnconvertedClient) => {
    setSelectedClientModal(client);
    let defaultMsg = `Bonjour ${client.contact_name}, nous revenons vers vous concernant le dossier de votre entreprise ${client.company_name} chez Orange Onbora. `;
    if (client.drop_off_stage.toLowerCase().includes('rccm') || client.drop_off_stage.toLowerCase().includes('incomplet')) {
      defaultMsg += `Il nous manque uniquement votre document RCCM pour finaliser l'activation de votre offre. Pouvez-vous nous le transmettre par retour de message ?`;
    } else if (client.drop_off_stage.toLowerCase().includes('devis') || client.drop_off_stage.toLowerCase().includes('proposition')) {
      defaultMsg += `Votre proposition commerciale personnalisée (${client.estimated_mrr}) est disponible. Avez-vous des questions sur les débits ou les modalités d'installation ?`;
    } else {
      defaultMsg += `Souhaitez-vous planifier un échange de 5 minutes avec notre conseiller pour faire le point sur vos besoins ?`;
    }
    setWhatsappDraftMessage(defaultMsg);
  };

  const handleSendWhatsApp = (client: UnconvertedClient) => {
    const cleanPhone = client.phone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(whatsappDraftMessage);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    setActionSuccessMsg(`Relance WhatsApp envoyée à ${client.contact_name} !`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
    setSelectedClientModal(null);
  };

  // Filtered Unconverted Clients
  const filteredClients = useMemo(() => {
    if (!data?.unconverted_clients) return [];
    return data.unconverted_clients.filter(client => {
      const matchSearch =
        client.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.assigned_kam.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (dropOffFilter === 'CRITICAL') return client.urgency === 'CRITICAL' || client.days_inactive >= 5;
      if (dropOffFilter === 'INCOMPLETE_KYC') return client.drop_off_stage.toLowerCase().includes('rccm') || client.drop_off_stage.toLowerCase().includes('bloqué') || client.drop_off_stage.toLowerCase().includes('manquant');
      if (dropOffFilter === 'ESTIMATE_PENDING') return client.status === 'ESTIMATE_PREPARED' || client.drop_off_stage.toLowerCase().includes('devis');
      if (dropOffFilter === 'AI_DROPOFF') return client.status === 'QUALIFYING' || client.drop_off_stage.toLowerCase().includes('diagnostic');
      return true;
    });
  }, [data?.unconverted_clients, dropOffFilter, searchQuery]);

  if (!data) {
    return (
      <div className="w-full h-80 rounded-2xl flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-900/40 text-zinc-400 gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold">Chargement des indicateurs et graphiques Back-Office...</span>
      </div>
    );
  }

  // Calculate SVG Graph Coordinates dynamically
  const timeline = data.activity_timeline || [
    { date: "Lun", day: "17 Aoû", inbound: 5, outbound: 8, conversions: 2, dropoffs: 1, volume: 13 },
    { date: "Mar", day: "18 Aoû", inbound: 7, outbound: 11, conversions: 3, dropoffs: 2, volume: 18 },
    { date: "Mer", day: "19 Aoû", inbound: 9, outbound: 14, conversions: 4, dropoffs: 2, volume: 23 },
    { date: "Jeu", day: "20 Aoû", inbound: 6, outbound: 12, conversions: 2, dropoffs: 3, volume: 18 },
    { date: "Ven", day: "21 Aoû", inbound: 12, outbound: 16, conversions: 5, dropoffs: 2, volume: 28 },
    { date: "Sam", day: "22 Aoû", inbound: 8, outbound: 6, conversions: 3, dropoffs: 1, volume: 14 },
    { date: "Dim", day: "23 Aoû", inbound: 4, outbound: 2, conversions: 1, dropoffs: 0, volume: 6 }
  ];

  const maxVal = Math.max(...timeline.map(t => Math.max(t.volume, t.inbound + t.outbound, 25)));
  const svgWidth = 700;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;

  const getX = (index: number) => paddingX + (index / (timeline.length - 1)) * chartW;
  const getY = (val: number) => paddingY + chartH - (val / maxVal) * chartH;

  // Build SVG Path Strings
  const inboundPoints = timeline.map((t, i) => `${getX(i)},${getY(t.inbound)}`).join(' ');
  const outboundPoints = timeline.map((t, i) => `${getX(i)},${getY(t.outbound)}`).join(' ');
  const conversionPoints = timeline.map((t, i) => `${getX(i)},${getY(t.conversions)}`).join(' ');

  const inboundAreaPath = `M ${getX(0)},${paddingY + chartH} L ${timeline.map((t, i) => `${getX(i)},${getY(t.inbound)}`).join(' L ')} L ${getX(timeline.length - 1)},${paddingY + chartH} Z`;
  const outboundAreaPath = `M ${getX(0)},${paddingY + chartH} L ${timeline.map((t, i) => `${getX(i)},${getY(t.outbound)}`).join(' L ')} L ${getX(timeline.length - 1)},${paddingY + chartH} Z`;

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce">
          <Icons.Check size={18} />
          <span className="text-xs font-bold">{actionSuccessMsg}</span>
        </div>
      )}

      {/* Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h2 className="text-lg font-black text-zinc-950 dark:text-white tracking-tight">
              Console d'Activité & Entonnoir de Conversion Back-Office
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Surveillance en temps réel des flux commerciaux, diagnostics d'architecture et relance des abandons.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tabs pills */}
          <div className="flex bg-zinc-200/70 dark:bg-zinc-800/60 p-1 rounded-xl">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'overview'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Vue d'ensemble
            </button>
            <button
              onClick={() => setActiveSubTab('funnel')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'funnel'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Entonnoir
            </button>
            <button
              onClick={() => setActiveSubTab('dropoffs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
                activeSubTab === 'dropoffs'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Abandons
              {data.drop_off_metrics && data.drop_off_metrics.critical_abandon_count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[9px] font-black">
                  {data.drop_off_metrics.critical_abandon_count}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('territories')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'territories'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Plaques
            </button>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl text-zinc-600 dark:text-zinc-300 transition-all"
            title="Rafraîchir les métriques"
          >
            <Icons.RefreshCw size={15} className={isRefreshing ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>
      </div>

      {/* 1. KEY METRIC CARDS (HERO KPIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Prospects */}
        <div className="studio-card p-5 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Prospects Totaux</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Icons.Users size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-zinc-950 dark:text-white">{data.total_dossiers}</span>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center">
                <Icons.TrendingUp size={12} className="mr-0.5" /> +24% ce mois
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[11px] font-medium text-zinc-500">
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold">
                Inbound: {data.inbound_count}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold">
                Outbound: {data.outbound_count}
              </span>
            </div>
          </div>
        </div>

        {/* Global Conversion Rate */}
        <div className="studio-card p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Taux de Conversion</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Icons.Target size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-zinc-950 dark:text-white">{data.conversion_rate}%</span>
              <span className="text-[11px] text-zinc-400 font-medium">Objectif : 25%</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="bg-gradient-to-r from-emerald-500 to-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(data.conversion_rate * 3, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Unconverted & Recovery Potential */}
        <div className="studio-card p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Clients Non-Convertis</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Icons.AlertTriangle size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
                {data.drop_off_metrics?.total_unconverted || (data.total_dossiers - data.status_counts.ACCEPTED)}
              </span>
              <span className="text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-extrabold">
                {data.drop_off_metrics?.critical_abandon_count || 4} critiques
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1 font-medium">
              Potentiel à récupérer : <strong className="text-zinc-900 dark:text-white">{data.drop_off_metrics?.pipeline_recovery_potential || "48 500 $ MRR"}</strong>
            </p>
          </div>
        </div>

        {/* Velocity & Deal Size */}
        <div className="studio-card p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Vélocité & Panier Moyen</span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Icons.Zap size={16} />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-zinc-950 dark:text-white">
                {data.kpis?.avg_cycle_days || 3.8} <span className="text-xs font-bold text-zinc-400">jours</span>
              </span>
              <span className="text-xs font-black text-purple-600 dark:text-purple-400">
                {data.kpis?.average_deal_mrr || "750 $"} /m
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-2 font-medium">
              Pipeline total : <strong className="text-zinc-900 dark:text-white">{data.kpis?.pipeline_potential_arr || "148 500 $ ARR"}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE ACTIVITY TIMELINE CHART */}
      {(activeSubTab === 'overview' || activeSubTab === 'territories') && (
        <div className="studio-card p-6 shadow-sm flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Icons.LineChart size={18} className="text-blue-600" />
                <h3 className="text-sm font-black text-zinc-950 dark:text-white uppercase tracking-wider">
                  Courbe d'Activité & Déploiement des Visites
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Évolution journalière des leads en ligne (Inbound) vs visites terrain des commerciaux (Outbound).
              </p>
            </div>

            {/* Metric toggles */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setChartMetric('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  chartMetric === 'all'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                }`}
              >
                Tous les flux
              </button>
              <button
                onClick={() => setChartMetric('inbound')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  chartMetric === 'inbound'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Inbound
              </button>
              <button
                onClick={() => setChartMetric('outbound')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  chartMetric === 'outbound'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Outbound
              </button>
              <button
                onClick={() => setChartMetric('conversions')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  chartMetric === 'conversions'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-500" /> Signatures
              </button>
            </div>
          </div>

          {/* SVG Visual Graph Container */}
          <div className="relative w-full h-[240px] bg-zinc-50/60 dark:bg-zinc-950/40 rounded-2xl p-2 border border-zinc-200/60 dark:border-zinc-800/40 flex items-center justify-center">
            <svg
              className="w-full h-full overflow-visible"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="gradient-inbound" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="gradient-outbound" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                <line
                  key={i}
                  x1={paddingX}
                  y1={paddingY + chartH * pct}
                  x2={svgWidth - paddingX}
                  y2={paddingY + chartH * pct}
                  stroke="currentColor"
                  className="text-zinc-200 dark:text-zinc-800/80"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Area Fills */}
              {(chartMetric === 'all' || chartMetric === 'inbound') && (
                <path d={inboundAreaPath} fill="url(#gradient-inbound)" />
              )}
              {(chartMetric === 'all' || chartMetric === 'outbound') && (
                <path d={outboundAreaPath} fill="url(#gradient-outbound)" />
              )}

              {/* Inbound Line (Blue) */}
              {(chartMetric === 'all' || chartMetric === 'inbound') && (
                <polyline
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={inboundPoints}
                />
              )}

              {/* Outbound Line (Emerald) */}
              {(chartMetric === 'all' || chartMetric === 'outbound') && (
                <polyline
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={outboundPoints}
                />
              )}

              {/* Conversions Line (Purple) */}
              {(chartMetric === 'all' || chartMetric === 'conversions') && (
                <polyline
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="2.5"
                  strokeDasharray="5 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={conversionPoints}
                />
              )}

              {/* Interactive Dots & Cursor */}
              {timeline.map((point, index) => {
                const cx = getX(index);
                const cyInbound = getY(point.inbound);
                const cyOutbound = getY(point.outbound);
                const isHovered = hoveredPointIndex === index;

                return (
                  <g key={index} onMouseEnter={() => setHoveredPointIndex(index)} onMouseLeave={() => setHoveredPointIndex(null)} className="cursor-pointer">
                    {isHovered && (
                      <line
                        x1={cx}
                        y1={paddingY}
                        x2={cx}
                        y2={paddingY + chartH}
                        stroke="#71717A"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    )}

                    {(chartMetric === 'all' || chartMetric === 'inbound') && (
                      <circle
                        cx={cx}
                        cy={cyInbound}
                        r={isHovered ? 6 : 4}
                        fill="#FFFFFF"
                        stroke="#2563EB"
                        strokeWidth={isHovered ? 3 : 2}
                        className="transition-all"
                      />
                    )}

                    {(chartMetric === 'all' || chartMetric === 'outbound') && (
                      <circle
                        cx={cx}
                        cy={cyOutbound}
                        r={isHovered ? 6 : 4}
                        fill="#FFFFFF"
                        stroke="#10B981"
                        strokeWidth={isHovered ? 3 : 2}
                        className="transition-all"
                      />
                    )}

                    {/* Date Label on X Axis */}
                    <text
                      x={cx}
                      y={svgHeight - 8}
                      textAnchor="middle"
                      className={`text-[10px] font-bold ${isHovered ? 'fill-blue-600 font-extrabold' : 'fill-zinc-400'}`}
                    >
                      {point.date}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Floating Tooltip when hovering over a day */}
            {hoveredPointIndex !== null && timeline[hoveredPointIndex] && (
              <div
                className="absolute top-4 bg-zinc-900/95 text-white dark:bg-zinc-800/95 p-3 rounded-xl shadow-2xl backdrop-blur-md border border-zinc-700/50 pointer-events-none transition-all z-20 text-xs flex flex-col gap-1.5"
                style={{
                  left: `${(hoveredPointIndex / (timeline.length - 1)) * 80 + 10}%`
                }}
              >
                <div className="font-black text-zinc-300 border-b border-zinc-700 pb-1 flex justify-between gap-4">
                  <span>{timeline[hoveredPointIndex].date} ({timeline[hoveredPointIndex].day})</span>
                  <span className="text-blue-400 font-bold">{timeline[hoveredPointIndex].volume} activités</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] pt-0.5">
                  <span className="text-blue-400 font-medium">Inbound : <strong>{timeline[hoveredPointIndex].inbound}</strong></span>
                  <span className="text-emerald-400 font-medium">Outbound : <strong>{timeline[hoveredPointIndex].outbound}</strong></span>
                  <span className="text-purple-400 font-medium">Signatures : <strong>{timeline[hoveredPointIndex].conversions}</strong></span>
                  <span className="text-red-400 font-medium">Abandons : <strong>{timeline[hoveredPointIndex].dropoffs}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Timeline Summary Mini-cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 flex flex-col">
              <span className="text-[10px] text-zinc-500 font-extrabold uppercase">Pic d'activité</span>
              <span className="text-sm font-black text-zinc-900 dark:text-white mt-0.5">Vendredi (28 dossiers)</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 flex flex-col">
              <span className="text-[10px] text-zinc-500 font-extrabold uppercase">Ratio Inbound / Outbound</span>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {Math.round((data.inbound_count / (data.inbound_count + data.outbound_count || 1)) * 100)}% / {Math.round((data.outbound_count / (data.inbound_count + data.outbound_count || 1)) * 100)}%
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 flex flex-col">
              <span className="text-[10px] text-zinc-500 font-extrabold uppercase">Génération Devis IA</span>
              <span className="text-sm font-black text-purple-600 dark:text-purple-400 mt-0.5">94% auto-calculés</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 flex flex-col">
              <span className="text-[10px] text-zinc-500 font-extrabold uppercase">Temps moyen de signature</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {data.kpis?.avg_cycle_days || 3.8} jours
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. VISUAL CONVERSION FUNNEL & STEP DROP-OFFS */}
      {(activeSubTab === 'overview' || activeSubTab === 'funnel') && data.funnel_stages && (
        <div className="studio-card p-6 shadow-sm flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <Icons.Layers size={18} className="text-blue-600" />
                <h3 className="text-sm font-black text-zinc-950 dark:text-white uppercase tracking-wider">
                  Entonnoir de Conversion & Goulots d'Étranglement (Drop-Off Pipeline)
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Visualisez chaque étape de conversion et identifiez précisément où les clients abandonnent leur parcours.
              </p>
            </div>
            <span className="text-[10px] bg-blue-600/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full font-black">
              5 Étapes Clés
            </span>
          </div>

          {/* Visual Funnel Step Sequence */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
            {data.funnel_stages.map((stage, idx) => {
              const isLast = idx === data.funnel_stages!.length - 1;
              return (
                <div
                  key={stage.id}
                  onClick={() => {
                    if (stage.id === 'identified' || stage.id === 'qualified') setDropOffFilter('AI_DROPOFF');
                    else if (stage.id === 'proposal') setDropOffFilter('ESTIMATE_PENDING');
                    else if (stage.id === 'negotiation') setDropOffFilter('CRITICAL');
                    else setDropOffFilter('ALL');
                    setActiveSubTab('dropoffs');
                  }}
                  className="studio-subcard p-4 rounded-2xl flex flex-col justify-between border-2 border-transparent hover:border-blue-500/30 transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase text-zinc-500 group-hover:text-blue-600 transition-colors">
                      {stage.name}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                  </div>

                  <div className="my-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-zinc-900 dark:text-white">{stage.count}</span>
                      <span className="text-xs font-bold text-zinc-400">({stage.percentage}%)</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 line-clamp-2 mt-1 font-medium">{stage.subtitle}</p>
                  </div>

                  {/* Progress Gauge & Drop-off indicator */}
                  <div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${stage.percentage}%`, backgroundColor: stage.color }}
                      />
                    </div>

                    {!isLast && stage.drop_rate > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/50 flex justify-between items-center text-[10px]">
                        <span className="text-red-500 font-bold flex items-center gap-1">
                          <Icons.TrendingDown size={11} /> -{stage.drop_rate}%
                        </span>
                        <span className="text-zinc-400 font-medium">perte à l'étape</span>
                      </div>
                    )}

                    {isLast && (
                      <div className="mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/50 flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        <span>Objectif atteint</span>
                        <Icons.CheckCircle2 size={13} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top Drop-Off Reasons Breakdown */}
          {data.drop_off_metrics?.top_reasons && (
            <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/40 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Icons.AlertCircle size={14} className="text-amber-500" />
                  Causes Principales d'Abandons & Points de Blocage
                </span>
                <span className="text-[11px] text-zinc-500 font-medium">
                  {data.drop_off_metrics.total_unconverted} dossiers non finalisés
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.drop_off_metrics.top_reasons.map((r, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      if (r.reason.toLowerCase().includes('rccm')) setDropOffFilter('INCOMPLETE_KYC');
                      else if (r.reason.toLowerCase().includes('devis')) setDropOffFilter('ESTIMATE_PENDING');
                      else if (r.reason.toLowerCase().includes('diagnostic')) setDropOffFilter('AI_DROPOFF');
                      setActiveSubTab('dropoffs');
                    }}
                    className="p-3 bg-white dark:bg-zinc-900 rounded-xl shadow-xs border border-zinc-200/50 dark:border-zinc-800/50 flex flex-col justify-between hover:border-blue-500/40 cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2">{r.reason}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                        r.severity === 'CRITICAL'
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                          : r.severity === 'WARNING'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      }`}>
                        {r.count} cas
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-2">
                      <span>Impact sur le funnel : <strong>{r.percentage}%</strong></span>
                      <span className="text-blue-600 font-bold hover:underline flex items-center">
                        Relancer <Icons.ChevronRight size={10} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. ACTION CENTER: CLIENTS NON-CONVERTIS & ABANDONS */}
      {(activeSubTab === 'overview' || activeSubTab === 'dropoffs') && (
        <div className="studio-card p-6 shadow-sm flex flex-col gap-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Icons.UserMinus size={18} className="text-amber-500" />
                <h3 className="text-sm font-black text-zinc-950 dark:text-white uppercase tracking-wider">
                  Centre d'Action : Clients Non-Convertis & Abandons ({filteredClients.length})
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Relancez en 1 clic les prospects bloqués ou en attente d'une action pour maximiser le taux de closing.
              </p>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-56">
                <Icons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Rechercher entreprise, KAM..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex bg-zinc-200/70 dark:bg-zinc-800/60 p-1 rounded-xl text-[11px] font-bold">
                <button
                  onClick={() => setDropOffFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    dropOffFilter === 'ALL'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-500'
                  }`}
                >
                  Tous ({data.unconverted_clients?.length || 0})
                </button>
                <button
                  onClick={() => setDropOffFilter('CRITICAL')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    dropOffFilter === 'CRITICAL'
                      ? 'bg-red-500 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-red-500'
                  }`}
                >
                  Critiques (&gt;5j)
                </button>
                <button
                  onClick={() => setDropOffFilter('INCOMPLETE_KYC')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    dropOffFilter === 'INCOMPLETE_KYC'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-amber-500'
                  }`}
                >
                  KYC / RCCM
                </button>
                <button
                  onClick={() => setDropOffFilter('ESTIMATE_PENDING')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    dropOffFilter === 'ESTIMATE_PENDING'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-purple-600'
                  }`}
                >
                  Devis en attente
                </button>
              </div>
            </div>
          </div>

          {/* Unconverted Clients Table */}
          <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-500 uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="py-3 px-4">Client / Entreprise</th>
                  <th className="py-3 px-3">Point de Blocage</th>
                  <th className="py-3 px-3">Inactivité & Urgence</th>
                  <th className="py-3 px-3">Score IA & MRR</th>
                  <th className="py-3 px-3">KAM Assigné</th>
                  <th className="py-3 px-4 text-right">Action Rapide</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 bg-white/50 dark:bg-zinc-900/30">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400 font-medium">
                      Aucun client non-converti correspondant aux critères de filtre.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-colors">
                      {/* Client info */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-zinc-900 dark:text-zinc-100 text-xs">
                              {client.company_name}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                              client.source === 'INBOUND'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            }`}>
                              {client.source}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-500 mt-0.5">
                            {client.contact_name} &bull; {client.phone}
                          </span>
                        </div>
                      </td>

                      {/* Drop-off reason */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col max-w-[260px]">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1">
                            {client.drop_off_stage}
                          </span>
                          <span className="text-[10px] text-zinc-400 mt-0.5">
                            {client.status_display}
                          </span>
                        </div>
                      </td>

                      {/* Urgency */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
                            client.urgency === 'CRITICAL'
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse'
                              : client.urgency === 'WARNING'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          }`}>
                            <Icons.Clock size={11} /> {client.days_inactive}j sans contact
                          </span>
                        </div>
                      </td>

                      {/* AI Propensity & MRR */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col">
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            {client.estimated_mrr}
                          </span>
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            Score IA : {client.conversion_score}%
                          </span>
                        </div>
                      </td>

                      {/* KAM */}
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          {client.assigned_kam}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenActionModal(client)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition-all shadow-xs"
                            title="Relancer sur WhatsApp"
                          >
                            <Icons.MessageCircle size={12} /> Relancer
                          </button>
                          <a
                            href={`tel:${client.phone}`}
                            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-all"
                            title="Appeler le client"
                          >
                            <Icons.Phone size={13} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TERRITORIAL PLAQUES & SECTOR BREAKDOWN */}
      {(activeSubTab === 'overview' || activeSubTab === 'territories') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Territories / Plaques Distribution */}
          <div className="studio-card p-6 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Icons.MapPin size={16} className="text-blue-600" />
                <h3 className="text-xs font-black text-zinc-950 dark:text-white uppercase tracking-wider">
                  Performance Commerciale par Plaque Territoriale
                </h3>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium">5 Plaques Actives</span>
            </div>

            <div className="flex flex-col gap-3 mt-1">
              {(data.zone_distribution || []).map((zone, idx) => {
                const total = zone.leads || 1;
                const convPct = Math.round((zone.conversions / total) * 100);

                return (
                  <div key={idx} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-800/50 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{zone.zone}</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">{zone.mrr} MRR</span>
                    </div>

                    <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${convPct}%` }}
                        title={`${zone.conversions} convertis (${convPct}%)`}
                      />
                      <div
                        className="bg-amber-500 h-full"
                        style={{ width: `${100 - convPct}%` }}
                        title={`${zone.unconverted} non convertis`}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-zinc-500">
                      <span>{zone.leads} leads identifiés</span>
                      <span>
                        <strong className="text-emerald-600">{zone.conversions} convertis</strong> ({convPct}%) &bull; {zone.unconverted} en cours
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sector Distribution */}
          <div className="studio-card p-6 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Icons.PieChart size={16} className="text-purple-600" />
                <h3 className="text-xs font-black text-zinc-950 dark:text-white uppercase tracking-wider">
                  Répartition des Clients par Secteur d'Activité
                </h3>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium">Portefeuille Global</span>
            </div>

            <div className="flex flex-col gap-3 mt-1">
              {(data.sector_distribution || []).map((sec, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{sec.sector}</span>
                    <span className="font-black text-zinc-900 dark:text-white">{sec.count} entreprises ({sec.percentage}%)</span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-full rounded-full"
                      style={{ width: `${sec.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto p-3.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/30 flex items-center gap-3">
              <Icons.Sparkles size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <p className="text-[11px] text-blue-900 dark:text-blue-200 font-medium">
                <strong>Recommandation IA :</strong> Le secteur <em>Banque & Finance</em> et le secteur <em>Industrie & Logistique</em> affichent les plus hauts paniers moyens (MRR &gt; 1 200 $). Priorisez les relances sur ces deux segments.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL QUICK-ACTION FOR UNCONVERTED CLIENTS */}
      {selectedClientModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="studio-card w-full max-w-lg p-6 rounded-3xl shadow-2xl flex flex-col gap-4 animate-scaleUp border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">
                  Relance Client Instantanée
                </span>
                <h3 className="text-lg font-black text-zinc-950 dark:text-white mt-0.5">
                  {selectedClientModal.company_name}
                </h3>
                <p className="text-xs text-zinc-500">
                  Contact : <strong>{selectedClientModal.contact_name}</strong> ({selectedClientModal.phone})
                </p>
              </div>
              <button
                onClick={() => setSelectedClientModal(null)}
                className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500"
              >
                <Icons.Close size={16} />
              </button>
            </div>

            {/* Context details */}
            <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 text-xs flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">Point de blocage :</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{selectedClientModal.drop_off_stage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Inactivité :</span>
                <span className="font-bold text-red-500">{selectedClientModal.days_inactive} jours sans échange</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Action recommandée :</span>
                <span className="font-bold text-zinc-900 dark:text-white">{selectedClientModal.recommended_action}</span>
              </div>
            </div>

            {/* Editable WhatsApp Draft */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Message WhatsApp pré-rédigé :
              </label>
              <textarea
                rows={4}
                value={whatsappDraftMessage}
                onChange={(e) => setWhatsappDraftMessage(e.target.value)}
                className="w-full p-3 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedClientModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Annuler
              </button>
              <button
                onClick={() => handleSendWhatsApp(selectedClientModal)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <Icons.MessageCircle size={14} /> Envoyer sur WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
