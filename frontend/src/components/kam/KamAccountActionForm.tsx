"use client";

import { FormEvent, useId, useRef, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { SkeletonBox } from '@/components/shared/SkeletonLoader';

export const actionField = 'w-full min-h-11 rounded-lg bg-[#F6F5F2] dark:bg-[#2F2C30] px-4 py-3 border-0 outline-none focus-visible:outline-2 focus-visible:outline-[#4F6CE8] text-[14px] leading-[22px]';
export const actionButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-[14px] leading-[22px] font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F6CE8] disabled:opacity-50 disabled:cursor-default';

function localDateTime(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function KamAccountActionForm({ accountId, completed, onSaved, onCancel }: {
  accountId: string; completed: boolean; onSaved: () => void; onCancel: () => void;
}) {
  const id = useId();
  const lock = useRef(false);
  const [kind, setKind] = useState('FOLLOW_UP');
  const [date, setDate] = useState(() => localDateTime(new Date(Date.now() + (completed ? -60000 : 86400000))));
  const [result, setResult] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const form = new FormData(event.currentTarget);
    const scheduled = new Date(date);
    if (completed && !result.trim()) {
      setError('Précisez le résultat de l’action réalisée.');
      return;
    }
    if ((completed && scheduled.getTime() > Date.now()) || (!completed && scheduled.getTime() <= Date.now())) {
      setError(completed ? 'Choisissez la date et l’heure auxquelles l’action a été réalisée.' : 'Choisissez une date et une heure à venir.');
      return;
    }
    lock.current = true; setBusy(true); setError('');
    try {
      await fetchAPI(`/api/kam/accounts/${accountId}/activity/`, {
        method: 'POST', body: JSON.stringify({
          action_type: kind, title: String(form.get('title') || '').trim(),
          scheduled_at: scheduled.toISOString(), contact_name: form.get('contact_name'),
          description: notes, location: kind === 'VISIT' ? form.get('location') : '',
          status: completed ? 'COMPLETED' : 'SCHEDULED', result: completed ? result : '',
        }),
      });
      onSaved();
    } catch {
      setError('L’action n’a pas pu être enregistrée. Vérifiez les champs et votre connexion, puis réessayez.');
    } finally { lock.current = false; setBusy(false); }
  }

  return <form onSubmit={save} aria-labelledby={`${id}-heading`} className="space-y-5 py-6">
    <div>
      <h3 id={`${id}-heading`} className="text-[21px] leading-[27px] font-semibold">{completed ? 'Consigner une action réalisée' : 'Programmer une action'}</h3>
      <p className="mt-2 text-[13px] leading-[21px] text-zinc-600 dark:text-zinc-400">Les champs marqués * sont obligatoires. L’action sera rattachée à ce compte, à votre nom.</p>
    </div>
    <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2">
        <label htmlFor={`${id}-kind`} className="text-[13px] leading-[21px] font-medium">Type d’action *</label>
        <select id={`${id}-kind`} className={actionField} value={kind} onChange={e => setKind(e.target.value)}>
          <option value="FOLLOW_UP">Relance</option><option value="CALL">Appel</option><option value="EMAIL">Email</option>
          <option value="PROPOSAL">Proposition commerciale</option><option value="VISIT">Visite en présentiel</option><option value="OTHER">Autre action</option>
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor={`${id}-date`} className="text-[13px] leading-[21px] font-medium">{completed ? 'Date et heure de réalisation *' : 'Date et heure prévues *'}</label>
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
        <label htmlFor={`${id}-notes`} className="text-[13px] leading-[21px] font-medium">{completed ? 'Contexte' : 'Objectif et notes'}</label>
        <textarea id={`${id}-notes`} className={actionField} rows={3} maxLength={5000} value={notes} onChange={e => setNotes(e.target.value)} />
        <p className="text-[13px] leading-[21px] text-zinc-600 dark:text-zinc-400">{notes.length} / 5 000 caractères</p>
      </div>
      {completed && <div className="space-y-2 sm:col-span-2">
        <label htmlFor={`${id}-result`} className="text-[13px] leading-[21px] font-medium">Résultat de l’action *</label>
        <textarea id={`${id}-result`} className={actionField} required rows={3} maxLength={5000} value={result} onChange={e => setResult(e.target.value)} placeholder="Ex. Le client souhaite une proposition révisée pour vendredi." />
        <p className="text-[13px] leading-[21px] text-zinc-600 dark:text-zinc-400">{result.length} / 5 000 caractères</p>
      </div>}
    </fieldset>
    {kind === 'VISIT' && !completed && <p className="text-[13px] leading-[21px] text-zinc-600 dark:text-zinc-400">Cette visite sera également ajoutée à votre agenda.</p>}
    {error && <p role="alert" className="text-[14px] leading-[22px]">{error}</p>}
    <div className="flex flex-wrap gap-3">
      <button type="submit" disabled={busy} className={`${actionButton} bg-[#4F6CE8] text-white`}>
        {busy && <SkeletonBox width={16} height={16} />}{busy ? 'Enregistrement…' : completed ? 'Enregistrer l’action' : 'Programmer l’action'}
      </button>
      <button type="button" onClick={onCancel} disabled={busy} className={`${actionButton} hover:bg-black/5 dark:hover:bg-white/5`}>Annuler</button>
    </div>
  </form>;
}
