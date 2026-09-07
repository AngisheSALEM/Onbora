"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';

export interface KamVisitRecord {
  id: number;
  appointment_id: number | null;
  enterprise_id: number;
  enterprise_name: string;
  enterprise_sector: string;
  crm_id: string;
  meeting_type: 'PHYSICAL' | 'GOOGLE_MEET' | 'CALL';
  meeting_type_label: string;
  contact_name: string;
  contact_role: string;
  raw_transcript: string;
  executive_summary: string;
  confirmed_needs: string[];
  objections_raised: string[];
  actions_todo: string[];
  follow_up_email_draft: string;
  bant_scores: {
    budget?: number;
    authority?: number;
    need?: number;
    timeline?: number;
    total?: number;
    status?: string;
  };
  conversion_status: string;
  created_at: string;
}

interface KamVisitsHistoryViewProps {
  onScheduleMeeting?: () => void;
}

export default function KamVisitsHistoryView({ onScheduleMeeting }: KamVisitsHistoryViewProps) {
  const [visits, setVisits] = useState<KamVisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONVERTED' | 'IN_NEGOTIATION' | 'PROSPECT' | 'LOST'>('ALL');
  const [selectedReport, setSelectedReport] = useState<KamVisitRecord | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isVerbatimExpanded, setIsVerbatimExpanded] = useState(false);

  const loadVisits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAPI('/api/kam/visits/');
      if (data && Array.isArray(data.visits)) {
        setVisits(data.visits);
      } else {
        setVisits([]);
      }
    } catch (err: any) {
      console.error("Erreur lors de la récupération de l'historique des visites:", err);
      setError("Impossible de charger l'historique des visites. Veuillez vérifier votre connexion.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  const copyEmailToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // Filter logic
  const filteredVisits = visits.filter((v) => {
    if (statusFilter !== 'ALL' && v.conversion_status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = v.enterprise_name.toLowerCase().includes(q);
      const matchContact = v.contact_name.toLowerCase().includes(q);
      const matchSector = v.enterprise_sector.toLowerCase().includes(q);
      const matchCrm = v.crm_id.toLowerCase().includes(q);
      if (!matchName && !matchContact && !matchSector && !matchCrm) return false;
    }
    return true;
  });

  const convertedCount = visits.filter(v => v.conversion_status === 'CONVERTED').length;
  const negotiationCount = visits.filter(v => v.conversion_status === 'IN_NEGOTIATION').length;
  const closingRate = visits.length > 0 ? Math.round((convertedCount / visits.length) * 100) : 0;

  const formatDate = (isoStr: string) => {
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

  const getMeetingTypeBadge = (type: string) => {
    switch (type) {
      case 'GOOGLE_MEET':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#4F6CE8]/10 text-[#4F6CE8]">
            <Icons.Video size={12} />
            <span>Google Meet</span>
          </span>
        );
      case 'CALL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
            <Icons.Phone size={12} />
            <span>Appel Téléphonique</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Icons.MapPin size={12} />
            <span>Visite Terrain</span>
          </span>
        );
    }
  };

  const getConversionBadge = (status: string) => {
    switch (status) {
      case 'CONVERTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Icons.CheckCircle size={11} />
            <span>Contrat Signé</span>
          </span>
        );
      case 'IN_NEGOTIATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#4F6CE8]/15 text-[#4F6CE8] border border-[#4F6CE8]/20">
            <Icons.Layers size={11} />
            <span>En négociation</span>
          </span>
        );
      case 'LOST':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <Icons.AlertCircle size={11} />
            <span>Non retenu</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
            <Icons.Clock size={11} />
            <span>Prospect</span>
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-8 overflow-y-auto select-none">
      
      {/* 1. TOP HEADER & METRIC SUMMARY CARDS */}
      <div className="flex flex-col gap-4 pb-2 border-b border-zinc-200/80 dark:border-white/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Historique des Visites & Rapports Exécutifs
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Consultez l&apos;ensemble de vos visites réelles, synthèses Core AI et emails de closing générés.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadVisits}
              className="flex items-center gap-2 px-4 py-2 bg-[#F6F5F2] dark:bg-[#2D2A2D] hover:bg-white dark:hover:bg-[#363336] text-zinc-700 dark:text-zinc-200 rounded-full text-xs font-semibold transition-all cursor-pointer border border-black/5 dark:border-white/5 shadow-xs"
              title="Actualiser la liste"
            >
              <Icons.RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>Actualiser</span>
            </button>

            {onScheduleMeeting && (
              <button
                onClick={onScheduleMeeting}
                className="flex items-center gap-2 px-4 py-2 bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 text-white rounded-full text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                <Icons.Calendar size={14} />
                <span>Aller à l&apos;Agenda</span>
              </button>
            )}
          </div>
        </div>

        {/* Real KPI Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          <div className="p-4 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
            <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
              Total Visites Réalisées
            </span>
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-white font-mono">
              {visits.length}
            </span>
          </div>

          <div className="p-4 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
            <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider block">
              Contrats Signés
            </span>
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {convertedCount}
            </span>
          </div>

          <div className="p-4 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
            <span className="text-[10px] font-extrabold text-[#4F6CE8] uppercase tracking-wider block">
              En Négociation
            </span>
            <span className="text-2xl font-extrabold text-[#4F6CE8] font-mono">
              {negotiationCount}
            </span>
          </div>

          <div className="p-4 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
            <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
              Taux de Conversion
            </span>
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-white font-mono">
              {closingRate}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & FILTER TOOLBAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="flex items-center gap-2.5 px-4 py-2 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-full text-xs border border-black/5 dark:border-white/5 max-w-md w-full focus-within:ring-2 focus-within:ring-[#4F6CE8]">
          <Icons.Search size={14} className="text-zinc-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par client, contact, CRM ID..."
            className="bg-transparent border-none outline-none text-zinc-900 dark:text-white placeholder-zinc-400 w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <Icons.X size={13} />
            </button>
          )}
        </div>

        {/* Status filter capsules */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'ALL', label: 'Toutes' },
            { id: 'CONVERTED', label: 'Signés' },
            { id: 'IN_NEGOTIATION', label: 'En négo' },
            { id: 'PROSPECT', label: 'Prospects' },
            { id: 'LOST', label: 'Perdus' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                statusFilter === st.id
                  ? 'bg-[#4F6CE8] text-white shadow-sm font-extrabold'
                  : 'bg-[#F6F5F2] dark:bg-[#2D2A2D] text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-[#363336] border border-black/5 dark:border-white/5'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. VISITS LIST TABLE / EMPTY STATE */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <Icons.Sparkles size={30} className="animate-spin text-[#4F6CE8]" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Chargement de vos comptes-rendus réels...
            </span>
          </div>
        </div>
      ) : error ? (
        <div className="p-8 max-w-md mx-auto text-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 space-y-3">
          <Icons.AlertCircle size={32} className="text-rose-500 mx-auto" />
          <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">Erreur de chargement</h3>
          <p className="text-xs text-zinc-500">{error}</p>
          <button
            onClick={loadVisits}
            className="px-4 py-2 bg-[#4F6CE8] hover:bg-[#3D57C5] text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      ) : visits.length === 0 ? (
        /* Real 0 Visits Empty State */
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="p-12 max-w-md bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[32px] border border-black/5 dark:border-white/5 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#4F6CE8]/10 text-[#4F6CE8] mx-auto flex items-center justify-center">
              <Icons.FileText size={30} />
            </div>
            <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">
              0 visite enregistrée
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Vous n&apos;avez encore finalisé aucun compte-rendu de visite en base de données. Planifiez un rendez-vous dans votre <strong className="text-zinc-800 dark:text-zinc-200">Agenda</strong>, activez le brief vocal pendant la visite, et Core AI rédigera automatiquement votre rapport et email de relance.
            </p>
            {onScheduleMeeting && (
              <button
                onClick={onScheduleMeeting}
                className="px-5 py-2.5 bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 text-white rounded-full text-xs font-semibold cursor-pointer transition-all inline-flex items-center gap-2 shadow-sm"
              >
                <Icons.Calendar size={15} />
                <span>Ouvrir l&apos;Agenda & Planifier</span>
              </button>
            )}
          </div>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="p-12 text-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 space-y-2">
          <p className="text-xs font-bold text-zinc-500">Aucun résultat ne correspond à vos filtres.</p>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
            className="text-xs text-[#4F6CE8] font-semibold hover:underline cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        /* Backoffice-Style High-Fidelity Table */
        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-zinc-400 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-5">Date & Heure</th>
                  <th className="py-3.5 px-5">Compte Client</th>
                  <th className="py-3.5 px-5">Type de RDV</th>
                  <th className="py-3.5 px-5">Décideur Rencontré</th>
                  <th className="py-3.5 px-5">Statut Commercial</th>
                  <th className="py-3.5 px-5">Synthèse Core AI</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredVisits.map((visit) => (
                  <tr
                    key={visit.id}
                    onClick={() => setSelectedReport(visit)}
                    className="hover:bg-white/60 dark:hover:bg-black/20 transition-colors cursor-pointer group"
                  >
                    {/* Date */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold block">
                        {formatDate(visit.created_at)}
                      </span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5 font-mono">
                        Rapport #{visit.id}
                      </span>
                    </td>

                    {/* Enterprise */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#4F6CE8]/10 text-[#4F6CE8] flex items-center justify-center font-bold text-xs shrink-0">
                          {visit.enterprise_name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-white block group-hover:text-[#4F6CE8] transition-colors">
                            {visit.enterprise_name}
                          </span>
                          <span className="text-[10px] text-zinc-400 block font-mono">
                            {visit.enterprise_sector || visit.crm_id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Meeting Type */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      {getMeetingTypeBadge(visit.meeting_type)}
                    </td>

                    {/* Stakeholder */}
                    <td className="py-4 px-5">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                        {visit.contact_name || 'Direction'}
                      </span>
                      <span className="text-[10px] text-zinc-400 block">
                        {visit.contact_role || 'Décideur C-Level'}
                      </span>
                    </td>

                    {/* Conversion Status */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      {getConversionBadge(visit.conversion_status)}
                    </td>

                    {/* Core AI Summary Preview */}
                    <td className="py-4 px-5 max-w-xs">
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                        {visit.executive_summary || "Entretien stratégique consigné en base."}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReport(visit);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4F6CE8]/10 hover:bg-[#4F6CE8] text-[#4F6CE8] hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                      >
                        <Icons.Eye size={13} />
                        <span>Rapport</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. MODAL RAPPORT EXÉCUTIF COMPLET (CALQUÉ SUR LE BACKOFFICE) */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 select-text">
          <div className="bg-[#ECEAE5] dark:bg-[#242124] text-zinc-900 dark:text-white w-full max-w-4xl max-h-[90vh] rounded-[32px] border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden animate-scale-up">
            
            {/* Modal Top Header */}
            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0 bg-[#F6F5F2] dark:bg-[#2D2A2D]">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#4F6CE8] text-white flex items-center justify-center font-extrabold text-lg shadow-md">
                  {selectedReport.enterprise_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white tracking-tight">
                      {selectedReport.enterprise_name}
                    </h3>
                    {getConversionBadge(selectedReport.conversion_status)}
                    {getMeetingTypeBadge(selectedReport.meeting_type)}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Rapport de visite #{selectedReport.id} • Réalisé le {formatDate(selectedReport.created_at)} • Interlocuteur : <strong className="text-zinc-800 dark:text-zinc-200">{selectedReport.contact_name} ({selectedReport.contact_role})</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <Icons.X size={20} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              
              {/* BANT Score Card if available */}
              {selectedReport.bant_scores && selectedReport.bant_scores.total !== undefined && (
                <div className="p-4 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl border border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                      Qualification BANT Core AI
                    </span>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Score global de viabilité commerciale
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xl font-extrabold font-mono text-[#4F6CE8]">
                        {selectedReport.bant_scores.total} / 100
                      </span>
                      <span className="text-[10px] text-zinc-400 block font-semibold">
                        Statut : {selectedReport.bant_scores.status || 'QUALIFIED'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 1 : Synthèse Exécutive */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                  <Icons.FileText size={14} className="text-[#4F6CE8]" />
                  <span>Synthèse Exécutive de la Rencontre</span>
                </h4>
                <div className="p-5 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl border border-black/5 dark:border-white/5">
                  <p className="text-xs md:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {selectedReport.executive_summary || "Aucune synthèse rédigée."}
                  </p>
                </div>
              </div>

              {/* Section 2 : Besoins Détectés vs Objections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Besoins Confirmés */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase text-emerald-500 tracking-wider flex items-center gap-1.5">
                    <Icons.CheckCircle size={14} />
                    <span>Besoins Clients Confirmés ({selectedReport.confirmed_needs?.length || 0})</span>
                  </h4>
                  <div className="p-4 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
                    {selectedReport.confirmed_needs && selectedReport.confirmed_needs.length > 0 ? (
                      selectedReport.confirmed_needs.map((need, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-zinc-800 dark:text-zinc-200">
                          <Icons.Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>{need}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-400 italic">Aucun besoin spécifique consigné.</span>
                    )}
                  </div>
                </div>

                {/* Objections Soulevées */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                    <Icons.Shield size={14} className="text-zinc-400" />
                    <span>Objections & Freins ({selectedReport.objections_raised?.length || 0})</span>
                  </h4>
                  <div className="p-4 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
                    {selectedReport.objections_raised && selectedReport.objections_raised.length > 0 ? (
                      selectedReport.objections_raised.map((obj, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-zinc-800 dark:text-zinc-200">
                          <Icons.AlertCircle size={14} className="text-zinc-400 shrink-0 mt-0.5" />
                          <span>{obj}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-400 italic">Aucun frein majeur identifié.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3 : Actions Décidées / Next Steps */}
              {selectedReport.actions_todo && selectedReport.actions_todo.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                    <Icons.ArrowRight size={14} className="text-[#4F6CE8]" />
                    <span>Engagements & Prochaines Étapes</span>
                  </h4>
                  <div className="p-4 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
                    {selectedReport.actions_todo.map((act, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200 font-medium">
                        <span className="w-5 h-5 rounded-full bg-[#4F6CE8]/15 text-[#4F6CE8] text-[10px] font-extrabold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 4 : Email de Relance J+1 Généré par Core AI */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                    <Icons.Mail size={14} className="text-[#4F6CE8]" />
                    <span>Email de Remerciement & Proposition J+1 (Core AI)</span>
                  </h4>
                  <button
                    onClick={() => copyEmailToClipboard(selectedReport.follow_up_email_draft)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#4F6CE8]/10 hover:bg-[#4F6CE8] text-[#4F6CE8] hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    {copiedEmail ? <Icons.Check size={12} /> : <Icons.Copy size={12} />}
                    <span>{copiedEmail ? "Copié !" : "Copier l'email"}</span>
                  </button>
                </div>
                <div className="p-5 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl border border-black/5 dark:border-white/5">
                  <pre className="font-mono text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {selectedReport.follow_up_email_draft || "Aucun brouillon d'email disponible."}
                  </pre>
                </div>
              </div>

              {/* Section 5 : Verbatim & Transcription brute (Optionnel / Dépliable) */}
              {selectedReport.raw_transcript && (
                <div className="pt-2">
                  <button
                    onClick={() => setIsVerbatimExpanded(!isVerbatimExpanded)}
                    className="flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <Icons.ChevronDown size={14} className={`transition-transform duration-200 ${isVerbatimExpanded ? 'rotate-180' : ''}`} />
                    <span>{isVerbatimExpanded ? "Masquer la transcription audio complète" : "Afficher la transcription audio brute"}</span>
                  </button>
                  {isVerbatimExpanded && (
                    <div className="mt-2 p-4 bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl border border-black/5 dark:border-white/5 text-[11px] text-zinc-600 dark:text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {selectedReport.raw_transcript}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Bottom Footer */}
            <div className="p-4 px-6 border-t border-black/5 dark:border-white/5 bg-[#F6F5F2] dark:bg-[#2D2A2D] flex items-center justify-between shrink-0">
              <span className="text-[11px] text-zinc-500 font-mono">
                Statut actuel en CRM : <strong className="text-zinc-800 dark:text-zinc-200">{selectedReport.conversion_status}</strong>
              </span>
              <button
                onClick={() => setSelectedReport(null)}
                className="px-5 py-2 bg-zinc-800 dark:bg-white hover:bg-black dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
