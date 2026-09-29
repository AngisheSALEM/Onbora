"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';
import { KamVisitPurpose } from './kamVisitPurpose';
import { useKamContext } from './KamContext';

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
  conversion_status: string;
  bant_scores?: {
    budget?: number;
    authority?: number;
    need?: number;
    timeline?: number;
    total?: number;
    status?: string;
  };
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
  const { searchQuery } = useKamContext();
  const [visits, setVisits] = useState<KamVisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONVERTED' | 'IN_NEGOTIATION' | 'PROSPECT' | 'LOST'>('ALL');

  const loadVisits = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAPI('/api/kam/visits/');
      if (data && Array.isArray(data.visits)) {
        setVisits(data.visits);
      } else {
        setVisits([]);
      }
    } catch {
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (statusFilter !== 'ALL' && v.conversion_status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = v.enterprise_name?.toLowerCase().includes(q);
        const matchContact = v.contact_name?.toLowerCase().includes(q);
        const matchSector = v.enterprise_sector?.toLowerCase().includes(q);
        if (!matchName && !matchContact && !matchSector) return false;
      }
      return true;
    });
  }, [visits, statusFilter, searchQuery]);

  const convertedCount = visits.filter((v) => v.conversion_status === 'CONVERTED').length;
  const negotiationCount = visits.filter((v) => v.conversion_status === 'IN_NEGOTIATION').length;
  const closingRate = visits.length > 0 ? Math.round((convertedCount / visits.length) * 100) : 0;

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const getConversionLabel = (status: string) => {
    switch (status) {
      case 'CONVERTED':
        return 'Contrat Signé';
      case 'IN_NEGOTIATION':
        return 'En négociation';
      case 'LOST':
        return 'Non retenu';
      default:
        return 'Prospect';
    }
  };

  const getMeetingTypeLabel = (type: string) => {
    switch (type) {
      case 'GOOGLE_MEET':
        return 'Visioconférence';
      case 'CALL':
        return 'Appel Téléphonique';
      default:
        return 'Visite Terrain';
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 md:p-8 overflow-y-auto select-none bg-[#ECEAE5] dark:bg-[#242124]">
      {/* 1. Header Toolbar : Titre & Unique CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5 dark:border-white/5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            Historique des Visites
          </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {visits.length} visites realisés
          </p>
    
        </div>

        {/* 1 Seul CTA en couleur primaire sur toute la page */}
        <div className="flex items-center gap-2">
          {onScheduleMeeting && (
            <button
              onClick={onScheduleMeeting}
              className="flex items-center gap-2 px-4 py-2 bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 text-white rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs border-none"
            >
              <Icons.Plus size={14} />
              <span>Planifier un rendez-vous</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Synthèse Chiffrée Sobre (Zéro mot interdit, Zéro couleur interdite) */}
     
      {/* 3. Filtres Discrets Sans Bordure (pas de barre de recherche locale dupliquée) */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-full border-none">
          {[
            { id: 'ALL', label: 'Toutes les visites' },
            { id: 'CONVERTED', label: 'Contrats signés' },
            { id: 'IN_NEGOTIATION', label: 'En négociation' },
            { id: 'PROSPECT', label: 'Prospects' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border-none ${
                statusFilter === tab.id
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {filteredVisits.length} {filteredVisits.length > 1 ? 'visites enregistrées' : 'visite enregistrée'}
        </span> */}
      </div>

      {/* 4. Tableau Compact des Visites */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5">
        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            Chargement de l’historique des visites...
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            Aucun compte-rendu ne correspond aux critères.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                  <th className="pb-3 font-semibold">Compte</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Format</th>
                  <th className="pb-3 font-semibold">Objet de visite</th>
                  <th className="pb-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisits.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => onOpenReport && onOpenReport(v)}
                    className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 pr-4">
                      <span className="block text-xs font-semibold text-zinc-900 dark:text-white">
                        {v.enterprise_name}
                      </span>
                      
                    </td>
                    <td className="py-3.5 text-xs text-zinc-700 dark:text-zinc-300 pr-4">
                      {formatDate(v.created_at)}
                    </td>
                    <td className="py-3.5 text-xs text-zinc-600 dark:text-zinc-400 pr-4">
                      {getMeetingTypeLabel(v.meeting_type)}
                    </td>
                   
                    <td className="py-3.5 text-xs text-zinc-600 dark:text-zinc-400 pr-4 max-w-xs truncate">
                      {v.visit_purpose_label || 'Échange stratégique'}
                    </td>
                    <td className="py-3.5">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium border-0 bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
                        {getConversionLabel(v.conversion_status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
