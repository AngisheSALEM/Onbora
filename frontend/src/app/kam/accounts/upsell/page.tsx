"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useKamContext } from '@/components/kam/KamContext';
import { Icons } from '@/components/shared/Icons';
import { fetchAPI } from '@/lib/api';

interface UpsellAccountRow {
  id: string;
  name: string;
  industry: string;
  recommendedSolution: string;
  estimatedPotential: string;
  strategicAngle: string;
  category: 'CONNECTIVITE' | 'CLOUD_SECURITY' | 'MULTI_SITES';
  accountId: string;
}

export default function UpsellAccountsDetailPage() {
  const router = useRouter();
  const { searchQuery } = useKamContext();
  const [filterCat, setFilterCat] = useState<'ALL' | 'CONNECTIVITE' | 'CLOUD_SECURITY' | 'MULTI_SITES'>('ALL');
  const [loadError, setLoadError] = useState('');
  const [apiAccounts, setApiAccounts] = useState<UpsellAccountRow[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchAPI('/api/kam/churn-radar/upsell/')
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
    if (filterCat !== 'ALL') list = list.filter((a) => a.category === filterCat);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.industry.toLowerCase().includes(q) ||
          a.recommendedSolution.toLowerCase().includes(q) ||
          a.strategicAngle.toLowerCase().includes(q)
      );
    }
    return list;
  }, [apiAccounts, filterCat, searchQuery]);

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
            Opportunités d’upsell
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {filtered.length} comptes identifiés avec potentiel d’expansion stratégique
          </p>
        </div>

        {/* Filtres discrets sans bordure */}
        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-full border-none">
          <button
            onClick={() => setFilterCat('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border-none ${
              filterCat === 'ALL'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Tous ({apiAccounts?.length ?? 0})
          </button>
          <button
            onClick={() => setFilterCat('MULTI_SITES')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border-none ${
              filterCat === 'MULTI_SITES'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Multi-Sites (4)
          </button>
          <button
            onClick={() => setFilterCat('CONNECTIVITE')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border-none ${
              filterCat === 'CONNECTIVITE'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Connectivité (4)
          </button>
          <button
            onClick={() => setFilterCat('CLOUD_SECURITY')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border-none ${
              filterCat === 'CLOUD_SECURITY'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Cloud & Sécurité (4)
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
                <th className="pb-3 font-semibold">Solution recommandée</th>
                <th className="pb-3 font-semibold">Potentiel estimé</th>
                <th className="pb-3 font-semibold">Angle d’approche stratégique</th>
                <th className="pb-3 font-semibold">Catégorie</th>
              </tr>
            </thead>
            <tbody>
              {apiAccounts !== null && !loadError && filtered.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-sm text-zinc-500">Aucune opportunité d’upsell identifiée.</td></tr>}
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
                  <td className="py-3.5 text-xs text-zinc-800 dark:text-zinc-200 font-medium pr-4 max-w-xs">
                    {acc.recommendedSolution}
                  </td>
                  <td className="py-3.5 text-xs text-zinc-900 dark:text-white font-mono font-semibold pr-4">
                    {acc.estimatedPotential}
                  </td>
                  <td className="py-3.5 text-xs text-zinc-600 dark:text-zinc-400 pr-4 max-w-sm">
                    {acc.strategicAngle}
                  </td>
                  <td className="py-3.5">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium border-0 bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
                      {acc.category === 'MULTI_SITES' ? 'Multi-Sites' : acc.category === 'CONNECTIVITE' ? 'Connectivité' : 'Cloud & Sécurité'}
                    </span>
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
