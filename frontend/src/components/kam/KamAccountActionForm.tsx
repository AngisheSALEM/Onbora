"use client";

import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';
import { SkeletonBox } from '@/components/shared/SkeletonLoader';
import styles from './KamAccountActionForm.module.css';

const actionField = `${styles.field} w-full min-h-11 rounded-lg px-4 py-3 border-0 text-[14px] leading-[22px]`;
export const actionButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-[14px] leading-[22px] font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F6CE8] disabled:opacity-50 disabled:cursor-default';

function localDateTime(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function KamAccountActionForm({ accountId, onSaved, onCancel }: {
  accountId: string; onSaved: () => void; onCancel: () => void;
}) {
  const id = useId();
  const lock = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState('FOLLOW_UP');
  const [date, setDate] = useState(() => localDateTime(new Date(Date.now() - 60000)));
  const [result, setResult] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const modal = dialog.current;
    const previousOverflow = document.body.style.overflow;
    modal?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      modal?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const form = new FormData(event.currentTarget);
    const scheduled = new Date(date);
    if (!result.trim()) {
      setError('Précisez le résultat de l’action réalisée.');
      return;
    }
    if (!Number.isFinite(scheduled.getTime()) || scheduled.getTime() > Date.now()) {
      setError('Choisissez la date et l’heure auxquelles l’action a été réalisée.');
      return;
    }
    lock.current = true; setBusy(true); setError('');
    try {
      await fetchAPI(`/api/kam/accounts/${accountId}/activity/`, {
        method: 'POST', body: JSON.stringify({
          action_type: kind, title: String(form.get('title') || '').trim(),
          scheduled_at: scheduled.toISOString(), contact_name: form.get('contact_name'),
          description: notes, location: kind === 'VISIT' ? form.get('location') : '',
          status: 'COMPLETED', result: result.trim(),
        }),
      });
      onSaved();
    } catch {
      setError('L’action n’a pas pu être enregistrée. Vérifiez les champs et votre connexion, puis réessayez.');
    } finally { lock.current = false; setBusy(false); }
  }

  return <dialog ref={dialog} aria-labelledby={`${id}-heading`} aria-describedby={`${id}-description`}
    onCancel={event => { event.preventDefault(); if (!lock.current) onCancel(); }}
    className={`${styles.modal} m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl bg-white dark:bg-[#242124] p-5 sm:p-8 text-[#242124] dark:text-zinc-100 shadow-xl backdrop:bg-black/40`}>
    <header className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 id={`${id}-heading`} className="text-[21px] leading-[27px] font-semibold">Consigner une action</h2>
        <p id={`${id}-description`} className="mt-2 text-[13px] leading-[21px] text-zinc-600 dark:text-zinc-400">Les champs marqués * sont obligatoires. L’action sera rattachée à ce compte, à votre nom.</p>
      </div>
      <button type="button" aria-label="Fermer le formulaire" disabled={busy} onClick={onCancel} className={`${actionButton} min-w-11 shrink-0 px-2 hover:bg-black/5 dark:hover:bg-white/5`}><Icons.X size={20} /></button>
    </header>
    <form onSubmit={save} aria-labelledby={`${id}-heading`} className="space-y-5">
    <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2">
        <label htmlFor={`${id}-kind`} className="text-[13px] leading-[21px] font-medium">Type d’action *</label>
        <select id={`${id}-kind`} className={actionField} value={kind} onChange={e => setKind(e.target.value)}>
          <option value="FOLLOW_UP">Relance</option><option value="CALL">Appel</option><option value="EMAIL">Email</option>
          <option value="PROPOSAL">Proposition commerciale</option><option value="VISIT">Visite en présentiel</option><option value="OTHER">Autre action</option>
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor={`${id}-date`} className="text-[13px] leading-[21px] font-medium">Date et heure de réalisation *</label>
        <input id={`${id}-date`} className={actionField} type="datetime-local" required value={date} onChange={e => setDate(e.target.value)} />
        <p className="text-[13px] leading-[21px] text-zinc-600 dark:text-zinc-400">Heure locale de votre appareil.</p>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <label htmlFor={`${id}-title`} className="text-[13px] leading-[21px] font-medium">Action *</label>
        <input autoFocus id={`${id}-title`} name="title" className={actionField} required maxLength={200} pattern=".*\S.*" placeholder="Ex. Relancer le client sur la proposition fibre" />
      </div>
      <div className="space-y-2">
        <label htmlFor={`${id}-contact`} className="text-[13px] leading-[21px] font-medium">Interlocuteur</label>
        <input id={`${id}-contact`} name="contact_name" className={actionField} maxLength={150} placeholder="Nom du contact" />
      </div>
      {kind === 'VISIT' && <div className="space-y-2">
        <label htmlFor={`${id}-location`} className="text-[13px] leading-[21px] font-medium">Lieu de la visite *</label>
        <input id={`${id}-location`} name="location" className={actionField} required maxLength={255} pattern=".*\S.*" placeholder="Adresse du rendez-vous" />
      </div>}
      <div className="space-y-2 sm:col-span-2">
        <label htmlFor={`${id}-notes`} className="text-[13px] leading-[21px] font-medium">Contexte</label>
        <textarea id={`${id}-notes`} className={actionField} rows={3} maxLength={5000} value={notes} onChange={e => setNotes(e.target.value)} />
        <p className="text-[13px] leading-[21px] text-zinc-600 dark:text-zinc-400">{notes.length} / 5 000 caractères</p>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <label htmlFor={`${id}-result`} className="text-[13px] leading-[21px] font-medium">Résultat de l’action *</label>
        <textarea id={`${id}-result`} className={actionField} required rows={3} maxLength={5000} value={result} onChange={e => setResult(e.target.value)} placeholder="Ex. Le client souhaite une proposition révisée pour vendredi." />
        <p className="text-[13px] leading-[21px] text-zinc-600 dark:text-zinc-400">{result.length} / 5 000 caractères</p>
      </div>
    </fieldset>
    {error && <p role="alert" className="text-[14px] leading-[22px]">{error}</p>}
    <div className="flex flex-wrap gap-3">
      <button type="submit" disabled={busy} className={`${actionButton} bg-[#4F6CE8] text-white`}>
        {busy && <SkeletonBox width={16} height={16} />}{busy ? 'Enregistrement…' : 'Enregistrer l’action'}
      </button>
      <button type="button" onClick={onCancel} disabled={busy} className={`${actionButton} hover:bg-black/5 dark:hover:bg-white/5`}>Annuler</button>
    </div>
    </form>
  </dialog>;
}
