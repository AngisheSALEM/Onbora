"use client";

import React from 'react';
import { StrategicVisit } from './kamTypes';
import { Icons } from '@/components/shared/Icons';

interface KamAccountPlanModalProps {
  visit: StrategicVisit | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function KamAccountPlanModal({
  visit,
  isOpen,
  onClose
}: KamAccountPlanModalProps) {
  if (!isOpen || !visit) return null;

  const briefing = visit.briefing;
  const totalBudget = briefing.orange_relationship.total_telecom_cloud_budget;
  const orangeMrr = briefing.orange_relationship.mrr_current;
  const competitorMrr = totalBudget - orangeMrr;
  const orangeShare = briefing.orange_relationship.wallet_share_percentage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-6xl max-h-[90vh] flex flex-col bg-white dark:bg-[#121215] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-zinc-50 dark:bg-[#1C1C1E] border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Icons.LineChart size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white">
                Plan de Compte Stratégique 2026–2027 — {visit.account_name}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Share of Wallet (Part de portefeuille), Déplacement concurrentiel & Roadmap de conquête.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <Icons.Close size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          
          {/* Top Row : Share of Wallet Visual Gauge */}
          <div className="p-5 bg-zinc-50 dark:bg-[#1C1C1E] rounded-2xl border border-black/5 dark:border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Analyse de la Part de Portefeuille (Share of Wallet)
              </span>
              <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                Dépense Télécom & Cloud Totale Estimée : <strong className="text-blue-600">{totalBudget.toLocaleString()} € / mois</strong>
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${orangeShare}%` }}
                className="bg-orange-500 h-full flex items-center justify-center text-[10px] font-extrabold text-white"
              >
                Orange {orangeShare}% ({orangeMrr.toLocaleString()} €)
              </div>
              <div
                style={{ width: `${100 - orangeShare}%` }}
                className="bg-zinc-400 dark:bg-zinc-600 h-full flex items-center justify-center text-[10px] font-semibold text-white"
              >
                Concurrents {100 - orangeShare}% ({competitorMrr.toLocaleString()} €)
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
              <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5">
                <span className="text-zinc-400 block text-[10px] font-semibold uppercase">Objectif Cible 2027</span>
                <span className="text-base font-extrabold text-emerald-500">65% Share of Wallet</span>
                <span className="text-[11px] text-zinc-500 block mt-0.5">+30 000 € / mois MRR visé</span>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5">
                <span className="text-zinc-400 block text-[10px] font-semibold uppercase">Cible Conquête #1</span>
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">Remplacement MPLS Cisco par SD-WAN Orange</span>
                <span className="text-[11px] text-zinc-500 block mt-0.5">Échéance : Q4 2026</span>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5">
                <span className="text-zinc-400 block text-[10px] font-semibold uppercase">Cible Conquête #2</span>
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">Datacenter Secours Tier III</span>
                <span className="text-[11px] text-zinc-500 block mt-0.5">Conformité directive BCEAO</span>
              </div>
            </div>
          </div>

          {/* Bottom Grid : Opportunités Stratégiques Orange */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {briefing.ai_hypotheses_and_playbook.orange_opportunities.map((opp, idx) => (
              <div key={idx} className="p-4 bg-zinc-50 dark:bg-[#1C1C1E] rounded-2xl border border-black/5 dark:border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase">
                      Opportunité #{idx + 1}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-xs font-extrabold">
                      +{opp.potential_mrr.toLocaleString()} € / mois
                    </span>
                  </div>

                  <h4 className="text-sm font-extrabold text-zinc-900 dark:text-white mt-1">
                    {opp.solution_category}
                  </h4>

                  <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-2 leading-relaxed">
                    {opp.value_proposition}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Statut : En qualification</span>
                  <button className="px-3 py-1 bg-black text-white dark:bg-white dark:text-black rounded-lg font-semibold text-[11px] hover:opacity-90 transition-opacity">
                    Intégrer au Devis
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}
