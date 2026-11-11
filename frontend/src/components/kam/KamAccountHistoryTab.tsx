"use client";

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';
import { SkeletonBox } from '@/components/shared/SkeletonLoader';
import KamAccountActionForm, { actionButton } from './KamAccountActionForm';

type Activity = {
  id: string; title: string; occurred_at: string; author: string; action_type: string;
  status: string; description?: string; result?: string; contact_name?: string; location?: string;
  report_id?: number;
};
type AccountActivity = { history: Activity[] };
const statusLabels: Record<string, string> = { COMPLETED: 'Réalisée', CANCELLED: 'Annulée', RECORDED: 'Consigné' };

function ActivityRow({ entry }: { entry: Activity }) {
  return <li className="flex gap-4 py-5">
    <span aria-hidden="true" className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ECEAE5] dark:bg-[#3B373D] text-zinc-600 dark:text-zinc-300"><Icons.Clock size={16} /></span>
    <div className="min-w-0 flex-1">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
        <h3 className="text-[16px] leading-[26px] font-semibold break-words">{entry.title}</h3>
        <time dateTime={entry.occurred_at} className="shrink-0 text-[13px] leading-[21px] text-zinc-600 dark:text-zinc-400">
          {new Date(entry.occurred_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>
      <p className="mt-1 text-[13px] leading-[21px] text-zinc-600 dark:text-zinc-400">{entry.action_type} · {statusLabels[entry.status] || entry.status} · {entry.author}</p>
      {entry.contact_name && <p className="mt-1 text-[13px] leading-[21px]">Avec {entry.contact_name}</p>}
      {entry.location && <p className="text-[13px] leading-[21px] text-zinc-600 dark:text-zinc-400">{entry.location}</p>}
      {entry.description && <p className="mt-3 whitespace-pre-wrap break-words text-[14px] leading-[22px]">{entry.description}</p>}
      {entry.result && <p className="mt-3 whitespace-pre-wrap break-words text-[14px] leading-[22px]"><span className="font-semibold">{entry.status === 'CANCELLED' ? 'Motif : ' : 'Résultat : '}</span>{entry.result}</p>}
      {entry.report_id && <Link href={`/kam/report?reportId=${entry.report_id}`} className={`${actionButton} mt-2 underline underline-offset-4`}>Consulter le compte rendu</Link>}
    </div>
  </li>;
}

export default function KamAccountHistoryTab({ accountId }: { accountId: string }) {
  const cleanId = accountId.replace('account-', '');
  const id = useId();
  const [data, setData] = useState<AccountActivity | null>(null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState('');
  const [visible, setVisible] = useState(20);

  useEffect(() => {
    const controller = new AbortController();
    fetchAPI(`/api/kam/accounts/${cleanId}/activity/`, { signal: controller.signal })
      .then((value: AccountActivity) => { if (!controller.signal.aborted) { setData(value); setError(''); } })
      .catch(() => { if (!controller.signal.aborted) setError('L’historique est indisponible. Vérifiez votre connexion, puis réessayez.'); });
    return () => controller.abort();
  }, [cleanId, version]);

  function saved() {
    setSuccess('Action ajoutée à l’historique.'); setShowForm(false);
    setVersion(value => value + 1);
  }

  return <section aria-label="Historique commercial du compte" className="rounded-2xl bg-white dark:bg-[#282528] p-5 sm:p-8 text-[#242124] dark:text-zinc-100">
    <header className="flex items-center justify-between gap-4">
      <h2 className="text-[26px] leading-[32px] font-semibold">Historique</h2>
      <button type="button" aria-label="Consigner une action" title="Consigner une action" aria-haspopup="dialog" aria-expanded={showForm}
        onClick={() => { setShowForm(true); setSuccess(''); }}
        className={`${actionButton} h-11 w-11 shrink-0 px-0 bg-[#4F6CE8] text-white`}><Icons.Plus size={20} /></button>
    </header>
    {success && <p role="status" className="mt-5 text-[14px] leading-[22px]">{success}</p>}
    {showForm && <KamAccountActionForm accountId={cleanId} onCancel={() => setShowForm(false)} onSaved={saved} />}
    {error && <div role="alert" className="mt-6 text-[14px] leading-[22px]"><p>{error}</p><button type="button" className={actionButton} onClick={() => setVersion(value => value + 1)}>Réessayer</button></div>}
    {!data && !error && <div role="status" aria-label="Chargement de l’historique" className="mt-8 space-y-8">{[0, 1, 2].map(index => <div key={index} className="flex gap-4"><SkeletonBox width={36} height={36} rounded="rounded-full" /><div className="flex-1 space-y-3"><SkeletonBox width="65%" height={21} /><SkeletonBox width="45%" height={16} /></div></div>)}</div>}
    {data && <div className="mt-8">
      <section aria-labelledby={`${id}-past`}>
        <h3 id={`${id}-past`} className="text-[16px] leading-[26px] font-semibold">Actions passées <span className="ml-2 text-[13px] font-normal text-zinc-600 dark:text-zinc-400">{data.history.length}</span></h3>
        {data.history.length === 0 ? <p className="mt-3 text-[14px] leading-[22px] text-zinc-600 dark:text-zinc-400">Aucune action enregistrée pour ce compte. Consignez une action réalisée pour commencer son historique.</p> : <ol>{data.history.slice(0, visible).map(entry => <ActivityRow key={entry.id} entry={entry} />)}</ol>}
        {visible < data.history.length && <button type="button" onClick={() => setVisible(value => value + 20)} className={`${actionButton} bg-[#F6F5F2] dark:bg-[#3B373D]`}>Afficher les actions précédentes</button>}
      </section>
    </div>}
  </section>;
}
