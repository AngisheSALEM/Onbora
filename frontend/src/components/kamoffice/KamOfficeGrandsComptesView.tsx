"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Icons } from '@/components/shared/Icons';
import Pagination from '@/components/kam/Pagination';
import { useKamOfficeContext } from './KamOfficeContext';
import KamOfficeAssignModal from './modals/KamOfficeAssignModal';
import KamOfficeAccountDetailModal from './modals/KamOfficeAccountDetailModal';

export default function KamOfficeGrandsComptesView() {
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

  const [gcAssignmentFilter, setGcAssignmentFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [gcKamFilter, setGcKamFilter] = useState<string>('ALL');
  const [gcCityFilter, setGcCityFilter] = useState<string>('ALL');
  const [gcPage, setGcPage] = useState(1);
  const gcPageSize = 10;

  useEffect(() => {
    setHeaderTitle("Répertoire Grands Comptes (> 1M$)");
    setSearchPlaceholder("Rechercher Grand Compte, CRM, secteur...");
  }, [setHeaderTitle, setSearchPlaceholder]);

  const filteredGrandsComptesAccounts = useMemo(() => {
    return accountsList
      .filter((acc) => acc.segment === 'GRAND_COMPTE')
      .filter((acc) => {
        if (gcAssignmentFilter === 'ASSIGNED' && !acc.assigned_kam) return false;
        if (gcAssignmentFilter === 'UNASSIGNED' && acc.assigned_kam) return false;
        if (gcKamFilter !== 'ALL' && acc.assigned_kam?.id.toString() !== gcKamFilter) return false;
        if (gcCityFilter !== 'ALL' && acc.city !== gcCityFilter) return false;

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
  }, [accountsList, gcAssignmentFilter, gcKamFilter, gcCityFilter, searchQuery]);

  const paginatedGrandsComptes = useMemo(() => {
    const start = (gcPage - 1) * gcPageSize;
    return filteredGrandsComptesAccounts.slice(start, start + gcPageSize);
  }, [filteredGrandsComptesAccounts, gcPage, gcPageSize]);

  const totalGcPages = Math.ceil(filteredGrandsComptesAccounts.length / gcPageSize) || 1;

  const grandsComptesAll = useMemo(() => accountsList.filter((a) => a.segment === 'GRAND_COMPTE'), [accountsList]);
  const gcVolumeUsd = useMemo(
    () => grandsComptesAll.reduce((sum, a) => sum + Number(a.annual_revenue || 0), 0),
    [grandsComptesAll]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* 4 Mini KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Total Grands Comptes</span>
          <span className="text-xl font-extrabold text-[#4F6CE8]">
            {grandsComptesAll.length}
          </span>
          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Chiffre d&apos;affaires supérieur à 1M$</span>
        </div>

        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">GC Affectés</span>
          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {grandsComptesAll.filter((a) => a.assigned_kam).length}
          </span>
          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Pris en charge par l&apos;équipe</span>
        </div>

        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">GC Non Affectés</span>
          <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
            {grandsComptesAll.filter((a) => !a.assigned_kam).length}
          </span>
          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">À attribuer en priorité</span>
        </div>

        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Volume d&apos;Affaires GC</span>
          <span className="text-xl font-extrabold text-[#242124] dark:text-white">
            {(gcVolumeUsd / 1_000_000).toFixed(1)}M$
          </span>
          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Pipeline annuel global</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Affectation :</span>
            <select
              value={gcAssignmentFilter}
              onChange={(e) => {
                setGcAssignmentFilter(e.target.value as any);
                setGcPage(1);
              }}
              className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Tous les comptes GC</option>
              <option value="UNASSIGNED">Non affectés (En attente)</option>
              <option value="ASSIGNED">Affectés à un KAM</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">KAM :</span>
            <select
              value={gcKamFilter}
              onChange={(e) => {
                setGcKamFilter(e.target.value);
                setGcPage(1);
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
              value={gcCityFilter}
              onChange={(e) => {
                setGcCityFilter(e.target.value);
                setGcPage(1);
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
          {filteredGrandsComptesAccounts.length} Grands Comptes
        </span>
      </div>

      {/* Table */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden flex flex-col gap-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                <th className="py-3 px-3.5 min-w-[200px]">Grand Compte</th>
                <th className="py-3 px-3.5">CA Annuel</th>
                <th className="py-3 px-3.5">Localisation</th>
                <th className="py-3 px-3.5">Statut Conversion</th>
                <th className="py-3 px-3.5 min-w-[150px]">Contact Décideur</th>
                <th className="py-3 px-3.5">KAM Référent</th>
                <th className="py-3 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {filteredGrandsComptesAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                    Aucun Grand Compte ne correspond aux filtres.
                  </td>
                </tr>
              ) : (
                paginatedGrandsComptes.map((acc) => (
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
                        <span className="font-semibold text-[#4F6CE8]">
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
                        {acc.assigned_kam ? "Changer KAM" : "Affecter KAM"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={gcPage}
          totalPages={totalGcPages}
          onPageChange={setGcPage}
          totalItems={filteredGrandsComptesAccounts.length}
          pageSize={gcPageSize}
          itemName="grands comptes"
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
