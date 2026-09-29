"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useKamContext } from '@/components/kam/KamContext';
import { Icons } from '@/components/shared/Icons';
import { fetchAPI } from '@/lib/api';

interface NoActionAccountRow {
  id: string;
  name: string;
  industry: string;
  daysWithoutAction: number;
  lastContactDate: string;
  lastContactChannel: string;
  keyStakeholder: string;
  recommendedAction: string;
  accountId: string;
}

export default function NoActionAccountsDetailPage() {
  const router = useRouter();
  const { searchQuery } = useKamContext();
  const [filterDelay, setFilterDelay] = useState<'ALL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [loadError, setLoadError] = useState('');
  const [apiAccounts, setApiAccounts] = useState<NoActionAccountRow[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchAPI('/api/kam/churn-radar/no-action/')
      .then((data) => {
        if (!isMounted || !Array.isArray(data)) return;
        setApiAccounts(data);
      })
      .catch((err) => {
        setLoadError('Impossible de charger les comptes. Réessayez plus tard.');
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = apiAccounts ?? [];
    if (filterDelay === 'HIGH') list = list.filter((a) => a.daysWithoutAction > 20);
    if (filterDelay === 'MEDIUM') list = list.filter((a) => a.daysWithoutAction <= 20);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.industry.toLowerCase().includes(q) ||
          a.keyStakeholder.toLowerCase().includes(q) ||
          a.recommendedAction.toLowerCase().includes(q)
      );
    }
    return list;
  }, [apiAccounts, filterDelay, searchQuery]);

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 md:p-8 overflow-y-auto select-none bg-[#ECEAE5] dark:bg-[#242124]">
{loadError && <p role="alert" className="text-sm text-red-700">{loadError}</p>}
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
            Sans prochaine action
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {filtered.length} comptes sans rendez-vous ni engagement planifié depuis plus de 14 jours
          </p>
        </div>

        {/* Filtres discrets sans bordure */}
        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-full border-none">
          <button
            onClick={() => setFilterDelay('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border-none ${
              filterDelay === 'ALL'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Tous ({apiAccounts?.length ?? 0})
          </button>
          <button
            onClick={() => setFilterDelay('HIGH')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border-none ${
              filterDelay === 'HIGH'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Plus de 20 jours (3)
          </button>
          <button
            onClick={() => setFilterDelay('MEDIUM')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border-none ${
              filterDelay === 'MEDIUM'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            14 à 20 jours (4)
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
                <th className="pb-3 font-semibold">Inactivité</th>
                <th className="pb-3 font-semibold">Dernier échange</th>
                <th className="pb-3 font-semibold">Interlocuteur clé</th>
                <th className="pb-3 font-semibold">Action recommandée</th>
              </tr>
            </thead>
            <tbody>
              {apiAccounts !== null && !loadError && filtered.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-sm text-zinc-500">Aucun compte sans prochaine action.</td></tr>}
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
                      {acc.daysWithoutAction} jours
                    </span>
                  </td>
                  <td className="py-3.5 text-xs text-zinc-700 dark:text-zinc-300 pr-4">
                    <span className="block font-medium">{acc.lastContactDate}</span>
                    <span className="block text-[11px] text-zinc-400 dark:text-zinc-500">{acc.lastContactChannel}</span>
                  </td>
                  <td className="py-3.5 text-xs text-zinc-800 dark:text-zinc-200 font-medium pr-4">
                    {acc.keyStakeholder}
                  </td>
                  <td className="py-3.5 text-xs text-zinc-600 dark:text-zinc-400">
                    {acc.recommendedAction}
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
