"use client";

import React from 'react';
import { Icons } from '@/components/shared/Icons';

interface BackofficeReportInspectModalProps {
  report: any | null;
  onClose: () => void;
}

export default function BackofficeReportInspectModal({
  report,
  onClose,
}: BackofficeReportInspectModalProps) {
  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl max-w-2xl w-full p-6 border border-black/10 dark:border-white/10 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#4F6CE8]">
              {report.type === 'SUBMISSION' ? 'Formulaire de Qualification Guidé' : 'Compte-Rendu Dictaphone / IA'}
            </span>
            <h3 className="text-base font-extrabold text-[#242124] dark:text-white">
              {report.enterprise_name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Metadata Chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
          {report.plaque_code && (
            <span className="px-2.5 py-1 rounded-xl bg-[#4F6CE8]/10 text-[#4F6CE8] font-bold">
              Plaque : {report.plaque_code}
            </span>
          )}
          {report.qualification_score !== undefined && (
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              Score : {report.qualification_score}/100
            </span>
          )}
          {report.target_offer_name && (
            <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#363336] text-[#242124] dark:text-white font-semibold border border-black/5 dark:border-white/5">
              {report.target_offer_name}
            </span>
          )}
          <span>
            {new Date(report.created_at).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Executive Summary */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-[#242124] dark:text-white">Synthèse de la Visite</span>
          <div className="bg-white dark:bg-[#363336] p-4 rounded-2xl text-xs text-[#242124] dark:text-white leading-relaxed whitespace-pre-line border border-black/5 dark:border-white/5 shadow-xs">
            {report.ai_summary || report.executive_summary || 'Aucune synthèse disponible.'}
          </div>
        </div>

        {/* Form Answers if available */}
        {report.answers && report.answers.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-[#242124] dark:text-white">
              Réponses au Questionnaire Guidé ({report.answers.length})
            </span>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {report.answers.map((ans: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 text-xs flex flex-col gap-1"
                >
                  <span className="font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
                    Q{idx + 1}: {ans.question_text || ans.question_id || 'Question'}
                  </span>
                  <span className="font-bold text-[#242124] dark:text-white">
                    {Array.isArray(ans.answer) ? ans.answer.join(', ') : String(ans.answer ?? 'Non renseigné')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Needs & Objections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {((report.detected_needs?.length || 0) > 0 || (report.confirmed_needs?.length || 0) > 0) && (
            <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Besoins Détectés</span>
              <div className="flex flex-wrap gap-1">
                {(report.detected_needs || report.confirmed_needs || []).map((need: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-[#4F6CE8]/10 text-[#4F6CE8] text-[10px] font-semibold"
                  >
                    {need}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(report.objections_noted || (report.objections_raised?.length || 0) > 0) && (
            <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                Objections / Contraintes
              </span>
              <p className="text-xs text-[#242124] dark:text-white">
                {report.objections_noted || (report.objections_raised || []).join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Next Action */}
        {report.next_action && (
          <div className="p-3 rounded-2xl bg-[#4F6CE8]/10 text-xs flex items-center justify-between text-[#4F6CE8]">
            <span className="font-semibold">Prochaine action :</span>
            <span className="font-bold">{report.next_action}</span>
          </div>
        )}

        {/* Close action */}
        <div className="flex justify-end mt-2 pt-3 border-t border-black/5 dark:border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-2xl bg-[#242124] dark:bg-white text-white dark:text-[#242124] text-xs font-semibold cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
