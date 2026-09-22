"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Icons } from '@/components/shared/Icons';
import Pagination from '@/components/kam/Pagination';
import UserAvatar from '@/components/kam/UserAvatar';
import { fetchAPI } from '@/lib/api';
import { ManagerUser } from './adminTypes';
import { useAdminContext } from './AdminContext';
import AdminManagerModal from './modals/AdminManagerModal';

export default function AdminKamManagersView() {
  const { searchQuery, setSearchPlaceholder, updateCount, setSuccessMessage } = useAdminContext();
  const [kamManagers, setKamManagers] = useState<ManagerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalKamManagersCount, setTotalKamManagersCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setSearchPlaceholder("Rechercher un gérant KAM (nom, identifiant, pôle, email)...");
  }, [setSearchPlaceholder]);

  // Reset to page 1 on search
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const loadKamManagers = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/accounts/managers/?role=KAM_MANAGER&page=${page}&page_size=${PAGE_SIZE}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery)}`;
      const data = await fetchAPI(url);
      const results = data?.results || data?.managers || (Array.isArray(data) ? data : []);
      const count = data?.count ?? data?.total ?? results.length;
      const pages = data?.total_pages ?? Math.max(1, Math.ceil(count / PAGE_SIZE));

      setKamManagers(results);
      setTotalKamManagersCount(count);
      setTotalPages(pages);
      updateCount('kamManagers', count);
    } catch (err) {
      console.error("Erreur chargement gérants KAM:", err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, updateCount]);

  useEffect(() => {
    loadKamManagers();
  }, [loadKamManagers]);

  const handleToggleActive = async (id: number) => {
    try {
      await fetchAPI(`/api/accounts/managers/${id}/toggle-active/`, {
        method: 'POST',
      });
      loadKamManagers();
    } catch (err: any) {
      alert(err?.message || "Erreur lors de la modification du statut.");
    }
  };

  const handleCreateManager = async (managerData: any) => {
    setModalError(null);
    try {
      await fetchAPI('/api/accounts/managers/', {
        method: 'POST',
        body: JSON.stringify(managerData),
      });
      setSuccessMessage("Gérant KAM créé avec succès !");
      setTimeout(() => setSuccessMessage(null), 4000);
      loadKamManagers();
    } catch (err: any) {
      setModalError(err?.message || "Erreur lors de la création du gérant KAM.");
      throw err;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#242124] dark:text-white mt-1">
            Gérants KAM Office ({totalKamManagersCount})
          </h2>
        </div>
        <button
          onClick={() => {
            setModalError(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white rounded-2xl text-xs font-medium shadow-sm transition-all cursor-pointer flex items-center gap-2 shrink-0"
        >
          <Icons.UserPlus size={14} />
          <span>Nouveau Gérant KAM</span>
        </button>
      </div>

      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                <th className="py-3 px-3.5">Gérant KAM</th>
                <th className="py-3 px-3.5">Direction / Pôle</th>
                <th className="py-3 px-3.5">Contact</th>
                <th className="py-3 px-3.5">Statut</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="w-6 h-6 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : kamManagers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#6E6C67] dark:text-[#A1A1AA]">
                    Aucun gérant KAM Office ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                kamManagers.map((km) => (
                  <tr key={km.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar src={km.avatar} name={km.full_name} size="sm" />
                        <div>
                          <span className="font-medium text-[#242124] dark:text-white block">{km.full_name}</span>
                          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">@{km.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#242124] dark:text-white">
                      {km.location || "Direction Grands Comptes"}
                    </td>
                    <td className="py-3 px-3 text-[#6E6C67] dark:text-[#A1A1AA]">
                      <div>{km.email || "Non renseigné"}</div>
                      <div className="text-[10px]">{km.phone || ""}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          km.is_active
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA]'
                        }`}
                      >
                        {km.is_active ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(km.id)}
                          className="px-2.5 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white rounded-xl text-[11px] font-medium transition-all cursor-pointer"
                        >
                          {km.is_active ? "Désactiver" : "Réactiver"}
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
          totalItems={totalKamManagersCount}
          pageSize={PAGE_SIZE}
          itemName="gérants KAM"
        />
      </div>

      <AdminManagerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetRole="KAM_MANAGER"
        onCreateManager={handleCreateManager}
        error={modalError}
      />
    </div>
  );
}
