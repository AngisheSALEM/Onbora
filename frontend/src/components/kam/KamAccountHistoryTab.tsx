"use client";

import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';
import { SkeletonBox } from '@/components/shared/SkeletonLoader';
import KamAccountActionForm, { actionButton, actionField } from './KamAccountActionForm';

type Activity = {
  id: string; title: string; occurred_at: string; author: string; action_type: string;
  status: string; description?: string; result?: string; contact_name?: string; location?: string;
  action_id?: number; appointment_id?: number; report_id?: number; can_manage?: boolean;
};
type AccountActivity = { history: Activity[]; planned: Activity[] };
const statusLabels: Record<string, string> = { COMPLETED: 'Réalisée', SCHEDULED: 'Programmée', IN_PROGRESS: 'En cours', CANCELLED: 'Annulée', RECORDED: 'Consigné' };

function ActivityRow({ entry, children }: { entry: Activity; children?: React.ReactNode }) {
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
      {children}
    </div>
  </li>;
}

export default function KamAccountHistoryTab({ accountId }: { accountId: string }) {
  const cleanId = accountId.replace('account-', '');
  const id = useId();
  const [data, setData] = useState<AccountActivity | null>(null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState<'planned' | 'completed' | null>(null);
  const [success, setSuccess] = useState('');
  const [visible, setVisible] = useState(20);
  const [observedAt, setObservedAt] = useState(0);
  const [closing, setClosing] = useState<{ entry: Activity; status: 'COMPLETED' | 'CANCELLED' } | null>(null);
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const lock = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchAPI(`/api/kam/accounts/${cleanId}/activity/`, { signal: controller.signal })
      .then((value: AccountActivity) => { if (!controller.signal.aborted) { setData(value); setError(''); setObservedAt(Date.now()); } })
      .catch(() => { if (!controller.signal.aborted) setError('L’historique est indisponible. Vérifiez votre connexion, puis réessayez.'); });
    return () => controller.abort();
  }, [cleanId, version]);

  function saved(message: string) {
    setSuccess(message); setForm(null); setClosing(null); setResult('');
    setVersion(value => value + 1);
  }

  async function closeAction(event: FormEvent) {
    event.preventDefault();
    if (!closing || !result.trim() || lock.current) return;
    lock.current = true; setBusy(true); setSaveError('');
    try {
      await fetchAPI(`/api/kam/accounts/${cleanId}/actions/${closing.entry.action_id}/`, {
        method: 'PATCH', body: JSON.stringify({ status: closing.status, result: result.trim() }),
      });
      saved(closing.status === 'COMPLETED' ? 'Action réalisée et ajoutée à l’historique.' : 'Action annulée. Son motif reste dans l’historique.');
    } catch { setSaveError('L’action n’a pas pu être clôturée. Rechargez l’historique et réessayez.'); }
    finally { lock.current = false; setBusy(false); }
  }

  return <section aria-label="Historique commercial du compte" className="rounded-2xl bg-white dark:bg-[#282528] p-5 sm:p-8 text-[#242124] dark:text-zinc-100">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-[26px] leading-[32px] font-semibold">Historique</h2>
        <p className="mt-2 text-[14px] leading-[22px] text-zinc-600 dark:text-zinc-400">Les actions commerciales et les échanges enregistrés sur ce compte.</p>
      </div>
      {!form && !closing && <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setForm('completed'); setSuccess(''); }} className={`${actionButton} hover:bg-black/5 dark:hover:bg-white/5`}>Consigner une action</button>
        <button type="button" onClick={() => { setForm('planned'); setSuccess(''); }} className={`${actionButton} bg-[#4F6CE8] text-white`}><Icons.Plus size={16} />Programmer une action</button>
      </div>}
    </header>
    {success && <p role="status" className="mt-5 text-[14px] leading-[22px]">{success}</p>}
    {form && <KamAccountActionForm key={form} accountId={cleanId} completed={form === 'completed'} onCancel={() => setForm(null)} onSaved={() => saved(form === 'completed' ? 'Action ajoutée à l’historique.' : 'Action programmée. Retrouvez-la dans les actions à venir.')} />}
    {error && <div role="alert" className="mt-6 text-[14px] leading-[22px]"><p>{error}</p><button type="button" className={actionButton} onClick={() => setVersion(value => value + 1)}>Réessayer</button></div>}
    {!data && !error && <div role="status" aria-label="Chargement de l’historique" className="mt-8 space-y-8">{[0, 1, 2].map(index => <div key={index} className="flex gap-4"><SkeletonBox width={36} height={36} rounded="rounded-full" /><div className="flex-1 space-y-3"><SkeletonBox width="65%" height={21} /><SkeletonBox width="45%" height={16} /></div></div>)}</div>}
    {data && <div className="mt-8 space-y-8">
      <section aria-labelledby={`${id}-planned`}>
        <h3 id={`${id}-planned`} className="text-[16px] leading-[26px] font-semibold">Actions à venir <span className="ml-2 text-[13px] font-normal text-zinc-600 dark:text-zinc-400">{data.planned.length}</span></h3>
        {data.planned.length === 0 ? <p className="mt-3 text-[14px] leading-[22px] text-zinc-600 dark:text-zinc-400">Aucune action programmée. Programmez votre prochain échange avec ce compte.</p> : <ol>
          {data.planned.map(entry => <ActivityRow key={entry.id} entry={entry}>
            {entry.status === 'SCHEDULED' && new Date(entry.occurred_at).getTime() < observedAt && <p className="mt-2 text-[13px] leading-[21px] font-semibold">Échéance dépassée</p>}
            {entry.can_manage && !closing && !form && <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className={`${actionButton} bg-[#F6F5F2] dark:bg-[#3B373D]`} onClick={() => { setClosing({ entry, status: 'COMPLETED' }); setResult(''); setSaveError(''); setSuccess(''); }}>Marquer comme réalisée</button>
              <button type="button" className={actionButton} onClick={() => { setClosing({ entry, status: 'CANCELLED' }); setResult(''); setSaveError(''); setSuccess(''); }}>Annuler l’action</button>
            </div>}
            {entry.appointment_id && <Link href={`/kam/meeting-report?appointmentId=${entry.appointment_id}`} className={`${actionButton} mt-2 underline underline-offset-4`}>Préparer le compte rendu</Link>}
            {closing?.entry.id === entry.id && <form onSubmit={closeAction} className="mt-4 space-y-3">
              <label htmlFor={`${id}-result`} className="block text-[14px] leading-[22px] font-medium">{closing.status === 'COMPLETED' ? 'Résultat de l’action *' : 'Motif de l’annulation *'}</label>
              <textarea autoFocus id={`${id}-result`} className={actionField} required maxLength={5000} rows={3} disabled={busy} value={result} onChange={event => setResult(event.target.value)} />
              <p className="text-[13px] leading-[21px] text-zinc-600 dark:text-zinc-400">{result.length} / 5 000 caractères</p>
              {saveError && <p role="alert" className="text-[14px] leading-[22px]">{saveError}</p>}
              <div className="flex gap-2"><button type="submit" disabled={busy || !result.trim()} className={`${actionButton} bg-[#4F6CE8] text-white`}>{busy && <SkeletonBox width={16} height={16} />}{busy ? 'Enregistrement…' : 'Enregistrer'}</button><button type="button" disabled={busy} className={actionButton} onClick={() => setClosing(null)}>Revenir</button></div>
            </form>}
          </ActivityRow>)}
        </ol>}
      </section>
      <section aria-labelledby={`${id}-past`}>
        <h3 id={`${id}-past`} className="text-[16px] leading-[26px] font-semibold">Actions passées <span className="ml-2 text-[13px] font-normal text-zinc-600 dark:text-zinc-400">{data.history.length}</span></h3>
        {data.history.length === 0 ? <p className="mt-3 text-[14px] leading-[22px] text-zinc-600 dark:text-zinc-400">Aucune action enregistrée pour ce compte. Consignez une action réalisée pour commencer son historique.</p> : <ol>{data.history.slice(0, visible).map(entry => <ActivityRow key={entry.id} entry={entry} />)}</ol>}
        {visible < data.history.length && <button type="button" onClick={() => setVisible(value => value + 20)} className={`${actionButton} bg-[#F6F5F2] dark:bg-[#3B373D]`}>Afficher les actions précédentes</button>}
      </section>
    </div>}
  </section>;
}
