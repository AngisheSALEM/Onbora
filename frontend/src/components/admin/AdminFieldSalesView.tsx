"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Icons } from '@/components/shared/Icons';
import Pagination from '@/components/kam/Pagination';
import UserAvatar from '@/components/kam/UserAvatar';
import { fetchAPI } from '@/lib/api';
import { SalespersonItem, PlaqueItem } from './adminTypes';
import { useAdminContext } from './AdminContext';

const AdminPlaqueMapOnly = dynamic(
  () => import('@/components/admin/AdminPlaqueMapOnly'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] rounded-3xl bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
        <span className="text-xs font-medium text-[#6E6C67] dark:text-[#A1A1AA]">
          Chargement de la carte des plaques...
        </span>
      </div>
    ),
  }
);

export default function AdminFieldSalesView() {
  const { searchQuery, setSearchPlaceholder, updateCount } = useAdminContext();
  const [salespersons, setSalespersons] = useState<SalespersonItem[]>([]);
  const [plaques, setPlaques] = useState<PlaqueItem[]>([]);
  const [loadingSalespersons, setLoadingSalespersons] = useState(true);
  const [loadingPlaques, setLoadingPlaques] = useState(true);
  const [fieldSubTab, setFieldSubTab] = useState<'commerciaux' | 'plaques'>('commerciaux');
  const [plaqueViewMode, setPlaqueViewMode] = useState<'list' | 'map'>('list');
  const [salespersonsPage, setSalespersonsPage] = useState(1);
  const [salespersonsTotalCount, setSalespersonsTotalCount] = useState(0);
  const [salespersonsTotalPages, setSalespersonsTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setSearchPlaceholder("Rechercher un commercial ou une plaque (nom, zone, plaque, code)...");
  }, [setSearchPlaceholder]);

  // Reset page to 1 when search query changes
  useEffect(() => {
    setSalespersonsPage(1);
  }, [searchQuery]);

  const loadData = useCallback(async () => {
    setLoadingSalespersons(true);
    setLoadingPlaques(true);
    try {
      let spUrl = `/api/sales/salespersons/?page=${salespersonsPage}&page_size=${PAGE_SIZE}`;
      if (searchQuery.trim()) spUrl += `&search=${encodeURIComponent(searchQuery)}`;
      const [salesData, plaquesData] = await Promise.all([
        fetchAPI(spUrl),
        fetchAPI('/api/sales/plaques/'),
      ]);

      const spResults = salesData?.results || salesData?.salespersons || (Array.isArray(salesData) ? salesData : []);
      const spCount = salesData?.count ?? salesData?.total ?? spResults.length;
      const spPages = salesData?.total_pages ?? Math.max(1, Math.ceil(spCount / PAGE_SIZE));

      setSalespersons(spResults);
      setSalespersonsTotalCount(spCount);
      setSalespersonsTotalPages(spPages);
      updateCount('sales', spCount);

      if (Array.isArray(plaquesData)) {
        setPlaques(plaquesData);
      }
    } catch (err) {
      console.error("Erreur chargement commerciaux et plaques:", err);
    } finally {
      setLoadingSalespersons(false);
      setLoadingPlaques(false);
    }
  }, [salespersonsPage, searchQuery, updateCount]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredPlaques = useMemo(() => {
    if (!searchQuery.trim()) return plaques;
    const q = searchQuery.toLowerCase();
    return plaques.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q)
    );
  }, [plaques, searchQuery]);

  const handleToggleSalespersonActive = async (id: number, currentAvailable: boolean) => {
    try {
      await fetchAPI(`/api/sales/salespersons/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_available: !currentAvailable }),
      });
      loadData();
    } catch (err: any) {
      alert(err?.message || "Erreur lors de la mise à jour du statut.");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#242124] dark:text-white mt-1">
            Commerciaux & Plaques Cartographiques
          </h2>
        </div>

        {/* Subtab switcher */}
        <div className="flex items-center gap-1.5 bg-[#F6F5F2] dark:bg-[#242124] p-1.5 rounded-2xl shrink-0">
          <button
            onClick={() => setFieldSubTab('commerciaux')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              fieldSubTab === 'commerciaux'
                ? 'bg-[#4F6CE8] text-white shadow-sm'
                : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
            }`}
          >
            Commerciaux ({salespersonsTotalCount})
          </button>
          <button
            onClick={() => setFieldSubTab('plaques')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              fieldSubTab === 'plaques'
                ? 'bg-[#4F6CE8] text-white shadow-sm'
                : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
            }`}
          >
            Plaques ({filteredPlaques.length})
          </button>
        </div>
      </div>

      {/* Commerciaux Tab */}
      {fieldSubTab === 'commerciaux' && (
        <div className="flex flex-col gap-5">
          <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead>
                  <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                    <th className="py-3 px-3.5">Commercial</th>
                    <th className="py-3 px-3.5">Plaques Affectées</th>
                    <th className="py-3 px-3.5">Signatures</th>
                    <th className="py-3 px-3.5">Visites</th>
                    <th className="py-3 px-3.5">Formulaires</th>
                    <th className="py-3 px-3.5">Incentive</th>
                    <th className="py-3 px-3.5">Statut</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {loadingSalespersons ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#6E6C67] dark:text-[#A1A1AA]">
                        <div className="w-6 h-6 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : salespersons.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#6E6C67] dark:text-[#A1A1AA]">
                        Aucun commercial terrain ne correspond à votre recherche.
                      </td>
                    </tr>
                  ) : (
                    salespersons.map((sp) => (
                      <tr key={sp.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar src={sp.avatar} name={sp.full_name} size="sm" />
                            <div>
                              <span className="font-medium text-[#242124] dark:text-white block">{sp.full_name}</span>
                              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                                @{sp.username} • {sp.location || 'Kinshasa'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {sp.assigned_plaques && sp.assigned_plaques.length > 0 ? (
                              sp.assigned_plaques.map((p, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md bg-[#4F6CE8]/10 text-[#4F6CE8] font-medium text-[10px]"
                                >
                                  {p}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Aucune</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-medium text-emerald-600 dark:text-emerald-400">
                          {sp.conversions_count || 0} signés
                        </td>
                        <td className="py-3 px-3 font-medium text-[#242124] dark:text-white">
                          {sp.visits_count || 0}
                        </td>
                        <td className="py-3 px-3 font-medium text-[#242124] dark:text-white">
                          {sp.form_submissions_count || 0}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#4F6CE8]/15 text-[#4F6CE8] font-semibold text-[10px]">
                            {sp.incentive_points || 0} pts
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              sp.is_available
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA]'
                            }`}
                          >
                            {sp.is_available ? 'Disponible' : 'Occupé'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleSalespersonActive(sp.id, sp.is_available)}
                              className="px-2 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white rounded-xl text-[10px] font-medium transition-all cursor-pointer"
                            >
                              {sp.is_available ? "Inactif" : "Dispo"}
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
              currentPage={salespersonsPage}
              totalPages={salespersonsTotalPages}
              onPageChange={setSalespersonsPage}
              totalItems={salespersonsTotalCount}
              pageSize={PAGE_SIZE}
              itemName="commerciaux"
            />
          </div>
        </div>
      )}

      {/* Plaques Tab */}
      {fieldSubTab === 'plaques' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between bg-white dark:bg-[#2D2A2D] p-4 rounded-3xl shadow-sm border border-black/5 dark:border-white/5">
            <div>
              <h3 className="text-sm font-semibold text-[#242124] dark:text-white">
                Découpage Territorial des Plaques SOHO
              </h3>
              <p className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
                Périmètres cartographiques délimités pour la prospection pédestre terrain.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlaqueViewMode(plaqueViewMode === 'list' ? 'map' : 'list')}
                className={`px-4 py-2 rounded-2xl text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
                  plaqueViewMode === 'map'
                    ? 'bg-[#4F6CE8] text-white shadow-sm'
                    : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#242124] dark:text-white'
                }`}
              >
                <Icons.Map size={14} />
                <span>{plaqueViewMode === 'map' ? "Afficher le Tableau des Plaques" : "Voir la Carte des Plaques"}</span>
              </button>
            </div>
          </div>

          {plaqueViewMode === 'map' ? (
            <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-5 shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
              <AdminPlaqueMapOnly plaques={plaques as any} />
            </div>
          ) : (
            <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[750px]">
                  <thead>
                    <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                      <th className="py-3 px-3.5">Code Plaque</th>
                      <th className="py-3 px-3.5">Nom du Secteur</th>
                      <th className="py-3 px-3.5">Ville</th>
                      <th className="py-3 px-3.5">Comptes très petites entreprises</th>
                      <th className="py-3 px-3.5">Statut</th>
                      <th className="py-3 px-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {loadingPlaques ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#6E6C67] dark:text-[#A1A1AA]">
                          <div className="w-6 h-6 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : filteredPlaques.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#6E6C67] dark:text-[#A1A1AA]">
                          Aucune plaque cartographique trouvée.
                        </td>
                      </tr>
                    ) : (
                      filteredPlaques.map((p) => (
                        <tr key={p.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-mono font-medium px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[#242124] dark:text-white">
                              {p.code}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium text-[#242124] dark:text-white">
                            {p.name}
                          </td>
                          <td className="py-3 px-3 text-[#6E6C67] dark:text-[#A1A1AA]">
                            {p.city}
                          </td>
                          <td className="py-3 px-3 font-medium text-[#4F6CE8]">
                            {p.enterprises_count || 0} entreprises
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              Active
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => setPlaqueViewMode('map')}
                              className="px-2.5 py-1 bg-[#4F6CE8]/10 hover:bg-[#4F6CE8] text-[#4F6CE8] hover:text-white rounded-xl text-[10px] font-medium transition-all cursor-pointer flex items-center gap-1 inline-flex"
                            >
                              <Icons.Map size={10} />
                              <span>Localiser</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
