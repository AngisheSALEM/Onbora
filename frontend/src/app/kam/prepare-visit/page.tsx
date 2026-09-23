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

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-6 md:px-10 py-6 select-none bg-[#ECEAE5] dark:bg-[#242124] text-zinc-900 dark:text-white font-sans">
      
      {/* 1. TOP HEADER BAR: Seulement nom de l'entreprise, date, bouton vocal live et fiche precall 360 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-black/5 dark:border-white/5">
        
        {/* Left: Bouton retour + Nom d'entreprise & Date */}
        <div className="flex items-center gap-3.5">
          <button
            onClick={handleBack}
            title="Retour à la page précédente"
            className="p-2.5 rounded-2xl bg-white dark:bg-[#282528] hover:bg-zinc-100 dark:hover:bg-[#363336] text-zinc-600 dark:text-zinc-300 border border-black/5 dark:border-white/5 transition-all cursor-pointer shadow-xs shrink-0"
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
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#282528] hover:bg-zinc-100 dark:hover:bg-[#363336] text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/5 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
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

      {/* 2. LE DOCUMENT COMPLET UNIQUE (Toutes les informations réunies dans une seule carte document fluide) */}
      <div className="max-w-4xl mx-auto w-full py-8 pb-16">
        <div className="bg-white dark:bg-[#282528] rounded-2xl p-7 md:p-10 shadow-xs border border-black/5 dark:border-white/5 text-zinc-800 dark:text-zinc-200 space-y-8">
          
          {/* SECTION 1: CADRAGE & MOTIF DU RENDEZ-VOUS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4F6CE8]">
                <Icons.Compass size={16} />
                <span>Cadrage & Motif de la visite</span>
              </div>
              <span className="text-xs font-semibold text-zinc-500">
                {data.visit_purpose_label}
              </span>
            </div>

            <div className="space-y-2.5">
              <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white leading-snug">
                {data.objective || "Découvrir et aligner les priorités de connectivité et de services de l'entreprise."}
              </h2>
              
              <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {data.purpose_reason || "Type choisi pour ce rendez-vous selon la dynamique commerciale du compte."}
              </p>
            </div>
          </div>

          {/* SECTION 2: COMPTE ET PARTICIPANTS */}
          <div className="space-y-4 pt-6 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4F6CE8] border-b border-black/5 dark:border-white/5 pb-3">
              <Icons.Users size={16} />
              <span>Compte et participants</span>
            </div>

            <div className="divide-y divide-black/5 dark:divide-white/5">
              {data.account_facts && data.account_facts.length > 0 ? (
                data.account_facts.map((fact, idx) => (
                  <div key={`${fact.label}-${idx}`} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-500 uppercase tracking-wider text-[11px]">
                        {fact.label}
                      </span>
                      <span className="text-zinc-400 text-[10px]">
                        Source : {fact.source}
                      </span>
                    </div>
                    <p className="mt-1 text-xs md:text-sm font-semibold text-zinc-900 dark:text-white leading-relaxed">
                      {fact.value}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 py-3">
                  Aucun fait spécifique consigné. Consultez la fiche Pré-call 360 pour les informations d&apos;entreprise.
                </p>
              )}
            </div>
          </div>

          {/* SECTION 3: À RETENIR POUR CET ÉCHANGE */}
          <div className="space-y-4 pt-6 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4F6CE8] border-b border-black/5 dark:border-white/5 pb-3">
              <Icons.CheckCircle size={16} />
              <span>À retenir pour cet échange</span>
            </div>

            <div className="divide-y divide-black/5 dark:divide-white/5">
              {data.visit_facts && data.visit_facts.length > 0 ? (
                data.visit_facts.map((fact, idx) => (
                  <div key={`${fact.label}-${idx}`} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-500 uppercase tracking-wider text-[11px]">
                        {fact.label}
                      </span>
                      <span className="text-zinc-400 text-[10px]">
                        Source : {fact.source}
                      </span>
                    </div>
                    <p className="mt-1 text-xs md:text-sm font-semibold text-zinc-900 dark:text-white leading-relaxed">
                      {fact.value}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 py-3 leading-relaxed">
                  Aucune information supplémentaire confirmée. Utilisez la grille de questionnement ci-dessous pour qualifier les besoins et le budget.
                </p>
              )}
            </div>
          </div>

          {/* SECTION 4: QUESTIONS STRATÉGIQUES À CONFIRMER AVEC LE CLIENT */}
          <div className="space-y-4 pt-6 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4F6CE8] border-b border-black/5 dark:border-white/5 pb-3">
              <Icons.HelpCircle size={16} />
              <span>Questions stratégiques à confirmer avec le client</span>
            </div>

            <div className="space-y-3 pt-2">
              {data.questions_to_confirm && data.questions_to_confirm.length > 0 ? (
                data.questions_to_confirm.map((question, index) => (
                  <div
                    key={index}
                    className="p-3.5 rounded-xl bg-[#F6F5F2] dark:bg-[#1E1B1E] border border-black/5 dark:border-white/5 flex items-start gap-3.5"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#4F6CE8]/15 text-[#4F6CE8] text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <p className="text-xs md:text-sm font-semibold text-zinc-800 dark:text-zinc-200 leading-relaxed">
                      {question}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 py-2">
                  Aucune question spécifique générée pour ce profil d&apos;entretien.
                </p>
              )}
            </div>
          </div>

          {/* PIED DE CARTE: ACTION RAPIDE VERS LE BRIEF VOCAL */}
          <div className="pt-6 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-zinc-500">
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
