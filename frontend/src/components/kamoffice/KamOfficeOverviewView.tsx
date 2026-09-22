"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Icons } from '@/components/shared/Icons';
import UserAvatar from '@/components/kam/UserAvatar';
import Pagination from '@/components/kam/Pagination';
import { useKamOfficeContext } from './KamOfficeContext';
import KamOfficeAssignModal from './modals/KamOfficeAssignModal';
import KamOfficeAccountDetailModal from './modals/KamOfficeAccountDetailModal';

export default function KamOfficeOverviewView() {
  const {
    metrics,
    kamsList,
    accountsList,
    searchQuery,
    setSearchPlaceholder,
    setHeaderTitle,
    selectedAccountToAssign,
    setSelectedAccountToAssign,
    handleConfirmAssignment,
    selectedAccountForDetail,
    setSelectedAccountForDetail,
  } = useKamOfficeContext();

  const [overviewSegmentFilter, setOverviewSegmentFilter] = useState<'ALL' | 'GRAND_COMPTE' | 'PME'>('ALL');
  const [overviewAssignmentFilter, setOverviewAssignmentFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [overviewKamFilter, setOverviewKamFilter] = useState<string>('ALL');
  const [overviewPage, setOverviewPage] = useState(1);
  const overviewPageSize = 10;

  useEffect(() => {
    setHeaderTitle("Portefeuille Stratégique & KPIs");
    setSearchPlaceholder("Filtrer compte, CRM, commune, KAM...");
  }, [setHeaderTitle, setSearchPlaceholder]);

  const filteredOverviewAccounts = useMemo(() => {
    return accountsList.filter((acc) => {
      if (overviewSegmentFilter !== 'ALL' && acc.segment !== overviewSegmentFilter) return false;
      if (overviewAssignmentFilter === 'ASSIGNED' && !acc.assigned_kam) return false;
      if (overviewAssignmentFilter === 'UNASSIGNED' && acc.assigned_kam) return false;
      if (overviewKamFilter !== 'ALL' && acc.assigned_kam?.id.toString() !== overviewKamFilter) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        Boolean(acc.name && acc.name.toLowerCase().includes(q)) ||
        Boolean(acc.crm_id && acc.crm_id.toLowerCase().includes(q)) ||
        Boolean(acc.rccm && acc.rccm.toLowerCase().includes(q)) ||
        Boolean(acc.sector && acc.sector.toLowerCase().includes(q)) ||
        Boolean(acc.city && acc.city.toLowerCase().includes(q)) ||
        Boolean(acc.commune && acc.commune.toLowerCase().includes(q)) ||
        Boolean(acc.contact_name && acc.contact_name.toLowerCase().includes(q)) ||
        Boolean(acc.assigned_kam?.full_name && acc.assigned_kam.full_name.toLowerCase().includes(q))
      );
    });
  }, [accountsList, overviewSegmentFilter, overviewAssignmentFilter, overviewKamFilter, searchQuery]);

  const paginatedOverviewAccounts = useMemo(() => {
    const start = (overviewPage - 1) * overviewPageSize;
    return filteredOverviewAccounts.slice(start, start + overviewPageSize);
  }, [filteredOverviewAccounts, overviewPage, overviewPageSize]);

  const totalOverviewPages = Math.ceil(filteredOverviewAccounts.length / overviewPageSize) || 1;

  return (
    <div className="flex flex-col gap-4">
      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Total Comptes Clés</span>
          <span className="text-xl font-extrabold text-[#242124] dark:text-white">{metrics?.total_accounts || 0}</span>
          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
            {metrics?.assigned_count || 0} affectés à un KAM
          </span>
        </div>

        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Grands Comptes (&gt; 1M$)</span>
          <span className="text-xl font-extrabold text-[#4F6CE8]">{metrics?.grands_comptes_count || 0}</span>
          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
            {metrics?.unassigned_grands_comptes || 0} en attente de KAM
          </span>
        </div>

        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">PME Stratégiques</span>
          <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">{metrics?.pme_count || 0}</span>
          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
            {metrics?.unassigned_pme || 0} en attente de KAM
          </span>
        </div>

        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Taux d&apos;Affectation</span>
          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {metrics?.assignment_rate_percent || 0}%
          </span>
          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
            {metrics?.unassigned_count || 0} comptes non affectés
          </span>
        </div>

        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">CA Sous Gestion</span>
          <span className="text-xl font-extrabold text-[#242124] dark:text-white">
            {((metrics?.total_annual_revenue_usd || 0) / 1_000_000).toFixed(1)}M$
          </span>
          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
            {metrics?.total_converted_count || 0} dossiers signés
          </span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Segment Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Segment :</span>
            <select
              value={overviewSegmentFilter}
              onChange={(e) => {
                setOverviewSegmentFilter(e.target.value as any);
                setOverviewPage(1);
              }}
              className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Tous les segments</option>
              <option value="GRAND_COMPTE">Grands Comptes (&gt; 1M$)</option>
              <option value="PME">PME Stratégiques (100k$ - 1M$)</option>
            </select>
          </div>

          {/* Assignment Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Affectation :</span>
            <select
              value={overviewAssignmentFilter}
              onChange={(e) => {
                setOverviewAssignmentFilter(e.target.value as any);
                setOverviewPage(1);
              }}
              className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="UNASSIGNED">Non affectés (En attente)</option>
              <option value="ASSIGNED">Affectés à un KAM</option>
            </select>
          </div>

          {/* KAM Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">KAM :</span>
            <select
              value={overviewKamFilter}
              onChange={(e) => {
                setOverviewKamFilter(e.target.value);
                setOverviewPage(1);
              }}
              className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Tous les KAMs</option>
              {kamsList.map((k) => (
                <option key={k.id} value={k.id.toString()}>
                  {k.full_name} ({k.kam_specialization === 'GRAND_COMPTE' ? 'GC' : 'PME'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
          {filteredOverviewAccounts.length} comptes au total
        </span>
      </div>

      {/* Accounts Table */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden flex flex-col gap-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[950px]">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                <th className="py-3 px-3.5 min-w-[200px]">Comptes</th>
                <th className="py-3 px-3.5">Segment</th>
                <th className="py-3 px-3.5">CA Annuel</th>
                <th className="py-3 px-3.5">Localisation</th>
                <th className="py-3 px-3.5">Opérateur Actuel</th>
                <th className="py-3 px-3.5 min-w-[150px]">Contact Décideur</th>
                <th className="py-3 px-3.5">KAM Assigné</th>
                <th className="py-3 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {filteredOverviewAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                    Aucun compte ne correspond aux filtres actuels.
                  </td>
                </tr>
              ) : (
                paginatedOverviewAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col">
                        <button
                          onClick={() => setSelectedAccountForDetail(acc)}
                          className="font-semibold text-zinc-900 dark:text-white hover:text-[#4F6CE8] dark:hover:text-[#4F6CE8] text-left transition-colors cursor-pointer flex items-center gap-1.5 group"
                          title="Voir la fiche détaillée du compte"
                        >
                          <span className="group-hover:underline">{acc.name}</span>
                          <Icons.ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-[#4F6CE8] transition-opacity" />
                        </button>
                        <span className="text-[10px] font-mono text-[#6E6C67] dark:text-[#A1A1AA]">
                          {acc.crm_id} • {acc.rccm || 'RCCM n/a'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          acc.segment === 'GRAND_COMPTE'
                            ? 'bg-[#4F6CE8]/10 text-[#4F6CE8]'
                            : 'bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {acc.segment === 'GRAND_COMPTE' ? 'Grand Compte' : 'PME'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-semibold text-zinc-900 dark:text-white">
                      {Number(acc.annual_revenue || 0).toLocaleString()} $
                    </td>

                    <td className="py-3.5 px-3 text-zinc-600 dark:text-[#A1A1AA]">
                      {acc.city} {acc.commune ? `(${acc.commune})` : ''}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">
                          {acc.current_operator || 'Non renseigné'}
                        </span>
                        <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                          {acc.current_connectivity || 'Fibre / Faisceau'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {acc.contact_name || 'Contact non renseigné'}
                        </span>
                        <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                          {acc.contact_phone || 'Tél n/a'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      {acc.assigned_kam ? (
                        <div className="flex items-center gap-2">
                          <UserAvatar src={acc.assigned_kam.avatar} name={acc.assigned_kam.full_name} size="xs" />
                          <span className="font-semibold text-zinc-900 dark:text-white">
                            {acc.assigned_kam.full_name}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/5 dark:bg-white/10 text-zinc-500">
                          Non affecté
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedAccountToAssign(acc)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#363336] hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold text-[#4F6CE8] border border-black/5 dark:border-white/5 transition-all cursor-pointer"
                      >
                        {acc.assigned_kam ? "Réaffecter" : "Affecter KAM"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={overviewPage}
          totalPages={totalOverviewPages}
          onPageChange={setOverviewPage}
          totalItems={filteredOverviewAccounts.length}
          pageSize={overviewPageSize}
          itemName="comptes"
        />
      </div>

      {/* Assign Modal */}
      {selectedAccountToAssign && (
        <KamOfficeAssignModal
          account={selectedAccountToAssign}
          kamsList={kamsList}
          onClose={() => setSelectedAccountToAssign(null)}
          onConfirmAssignment={handleConfirmAssignment}
        />
      )}

      {/* Account Detail Modal */}
      {selectedAccountForDetail && (
        <KamOfficeAccountDetailModal
          account={selectedAccountForDetail}
          onClose={() => setSelectedAccountForDetail(null)}
          onOpenAssignModal={(acc) => setSelectedAccountToAssign(acc)}
        />
      )}
    </div>
  );
}
