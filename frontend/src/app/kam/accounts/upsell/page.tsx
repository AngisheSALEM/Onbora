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

const DEFAULT_UPSELL_ACCOUNTS: UpsellAccountRow[] = [
  {
    id: 'up-1',
    name: 'Rawbank RDC Siège',
    industry: 'Banque & Finance',
    recommendedSolution: 'SD-WAN Managé & Extension 25 agences régionales',
    estimatedPotential: '18 000 $ / mois',
    strategicAngle: 'Gouvernance de supervision temps réel et sécurisation BCC',
    category: 'MULTI_SITES',
    accountId: '1199',
  },
  {
    id: 'up-2',
    name: 'Tenke Fungurume Mining (TFM)',
    industry: 'Mines & Métallurgie',
    recommendedSolution: 'Liaison Fibre Dédiée 1Gbps + Réseau LTE Privé',
    estimatedPotential: '22 000 $ / mois',
    strategicAngle: 'Télé-opération industrielle et géolocalisation des engins',
    category: 'CONNECTIVITE',
    accountId: '1204',
  },
  {
    id: 'up-3',
    name: 'EquityBCDC Direction Générale',
    industry: 'Banque & Finance',
    recommendedSolution: 'Pack Agence Connectée Multi-Sites (15 agences)',
    estimatedPotential: '15 000 $ / mois',
    strategicAngle: 'Raccordement rapide sous 45 jours avec secours 4G automatique',
    category: 'MULTI_SITES',
    accountId: '1200',
  },
  {
    id: 'up-4',
    name: 'Sofibanque Siège',
    industry: 'Banque d’Affaires',
    recommendedSolution: 'Fibre Noire Inter-Datacenters & Cloud PRA',
    estimatedPotential: '9 500 $ / mois',
    strategicAngle: 'Conformité régulatrice pour site de repli bancaire distant',
    category: 'CLOUD_SECURITY',
    accountId: '1202',
  },
  {
    id: 'up-5',
    name: 'FBNBank RDC Siège',
    industry: 'Banque Commerciale',
    recommendedSolution: 'Protection Anti-DDoS Managée & Débit Symétrique',
    estimatedPotential: '6 800 $ / mois',
    strategicAngle: 'Sécurisation des passerelles monétiques et transactions SWIFT',
    category: 'CLOUD_SECURITY',
    accountId: '1203',
  },
  {
    id: 'up-6',
    name: 'Trust Merchant Bank (TMB)',
    industry: 'Banque & Services',
    recommendedSolution: 'Liaison Sécurisée Agences Katanga & Kasaï',
    estimatedPotential: '12 500 $ / mois',
    strategicAngle: 'Consolidation du parc d’agences sous un opérateur unique',
    category: 'MULTI_SITES',
    accountId: '1201',
  },
  {
    id: 'up-7',
    name: 'Pullman Grand Hôtel Kinshasa',
    industry: 'Hôtellerie',
    recommendedSolution: 'Wifi Haute Densité Événementiel & Fibre Dédiée Pro',
    estimatedPotential: '5 400 $ / mois',
    strategicAngle: 'Prestations de connectivité pour conférences internationales',
    category: 'CONNECTIVITE',
    accountId: '1195',
  },
  {
    id: 'up-8',
    name: 'Fleuve Congo Hotel by Blazon',
    industry: 'Hôtellerie',
    recommendedSolution: 'VoIP Cloud Unifiée & Téléphonie IP SIP Trunk',
    estimatedPotential: '3 800 $ / mois',
    strategicAngle: 'Remplacement de l’ancien autocommutateur téléphonique obsolète',
    category: 'CLOUD_SECURITY',
    accountId: '1196',
  },
  {
    id: 'up-9',
    name: 'Grand Karavia Hotel Lubumbashi',
    industry: 'Hôtellerie',
    recommendedSolution: 'Liaison Optique Symétrique Redondée',
    estimatedPotential: '4 500 $ / mois',
    strategicAngle: 'Stabilité requise pour la clientèle d’affaires minière',
    category: 'CONNECTIVITE',
    accountId: '1197',
  },
  {
    id: 'up-10',
    name: 'Société Congolaise de Transports (SCPT)',
    industry: 'Logistique & Transport',
    recommendedSolution: 'Interconnexion Ports & Gares Marchandises',
    estimatedPotential: '8 200 $ / mois',
    strategicAngle: 'Traçabilité en temps réel du fret fluvial et ferroviaire',
    category: 'MULTI_SITES',
    accountId: '1204',
  },
  {
    id: 'up-11',
    name: 'Bracongo Kinshasa',
    industry: 'Agroalimentaire',
    recommendedSolution: 'Audit Cybersécurité & Débit Fibre Doublé',
    estimatedPotential: '7 000 $ / mois',
    strategicAngle: 'Interconnexion des entrepôts de distribution périurbains',
    category: 'CLOUD_SECURITY',
    accountId: '1199',
  },
  {
    id: 'up-12',
    name: 'Bralima Siège',
    industry: 'Industrie des Boissons',
    recommendedSolution: 'Réseau IoT & Téléphonie Flotte d’Entreprise',
    estimatedPotential: '11 000 $ / mois',
    strategicAngle: 'Plan de modernisation de la chaîne logistique 2027',
    category: 'CONNECTIVITE',
    accountId: '1200',
  },
];

export default function UpsellAccountsDetailPage() {
  const router = useRouter();
  const { searchQuery } = useKamContext();
  const [filterCat, setFilterCat] = useState<'ALL' | 'CONNECTIVITE' | 'CLOUD_SECURITY' | 'MULTI_SITES'>('ALL');
  const [apiAccounts, setApiAccounts] = useState<UpsellAccountRow[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchAPI('/api/kam/churn-radar/upsell/')
      .then((data) => {
        if (!isMounted || !Array.isArray(data)) return;
        if (data.length > 0) {
          setApiAccounts(data);
        }
      })
      .catch((err) => {
        console.warn('Fallback to local upsell accounts:', err?.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = apiAccounts && apiAccounts.length > 0 ? apiAccounts : DEFAULT_UPSELL_ACCOUNTS;
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
            Tous ({DEFAULT_UPSELL_ACCOUNTS.length})
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
