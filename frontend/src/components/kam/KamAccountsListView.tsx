"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import KamAccountsTable from './KamAccountsTable';
import { fetchAPI } from '@/lib/api';
import { StrategicVisit } from './kamTypes';
import { useKamContext } from './KamContext';

interface KamAccountsListViewProps {
  visits: StrategicVisit[];
  searchQuery?: string;
  onSelectAccount: (visit: StrategicVisit) => void;
  onOpenBriefing: (visit: StrategicVisit) => void;
  onOpenDebrief: (visit: StrategicVisit) => void;
}

export default function KamAccountsListView({
  visits,
  onSelectAccount,
}: KamAccountsListViewProps) {
  const router = useRouter();
  const { searchQuery, loading: accountsLoading, error: accountsError } = useKamContext();

  const [summaryData, setSummaryData] = useState<{
    highRiskCount: number;
    highRiskDelta: string;
    healthyCount: number;
    surveillanceCount: number;
    renewalsCount: number;
    renewalsSubtitle: string;
    upsellCount: number;
    upsellSubtitle: string;
    noActionCount: number;
    noActionSubtitle: string;
  }>({
    highRiskCount: 0,
    highRiskDelta: '',
    healthyCount: 0,
    surveillanceCount: 0,
    renewalsCount: 0,
    renewalsSubtitle: 'Dans les 90 prochains jours',
    upsellCount: 0,
    upsellSubtitle: '',
    noActionCount: 0,
    noActionSubtitle: 'Depuis plus de 14 jours',
  });
  const [summaryError, setSummaryError] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchAPI('/api/kam/portfolio-summary/')
      .then((data) => {
        if (!isMounted || !data) return;
        if (data.summary_cards) {
          const sc = data.summary_cards;
          setSummaryData({
            highRiskCount: sc.high_risk?.count ?? 0,
            highRiskDelta: sc.high_risk?.delta_text ?? '',
            healthyCount: sc.high_risk?.healthy_count ?? 0,
            surveillanceCount: sc.high_risk?.surveillance_count ?? 0,
            renewalsCount: sc.renewals?.count ?? 0,
            renewalsSubtitle: sc.renewals?.subtitle ?? 'Dans les 90 prochains jours',
            upsellCount: sc.upsell?.count ?? 0,
            upsellSubtitle: sc.upsell?.subtitle ?? '',
            noActionCount: sc.no_action?.count ?? 0,
            noActionSubtitle: sc.no_action?.subtitle ?? 'Depuis plus de 14 jours',
          });
        }
      })
      .catch(() => {
        if (isMounted) setSummaryError('Impossible de charger le portefeuille. Réessayez plus tard.');
      }).finally(() => {
        if (isMounted) setSummaryLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return visits;
    const q = searchQuery.trim().toLowerCase();
    return visits.filter((account) =>
      [account.account_name, account.briefing?.industry, account.contact_name, account.current_operator]
        .some((value) => value?.toLowerCase().includes(q))
    );
  }, [visits, searchQuery]);

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 md:p-8 overflow-y-auto select-none bg-[#ECEAE5] dark:bg-[#242124]">
      {/* 1. Header Sobre et Épuré (barre de recherche unique déléguée au Header supérieur) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5 dark:border-white/5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            Portefeuille
          </h1>
        
        </div>
      </div>

      {/* 2. Disposition Asymétrique des Cartes Cliquables (redirection vers pages détails dédiées) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Grande Carte Principale à Gauche : Cliquable vers /kam/accounts/risk */}
        <div
          onClick={() => router.push('/kam/accounts/risk')}
          className="lg:col-span-7 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5 flex flex-col justify-between cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
          title="Consulter le détail des comptes à risque élevé"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Comptes à risque élevé
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Voir les {summaryLoading ? '…' : summaryData.highRiskCount} comptes &rarr;
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-5xl font-black text-zinc-900 dark:text-white tracking-tight">
                {summaryLoading ? '…' : summaryData.highRiskCount}
              </span>
            </div>
            {summaryData.highRiskDelta && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium">{summaryData.highRiskDelta}</p>}
          </div>

          <div className="mt-6 pt-5 border-t border-black/5 dark:border-white/5 grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                Comptes sains
              </span>
              <span className="text-2xl font-bold text-zinc-900 dark:text-white mt-1 block">
                {summaryLoading ? '…' : summaryData.healthyCount}
              </span>
            </div>
            <div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                Sous surveillance
              </span>
              <span className="text-2xl font-bold text-zinc-900 dark:text-white mt-1 block">
                {summaryLoading ? '…' : summaryData.surveillanceCount}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Cartes Empilées Verticalement à Droite : Cliquables vers pages détails */}
        <div className="lg:col-span-5 flex flex-col gap-3 justify-between">
          {/* Carte 1 -> /kam/accounts/renewals */}
          <div
            onClick={() => router.push('/kam/accounts/renewals')}
            className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[20px] p-4 border border-black/5 dark:border-white/5 flex flex-col justify-between h-full cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
            title="Consulter le détail des renouvellements à surveiller"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Renouvellements à surveiller
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {summaryData.renewalsSubtitle}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                {summaryLoading ? '…' : summaryData.renewalsCount}
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Voir &rarr;
              </span>
            </div>
          </div>

          {/* Carte 2 -> /kam/accounts/upsell */}
          <div
            onClick={() => router.push('/kam/accounts/upsell')}
            className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[20px] p-4 border border-black/5 dark:border-white/5 flex flex-col justify-between h-full cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
            title="Consulter le détail des opportunités d’upsell"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Opportunités d’upsell
              </span>
          
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                {summaryLoading ? '…' : summaryData.upsellCount}
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Voir &rarr;
              </span>
            </div>
          </div>

          {/* Carte 3 -> /kam/accounts/no-action */}
          <div
            onClick={() => router.push('/kam/accounts/no-action')}
            className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[20px] p-4 border border-black/5 dark:border-white/5 flex flex-col justify-between h-full cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
            title="Consulter le détail des comptes sans prochaine action"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Sans prochaine action
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {summaryData.noActionSubtitle}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                {summaryLoading ? '…' : summaryData.noActionCount}
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Voir &rarr;
              </span>
            </div>
          </div>
        </div>
      </div>
      {summaryError && <p role="alert" className="text-sm text-zinc-600 dark:text-zinc-300">{summaryError}</p>}
      <section className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Mes comptes B2B ({visits.length})</h2>
          <Link href="/kam/accounts/all" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:underline focus-visible:underline">Voir tout</Link>
        </div>
        <KamAccountsTable accounts={filteredAccounts.slice(0, 6)} loading={accountsLoading} error={accountsError} onSelectAccount={onSelectAccount} />
      </section>
    </div>
  );
}
