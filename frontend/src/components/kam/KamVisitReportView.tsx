"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';
import { KamVisitRecord } from './KamVisitsHistoryView';

interface KamVisitReportViewProps {
  reportId?: number | null;
  initialReport?: KamVisitRecord | null;
  onBack: () => void;
}

export default function KamVisitReportView({
  reportId,
  initialReport,
  onBack,
}: KamVisitReportViewProps) {
  const [report, setReport] = useState<KamVisitRecord | null>(initialReport || null);
  const [loading, setLoading] = useState<boolean>(!initialReport && !!reportId);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'report' | 'email'>('report');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [syncingCrm, setSyncingCrm] = useState(false);
  const [syncCrmMessage, setSyncCrmMessage] = useState<string | null>(null);
  const [isVerbatimExpanded, setIsVerbatimExpanded] = useState(false);

  const loadReport = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAPI(`/api/kam/visits/${id}/`);
      if (data && data.id) {
        setReport(data);
      } else {
        setError("Rapport de visite introuvable.");
      }
    } catch (err: any) {
      console.error("Erreur chargement rapport:", err);
      setError("Impossible de charger le rapport de visite.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialReport) {
      setReport(initialReport);
      setLoading(false);
    } else if (reportId) {
      loadReport(reportId);
    }
  }, [reportId, initialReport, loadReport]);

  const handleSyncDynamics = async () => {
    if (!report) return;
    setSyncingCrm(true);
    setSyncCrmMessage(null);
    try {
      const res = await fetchAPI(`/api/kam/visits/${report.id}/sync-crm/`, { method: 'POST' });
      setSyncCrmMessage(res?.detail || "Synchronisé avec Microsoft Dynamics 365");
      setTimeout(() => setSyncCrmMessage(null), 4000);
      loadReport(report.id);
    } catch {
      setSyncCrmMessage("Erreur lors de la synchronisation CRM.");
      setTimeout(() => setSyncCrmMessage(null), 4000);
    } finally {
      setSyncingCrm(false);
    }
  };

  const copyEmailToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const getConversionBadge = (status: string) => {
    switch (status) {
      case 'CONVERTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Icons.CheckCircle size={11} />
            <span>Contrat Signé</span>
          </span>
        );
      case 'IN_NEGOTIATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4F6CE8]/10 text-[#4F6CE8] border border-[#4F6CE8]/20">
            <Icons.TrendingUp size={11} />
            <span>En négociation</span>
          </span>
        );
      case 'LOST':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <Icons.AlertCircle size={11} />
            <span>Perdu</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
            <Icons.User size={11} />
            <span>Prospect</span>
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#ECEAE5] dark:bg-[#242124] p-6 md:p-8 select-text transition-colors duration-300">
      
      {/* 1. TOP HEADER WITH BACK BUTTON & ACTIONS */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white dark:bg-[#282528] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-black/5 dark:border-white/5 transition-colors cursor-pointer"
            title="Retour"
          >
            <Icons.ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              {report?.enterprise_name || 'Rapport de visite'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {report?.created_at ? formatDate(report.created_at) : 'Compte-rendu'}
              </span>
              {report?.visit_purpose_label && (
                <>
                  <span className="text-zinc-400 text-xs">•</span>
                  <span className="text-xs font-semibold text-[#4F6CE8]">
                    {report.visit_purpose_label}
                  </span>
                </>
              )}
              {report?.conversion_status && (
                <>
                  <span className="text-zinc-400 text-xs">•</span>
                  {getConversionBadge(report.conversion_status)}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons on Right */}
        {report && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleSyncDynamics}
              disabled={syncingCrm}
              className="px-3.5 py-2 bg-white dark:bg-[#282528] hover:bg-zinc-100 dark:hover:bg-[#363336] text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl border border-black/5 dark:border-white/5 shadow-xs cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Icons.RefreshCw size={13} className={syncingCrm ? "animate-spin" : ""} />
              <span>{syncingCrm ? "Synchronisation..." : "Pousser vers Dynamics 365"}</span>
            </button>
            <button
              onClick={() => copyEmailToClipboard(report.follow_up_email_draft)}
              className="px-4 py-2 bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
            >
              {copiedEmail ? <Icons.Check size={13} /> : <Icons.Copy size={13} />}
              <span>{copiedEmail ? "Email copié !" : "Copier l'email"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Sync Banner Notification */}
      {syncCrmMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <Icons.Check size={14} className="text-emerald-600" />
          <span>{syncCrmMessage}</span>
        </div>
      )}

      {/* 2. DISCREET TABS (Minimalist underline style, identical to PreCallView) */}
      {report && !loading && !error && (
        <div className="flex items-center gap-8 border-b border-black/5 dark:border-white/5 mb-6">
          <button
            onClick={() => setActiveTab('report')}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
              activeTab === 'report'
                ? 'text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            Compte-rendu & Engagements
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
              activeTab === 'email'
                ? 'text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            Email de relance & Détails CRM
          </button>
        </div>
      )}

      {/* 3. LOADING & ERROR STATES */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <Icons.RefreshCw size={28} className="animate-spin text-[#4F6CE8] mb-3" />
          <p className="text-xs text-zinc-500">Chargement du rapport de visite...</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-[#282528] text-center max-w-md mx-auto my-auto space-y-3 border border-black/5 dark:border-white/5">
          <p className="text-xs text-zinc-500">{error}</p>
          <button
            onClick={() => reportId && loadReport(reportId)}
            className="px-4 py-2 bg-[#4F6CE8] text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      ) : report ? (
        <div className="max-w-4xl mx-auto w-full pb-12">

          {/* ========================================================================= */}
          {/* TAB 1: SINGLE CARD (WORD DOCUMENT STYLE) - COMPTE-RENDU & ENGAGEMENTS     */}
          {/* ========================================================================= */}
          {activeTab === 'report' && (
            <div className="bg-white dark:bg-[#282528] rounded-2xl p-7 md:p-9 shadow-xs border border-black/5 dark:border-white/5 text-zinc-800 dark:text-zinc-200 animate-in fade-in duration-150 space-y-8">
              
              {/* Synthèse Exécutive */}
              <div className="space-y-3">
                <p className="text-sm md:text-[15px] leading-relaxed font-normal whitespace-pre-line text-zinc-800 dark:text-zinc-200">
                  {report.executive_summary || "Aucune synthèse rédigée pour cette visite."}
                </p>
              </div>

              {/* Seamless Divider */}
              <div className="border-t border-black/5 dark:border-white/5" />

              {/* Besoins Clients Confirmés */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Besoins clients confirmés
                </h3>
                {report.confirmed_needs && report.confirmed_needs.length > 0 ? (
                  <div className="space-y-2">
                    {report.confirmed_needs.map((need, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs md:text-sm text-zinc-700 dark:text-zinc-300">
                        <Icons.Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{need}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 italic">Aucun besoin consigné lors de l&apos;entretien.</p>
                )}
              </div>

              {/* Seamless Divider */}
              <div className="border-t border-black/5 dark:border-white/5" />

              {/* Objections & Points de vigilance */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Objections & Points de vigilance
                </h3>
                {report.objections_raised && report.objections_raised.length > 0 ? (
                  <div className="space-y-2">
                    {report.objections_raised.map((obj, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs md:text-sm text-zinc-700 dark:text-zinc-300">
                        <Icons.AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                        <span>{obj}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 italic">Aucun frein majeur relevé.</p>
                )}
              </div>

              {/* Seamless Divider */}
              <div className="border-t border-black/5 dark:border-white/5" />

              {/* Engagements & Prochaines étapes */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Engagements & Prochaines étapes
                </h3>
                {report.actions_todo && report.actions_todo.length > 0 ? (
                  <div className="space-y-2.5">
                    {report.actions_todo.map((action, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-xs md:text-sm text-zinc-800 dark:text-zinc-200">
                        <span className="w-5 h-5 rounded-full bg-[#4F6CE8]/15 text-[#4F6CE8] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 italic">Aucune action consignée pour le moment.</p>
                )}
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: EMAIL DE RELANCE J+1 & DÉTAILS CRM                                 */}
          {/* ========================================================================= */}
          {activeTab === 'email' && (
            <div className="bg-white dark:bg-[#282528] rounded-2xl p-7 md:p-9 shadow-xs border border-black/5 dark:border-white/5 text-zinc-800 dark:text-zinc-200 animate-in fade-in duration-150 space-y-8">
              
              {/* Email Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Email de remerciement et proposition J+1
                  </h3>
                  <button
                    onClick={() => copyEmailToClipboard(report.follow_up_email_draft)}
                    className="text-xs text-[#4F6CE8] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                  >
                    {copiedEmail ? <Icons.Check size={12} /> : <Icons.Copy size={12} />}
                    <span>{copiedEmail ? "Copié !" : "Copier"}</span>
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-[#F6F5F2] dark:bg-[#1E1B1E] border border-black/5 dark:border-white/5">
                  <pre className="font-mono text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {report.follow_up_email_draft || "Aucun email généré."}
                  </pre>
                </div>
              </div>

              {/* Seamless Divider */}
              <div className="border-t border-black/5 dark:border-white/5" />

              {/* BANT Qualification Score */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Qualification BANT & Statut commercial
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#F6F5F2] dark:bg-[#1E1B1E]">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Score Total</span>
                    <span className="text-lg font-bold font-mono text-[#4F6CE8]">
                      {report.bant_scores?.total ?? 0} / 100
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F6F5F2] dark:bg-[#1E1B1E]">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Statut BANT</span>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block mt-1">
                      {report.bant_scores?.status || 'QUALIFIED'}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F6F5F2] dark:bg-[#1E1B1E]">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Budget</span>
                    <span className="text-lg font-bold font-mono text-zinc-800 dark:text-zinc-200">
                      {report.bant_scores?.budget ?? 0} / 25
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F6F5F2] dark:bg-[#1E1B1E]">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Décision / Need</span>
                    <span className="text-lg font-bold font-mono text-zinc-800 dark:text-zinc-200">
                      {(report.bant_scores?.authority ?? 0) + (report.bant_scores?.need ?? 0)} / 50
                    </span>
                  </div>
                </div>
              </div>

              {/* Seamless Divider */}
              {report.raw_transcript && (
                <>
                  <div className="border-t border-black/5 dark:border-white/5" />
                  <div className="space-y-3">
                    <button
                      onClick={() => setIsVerbatimExpanded(!isVerbatimExpanded)}
                      className="flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <Icons.ChevronDown size={14} className={`transition-transform duration-200 ${isVerbatimExpanded ? 'rotate-180' : ''}`} />
                      <span>{isVerbatimExpanded ? "Masquer la transcription audio complète" : "Afficher la transcription audio brute"}</span>
                    </button>
                    {isVerbatimExpanded && (
                      <div className="p-4 rounded-xl bg-[#F6F5F2] dark:bg-[#1E1B1E] border border-black/5 dark:border-white/5 text-[11px] text-zinc-600 dark:text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                        {report.raw_transcript}
                      </div>
                    )}
                  </div>
                </>
              )}

            </div>
          )}

        </div>
      ) : null}

    </div>
  );
}
