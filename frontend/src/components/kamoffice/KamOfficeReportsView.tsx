"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Icons } from '@/components/shared/Icons';
import Pagination from '@/components/kam/Pagination';
import { useKamOfficeContext } from './KamOfficeContext';
import KamOfficeReportDetailModal from './modals/KamOfficeReportDetailModal';

export default function KamOfficeReportsView() {
  const {
    kamReports,
    loadingKamReports,
    loadKamReports,
    setHeaderTitle,
    setSearchPlaceholder,
    selectedReportDetail,
    setSelectedReportDetail,
    setNotification,
  } = useKamOfficeContext();

  const [reportsMeetingTypeFilter, setReportsMeetingTypeFilter] = useState<'ALL' | 'PHYSICAL' | 'GOOGLE_MEET' | 'CALL'>('ALL');
  const [reportsStatusFilter, setReportsStatusFilter] = useState<'ALL' | 'CONVERTED' | 'IN_NEGOTIATION' | 'PROSPECT' | 'LOST'>('ALL');
  const [reportsSearchQuery, setReportsSearchQuery] = useState('');
  const [reportsPage, setReportsPage] = useState(1);
  const reportsPageSize = 10;

  useEffect(() => {
    setHeaderTitle("Rapports de Visite & Comptes-Rendus KAM");
    setSearchPlaceholder("Rechercher rapport, compte, contact...");
  }, [setHeaderTitle, setSearchPlaceholder]);

  const filteredKamReports = useMemo(() => {
    return kamReports.filter((report) => {
      if (reportsMeetingTypeFilter !== 'ALL' && report.meeting_type !== reportsMeetingTypeFilter) {
        return false;
      }
      if (reportsStatusFilter !== 'ALL' && report.conversion_status !== reportsStatusFilter) {
        return false;
      }
      if (reportsSearchQuery.trim()) {
        const q = reportsSearchQuery.toLowerCase();
        const matchesName = report.enterprise_name?.toLowerCase().includes(q);
        const matchesCrm = report.crm_id?.toLowerCase().includes(q);
        const matchesContact = report.contact_name?.toLowerCase().includes(q);
        const matchesSummary = report.executive_summary?.toLowerCase().includes(q);
        if (!matchesName && !matchesCrm && !matchesContact && !matchesSummary) {
          return false;
        }
      }
      return true;
    });
  }, [kamReports, reportsMeetingTypeFilter, reportsStatusFilter, reportsSearchQuery]);

  const totalReportsPages = Math.max(1, Math.ceil(filteredKamReports.length / reportsPageSize));

  const paginatedKamReports = useMemo(() => {
    const start = (reportsPage - 1) * reportsPageSize;
    return filteredKamReports.slice(start, start + reportsPageSize);
  }, [filteredKamReports, reportsPage, reportsPageSize]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header Toolbar avec Filtres & Recherche */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Filtre Type de Rendez-vous */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#363336] px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5">
            <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Type :</span>
            <select
              value={reportsMeetingTypeFilter}
              onChange={(e) => {
                setReportsMeetingTypeFilter(e.target.value as any);
                setReportsPage(1);
              }}
              className="bg-transparent text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Tous les formats</option>
              <option value="PHYSICAL">Visite Physique</option>
              <option value="GOOGLE_MEET">Google Meet</option>
              <option value="CALL">Appel Téléphonique</option>
            </select>
          </div>

          {/* Filtre Statut Conversion */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#363336] px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5">
            <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Statut :</span>
            <select
              value={reportsStatusFilter}
              onChange={(e) => {
                setReportsStatusFilter(e.target.value as any);
                setReportsPage(1);
              }}
              className="bg-transparent text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="CONVERTED">Converti / Gagné</option>
              <option value="IN_NEGOTIATION">En Négociation</option>
              <option value="PROSPECT">Prospect</option>
              <option value="LOST">Perdu</option>
            </select>
          </div>

          {/* Champ de recherche dédié aux rapports */}
          <div className="flex items-center gap-2 bg-white dark:bg-[#363336] px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5">
            <Icons.Search size={13} className="text-[#6E6C67] dark:text-[#A1A1AA]" />
            <input
              type="text"
              value={reportsSearchQuery}
              onChange={(e) => {
                setReportsSearchQuery(e.target.value);
                setReportsPage(1);
              }}
              placeholder="Compte, interlocuteur, mot-clé..."
              className="bg-transparent text-xs font-medium text-[#242124] dark:text-white placeholder-[#6E6C67] dark:placeholder-[#A1A1AA] outline-none w-44"
            />
            {reportsSearchQuery && (
              <button
                onClick={() => setReportsSearchQuery('')}
                className="text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer"
              >
                <Icons.X size={11} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadKamReports()}
            disabled={loadingKamReports}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#363336] hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-200 border border-black/5 dark:border-white/5 transition-all cursor-pointer shadow-2xs"
            title="Actualiser les rapports"
          >
            <Icons.RefreshCw size={13} className={loadingKamReports ? 'animate-spin text-[#4F6CE8]' : ''} />
            <span>Actualiser</span>
          </button>
          <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
            {filteredKamReports.length} rapport{filteredKamReports.length > 1 ? 's' : ''} enregistré{filteredKamReports.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Liste des Rapports */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[950px]">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                <th className="py-3 px-3.5 min-w-[200px]">Compte Entreprise</th>
                <th className="py-3 px-3.5">Format</th>
                <th className="py-3 px-3.5 min-w-[150px]">Contact Décideur</th>
                <th className="py-3 px-3.5 min-w-[280px]">Synthèse & BANT</th>
                <th className="py-3 px-3.5">Statut Conversion</th>
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5 text-right">Détail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {loadingKamReports ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
                      <span>Chargement des rapports de visite...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredKamReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                    Aucun rapport de visite ne correspond à vos filtres.
                  </td>
                </tr>
              ) : (
                paginatedKamReports.map((report) => (
                  <tr key={report.id} className="hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                    <td className="py-2.5 px-3 min-w-[200px]">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900 dark:text-white">
                          {report.enterprise_name}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 font-medium">
                          {report.crm_id} • {report.enterprise_sector || 'Secteur Entreprise'}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
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
                    </td>

                    <td className="py-2.5 px-3 min-w-[150px]">
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {report.contact_name}
                        </span>
                        <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                          {report.contact_role || 'Décideur'}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 min-w-[280px] max-w-lg">
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-2 leading-relaxed" title={report.executive_summary}>
                        {report.executive_summary || 'Synthèse non disponible'}
                      </p>
                      {report.bant_scores?.total !== undefined && (
                        <span className="text-[11px] font-mono text-[#4F6CE8] font-bold block mt-0.5">
                          Score BANT : {report.bant_scores.total}/100
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        report.conversion_status === 'CONVERTED'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : report.conversion_status === 'IN_NEGOTIATION'
                          ? 'bg-[#4F6CE8]/15 text-[#4F6CE8]'
                          : report.conversion_status === 'LOST'
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                          : 'bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300'
                      }`}>
                        {report.conversion_status === 'CONVERTED' ? 'Converti' :
                         report.conversion_status === 'IN_NEGOTIATION' ? 'En Négociation' :
                         report.conversion_status === 'LOST' ? 'Perdu' : 'Prospect'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-[11px] text-zinc-600 dark:text-[#A1A1AA]">
                      {new Date(report.created_at).toLocaleDateString('fr-FR')}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedReportDetail(report)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#363336] hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold text-[#4F6CE8] border border-black/5 dark:border-white/5 transition-all cursor-pointer shadow-2xs"
                      >
                        Consulter
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={reportsPage}
          totalPages={totalReportsPages}
          onPageChange={setReportsPage}
          totalItems={filteredKamReports.length}
          pageSize={reportsPageSize}
          itemName="rapports de visite"
        />
      </div>

      {/* Report Detail Modal */}
      {selectedReportDetail && (
        <KamOfficeReportDetailModal
          report={selectedReportDetail}
          onClose={() => setSelectedReportDetail(null)}
          onCopyDraftSuccess={() => {
            setNotification({
              type: 'success',
              message: "Projet d'e-mail copié dans le presse-papier !",
            });
            setTimeout(() => setNotification(null), 3000);
          }}
        />
      )}
    </div>
  );
}
