import { SignalDashboard, SignalFocus, signalDate, trendPoints } from './analysisSignals';
import styles from './AnalysisSignalCharts.module.css';

export function ChartHeading({ title, description }: { title: string; description: string }) {
  return <div className="mb-6"><h2 className="text-golden-headline font-semibold">{title}</h2><p className={`text-golden-subhead mt-1 ${styles.secondary}`}>{description}</p></div>;
}

export function SignalBar({ label, count, max, onClick }: { label: string; count: number; max: number; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`w-full rounded-xl px-2 py-3 text-left ${styles.row}`} aria-label={`${label} : ${count} signal(s), afficher la liste`}>
    <span className="flex justify-between gap-4 text-golden-body-sm"><span>{label}</span><span className="font-semibold tabular-nums">{count.toLocaleString('fr-FR')}</span></span>
    <span aria-hidden="true" className={`mt-2 block h-2 rounded-full overflow-hidden ${styles.track}`}><span className={`block h-full rounded-full ${styles.bar}`} style={{ width: `${max ? count / max * 100 : 0}%` }} /></span>
  </button>;
}

type ChartProps = { data: SignalDashboard; onSelect: (focus: SignalFocus, label: string) => void };

export function SignalTrend({ data, onSelect }: ChartProps) {
  const points = trendPoints(data.timeline);
  const max = Math.max(1, ...data.timeline.map(point => point.count));
  return <section className={`p-6 rounded-3xl min-w-0 ${styles.surface}`}>
    <ChartHeading title="Évolution des signaux" description="Première observation des faits distincts · une recherche répétée ne crée pas un nouveau signal" />
    <p className={`text-golden-subhead mb-2 ${styles.secondary}`}>Signaux par jour · maximum {max}</p>
    <svg viewBox="0 0 600 180" className="w-full min-h-40" aria-label="Courbe quotidienne des nouveaux signaux">
      <polyline points={points.map(point => `${point.x},${point.y}`).join(' ')} className={styles.line} />
      {points.filter(point => point.count > 0).map(point => <circle key={point.day} cx={point.x} cy={point.y} r={5} role="button" tabIndex={0} className={styles.point}
        aria-label={`${signalDate(point.day)} : ${point.count} signal(s)`}
        onClick={() => onSelect({ focus_day: point.day }, signalDate(point.day))}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect({ focus_day: point.day }, signalDate(point.day)); } }}><title>{`${signalDate(point.day)} : ${point.count}`}</title></circle>)}
    </svg>
    <div className={`flex justify-between text-golden-subhead gap-4 ${styles.secondary}`}><span>{signalDate(data.period.start)}</span><span>{signalDate(data.period.end)}</span></div>
    <details className="mt-4 text-golden-subhead"><summary className="cursor-pointer min-h-11 flex items-center">Consulter les valeurs par jour</summary><div className="max-h-48 overflow-y-auto">{data.timeline.map(point => <button key={point.day} type="button" className={`w-full flex justify-between min-h-11 p-2 rounded-xl ${styles.row}`} onClick={() => onSelect({ focus_day: point.day }, signalDate(point.day))}><span>{signalDate(point.day)}</span><span>{point.count}</span></button>)}</div></details>
  </section>;
}

export function SignalCategories({ data, onSelect }: ChartProps) {
  return <section className={`p-6 rounded-3xl ${styles.surface}`}><ChartHeading title="Types de signaux" description="Types de faits reçus d’Onbora Analysis · catégorisation par champ de recherche" /><div className="max-h-80 overflow-y-auto">{Object.entries(data.options.categories).map(([id, label]) => <SignalBar key={id} label={label} count={data.categories[id] || 0} max={Math.max(1, ...Object.values(data.categories))} onClick={() => onSelect({ focus_category: id }, label)} />)}</div></section>;
}

