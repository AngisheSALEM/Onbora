"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '@/components/shared/Icons';
import Pagination from '@/components/kam/Pagination';
import UserAvatar from '@/components/kam/UserAvatar';
import { fetchAPI } from '@/lib/api';
import { KamTeamMemberItem, EnterpriseItem } from './adminTypes';
import { useAdminContext } from './AdminContext';
import AdminKamPortfolioModal from './modals/AdminKamPortfolioModal';

export default function AdminKamsTeamView() {
  const { searchQuery, setSearchPlaceholder, updateCount } = useAdminContext();
  const [kamsTeam, setKamsTeam] = useState<KamTeamMemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalKamsCount, setTotalKamsCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  // Portfolio modal
  const [selectedKamForPortfolio, setSelectedKamForPortfolio] = useState<KamTeamMemberItem | null>(null);
  const [kamPortfolioAccounts, setKamPortfolioAccounts] = useState<EnterpriseItem[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);

  useEffect(() => {
    setSearchPlaceholder("Rechercher un KAM (nom, identifiant, pôle, email)...");
  }, [setSearchPlaceholder]);

  // Reset page to 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const loadKamsTeam = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/accounts/kams/?page=${page}&page_size=${PAGE_SIZE}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery)}`;
      const data = await fetchAPI(url);
      const results = data?.results || data?.kams || (Array.isArray(data) ? data : []);
      const count = data?.count ?? data?.total ?? results.length;
      const pages = data?.total_pages ?? Math.max(1, Math.ceil(count / PAGE_SIZE));

      setKamsTeam(results);
      setTotalKamsCount(count);
      setTotalPages(pages);
      updateCount('kams', count);
    } catch (err) {
      console.error("Erreur chargement effectif KAMs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, updateCount]);

  useEffect(() => {
    loadKamsTeam();
  }, [loadKamsTeam]);

  const handleOpenKamPortfolio = async (kam: KamTeamMemberItem) => {
    setSelectedKamForPortfolio(kam);
    setLoadingPortfolio(true);
    try {
      const data = await fetchAPI(`/api/sales/enterprises/?assigned_kam=${kam.id}&limit=1000`);
      if (data && Array.isArray(data.results)) {
        setKamPortfolioAccounts(data.results);
      } else if (data && Array.isArray(data.enterprises)) {
        setKamPortfolioAccounts(data.enterprises);
      } else if (Array.isArray(data)) {
        setKamPortfolioAccounts(data);
      } else {
        setKamPortfolioAccounts([]);
      }
    } catch (err) {
      console.error("Erreur chargement portefeuille KAM:", err);
      setKamPortfolioAccounts([]);
    } finally {
      setLoadingPortfolio(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#242124] dark:text-white mt-1">
            Effectif des Key Account Managers ({totalKamsCount})
          </h2>
        </div>
      </div>

      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                <th className="py-3 px-3.5">Key Account Manager</th>
                <th className="py-3 px-3.5">Pôle / Spécialisation</th>
                <th className="py-3 px-3.5">Portefeuille</th>
                <th className="py-3 px-3.5">Signatures</th>
                <th className="py-3 px-3.5">CA Signé ($)</th>
                <th className="py-3 px-3.5">Contact</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="w-6 h-6 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : kamsTeam.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6E6C67] dark:text-[#A1A1AA]">
                    Aucun Key Account Manager trouvé.
                  </td>
                </tr>
              ) : (
                kamsTeam.map((k) => (
                  <tr key={k.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar src={k.avatar} name={k.full_name} size="sm" />
                        <div>
                          <span className="font-medium text-[#242124] dark:text-white block">{k.full_name}</span>
                          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">@{k.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#242124] dark:text-white">
                      {k.company_name || "Direction Grands Comptes"}
                    </td>
                    <td className="py-3 px-3 font-medium text-[#242124] dark:text-white">
                      <button
                        onClick={() => handleOpenKamPortfolio(k)}
                        className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-[#4F6CE8]/15 hover:text-[#4F6CE8] transition-colors cursor-pointer font-medium inline-flex items-center gap-1"
                        title="Inspecter les comptes gérés"
                      >
                        <span>{k.portfolio_count || 0} comptes</span>
                        <Icons.ChevronRight size={10} />
                      </button>
                    </td>
                    <td className="py-3 px-3 font-medium text-[#4F6CE8]">
                      {k.converted_count || 0} convertis
                    </td>
                    <td className="py-3 px-3 font-medium text-[#242124] dark:text-white">
                      +{(k.converted_amount || 0).toLocaleString()} $
                    </td>
                    <td className="py-3 px-3 text-[#6E6C67] dark:text-[#A1A1AA]">
                      <div>{k.email}</div>
                      <div className="text-[10px]">{k.phone || ""}</div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenKamPortfolio(k)}
                          className="px-2.5 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#242124] dark:text-white rounded-xl text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 inline-flex"
                          title="Consulter les comptes gérés par ce KAM"
                        >
                          <Icons.Briefcase size={11} />
                          <span>Portefeuille</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalKamsCount}
          pageSize={PAGE_SIZE}
          itemName="Key Account Managers"
        />
      </div>

      <AdminKamPortfolioModal
        kam={selectedKamForPortfolio}
        accounts={kamPortfolioAccounts}
        loading={loadingPortfolio}
        onClose={() => setSelectedKamForPortfolio(null)}
      />
    </div>
  );
}
