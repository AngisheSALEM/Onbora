"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Icons } from '@/components/shared/Icons';
import UserAvatar from '@/components/kam/UserAvatar';
import Pagination from '@/components/kam/Pagination';
import { useKamOfficeContext } from './KamOfficeContext';
import KamOfficeCreateKamModal from './modals/KamOfficeCreateKamModal';
import KamOfficeAccountDetailModal from './modals/KamOfficeAccountDetailModal';

export default function KamOfficeKamsView() {
  const {
    kamsList,
    accountsList,
    searchQuery,
    setSearchPlaceholder,
    setHeaderTitle,
    selectedKamDetail,
    setSelectedKamDetail,
    handleUpdateKam,
    handleUnassignAccount,
    isCreateKamModalOpen,
    setIsCreateKamModalOpen,
    handleCreateKamSubmit,
    selectedAccountForDetail,
    setSelectedAccountForDetail,
  } = useKamOfficeContext();

  const [kamSpecializationFilter, setKamSpecializationFilter] = useState<'ALL' | 'GRAND_COMPTE' | 'PME'>('ALL');
  const [kamAvailabilityFilter, setKamAvailabilityFilter] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE'>('ALL');
  const [kamsPage, setKamsPage] = useState(1);
  const kamsPageSize = 8;
  const [selectedKamAccountsPage, setSelectedKamAccountsPage] = useState(1);
  const selectedKamAccountsPageSize = 10;

  useEffect(() => {
    if (selectedKamDetail) {
      setHeaderTitle(`Fiche KAM — ${selectedKamDetail.full_name}`);
    } else {
      setHeaderTitle("Équipe Key Account Managers & Pôles");
    }
    setSearchPlaceholder("Rechercher KAM, ville...");
  }, [selectedKamDetail, setHeaderTitle, setSearchPlaceholder]);

  // Accounts of the Selected KAM Detail
  const selectedKamAccounts = useMemo(() => {
    if (!selectedKamDetail) return [];
    return accountsList.filter((acc) => acc.assigned_kam?.id === selectedKamDetail.id);
  }, [accountsList, selectedKamDetail]);

  const paginatedSelectedKamAccounts = useMemo(() => {
    const start = (selectedKamAccountsPage - 1) * selectedKamAccountsPageSize;
    return selectedKamAccounts.slice(start, start + selectedKamAccountsPageSize);
  }, [selectedKamAccounts, selectedKamAccountsPage, selectedKamAccountsPageSize]);

  const totalSelectedKamAccountsPages = Math.ceil(selectedKamAccounts.length / selectedKamAccountsPageSize) || 1;

  // Filtered KAMs List
  const filteredKamsList = useMemo(() => {
    return kamsList.filter((k) => {
      if (kamSpecializationFilter !== 'ALL' && k.kam_specialization !== kamSpecializationFilter) return false;
      if (kamAvailabilityFilter === 'AVAILABLE' && !k.is_available) return false;
      if (kamAvailabilityFilter === 'UNAVAILABLE' && k.is_available) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        Boolean(k.full_name && k.full_name.toLowerCase().includes(q)) ||
        Boolean(k.username && k.username.toLowerCase().includes(q)) ||
        Boolean(k.location && k.location.toLowerCase().includes(q)) ||
        Boolean(k.email && k.email.toLowerCase().includes(q))
      );
    });
  }, [kamsList, kamSpecializationFilter, kamAvailabilityFilter, searchQuery]);

  const paginatedKams = useMemo(() => {
    const start = (kamsPage - 1) * kamsPageSize;
    return filteredKamsList.slice(start, start + kamsPageSize);
  }, [filteredKamsList, kamsPage, kamsPageSize]);

  const totalKamsPages = Math.ceil(filteredKamsList.length / kamsPageSize) || 1;

  return (
    <div className="flex flex-col gap-4">
      {selectedKamDetail ? (
        /* --- FICHE DÉTAILLÉE DU KAM SÉLECTIONNÉ --- */
        <div className="flex flex-col gap-4">
          {/* Header avec Bouton Retour */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedKamDetail(null)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F6F5F2] dark:bg-[#2D2A2D] hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-200 border border-black/5 dark:border-white/5 transition-all cursor-pointer"
            >
              <Icons.ArrowLeft size={14} />
              <span>Retour à l&apos;équipe KAM</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleUpdateKam(selectedKamDetail.id, { is_available: !selectedKamDetail.is_available })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-black/5 dark:border-white/5 ${
                  selectedKamDetail.is_available
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-black/5 dark:bg-white/10 text-zinc-500'
                }`}
              >
                {selectedKamDetail.is_available ? "Disponible en mission" : "Indisponible / Congés"}
              </button>

              <select
                value={selectedKamDetail.kam_specialization}
                onChange={(e) => handleUpdateKam(selectedKamDetail.id, { kam_specialization: e.target.value as any })}
                className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
              >
                <option value="GRAND_COMPTE">Pôle Grands Comptes (&gt; 1M$)</option>
                <option value="PME">Pôle PME Stratégiques (100k$ - 1M$)</option>
              </select>
            </div>
          </div>

          {/* Profile Header Card */}
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center gap-6">
            <UserAvatar
              src={selectedKamDetail.avatar}
              name={selectedKamDetail.full_name}
              size="xl"
              className="border border-[#4F6CE8]/30 shadow-md shrink-0"
            />

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {selectedKamDetail.full_name}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#4F6CE8]/10 text-[#4F6CE8]">
                  {selectedKamDetail.kam_specialization === 'GRAND_COMPTE' ? 'Spécialiste Grands Comptes' : 'Spécialiste PME'}
                </span>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-4 mt-2 text-xs text-[#6E6C67] dark:text-[#A1A1AA] flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Icons.Mail size={13} />
                  <span>{selectedKamDetail.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Icons.Phone size={13} />
                  <span>{selectedKamDetail.phone || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Icons.MapPin size={13} />
                  <span>{selectedKamDetail.location || 'Kinshasa'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance KPIs for this KAM */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Comptes Assignés</span>
              <span className="text-xl font-extrabold text-zinc-900 dark:text-white">
                {selectedKamAccounts.length}
              </span>
              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                {selectedKamAccounts.filter((a) => a.segment === 'GRAND_COMPTE').length} GC • {selectedKamAccounts.filter((a) => a.segment === 'PME').length} PME
              </span>
            </div>

            <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">CA Portefeuille</span>
              <span className="text-xl font-extrabold text-[#4F6CE8]">
                {(selectedKamAccounts.reduce((sum, a) => sum + Number(a.annual_revenue || 0), 0) / 1_000_000).toFixed(1)}M$
              </span>
              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Volume sous gestion</span>
            </div>

            <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Dossiers Convertis</span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {selectedKamAccounts.filter((a) => a.conversion_status === 'CONVERTED').length}
              </span>
              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Contrats signés actifs</span>
            </div>

            <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Statut Opérationnel</span>
              <span className={`text-sm font-extrabold ${selectedKamDetail.is_available ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'}`}>
                {selectedKamDetail.is_available ? "Actif & Disponible" : "Indisponible"}
              </span>
              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Affectations autorisées</span>
            </div>
          </div>

          {/* Table of Accounts Assigned to this KAM */}
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                Portefeuille de comptes attribués à {selectedKamDetail.full_name} ({selectedKamAccounts.length})
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead>
                  <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                    <th className="py-3 px-3.5 min-w-[180px]">Compte</th>
                    <th className="py-3 px-3.5">Segment</th>
                    <th className="py-3 px-3.5">CA Annuel</th>
                    <th className="py-3 px-3.5">Localisation</th>
                    <th className="py-3 px-3.5">Contact</th>
                    <th className="py-3 px-3.5">Statut</th>
                    <th className="py-3 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {selectedKamAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                        Aucun compte n&apos;est actuellement affecté à ce KAM.
                      </td>
                    </tr>
                  ) : (
                    paginatedSelectedKamAccounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                        <td className="py-3 px-3">
                          <button
                            onClick={() => setSelectedAccountForDetail(acc)}
                            className="font-semibold text-zinc-900 dark:text-white hover:text-[#4F6CE8] dark:hover:text-[#4F6CE8] text-left transition-colors cursor-pointer flex items-center gap-1.5 group"
                            title="Voir la fiche détaillée du compte"
                          >
                            <span className="group-hover:underline">{acc.name}</span>
                            <Icons.ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-[#4F6CE8] transition-opacity" />
                          </button>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
                            {acc.segment === 'GRAND_COMPTE' ? 'Grand Compte' : 'PME'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold">
                          {Number(acc.annual_revenue || 0).toLocaleString()} $
                        </td>
                        <td className="py-3 px-3 text-zinc-600 dark:text-[#A1A1AA]">
                          {acc.city}
                        </td>
                        <td className="py-3 px-3 text-zinc-600 dark:text-[#A1A1AA]">
                          {acc.contact_name} ({acc.contact_phone || 'tél n/a'})
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
                            {acc.conversion_status_display || acc.conversion_status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleUnassignAccount(acc.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            Désaffecter
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={selectedKamAccountsPage}
              totalPages={totalSelectedKamAccountsPages}
              onPageChange={setSelectedKamAccountsPage}
              totalItems={selectedKamAccounts.length}
              pageSize={selectedKamAccountsPageSize}
              itemName="comptes affectés"
            />
          </div>
        </div>
      ) : (
        /* --- GRILLE / LISTE DES KAMS --- */
        <div className="flex flex-col gap-4">
          {/* Filters Toolbar & Bouton Nouveau KAM */}
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Pôle Spécialité :</span>
                <select
                  value={kamSpecializationFilter}
                  onChange={(e) => setKamSpecializationFilter(e.target.value as any)}
                  className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
                >
                  <option value="ALL">Tous les pôles</option>
                  <option value="GRAND_COMPTE">Grands Comptes (&gt; 1M$)</option>
                  <option value="PME">PME Stratégiques (100k$ - 1M$)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Disponibilité :</span>
                <select
                  value={kamAvailabilityFilter}
                  onChange={(e) => setKamAvailabilityFilter(e.target.value as any)}
                  className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
                >
                  <option value="ALL">Tous les états</option>
                  <option value="AVAILABLE">Disponibles</option>
                  <option value="UNAVAILABLE">Indisponibles</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setIsCreateKamModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Icons.UserPlus size={14} />
              <span>Nouveau KAM</span>
            </button>
          </div>

          {/* Cards Grid of KAMs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedKams.map((kam) => (
              <div
                key={kam.id}
                onClick={() => setSelectedKamDetail(kam)}
                className="group bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 hover:border-[#4F6CE8]/40 dark:hover:border-[#4F6CE8]/40 transition-all cursor-pointer flex flex-col justify-between gap-4 shadow-2xs hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      src={kam.avatar}
                      alt={kam.full_name}
                      size="md"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-[#4F6CE8] transition-colors">
                        {kam.full_name}
                      </span>
                      <span className="text-[10px] font-mono text-[#6E6C67] dark:text-[#A1A1AA]">
                        @{kam.username} • {kam.location || 'Kinshasa'}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      kam.is_available
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-black/5 dark:bg-white/10 text-zinc-500'
                    }`}
                  >
                    {kam.is_available ? "Disponible" : "Occupé"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Portefeuille</span>
                    <span className="font-extrabold text-xs text-zinc-900 dark:text-white">
                      {kam.assigned_total_count} comptes
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Volume Sous Gestion</span>
                    <span className="font-extrabold text-xs text-[#4F6CE8]">
                      {(kam.total_portfolio_revenue_usd / 1_000_000).toFixed(1)}M$
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Signatures</span>
                    <span className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400">
                      {kam.converted_accounts_count}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-semibold text-zinc-500">
                    Spécialité : {kam.kam_specialization === 'GRAND_COMPTE' ? 'Grands Comptes' : 'PME Stratégiques'}
                  </span>

                  <span className="text-xs font-semibold text-[#4F6CE8] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    <span>Consulter Portefeuille</span>
                    <Icons.ChevronRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={kamsPage}
            totalPages={totalKamsPages}
            onPageChange={setKamsPage}
            totalItems={filteredKamsList.length}
            pageSize={kamsPageSize}
            itemName="gestionnaires KAM"
          />
        </div>
      )}

      {/* Create KAM Modal */}
      <KamOfficeCreateKamModal
        isOpen={isCreateKamModalOpen}
        onClose={() => setIsCreateKamModalOpen(false)}
        onCreateKam={handleCreateKamSubmit}
      />

      {/* Account Detail Modal */}
      {selectedAccountForDetail && (
        <KamOfficeAccountDetailModal
          account={selectedAccountForDetail}
          onClose={() => setSelectedAccountForDetail(null)}
        />
      )}
    </div>
  );
}
