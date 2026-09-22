"use client";

import React, { useEffect, useRef, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';
import { AppointmentData } from './KamVocalVisitModal';

interface PreparationFact {
  label: string;
  value: string;
  source: string;
}

interface PreparationData {
  enterprise_name: string;
  visit_purpose_label: string;
  purpose_reason: string;
  objective: string;
  account_facts: PreparationFact[];
  visit_facts: PreparationFact[];
  questions_to_confirm: string[];
  has_previous_report: boolean;
}

interface Props {
  appointment: AppointmentData;
  onClose: () => void;
}

export default function KamAppointmentPreparationModal({ appointment, onClose }: Props) {
  const [data, setData] = useState<PreparationData | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    let active = true;
    fetchAPI(`/api/kam/appointments/${appointment.id}/preparation/`)
      .then((response) => { if (active) { setData(response); setError(false); } })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [appointment.id, retry]);

  const renderFacts = (facts: PreparationFact[]) => facts.map((fact) => (
    <div key={`${fact.label}-${fact.source}`} className="py-3 border-b border-black/5 dark:border-white/5 last:border-0">
      <dt className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">{fact.label}</dt>
      <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-white whitespace-pre-wrap break-words">{fact.value}</dd>
      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Source : {fact.source}</span>
    </div>
  ));

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="kam-preparation-title" className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-[28px] bg-[#F6F5F2] dark:bg-[#242124] text-[#242124] dark:text-white shadow-2xl flex flex-col">
        <header className="px-5 py-5 sm:px-7 border-b border-black/5 dark:border-white/5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Préparation du rendez-vous</p>
            <h2 id="kam-preparation-title" className="mt-1 text-lg font-bold tracking-tight">{appointment.enterprise_name}</h2>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{appointment.visit_purpose_label || 'Type non renseigné'} · {appointment.title}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fermer la préparation" className="p-2 rounded-xl text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#4F6CE8]">
            <Icons.X size={18} />
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {error ? (
            <div role="alert" className="py-8 text-center">
              <p className="text-sm">Impossible de charger la préparation.</p>
              <button type="button" onClick={() => { setError(false); setData(null); setRetry((value) => value + 1); }} className="mt-4 px-4 py-2 rounded-xl bg-[#4F6CE8] text-white text-sm font-semibold">Réessayer</button>
            </div>
          ) : !data ? (
            <p role="status" className="py-8 text-sm text-zinc-500">Chargement de la préparation…</p>
          ) : (
            <div className="space-y-7">
              <div className="rounded-2xl bg-[#ECEAE5] dark:bg-[#2F2C30] px-4 py-3">
                <p className="text-xs font-semibold">{data.visit_purpose_label}</p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{data.purpose_reason || 'Type choisi pour ce rendez-vous.'}</p>
                {data.objective && <p className="mt-2 text-sm">Objectif : {data.objective}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                <section aria-labelledby="kam-account-facts">
                  <h3 id="kam-account-facts" className="text-sm font-bold">Compte et participants</h3>
                  <dl className="mt-2">{renderFacts(data.account_facts)}</dl>
                </section>
                <section aria-labelledby="kam-visit-facts">
                  <h3 id="kam-visit-facts" className="text-sm font-bold">À retenir pour cet échange</h3>
                  {data.visit_facts.length ? <dl className="mt-2">{renderFacts(data.visit_facts)}</dl> : (
                    <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Aucune information supplémentaire confirmée. Utilisez les questions ci-dessous pour compléter le dossier.</p>
                  )}
                </section>
              </div>

              <section aria-labelledby="kam-questions" className="border-t border-black/5 dark:border-white/5 pt-5">
                <h3 id="kam-questions" className="text-sm font-bold">Questions à confirmer avec le client</h3>
                <ol className="mt-3 space-y-2 list-decimal pl-5 text-sm text-zinc-700 dark:text-zinc-200">
                  {data.questions_to_confirm.map((question) => <li key={question}>{question}</li>)}
                </ol>
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
