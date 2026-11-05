"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchAPI } from '@/lib/api';
import { SkeletonBox } from '@/components/shared/SkeletonLoader';
import { Icons } from '@/components/shared/Icons';
import { SignalDetail, SignalOptions, safeSourceUrl, signalDate } from './analysisSignals';
import { ChartHeading } from './AnalysisSignalCharts';
import styles from './AnalysisSignalCharts.module.css';

function FollowupForm({ detail, options, onSaved }: { detail: SignalDetail; options: SignalOptions; onSaved: (value: SignalDetail) => void }) {
  const [state, setState] = useState(detail.state);
  const [priority, setPriority] = useState(detail.priority);
  const [note, setNote] = useState(detail.note);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (state === 'ACTIONED' && !note.trim()) {
      setError('Précisez l’action engagée avant d’enregistrer.');
      return;
    }
    setSaving(true); setError(''); setSaved(false);
    try {
      const result: SignalDetail = await fetchAPI(`/api/kam/analysis-signals/${detail.id}/`, {
        method: 'PATCH', body: JSON.stringify({ state, priority, note }),
      });
      onSaved(result); setSaved(true);
    } catch { setError('Le suivi n’a pas pu être enregistré. Vos notes sont conservées ici ; réessayez.'); }
    finally { setSaving(false); }
  }

  return <form onSubmit={save} className="space-y-4">
    <div className="grid sm:grid-cols-2 gap-4">
      <label className="space-y-2 text-golden-subhead font-medium"><span className="block">Mon suivi</span><select value={state} disabled={saving} onChange={event => { setState(event.target.value); setSaved(false); }} className={`w-full min-h-11 rounded-full px-4 border-0 text-golden-body-sm ${styles.track}`}>{Object.entries(options.states).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label className="space-y-2 text-golden-subhead font-medium"><span className="block">Ma priorité</span><select value={priority} disabled={saving} onChange={event => { setPriority(event.target.value); setSaved(false); }} className={`w-full min-h-11 rounded-full px-4 border-0 text-golden-body-sm ${styles.track}`}>{Object.entries(options.priorities).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    </div>
    <label className="space-y-2 text-golden-subhead font-medium block"><span>Note ou action engagée {state === 'ACTIONED' ? '(obligatoire)' : '(facultatif)'}</span><textarea value={note} disabled={saving} required={state === 'ACTIONED'} maxLength={2000} rows={4} onChange={event => { setNote(event.target.value); setSaved(false); }} placeholder="Ex. : échange avec le DSI, besoin à confirmer lors du prochain rendez-vous." className={`w-full rounded-2xl p-4 border-0 resize-y text-golden-body-sm ${styles.track}`} /></label>
    <p className={`text-golden-subhead ${styles.secondary}`}>Ce suivi vous est personnel. « Action engagée » consigne votre action ; ce statut ne représente pas une vente conclue.</p>
    {error && <p role="alert" className="text-golden-body-sm">{error}</p>}
    {saved && <p role="status" className="text-golden-body-sm flex items-center gap-2"><Icons.CheckCircle size={16} />Suivi enregistré.</p>}
    <button type="submit" disabled={saving} className={`min-h-11 px-5 rounded-full text-golden-body-sm font-semibold disabled:opacity-50 ${styles.action}`}>{saving ? 'Enregistrement…' : 'Enregistrer le suivi'}</button>
  </form>;
}

export default function AnalysisSignalDetail({ id, options, onClose, onSaved }: { id: string; options: SignalOptions; onClose: () => void; onSaved: () => void }) {
  const [historyPage, setHistoryPage] = useState(1);
  const [version, setVersion] = useState(0);
  const key = `${id}:${historyPage}:${version}`;
  const [result, setResult] = useState<{ key: string; detail?: SignalDetail; error?: boolean }>({ key: '' });

  useEffect(() => {
    const controller = new AbortController();
    fetchAPI(`/api/kam/analysis-signals/${id}/?history_page=${historyPage}`, { signal: controller.signal })
      .then((detail: SignalDetail) => setResult({ key, detail }))
      .catch(() => { if (!controller.signal.aborted) setResult(previous => ({ key, error: true, detail: previous.detail })); });
    return () => controller.abort();
  }, [id, historyPage, key]);

  const busy = result.key !== key;
  const detail = result.detail;
  return <section id="signal-detail" className={`p-6 rounded-3xl scroll-mt-6 space-y-6 ${styles.surface}`} aria-label="Détail du signal">
    <div className="flex items-start justify-between gap-4"><h2 className="text-golden-headline font-semibold">Sources et suivi du signal</h2><button type="button" onClick={onClose} className={`min-h-11 min-w-11 rounded-full flex items-center justify-center ${styles.track}`} aria-label="Fermer le détail"><Icons.X size={18} /></button></div>
    {busy && !detail ? <div role="status" aria-label="Chargement des sources"><SkeletonBox height={80} /><SkeletonBox className="mt-4" height={200} /></div> : !detail ? <div role="alert" className="space-y-3"><p className="text-golden-body-sm">Le détail n’a pas pu être chargé. Réessayez pour consulter les sources et le suivi.</p><button type="button" onClick={() => setVersion(value => value + 1)} className={`min-h-11 px-4 rounded-full text-golden-body-sm ${styles.track}`}>Réessayer</button></div> : <>
      {busy && <div role="status" aria-label="Actualisation des preuves"><SkeletonBox height={24} width="60%" /></div>}
      {result.error && <div role="alert" className="text-golden-body-sm space-y-2"><p>Les preuves n’ont pas pu être actualisées. Vos notes et les observations déjà chargées restent affichées.</p><button type="button" onClick={() => setVersion(value => value + 1)} className={`min-h-11 px-4 rounded-full ${styles.track}`}>Réessayer l’actualisation</button></div>}
      <div><p className={`text-golden-eyebrow font-semibold ${styles.secondary}`}>{detail.company} · {options.categories[detail.category]}</p><p className="text-golden-headline font-semibold mt-2 break-words">{detail.title}</p><p className={`text-golden-subhead mt-3 ${styles.secondary}`}>Première observation : {signalDate(detail.first_seen)} · Dernière observation : {signalDate(detail.last_seen)} · Date du fait : {signalDate(detail.event_date)}</p><Link href={`/kam/briefing?id=account-${detail.enterprise_id}`} className="inline-flex items-center gap-2 min-h-11 mt-2 text-golden-body-sm underline">Ouvrir la fiche entreprise<Icons.ChevronRight size={16} /></Link></div>
      <div className="grid xl:grid-cols-2 gap-8">
        <div><ChartHeading title="Historique des preuves" description={`${detail.history.count} observation(s) conservée(s) · les nouvelles recherches complètent cet historique`} /><ol className="space-y-6">{detail.history.results.map((item, index) => <li key={`${item.observed_at}-${index}`} className="space-y-2"><p className="text-golden-body-sm font-semibold">{signalDate(item.observed_at, true)} · {options.confidences[item.confidence]}</p><p className="text-golden-body-sm break-words">{item.fact.statement}</p><p className={`text-golden-subhead ${styles.secondary}`}>Nature : {item.fact.attribution === 'company_claim' ? 'déclaration de l’entreprise' : item.fact.attribution === 'third_party_report' ? 'information rapportée par un tiers' : 'fait attribué à une source'}. Conservé dans Onbora le {signalDate(item.recorded_at, true)}.</p><ul className="space-y-1">{item.sources.map((source, sourceIndex) => {
          const url = safeSourceUrl(source.url);
          return <li key={`${source.url}-${sourceIndex}`} className="text-golden-subhead break-words">{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{source.publisher || source.title || new URL(url).hostname}</a> : <span>{source.publisher || source.title || 'Source sans lien exploitable'}</span>}<span className={`block ${styles.secondary}`}>Collectée le {signalDate(source.collected_at)} · Publiée le {signalDate(source.published_at)}</span></li>;
        })}</ul></li>)}</ol><div className="flex flex-wrap items-center gap-3 mt-6 text-golden-subhead"><button type="button" disabled={busy || detail.history.page <= 1} onClick={() => setHistoryPage(detail.history.page - 1)} className={`min-h-11 px-4 rounded-full disabled:opacity-40 ${styles.track}`}>Précédent</button><span>Page {detail.history.page}/{Math.max(1, Math.ceil(detail.history.count / 10))}</span><button type="button" disabled={busy || detail.history.page * 10 >= detail.history.count} onClick={() => setHistoryPage(detail.history.page + 1)} className={`min-h-11 px-4 rounded-full disabled:opacity-40 ${styles.track}`}>Suivant</button></div></div>
        <div><ChartHeading title="Mon suivi commercial" description="Qualifiez l’intérêt du signal et gardez une trace de votre prochaine action." /><FollowupForm key={id} detail={detail} options={options} onSaved={updated => { setResult({ key, detail: updated }); setHistoryPage(1); onSaved(); }} />{detail.followup.length > 0 && <div className="mt-8"><h3 className="text-golden-body font-semibold mb-4">Historique de mon suivi</h3><ol className="space-y-4">{detail.followup.map((event, index) => <li key={`${event.created_at}-${index}`}><p className="text-golden-subhead font-semibold">{signalDate(event.created_at, true)} · {options.states[event.state]} · {options.priorities[event.priority]}</p>{event.note && <p className={`text-golden-body-sm whitespace-pre-wrap mt-1 ${styles.secondary}`}>{event.note}</p>}</li>)}</ol>{detail.followup_count > 20 && <p className={`text-golden-subhead mt-3 ${styles.secondary}`}>Les 20 dernières mises à jour sont affichées sur {detail.followup_count} conservées.</p>}</div>}</div>
      </div>
    </>}
  </section>;
}
