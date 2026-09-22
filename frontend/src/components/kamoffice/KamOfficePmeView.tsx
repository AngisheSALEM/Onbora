"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Icons } from '@/components/shared/Icons';
import Pagination from '@/components/kam/Pagination';
import { useKamOfficeContext } from './KamOfficeContext';
import KamOfficeAssignModal from './modals/KamOfficeAssignModal';
import KamOfficeAccountDetailModal from './modals/KamOfficeAccountDetailModal';

export default function KamOfficePmeView() {
  const {
    accountsList,
    kamsList,
    searchQuery,
    setSearchPlaceholder,
    setHeaderTitle,
    citiesList,
    selectedAccountToAssign,
    setSelectedAccountToAssign,
    handleConfirmAssignment,
    selectedAccountForDetail,
    setSelectedAccountForDetail,
  } = useKamOfficeContext();

  const [pmeAssignmentFilter, setPmeAssignmentFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [pmeKamFilter, setPmeKamFilter] = useState<string>('ALL');
  const [pmeCityFilter, setPmeCityFilter] = useState<string>('ALL');
  const [pmePage, setPmePage] = useState(1);
  const pmePageSize = 10;

  useEffect(() => {
    setHeaderTitle("Répertoire PME Stratégiques (100k$ - 1M$)");
    setSearchPlaceholder("Rechercher PME, CRM, secteur...");
  }, [setHeaderTitle, setSearchPlaceholder]);

  const filteredPmeAccounts = useMemo(() => {
    return accountsList
      .filter((acc) => acc.segment === 'PME')
      .filter((acc) => {
        if (pmeAssignmentFilter === 'ASSIGNED' && !acc.assigned_kam) return false;
        if (pmeAssignmentFilter === 'UNASSIGNED' && acc.assigned_kam) return false;
        if (pmeKamFilter !== 'ALL' && acc.assigned_kam?.id.toString() !== pmeKamFilter) return false;
        if (pmeCityFilter !== 'ALL' && acc.city !== pmeCityFilter) return false;

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
  }, [accountsList, pmeAssignmentFilter, pmeKamFilter, pmeCityFilter, searchQuery]);

  const paginatedPme = useMemo(() => {
    const start = (pmePage - 1) * pmePageSize;
    return filteredPmeAccounts.slice(start, start + pmePageSize);
  }, [filteredPmeAccounts, pmePage, pmePageSize]);

  const totalPmePages = Math.ceil(filteredPmeAccounts.length / pmePageSize) || 1;

  const pmeAll = useMemo(() => accountsList.filter((a) => a.segment === 'PME'), [accountsList]);
  const pmeVolumeUsd = useMemo(
    () => pmeAll.reduce((sum, a) => sum + Number(a.annual_revenue || 0), 0),
    [pmeAll]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* 4 Mini KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Total PME Stratégiques</span>
          <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
            {pmeAll.length}
          </span>
          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Chiffre d&apos;affaires entre 100k$ et 1M$</span>
        </div>

        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">PME Affectées</span>
          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {pmeAll.filter((a) => a.assigned_kam).length}
          </span>
          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Suivies par un KAM</span>
        </div>

        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">PME Non Affectées</span>
          <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
            {pmeAll.filter((a) => !a.assigned_kam).length}
          </span>
          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Vivier disponible</span>
        </div>

        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Volume d&apos;Affaires PME</span>
          <span className="text-xl font-extrabold text-[#242124] dark:text-white">
            {(pmeVolumeUsd / 1_000_000).toFixed(1)}M$
          </span>
          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Pipeline PME annuel</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Affectation :</span>
            <select
              value={pmeAssignmentFilter}
              onChange={(e) => {
                setPmeAssignmentFilter(e.target.value as any);
                setPmePage(1);
              }}
              className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Toutes les PME</option>
              <option value="UNASSIGNED">Non affectées (En attente)</option>
              <option value="ASSIGNED">Affectées à un KAM</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">KAM :</span>
            <select
              value={pmeKamFilter}
              onChange={(e) => {
                setPmeKamFilter(e.target.value);
                setPmePage(1);
              }}
              className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Tous les KAMs</option>
              {kamsList.map((k) => (
                <option key={k.id} value={k.id.toString()}>
                  {k.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Ville :</span>
            <select
              value={pmeCityFilter}
              onChange={(e) => {
                setPmeCityFilter(e.target.value);
                setPmePage(1);
              }}
              className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Toutes les villes</option>
              {citiesList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
          {filteredPmeAccounts.length} PME Stratégiques
        </span>
      </div>

      {/* Table */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden flex flex-col gap-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                <th className="py-3 px-3.5 min-w-[200px]">PME Stratégique</th>
                <th className="py-3 px-3.5">CA Annuel</th>
                <th className="py-3 px-3.5">Localisation</th>
                <th className="py-3 px-3.5">Statut Conversion</th>
                <th className="py-3 px-3.5 min-w-[150px]">Contact Décideur</th>
                <th className="py-3 px-3.5">KAM Référent</th>
                <th className="py-3 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {filteredPmeAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                    Aucune PME ne correspond aux filtres.
                  </td>
                </tr>
              ) : (
                paginatedPme.map((acc) => (
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
                          {acc.crm_id} • {acc.sector}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-semibold text-zinc-900 dark:text-white">
                      {Number(acc.annual_revenue || 0).toLocaleString()} $
                    </td>

                    <td className="py-3.5 px-3 text-zinc-600 dark:text-[#A1A1AA]">
                      {acc.city} {acc.commune ? `(${acc.commune})` : ''}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
                        {acc.conversion_status_display || acc.conversion_status || 'Prospect'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {acc.contact_name}
                        </span>
                        <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                          {acc.contact_phone}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      {acc.assigned_kam ? (
                        <span className="font-semibold text-zinc-900 dark:text-white">
                          {acc.assigned_kam.full_name}
                        </span>
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
                        {acc.assigned_kam ? "Réaffecter" : "Affecter un KAM"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={pmePage}
          totalPages={totalPmePages}
          onPageChange={setPmePage}
          totalItems={filteredPmeAccounts.length}
          pageSize={pmePageSize}
          itemName="PME Stratégiques"
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
