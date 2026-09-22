"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Icons } from '@/components/shared/Icons';
import BackofficePagination from './BackofficePagination';
import EnterpriseActionsModal from './EnterpriseActionsModal';
import { EnterpriseItem } from './backofficeTypes';
import { useBackofficeContext } from './BackofficeContext';
import BackofficeAccountDetailModal from './BackofficeAccountDetailModal';
import BackofficeReportInspectModal from './BackofficeReportInspectModal';

export default function BackofficeSohoManagedView() {
  const {
    enterprises,
    plaques,
    salespersons,
    kpis,
    searchQuery,
    setSearchPlaceholder,
    setHeaderTitle,
    getEnterpriseVisitInfo,
    selectedAccountForDetail,
    setSelectedAccountForDetail,
    selectedReportToInspect,
    setSelectedReportToInspect,
    recentReportsFeed,
    recentFormSubmissions,
    handleAssignEnterpriseSalesperson,
  } = useBackofficeContext();

  const [sohoStatusFilter, setSohoStatusFilter] = useState<string>('ALL');
  const [sohoPlaqueFilter, setSohoPlaqueFilter] = useState<string>('ALL');
  const [sohoPage, setSohoPage] = useState(1);
  const [sohoPageSize, setSohoPageSize] = useState(10);
  const [selectedEnterpriseForActions, setSelectedEnterpriseForActions] = useState<EnterpriseItem | null>(null);

  useEffect(() => {
    setHeaderTitle("Portefeuille Comptes TPE");
    setSearchPlaceholder("Filtrer compte TPE, CRM, commune...");
  }, [setHeaderTitle, setSearchPlaceholder]);

  const filteredAccounts = useMemo(() => {
    return enterprises.filter((account) => {
      const isConverted = Boolean(account.is_converted || account.conversion_status === 'CONVERTED');
      const isVisited = Boolean(account.is_visited);
      const isAssigned = Boolean(account.assigned_salesperson);

      if (sohoStatusFilter === 'ASSIGNED_UNVISITED' && (!isAssigned || isVisited)) return false;
      if (sohoStatusFilter === 'ASSIGNED_UNCONVERTED' && (!isAssigned || isConverted)) return false;
      if (sohoStatusFilter === 'VISITED' && !isVisited) return false;
      if (sohoStatusFilter === 'UNVISITED' && isVisited) return false;
      if (sohoStatusFilter === 'CONVERTED' && !isConverted) return false;
      if (sohoStatusFilter === 'UNASSIGNED' && isAssigned) return false;

      if (sohoPlaqueFilter !== 'ALL' && account.plaque_code !== sohoPlaqueFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          account.name?.toLowerCase().includes(q) ||
          account.crm_id?.toLowerCase().includes(q) ||
          account.commune?.toLowerCase().includes(q) ||
          account.sector?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enterprises, sohoStatusFilter, sohoPlaqueFilter, searchQuery]);

  const paginatedAccounts = useMemo(() => {
    const start = (sohoPage - 1) * sohoPageSize;
    return filteredAccounts.slice(start, start + sohoPageSize);
  }, [filteredAccounts, sohoPage, sohoPageSize]);

  return (
    <div className="flex flex-col gap-4">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">
            Total Comptes TPE
          </span>
          <span className="text-xl font-extrabold text-[#242124] dark:text-white">{kpis.total}</span>
          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{kpis.assigned} affectés à un commercial</span>
        </div>
        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">
            Signatures & Convertis
          </span>
          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{kpis.converted}</span>
          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
            Taux de transfo : {kpis.total > 0 ? Math.round((kpis.converted / kpis.total) * 100) : 0}%
          </span>
        </div>
        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">
            Visités sur le Terrain
          </span>
          <span className="text-xl font-extrabold text-[#4F6CE8]">{kpis.visited}</span>
          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{kpis.total - kpis.visited} restants à prospecter</span>
        </div>
        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">
            Plaques Déployées
          </span>
          <span className="text-xl font-extrabold text-[#242124] dark:text-white">{plaques.length}</span>
          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{salespersons.length} commerciaux actifs</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Statut :</span>
            <select
              value={sohoStatusFilter}
              onChange={(e) => {
                setSohoStatusFilter(e.target.value);
                setSohoPage(1);
              }}
              className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="ASSIGNED_UNVISITED">Assignés non visités (urgent)</option>
              <option value="ASSIGNED_UNCONVERTED">Assignés non convertis (en cours)</option>
              <option value="VISITED">Visités sur le terrain</option>
              <option value="UNVISITED">Pas encore visités</option>
              <option value="CONVERTED">Signés / Convertis</option>
              <option value="UNASSIGNED">Non affectés</option>
            </select>
          </div>

          {/* Plaque Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Plaque :</span>
            <select
              value={sohoPlaqueFilter}
              onChange={(e) => {
                setSohoPlaqueFilter(e.target.value);
                setSohoPage(1);
              }}
              className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Toutes les plaques</option>
              {plaques.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
          {filteredAccounts.length} compte(s) TPE
        </span>
      </div>

      {/* Accounts Table */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden flex flex-col gap-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                <th className="py-3 px-3.5 min-w-[180px]">Entreprise TPE</th>
                <th className="py-3 px-3.5">Secteur & Ville</th>
                <th className="py-3 px-3.5">Plaque</th>
                <th className="py-3 px-3.5">Commercial Assigné</th>
                <th className="py-3 px-3.5">Statut Visite</th>
                <th className="py-3 px-3.5">Statut Client</th>
                <th className="py-3 px-3.5 text-right">Actions & Suivi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {paginatedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                    Aucun compte TPE ne correspond aux filtres actuels.
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((account) => {
                  const isConverted = account.is_converted || account.conversion_status === 'CONVERTED';
                  const vInfo = getEnterpriseVisitInfo(account);

                  return (
                    <tr key={account.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#242124] dark:text-white">{account.name}</span>
                          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] font-mono">
                            {account.crm_id}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="text-[#242124] dark:text-white font-medium">
                            {account.sector || 'TPE / Commerce'}
                          </span>
                          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                            {account.commune || account.city}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {account.plaque_code ? (
                          <span className="px-2.5 py-1 rounded-lg bg-[#4F6CE8]/10 text-[#4F6CE8] font-semibold text-[10px]">
                            {account.plaque_code}
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">Non rattachée</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {account.assigned_salesperson_name ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-[#4F6CE8] text-white flex items-center justify-center text-[9px] font-semibold">
                              {account.assigned_salesperson_name[0]}
                            </div>
                            <span className="font-semibold text-[#242124] dark:text-white">
                              {account.assigned_salesperson_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-[#4F6CE8]">Non affecté</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {vInfo.count > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1 w-fit">
                              <Icons.CheckCircle size={10} /> {vInfo.label}
                            </span>
                            {vInfo.lastReport && (
                              <button
                                onClick={() => setSelectedReportToInspect(vInfo.lastReport)}
                                className="text-[9px] font-bold text-[#4F6CE8] hover:underline text-left cursor-pointer"
                              >
                                Voir dernier CR
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold w-fit">
                            Non visité
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isConverted ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                            Converti
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#4F6CE8]/10 text-[#4F6CE8] font-semibold text-[10px]">
                            En prospection
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setSelectedEnterpriseForActions(account)}
                            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#4F6CE8] transition-colors cursor-pointer"
                            title="Consulter actions, notes et comptes-rendus"
                          >
                            <Icons.FileText size={13} />
                          </button>
                          <button
                            onClick={() => setSelectedAccountForDetail(account)}
                            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white transition-colors cursor-pointer"
                            title="Voir fiche complète"
                          >
                            <Icons.ExternalLink size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <BackofficePagination
          currentPage={sohoPage}
          totalPages={Math.ceil(filteredAccounts.length / sohoPageSize) || 1}
          totalItems={filteredAccounts.length}
          pageSize={sohoPageSize}
          onPageChange={setSohoPage}
          onPageSizeChange={(sz) => {
            setSohoPageSize(sz);
            setSohoPage(1);
          }}
          itemName="comptes TPE"
        />
      </div>

      {/* Enterprise Actions Modal */}
      {selectedEnterpriseForActions && (
        <EnterpriseActionsModal
          enterprise={selectedEnterpriseForActions}
          reports={recentReportsFeed}
          submissions={recentFormSubmissions}
          onClose={() => setSelectedEnterpriseForActions(null)}
          onOpenReportDetail={(rep) => setSelectedReportToInspect(rep)}
        />
      )}

      {/* Account Detail Modal */}
      <BackofficeAccountDetailModal
        account={selectedAccountForDetail}
        onClose={() => setSelectedAccountForDetail(null)}
      />

      {/* Report Inspection Modal */}
      <BackofficeReportInspectModal
        report={selectedReportToInspect}
        onClose={() => setSelectedReportToInspect(null)}
      />
    </div>
  );
}
