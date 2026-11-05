"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';
import { SkeletonBox } from '@/components/shared/SkeletonLoader';
import { useKamContext } from './KamContext';
import { SignalDashboard, SignalFocus, signalDate, signalQuery } from './analysisSignals';
import { ChartHeading, SectorSignalMatrix, SignalBar, SignalCategories, SignalPriorityMatrix, SignalTrend } from './AnalysisSignalCharts';
import AnalysisSignalDetail from './AnalysisSignalDetail';
import styles from './AnalysisSignalCharts.module.css';

export default function KamAnalysisSignalsView() {
  const { searchQuery, setSearchQuery, setFilterOptions } = useKamContext();
  const [days, setDays] = useState('30');
  const [sector, setSector] = useState('');
  const [category, setCategory] = useState('');
  const [state, setState] = useState('');
  const [pagination, setPagination] = useState({ page: 1, search: searchQuery });
  const page = pagination.search === searchQuery ? pagination.page : 1;
  const setPage = (value: number) => setPagination({ page: value, search: searchQuery });
  const [focus, setFocus] = useState<{ filters: SignalFocus; label: string }>({ filters: {}, label: '' });
  const [selectedId, setSelectedId] = useState('');
  const [version, setVersion] = useState(0);
  const query = signalQuery({ days, sector, category, state, q: searchQuery.slice(0, 200), page, ...focus.filters });
  const scope = signalQuery({ days, sector, category, state, q: searchQuery.slice(0, 200) });
  const key = `${query}:${version}`;
  const [response, setResponse] = useState<{ key: string; scope: string; data?: SignalDashboard; error?: boolean }>({ key: '', scope: '' });
  const data = response.data;
  const busy = response.scope !== scope;
  const updating = response.key !== key;

  useEffect(() => {
    setFilterOptions([]);
    return () => setFilterOptions([]);
  }, [setFilterOptions]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchAPI(`/api/kam/analysis-signals/?${query}`, { signal: controller.signal })
        .then((result: SignalDashboard) => setResponse({ key, scope, data: result }))
        .catch(() => { if (!controller.signal.aborted) setResponse({ key, scope, error: true }); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, key, scope]);

  function select(filters: SignalFocus, label: string) {
    setFocus({ filters, label }); setPage(1); setSelectedId('');
  }
  function resetList() { setPage(1); setFocus({ filters: {}, label: '' }); setSelectedId(''); }
  function resetFilters() { setDays('30'); setSector(''); setCategory(''); setState(''); setSearchQuery(''); resetList(); }

  return <div className={`flex-1 min-w-0 overflow-y-auto p-4 md:p-8 space-y-8 ${styles.view}`}>
    <div className="flex flex-wrap justify-between items-start gap-4"><div><p className={`text-golden-eyebrow font-semibold mb-2 ${styles.secondary}`}>Veille Onbora Analysis</p><h1 className="text-golden-large-title font-bold">Analyse des signaux</h1><p className={`text-golden-body mt-2 max-w-2xl ${styles.secondary}`}>Suivez les faits détectés, retrouvez leurs sources et choisissez vos prochaines actions.</p></div><button type="button" disabled={updating} onClick={() => setVersion(value => value + 1)} className={`flex items-center gap-2 min-h-11 px-4 rounded-full text-golden-body-sm font-semibold disabled:opacity-50 ${styles.surface}`}><Icons.RefreshCw size={16} />Actualiser la vue</button></div>

    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <label className="text-golden-subhead font-medium space-y-2"><span className="block">Période de détection</span><select value={days} onChange={event => { setDays(event.target.value); resetList(); }} className={`w-full min-h-11 px-4 rounded-full border-0 text-golden-body-sm ${styles.surface}`}><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 derniers jours</option><option value="365">12 derniers mois</option></select></label>
      <label className="text-golden-subhead font-medium space-y-2"><span className="block">Secteur d’activité</span><select value={sector} onChange={event => { setSector(event.target.value); resetList(); }} className={`w-full min-h-11 px-4 rounded-full border-0 text-golden-body-sm ${styles.surface}`}><option value="">Tous les secteurs</option>{data?.options.sectors.map(value => <option key={value} value={value}>{value || 'Secteur non renseigné'}</option>)}</select></label>
      <label className="text-golden-subhead font-medium space-y-2"><span className="block">Type de signal</span><select value={category} onChange={event => { setCategory(event.target.value); resetList(); }} className={`w-full min-h-11 px-4 rounded-full border-0 text-golden-body-sm ${styles.surface}`}><option value="">Tous les types</option>{Object.entries(data?.options.categories || {}).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label className="text-golden-subhead font-medium space-y-2"><span className="block">Mon suivi</span><select value={state} onChange={event => { setState(event.target.value); resetList(); }} className={`w-full min-h-11 px-4 rounded-full border-0 text-golden-body-sm ${styles.surface}`}><option value="">Tous les statuts</option>{Object.entries(data?.options.states || {}).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    </div>

    {busy ? <div role="status" aria-label="Chargement de l’analyse des signaux" className="space-y-6"><div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{[0, 1, 2, 3].map(id => <SkeletonBox key={id} height={130} />)}</div><div className="grid xl:grid-cols-2 gap-6"><SkeletonBox height={320} /><SkeletonBox height={320} /></div></div> : response.error || !data ? <div role="alert" className={`p-8 rounded-3xl space-y-3 ${styles.surface}`}><Icons.AlertTriangle size={26} /><h2 className="text-golden-headline font-semibold">Analyse indisponible</h2><p className={`text-golden-body ${styles.secondary}`}>L’historique des signaux n’a pas pu être récupéré. Réessayez pour afficher les données.</p><button type="button" onClick={() => setVersion(value => value + 1)} className={`min-h-11 px-5 rounded-full text-golden-body-sm font-semibold ${styles.action}`}>Réessayer</button></div> : <>
      <p className={`text-golden-subhead ${styles.secondary}`}>{signalDate(data.period.start)} — {signalDate(data.period.end)} · {data.stats.analyzed_companies} entreprise(s) analysée(s), {data.stats.research_runs} recherche(s) historisée(s). Actualisé le {signalDate(data.generated_at, true)} (Kinshasa).</p>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{[
        { label: 'Nouveaux signaux', value: data.stats.new_signals, note: 'Faits distincts observés pour la première fois' },
        { label: 'Entreprises concernées', value: data.stats.companies, note: 'Au moins un nouveau signal sur la période' },
        { label: 'Prioritaires à examiner', value: data.stats.priority_pending, note: 'Votre priorité haute, encore à examiner ou vérifier' },
        { label: 'Actions engagées', value: data.stats.actioned, note: 'Signaux de la période avec une action consignée par vous' },
      ].map(metric => <div key={metric.label} className={`p-6 rounded-3xl ${styles.surface}`}><p className={`text-golden-subhead ${styles.secondary}`}>{metric.label}</p><p className="text-golden-large-title font-bold tabular-nums my-2">{metric.value.toLocaleString('fr-FR')}</p><p className={`text-golden-subhead ${styles.secondary}`}>{metric.note}</p></div>)}</div>

      {focus.label && <a href="#analysis-signal-list" role="status" className={`inline-flex items-center gap-2 min-h-11 px-5 rounded-full text-golden-body-sm font-semibold ${styles.action}`}>{focus.label} · {updating ? 'Actualisation de la sélection…' : `${data.list.count} signal(s)`} · Voir la liste<Icons.ChevronRight size={16} /></a>}

      {data.stats.new_signals === 0 && <div className={`p-6 rounded-3xl space-y-3 ${styles.surface}`}><h2 className="text-golden-headline font-semibold">Aucun nouveau signal dans ce périmètre</h2><p className={`text-golden-body-sm ${styles.secondary}`}>{data.stats.research_runs ? 'Des recherches ont été effectuées, sans nouveau fait attribuable dans cette sélection. Les faits déjà connus restent conservés dans leur historique.' : 'Aucune recherche historisée sur cette période. Élargissez la période ou lancez une recherche depuis une fiche entreprise.'}</p><div className="flex flex-wrap gap-4"><button type="button" onClick={resetFilters} className={`min-h-11 px-4 rounded-full text-golden-body-sm ${styles.track}`}>Réinitialiser les filtres</button><Link href="/kam/accounts" className="inline-flex items-center min-h-11 text-golden-body-sm underline">Consulter les entreprises</Link></div></div>}

      <div className="grid xl:grid-cols-2 gap-6"><SignalTrend data={data} onSelect={select} /><SignalCategories data={data} onSelect={select} /></div>
      <SectorSignalMatrix data={data} onSelect={select} />
      <div className="grid xl:grid-cols-12 gap-6"><div className="xl:col-span-8 min-w-0"><SignalPriorityMatrix data={data} onSelect={select} /></div><section className={`xl:col-span-4 p-6 rounded-3xl ${styles.surface}`}><ChartHeading title="Mon suivi des signaux" description="Statuts actuels des signaux détectés sur la période" />{Object.entries(data.options.states).map(([id, label]) => <SignalBar key={id} label={label} count={data.states[id] || 0} max={Math.max(1, ...Object.values(data.states))} onClick={() => select({ focus_state: id }, label)} />)}</section></div>

      <section id="analysis-signal-list" className={`p-6 rounded-3xl scroll-mt-6 ${styles.surface}`} aria-label="Signaux correspondant à la sélection">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6"><div><h2 className="text-golden-headline font-semibold">{focus.label || 'Signaux conservés'}</h2><p role="status" className={`text-golden-subhead mt-1 ${styles.secondary}`}>{data.list.count} signal(s) dans la liste. Les graphiques conservent le périmètre des filtres du haut.</p></div>{focus.label && <button type="button" onClick={resetList} className={`min-h-11 px-4 rounded-full text-golden-body-sm ${styles.track}`}>Effacer la sélection du graphique</button>}</div>
        {updating ? <div role="status" aria-label="Actualisation des signaux sélectionnés"><SkeletonBox height={100} /><SkeletonBox className="mt-4" height={100} /></div> : data.list.results.length ? <ul className="space-y-2">{data.list.results.map(signal => <li key={signal.id} className={`rounded-2xl p-4 ${styles.row} ${selectedId === signal.id ? styles.selected : ''}`}><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex-1 min-w-0"><p className={`text-golden-eyebrow font-semibold ${styles.secondary}`}>{signal.company} · {signal.sector}</p><p className="text-golden-body font-medium mt-2 break-words">{signal.title}</p><p className={`text-golden-subhead mt-2 ${styles.secondary}`}>{data.options.categories[signal.category]} · {data.options.confidences[signal.confidence]} · {data.options.priorities[signal.priority]} · {data.options.states[signal.state]}</p><p className={`text-golden-subhead mt-1 ${styles.secondary}`}>Première observation : {signalDate(signal.first_seen)} · Date du fait : {signalDate(signal.event_date)}</p></div><a href="#signal-detail" onClick={() => setSelectedId(signal.id)} className={`inline-flex items-center gap-2 min-h-11 px-4 rounded-full text-golden-body-sm font-semibold ${styles.track}`}>Examiner<Icons.ChevronRight size={16} /></a></div></li>)}</ul> : <p className={`text-golden-body-sm ${styles.secondary}`}>Aucun signal ne correspond à cette sélection. Choisissez un autre point du graphique ou effacez la sélection.</p>}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 text-golden-subhead"><span>Page {page}/{Math.max(1, Math.ceil(data.list.count / data.list.page_size))}</span><div className="flex gap-3"><button type="button" disabled={page <= 1} onClick={() => { setPage(page - 1); setSelectedId(''); }} className={`min-h-11 px-4 rounded-full disabled:opacity-40 ${styles.track}`}>Précédent</button><button type="button" disabled={page * data.list.page_size >= data.list.count} onClick={() => { setPage(page + 1); setSelectedId(''); }} className={`min-h-11 px-4 rounded-full disabled:opacity-40 ${styles.track}`}>Suivant</button></div></div>
      </section>
      {selectedId && <AnalysisSignalDetail key={selectedId} id={selectedId} options={data.options} onClose={() => setSelectedId('')} onSaved={() => setVersion(value => value + 1)} />}
      <p className={`text-golden-subhead ${styles.secondary}`}>Les courbes suivent la première observation par Onbora Analysis, distincte de la date de l’événement et de l’import dans Onbora. La priorité et le suivi reflètent votre qualification actuelle. Les faits sourcés ne constituent pas des besoins confirmés avec le client.</p>
    </>}
  </div>;
}
