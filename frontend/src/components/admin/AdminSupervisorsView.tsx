"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Icons } from '@/components/shared/Icons';
import Pagination from '@/components/kam/Pagination';
import UserAvatar from '@/components/kam/UserAvatar';
import { fetchAPI } from '@/lib/api';
import { ManagerUser } from './adminTypes';
import { useAdminContext } from './AdminContext';
import AdminManagerModal from './modals/AdminManagerModal';

export default function AdminSupervisorsView() {
  const { searchQuery, setSearchPlaceholder, updateCount, setSuccessMessage } = useAdminContext();
  const [supervisors, setSupervisors] = useState<ManagerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalSupervisorsCount, setTotalSupervisorsCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setSearchPlaceholder("Rechercher un superviseur (nom, identifiant, zone, email)...");
  }, [setSearchPlaceholder]);

  // Reset to page 1 on search
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const loadSupervisors = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/accounts/managers/?role=SUPERVISOR&page=${page}&page_size=${PAGE_SIZE}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery)}`;
      const data = await fetchAPI(url);
      const results = data?.results || data?.managers || (Array.isArray(data) ? data : []);
      const count = data?.count ?? data?.total ?? results.length;
      const pages = data?.total_pages ?? Math.max(1, Math.ceil(count / PAGE_SIZE));

      setSupervisors(results);
      setTotalSupervisorsCount(count);
      setTotalPages(pages);
      updateCount('supervisors', count);
    } catch (err) {
      console.error("Erreur chargement superviseurs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, updateCount]);

  useEffect(() => {
    loadSupervisors();
  }, [loadSupervisors]);

  const handleToggleActive = async (id: number) => {
    try {
      await fetchAPI(`/api/accounts/managers/${id}/toggle-active/`, {
        method: 'POST',
      });
      loadSupervisors();
    } catch (err: any) {
      alert(err?.message || "Erreur lors de la modification du statut.");
    }
  };

  const handleCreateSupervisor = async (managerData: any) => {
    setModalError(null);
    try {
      await fetchAPI('/api/accounts/managers/', {
        method: 'POST',
        body: JSON.stringify(managerData),
      });
      setSuccessMessage("Superviseur créé avec succès !");
      setTimeout(() => setSuccessMessage(null), 4000);
      loadSupervisors();
    } catch (err: any) {
      setModalError(err?.message || "Erreur lors de la création du superviseur.");
      throw err;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#242124] dark:text-white mt-1">
            Superviseurs Back-Office ({totalSupervisorsCount})
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
          <span>Nouveau Superviseur</span>
        </button>
      </div>

      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                <th className="py-3 px-3.5">Superviseur</th>
                <th className="py-3 px-3.5">Plaque / Territoire</th>
                <th className="py-3 px-3.5">Contact</th>
                <th className="py-3 px-3.5">Statut</th>
                <th className="py-3 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="w-6 h-6 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : supervisors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#6E6C67] dark:text-[#A1A1AA]">
                    Aucun superviseur ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                supervisors.map((sup) => (
                  <tr key={sup.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar src={sup.avatar} name={sup.full_name} size="sm" />
                        <div>
                          <span className="font-medium text-[#242124] dark:text-white block">{sup.full_name}</span>
                          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">@{sup.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#242124] dark:text-white">
                      {sup.location || "Kinshasa Centre"}
                    </td>
                    <td className="py-3 px-3 text-[#6E6C67] dark:text-[#A1A1AA]">
                      <div>{sup.email || "Non renseigné"}</div>
                      <div className="text-[10px]">{sup.phone || ""}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          sup.is_active
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA]'
                        }`}
                      >
                        {sup.is_active ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(sup.id)}
                          className="px-2.5 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white rounded-xl text-[11px] font-medium transition-all cursor-pointer"
                        >
                          {sup.is_active ? "Désactiver" : "Réactiver"}
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
          totalItems={totalSupervisorsCount}
          pageSize={PAGE_SIZE}
          itemName="superviseurs"
        />
      </div>

      <AdminManagerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetRole="SUPERVISOR"
        onCreateManager={handleCreateSupervisor}
        error={modalError}
      />
    </div>
  );
}
