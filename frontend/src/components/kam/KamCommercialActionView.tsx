"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { SkeletonBox } from '@/components/shared/SkeletonLoader';
import { useKamContext } from './KamContext';
import styles from './KamCommercialActionView.module.css';

interface CommercialAction {
  company_name: string;
  interest_reason: string;
  recommended_solution: string;
  next_action: string;
  can_add_to_portfolio: boolean;
  is_in_portfolio: boolean;
}

export default function KamCommercialActionView({ newsId }: { newsId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loadAssignedAccounts } = useKamContext();
  const [data, setData] = useState<CommercialAction | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const returnHref = pathname?.startsWith('/kam/feed/leads') ? '/kam/feed/leads' : '/kam/feed/portfolio';

  const handleReturn = () => {
    if (added) void loadAssignedAccounts();
    router.push(returnHref);
  };

  const handleAddToPortfolio = async () => {
    if (adding || !data?.can_add_to_portfolio) return;
    setAdding(true);
    setAddError(null);
    try {
      const result = await fetchAPI(`/api/kam/feed/${encodeURIComponent(newsId)}/convert/`, { method: 'POST' });
      if (!result?.enterprise_id) throw new Error('Conversion non confirmée');
      setData((current) => current ? { ...current, can_add_to_portfolio: false, is_in_portfolio: true } : current);
      setAdded(true);
    } catch {
      setAddError('L’ajout au portefeuille n’a pas abouti. Vérifiez votre connexion et réessayez.');
    } finally {
      setAdding(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchAPI(`/api/kam/feed/${encodeURIComponent(newsId)}/commercial-action/`)
      .then((result: CommercialAction) => { if (active) setData(result); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [newsId, attempt]);

  return (
    <div className="flex-1 min-w-0 overflow-y-auto px-5 py-8 sm:px-8 lg:px-12">
      <article className="mx-auto w-full max-w-[960px] pb-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={handleReturn} className="min-h-11 rounded-lg px-3 py-2 text-[14px] leading-[22px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#4F6CE8]">Retour</button>
          {data && (
            <button type="button" onClick={handleAddToPortfolio} disabled={adding || !data.can_add_to_portfolio} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#4F6CE8] px-4 py-2 text-[14px] leading-[22px] font-semibold text-white hover:bg-[#3E5AC8] disabled:bg-black/5 disabled:text-zinc-500 dark:disabled:bg-white/10 dark:disabled:text-zinc-400 cursor-pointer disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F6CE8]">
              {adding && <SkeletonBox width={16} height={16} rounded="rounded-md" />}
              {adding ? 'Ajout en cours' : data.is_in_portfolio ? 'Ajouté au portefeuille' : 'Ajouter au portefeuille'}
            </button>
          )}
        </div>
        {addError && <p role="alert" className="mb-4 text-[14px] leading-[22px] text-zinc-700 dark:text-zinc-300">{addError}</p>}
        {failed ? (
          <div className="text-[16px] leading-[26px] text-zinc-700 dark:text-zinc-200">
            <p>Les informations commerciales sont indisponibles. Vérifiez votre connexion puis réessayez.</p>
            <button type="button" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }} className="mt-4 min-h-11 rounded-lg bg-[#4F6CE8] px-4 text-white cursor-pointer">Réessayer</button>
          </div>
        ) : !data ? (
          <div role="status" aria-label="Chargement de l’action commerciale" className="space-y-5">
            <SkeletonBox width="65%" height={40} />
            {[0, 1, 2].map((index) => (
              <div key={index} className="rounded-xl bg-[#F6F5F2] dark:bg-[#2F2C30] p-6 sm:p-8 space-y-4">
                <SkeletonBox width="35%" height={16} />
                <SkeletonBox width="90%" height={26} />
                <SkeletonBox width="65%" height={26} />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.slideIn}>
            <header className="mb-8 space-y-2">
              <p className="text-[13px] leading-[21px] font-medium text-zinc-500 dark:text-zinc-400">Action commerciale</p>
              <h1 className="text-[26px] leading-[32px] sm:text-[34px] sm:leading-[40px] tracking-tight font-semibold text-[#242124] dark:text-white break-words">{data.company_name}</h1>
            </header>
            <div className="space-y-4">
              {[
                { label: 'Pourquoi cette entreprise ?', text: data.interest_reason, solution: false },
                { label: 'Solution recommandée', text: data.recommended_solution, solution: true },
                { label: 'Prochaine action', text: data.next_action, solution: false },
              ].map(({ label, text, solution }) => (
                <section key={label} aria-label={label} className="rounded-xl bg-[#F6F5F2] dark:bg-[#2F2C30] p-6 sm:p-8">
                  <div className="mb-4 flex items-center gap-2.5 text-zinc-500 dark:text-zinc-400">
                    <h2 className="text-[13px] leading-[21px] font-medium">{label}</h2>
                  </div>
                  <p className={`${solution ? 'text-[21px] leading-[27px] font-semibold text-[#242124] dark:text-white' : 'text-[16px] leading-[26px] text-zinc-700 dark:text-zinc-300'} max-w-[760px] break-words whitespace-pre-line`}>{text}</p>
                </section>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
