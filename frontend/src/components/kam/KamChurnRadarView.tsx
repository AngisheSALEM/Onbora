"use client";

import React, { useState, useEffect } from 'react';
import { Icons } from '@/components/shared/Icons';
import { fetchAPI } from '@/lib/api';

interface ChurnAlert {
  id: string;
  enterprise_id: number;
  enterprise_name: string;
  sector: string;
  churn_risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  churn_score: number;
  at_stake_monthly_revenue_usd: number;
  signals_detected: string[];
  retention_action_plan: {
    urgency: string;
    action: string;
    recommended_talk_track: string;
  };
}

interface UpsellOpportunity {
  id: string;
  enterprise_id: number;
  enterprise_name: string;
  sector: string;
  target_solution: string;
  confidence_score: number;
  potential_additional_mrr_usd: number;
  trigger_event: string;
  value_proposition: string;
}

interface RadarData {
  critical_churn_count: number;
  high_churn_count: number;
  churn_alerts: ChurnAlert[];
  total_upsell_potential_mrr: number;
  upsell_opportunities: UpsellOpportunity[];
}

export default function KamChurnRadarView() {
  const [radarData, setRadarData] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'CHURN' | 'UPSELL'>('CHURN');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchRadar();
  }, []);

  const fetchRadar = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAPI('/api/kam/churn-radar/');
      setRadarData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de chargement du radar.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyRetentionPlan = (alert: ChurnAlert) => {
    const text = `PLAN DE RÉTENTION D'URGENCE — ${alert.enterprise_name}
Urgence : ${alert.retention_action_plan.urgency}
Chiffre en jeu : ${alert.at_stake_monthly_revenue_usd} USD/mois

Signaux détectés :
${alert.signals_detected.map(s => `- ${s}`).join('\n')}

Action recommandée :
${alert.retention_action_plan.action}

Argumentaire :
"${alert.retention_action_plan.recommended_talk_track}"
`;
    navigator.clipboard.writeText(text);
    setCopiedId(alert.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#ECEAE5] dark:bg-[#242124] overflow-y-auto p-6 md:p-8 select-none transition-colors duration-300">
      
      {/* 1. TOP HEADER & METRICS */}
      <div className="mb-6 space-y-4 pb-6 border-b border-black/5 dark:border-white/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#4F6CE8]/10 text-[#4F6CE8]">
                <Icons.AlertTriangle size={12} />
                Radar Proactif
              </span>
              <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
                Détection préventive Churn & Opportunités d&apos;Upsell
              </span>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
              Surveillance Portefeuille & Alertes Stratégiques
            </h2>
          </div>

          <button
            onClick={fetchRadar}
            disabled={loading}
            className="p-2.5 bg-[#FFFFFF] dark:bg-[#2F2C30] hover:bg-[#ECEAE5] dark:hover:bg-[#3B373D] text-zinc-700 dark:text-zinc-200 rounded-2xl transition-colors cursor-pointer self-start md:self-auto"
          >
            <Icons.RefreshCw size={16} className={loading ? "animate-spin text-[#4F6CE8]" : ""} />
          </button>
        </div>

        {/* 2 Tabs: Churn vs Upsell */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('CHURN')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'CHURN'
                ? 'bg-[#4F6CE8] text-white shadow-none'
                : 'bg-[#FFFFFF] dark:bg-[#2F2C30] text-zinc-700 dark:text-zinc-300 hover:bg-[#ECEAE5] dark:hover:bg-[#3B373D]'
            }`}
          >
            <Icons.AlertTriangle size={15} />
            <span>Risques de Churn ({radarData?.churn_alerts.length || 0})</span>
            {radarData && radarData.critical_churn_count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#EF4444] text-white text-[10px]">
                {radarData.critical_churn_count} critiques
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('UPSELL')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'UPSELL'
                ? 'bg-[#4F6CE8] text-white shadow-none'
                : 'bg-[#FFFFFF] dark:bg-[#2F2C30] text-zinc-700 dark:text-zinc-300 hover:bg-[#ECEAE5] dark:hover:bg-[#3B373D]'
            }`}
          >
            <Icons.TrendingUp size={15} />
            <span>Opportunités d&apos;Upsell ({radarData?.upsell_opportunities.length || 0})</span>
            {radarData && (
              <span className="px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] text-[10px] font-extrabold">
                +{(radarData.total_upsell_potential_mrr || 0).toLocaleString('fr-FR')} $/mois
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <Icons.Sparkles size={36} className="animate-spin text-[#4F6CE8] mb-3" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Analyse des signaux faibles sur le portefeuille...
          </span>
        </div>
      ) : error ? (
        <div className="p-8 rounded-3xl bg-[#FFFFFF] dark:bg-[#2F2C30] text-center max-w-md mx-auto my-auto space-y-3">
          <Icons.AlertTriangle size={32} className="text-[#EF4444] mx-auto" />
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Erreur radar</h4>
          <p className="text-xs text-zinc-500">{error}</p>
        </div>
      ) : activeTab === 'CHURN' ? (
        /* CHURN ALERTS LIST */
        <div className="space-y-4">
          {radarData?.churn_alerts.length === 0 ? (
            <div className="p-12 text-center bg-[#FFFFFF] dark:bg-[#2F2C30] rounded-3xl space-y-2">
              <Icons.CheckCircle size={32} className="text-[#10B981] mx-auto" />
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Aucun risque critique détecté</h4>
              <p className="text-xs text-zinc-500">Tous vos comptes sont sous surveillance nominale.</p>
            </div>
          ) : (
            radarData?.churn_alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-6 rounded-[28px] bg-[#FFFFFF] dark:bg-[#2F2C30] shadow-none space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#EF4444]/10 text-[#EF4444] flex items-center justify-center shrink-0">
                      <Icons.AlertTriangle size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                          {alert.enterprise_name}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EF4444]/10 text-[#EF4444] uppercase tracking-wider">
                          {alert.churn_risk_level === 'CRITICAL' ? 'Risque Critique' : 'Risque Élevé'}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
                        Secteur : {alert.sector} • En jeu : <strong className="text-zinc-900 dark:text-white">~{alert.at_stake_monthly_revenue_usd} $/mois</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => copyRetentionPlan(alert)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#ECEAE5] dark:bg-[#3B373D] hover:bg-[#E4E1DB] dark:hover:bg-[#48434B] text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl transition-all cursor-pointer self-start md:self-auto"
                  >
                    {copiedId === alert.id ? <Icons.Check size={13} /> : <Icons.Copy size={13} />}
                    <span>{copiedId === alert.id ? "Plan copié !" : "Copier plan d'action"}</span>
                  </button>
                </div>

                {/* Signals List */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
                    Signaux de désengagement détectés
                  </span>
                  <div className="space-y-1">
                    {alert.signals_detected.map((sig, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0" />
                        <span>{sig}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Retention Plan */}
                <div className="p-4 rounded-2xl bg-[#ECEAE5] dark:bg-[#3B373D] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-zinc-900 dark:text-white uppercase tracking-wide">
                      Plan d&apos;action de fidélisation ({alert.retention_action_plan.urgency})
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300">
                    <strong>Action recommandée :</strong> {alert.retention_action_plan.action}
                  </p>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 italic">
                    Argument d&apos;impact : &ldquo;{alert.retention_action_plan.recommended_talk_track}&rdquo;
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* UPSELL OPPORTUNITIES LIST */
        <div className="space-y-4">
          {radarData?.upsell_opportunities.map((opp) => (
            <div
              key={opp.id}
              className="p-6 rounded-[28px] bg-[#FFFFFF] dark:bg-[#2F2C30] shadow-none flex flex-col md:flex-row md:items-center justify-between gap-5"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                    {opp.enterprise_name}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#4F6CE8]/10 text-[#4F6CE8]">
                    {opp.sector}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#10B981]/10 text-[#10B981]">
                    Confiance {opp.confidence_score}%
                  </span>
                </div>

                <div className="text-xs text-zinc-700 dark:text-zinc-300">
                  <strong className="text-zinc-900 dark:text-white">Solution d&apos;expansion recommandée : </strong>
                  <span className="text-[#4F6CE8] font-bold">{opp.target_solution}</span>
                </div>

                <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                  <strong>Événement déclencheur :</strong> {opp.trigger_event}
                </p>

                <p className="text-xs text-zinc-600 dark:text-zinc-300 italic">
                  &ldquo;{opp.value_proposition}&rdquo;
                </p>
              </div>

              <div className="text-right shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-black/5 dark:border-white/5">
                <span className="text-[10px] font-bold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider block">
                  Gain MRR Estimé
                </span>
                <span className="text-base font-extrabold text-[#10B981]">
                  +{opp.potential_additional_mrr_usd.toLocaleString('fr-FR')} $/mois
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
