"use client";

import React, { useEffect, useRef, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';
import { StrategicVisit } from './kamTypes';
import { AppointmentData } from './KamVocalVisitModal';
import { KamVisitPurpose, PurposeSuggestion, VISIT_PURPOSE_LABELS } from './kamVisitPurpose';

interface Props {
  assignedAccounts: StrategicVisit[];
  onClose: () => void;
  onStarted: (appointment: AppointmentData) => void;
}

export default function KamExpressMeetingModal({ assignedAccounts, onClose, onStarted }: Props) {
  const [accountId, setAccountId] = useState('');
  const [suggestion, setSuggestion] = useState<PurposeSuggestion | null>(null);
  const [purpose, setPurpose] = useState<KamVisitPurpose | null>(null);
  const [purposeIsManual, setPurposeIsManual] = useState(false);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose, saving]);

  const handleAccountChange = async (nextAccountId: string) => {
    const nextRequestId = ++requestId.current;
    setAccountId(nextAccountId);
    setSuggestion(null);
    setPurpose(null);
    setPurposeIsManual(false);
    setError('');
    const account = assignedAccounts.find((item) => item.id === nextAccountId || item.account_id === nextAccountId);
    const enterpriseId = account?.account_id || account?.id.replace('account-', '');
    if (!enterpriseId) return;

    setLoadingSuggestion(true);
    try {
      const result: PurposeSuggestion = await fetchAPI(`/api/kam/appointments/purpose-suggestion/?enterprise_id=${encodeURIComponent(enterpriseId)}`);
      if (requestId.current !== nextRequestId) return;
      setSuggestion(result);
      setPurpose(result.needs_confirmation ? null : result.suggested_purpose);
    } catch {
      if (requestId.current === nextRequestId) setError('Suggestion indisponible. Choisissez le type de rendez-vous.');
    } finally {
      if (requestId.current === nextRequestId) setLoadingSuggestion(false);
    }
  };

  const startMeeting = async () => {
    if (!accountId || !purpose) {
      setError('Sélectionnez un compte et un type de rendez-vous.');
      return;
    }
    const account = assignedAccounts.find((item) => item.id === accountId || item.account_id === accountId);
    const enterpriseId = account?.account_id || account?.id.replace('account-', '');
    if (!enterpriseId) return;

    setSaving(true);
    setError('');
    try {
      const appointment: AppointmentData = await fetchAPI('/api/kam/appointments/', {
        method: 'POST',
        body: JSON.stringify({
          enterprise_id: enterpriseId,
          title: `Réunion express — ${account?.account_name || 'Entreprise'}`,
          meeting_type: 'PHYSICAL',
          start_immediately: true,
          ...(purposeIsManual ? { visit_purpose: purpose } : {}),
        }),
      });
      onStarted(appointment);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de démarrer la réunion.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="kam-express-title" className="w-full max-w-md overflow-hidden rounded-xl bg-[#ECEAE5] dark:bg-[#242124] text-zinc-900 dark:text-white shadow-2xl border border-black/10 dark:border-white/10">
        <header className="p-5 bg-[#F6F5F2] dark:bg-[#2D2A2D] flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4F6CE8]/15 text-[#4F6CE8] flex items-center justify-center"><Icons.FileText size={20} /></div>
            <div>
              <h2 id="kam-express-title" className="text-base font-extrabold">Démarrer une réunion</h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Retrouvez vos notes et préparez le suivi.</p>
            </div>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} disabled={saving} aria-label="Fermer la réunion express" className="p-2 rounded-xl text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#4F6CE8] disabled:opacity-50"><Icons.X size={18} /></button>
        </header>

        <div className="p-5 space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="kam-express-account" className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Compte *</label>
            <select id="kam-express-account" value={accountId} onChange={(event) => { void handleAccountChange(event.target.value); }} className="w-full p-3 rounded-2xl bg-[#F6F5F2] dark:bg-[#2D2A2D] text-xs outline-none focus:ring-2 focus:ring-[#4F6CE8]">
              <option value="">Sélectionner un compte…</option>
              {assignedAccounts.map((account) => <option key={account.id} value={account.id}>{account.account_name}</option>)}
            </select>
          </div>

          {accountId && (
            <div className="space-y-2">
              <label htmlFor="kam-express-purpose" className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Type de rendez-vous *</label>
              {loadingSuggestion ? <p className="text-xs text-zinc-500">Analyse du compte…</p> : (
                <>
                  {suggestion && <p className="rounded-xl bg-[#F6F5F2] dark:bg-[#2D2A2D] px-3 py-2.5 text-[11px] text-zinc-600 dark:text-zinc-300"><strong className="text-zinc-900 dark:text-white">Suggestion : {suggestion.suggested_purpose_label}</strong><br />{suggestion.reason}</p>}
                  <select id="kam-express-purpose" value={purpose || ''} onChange={(event) => { setPurpose(event.target.value as KamVisitPurpose); setPurposeIsManual(true); setError(''); }} className="w-full p-3 rounded-2xl bg-[#F6F5F2] dark:bg-[#2D2A2D] text-xs outline-none focus:ring-2 focus:ring-[#4F6CE8]">
                    <option value="" disabled>Choisir le type…</option>
                    {(Object.keys(VISIT_PURPOSE_LABELS) as KamVisitPurpose[]).map((value) => <option key={value} value={value}>{VISIT_PURPOSE_LABELS[value]}</option>)}
                  </select>
                </>
              )}
            </div>
          )}



          {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        </div>

        <footer className="px-5 py-4 border-t border-black/5 dark:border-white/5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2.5 text-xs font-semibold text-zinc-500 disabled:opacity-50">Annuler</button>
          <button type="button" onClick={startMeeting} disabled={saving || loadingSuggestion || !accountId || !purpose} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#4F6CE8] hover:bg-[#3D57C5] text-white text-xs font-bold disabled:opacity-50"><Icons.FileText size={15} />{saving ? 'Démarrage…' : 'Démarrer maintenant'}</button>
        </footer>
      </section>
    </div>
  );
}