export function SectorSignalMatrix({ data, onSelect }: ChartProps) {
  const categories = Object.entries(data.options.categories);
  return <section className={`p-6 rounded-3xl min-w-0 ${styles.surface}`}><ChartHeading title="Secteurs et signaux" description="Signaux distincts et entreprises analysées sur la période · le volume dépend aussi de la couverture de veille" />
    <div className="overflow-x-auto"><table className="w-full text-left text-golden-subhead"><caption className="sr-only">Nombre de signaux par secteur et type. Chaque cellule filtre la liste.</caption><thead><tr><th scope="col" className="pr-4 pb-4 font-medium">Secteur</th><th scope="col" className={`px-2 pb-4 font-medium ${styles.secondary}`}>Entreprises analysées</th>{categories.map(([id, label]) => <th scope="col" key={id} className={`px-2 pb-4 font-medium ${styles.secondary}`}>{label}</th>)}</tr></thead><tbody>{data.sector_matrix.map(row => <tr key={row.sector}><th scope="row" className="pr-4 py-2 font-medium">{row.sector || 'Non renseigné'}</th><td className="px-2 tabular-nums">{row.analyzed_companies}</td>{categories.map(([id, label]) => <td key={id} className="p-1"><button type="button" onClick={() => onSelect({ focus_sector: row.sector, focus_category: id }, `${row.sector || 'Non renseigné'} · ${label}`)} className={`w-full min-w-20 min-h-11 px-3 rounded-xl tabular-nums ${styles.track} ${styles.row}`} aria-label={`${row.sector || 'Secteur non renseigné'}, ${label} : ${row.categories[id] || 0} signal(s)`}>{row.categories[id] || 0}</button></td>)}</tr>)}</tbody></table></div>
    {data.sector_matrix.length === 0 && <p className={`text-golden-body-sm ${styles.secondary}`}>Aucune recherche historisée dans ce périmètre.</p>}
    <p className={`text-golden-subhead mt-4 ${styles.secondary}`}>Secteur enregistré lors de la détection. Une absence de signal ne signifie pas une absence d’activité.</p>
  </section>;
}

export function SignalPriorityMatrix({ data, onSelect }: ChartProps) {
  return <section className={`p-6 rounded-3xl min-w-0 ${styles.surface}`}><ChartHeading title="Priorité et niveau de preuve" description="Priorité qualifiée par vous · niveau de preuve reçu, sans probabilité artificielle" /><div className="overflow-x-auto"><table className="w-full text-left text-golden-subhead"><caption className="sr-only">Signaux par priorité et niveau de preuve. Chaque cellule filtre la liste.</caption><thead><tr><th scope="col" className="pr-4 pb-4 font-medium">Priorité</th>{Object.entries(data.options.confidences).map(([id, label]) => <th scope="col" key={id} className={`px-2 pb-4 font-medium ${styles.secondary}`}>{label}</th>)}</tr></thead><tbody>{Object.entries(data.options.priorities).map(([priority, label]) => <tr key={priority}><th scope="row" className="pr-4 py-2 font-medium">{label}</th>{Object.entries(data.options.confidences).map(([confidence, confidenceLabel]) => {
      const count = data.priority_matrix.find(row => row.review_priority === priority && row.confidence === confidence)?.count || 0;
      return <td key={confidence} className="p-1"><button type="button" onClick={() => onSelect({ focus_priority: priority, focus_confidence: confidence }, `${label} · ${confidenceLabel}`)} className={`w-full min-w-20 min-h-11 px-3 rounded-xl tabular-nums ${styles.track} ${styles.row}`} aria-label={`${label}, ${confidenceLabel} : ${count} signal(s)`}>{count}</button></td>;
    })}</tr>)}</tbody></table></div><p className={`text-golden-subhead mt-4 ${styles.secondary}`}>« Identité à confirmer » conserve la réserve sur l’entreprise à laquelle la source se rapporte. Une information sourcée reste distincte d’un besoin confirmé avec le client.</p></section>;
}
