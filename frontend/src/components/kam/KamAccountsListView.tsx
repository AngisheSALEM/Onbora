"use client";

import React from 'react';
import { StrategicVisit } from './kamTypes';
import { Icons } from '@/components/shared/Icons';

interface KamAccountsListViewProps {
  visits: StrategicVisit[];
  onSelectAccount: (visit: StrategicVisit) => void;
  onOpenBriefing: (visit: StrategicVisit) => void;
  onOpenDebrief: (visit: StrategicVisit) => void;
  onOpenCreateAccount?: () => void;
}

export default function KamAccountsListView({
  visits,
  onSelectAccount,
  onOpenBriefing,
  onOpenDebrief,
  onOpenCreateAccount
}: KamAccountsListViewProps) {
  // Group visits by sector / industry
  const sectors = [
    {
      title: 'Banque & Services Financiers',
      accounts: visits.filter((v) => v.briefing.industry.includes('Banque') || v.briefing.industry.includes('Fintech'))
    },
    {
      title: 'Secteur Public & Gouvernement',
      accounts: visits.filter((v) => v.briefing.industry.includes('Public') || v.briefing.industry.includes('Gouvernement'))
    },
    {
      title: 'Transport, Logistique & Industrie',
      accounts: visits.filter((v) => v.briefing.industry.includes('Transport') || v.briefing.industry.includes('Logistique'))
    }
  ];

  return (
    <div className="flex-1 flex flex-col gap-8 p-8 overflow-y-auto select-none">
      {/* GROUPED SECTORAL GRIDS */}
      <div className="space-y-8">
        {sectors.map((sec) => {
          if (sec.accounts.length === 0) return null;

          return (
            <div key={sec.title} className="space-y-4">
              
              {/* Category Title Header */}
              <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                  {sec.title}
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-zinc-500">
                    {sec.accounts.length} {sec.accounts.length > 1 ? 'comptes' : 'compte'}
                  </span>
                  {onOpenCreateAccount && (
                    <button
                      onClick={onOpenCreateAccount}
                      className="px-3 py-1 bg-[#E4E1DB] dark:bg-[#363336] hover:bg-blue-600 hover:text-white text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Icons.Plus size={14} />
                      <span>Ajouter</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {sec.accounts.map((visit) => {
                  const briefing = visit.briefing;
                  const isHealthy = briefing.orange_relationship.recent_incidents_count_30d === 0;

                  return (
                    <div
                      key={visit.id}
                      onClick={() => onSelectAccount(visit)}
                      className="group bg-[#F6F5F2] dark:bg-[#2D2A2D] hover:bg-white dark:hover:bg-[#363336] rounded-[28px] p-6 shadow-sm hover:shadow-md border border-black/5 dark:border-white/5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Row : Avatar + Status */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-[#E4E1DB] dark:bg-[#363336] text-zinc-900 dark:text-white flex items-center justify-center font-black text-lg">
                            {visit.account_name.charAt(0)}
                          </div>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1.5 ${
                            isHealthy
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}>
                            {isHealthy ? (
                              <>
                                <Icons.CheckCircle size={11} />
                                <span>SLA Stable</span>
                              </>
                            ) : (
                              <>
                                <Icons.AlertCircle size={11} />
                                <span>Incident Récent</span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* Account Name & Info */}
                        <h4 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                          {visit.account_name}
                        </h4>

                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                          {briefing.firmographics.business_model_summary}
                        </p>

                        {/* Quick Specs */}
                        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-zinc-200/60 dark:border-white/5 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase block">MRR Orange</span>
                            <span className="font-mono font-bold text-zinc-900 dark:text-white">
                              {briefing.orange_relationship.mrr_current.toLocaleString()} € / m
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase block">Part Marché</span>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                              {briefing.orange_relationship.wallet_share_percentage}% SOW
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action Footer */}
                      <div className="mt-5 pt-3 border-t border-zinc-200/60 dark:border-white/5 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-zinc-500">
                          {briefing.firmographics.locations_count} sites connectés
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenBriefing(visit);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          Briefing 360°
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
