"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Icons } from '@/components/shared/Icons';
import Pagination from '@/components/kam/Pagination';
import { fetchAPI } from '@/lib/api';
import { ConvertedAccount } from './adminTypes';
import { useAdminContext } from './AdminContext';
import AdminConvertedDetailModal from './modals/AdminConvertedDetailModal';

export default function AdminConvertedView() {
  const { searchQuery, setSearchPlaceholder, updateCount } = useAdminContext();
  const [convertedAccounts, setConvertedAccounts] = useState<ConvertedAccount[]>([]);
  const [convertedSummary, setConvertedSummary] = useState({
    total_count: 0,
    total_signed_amount_usd: 0,
    back_office_count: 0,
    back_office_signed_amount_usd: 0,
    kam_office_count: 0,
    kam_office_signed_amount_usd: 0,
  });
  const [convertedFilterEntity, setConvertedFilterEntity] = useState<'ALL' | 'BACK_OFFICE' | 'KAM_OFFICE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalAccountsCount, setTotalAccountsCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDetail, setSelectedDetail] = useState<ConvertedAccount | null>(null);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setSearchPlaceholder("Rechercher un compte converti (nom, CRM ID, offre, ville)...");
  }, [setSearchPlaceholder]);

  // Reset page to 1 when filter or search changes
  useEffect(() => {
    setPage(1);
  }, [convertedFilterEntity, searchQuery]);

  const loadConvertedAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAPI(
        `/api/sales/converted-accounts/?entity=${convertedFilterEntity}&search=${encodeURIComponent(searchQuery)}&page=${page}&page_size=${PAGE_SIZE}`
      );
      const results = data?.results || data?.accounts || (Array.isArray(data) ? data : []);
      const count = data?.count ?? data?.total ?? results.length;
      const pages = data?.total_pages ?? Math.max(1, Math.ceil(count / PAGE_SIZE));

      setConvertedAccounts(results);
      setTotalAccountsCount(count);
      setTotalPages(pages);

      if (data?.summary) {
        setConvertedSummary(data.summary);
        updateCount('converted', data.summary.total_count);
      } else {
        updateCount('converted', count);
      }
    } catch (err) {
      console.error("Erreur chargement comptes convertis:", err);
    } finally {
      setLoading(false);
    }
  }, [convertedFilterEntity, page, searchQuery, updateCount]);

  useEffect(() => {
    loadConvertedAccounts();
  }, [loadConvertedAccounts]);

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#242124] dark:text-white mt-1">
            Comptes Clients Convertis & Chiffre d'Affaires Signé
          </h2>
        </div>

        {/* Filter by Entity */}
        <div className="flex items-center gap-2 bg-[#F6F5F2] dark:bg-[#2D2A2D] px-3 py-1.5 rounded-2xl shrink-0 border border-black/5 dark:border-white/5">
          <Icons.Filter size={13} className="text-[#6E6C67] dark:text-[#A1A1AA]" />
          <select
            value={convertedFilterEntity}
            onChange={(e) => {
              setConvertedFilterEntity(e.target.value as any);
              setPage(1);
            }}
            className="bg-transparent text-xs font-medium text-[#242124] dark:text-white outline-none cursor-pointer pr-2"
          >
            <option value="ALL" className="bg-white dark:bg-[#2D2A2D] text-[#242124] dark:text-white">
              Tous les bureaux ({convertedSummary.total_count})
            </option>
            <option value="BACK_OFFICE" className="bg-white dark:bg-[#2D2A2D] text-[#242124] dark:text-white">
              Back-Office Terrain ({convertedSummary.back_office_count})
            </option>
            <option value="KAM_OFFICE" className="bg-white dark:bg-[#2D2A2D] text-[#242124] dark:text-white">
              KAM Office ({convertedSummary.kam_office_count})
            </option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
            Total Chiffre d'Affaires Signé
          </span>
          <span className="text-2xl font-extrabold text-[#242124] dark:text-white mt-1">
            {convertedSummary.total_signed_amount_usd.toLocaleString()} $
          </span>
          <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
            Valeur cumulée des signatures enregistrées
          </span>
        </div>

        <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
            Signé par le Back-Office Terrain
          </span>
          <span className="text-2xl font-extrabold text-[#242124] dark:text-white mt-1">
            {convertedSummary.back_office_signed_amount_usd.toLocaleString()} $
          </span>
          <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
            {convertedSummary.back_office_count} très petites entreprises & commerces de proximité
          </span>
        </div>

        <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
            Signé par le KAM Office
          </span>
          <span className="text-2xl font-extrabold text-[#4F6CE8] mt-1">
            {convertedSummary.kam_office_signed_amount_usd.toLocaleString()} $
          </span>
          <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
            {convertedSummary.kam_office_count} Grands Comptes & PME structurées
          </span>
        </div>
      </div>

      {/* Table list */}
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#242124] dark:text-white">
            Liste des Comptes Convertis ({totalAccountsCount})
          </h3>
          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
            Cliquez sur un dossier pour afficher sa fiche complète
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
          </div>
        ) : convertedAccounts.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
            Aucun compte converti ne correspond aux critères sélectionnés.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {convertedAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="bg-[#F6F5F2] dark:bg-[#242124] hover:bg-black/5 dark:hover:bg-white/5 p-4 rounded-2xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  onClick={() => setSelectedDetail(acc)}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-medium text-xs shrink-0 ${
                        acc.converted_by_entity === 'BACK_OFFICE'
                          ? 'bg-black/5 dark:bg-white/10 text-[#242124] dark:text-white'
                          : 'bg-[#4F6CE8]/15 text-[#4F6CE8]'
                      }`}
                    >
                      {acc.converted_by_entity === 'BACK_OFFICE' ? 'BO' : 'KAM'}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#242124] dark:text-white group-hover:text-[#4F6CE8] transition-colors">
                          {acc.name}
                        </span>
                        <span className="text-[9px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase">
                          ({acc.crm_id})
                        </span>
                      </div>
                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                        {acc.city} ({acc.commune}) • RCCM : {acc.rccm || "En cours"} • Contact : {acc.contact_name} ({acc.contact_role})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <div className="text-right">
                      <span className="text-xs font-medium text-[#242124] dark:text-white block">
                        +{Number(acc.converted_amount).toLocaleString()} $
                      </span>
                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] line-clamp-1 max-w-xs">
                        {acc.converted_offer || "Pack Fibre Managée"}
                      </span>
                    </div>
                    <Icons.ChevronRight size={14} className="text-[#6E6C67] dark:text-[#A1A1AA]" />
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={totalAccountsCount}
              pageSize={PAGE_SIZE}
              itemName="comptes convertis"
            />
          </>
        )}
      </div>

      {/* Account detail modal */}
      <AdminConvertedDetailModal
        account={selectedDetail}
        onClose={() => setSelectedDetail(null)}
      />
    </div>
  );
}
