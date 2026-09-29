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

const DEFAULT_NO_ACTION_ACCOUNTS: NoActionAccountRow[] = [
  {
    id: 'na-1',
    name: 'Tenke Fungurume Mining (TFM)',
    industry: 'Industrie Minière',
    daysWithoutAction: 28,
    lastContactDate: '01/09/2026',
    lastContactChannel: 'Email de suivi',
    keyStakeholder: 'Nouveau DSI de site',
    recommendedAction: 'Planifier un appel d’introduction et audit télécoms',
    accountId: '1204',
  },
  {
    id: 'na-2',
    name: 'Fleuve Congo Hotel by Blazon',
    industry: 'Hôtellerie',
    daysWithoutAction: 21,
    lastContactDate: '08/09/2026',
    lastContactChannel: 'Appel téléphonique',
    keyStakeholder: 'Directeur d’Exploitation',
    recommendedAction: 'Relancer sur le devis de bascule VoIP',
    accountId: '1196',
  },
  {
    id: 'na-3',
    name: 'Hôtel Memling Kinshasa',
    industry: 'Hôtellerie',
    daysWithoutAction: 19,
    lastContactDate: '10/09/2026',
    lastContactChannel: 'Compte-rendu de visite',
    keyStakeholder: 'Directeur Financier',
    recommendedAction: 'Fixer la date de signature de l’avenant annuel',
    accountId: '1198',
  },
  {
    id: 'na-4',
    name: 'Pullman Grand Hôtel Kinshasa',
    industry: 'Hôtellerie',
    daysWithoutAction: 16,
    lastContactDate: '13/09/2026',
    lastContactChannel: 'Visite physique',
    keyStakeholder: 'Responsable Technique',
    recommendedAction: 'Transmettre l’offre Wifi événementiel 1Gbps',
    accountId: '1195',
  },
  {
    id: 'na-5',
    name: 'Trust Merchant Bank (TMB)',
    industry: 'Banque',
    daysWithoutAction: 15,
    lastContactDate: '14/09/2026',
    lastContactChannel: 'Échange Teams',
    keyStakeholder: 'Responsable Télécoms',
    recommendedAction: 'Confirmer la date du comité trimestriel',
    accountId: '1201',
  },
  {
    id: 'na-6',
    name: 'Grand Karavia Hotel Lubumbashi',
    industry: 'Hôtellerie',
    daysWithoutAction: 24,
    lastContactDate: '05/09/2026',
    lastContactChannel: 'Courrier officiel',
    keyStakeholder: 'Directrice Générale',
    recommendedAction: 'Organiser une visioconférence de mise au point',
    accountId: '1197',
  },
  {
    id: 'na-7',
    name: 'FBNBank RDC Siège',
    industry: 'Banque',
    daysWithoutAction: 17,
    lastContactDate: '12/09/2026',
    lastContactChannel: 'Appel téléphonique',
    keyStakeholder: 'DSI Adjoint',
    recommendedAction: 'Programmer la démonstration de la passerelle Anti-DDoS',
    accountId: '1203',
  },
];

export default function NoActionAccountsDetailPage() {
  const router = useRouter();
  const { searchQuery } = useKamContext();
  const [filterDelay, setFilterDelay] = useState<'ALL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [apiAccounts, setApiAccounts] = useState<NoActionAccountRow[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchAPI('/api/kam/churn-radar/no-action/')
      .then((data) => {
        if (!isMounted || !Array.isArray(data)) return;
        if (data.length > 0) {
          setApiAccounts(data);
        }
      })
      .catch((err) => {
        console.warn('Fallback to local no-action accounts:', err?.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = apiAccounts && apiAccounts.length > 0 ? apiAccounts : DEFAULT_NO_ACTION_ACCOUNTS;
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
            Tous ({DEFAULT_NO_ACTION_ACCOUNTS.length})
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
