"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import { fetchAPI, uploadAudioAPI as uploadFileAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';
import { SkeletonDebriefLoader } from '@/components/shared/SkeletonLoader';
import KamReportCard from './KamReportCard';

interface Source {
  notes: string;
  source_type: string;
  document_text: string;
  document_name: string;
  next_action: string;
  owner: string;
  due_date: string;
}
interface Draft {
  executive_summary: string;
  confirmed_needs: string[];
  objections_raised: string[];
  actions_todo: string[];
  follow_up_email_draft: string;
}
interface Props {
  accountId?: string | number;
  appointmentId?: string | number;
  onSaved: (reportId: number) => void;
}
interface Insights { proposed_scope?: string[]; decisions?: string[]; clarification_questions?: string[] }
const emptySource: Source = { notes: '', source_type: 'NOTES', document_text: '', document_name: '', next_action: '', owner: '', due_date: '' };
const field = 'w-full rounded-2xl bg-transparent border-0 px-0 py-3 text-[14px] leading-[22px] text-[#242124] dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 outline-none focus-visible:outline-2 focus-visible:outline-[#4F6CE8]';
const label = 'block text-[13px] leading-[21px] font-medium mb-2';
const primary = 'min-h-11 rounded-full px-6 py-3 text-[14px] font-semibold bg-[#4F6CE8] text-white hover:bg-[#3D57C5] disabled:opacity-50 disabled:cursor-not-allowed';

