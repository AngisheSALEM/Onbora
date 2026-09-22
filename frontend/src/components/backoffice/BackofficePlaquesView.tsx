"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from '@/components/shared/Icons';
import BackofficePagination from './BackofficePagination';
import { PlaqueItem, EnterpriseItem } from './backofficeTypes';
import { useBackofficeContext } from './BackofficeContext';
import BackofficeAddPlaqueModal from './BackofficeAddPlaqueModal';
import BackofficePlaqueAssignModal from './BackofficePlaqueAssignModal';
import BackofficeAccountDetailModal from './BackofficeAccountDetailModal';
import { fetchAPI } from '@/lib/api';

export default function BackofficePlaquesView() {
  const {
    plaques,
    enterprises,
    salespersons,
    setEnterprises,
    searchQuery,
    setSearchPlaceholder,
    setHeaderTitle,
    isAddPlaqueOpen,
    setIsAddPlaqueOpen,
    selectedPlaqueForAssign,
    setSelectedPlaqueForAssign,
    handleSavePlaqueAssignment,
    handleCreatePlaque,
    handleAutoDispatch,
    handleAssignEnterpriseSalesperson,
    selectedAccountForDetail,
    setSelectedAccountForDetail,
    dispatchNotification,
  } = useBackofficeContext();

  const [selectedPlaqueDetail, setSelectedPlaqueDetail] = useState<PlaqueItem | null>(null);
  const [plaquesListFilter, setPlaquesListFilter] = useState<'ALL' | 'WITH_SALESPERSONS' | 'NO_SALESPERSONS' | 'COVERED' | 'TO_PROSPECT'>('ALL');
  const [plaqueCityFilter, setPlaqueCityFilter] = useState<string>('ALL');
  const [plaquesPage, setPlaquesPage] = useState(1);
  const [plaquesPageSize, setPlaquesPageSize] = useState(10);
  const [dispatchingPlaqueId, setDispatchingPlaqueId] = useState<number | null>(null);

  // Plaque Detail sub-state
  const [plaqueDetailFilter, setPlaqueDetailFilter] = useState<'ALL' | 'VISITED' | 'UNVISITED' | 'UNASSIGNED' | 'ASSIGNED'>('ALL');
  const [plaqueDetailSearch, setPlaqueDetailSearch] = useState('');
  const [plaqueDetailPage, setPlaqueDetailPage] = useState(1);
  const [plaqueDetailPageSize, setPlaqueDetailPageSize] = useState(10);
  const [bulkDispatchSalespersonId, setBulkDispatchSalespersonId] = useState('');
  const [isBulkDispatching, setIsBulkDispatching] = useState(false);
  const [plaqueDetailSuccessMsg, setPlaqueDetailSuccessMsg] = useState('');
  const [assigningEnterpriseId, setAssigningEnterpriseId] = useState<number | null>(null);

  useEffect(() => {
    setHeaderTitle("Plaques & Auto-Dispatch");
    setSearchPlaceholder("Filtrer plaque par code, nom, ville...");
  }, [setHeaderTitle, setSearchPlaceholder]);

  // Keep selected plaque detail synced with context updates
  useEffect(() => {
    if (selectedPlaqueDetail && plaques.length > 0) {
      const refreshed = plaques.find((p) => p.id === selectedPlaqueDetail.id);
      if (refreshed) setSelectedPlaqueDetail(refreshed);
    }
  }, [plaques]);

  // Unique cities list for filtering
  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    plaques.forEach((p) => {
      if (p.city) cities.add(p.city);
    });
    return Array.from(cities);
  }, [plaques]);

  // Filtered plaques
  const filteredPlaques = useMemo(() => {
    return plaques.filter((plaque) => {
      if (plaqueCityFilter !== 'ALL' && plaque.city !== plaqueCityFilter) return false;

      const plaqueEnterprises = enterprises.filter(
        (e) => e.plaque_code === plaque.code || e.plaque === plaque.name || (e as any).plaque_rel === plaque.id
      );
      const visitedCount = plaqueEnterprises.filter((e) => e.is_visited).length;

      if (plaquesListFilter === 'WITH_SALESPERSONS' && (!plaque.assigned_salespersons || plaque.assigned_salespersons.length === 0)) return false;
      if (plaquesListFilter === 'NO_SALESPERSONS' && plaque.assigned_salespersons && plaque.assigned_salespersons.length > 0) return false;
      if (plaquesListFilter === 'COVERED' && (plaqueEnterprises.length === 0 || visitedCount < plaqueEnterprises.length)) return false;
      if (plaquesListFilter === 'TO_PROSPECT' && visitedCount >= plaqueEnterprises.length && plaqueEnterprises.length > 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          plaque.code?.toLowerCase().includes(q) ||
          plaque.name?.toLowerCase().includes(q) ||
          plaque.city?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [plaques, enterprises, plaqueCityFilter, plaquesListFilter, searchQuery]);

  const paginatedPlaques = useMemo(() => {
    const start = (plaquesPage - 1) * plaquesPageSize;
    return filteredPlaques.slice(start, start + plaquesPageSize);
  }, [filteredPlaques, plaquesPage, plaquesPageSize]);

  // Selected Plaque Enterprises & KPIs
  const plaqueEnterprises = useMemo(() => {
    if (!selectedPlaqueDetail) return [];
    return enterprises.filter(
      (e) =>
        e.plaque_code === selectedPlaqueDetail.code ||
        e.plaque === selectedPlaqueDetail.name ||
        (e as any).plaque_rel === selectedPlaqueDetail.id
    );
  }, [enterprises, selectedPlaqueDetail]);

  const plaqueDetailKpis = useMemo(() => {
    const total = plaqueEnterprises.length;
    const visited = plaqueEnterprises.filter((e) => e.is_visited).length;
    const unvisited = total - visited;
    const assigned = plaqueEnterprises.filter((e) => e.assigned_salesperson).length;
    const unassigned = total - assigned;
    return { total, visited, unvisited, assigned, unassigned };
  }, [plaqueEnterprises]);

  const filteredPlaqueDetailEnterprises = useMemo(() => {
    return plaqueEnterprises.filter((e) => {
      if (plaqueDetailFilter === 'VISITED' && !e.is_visited) return false;
      if (plaqueDetailFilter === 'UNVISITED' && e.is_visited) return false;
      if (plaqueDetailFilter === 'ASSIGNED' && !e.assigned_salesperson) return false;
      if (plaqueDetailFilter === 'UNASSIGNED' && e.assigned_salesperson) return false;

      if (plaqueDetailSearch.trim()) {
        const q = plaqueDetailSearch.toLowerCase();
        return (
          e.name?.toLowerCase().includes(q) ||
          e.crm_id?.toLowerCase().includes(q) ||
          e.commune?.toLowerCase().includes(q) ||
          e.sector?.toLowerCase().includes(q) ||
          e.assigned_salesperson_name?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [plaqueEnterprises, plaqueDetailFilter, plaqueDetailSearch]);

  const paginatedPlaqueDetailEnterprises = useMemo(() => {
    const start = (plaqueDetailPage - 1) * plaqueDetailPageSize;
    return filteredPlaqueDetailEnterprises.slice(start, start + plaqueDetailPageSize);
  }, [filteredPlaqueDetailEnterprises, plaqueDetailPage, plaqueDetailPageSize]);

  const onAutoDispatchClick = async (plaque: PlaqueItem) => {
    setDispatchingPlaqueId(plaque.id);
    try {
      await handleAutoDispatch(plaque);
    } finally {
      setDispatchingPlaqueId(null);
    }
  };

  const handleBulkDispatch = async () => {
    if (!selectedPlaqueDetail || !bulkDispatchSalespersonId) return;
    const spId = Number(bulkDispatchSalespersonId);
    if (isNaN(spId)) return;

    setIsBulkDispatching(true);
    try {
      const unassignedInPlaque = plaqueEnterprises.filter((e) => !e.assigned_salesperson);
      for (const ent of unassignedInPlaque) {
        await fetchAPI(`/api/sales/enterprises/${ent.id}/assign-salesperson/`, {
          method: 'POST',
          body: JSON.stringify({ salesperson_id: spId }),
        });
      }

      const targetSp = salespersons.find((s) => s.id === spId);
      setEnterprises((prev) =>
        prev.map((e) => {
          const isMatch =
            e.plaque_code === selectedPlaqueDetail.code ||
            e.plaque === selectedPlaqueDetail.name ||
            (e as any).plaque_rel === selectedPlaqueDetail.id;
          if (isMatch && !e.assigned_salesperson) {
            return {
              ...e,
              assigned_salesperson: spId,
              assigned_salesperson_name: targetSp ? targetSp.full_name : undefined,
            };
          }
          return e;
        })
      );
      setPlaqueDetailSuccessMsg(`${unassignedInPlaque.length} comptes affectés en masse avec succès.`);
      setTimeout(() => setPlaqueDetailSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error("Erreur bulk dispatch:", err);
    } finally {
      setIsBulkDispatching(false);
    }
  };

  const handleAssignClick = async (entId: number, spId: number | null) => {
    setAssigningEnterpriseId(entId);
    try {
      await handleAssignEnterpriseSalesperson(entId, spId);
    } finally {
      setAssigningEnterpriseId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Dispatch notification banner */}
      {dispatchNotification && (
        <div
          className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
            dispatchNotification.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}
        >
          {dispatchNotification.type === 'success' ? (
            <Icons.CheckCircle size={15} />
          ) : (
            <Icons.AlertCircle size={15} />
          )}
          <span>
            [{dispatchNotification.plaqueCode}] {dispatchNotification.message}
          </span>
        </div>
      )}

      {selectedPlaqueDetail ? (
        /* DEDICATED PLAQUE DETAIL & DISPATCH INTERFACE */
        <div className="flex flex-col gap-4">
          {/* Top Header Toolbar with Back Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedPlaqueDetail(null)}
                className="p-2 rounded-2xl bg-white dark:bg-[#363336] hover:bg-black/5 dark:hover:bg-white/10 text-[#242124] dark:text-white transition-all cursor-pointer inline-flex items-center justify-center border border-black/5 dark:border-white/5 shadow-xs"
                title="Retour"
              >
                <Icons.ArrowLeft size={16} />
              </button>

              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-xl bg-[#4F6CE8]/10 text-[#4F6CE8] font-extrabold text-xs">
                  {selectedPlaqueDetail.code}
                </span>
                <div className="flex flex-col">
                  <span className="font-extrabold text-xs text-[#242124] dark:text-white">
                    {selectedPlaqueDetail.name}
                  </span>
                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                    Zone {selectedPlaqueDetail.city}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedPlaqueForAssign(selectedPlaqueDetail)}
                className="px-3.5 py-1.5 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#242124] dark:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-black/5 dark:border-white/5 transition-all"
                title="Affecter ou modifier les commerciaux assignés à cette plaque"
              >
                <Icons.Users size={14} />
                <span>Gérer les Commerciaux de la Plaque</span>
              </button>

              <button
                onClick={() => onAutoDispatchClick(selectedPlaqueDetail)}
                disabled={dispatchingPlaqueId === selectedPlaqueDetail.id}
                className="px-3.5 py-1.5 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all disabled:opacity-50"
              >
                <Icons.Zap size={14} className={dispatchingPlaqueId === selectedPlaqueDetail.id ? 'animate-spin' : ''} />
                <span>{dispatchingPlaqueId === selectedPlaqueDetail.id ? 'Calcul...' : 'Auto dispatch'}</span>
              </button>
            </div>
          </div>

          {/* Assigned Commercials Banner for this Plaque */}
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
                Commerciaux affectés à cette plaque :
              </span>
              {selectedPlaqueDetail.assigned_salespersons_names && selectedPlaqueDetail.assigned_salespersons_names.length > 0 ? (
                selectedPlaqueDetail.assigned_salespersons_names.map((name) => (
                  <span key={name} className="px-2.5 py-0.5 rounded-lg bg-white dark:bg-[#363336] text-[#242124] dark:text-white font-semibold text-xs border border-black/5 dark:border-white/5 shadow-xs">
                    {name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-[#4F6CE8] font-550">
                  Aucun commercial affecté à cette zone cartographique
                </span>
              )}
            </div>

            <button
              onClick={() => setSelectedPlaqueForAssign(selectedPlaqueDetail)}
              className="text-xs text-[#4F6CE8] font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              <span>Modifier l'équipe de la plaque</span>
              <Icons.ArrowRight size={12} />
            </button>
          </div>

          {/* Plaque KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Total Entreprises</span>
              <span className="text-lg font-extrabold text-[#242124] dark:text-white mt-1">{plaqueDetailKpis.total}</span>
              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">dans la plaque</span>
            </div>
            <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Visités sur le terrain</span>
              <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{plaqueDetailKpis.visited}</span>
              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                {plaqueDetailKpis.total > 0 ? Math.round((plaqueDetailKpis.visited / plaqueDetailKpis.total) * 100) : 0}% de couverture
              </span>
            </div>
            <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-[#4F6CE8]">Pas encore visités</span>
              <span className="text-lg font-extrabold text-[#4F6CE8] mt-1">{plaqueDetailKpis.unvisited}</span>
              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">à prospecter</span>
            </div>
            <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-[#4F6CE8]">Assignés</span>
              <span className="text-lg font-extrabold text-[#4F6CE8] mt-1">{plaqueDetailKpis.assigned}</span>
              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">avec commercial</span>
            </div>
            <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-zinc-500 dark:text-zinc-400">Non assignés</span>
              <span className={`text-lg font-extrabold mt-1 ${plaqueDetailKpis.unassigned > 0 ? 'text-[#4F6CE8]' : 'text-[#242124] dark:text-white'}`}>
                {plaqueDetailKpis.unassigned}
              </span>
              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">en attente</span>
            </div>
          </div>

          {/* Success Banner */}
          {plaqueDetailSuccessMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <Icons.CheckCircle size={14} />
              <span>{plaqueDetailSuccessMsg}</span>
            </div>
          )}

          {/* Bulk Dispatch Unassigned Bar (If unassigned accounts exist) */}
          {plaqueDetailKpis.unassigned > 0 && (
            <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-extrabold text-[#242124] dark:text-white">
                  Affectation groupée des {plaqueDetailKpis.unassigned} comptes non assignés
                </span>
                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                  Attribuez rapidement l'ensemble des comptes disponibles à l'un des commerciaux de la plaque
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={bulkDispatchSalespersonId}
                  onChange={(e) => setBulkDispatchSalespersonId(e.target.value)}
                  className="bg-white dark:bg-[#363336] text-xs font-semibold py-2 px-3 rounded-xl border border-black/5 dark:border-white/5 text-[#242124] dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value="">Sélectionner un commercial...</option>
                  {salespersons.map((sp) => {
                    const isAssignedToPlaque = selectedPlaqueDetail.assigned_salespersons?.includes(sp.id);
                    return (
                      <option key={sp.id} value={sp.id}>
                        {sp.full_name} {isAssignedToPlaque ? '(Sur cette plaque)' : ''}
                      </option>
                    );
                  })}
                </select>

                <button
                  onClick={handleBulkDispatch}
                  disabled={!bulkDispatchSalespersonId || isBulkDispatching}
                  className="px-4 py-2 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all disabled:opacity-50 shrink-0"
                >
                  <Icons.UserPlus size={13} />
                  <span>{isBulkDispatching ? 'Affectation...' : 'Affecter en masse'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Filters Toolbar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3 rounded-2xl border border-black/5 dark:border-white/5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => {
                  setPlaqueDetailFilter('ALL');
                  setPlaqueDetailPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  plaqueDetailFilter === 'ALL'
                    ? 'bg-[#4F6CE8] text-white shadow-xs'
                    : 'bg-white dark:bg-[#363336] text-[#6E6C67] dark:text-[#A1A1AA] border border-black/5 dark:border-white/5'
                }`}
              >
                Toutes ({plaqueDetailKpis.total})
              </button>
              <button
                onClick={() => {
                  setPlaqueDetailFilter('VISITED');
                  setPlaqueDetailPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  plaqueDetailFilter === 'VISITED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-[#363336] text-emerald-600 dark:text-emerald-400 border border-black/5 dark:border-white/5'
                }`}
              >
                Visités ({plaqueDetailKpis.visited})
              </button>
              <button
                onClick={() => {
                  setPlaqueDetailFilter('UNVISITED');
                  setPlaqueDetailPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  plaqueDetailFilter === 'UNVISITED'
                    ? 'bg-[#4F6CE8] text-white shadow-xs'
                    : 'bg-white dark:bg-[#363336] text-[#4F6CE8] border border-black/5 dark:border-white/5'
                }`}
              >
                Non visités ({plaqueDetailKpis.unvisited})
              </button>
              <button
                onClick={() => {
                  setPlaqueDetailFilter('ASSIGNED');
                  setPlaqueDetailPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  plaqueDetailFilter === 'ASSIGNED'
                    ? 'bg-[#4F6CE8] text-white shadow-xs'
                    : 'bg-white dark:bg-[#363336] text-[#6E6C67] dark:text-[#A1A1AA] border border-black/5 dark:border-white/5'
                }`}
              >
                Assignés ({plaqueDetailKpis.assigned})
              </button>
              <button
                onClick={() => {
                  setPlaqueDetailFilter('UNASSIGNED');
                  setPlaqueDetailPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  plaqueDetailFilter === 'UNASSIGNED'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white dark:bg-[#363336] text-amber-600 dark:text-amber-400 border border-black/5 dark:border-white/5'
                }`}
              >
                Non assignés ({plaqueDetailKpis.unassigned})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Icons.Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={plaqueDetailSearch}
                onChange={(e) => {
                  setPlaqueDetailSearch(e.target.value);
                  setPlaqueDetailPage(1);
                }}
                placeholder="Rechercher une entreprise..."
                className="w-full bg-white dark:bg-[#363336] pl-8 pr-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5 text-xs text-[#242124] dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#4F6CE8]"
              />
            </div>
          </div>

          {/* Enterprises Table in Plaque */}
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden flex flex-col gap-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead>
                  <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                    <th className="py-3 px-3.5 min-w-[180px]">Entreprise</th>
                    <th className="py-3 px-3.5">Commune & Secteur</th>
                    <th className="py-3 px-3.5">Commercial Assigné</th>
                    <th className="py-3 px-3.5">Statut Visite</th>
                    <th className="py-3 px-3.5">Statut SOHO</th>
                    <th className="py-3 px-3.5 text-right">Fiche</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {paginatedPlaqueDetailEnterprises.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                        Aucune entreprise ne correspond aux filtres de cette plaque.
                      </td>
                    </tr>
                  ) : (
                    paginatedPlaqueDetailEnterprises.map((ent) => (
                      <tr key={ent.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#242124] dark:text-white">{ent.name}</span>
                            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] font-mono">{ent.crm_id}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="text-[#242124] dark:text-white font-550">{ent.commune || ent.city || 'Kinshasa'}</span>
                            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{ent.sector || 'TPE / Commerce'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <select
                            value={ent.assigned_salesperson || ''}
                            onChange={(e) => handleAssignClick(ent.id, e.target.value ? Number(e.target.value) : null)}
                            disabled={assigningEnterpriseId === ent.id}
                            className="bg-white dark:bg-[#363336] text-[11px] font-semibold py-1 px-2 rounded-xl border border-black/5 dark:border-white/5 text-[#242124] dark:text-white cursor-pointer focus:outline-none"
                          >
                            <option value="">Non assigné</option>
                            {salespersons.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.full_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-3">
                          {ent.is_visited ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1 w-fit">
                              <Icons.CheckCircle size={10} /> Visité
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 text-[10px] font-semibold flex items-center gap-1 w-fit">
                              <Icons.Clock size={10} /> Non visité
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            ent.conversion_status === 'CONVERTED' || ent.is_converted
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-[#4F6CE8]/10 text-[#4F6CE8]'
                          }`}>
                            {ent.conversion_status || 'PROSPECT'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setSelectedAccountForDetail(ent)}
                            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#4F6CE8] transition-colors cursor-pointer"
                            title="Voir la fiche complète"
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
              currentPage={plaqueDetailPage}
              totalPages={Math.ceil(filteredPlaqueDetailEnterprises.length / plaqueDetailPageSize) || 1}
              totalItems={filteredPlaqueDetailEnterprises.length}
              pageSize={plaqueDetailPageSize}
              onPageChange={setPlaqueDetailPage}
              onPageSizeChange={(sz) => {
                setPlaqueDetailPageSize(sz);
                setPlaqueDetailPage(1);
              }}
              itemName="entreprises"
            />
          </div>
        </div>
      ) : (
        /* MAIN PLAQUES LIST TABLE */
        <div className="flex flex-col gap-4">
          {/* Header Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
                {filteredPlaques.length} plaques répertoriées • Cliquez sur une plaque pour gérer sa répartition
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {availableCities.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Ville :</span>
                  <select
                    value={plaqueCityFilter}
                    onChange={(e) => {
                      setPlaqueCityFilter(e.target.value);
                      setPlaquesPage(1);
                    }}
                    className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
                  >
                    <option value="ALL">Toutes les villes</option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => setIsAddPlaqueOpen(true)}
                className="px-3.5 py-1.5 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                <Icons.Plus size={14} />
                <span>Créer une Plaque</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex items-center gap-1.5 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-2.5 rounded-2xl border border-black/5 dark:border-white/5 flex-wrap">
            {[
              { id: 'ALL', label: `Toutes (${plaques.length})` },
              { id: 'WITH_SALESPERSONS', label: 'Avec commerciaux' },
              { id: 'NO_SALESPERSONS', label: 'Sans commercial' },
              { id: 'COVERED', label: 'Entièrement couverte' },
              { id: 'TO_PROSPECT', label: 'À prospecter' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setPlaquesListFilter(f.id as any);
                  setPlaquesPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  plaquesListFilter === f.id
                    ? 'bg-[#4F6CE8] text-white shadow-xs'
                    : 'bg-white dark:bg-[#363336] text-[#6E6C67] dark:text-[#A1A1AA] border border-black/5 dark:border-white/5'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Plaques Table */}
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden flex flex-col gap-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead>
                  <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                    <th className="py-3 px-3.5">Code Plaque</th>
                    <th className="py-3 px-3.5 min-w-[180px]">Nom & Ville</th>
                    <th className="py-3 px-3.5">Commerciaux Affectés</th>
                    <th className="py-3 px-3.5">Comptes SOHO</th>
                    <th className="py-3 px-3.5">Visités vs Non visités</th>
                    <th className="py-3 px-3.5 text-right">Actions & Répartition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {paginatedPlaques.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                        Aucune plaque ne correspond aux filtres sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    paginatedPlaques.map((plaque) => {
                      const curEnterprises = enterprises.filter(
                        (e) => e.plaque_code === plaque.code || e.plaque === plaque.name || (e as any).plaque_rel === plaque.id
                      );
                      const visitedCount = curEnterprises.filter((e) => e.is_visited).length;
                      const unvisitedCount = curEnterprises.length - visitedCount;
                      const isDispatching = dispatchingPlaqueId === plaque.id;

                      return (
                        <tr
                          key={plaque.id}
                          onClick={() => setSelectedPlaqueDetail(plaque)}
                          className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-3">
                            <span className="px-2.5 py-1 rounded-xl bg-[#4F6CE8]/10 text-[#4F6CE8] font-extrabold text-xs">
                              {plaque.code}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-[#242124] dark:text-white hover:text-[#4F6CE8] transition-colors">{plaque.name}</span>
                              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{plaque.city}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1">
                              {plaque.assigned_salespersons_names && plaque.assigned_salespersons_names.length > 0 ? (
                                plaque.assigned_salespersons_names.map((name) => (
                                  <span key={name} className="px-2 py-0.5 rounded-md bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 text-xs font-550 text-[#242124] dark:text-white">
                                    {name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-[#4F6CE8] font-550">
                                  Aucun commercial affecté
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-extrabold text-xs text-[#242124] dark:text-white">
                              {curEnterprises.length} comptes
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{visitedCount} visités</span>
                              <span className="text-zinc-400">•</span>
                              <span className="text-[#6E6C67] dark:text-[#A1A1AA]">{unvisitedCount} restants</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setSelectedPlaqueDetail(plaque)}
                                className="px-2.5 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#242124] dark:text-white border border-black/10 dark:border-white/10 font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                                title="Ouvrir la fiche de détail et la répartition manuelle des entreprises de cette plaque"
                              >
                                <Icons.Eye size={12} />
                                <span>Détail & Dispatch</span>
                              </button>
                              <button
                                onClick={() => onAutoDispatchClick(plaque)}
                                disabled={isDispatching}
                                className="px-2.5 py-1.5 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                title="Déclencher l'algorithme d'affectation automatique avec anti-collision"
                              >
                                <Icons.Zap size={12} className={isDispatching ? "animate-spin" : ""} />
                                <span>{isDispatching ? "Calcul..." : "Auto dispatch"}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <BackofficePagination
              currentPage={plaquesPage}
              totalPages={Math.ceil(filteredPlaques.length / plaquesPageSize) || 1}
              totalItems={filteredPlaques.length}
              pageSize={plaquesPageSize}
              onPageChange={setPlaquesPage}
              onPageSizeChange={(sz) => {
                setPlaquesPageSize(sz);
                setPlaquesPage(1);
              }}
              itemName="plaques"
            />
          </div>
        </div>
      )}

      {/* Add Plaque Modal */}
      <BackofficeAddPlaqueModal
        isOpen={isAddPlaqueOpen}
        onClose={() => setIsAddPlaqueOpen(false)}
        onCreatePlaque={handleCreatePlaque}
      />

      {/* Plaque Assign Modal */}
      {selectedPlaqueForAssign && (
        <BackofficePlaqueAssignModal
          plaque={selectedPlaqueForAssign}
          salespersons={salespersons}
          onClose={() => setSelectedPlaqueForAssign(null)}
          onSaveAssignment={handleSavePlaqueAssignment}
        />
      )}

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
