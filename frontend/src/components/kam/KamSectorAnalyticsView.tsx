"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';
import { SkeletonBox } from '@/components/shared/SkeletonLoader';
import { useKamContext } from './KamContext';
import { confirmedNeedGroups, renewalDays, sectorGroups, serviceCategories, SectorAccount, SectorAnalyticsData } from './sectorAnalytics';
import styles from './KamSectorAnalyticsView.module.css';

const stages = [
  { id: 'PROSPECT', label: 'Prospects' },
  { id: 'IN_NEGOTIATION', label: 'En négociation' },
  { id: 'CONVERTED', label: 'Convertis' },
  { id: 'LOST', label: 'Perdus' },
];
const number = (value: number) => value.toLocaleString('fr-FR');

function ChartHeading({ title, description }: { title: string; description: string }) {
  return <div className="mb-6"><h2 className="text-golden-headline font-semibold">{title}</h2><p className={`text-golden-subhead mt-1 ${styles.secondary}`}>{description}</p></div>;
}

function BarRow({ label, count, total, onClick }: { label: string; count: number; total: number; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`w-full rounded-xl px-2 py-3 text-left ${styles.row}`} aria-label={`${label} : ${count} compte(s), afficher les comptes`}>
    <span className="flex items-start justify-between gap-4 text-golden-body-sm"><span className="break-words min-w-0">{label}</span><span className="font-semibold tabular-nums shrink-0">{number(count)}</span></span>
    <span aria-hidden="true" className={`mt-2 block h-2 rounded-full overflow-hidden ${styles.track}`}><span className={`block h-full rounded-full ${styles.bar}`} style={{ width: `${total ? count / total * 100 : 0}%` }} /></span>
  </button>;
}