export default function KamMeetingReportForm({ accountId, appointmentId, onSaved }: Props) {
  const id = useId();
  const base = appointmentId ? `/api/kam/appointments/${appointmentId}` : `/api/kam/accounts/${accountId}`;
  const [source, setSource] = useState<Source>(emptySource);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [insights, setInsights] = useState<Insights>({});
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState<'prepare' | 'save' | 'document' | null>(null);
  const [error, setError] = useState('');
  const [storageKey, setStorageKey] = useState('');
  const [loaded, setLoaded] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    let cancelled = false;
    const restore = async () => {
      await Promise.resolve();
      if (cancelled) return;
      let restored = emptySource;
      let key = '';
      try {
        const user = localStorage.getItem('user') || '';
        let userId = 'session';
        try { userId = String(JSON.parse(user).id ?? 'session'); } catch { /* Current session scope. */ }
        key = `onbora_meeting_report_${userId}_${base}`;
        const saved = localStorage.getItem(key);
        if (saved) restored = { ...emptySource, ...JSON.parse(saved) };
        else if (appointmentId) {
          const legacy = JSON.parse(localStorage.getItem(`onbora_kam_vocal_visit_${appointmentId}`) || 'null');
          if (legacy) restored = { ...emptySource, notes: [legacy.writtenNotes, legacy.voiceTranscript].filter(Boolean).join('\n\n') };
        }
      } catch { setError('Le brouillon local ne peut pas être restauré. Vérifiez vos notes.'); }
      setSource(restored);
      setDraft(null);
      setStorageKey(key);
      setLoaded(true);
    };
    void restore();
    return () => { cancelled = true; active.current = false; };
  }, [base, appointmentId]);

  useEffect(() => {
    if (!loaded || !storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify(source)); }
    catch { queueMicrotask(() => { if (active.current) setError('Le brouillon ne peut pas être sauvegardé sur cet appareil. Gardez cet écran ouvert.'); }); }
  }, [source, loaded, storageKey]);

  const reviewing = !!draft;
  useEffect(() => { if (reviewing) heading.current?.focus(); }, [reviewing]);

  const change = (key: keyof Source, value: string) => setSource(current => ({ ...current, [key]: value }));
  const importDocument = async (file?: File) => {
    if (!file) return;
    setError('');
    if (file.size > 5 * 1024 * 1024) { setError('Le document dépasse 5 Mo. Choisissez un fichier plus léger.'); return; }
    setBusy('document');
    try {
      const body = new FormData();
      body.append('document', file);
      const result = await uploadFileAPI(`${base}/report-document/`, body);
      if (active.current) setSource(current => ({ ...current, document_text: result.text, document_name: result.name }));
    } catch { if (active.current) setError('Ce document ne peut pas être lu. Essayez un PDF avec du texte, un DOCX ou copiez les passages utiles.'); }
    finally { if (active.current) setBusy(null); if (fileInput.current) fileInput.current.value = ''; }
  };

  const prepare = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(''); setBusy('prepare');
    try {
      const result = await fetchAPI(`${base}/report-draft/`, { method: 'POST', body: JSON.stringify({ ...source, due_date: source.due_date || null }) });
      if (active.current) { setDraft(result.draft); setToken(result.draft_token); setInsights(result.insights || {}); }
    } catch { if (active.current) setError('Le compte rendu n’a pas pu être préparé. Vérifiez votre connexion et réessayez. Vos notes sont conservées.'); }
    finally { if (active.current) setBusy(null); }
  };

  const save = async () => {
    if (!draft || busy) return;
    setError(''); setBusy('save');
    try {
      const result = await fetchAPI(`${base}/report-complete/`, { method: 'POST', body: JSON.stringify({ ...draft, confirmed_needs: draft.confirmed_needs.filter(s => s.trim()), objections_raised: draft.objections_raised.filter(s => s.trim()), actions_todo: draft.actions_todo.filter(s => s.trim()), draft_token: token }) });
      if (!active.current) return;
      try {
        localStorage.removeItem(storageKey);
        if (appointmentId) localStorage.removeItem(`onbora_kam_vocal_visit_${appointmentId}`);
      } catch { /* The report has already been saved. */ }
      onSaved(result.report.id);
    } catch { if (active.current) setError('Le compte rendu n’a pas pu être enregistré. Réessayez ; si le brouillon a expiré, revenez aux notes pour le préparer à nouveau.'); }
    finally { if (active.current) setBusy(null); }
  };

  const editList = (key: 'confirmed_needs' | 'objections_raised' | 'actions_todo', value: string) => {
    if (draft) setDraft({ ...draft, [key]: value.split('\n') });
  };
  const hasContent = !!(source.notes.trim() || source.document_text.trim() || source.next_action.trim());

  return <div className="@container space-y-6 text-[#242124] dark:text-white">
    {error && <p role="alert" className="rounded-2xl bg-white dark:bg-[#2F2C30] px-5 py-4 text-[13px] leading-[21px]">{error}</p>}
    {busy === 'prepare' || busy === 'save' ? <div role="status" aria-live="polite" className="rounded-3xl bg-white dark:bg-[#2F2C30] p-6">
      <p className="text-[13px] leading-[21px] mb-4">{busy === 'save' ? 'Enregistrement du compte rendu…' : 'Lecture des éléments et préparation du suivi…'}</p>
      <SkeletonDebriefLoader />
    </div> : draft ? <section className="space-y-6">
      <div>
        <h2 ref={heading} tabIndex={-1} className="text-[21px] leading-[27px] font-semibold outline-none">Relire le compte rendu</h2>
        <p className="mt-2 text-[13px] leading-[21px] text-zinc-500 dark:text-zinc-400">Vérifiez la synthèse et les actions avant de les ajouter au dossier.</p>
      </div>
      <div className="grid gap-4 @3xl:grid-cols-2">
        <KamReportCard title="L’essentiel" icon={<Icons.FileText size={20} />} className="@3xl:col-span-2">
          <label className="sr-only" htmlFor={`${id}-summary`}>Synthèse</label>
          <textarea id={`${id}-summary`} className={field} rows={4} maxLength={30000} value={draft.executive_summary} onChange={e => setDraft({ ...draft, executive_summary: e.target.value })} />
        </KamReportCard>
        {([
          ['confirmed_needs', 'Besoins confirmés'], ['objections_raised', 'Objections et blocages'], ['actions_todo', 'Prochaines actions'],
        ] as const).map(([key, title]) => <KamReportCard key={key} title={title} description="Un élément par ligne. Vous pouvez corriger ou retirer chaque point.">
          <label className="sr-only" htmlFor={`${id}-${key}`}>{title}</label>
          <textarea id={`${id}-${key}`} className={field} rows={3} placeholder="Aucun élément renseigné." value={draft[key].join('\n')} onChange={e => editList(key, e.target.value)} />
        </KamReportCard>)}
        <KamReportCard title="Email de suivi" description="Un brouillon à relire et à adapter avant envoi.">
          <details><summary className="cursor-pointer min-h-11 text-[14px] py-3">Ouvrir le brouillon</summary>
            <label className="sr-only" htmlFor={`${id}-email`}>Brouillon de l’email</label>
            <textarea id={`${id}-email`} className={field} rows={7} maxLength={30000} value={draft.follow_up_email_draft} onChange={e => setDraft({ ...draft, follow_up_email_draft: e.target.value })} />
          </details>
        </KamReportCard>
        {([
          ['proposed_scope', 'Périmètre proposé'], ['decisions', 'Décisions relevées'], ['clarification_questions', 'À clarifier pour la suite'],
        ] as const).filter(([key]) => insights[key]?.length).map(([key, title]) => <KamReportCard key={key} title={title}>
          <ul className="space-y-3 text-[13px] leading-[21px]">{insights[key]?.map((point, index) => <li key={index} className="flex gap-3"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-400" /><span>{point}</span></li>)}</ul>
        </KamReportCard>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button type="button" className="min-h-11 px-2 text-[14px]" onClick={() => { setDraft(null); setError(''); }}>Revenir aux notes</button>
        <button type="button" className={primary} disabled={!draft.executive_summary.trim()} onClick={() => void save()}>Valider et enregistrer</button>
      </div>
    </section> : <form onSubmit={prepare} className="space-y-5">
      <div className="grid grid-cols-1 items-start gap-4 @3xl:grid-cols-3">
        <KamReportCard title="Les informations de la rencontre" description="Quelques notes ou un échange suffisent pour commencer." icon={<Icons.FileText size={20} />} className="@3xl:col-span-2">
          <label className={label} htmlFor={`${id}-source`}>À partir de</label>
          <select id={`${id}-source`} className={`${field} mb-4 rounded-full !bg-[#F6F5F2] dark:!bg-[#242124] !px-4`} value={source.source_type} onChange={e => change('source_type', e.target.value)}>
            <option value="NOTES">Notes de rencontre</option><option value="MESSAGE">Message de suivi</option><option value="PROPOSAL">Proposition commerciale</option><option value="TECHNICAL">Retour avant-vente</option>
          </select>
          <label className={label} htmlFor={`${id}-notes`}>Notes ou message</label>
          <textarea id={`${id}-notes`} className={`${field} min-h-[240px] resize-y`} rows={8} maxLength={30000} value={source.notes} onChange={e => change('notes', e.target.value)} placeholder="Ex. Le client demande une connexion de secours pour son site. Une étude de couverture est à préparer." aria-describedby={`${id}-count`} />
          <p id={`${id}-count`} className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">{source.notes.length.toLocaleString('fr-FR')} / 30 000 caractères</p>
        </KamReportCard>
        <div className="space-y-4">
          <KamReportCard title="Document" description="Reprenez une proposition, des notes ou un retour avant-vente." icon={<Icons.FileText size={18} />}>
            <input ref={fileInput} type="file" accept=".pdf,.docx,.txt,.md,.csv" aria-label="Choisir un document" disabled={!!busy} onChange={e => void importDocument(e.target.files?.[0])} className="sr-only" />
            <button type="button" onClick={() => fileInput.current?.click()} disabled={!!busy} className="min-h-11 rounded-full bg-[#F6F5F2] dark:bg-[#242124] px-4 py-2 text-[13px] font-medium disabled:opacity-50">{source.document_name ? 'Remplacer le document' : 'Choisir un document'}</button>
            <p className="mt-3 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">PDF, DOCX ou texte · 5 Mo maximum</p>
            {busy === 'document' && <div role="status" className="mt-4"><p className="text-[13px] mb-2">Lecture du document…</p><SkeletonDebriefLoader /></div>}
            {source.document_name && <div className="mt-4 space-y-2">
              <p className="truncate text-[13px]" title={source.document_name}>{source.document_name}</p>
              <details><summary className="cursor-pointer text-[13px] py-3">Relire le texte importé</summary>
                <label className="sr-only" htmlFor={`${id}-document`}>Passages à retenir</label><textarea id={`${id}-document`} className={field} rows={5} maxLength={30000} value={source.document_text} onChange={e => change('document_text', e.target.value)} />
              </details>
              <button type="button" className="min-h-11 text-[13px] text-zinc-500 dark:text-zinc-400" onClick={() => setSource(current => ({ ...current, document_name: '', document_text: '' }))}>Retirer le document</button>
            </div>}
          </KamReportCard>
          <KamReportCard title="Prochaine action" description="Si la suite est déjà convenue, indiquez-la ici." icon={<Icons.Calendar size={18} />}>
            <label className="sr-only" htmlFor={`${id}-action`}>Action</label><input id={`${id}-action`} className={field} maxLength={1000} required={!!(source.owner.trim() || source.due_date)} value={source.next_action} onChange={e => change('next_action', e.target.value)} placeholder="Ex. Demander une étude" />
            <details className="mt-2"><summary className="cursor-pointer text-[13px] py-3">Responsable et échéance</summary>
              <div className="space-y-3 pt-2">
                <div><label className={label} htmlFor={`${id}-owner`}>Responsable · facultatif</label><input id={`${id}-owner`} className={field} maxLength={200} value={source.owner} onChange={e => change('owner', e.target.value)} /></div>
                <div><label className={label} htmlFor={`${id}-date`}>Échéance · facultative</label><input id={`${id}-date`} type="date" className={field} value={source.due_date} onChange={e => change('due_date', e.target.value)} /></div>
              </div>
            </details>
          </KamReportCard>
        </div>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] leading-[21px] text-zinc-500 dark:text-zinc-400">Vous pourrez relire et corriger le compte rendu avant de l’enregistrer.</p>
        <button type="submit" disabled={!loaded || !hasContent || !!busy} className={`${primary} shrink-0 inline-flex justify-center items-center gap-2`}>Préparer le compte rendu<Icons.ArrowRight size={16} /></button>
      </div>
    </form>}
  </div>;
}