"use client";

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';

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

interface AppointmentDetails {
  id: number;
  title: string;
  enterprise_id: number;
  enterprise_name: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_type: string;
  meeting_type_label: string;
  visit_purpose?: string;
  visit_purpose_label?: string;
  status: string;
  status_label: string;
  location?: string;
  meet_url?: string;
}

function KamAppointmentPreparationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get('appointmentId') || searchParams.get('id');

  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [data, setData] = useState<PreparationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!appointmentId) {
      setError("Identifiant de rendez-vous non renseigné.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [prepRes, apptRes] = await Promise.allSettled([
        fetchAPI(`/api/kam/appointments/${appointmentId}/preparation/`),
        fetchAPI(`/api/kam/appointments/${appointmentId}/`),
      ]);

      if (prepRes.status === 'fulfilled' && prepRes.value) {
        setData(prepRes.value);
      } else {
        throw new Error("Impossible de charger les données de préparation.");
      }

      if (apptRes.status === 'fulfilled' && apptRes.value) {
        setAppointment(apptRes.value);
      }
    } catch (err: any) {
      console.error("Erreur chargement préparation:", err);
      setError(err?.message || "Impossible de charger la fiche de préparation.");
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBack = () => {
    router.back();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Icons.Sparkles size={32} className="animate-spin text-[#4F6CE8]" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Chargement de la préparation du rendez-vous...
          </span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="p-8 max-w-md bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 text-center space-y-4">
          <Icons.AlertTriangle size={32} className="text-rose-500 mx-auto" />
          <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">Préparation indisponible</h3>
          <p className="text-xs text-zinc-500">{error || "Données introuvables."}</p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-[#E4E1DB] dark:bg-[#363336] text-zinc-800 dark:text-zinc-200 hover:bg-white dark:hover:bg-[#403C40] rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Retour
            </button>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-[#4F6CE8] hover:bg-[#3D57C5] text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const enterpriseName = appointment?.enterprise_name || data.enterprise_name;

  // Split visit facts for clean executive presentation
  const narrativeFactLabels = ['Synthèse précédente', 'Besoins confirmés', 'Prochaine action convenue', 'Objections précédentes'];
  const metaFacts = (data.visit_facts || []).filter(f => !narrativeFactLabels.includes(f.label));
  const summaryFact = (data.visit_facts || []).find(f => f.label === 'Synthèse précédente');
  const needsFact = (data.visit_facts || []).find(f => f.label === 'Besoins confirmés');
  const actionFact = (data.visit_facts || []).find(f => f.label === 'Prochaine action convenue');
  const objectionsFact = (data.visit_facts || []).find(f => f.label === 'Objections précédentes');

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-6 md:px-10 py-6 select-none bg-[#ECEAE5] dark:bg-[#242124] text-zinc-900 dark:text-white font-sans">
      
      {/* 1. TOP HEADER BAR: Seulement nom de l'entreprise, date, bouton vocal live et fiche precall 360 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        
        {/* Left: Bouton retour + Nom d'entreprise & Date */}
        <div className="flex items-center gap-3.5">
          <button
            onClick={handleBack}
            title="Retour à la page précédente"
            className="p-2.5 rounded-2xl bg-white dark:bg-[#282528] hover:bg-zinc-100 dark:hover:bg-[#363336] text-zinc-600 dark:text-zinc-300 transition-all cursor-pointer shadow-xs shrink-0"
          >
            <Icons.ArrowLeft size={16} />
          </button>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              {enterpriseName}
            </h1>

            {appointment?.scheduled_at && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400">
                <Icons.Calendar size={12} />
                <span>{formatDate(appointment.scheduled_at)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions (Fiche precall 360, Lancer le vocal live) */}
        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
          {appointment?.enterprise_id && (
            <button
              onClick={() => router.push(`/kam/briefing?id=account-${appointment.enterprise_id}&from=prepare-visit&appointmentId=${appointmentId}`)}
              title="Consulter la fiche 360 Pré-call du compte"
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#282528] hover:bg-zinc-100 dark:hover:bg-[#363336] text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Icons.ExternalLink size={14} />
              <span>Fiche Pré-call 360</span>
            </button>
          )}

          <button
            onClick={() => router.push(`/kam/vocal-visit?appointmentId=${appointmentId}`)}
            className="px-4 py-2 bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-2"
          >
            <Icons.Mic size={14} />
            <span>Lancer le vocal live</span>
          </button>
        </div>
      </div>

      {/* 2. DOCUMENT DE PRÉPARATION (Simple, sobre et lisible comme la fiche 360) */}
      <div className="max-w-4xl mx-auto w-full py-4 pb-16">
        <div className="bg-white dark:bg-[#282528] rounded-2xl p-7 md:p-9 shadow-xs border border-black/5 dark:border-white/5 text-zinc-800 dark:text-zinc-200 space-y-8 animate-in fade-in duration-150">
          
          {/* SECTION 1: Cadrage & Objectif */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4F6CE8]" />
                <span>Cadrage du rendez-vous</span>
              </h2>
              {data.visit_purpose_label && (
                <span className="px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                  {data.visit_purpose_label}
                </span>
              )}
            </div>

            <p className="text-sm md:text-[15px] text-zinc-800 dark:text-zinc-200 leading-relaxed font-normal">
              <span className="font-medium text-zinc-900 dark:text-white">Objectif : </span>
              {data.objective || "Découvrir et aligner les priorités de connectivité et de services de l'entreprise."}
            </p>

            {data.purpose_reason && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
                {data.purpose_reason}
              </p>
            )}
          </div>

          {/* SECTION 2: Compte et participants */}
          <div className="space-y-3.5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F6CE8]" />
              <span>Compte et participants</span>
            </h2>

            {data.account_facts && data.account_facts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 pt-1">
                {data.account_facts.map((fact, idx) => (
                  <div
                    key={`${fact.label}-${idx}`}
                    className="flex items-baseline justify-between gap-3 py-0.5"
                  >
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0">
                      {fact.label}
                    </span>
                    <span className="text-sm font-normal text-zinc-800 dark:text-zinc-200 text-right">
                      {fact.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 font-normal">
                Aucun fait spécifique consigné. Consultez la fiche Pré-call 360 pour les informations d&apos;entreprise.
              </p>
            )}
          </div>

          {/* SECTION 3: À retenir pour cet échange */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F6CE8]" />
              <span>À retenir pour cet échange</span>
            </h2>

            {data.visit_facts && data.visit_facts.length > 0 ? (
              <div className="space-y-4 pt-1">
                {/* Métadonnées clés (Dernier échange, opérateur, budget, etc.) */}
                {metaFacts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 pb-1">
                    {metaFacts.map((fact, idx) => (
                      <div
                        key={`${fact.label}-${idx}`}
                        className="flex items-baseline justify-between gap-3 py-0.5"
                      >
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0">
                          {fact.label}
                        </span>
                        <span className="text-sm font-normal text-zinc-800 dark:text-zinc-200 text-right">
                          {fact.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Synthèse précédente */}
                {summaryFact && (
                  <div className="space-y-1">
                    <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 dark:bg-zinc-200" />
                      <span>Synthèse du dernier échange</span>
                    </div>
                    <p className="pl-5 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 font-normal whitespace-pre-line">
                      {summaryFact.value}
                    </p>
                  </div>
                )}

                {/* Besoins confirmés */}
                {needsFact && (
                  <div className="space-y-1">
                    <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 dark:bg-zinc-200" />
                      <span>Besoins</span>
                    </div>
                    <ul className="pl-5 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
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

                {/* Prochaine action convenue */}
                {actionFact && (
                  <div className="space-y-1">
                    <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 dark:bg-zinc-200" />
                      <span>Prochaine action</span>
                    </div>
                    <p className="pl-5 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
                      {actionFact.value}
                    </p>
                  </div>
                )}

                {/* Points de vigilance / Objections */}
                {objectionsFact && (
                  <div className="space-y-1">
                    <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 dark:bg-zinc-200" />
                      <span>Points de vigilance et objections</span>
                    </div>
                    <ul className="pl-5 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
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
              <p className="text-xs text-zinc-500 leading-relaxed font-normal">
                Aucune information supplémentaire confirmée. Utilisez la grille de questionnement ci-dessous pour qualifier les besoins et le budget.
              </p>
            )}
          </div>

          {/* SECTION 4: Questions stratégiques à confirmer avec le client */}
          <div className="space-y-3.5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F6CE8]" />
              <span>Questions stratégiques à confirmer</span>
            </h2>

            {data.questions_to_confirm && data.questions_to_confirm.length > 0 ? (
              <ol className="space-y-2.5 pt-1">
                {data.questions_to_confirm.map((question, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5">
                      {index + 1}.
                    </span>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
                      {question}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-zinc-500 font-normal">
                Aucune question spécifique générée pour ce profil d&apos;entretien.
              </p>
            )}
          </div>

          {/* PIED DE CARTE: ACTION RAPIDE VERS LE BRIEF VOCAL */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Prêt pour l&apos;entretien ? Lancez le brief vocal live pour consigner ou dicter vos échanges en temps réel.
            </span>

            <button
              onClick={() => router.push(`/kam/vocal-visit?appointmentId=${appointmentId}`)}
              className="px-5 py-2.5 bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 shrink-0"
            >
              <Icons.Mic size={15} />
              <span>Ouvrir le Brief Vocal Live</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}

export default function KamAppointmentPreparationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <Icons.Sparkles size={28} className="animate-spin text-[#4F6CE8]" />
            <span className="text-xs font-semibold text-zinc-500">Chargement de la préparation...</span>
          </div>
        </div>
      }
    >
      <KamAppointmentPreparationContent />
    </Suspense>
  );
}
