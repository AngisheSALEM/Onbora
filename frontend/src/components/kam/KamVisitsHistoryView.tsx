"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';
import { KamVisitPurpose, VISIT_PURPOSE_LABELS } from './kamVisitPurpose';

export interface KamVisitRecord {
  id: number;
  appointment_id: number | null;
  enterprise_id: number;
  enterprise_name: string;
  enterprise_sector: string;
  crm_id: string;
  meeting_type: 'PHYSICAL' | 'GOOGLE_MEET' | 'CALL';
  meeting_type_label: string;
  visit_purpose: KamVisitPurpose | null;
  visit_purpose_label: string;
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
  onOpenReport?: (visit: KamVisitRecord) => void;
}

export default function KamVisitsHistoryView({
  onScheduleMeeting,
  onOpenReport,
}: KamVisitsHistoryViewProps) {
  const [visits, setVisits] = useState<KamVisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONVERTED' | 'IN_NEGOTIATION' | 'PROSPECT' | 'LOST'>('ALL');
  const [purposeFilter, setPurposeFilter] = useState<'ALL' | KamVisitPurpose>('ALL');

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

  // Filter logic
  const filteredVisits = visits.filter((v) => {
    if (purposeFilter !== 'ALL' && v.visit_purpose !== purposeFilter) return false;
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

        <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
          Type de visite
          <select value={purposeFilter} onChange={(event) => setPurposeFilter(event.target.value as 'ALL' | KamVisitPurpose)} className="px-3 py-2 rounded-xl bg-[#F6F5F2] dark:bg-[#2D2A2D] text-zinc-900 dark:text-white focus-visible:outline-2 focus-visible:outline-[#4F6CE8]">
            <option value="ALL">Tous les types</option>
            {(Object.keys(VISIT_PURPOSE_LABELS) as KamVisitPurpose[]).map((purpose) => <option key={purpose} value={purpose}>{VISIT_PURPOSE_LABELS[purpose]}</option>)}
          </select>
        </label>

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
        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 overflow-hidden shadow-xs flex flex-col">
          <div className="overflow-x-auto overflow-y-auto max-h-[60vh] min-h-[350px]">
            <table className="w-full text-left text-xs border-collapse min-w-[980px]">
              <thead className="sticky top-0 z-10 bg-[#EAE8E3] dark:bg-[#262326] backdrop-blur-md shadow-xs">
                <tr className="border-b border-black/10 dark:border-white/10 text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4 whitespace-nowrap">Date & Heure</th>
                  <th className="py-3 px-4 min-w-[220px]">Compte Client</th>
                  <th className="py-3 px-4 whitespace-nowrap">Type de RDV</th>
                  <th className="py-3 px-4 whitespace-nowrap">Statut Commercial</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredVisits.map((visit) => (
                  <tr
                    key={visit.id}
                    onClick={() => onOpenReport?.(visit)}
                    className="hover:bg-white/60 dark:hover:bg-black/20 transition-colors cursor-pointer group"
                  >
                    {/* Date */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-sf text-zinc-900 dark:text-zinc-100 font-semibold text-xs block">
                        {formatDate(visit.created_at)}
                      </span>
                    </td>

                    {/* Enterprise / Compte Client */}
                    <td className="py-3 px-4 min-w-[220px]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#4F6CE8]/12 dark:bg-[#4F6CE8]/25 text-[#4F6CE8] dark:text-[#7C97F8] flex items-center justify-center font-bold text-xs shrink-0 border border-[#4F6CE8]/20">
                          {visit.enterprise_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span
                            className="font-semibold text-zinc-900 dark:text-white block group-hover:text-[#4F6CE8] transition-colors truncate text-xs"
                            title={visit.enterprise_name}
                          >
                            {visit.enterprise_name}
                          </span>
                          <span
                            className="text-[11px] text-zinc-600 dark:text-zinc-400 block font-medium mt-0.5 truncate"
                            title={visit.enterprise_sector || visit.crm_id}
                          >
                            {visit.enterprise_sector || visit.crm_id}
                          </span>
                          <span className="text-[11px] text-[#4F6CE8] block mt-0.5">{visit.visit_purpose_label || 'Type non renseigné'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Meeting Type */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getMeetingTypeBadge(visit.meeting_type)}
                    </td>

                    {/* Conversion Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getConversionBadge(visit.conversion_status)}
                    </td>

                    {/* Action Button: Voir le rapport */}
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReport?.(visit);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4F6CE8]/10 hover:bg-[#4F6CE8] text-[#4F6CE8] hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <Icons.FileText size={13} />
                        <span>Voir le rapport</span>
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between text-[11px] text-zinc-500 shrink-0">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              {filteredVisits.length} visite{filteredVisits.length > 1 ? 's' : ''} affichée{filteredVisits.length > 1 ? 's' : ''} sur {visits.length} au total
            </span>
            <span className="text-[10px] text-zinc-400">
              Défilement actif dans la table
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
