"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useKamContext } from '@/components/kam/KamContext';
import { Icons } from '@/components/shared/Icons';
import { fetchAPI } from '@/lib/api';

interface RiskAccountRow {
  id: string;
  name: string;
  industry: string;
  riskLevel: 'Critique' | 'Élevé';
  healthScore: number;
  criticalSignals: string;
  lastInteraction: string;
  renewalTimeline: string;
  accountId: string;
}

const DEFAULT_RISK_ACCOUNTS: RiskAccountRow[] = [
  {
    id: 'vodacom-1',
    name: 'Vodacom RDC',
    industry: 'Télécommunications & Data',
    riskLevel: 'Critique',
    healthScore: 32,
    criticalSignals: 'Baisse d’usage + 4 tickets incidents en 30j',
    lastInteraction: 'Il y a 11 jours',
    renewalTimeline: 'Dans 45 jours',
    accountId: '1204',
  },
  {
    id: 'rawbank-2',
    name: 'Rawbank RDC Siège',
    industry: 'Banque & Finance',
    riskLevel: 'Critique',
    healthScore: 38,
    criticalSignals: 'Insatisfaction exprimée en réunion + retards support',
    lastInteraction: 'Il y a 14 jours',
    renewalTimeline: 'Dans 60 jours',
    accountId: '1199',
  },
  {
    id: 'tenke-3',
    name: 'Tenke Fungurume Mining (TFM)',
    industry: 'Mines & Métallurgie',
    riskLevel: 'Élevé',
    healthScore: 44,
    criticalSignals: 'Changement de management de site + silence décideur',
    lastInteraction: 'Il y a 28 jours',
    renewalTimeline: 'Dans 80 jours',
    accountId: '1204',
  },
  {
    id: 'bgfibank-4',
    name: 'BGFIBank RDC Direction',
    industry: 'Services Financiers',
    riskLevel: 'Élevé',
    healthScore: 48,
    criticalSignals: 'Instabilité récurrente sur le faisceau hertzien secondaire',
    lastInteraction: 'Il y a 8 jours',
    renewalTimeline: 'Dans 55 jours',
    accountId: '1201',
  },
  {
    id: 'memling-5',
    name: 'Hôtel Memling Kinshasa',
    industry: 'Hôtellerie & Événements',
    riskLevel: 'Critique',
    healthScore: 29,
    criticalSignals: 'Baisse drastique de la bande passante souscrite',
    lastInteraction: 'Il y a 19 jours',
    renewalTimeline: 'Dans 35 jours',
    accountId: '1198',
  },
  {
    id: 'pullman-6',
    name: 'Pullman Grand Hôtel Kinshasa',
    industry: 'Hôtellerie de Luxe',
    riskLevel: 'Élevé',
    healthScore: 42,
    criticalSignals: 'Sollicitation concurrente identifiée sur le Wifi événementiel',
    lastInteraction: 'Il y a 16 jours',
    renewalTimeline: 'Dans 70 jours',
    accountId: '1195',
  },
  {
    id: 'fleuve-7',
    name: 'Fleuve Congo Hotel by Blazon',
    industry: 'Hôtellerie & Tourisme',
    riskLevel: 'Élevé',
    healthScore: 45,
    criticalSignals: 'Facturation contestée sur le lien secours satellite',
    lastInteraction: 'Il y a 21 jours',
    renewalTimeline: 'Dans 65 jours',
    accountId: '1196',
  },
  {
    id: 'equity-8',
    name: 'EquityBCDC Agence Centrale',
    industry: 'Banque de Détail',
    riskLevel: 'Critique',
    healthScore: 35,
    criticalSignals: 'Coupure non planifiée lors du traitement de paie',
    lastInteraction: 'Il y a 9 jours',
    renewalTimeline: 'Dans 40 jours',
    accountId: '1200',
  },
];

