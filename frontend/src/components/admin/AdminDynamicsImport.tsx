"use client";

import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { SkeletonBox } from '@/components/shared/SkeletonLoader';

type Mapping = { scopes?: Record<string, { entity: string; fields: Record<string, string> }>; warnings?: string[] };
type Run = { id: number; status: string; phase?: string; pages: number; counts: Record<string, { imported: number; skipped: number }>; warnings: string[]; error: string; finished_at?: string };
type ImportState = { mapping: Mapping; latest: Run | null; recent: Run[] };
const endpoint = '/api/accounts/integrations/dynamics/';
const labels: Record<string, string> = { accounts: 'Comptes', contacts: 'Contacts', offers: 'Produits installés', opportunities: 'Opportunités', appointments: 'Rendez-vous' };
const statuses: Record<string, string> = { QUEUED: 'En attente du traitement', RUNNING: 'Import en cours', SUCCEEDED: 'Import terminé', PARTIAL: 'Import terminé avec des points à vérifier', FAILED: 'Import interrompu' };

export default function AdminDynamicsImport({ ready, automatic }: { ready: boolean; automatic: boolean }) {
  const [state, setState] = useState<ImportState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [offerEntity, setOfferEntity] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    function read() {
      fetchAPI(`${endpoint}imports/`, { signal: controller.signal }).then((data: ImportState) => {
        if (!controller.signal.aborted) { setState(data); setError(''); }
      }).catch(() => {
        if (!controller.signal.aborted) setError('Suivi de l’import indisponible. Réessayez dans quelques instants.');
      });
    }
    read();
    const timer = setInterval(read, 5000);
    return () => { controller.abort(); clearInterval(timer); };
  }, []);

  async function act(action: 'mapping/' | 'imports/') {
    setBusy(true); setError('');
    try {
      await fetchAPI(endpoint + action, { method: 'POST', body: JSON.stringify(action === 'mapping/' ? { offer_entity: offerEntity } : {}) });
      setState(await fetchAPI(`${endpoint}imports/`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Action impossible. Vérifiez la connexion Dynamics et réessayez.');
    } finally { setBusy(false); }
  }
  const run = state?.latest;
  const active = !!run && ['QUEUED', 'RUNNING'].includes(run.status);
  return <div className="space-y-4 text-[14px] leading-[1.618]">
    <h4 className="text-[16px] font-semibold">Import des données CRM</h4>
    <p className="text-[#6E6C67] dark:text-[#A1A1AA]">{automatic ? 'Actualisation automatique activée après validation de la connexion.' : 'Actualisation automatique désactivée.'} Les champs sont détectés dans votre environnement Dynamics.</p>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={!ready || busy || active} onClick={() => act('imports/')} className="min-h-11 rounded-lg bg-[#4F6CE8] px-5 text-white font-semibold disabled:opacity-50">{busy ? 'Traitement en cours…' : 'Importer maintenant'}</button>
      <button type="button" disabled={!ready || busy || active} onClick={() => act('mapping/')} className="min-h-11 rounded-lg bg-[#F6F5F2] dark:bg-[#242124] px-5 font-semibold disabled:opacity-50">Détecter les champs</button>
    </div>
    {error && <p role="alert">{error}</p>}
    {!state && !error && <SkeletonBox height={72} />}
    {state && !run && <p className="text-[#6E6C67] dark:text-[#A1A1AA]">Aucun import effectué. Validez la connexion puis lancez le premier import.</p>}
    {run && <div role="status" className="space-y-2">
      <p className="font-semibold">{statuses[run.status] || run.status}{active && run.phase ? ` · ${labels[run.phase] || run.phase}` : ''}</p>
      {active && <p>{run.pages} page(s) traitée(s). Le traitement continue si vous quittez cette page.</p>}
      {run.finished_at && <p className="text-[13px]">Dernier traitement : {new Date(run.finished_at).toLocaleString('fr-FR')}</p>}
      {run.error && <p role="alert">{run.error}</p>}
      <ul>{Object.entries(run.counts).map(([kind, count]) => <li key={kind}>{labels[kind] || kind} : {count.imported} importé(s){count.skipped ? `, ${count.skipped} ignoré(s)` : ''}</li>)}</ul>
    </div>}
    {state && <details className="space-y-3">
      <summary className="cursor-pointer min-h-11 py-2">Champs reconnus et points à vérifier</summary>
      <div className="space-y-2">
        <label className="block space-y-2"><span>Table personnalisée des produits installés (facultatif)</span><input value={offerEntity} onChange={event => setOfferEntity(event.target.value)} placeholder="Ex. : new_subscription" className="w-full rounded-full bg-[#F6F5F2] dark:bg-[#242124] px-4 py-3 border-0 outline-none focus-visible:ring-2 focus-visible:ring-[#4F6CE8]" /></label>
        <p className="text-[13px] text-[#6E6C67] dark:text-[#A1A1AA]">Si la table n’est pas reconnue, indiquez son nom logique puis relancez la détection. La relation avec un compte entreprise sera vérifiée.</p>
      </div>
      {Object.entries(state.mapping.scopes || {}).map(([kind, mapping]) => <div key={kind} className="overflow-x-auto">
        <p className="font-semibold">{labels[kind] || kind} · {mapping.entity}</p>
        <table className="w-full text-left text-[13px]"><thead><tr className="border-b border-black/10 dark:border-white/10"><th className="py-2">Champ Onbora</th><th>Champ Dynamics</th></tr></thead>
          <tbody>{Object.entries(mapping.fields).map(([target, source]) => <tr key={target} className="border-b border-black/5 dark:border-white/5"><td className="py-2">{target}</td><td>{source}</td></tr>)}</tbody></table>
      </div>)}
      <ul className="space-y-2 text-[13px]">{[...new Set([...(state.mapping.warnings || []), ...(run?.warnings || [])])].map(warning => <li key={warning}>{warning}</li>)}</ul>
    </details>}
    {state && state.recent.length > 1 && <details><summary className="cursor-pointer min-h-11 py-2">Imports récents</summary><ul className="text-[13px] space-y-2">{state.recent.map(item => <li key={item.id}>#{item.id} · {statuses[item.status] || item.status}</li>)}</ul></details>}
  </div>;
}
