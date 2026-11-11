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
  source: 'COMPARATEUR' | 'SIGNAUX';
  sourceLabel?: string;
  sourceDetail?: string;
  referenceAccountName?: string;
  scoreAccount?: number;
  scoreReference?: number;
  signalId?: string;
  actionLabel?: string;
  targetUrl?: string;
}

type SourceFilter = 'ALL' | 'COMPARATEUR' | 'SIGNAUX';

export default function UpsellAccountsDetailPage() {
  const router = useRouter();
  const { searchQuery } = useKamContext();
  const [loadError, setLoadError] = useState('');
  const [apiAccounts, setApiAccounts] = useState<UpsellAccountRow[] | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    let isMounted = true;
    fetchAPI('/api/kam/churn-radar/upsell/')
      .then((data) => {
        if (!isMounted || !Array.isArray(data)) return;
        setApiAccounts(data);
      })
      .catch(() => {
        if (isMounted) {
          setLoadError('Impossible de charger les opportunités d’upsell. Réessayez plus tard.');
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const counts = useMemo(() => {
    const list = apiAccounts ?? [];
    return {
      all: list.length,
      comparator: list.filter((a) => a.source === 'COMPARATEUR').length,
      signals: list.filter((a) => a.source === 'SIGNAUX').length,
    };
  }, [apiAccounts]);

  const filtered = useMemo(() => {
    let list = apiAccounts ?? [];

    if (sourceFilter !== 'ALL') {
      list = list.filter((a) => a.source === sourceFilter);
    }

    if (categoryFilter !== 'ALL') {
      list = list.filter((a) => a.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.industry.toLowerCase().includes(q) ||
          a.recommendedSolution.toLowerCase().includes(q) ||
          a.strategicAngle.toLowerCase().includes(q) ||
          (a.sourceDetail && a.sourceDetail.toLowerCase().includes(q))
      );
    }
    return list;
  }, [apiAccounts, sourceFilter, categoryFilter, searchQuery]);

  const handleNavigate = (acc: UpsellAccountRow) => {
    if (acc.source === 'COMPARATEUR') {
      router.push(acc.targetUrl || `/kam/briefing?id=${encodeURIComponent(acc.accountId)}&tab=compare`);
    } else if (acc.source === 'SIGNAUX') {
      router.push(acc.targetUrl || `/kam/briefing?id=${encodeURIComponent(acc.accountId)}&tab=news`);
    } else {
      router.push(`/kam/briefing?id=${encodeURIComponent(acc.accountId)}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 md:p-8 overflow-y-auto select-none bg-[#ECEAE5] dark:bg-[#242124]">
      {loadError && (
        <p role="alert" className="text-sm text-red-700 bg-red-100 p-3 rounded-xl border border-red-200">
          {loadError}
        </p>
      )}

      {/* En-tête avec navigation de retour */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            {filtered.length} opportunité{filtered.length > 1 ? 's' : ''} issue{filtered.length > 1 ? 's' : ''} des analyses de comparateur et signaux d&apos;actualité
          </p>
        </div>

        {/* Filtres par Origine d'Upsell */}
        <div className="inline-flex items-center gap-1.5 p-1 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-full border border-black/5 dark:border-white/5">
          <button
            type="button"
            onClick={() => setSourceFilter('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              sourceFilter === 'ALL'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Toutes ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter('COMPARATEUR')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              sourceFilter === 'COMPARATEUR'
                ? 'bg-[#4F6CE8] text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-[#4F6CE8]'
            }`}
          >
            <Icons.Sliders size={12} />
            <span>Comparateur ({counts.comparator})</span>
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter('SIGNAUX')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              sourceFilter === 'SIGNAUX'
                ? 'bg-[#E8734F] text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-[#E8734F]'
            }`}
          >
            <Icons.Zap size={12} />
            <span>Signaux ({counts.signals})</span>
          </button>
        </div>
      </div>

      {/* Tableau détaillé */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-xl p-6 border border-black/5 dark:border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                <th className="pb-3 font-semibold">Compte & Secteur</th>
                <th className="pb-3 font-semibold">Origine & Déclencheur</th>
                <th className="pb-3 font-semibold">Solution recommandée</th>
                <th className="pb-3 font-semibold">Potentiel estimé</th>
                <th className="pb-3 font-semibold">Angle stratégique</th>
                <th className="pb-3 font-semibold text-right">Action directe</th>
              </tr>
            </thead>
            <tbody>
              {apiAccounts !== null && !loadError && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-zinc-500">
                    Aucune opportunité d’upsell identifiée pour ce filtre.
                  </td>
                </tr>
              )}
              {filtered.map((acc) => (
                <tr
                  key={acc.id}
                  onClick={() => handleNavigate(acc)}
                  className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 pr-4">
                    <span className="block text-xs font-semibold text-zinc-900 dark:text-white">
                      {acc.name}
                    </span>
                    <span className="block text-[11px] text-zinc-400 dark:text-zinc-500">
                      {acc.industry}
                    </span>
                  </td>

                  {/* Origine : Comparateur vs Signaux */}
                  <td className="py-3.5 pr-4 max-w-xs">
                    {acc.source === 'COMPARATEUR' ? (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#4F6CE8]/10 text-[#4F6CE8] w-fit">
                          <Icons.Sliders size={11} />
                          <span>Comparateur (Score Supérieur)</span>
                        </span>
                        {acc.sourceDetail && (
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                            {acc.sourceDetail}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E8734F]/10 text-[#E8734F] w-fit">
                          <Icons.Zap size={11} />
                          <span>Signal d’actualité</span>
                        </span>
                        {acc.sourceDetail && (
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-1">
                            {acc.sourceDetail}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 text-xs text-zinc-800 dark:text-zinc-200 font-medium pr-4 max-w-xs">
                    {acc.recommendedSolution}
                  </td>

                  <td className="py-3.5 text-xs text-zinc-900 dark:text-white font-mono font-semibold pr-4">
                    {acc.estimatedPotential}
                  </td>

                  <td className="py-3.5 text-xs text-zinc-600 dark:text-zinc-400 pr-4 max-w-sm">
                    <p className="line-clamp-2">{acc.strategicAngle}</p>
                  </td>

                  <td className="py-3.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigate(acc);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                        acc.source === 'COMPARATEUR'
                          ? 'bg-[#4F6CE8] text-white hover:bg-[#3D58C7]'
                          : 'bg-[#E8734F] text-white hover:bg-[#D4603E]'
                      }`}
                      title={acc.source === 'COMPARATEUR' ? 'Ouvrir dans le comparateur' : 'Ouvrir dans les signaux d’actualité'}
                    >
                      <span>
                        {acc.source === 'COMPARATEUR' ? 'Voir le comparateur' : 'Voir le signal'}
                      </span>
                      <Icons.ArrowRight size={12} />
                    </button>
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
