"use client";

import React, { useState, useEffect } from 'react';
import { Icons } from '@/components/shared/Icons';

interface ScoreDriver {
  factor: string;
  points: string;
  positive: boolean;
}

interface ScoredLead {
  enterprise_id: number;
  name: string;
  sector: string;
  segment: string;
  city: string;
  lead_score: number;
  scoring_tier: 'TIER_1_PRIORITY' | 'TIER_2_PROSPECT' | 'TIER_3_NURTURING';
  conversion_probability: 'HIGH' | 'MEDIUM' | 'LOW';
  estimated_mrr_usd: number;
  score_drivers: ScoreDriver[];
  recommended_approach: string;
  current_operator: string;
  contact_name: string;
  contact_role: string;
  is_visited: boolean;
}

interface KamLeadScoringViewProps {
  onOpenPreCallForLead?: (accountId: number) => void;
}

export default function KamLeadScoringView({ onOpenPreCallForLead }: KamLeadScoringViewProps) {
  const [leads, setLeads] = useState<ScoredLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<'ALL' | 'TIER_1_PRIORITY' | 'TIER_2_PROSPECT' | 'TIER_3_NURTURING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('onbora_token');
      const res = await fetch('http://127.0.0.1:8000/api/kam/lead-scoring/', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Token ${token}` } : {})
        }
      });
      if (!res.ok) throw new Error("Impossible de charger les scores de leads.");
      const data = await res.json();
      setLeads(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de connexion.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchTier = tierFilter === 'ALL' || l.scoring_tier === tierFilter;
    const matchSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTier && matchSearch;
  });

  const tier1Count = leads.filter(l => l.scoring_tier === 'TIER_1_PRIORITY').length;
  const totalPipelineMrr = leads.reduce((acc, curr) => acc + curr.estimated_mrr_usd, 0);
  const competitorLeadsCount = leads.filter(l => l.current_operator.toLowerCase() !== 'orange').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#ECEAE5] dark:bg-[#242124] overflow-y-auto p-6 md:p-8 select-none transition-colors duration-300">
      
      {/* 1. TOP HEADER & KPI CARDS */}
      <div className="mb-6 space-y-4 pb-6 border-b border-black/5 dark:border-white/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#4F6CE8]/10 text-[#4F6CE8]">
                <Icons.Award size={12} />
                Priorisation Intelligente
              </span>
              <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
                Algorithme de Lead Scoring B2B
              </span>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
              Pipeline Scoré & Opportunités Chaudes
            </h2>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={fetchLeads}
            disabled={loading}
            className="p-2.5 bg-[#FFFFFF] dark:bg-[#2F2C30] hover:bg-[#ECEAE5] dark:hover:bg-[#3B373D] text-zinc-700 dark:text-zinc-200 rounded-2xl transition-colors cursor-pointer self-start md:self-auto"
          >
            <Icons.RefreshCw size={16} className={loading ? "animate-spin text-[#4F6CE8]" : ""} />
          </button>
        </div>

        {/* 3 Summary KPIs (60-30-10 Apple Design) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#2F2C30] shadow-none space-y-1">
            <span className="text-[11px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
              Leads Tier 1 (Priorité Haute)
            </span>
            <div className="text-2xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
              <span>{tier1Count} comptes</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4F6CE8]/10 text-[#4F6CE8]">
                Score &ge; 75
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#2F2C30] shadow-none space-y-1">
            <span className="text-[11px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
              Potentiel MRR Total Pondéré
            </span>
            <div className="text-2xl font-extrabold text-[#4F6CE8]">
              ~{totalPipelineMrr.toLocaleString('fr-FR')} USD/mois
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#2F2C30] shadow-none space-y-1">
            <span className="text-[11px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
              Comptes Concurrence à Convertir
            </span>
            <div className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              {competitorLeadsCount} prospects
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {(['ALL', 'TIER_1_PRIORITY', 'TIER_2_PROSPECT', 'TIER_3_NURTURING'] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                tierFilter === tier
                  ? 'bg-[#4F6CE8] text-white shadow-none'
                  : 'bg-[#FFFFFF] dark:bg-[#2F2C30] text-zinc-700 dark:text-zinc-300 hover:bg-[#ECEAE5] dark:hover:bg-[#3B373D]'
              }`}
            >
              {tier === 'ALL' && `Tous (${leads.length})`}
              {tier === 'TIER_1_PRIORITY' && `Tier 1 Prioritaire (${tier1Count})`}
              {tier === 'TIER_2_PROSPECT' && `Tier 2 Prospection (${leads.filter(l => l.scoring_tier === 'TIER_2_PROSPECT').length})`}
              {tier === 'TIER_3_NURTURING' && `Tier 3 Nurturing (${leads.filter(l => l.scoring_tier === 'TIER_3_NURTURING').length})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Rechercher entreprise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#FFFFFF] dark:bg-[#2F2C30] text-xs font-medium text-zinc-900 dark:text-white pl-9 pr-4 py-2.5 rounded-2xl shadow-none focus:outline-none focus:ring-2 focus:ring-[#4F6CE8]"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
            <Icons.Search size={14} />
          </div>
        </div>
      </div>

      {/* 3. LEADS LIST */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <Icons.Sparkles size={36} className="animate-spin text-[#4F6CE8] mb-3" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Calcul du scoring en direct sur vos comptes...
          </span>
        </div>
      ) : error ? (
        <div className="p-8 rounded-3xl bg-[#FFFFFF] dark:bg-[#2F2C30] text-center max-w-md mx-auto my-auto space-y-3">
          <Icons.AlertTriangle size={32} className="text-[#EF4444] mx-auto" />
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Erreur de chargement</h4>
          <p className="text-xs text-zinc-500">{error}</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="p-12 text-center bg-[#FFFFFF] dark:bg-[#2F2C30] rounded-3xl">
          <p className="text-xs text-zinc-500">Aucun lead ne correspond aux filtres sélectionnés.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLeads.map((lead) => {
            const isTier1 = lead.scoring_tier === 'TIER_1_PRIORITY';
            return (
              <div
                key={lead.enterprise_id}
                className="p-5 rounded-[26px] bg-[#FFFFFF] dark:bg-[#2F2C30] shadow-none flex flex-col md:flex-row md:items-center justify-between gap-5 hover:bg-[#F6F5F2] dark:hover:bg-[#363336] transition-colors"
              >
                {/* Left: Score Gauge & Enterprise Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div
                    className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 font-extrabold ${
                      isTier1
                        ? 'bg-[#4F6CE8] text-white'
                        : lead.scoring_tier === 'TIER_2_PROSPECT'
                        ? 'bg-black/5 dark:bg-white/10 text-zinc-800 dark:text-zinc-200'
                        : 'bg-black/5 dark:bg-white/5 text-zinc-400'
                    }`}
                  >
                    <span className="text-lg leading-none">{lead.lead_score}</span>
                    <span className="text-[9px] uppercase tracking-wider opacity-80">Score</span>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                        {lead.name}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
                        {lead.sector}
                      </span>
                      <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
                        • {lead.city}
                      </span>
                      <span className="text-[10px] font-semibold text-zinc-500">
                        • Opérateur actuel : <strong className="text-zinc-800 dark:text-zinc-200">{lead.current_operator}</strong>
                      </span>
                    </div>

                    {/* Score Drivers Tags */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {lead.score_drivers.map((drv, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-[#ECEAE5] dark:bg-[#3B373D] text-zinc-700 dark:text-zinc-300"
                        >
                          <strong className="text-[#4F6CE8] mr-1">{drv.points}</strong>
                          {drv.factor}
                        </span>
                      ))}
                    </div>

                    {/* Recommended Approach */}
                    <div className="text-xs text-zinc-700 dark:text-zinc-300 pt-1">
                      <span className="font-semibold text-zinc-900 dark:text-white">Angle d&apos;attaque recommandé : </span>
                      {lead.recommended_approach}
                    </div>
                  </div>
                </div>

                {/* Right: Revenue Estimate & Action CTA */}
                <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-black/5 dark:border-white/5">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider block">
                      Potentiel MRR
                    </span>
                    <span className="text-sm font-extrabold text-[#4F6CE8]">
                      ~{lead.estimated_mrr_usd.toLocaleString('fr-FR')} $/mois
                    </span>
                  </div>

                  {onOpenPreCallForLead && (
                    <button
                      onClick={() => onOpenPreCallForLead(lead.enterprise_id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 text-white text-xs font-semibold rounded-xl shadow-none cursor-pointer transition-all"
                    >
                      <Icons.Sparkles size={13} />
                      <span>Préparer le Pre-Call</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
