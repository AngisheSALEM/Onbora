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

  const narrativeFactLabels = ['Synthèse précédente', 'Besoins confirmés', 'Prochaine action convenue', 'Objections précédentes'];
  const metaFacts = (data?.visit_facts || []).filter(f => !narrativeFactLabels.includes(f.label));
  const summaryFact = (data?.visit_facts || []).find(f => f.label === 'Synthèse précédente');
  const needsFact = (data?.visit_facts || []).find(f => f.label === 'Besoins confirmés');
  const actionFact = (data?.visit_facts || []).find(f => f.label === 'Prochaine action convenue');
  const objectionsFact = (data?.visit_facts || []).find(f => f.label === 'Objections précédentes');

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
            <div className="space-y-6">
              {/* Cadrage */}
              <div className="rounded-2xl bg-white dark:bg-[#2F2C30] p-4 border border-black/5 dark:border-white/5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4F6CE8]" />
                    <span>Cadrage du rendez-vous</span>
                  </h3>
                  {data.visit_purpose_label && (
                    <span className="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                      {data.visit_purpose_label}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-normal">
                  <span className="font-medium text-zinc-900 dark:text-white">Objectif : </span>
                  {data.objective || "Découvrir et aligner les priorités de connectivité et de services de l'entreprise."}
                </p>
                {data.purpose_reason && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
                    {data.purpose_reason}
                  </p>
                )}
              </div>

              {/* Compte et participants */}
              <section aria-labelledby="kam-account-facts" className="space-y-3">
                <h3 id="kam-account-facts" className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F6CE8]" />
                  <span>Compte et participants</span>
                </h3>
                {data.account_facts && data.account_facts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    {data.account_facts.map((fact, idx) => (
                      <div key={idx} className="flex items-baseline justify-between gap-3 py-0.5">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0">{fact.label}</span>
                        <span className="text-sm font-normal text-zinc-800 dark:text-zinc-200 text-right">{fact.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">Aucun fait consigné.</p>
                )}
              </section>

              {/* À retenir pour cet échange */}
              <section aria-labelledby="kam-visit-facts" className="space-y-3">
                <h3 id="kam-visit-facts" className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F6CE8]" />
                  <span>À retenir pour cet échange</span>
                </h3>

                {data.visit_facts && data.visit_facts.length > 0 ? (
                  <div className="space-y-3.5 pt-0.5">
                    {metaFacts.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pb-1">
                        {metaFacts.map((fact, idx) => (
                          <div key={idx} className="flex items-baseline justify-between gap-3 py-0.5">
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0">{fact.label}</span>
                            <span className="text-sm font-normal text-zinc-800 dark:text-zinc-200 text-right">{fact.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {summaryFact && (
                      <div className="space-y-1">
                        <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 dark:bg-zinc-200" />
                          <span>Synthèse du dernier échange</span>
                        </div>
                        <p className="pl-4 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 font-normal whitespace-pre-line">
                          {summaryFact.value}
                        </p>
                      </div>
                    )}

                    {needsFact && (
                      <div className="space-y-1">
                        <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 dark:bg-zinc-200" />
                          <span>Besoins</span>
                        </div>
                        <ul className="pl-4 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                          {needsFact.value.split(/,\s*/).map((need, idx) => (
                            <li key={idx} className="list-disc leading-relaxed font-normal">
                              <span>{need.trim()}</span>
                              {needsFact.source && (
                                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-normal ml-1.5">
                                  ({needsFact.source})
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {actionFact && (
                      <div className="space-y-1">
                        <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 dark:bg-zinc-200" />
                          <span>Prochaine action</span>
                        </div>
                        <p className="pl-4 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
                          {actionFact.value}
                        </p>
                      </div>
                    )}

                    {objectionsFact && (
                      <div className="space-y-1">
                        <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 dark:bg-zinc-200" />
                          <span>Points de vigilance et objections</span>
                        </div>
                        <ul className="pl-4 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                          {objectionsFact.value.split(/,\s*/).map((obj, idx) => (
                            <li key={idx} className="list-disc leading-relaxed font-normal">
                              <span>{obj.trim()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 font-normal">
                    Aucune information supplémentaire confirmée.
                  </p>
                )}
              </section>

              {/* Questions à confirmer */}
              <section aria-labelledby="kam-questions" className="space-y-3">
                <h3 id="kam-questions" className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F6CE8]" />
                  <span>Questions à confirmer avec le client</span>
                </h3>
                <ol className="space-y-2 pt-0.5 text-sm text-zinc-800 dark:text-zinc-200">
                  {data.questions_to_confirm.map((question, index) => (
                    <li key={index} className="flex items-start gap-2.5">
                      <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5">{index + 1}.</span>
                      <span className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">{question}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
