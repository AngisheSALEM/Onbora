"use client";

import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { SkeletonBox } from '@/components/shared/SkeletonLoader';

type CrmItem = {
  kind: string; remote_id: string; last_imported_at: string;
  data: { name?: string; status_label?: string; start_date?: string; close_date?: string; description?: string; amount?: number; currency_code?: string };
};
type Page = { results: CrmItem[]; next_offset: number | null };

export default function KamCrmHistory({ accountId }: { accountId: string }) {
  const [page, setPage] = useState<Page | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const cleanId = accountId.replace('account-', '');
  const url = `/api/accounts/integrations/dynamics/records/?enterprise_id=${encodeURIComponent(cleanId)}&kind=activity`;
  useEffect(() => {
    const controller = new AbortController();
    fetchAPI(url, { signal: controller.signal }).then((data: Page) => {
      if (!controller.signal.aborted) setPage(data);
    }).catch(() => {
      if (!controller.signal.aborted) setError('Historique CRM indisponible. Rechargez la fiche pour réessayer.');
    });
    return () => controller.abort();
  }, [url]);

  async function more() {
    if (page?.next_offset == null) return;
    setBusy(true); setError('');
    try {
      const data: Page = await fetchAPI(url + `&offset=${page.next_offset}`);
      setPage({ ...data, results: [...page.results, ...data.results] });
    } catch { setError('La suite de l’historique est indisponible. Réessayez.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3 text-[14px] leading-[1.618]" aria-label="Historique Dynamics 365">
    <h3 className="text-[16px] font-semibold">Historique CRM</h3>
    {!page && !error && <SkeletonBox height={64} />}
    {error && <p role="alert">{error}</p>}
    {page?.results.length === 0 && <p className="text-zinc-500">Aucune opportunité ni aucun rendez-vous importé depuis Dynamics 365.</p>}
    <ul className="space-y-4">{page?.results.map(item => {
      const date = item.data.start_date || item.data.close_date;
      return <li key={item.remote_id} className="space-y-1">
        <p className="text-[13px] text-zinc-500">{item.kind === 'appointments' ? 'Rendez-vous' : 'Opportunité'}{item.data.status_label ? ` · ${item.data.status_label}` : ''}</p>
        <p className="font-semibold">{item.data.name}</p>
        {date && <p>{new Date(date).toLocaleString('fr-FR')}</p>}
        {item.data.amount != null && <p>{item.data.amount} {item.data.currency_code || '(devise non renseignée)'}</p>}
        {item.data.description && <p className="whitespace-pre-wrap">{item.data.description}</p>}
        <p className="text-[13px] text-zinc-500">Source : Dynamics 365 · importé le {new Date(item.last_imported_at).toLocaleString('fr-FR')}</p>
      </li>;
    })}</ul>
    {page?.next_offset != null && <button type="button" onClick={more} disabled={busy} className="min-h-11 rounded-full px-4 bg-[#F6F5F2] dark:bg-[#242124] disabled:opacity-50">{busy ? 'Chargement…' : 'Charger la suite'}</button>}
  </section>;
}
