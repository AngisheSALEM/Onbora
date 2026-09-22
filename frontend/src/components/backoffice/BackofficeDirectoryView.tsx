"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from '@/components/shared/Icons';
import BackofficePagination from './BackofficePagination';
import BackofficeAccountDetailModal from './BackofficeAccountDetailModal';
import { useBackofficeContext } from './BackofficeContext';

export default function BackofficeDirectoryView() {
  const {
    enterprises,
    salespersons,
    searchQuery,
    setSearchPlaceholder,
    setHeaderTitle,
    selectedAccountForDetail,
    setSelectedAccountForDetail,
    handleAssignEnterpriseSalesperson,
  } = useBackofficeContext();

  const [directoryVisitFilter, setDirectoryVisitFilter] = useState<'ALL' | 'VISITED' | 'UNVISITED'>('ALL');
  const [directoryStatusFilter, setDirectoryStatusFilter] = useState<'ALL' | 'CONVERTED' | 'PROSPECT'>('ALL');
  const [directoryPage, setDirectoryPage] = useState(1);
  const [directoryPageSize, setDirectoryPageSize] = useState(15);

  useEffect(() => {
    setHeaderTitle("Annuaire Comptes TPE");
    setSearchPlaceholder("Rechercher dans l'annuaire (nom, RCCM, commune, contact)...");
  }, [setHeaderTitle, setSearchPlaceholder]);

  const filteredDirectoryAccounts = useMemo(() => {
    return enterprises.filter((account) => {
      const isConverted = Boolean(account.is_converted || account.conversion_status === 'CONVERTED');
      const isVisited = Boolean(account.is_visited);

      if (directoryVisitFilter === 'VISITED' && !isVisited) return false;
      if (directoryVisitFilter === 'UNVISITED' && isVisited) return false;

      if (directoryStatusFilter === 'CONVERTED' && !isConverted) return false;
      if (directoryStatusFilter === 'PROSPECT' && isConverted) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          account.name?.toLowerCase().includes(q) ||
          account.crm_id?.toLowerCase().includes(q) ||
          account.commune?.toLowerCase().includes(q) ||
          account.city?.toLowerCase().includes(q) ||
          account.rccm?.toLowerCase().includes(q) ||
          account.contact_name?.toLowerCase().includes(q) ||
          account.contact_phone?.toLowerCase().includes(q) ||
          account.current_operator?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enterprises, directoryVisitFilter, directoryStatusFilter, searchQuery]);

  const paginatedDirectoryAccounts = useMemo(() => {
    const start = (directoryPage - 1) * directoryPageSize;
    return filteredDirectoryAccounts.slice(start, start + directoryPageSize);
  }, [filteredDirectoryAccounts, directoryPage, directoryPageSize]);

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky Filter Bar */}
      <div className="sticky top-0 z-20 backdrop-blur-2xl bg-white/85 dark:bg-[#1E1C1E]/85 p-3 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 flex-wrap shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA] mr-1">
            Filtre Annuaire :
          </span>
          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
            {[
              { id: 'ALL', label: 'Toutes' },
              { id: 'VISITED', label: 'Déjà visitées' },
              { id: 'UNVISITED', label: 'À visiter' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setDirectoryVisitFilter(f.id as any);
                  setDirectoryPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  directoryVisitFilter === f.id
                    ? 'bg-[#4F6CE8] text-white shadow-xs'
                    : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
            {[
              { id: 'ALL', label: 'Tous statuts' },
              { id: 'CONVERTED', label: 'Convertis' },
              { id: 'PROSPECT', label: 'En prospection' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setDirectoryStatusFilter(f.id as any);
                  setDirectoryPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  directoryStatusFilter === f.id
                    ? 'bg-[#4F6CE8] text-white shadow-xs'
                    : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <span className="text-xs font-semibold text-[#4F6CE8] bg-[#4F6CE8]/10 px-2.5 py-1 rounded-xl">
          {filteredDirectoryAccounts.length} entreprise(s)
        </span>
      </div>

      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-[#242124] dark:text-white">Annuaire Exhaustif de très petites entreprises</h3>
          <p className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
            Coordonnées, RCCM, fiches contacts et offres recommandées pour le terrain.
          </p>
        </div>
        <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
          {filteredDirectoryAccounts.length} entreprises répertoriées
        </span>
      </div>

      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden flex flex-col gap-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                <th className="py-3 px-3.5 min-w-[180px]">Entreprise</th>
                <th className="py-3 px-3.5">RCCM & Commune</th>
                <th className="py-3 px-3.5">Contact Principal</th>
                <th className="py-3 px-3.5">Commercial Affecté</th>
                <th className="py-3 px-3.5">Opérateur Actuel</th>
                <th className="py-3 px-3.5">Solution Recommandée</th>
                <th className="py-3 px-3.5 text-right">Fiche</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {paginatedDirectoryAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                    Aucune entreprise ne correspond aux filtres actuels.
                  </td>
                </tr>
              ) : (
                paginatedDirectoryAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-semibold text-[#242124] dark:text-white block">{account.name}</span>
                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] font-mono">{account.crm_id}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-[10px] text-[#242124] dark:text-white">{account.rccm || 'RCCM en cours'}</span>
                        <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{account.commune || account.city}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#242124] dark:text-white">{account.contact_name || 'Direction'}</span>
                        <span className="text-[10px] text-[#4F6CE8] font-semibold">{account.contact_phone || 'Non renseigné'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {account.assigned_salesperson_name ? (
                        <span className="font-semibold text-[#242124] dark:text-white text-xs">
                          {account.assigned_salesperson_name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400">Non affecté</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                        {account.current_operator || 'Opérateur inconnu'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-[#4F6CE8]/10 text-[#4F6CE8] font-semibold text-[10px]">
                        {account.recommended_solution || 'Pack Fibre TPE'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedAccountForDetail(account)}
                        className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#4F6CE8] transition-colors cursor-pointer"
                        title="Consulter la fiche"
                      >
                        <Icons.ExternalLink size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <BackofficePagination
          currentPage={directoryPage}
          totalPages={Math.ceil(filteredDirectoryAccounts.length / directoryPageSize) || 1}
          totalItems={filteredDirectoryAccounts.length}
          pageSize={directoryPageSize}
          onPageChange={setDirectoryPage}
          onPageSizeChange={(sz) => {
            setDirectoryPageSize(sz);
            setDirectoryPage(1);
          }}
          itemName="entreprises"
        />
      </div>

      {/* Account Detail Modal */}
      {selectedAccountForDetail && (
        <BackofficeAccountDetailModal
          account={selectedAccountForDetail}
          onClose={() => setSelectedAccountForDetail(null)}
        />
      )}
    </div>
  );
}
