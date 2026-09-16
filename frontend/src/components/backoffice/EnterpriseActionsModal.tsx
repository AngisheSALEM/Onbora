"use client";

import React from 'react';
import { Icons } from '@/components/shared/Icons';

export interface EnterpriseActionsModalProps {
  enterprise: {
    id: number;
    name: string;
    crm_id?: string;
    commune?: string;
    city?: string;
    sector?: string;
    plaque_code?: string;
    contact_name?: string;
    contact_phone?: string;
    assigned_salesperson_name?: string;
    assigned_salesperson?: number;
    is_visited?: boolean;
    last_visited_at?: string;
    conversion_status?: string;
    is_converted?: boolean;
  };
  reports: any[];
  submissions: any[];
  onClose: () => void;
  onOpenReportDetail: (report: any) => void;
}

export default function EnterpriseActionsModal({
  enterprise,
  reports,
  submissions,
  onClose,
  onOpenReportDetail,
}: EnterpriseActionsModalProps) {
  // Filter reports and submissions related to this enterprise
  const entReports = reports.filter((r) => r.enterprise_id === enterprise.id);
  const entSubmissions = submissions.filter((s) => {
    const eid = typeof s.enterprise === 'object' ? s.enterprise?.id : s.enterprise;
    return eid === enterprise.id || s.enterprise_id === enterprise.id;
  });

  const totalVisits = entReports.length + entSubmissions.length;
  const isVisited = enterprise.is_visited || totalVisits > 0;
  const isConverted = enterprise.is_converted || enterprise.conversion_status === 'CONVERTED';

  // Extract latest report / actions if available
  const latestReport = entReports.length > 0 ? entReports[0] : null;
  const latestSubmission = entSubmissions.length > 0 ? entSubmissions[0] : null;

  // Gather needs, objections, next steps across reports
  const allNeeds = Array.from(
    new Set([
      ...(latestReport?.confirmed_needs || []),
      ...(latestSubmission?.detected_needs || []),
    ])
  );

  const allObjections = Array.from(
    new Set([
      ...(latestReport?.objections_raised || []),
      ...(latestSubmission?.objections_noted ? [latestSubmission.objections_noted] : []),
    ])
  );

  const nextActions = Array.from(
    new Set([
      ...(latestReport?.actions_todo || []),
      ...(latestSubmission?.next_action ? [latestSubmission.next_action] : []),
    ])
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl max-w-2xl w-full p-6 border border-black/10 dark:border-white/10 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-black/5 dark:border-white/5 pb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#4F6CE8] bg-[#4F6CE8]/10 px-2.5 py-0.5 rounded-full">
                Compte TPE
              </span>
              <span className="font-mono text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                {enterprise.crm_id || 'ID CRM'}
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-[#242124] dark:text-white tracking-tight">
              {enterprise.name}
            </h3>
            <div className="flex items-center gap-3 text-xs text-[#6E6C67] dark:text-[#A1A1AA] flex-wrap">
              {enterprise.plaque_code && (
                <span className="font-semibold text-[#4F6CE8]">
                  Plaque {enterprise.plaque_code}
                </span>
              )}
              <span>{enterprise.commune || enterprise.city || 'Kinshasa'}</span>
              <span>• {enterprise.sector || 'Secteur d\'activité'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-[#242124] dark:hover:text-white transition-colors cursor-pointer"
            title="Fermer"
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Commercial & Status Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Assigned salesperson */}
          <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
              Commercial Affecté
            </span>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-6 h-6 rounded-full bg-[#4F6CE8] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {enterprise.assigned_salesperson_name ? enterprise.assigned_salesperson_name[0] : '?'}
              </div>
              <span className="text-xs font-bold text-[#242124] dark:text-white truncate">
                {enterprise.assigned_salesperson_name || 'Non affecté'}
              </span>
            </div>
          </div>

          {/* Visits Count Status */}
          <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
              Statut Visites
            </span>
            <div className="mt-1">
              {isVisited ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold inline-flex items-center gap-1.5">
                  <Icons.CheckCircle size={12} />
                  <span>{totalVisits > 0 ? `${totalVisits} visite${totalVisits > 1 ? 's' : ''}` : 'Visité sur le terrain'}</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 text-xs font-bold inline-flex items-center gap-1.5">
                  <Icons.Clock size={12} />
                  <span>Non visité</span>
                </span>
              )}
            </div>
          </div>

          {/* Commercial Conversion Status */}
          <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
              Statut Opportunité
            </span>
            <div className="mt-1">
              {isConverted ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold inline-flex items-center gap-1.5">
                  <Icons.Award size={12} />
                  <span>Converti / Signé</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-[#4F6CE8]/10 text-[#4F6CE8] text-xs font-bold inline-flex items-center gap-1.5">
                  <Icons.Target size={12} />
                  <span>En prospection</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section: Actions & Notes de Visite */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#242124] dark:text-white uppercase tracking-wider">
              Notes de visite & Synthèse Terrain
            </span>
            {enterprise.last_visited_at && (
              <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
                Dernière visite : {new Date(enterprise.last_visited_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>

          <div className="bg-white dark:bg-[#363336] p-4 rounded-2xl border border-black/5 dark:border-white/5 text-xs text-[#242124] dark:text-white leading-relaxed">
            {latestReport?.executive_summary ? (
              <p className="whitespace-pre-line">{latestReport.executive_summary}</p>
            ) : latestSubmission?.ai_summary ? (
              <p className="whitespace-pre-line">{latestSubmission.ai_summary}</p>
            ) : isVisited ? (
              <p className="text-[#6E6C67] dark:text-[#A1A1AA] italic">
                Visite enregistrée sur le terrain. Les détails et notes détaillées sont accessibles dans l'historique ci-dessous.
              </p>
            ) : (
              <div className="flex items-center gap-2 text-[#6E6C67] dark:text-[#A1A1AA]">
                <Icons.AlertCircle size={14} />
                <span>Ce compte n'a pas encore été visité par le commercial affecté.</span>
              </div>
            )}
          </div>
        </div>

        {/* Section: Besoins Détectés */}
        {allNeeds.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-extrabold text-[#242124] dark:text-white uppercase tracking-wider">
              Besoins Détectés & Exprimés
            </span>
            <div className="flex flex-wrap gap-2">
              {allNeeds.map((need, idx) => (
                <span
                  key={`need-${idx}`}
                  className="px-3 py-1 rounded-xl bg-[#4F6CE8]/10 text-[#4F6CE8] text-xs font-semibold flex items-center gap-1.5"
                >
                  <Icons.CheckCircle size={12} />
                  <span>{need}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Section: Objections relevées */}
        {allObjections.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Objections & Contraintes Notées
            </span>
            <div className="flex flex-col gap-1.5">
              {allObjections.map((obj, idx) => (
                <div
                  key={`obj-${idx}`}
                  className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2"
                >
                  <Icons.AlertTriangle size={13} className="shrink-0" />
                  <span>{obj}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: Prochaines Étapes / Plan d'Actions */}
        {nextActions.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-extrabold text-[#242124] dark:text-white uppercase tracking-wider">
              Prochaines Étapes Planifiées
            </span>
            <div className="flex flex-col gap-1.5">
              {nextActions.map((act, idx) => (
                <div
                  key={`act-${idx}`}
                  className="p-2.5 rounded-xl bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 text-xs text-[#242124] dark:text-white flex items-center gap-2"
                >
                  <Icons.CheckCircle size={13} className="text-[#4F6CE8] shrink-0" />
                  <span className="font-semibold">{act}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: Historique des Visites */}
        <div className="flex flex-col gap-2 pt-2 border-t border-black/5 dark:border-white/5">
          <span className="text-xs font-extrabold text-[#242124] dark:text-white uppercase tracking-wider">
            Historique des Visites & Rapports ({totalVisits})
          </span>

          {totalVisits === 0 ? (
            <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] italic">
              Aucun rapport de visite formalisé pour cette entreprise.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {entReports.map((r) => (
                <div
                  key={`rep-${r.id}`}
                  className="p-3 rounded-2xl bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#242124] dark:text-white">
                        {r.salesperson_name || 'Commercial'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#4F6CE8]/10 text-[#4F6CE8] text-[10px] font-semibold">
                        Dictaphone IA
                      </span>
                    </div>
                    <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                      {new Date(r.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenReportDetail({ ...r, type: 'REPORT' })}
                    className="px-3 py-1.5 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Icons.FileText size={12} />
                    <span>Consulter le rapport</span>
                  </button>
                </div>
              ))}

              {entSubmissions.map((s) => (
                <div
                  key={`sub-${s.id}`}
                  className="p-3 rounded-2xl bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#242124] dark:text-white">
                        {s.salesperson_name || 'Commercial'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                        Formulaire Guidé • Score {s.qualification_score}/100
                      </span>
                    </div>
                    <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                      {new Date(s.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenReportDetail({ ...s, type: 'SUBMISSION' })}
                    className="px-3 py-1.5 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Icons.FileText size={12} />
                    <span>Consulter le rapport</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-black/5 dark:border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-2xl bg-[#242124] dark:bg-white text-white dark:text-[#242124] text-xs font-semibold cursor-pointer hover:opacity-90 transition-opacity"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
