"use client";

import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { SkeletonBox } from '@/components/shared/SkeletonLoader';
import AdminDynamicsImport from './AdminDynamicsImport';

type Connection = { configured: boolean; tenant_id?: string; client_id?: string; resource_url?: string; verified_at?: string | null; auto_import_enabled?: boolean; import_interval_minutes?: number };
const endpoint = '/api/accounts/integrations/dynamics/';
const inputClass = 'w-full rounded-full bg-[#F6F5F2] dark:bg-[#242124] px-4 py-3 border-0 outline-none focus-visible:ring-2 focus-visible:ring-[#4F6CE8] text-[14px] leading-[1.618]';

export default function AdminDynamicsConnection() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [form, setForm] = useState({ tenant_id: '', client_id: '', resource_url: '', client_secret: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [automatic, setAutomatic] = useState(true);
  const [interval, setIntervalMinutes] = useState(15);

  async function load() {
    try {
      const data: Connection = await fetchAPI(endpoint);
      setConnection(data);
      setAutomatic(data.auto_import_enabled ?? true); setIntervalMinutes(data.import_interval_minutes ?? 15);
      setForm({ tenant_id: data.tenant_id || '', client_id: data.client_id || '', resource_url: data.resource_url || '', client_secret: '' });
    } catch {
      setError('Paramètres indisponibles. Réessayez de les charger.');
    } finally { setLoading(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    fetchAPI(endpoint, { signal: controller.signal }).then((data: Connection) => {
      if (controller.signal.aborted) return;
      setConnection(data);
      setAutomatic(data.auto_import_enabled ?? true); setIntervalMinutes(data.import_interval_minutes ?? 15);
      setForm({ tenant_id: data.tenant_id || '', client_id: data.client_id || '', resource_url: data.resource_url || '', client_secret: '' });
    }).catch(() => {
      if (!controller.signal.aborted) setError('Paramètres indisponibles. Réessayez de les charger.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const data: Connection = await fetchAPI(endpoint, { method: 'PUT', body: JSON.stringify({ ...form, auto_import_enabled: automatic, import_interval_minutes: interval }) });
      setConnection(data); setForm(previous => ({ ...previous, client_secret: '' })); setDirty(false);
      setMessage('Identifiants enregistrés. Testez la connexion.');
    } catch {
      setError('Enregistrement impossible. Vérifiez l’URL Dynamics et les identifiants Microsoft Entra, puis réessayez.');
    } finally { setBusy(false); }
  }

  async function test() {
    setBusy(true); setError(''); setMessage('');
    try {
      const data: Connection = await fetchAPI(`${endpoint}test/`, { method: 'POST' });
      setConnection(data); setMessage('Connexion à Dynamics 365 confirmée.');
    } catch {
      setConnection(previous => previous ? { ...previous, verified_at: null } : previous);
      setError('Connexion refusée ou indisponible. Vérifiez le secret et le rôle de l’utilisateur d’application dans Power Platform.');
    } finally { setBusy(false); }
  }

  return (
    <section aria-labelledby="dynamics-title" className="rounded-3xl bg-white dark:bg-[#2F2C30] p-6 shadow-sm text-[#242124] dark:text-white space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="dynamics-title" className="text-[21px] font-semibold">Microsoft Dynamics 365</h3>
        <span className="rounded-full bg-black/5 dark:bg-white/5 px-3 py-2 text-[13px] leading-[1.618]">
          {connection?.verified_at ? 'Connexion vérifiée' : connection?.configured ? 'À tester' : 'Non configuré'}
        </span>
      </div>
      <p className="text-[14px] leading-[1.618] text-[#6E6C67] dark:text-[#A1A1AA]">
        Connectez le CRM de cet espace Onbora avec un secret d’application Microsoft Entra.
      </p>
      {loading ? <div className="grid gap-4 sm:grid-cols-2" aria-label="Chargement des paramètres">{[0, 1, 2, 3].map(key => <SkeletonBox key={key} height={48} />)}</div> : connection === null ?
        <button type="button" onClick={() => { setLoading(true); setError(''); void load(); }} className="min-h-11 rounded-lg px-4 bg-[#F6F5F2] dark:bg-[#242124] text-[14px]">Réessayer</button> : (
        <form onSubmit={save} className="space-y-6" aria-busy={busy}>
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              ['resource_url', 'URL de l’environnement *', 'https://votre-entreprise.crm4.dynamics.com', 'url'],
              ['tenant_id', 'ID du locataire (Tenant ID) *', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'text'],
              ['client_id', 'ID de l’application (Client ID) *', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'text'],
              ['client_secret', 'Secret client *', connection.configured ? 'Laisser vide pour conserver le secret' : 'Valeur du secret, pas son identifiant', 'password'],
            ] as const).map(([key, label, placeholder, type]) => (
              <label key={key} className="space-y-2 text-[13px] leading-[1.618]">
                <span>{label}</span>
                <input type={type} value={form[key]} required={key !== 'client_secret' || !connection.configured}
                  autoComplete="off" placeholder={placeholder} disabled={busy} className={inputClass}
                  pattern={key === 'tenant_id' || key === 'client_id' ? '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}' : undefined}
                  onChange={event => { setForm({ ...form, [key]: event.target.value }); setDirty(true); setMessage(''); }} />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[14px] leading-[1.618]">
            <label className="flex items-center gap-3 min-h-11"><input type="checkbox" checked={automatic} disabled={busy} onChange={event => { setAutomatic(event.target.checked); setDirty(true); }} />Importer automatiquement</label>
            <label className="flex items-center gap-3">Fréquence<select aria-label="Fréquence des imports" value={interval} disabled={busy} onChange={event => { setIntervalMinutes(Number(event.target.value)); setDirty(true); }} className="rounded-lg bg-[#F6F5F2] dark:bg-[#242124] px-4 py-3 border-0 outline-none focus-visible:ring-2 focus-visible:ring-[#4F6CE8]">
              <option value={5}>Toutes les 5 minutes</option><option value={15}>Toutes les 15 minutes</option><option value={60}>Toutes les heures</option><option value={1440}>Tous les jours</option>
            </select></label>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-[#4F6CE8] px-5 text-white text-[14px] font-semibold disabled:opacity-50">{busy ? 'Traitement en cours…' : 'Enregistrer'}</button>
            <button type="button" onClick={test} disabled={busy || !connection.configured || dirty} className="min-h-11 rounded-lg bg-[#F6F5F2] dark:bg-[#242124] px-5 text-[14px] font-semibold disabled:opacity-50">Tester la connexion</button>
          </div>
        </form>
      )}
      {connection?.configured && <AdminDynamicsImport ready={!!connection.verified_at && !dirty} automatic={!!connection.auto_import_enabled} />}
      <div className="space-y-2 text-[13px] leading-[1.618] text-[#6E6C67] dark:text-[#A1A1AA]">
        <a href="https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Créer le secret dans Microsoft Entra</a>
        <p>Inscriptions d’applications → votre application → Certificats et secrets → Nouveau secret client. Copiez sa valeur dès sa création.</p>
        <p>Dans <a href="https://admin.powerplatform.microsoft.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Power Platform</a>, ajoutez l’application à votre environnement comme utilisateur d’application et attribuez-lui un rôle autorisant les échanges CRM.</p>
        <a href="https://learn.microsoft.com/en-us/power-apps/developer/data-platform/use-single-tenant-server-server-authentication" target="_blank" rel="noopener noreferrer" className="inline-block underline underline-offset-4">Guide Microsoft</a>
      </div>
      {error && <p role="alert" className="text-[14px] leading-[1.618]">{error}</p>}
      {message && <p role="status" className="text-[14px] leading-[1.618]">{message}</p>}
    </section>
  );
}
