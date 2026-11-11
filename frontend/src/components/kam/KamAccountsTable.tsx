"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { StrategicVisit } from './kamTypes';
import { Icons } from '@/components/shared/Icons';
import { fetchAPI } from '@/lib/api';

interface UpsellApiItem {
  id: string;
  name: string;
  accountId: string;
  source: 'COMPARATEUR' | 'SIGNAUX';
  recommendedSolution?: string;
  targetUrl?: string;
}

interface AccountUpsellState {
  hasUpsell: boolean;
  signalUpsell?: UpsellApiItem;
  compareUpsell?: UpsellApiItem;
}

interface Props {
  accounts: StrategicVisit[];
  loading: boolean;
  error: string | null;
  onSelectAccount?: (account: StrategicVisit) => void;
}

export default function KamAccountsTable({ accounts, loading, error, onSelectAccount }: Props) {
  const [upsellMap, setUpsellMap] = useState<Record<string, AccountUpsellState>>({});

  useEffect(() => {
    let isMounted = true;
    fetchAPI('/api/kam/churn-radar/upsell/')
      .then((data: UpsellApiItem[]) => {
        if (!isMounted || !Array.isArray(data)) return;
        const map: Record<string, AccountUpsellState> = {};
        for (const item of data) {
          const accId = String(item.accountId);
          if (!map[accId]) {
            map[accId] = {
              hasUpsell: true,
              signalUpsell: item.source === 'SIGNAUX' ? item : undefined,
              compareUpsell: item.source === 'COMPARATEUR' ? item : undefined,
            };
          } else {
            if (item.source === 'SIGNAUX' && !map[accId].signalUpsell) {
              map[accId].signalUpsell = item;
            }
            if (item.source === 'COMPARATEUR' && !map[accId].compareUpsell) {
              map[accId].compareUpsell = item;
            }
          }
        }
        setUpsellMap(map);
      })
      .catch((err) => {
        console.debug("[KamAccountsTable] Détection d'upsell en arrière-plan :", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left border-collapse" aria-label="Comptes B2B attribués">
        <thead>
          <tr className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {['Compte', 'Secteur', 'Contact principal', 'Fin du contrat'].map((label) => (
              <th key={label} scope="col" className="pb-4 pr-4 font-semibold">{label}</th>
            ))}
            <th scope="col" className="pb-4 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} className="py-10 text-center text-sm text-zinc-500" role="status">Chargement des comptes…</td></tr>
          ) : error ? (
            <tr><td colSpan={5} className="py-8 text-center text-sm text-zinc-600 dark:text-zinc-300" role="alert">{error}</td></tr>
          ) : accounts.length === 0 ? (
            <tr><td colSpan={5} className="py-10 text-center text-sm text-zinc-500">Aucun compte à afficher. Vérifiez votre recherche ou les comptes attribués à votre portefeuille.</td></tr>
          ) : accounts.map((account) => {
            const cleanId = String(account.account_id || account.id).replace('account-', '').replace(/\D/g, '') || String(account.id);
            const upsellInfo = upsellMap[cleanId] || upsellMap[String(account.id)];

            return (
              <tr key={account.id} className="hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
                <td className="py-4 pr-4 text-xs font-semibold text-zinc-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    {onSelectAccount ? (
                      <button type="button" onClick={() => onSelectAccount(account)} className="text-left hover:underline focus-visible:underline cursor-pointer">{account.account_name}</button>
                    ) : (
                      <Link href={`/kam/briefing?id=${encodeURIComponent(account.id)}`} className="hover:underline focus-visible:underline">{account.account_name}</Link>
                    )}
                    {account.is_recently_added && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#4F6CE8]/10 text-[#4F6CE8] dark:bg-[#4F6CE8]/20 dark:text-[#8FA5FF] shrink-0">
                        Nouveau
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4 pr-4 text-xs text-zinc-700 dark:text-zinc-300">{account.briefing?.industry || 'Non renseigné'}</td>
                <td className="py-4 pr-4 text-xs text-zinc-700 dark:text-zinc-300">{account.contact_name || 'Non renseigné'}</td>
                <td className="py-4 pr-4 text-xs text-zinc-500 dark:text-zinc-400">
                  {account.orange_contract_end_date || (account.is_recently_added ? 'À conquérir (Opérateur Tiers)' : 'Non renseignée')}
                </td>
                <td className="py-4 text-xs text-right whitespace-nowrap">
                  <div className="inline-flex items-center justify-end gap-1.5">
                    {upsellInfo?.hasUpsell ? (
                      <>
                        {/* Si l'upsell vient d'un signal */}
                        {upsellInfo.signalUpsell && (
                          <Link
                            href={upsellInfo.signalUpsell.targetUrl || `/kam/briefing?id=${encodeURIComponent(account.id)}&tab=news`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#E8734F]/10 dark:bg-[#E8734F]/20 hover:bg-[#E8734F] hover:text-white text-[#E8734F] dark:text-[#FFA07A] text-[11px] font-bold border border-[#E8734F]/25 transition-all shadow-xs group"
                            title={`Opportunité d’upsell (Signal d’actualité) : ${upsellInfo.signalUpsell.recommendedSolution || 'Voir les signaux d’actualité'}`}
                          >
                            <span className="inline-flex items-center justify-center animate-breathe-up text-[#E8734F] group-hover:text-white transition-colors">
                              <Icons.ArrowUp size={12} />
                            </span>
                            <span>Signal</span>
                          </Link>
                        )}

                        {/* Si l'upsell vient du comparateur */}
                        {upsellInfo.compareUpsell && (
                          <Link
                            href={upsellInfo.compareUpsell.targetUrl || `/kam/briefing?id=${encodeURIComponent(account.id)}&tab=compare`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#4F6CE8]/10 dark:bg-[#4F6CE8]/20 hover:bg-[#4F6CE8] hover:text-white text-[#4F6CE8] dark:text-[#8FA5FF] text-[11px] font-bold border border-[#4F6CE8]/25 transition-all shadow-xs group"
                            title={`Opportunité d’upsell (Score du pair de référence supérieur) : ${upsellInfo.compareUpsell.recommendedSolution || 'Voir le comparateur sectoriel'}`}
                          >
                            <span className="inline-flex items-center justify-center animate-breathe-up text-[#4F6CE8] group-hover:text-white transition-colors">
                              <Icons.ArrowUp size={12} />
                            </span>
                            <span>Comparaison</span>
                          </Link>
                        )}
                      </>
                    ) : (
                      /* Bouton standard en l'absence d'opportunité d'upsell */
                      <Link
                        href={`/kam/briefing?id=${encodeURIComponent(account.id)}&tab=compare`}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-[#4F6CE8] hover:text-white text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold transition-all"
                        title="Comparer avec les pairs du secteur"
                      >
                        <span>Comparer</span>
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