export default function RiskAccountsDetailPage() {
  const router = useRouter();
  const { visits, searchQuery } = useKamContext();
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'CRITIQUE' | 'ELEVE'>('ALL');
  const [apiAccounts, setApiAccounts] = useState<RiskAccountRow[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchAPI('/api/kam/churn-radar/risk/')
      .then((data) => {
        if (!isMounted || !Array.isArray(data)) return;
        if (data.length > 0) {
          setApiAccounts(data);
        }
      })
      .catch((err) => {
        console.warn('Fallback to local risk accounts:', err?.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const accounts: RiskAccountRow[] = useMemo(() => {
    if (apiAccounts && apiAccounts.length > 0) {
      return apiAccounts;
    }
    if (visits && visits.length > 0) {
      const mapped = visits.map((v, idx) => {
        const incidents = v.briefing?.orange_relationship?.recent_incidents_count_30d ?? 0;
        const isCritical = incidents >= 2 || v.briefing?.orange_relationship?.client_status === 'CHURN_RISK';
        return {
          id: v.id || `risk-${idx}`,
          name: v.account_name,
          industry: v.briefing?.industry || 'Services & Entreprises',
          riskLevel: (isCritical ? 'Critique' : 'Élevé') as 'Critique' | 'Élevé',
          healthScore: Math.max(22, 45 - incidents * 5),
          criticalSignals:
            v.briefing?.trigger_signals?.[0]?.title ||
            (incidents > 0 ? `${incidents} incident(s) récents sur le lien actif` : 'Vigilance sur le contrat'),
          lastInteraction: 'Récemment',
          renewalTimeline: 'Dans 60 jours',
          accountId: v.id || '1204',
        };
      });
      return mapped.length >= 4 ? mapped : DEFAULT_RISK_ACCOUNTS;
    }
    return DEFAULT_RISK_ACCOUNTS;
  }, [apiAccounts, visits]);

  const filtered = useMemo(() => {
    let list = accounts;
    if (filterLevel === 'CRITIQUE') list = list.filter((a) => a.riskLevel === 'Critique');
    if (filterLevel === 'ELEVE') list = list.filter((a) => a.riskLevel === 'Élevé');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.industry.toLowerCase().includes(q) ||
          a.criticalSignals.toLowerCase().includes(q)
      );
    }
    return list;
  }, [accounts, filterLevel, searchQuery]);

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 md:p-8 overflow-y-auto select-none bg-[#ECEAE5] dark:bg-[#242124]">
      {/* En-tête avec navigation de retour */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5 dark:border-white/5">
        <div>
          <Link
            href="/kam/accounts"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors mb-2"
          >
            <Icons.ArrowLeft size={13} />
            <span>Retour au Portefeuille</span>
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            Comptes à risque élevé
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {filtered.length} comptes présentant des signaux de fragilité ou d’insatisfaction
          </p>
        </div>

        {/* Filtres discrets sans bordure */}
        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-full border-none">
          <button
            onClick={() => setFilterLevel('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border-none ${
              filterLevel === 'ALL'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Tous ({accounts.length})
          </button>
          <button
            onClick={() => setFilterLevel('CRITIQUE')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border-none ${
              filterLevel === 'CRITIQUE'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Critique ({accounts.filter((a) => a.riskLevel === 'Critique').length})
          </button>
          <button
            onClick={() => setFilterLevel('ELEVE')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border-none ${
              filterLevel === 'ELEVE'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Élevé ({accounts.filter((a) => a.riskLevel === 'Élevé').length})
          </button>
        </div>
      </div>

      {/* Tableau détaillé et compact */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                <th className="pb-3 font-semibold">Compte & Secteur</th>
                <th className="pb-3 font-semibold">Niveau de risque</th>
                <th className="pb-3 font-semibold">Score santé</th>
                <th className="pb-3 font-semibold">Signal principal</th>
                <th className="pb-3 font-semibold">Dernier échange</th>
                <th className="pb-3 font-semibold">Échéance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((acc) => (
                <tr
                  key={acc.id}
                  onClick={() => router.push(`/kam/briefing?id=${encodeURIComponent(acc.accountId)}`)}
                  className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <td className="py-3.5 pr-4">
                    <span className="block text-xs font-semibold text-zinc-900 dark:text-white">
                      {acc.name}
                    </span>
                    <span className="block text-[11px] text-zinc-400 dark:text-zinc-500">
                      {acc.industry}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium border-0 bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
                      {acc.riskLevel}
                    </span>
                  </td>
                  <td className="py-3.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium pr-4">
                    {acc.healthScore}/100
                  </td>
                  <td className="py-3.5 text-xs text-zinc-600 dark:text-zinc-400 pr-4 max-w-xs">
                    {acc.criticalSignals}
                  </td>
                  <td className="py-3.5 text-xs text-zinc-500 dark:text-zinc-400 pr-4">
                    {acc.lastInteraction}
                  </td>
                  <td className="py-3.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {acc.renewalTimeline}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