export default function KamSectorAnalyticsView() {
  const { searchQuery, setSearchQuery, setFilterOptions } = useKamContext();
  const [data, setData] = useState<SectorAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sector, setSector] = useState('');
  const [selection, setSelection] = useState<{ label: string; ids: string[] } | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    setFilterOptions([]);
    return () => setFilterOptions([]);
  }, [setFilterOptions]);

  useEffect(() => {
    let cancelled = false;
    fetchAPI('/api/kam/sector-analytics/').then((result: SectorAnalyticsData) => {
      if (!cancelled) { setData(result); setError(false); setLoading(false); }
    }).catch(() => {
      if (!cancelled) { setError(true); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [requestVersion]);

  const refresh = () => { setLoading(true); setError(false); setSelection(null); setRequestVersion(value => value + 1); };
  const groups = useMemo(() => sectorGroups(data?.accounts || []), [data]);
  const accounts = useMemo(() => (data?.accounts || []).filter(account => {
    const query = searchQuery.trim().toLocaleLowerCase('fr');
    return (!sector || account.sector.toLocaleLowerCase('fr') === sector) &&
      (!query || `${account.name} ${account.sector} ${account.needs.join(' ')}`.toLocaleLowerCase('fr').includes(query));
  }), [data, sector, searchQuery]);
  const visibleGroups = useMemo(() => sectorGroups(accounts), [accounts]);
  const needs = useMemo(() => confirmedNeedGroups(accounts), [accounts]);
  const selectAccounts = useCallback((label: string, rows: SectorAccount[]) => {
    setSelection({ label, ids: rows.map(row => row.id) });
  }, []);
  const matchingAccounts = selection ? accounts.filter(account => selection.ids.includes(account.id)) : accounts;
  const documented = accounts.filter(account => account.offers.length > 0).length;
  const withNeeds = accounts.filter(account => account.needs.length > 0).length;
  const renewals = accounts.filter(account => account.offers.some(offer => {
    const days = renewalDays(offer.end_date, data?.today || '');
    return days !== null && days >= 0 && days <= 90;
  }));

  return <div className={`flex-1 min-w-0 overflow-y-auto p-4 md:p-8 space-y-8 ${styles.view}`}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className={`text-golden-eyebrow font-semibold mb-2 ${styles.secondary}`}>Intelligence du portefeuille</p><h1 className="text-golden-large-title font-bold">Analyse par secteur</h1><p className={`text-golden-body mt-2 max-w-2xl ${styles.secondary}`}>Identifiez les besoins de vos clients et préparez vos prochaines actions.</p></div>
      <button type="button" onClick={refresh} disabled={loading} className={`min-h-11 px-4 rounded-full text-golden-body-sm font-semibold flex items-center gap-2 disabled:opacity-50 ${styles.surface}`}><Icons.RefreshCw size={16} />Actualiser</button>
    </div>

    {loading ? <div role="status" aria-label="Chargement de l’analyse sectorielle" className="space-y-6"><SkeletonBox height={44} width="40%" /><div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{[0, 1, 2, 3].map(key => <SkeletonBox key={key} height={130} />)}</div><div className="grid xl:grid-cols-2 gap-6"><SkeletonBox height={320} /><SkeletonBox height={320} /></div></div>
      : error ? <div role="alert" className={`p-8 rounded-3xl space-y-3 ${styles.surface}`}><Icons.AlertTriangle size={26} /><h2 className="text-golden-headline font-semibold">Analyse indisponible</h2><p className={`text-golden-body ${styles.secondary}`}>Les données du portefeuille n’ont pas pu être récupérées. Réessayez pour afficher l’analyse.</p><button type="button" onClick={refresh} className={`min-h-11 px-5 rounded-full text-golden-body-sm font-semibold ${styles.action}`}>Réessayer</button></div>
      : <>
        <div className="flex flex-wrap justify-between items-end gap-4">
          <label className="flex flex-col gap-2 text-golden-subhead font-medium">Secteur d’activité<select value={sector} onChange={event => { setSector(event.target.value); setSelection(null); }} className={`min-h-11 max-w-full sm:min-w-64 rounded-full px-4 text-golden-body-sm border-0 ${styles.surface}`}><option value="">Tous les secteurs</option>{groups.map(group => <option key={group.label.toLocaleLowerCase('fr')} value={group.label.toLocaleLowerCase('fr')}>{group.label}</option>)}</select></label>
          <p className={`text-golden-subhead ${styles.secondary}`}>Vue actuelle · {data && new Date(data.generated_at).toLocaleString('fr-FR', { timeZone: 'Africa/Kinshasa', dateStyle: 'short', timeStyle: 'short' })} (Kinshasa)</p>
        </div>

        {selection && <a href="#sector-accounts" role="status" className={`inline-flex items-center gap-2 min-h-11 px-5 rounded-full text-golden-body-sm font-semibold ${styles.action}`}>{number(matchingAccounts.length)} compte(s) sélectionné(s) · Voir les comptes<Icons.ChevronRight size={16} /></a>}

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Comptes', value: accounts.length, note: 'Dans le périmètre sélectionné' },
            { label: 'En négociation', value: accounts.filter(account => account.status === 'IN_NEGOTIATION').length, note: 'Statut commercial enregistré' },
            { label: 'Comptes avec besoins', value: withNeeds, note: 'Besoins confirmés dans un rapport KAM' },
            { label: 'Échéances à 90 jours', value: renewals.length, note: 'Comptes avec un contrat actif à renouveler' },
          ].map(metric => <div key={metric.label} className={`p-6 rounded-3xl ${styles.surface}`}><p className={`text-golden-subhead ${styles.secondary}`}>{metric.label}</p><p className="text-golden-large-title font-bold tabular-nums my-2">{number(metric.value)}</p><p className={`text-golden-subhead ${styles.secondary}`}>{metric.note}</p></div>)}
        </div>

        {accounts.length === 0 ? <div className={`p-8 rounded-3xl space-y-3 ${styles.surface}`}><Icons.Building size={26} /><h2 className="text-golden-headline font-semibold">Aucun compte dans ce périmètre</h2><p className={`text-golden-body ${styles.secondary}`}>{searchQuery || sector ? 'Modifiez le secteur ou effacez votre recherche pour élargir l’analyse.' : 'L’analyse apparaîtra dès que des comptes seront affectés au portefeuille.'}</p>{(searchQuery || sector) ? <button type="button" className={`min-h-11 px-5 rounded-full text-golden-body-sm font-semibold ${styles.action}`} onClick={() => { setSector(''); setSearchQuery(''); setSelection(null); }}>Réinitialiser les filtres</button> : <Link href="/kam/accounts" className="inline-flex min-h-11 items-center text-golden-body-sm underline">Voir le portefeuille</Link>}</div>
          : <>
            <div className="grid xl:grid-cols-12 gap-6">
              <section className={`xl:col-span-4 p-6 rounded-3xl ${styles.surface}`}><ChartHeading title="Portefeuille par secteur" description="Nombre de comptes · cliquez pour les consulter" /><div className="space-y-1 max-h-96 overflow-y-auto">{visibleGroups.map(group => <BarRow key={group.label} label={group.label} count={group.accounts.length} total={accounts.length} onClick={() => selectAccounts(group.label, group.accounts)} />)}</div></section>
              <section className={`xl:col-span-8 min-w-0 p-6 rounded-3xl ${styles.surface}`}><ChartHeading title="Équipement en services" description="Part des comptes avec au moins une offre active enregistrée dans la catégorie" /><div className="overflow-x-auto"><table className="w-full text-golden-subhead text-left"><caption className="sr-only">Couverture des services actifs par secteur. Chaque cellule ouvre les comptes équipés.</caption><thead><tr><th scope="col" className="pr-4 pb-4 font-medium">Secteur</th>{serviceCategories.map(category => <th scope="col" className={`px-2 pb-4 font-medium ${styles.secondary}`} key={category.id}>{category.label}</th>)}</tr></thead><tbody>{visibleGroups.map(group => <tr key={group.label}><th scope="row" className="pr-4 py-2 font-medium">{group.label}</th>{serviceCategories.map(category => {
                const equipped = group.accounts.filter(account => account.offers.some(offer => offer.category === category.id));
                const hasRecordedCategory = group.accounts.some(account => account.offers.some(offer => offer.category));
                const percent = Math.round(equipped.length / group.accounts.length * 100);
                return <td key={category.id} className="p-1"><button type="button" onClick={() => selectAccounts(`${group.label} · ${category.label}`, equipped)} aria-label={`${group.label}, ${category.label} : ${hasRecordedCategory ? `${equipped.length} sur ${group.accounts.length} comptes` : 'non renseigné'}`} className={`w-full min-w-20 min-h-14 rounded-xl px-2 py-2 ${styles.row}`}><span className="font-semibold tabular-nums">{hasRecordedCategory ? `${percent} %` : '—'}</span><span className={`block text-golden-caption ${styles.secondary}`}>{hasRecordedCategory ? `${equipped.length}/${group.accounts.length} comptes` : 'Non renseigné'}</span><span aria-hidden="true" className={`block h-1 mt-2 rounded-full overflow-hidden ${styles.track}`}><span className={`block h-full ${styles.bar}`} style={{ width: `${percent}%` }} /></span></button></td>;
              })}</tr>)}</tbody></table></div><p className={`mt-5 text-golden-subhead ${styles.secondary}`}>Parc actif renseigné : {documented}/{accounts.length} comptes. Une absence d’offre enregistrée reste à vérifier auprès du client ; elle ne prouve pas l’absence d’équipement.</p></section>
            </div>

            <div className="grid xl:grid-cols-3 gap-6">
              <section className={`p-6 rounded-3xl ${styles.surface}`}><ChartHeading title="Besoins confirmés" description="Nombre de comptes par besoin · rapports KAM, hors suggestions IA" />{needs.length ? <div className="max-h-80 overflow-y-auto">{needs.map(need => <BarRow key={need.label} label={need.label} count={need.accounts.length} total={accounts.length} onClick={() => selectAccounts(`Besoin : ${need.label}`, need.accounts)} />)}</div> : <p className={`text-golden-body-sm ${styles.secondary}`}>Aucun besoin confirmé dans les rapports KAM de ce périmètre. Complétez un compte rendu après votre prochaine visite.</p>}<p className={`mt-4 text-golden-subhead ${styles.secondary}`}>{withNeeds}/{accounts.length} comptes avec des besoins confirmés. Un compte est compté une seule fois par besoin.</p></section>
              <section className={`p-6 rounded-3xl ${styles.surface}`}><ChartHeading title="Étapes commerciales" description="Situation actuelle des comptes · une conversion est distincte d’un dossier accepté" />{stages.map(stage => {
                const rows = accounts.filter(account => account.status === stage.id);
                return <BarRow key={stage.id} label={stage.label} count={rows.length} total={accounts.length} onClick={() => selectAccounts(stage.label, rows)} />;
              })}</section>
              <section className={`p-6 rounded-3xl ${styles.surface}`}><ChartHeading title="Échéances à venir" description="Comptes par fenêtre d’échéance · contrats actifs, tous fournisseurs" />{[{ min: 0, max: 30, label: 'D’ici 30 jours' }, { min: 31, max: 60, label: 'De 31 à 60 jours' }, { min: 61, max: 90, label: 'De 61 à 90 jours' }].map(bucket => {
                const rows = accounts.filter(account => account.offers.some(offer => {
                  const days = renewalDays(offer.end_date, data?.today || '');
                  return days !== null && days >= bucket.min && days <= bucket.max;
                }));
                return <BarRow key={bucket.min} label={bucket.label} count={rows.length} total={accounts.length} onClick={() => selectAccounts(bucket.label, rows)} />;
              })}<p className={`mt-4 text-golden-subhead ${styles.secondary}`}>Un compte peut figurer dans plusieurs fenêtres. Les dates manquantes et les contrats déjà échus sont exclus.</p></section>
            </div>

            <section id="sector-accounts" className={`p-6 rounded-3xl scroll-mt-6 ${styles.surface}`} aria-label="Comptes correspondant à la sélection">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5"><div><h2 className="text-golden-headline font-semibold">{selection ? selection.label : 'Comptes du périmètre'}</h2><p role="status" className={`text-golden-subhead mt-1 ${styles.secondary}`}>{number(matchingAccounts.length)} compte(s) · ouvrez une fiche pour préparer votre action.</p></div>{selection && <button type="button" onClick={() => setSelection(null)} className={`min-h-11 px-4 rounded-full text-golden-body-sm ${styles.track}`}>Effacer la sélection</button>}</div>
              {matchingAccounts.length ? <div className="max-h-96 overflow-y-auto space-y-1">{matchingAccounts.map(account => <Link key={account.id} href={`/kam/briefing?id=${encodeURIComponent(`account-${account.id}`)}`} className={`flex items-center justify-between gap-4 min-h-14 p-3 rounded-xl ${styles.row}`}><div className="min-w-0"><p className="text-golden-body-sm font-semibold break-words">{account.name}</p><p className={`text-golden-subhead ${styles.secondary}`}>{account.sector} · {stages.find(stage => stage.id === account.status)?.label || 'Statut non renseigné'}</p></div><Icons.ChevronRight size={16} className="shrink-0" /></Link>)}</div> : <p className={`text-golden-body-sm ${styles.secondary}`}>Aucun compte ne correspond à cette sélection. Choisissez un autre élément du graphique ou effacez la sélection.</p>}
            </section>
          </>}
      </>}
  </div>;
}
