"use client";

import React from 'react';
import { Icons } from '@/components/shared/Icons';
import { KamVisitRecord } from '../kamOfficeTypes';

interface KamOfficeReportDetailModalProps {
  report: KamVisitRecord | null;
  onClose: () => void;
  onCopyDraftSuccess?: () => void;
}

export default function KamOfficeReportDetailModal({
  report,
  onClose,
  onCopyDraftSuccess,
}: KamOfficeReportDetailModalProps) {
  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-2xl border border-black/10 dark:border-white/10 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4F6CE8]/15 text-[#4F6CE8] flex items-center justify-center font-extrabold text-sm shrink-0">
              <Icons.FileText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm text-[#242124] dark:text-white">
                  {report.enterprise_name}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  report.meeting_type === 'PHYSICAL'
                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                    : report.meeting_type === 'GOOGLE_MEET'
                    ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {report.meeting_type_label || (
                    report.meeting_type === 'PHYSICAL' ? 'Visite Physique' :
                    report.meeting_type === 'GOOGLE_MEET' ? 'Google Meet' : 'Appel'
                  )}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#6E6C67] dark:text-[#A1A1AA]">
                {report.crm_id} • Rendez-vous du {new Date(report.created_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <Icons.X size={16} />
          </button>
        </div>

        {/* Interlocuteur Décideur */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Décideur Rencontré</span>
            <span className="font-bold text-[#242124] dark:text-white mt-0.5">
              {report.contact_name}
            </span>
            <span className="text-[10px] text-zinc-500">
              {report.contact_role || 'Fonction non précisée'}
            </span>
          </div>

          <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Statut de Conversion</span>
            <span className={`font-bold mt-0.5 ${
              report.conversion_status === 'CONVERTED'
                ? 'text-emerald-600 dark:text-emerald-400'
                : report.conversion_status === 'IN_NEGOTIATION'
                ? 'text-[#4F6CE8]'
                : report.conversion_status === 'LOST'
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-zinc-700 dark:text-zinc-300'
            }`}>
              {report.conversion_status === 'CONVERTED' ? 'Contrat Signé / Gagné' :
               report.conversion_status === 'IN_NEGOTIATION' ? 'Négociation en cours' :
               report.conversion_status === 'LOST' ? 'Opportunité Perdue' : 'En Prospection'}
            </span>
            <span className="text-[10px] text-zinc-500">
              Secteur : {report.enterprise_sector || 'Non renseigné'}
            </span>
          </div>
        </div>

        {/* BANT Evaluation Pills */}
        {report.bant_scores && (
          <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
                Grille d&apos;Évaluation BANT
              </span>
              {report.bant_scores.total !== undefined && (
                <span className="text-xs font-mono font-bold text-[#4F6CE8]">
                  Score Global : {report.bant_scores.total}/100
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-black/2 dark:bg-white/2">
                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">Budget</span>
                <strong className="font-mono text-zinc-900 dark:text-white">{report.bant_scores.budget ?? 'N/A'}/25</strong>
              </div>
              <div className="p-2 rounded-xl bg-black/2 dark:bg-white/2">
                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">Autorité</span>
                <strong className="font-mono text-zinc-900 dark:text-white">{report.bant_scores.authority ?? 'N/A'}/25</strong>
              </div>
              <div className="p-2 rounded-xl bg-black/2 dark:bg-white/2">
                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">Besoin</span>
                <strong className="font-mono text-zinc-900 dark:text-white">{report.bant_scores.need ?? 'N/A'}/25</strong>
              </div>
              <div className="p-2 rounded-xl bg-black/2 dark:bg-white/2">
                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">Timeline</span>
                <strong className="font-mono text-zinc-900 dark:text-white">{report.bant_scores.timeline ?? 'N/A'}/25</strong>
              </div>
            </div>
          </div>
        )}

        {/* Synthèse Exécutive */}
        <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
            Synthèse de l&apos;Échange
          </span>
          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
            {report.executive_summary || 'Aucune synthèse rédigée.'}
          </p>
        </div>

        {/* Besoins & Objections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {report.confirmed_needs && report.confirmed_needs.length > 0 && (
            <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Besoins Confirmés
              </span>
              <ul className="list-disc pl-4 space-y-1 text-zinc-700 dark:text-zinc-300">
                {report.confirmed_needs.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {report.objections_raised && report.objections_raised.length > 0 && (
            <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Objections / Freins
              </span>
              <ul className="list-disc pl-4 space-y-1 text-zinc-700 dark:text-zinc-300">
                {report.objections_raised.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Plan d'Actions / Todos */}
        {report.actions_todo && report.actions_todo.length > 0 && (
          <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-[#4F6CE8] uppercase tracking-wider">
              Plan d&apos;Actions & Prochaines Échéances
            </span>
            <ul className="list-disc pl-4 space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
              {report.actions_todo.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Projet d'Email de Suivi */}
        {report.follow_up_email_draft && (
          <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
                Projet d&apos;Email de Suivi
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(report.follow_up_email_draft);
                  if (onCopyDraftSuccess) onCopyDraftSuccess();
                }}
                className="text-[11px] font-semibold text-[#4F6CE8] hover:underline cursor-pointer flex items-center gap-1"
              >
                <Icons.Copy size={12} />
                <span>Copier le modèle</span>
              </button>
            </div>
            <div className="p-3 rounded-xl bg-black/2 dark:bg-white/2 text-xs text-zinc-800 dark:text-zinc-200 font-mono whitespace-pre-line leading-relaxed">
              {report.follow_up_email_draft}
            </div>
          </div>
        )}

        {/* Verbatim / Notes Brutes */}
        {report.raw_transcript && (
          <details className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 text-xs">
            <summary className="font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
              Consulter le verbatim / transcription brute
            </summary>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400 font-mono whitespace-pre-line leading-relaxed">
              {report.raw_transcript}
            </p>
          </details>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-2xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-900 dark:text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
