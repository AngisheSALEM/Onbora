"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from '@/components/shared/Icons';
import BackofficePagination from './BackofficePagination';
import { SalespersonItem, EnterpriseItem, VisitReportItem, VisitSubmissionItem } from './backofficeTypes';
import { useBackofficeContext } from './BackofficeContext';
import BackofficeAddSalespersonModal from './BackofficeAddSalespersonModal';
import BackofficeReportInspectModal from './BackofficeReportInspectModal';
import BackofficeAccountDetailModal from './BackofficeAccountDetailModal';
import { fetchAPI } from '@/lib/api';

export default function BackofficeSalespersonsView() {
  const {
    salespersons,
    enterprises,
    searchQuery,
    setSearchPlaceholder,
    setHeaderTitle,
    isAddSalespersonOpen,
    setIsAddSalespersonOpen,
    handleCreateSalesperson,
    handleAssignEnterpriseSalesperson,
    selectedReportToInspect,
    setSelectedReportToInspect,
    selectedAccountForDetail,
    setSelectedAccountForDetail,
    loadDashboardData,
  } = useBackofficeContext();

  const [selectedSalespersonDetail, setSelectedSalespersonDetail] = useState<SalespersonItem | null>(null);
  const [salespersonFilter, setSalespersonFilter] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE' | 'WITH_PLAQUES' | 'NO_PLAQUES'>('ALL');
  const [salespersonsPage, setSalespersonsPage] = useState(1);
  const [salespersonsPageSize, setSalespersonsPageSize] = useState(10);

  // Detail sub-state
  const [salespersonDetailTab, setSalespersonDetailTab] = useState<'enterprises' | 'reports'>('enterprises');
  const [salespersonDetailFilter, setSalespersonDetailFilter] = useState<'ALL' | 'VISITED' | 'UNVISITED'>('ALL');
  const [salespersonDetailSearch, setSalespersonDetailSearch] = useState('');
  const [salespersonDetailPage, setSalespersonDetailPage] = useState(1);
  const [salespersonDetailPageSize, setSalespersonDetailPageSize] = useState(10);
  const [salespersonDetailReportsFilter, setSalespersonDetailReportsFilter] = useState<'ALL' | 'FORMS' | 'AI_REPORTS'>('ALL');
  const [salespersonReports, setSalespersonReports] = useState<VisitReportItem[]>([]);
  const [salespersonSubmissions, setSalespersonSubmissions] = useState<VisitSubmissionItem[]>([]);
  const [loadingSalespersonReports, setLoadingSalespersonReports] = useState(false);
  const [assigningEnterpriseId, setAssigningEnterpriseId] = useState<number | null>(null);

  useEffect(() => {
    setHeaderTitle("Équipe Commerciale Terrain");
    setSearchPlaceholder("Rechercher un commercial, plaque, commune...");
  }, [setHeaderTitle, setSearchPlaceholder]);

  // Keep selected salesperson updated if parent data changes
  useEffect(() => {
    if (selectedSalespersonDetail && salespersons.length > 0) {
      const refreshed = salespersons.find((s) => s.id === selectedSalespersonDetail.id);
      if (refreshed) setSelectedSalespersonDetail(refreshed);
    }
  }, [salespersons]);

  // Load salesperson activity reports on detail selection
  useEffect(() => {
    if (!selectedSalespersonDetail) {
      setSalespersonReports([]);
      setSalespersonSubmissions([]);
      return;
    }
    let isMounted = true;
    const fetchReports = async () => {
      setLoadingSalespersonReports(true);
      try {
        const [repData, subData] = await Promise.all([
          fetchAPI(`/api/sales/visit-reports/?salesperson_id=${selectedSalespersonDetail.id}`).catch(() => []),
          fetchAPI(`/api/sales/visit-form/submissions/?salesperson_id=${selectedSalespersonDetail.id}`).catch(() => []),
        ]);
        if (isMounted) {
          setSalespersonReports(Array.isArray(repData) ? repData : []);
          setSalespersonSubmissions(Array.isArray(subData) ? subData : []);
        }
      } catch (err) {
        console.error("Erreur récupération comptes-rendus commercial:", err);
      } finally {
        if (isMounted) setLoadingSalespersonReports(false);
      }
    };
    fetchReports();
    return () => {
      isMounted = false;
    };
  }, [selectedSalespersonDetail?.id]);

  // Filtered salespersons list
  const filteredSalespersons = useMemo(() => {
    return salespersons.filter((sp) => {
      if (salespersonFilter === 'AVAILABLE' && !sp.is_available) return false;
      if (salespersonFilter === 'UNAVAILABLE' && sp.is_available) return false;
      if (salespersonFilter === 'WITH_PLAQUES' && (!sp.assigned_plaques || sp.assigned_plaques.length === 0)) return false;
      if (salespersonFilter === 'NO_PLAQUES' && sp.assigned_plaques && sp.assigned_plaques.length > 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          sp.full_name?.toLowerCase().includes(q) ||
          sp.username?.toLowerCase().includes(q) ||
          sp.email?.toLowerCase().includes(q) ||
          sp.location?.toLowerCase().includes(q) ||
          sp.assigned_plaques?.some((pl) => pl.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [salespersons, salespersonFilter, searchQuery]);

  const sortedSalespersons = useMemo(() => {
    return [...filteredSalespersons].sort((a, b) => (b.incentive_points || 0) - (a.incentive_points || 0));
  }, [filteredSalespersons]);

  const paginatedSalespersons = useMemo(() => {
    const start = (salespersonsPage - 1) * salespersonsPageSize;
    return sortedSalespersons.slice(start, start + salespersonsPageSize);
  }, [sortedSalespersons, salespersonsPage, salespersonsPageSize]);

  // Selected salesperson enterprises and KPIs
  const salespersonDetailAccounts = useMemo(() => {
    if (!selectedSalespersonDetail) return [];
    return enterprises.filter((e) => e.assigned_salesperson === selectedSalespersonDetail.id);
  }, [enterprises, selectedSalespersonDetail]);

  const salespersonDetailKpis = useMemo(() => {
    const total = salespersonDetailAccounts.length;
    const visited = salespersonDetailAccounts.filter((e) => e.is_visited).length;
    const unvisited = total - visited;
    const rate = total > 0 ? Math.round((visited / total) * 100) : 0;
    return { total, visited, unvisited, rate };
  }, [salespersonDetailAccounts]);

  const filteredSalespersonDetailAccounts = useMemo(() => {
    return salespersonDetailAccounts.filter((e) => {
      if (salespersonDetailFilter === 'VISITED' && !e.is_visited) return false;
      if (salespersonDetailFilter === 'UNVISITED' && e.is_visited) return false;
      if (salespersonDetailSearch.trim()) {
        const q = salespersonDetailSearch.toLowerCase();
        return (
          e.name?.toLowerCase().includes(q) ||
          e.crm_id?.toLowerCase().includes(q) ||
          e.commune?.toLowerCase().includes(q) ||
          e.sector?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [salespersonDetailAccounts, salespersonDetailFilter, salespersonDetailSearch]);

  const paginatedSalespersonDetailAccounts = useMemo(() => {
    const start = (salespersonDetailPage - 1) * salespersonDetailPageSize;
    return filteredSalespersonDetailAccounts.slice(start, start + salespersonDetailPageSize);
  }, [filteredSalespersonDetailAccounts, salespersonDetailPage, salespersonDetailPageSize]);

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
      {selectedSalespersonDetail ? (
        /* DEDICATED SALESPERSON DETAIL & FIELD ACTIVITY INTERFACE */
        <div className="flex flex-col gap-4">
          {/* Top Header Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedSalespersonDetail(null)}
                className="p-2 rounded-2xl bg-white dark:bg-[#363336] hover:bg-black/5 dark:hover:bg-white/10 text-[#242124] dark:text-white transition-all cursor-pointer inline-flex items-center justify-center border border-black/5 dark:border-white/5 shadow-xs"
                title="Retour"
              >
                <Icons.ArrowLeft size={16} />
              </button>
              <span className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] font-semibold">
                Fiche Commercial Terrain & Visites
              </span>
            </div>
          </div>

          {/* Commercial Profile Header Card */}
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#363336] p-1 border border-black/5 dark:border-white/5 shrink-0 overflow-hidden shadow-xs">
                <img
                  src={selectedSalespersonDetail.profile_picture_url || selectedSalespersonDetail.avatar || '/avatars/default_avatar.svg'}
                  alt={selectedSalespersonDetail.full_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/avatars/default_avatar.svg';
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-[#242124] dark:text-white">
                    {selectedSalespersonDetail.full_name}
                  </h3>
                  {selectedSalespersonDetail.is_available ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                      <Icons.CheckCircle size={10} /> En tournée
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold">
                      En pause
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-[#6E6C67] dark:text-[#A1A1AA] flex-wrap">
                  <span>@{selectedSalespersonDetail.username}</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Icons.Phone size={12} />
                    {selectedSalespersonDetail.phone || 'Non renseigné'}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Icons.Mail size={12} />
                    {selectedSalespersonDetail.email}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Icons.MapPin size={12} />
                    {selectedSalespersonDetail.location || 'Kinshasa'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Plaques attribuées :</span>
                  {selectedSalespersonDetail.assigned_plaques && selectedSalespersonDetail.assigned_plaques.length > 0 ? (
                    selectedSalespersonDetail.assigned_plaques.map((code) => (
                      <span key={code} className="px-2 py-0.5 rounded-md bg-[#4F6CE8]/10 text-[#4F6CE8] font-semibold text-[10px]">
                        {code}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-zinc-400">Aucune plaque attribuée</span>
                  )}
                </div>
              </div>
            </div>

            {/* Performance KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
              <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                <span className="text-[10px] uppercase font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Points Cumulés</span>
                <span className="text-base font-extrabold text-[#4F6CE8]">{selectedSalespersonDetail.incentive_points || 0} pts</span>
              </div>
              <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                <span className="text-[10px] uppercase font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Signatures SOHO</span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{selectedSalespersonDetail.conversions_count || 0}</span>
              </div>
              <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                <span className="text-[10px] uppercase font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Visites Réalisées</span>
                <span className="text-base font-extrabold text-[#242124] dark:text-white">{salespersonDetailKpis.visited} / {salespersonDetailKpis.total}</span>
              </div>
              <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                <span className="text-[10px] uppercase font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Taux Visites</span>
                <span className="text-base font-extrabold text-[#242124] dark:text-white">{salespersonDetailKpis.rate}%</span>
              </div>
            </div>
          </div>

          {/* Sub-Tabs Selector */}
          <div className="flex items-center gap-2 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-2 rounded-2xl border border-black/5 dark:border-white/5 flex-wrap">
            <button
              onClick={() => setSalespersonDetailTab('enterprises')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                salespersonDetailTab === 'enterprises'
                  ? 'bg-[#4F6CE8] text-white shadow-xs'
                  : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
              }`}
            >
              <Icons.Building size={14} />
              <span>Portefeuille & Comptes ({salespersonDetailKpis.total})</span>
            </button>
            <button
              onClick={() => setSalespersonDetailTab('reports')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                salespersonDetailTab === 'reports'
                  ? 'bg-[#4F6CE8] text-white shadow-xs'
                  : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
              }`}
            >
              <Icons.FileText size={14} />
              <span>Rapports de Visite ({salespersonReports.length + salespersonSubmissions.length})</span>
            </button>
          </div>

          {/* SUB-TAB 1: COMPTES ASSIGNÉS & VISITES */}
          {salespersonDetailTab === 'enterprises' && (
            <div className="flex flex-col gap-4">
              {/* Filter Toolbar & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3 rounded-2xl border border-black/5 dark:border-white/5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      setSalespersonDetailFilter('ALL');
                      setSalespersonDetailPage(1);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      salespersonDetailFilter === 'ALL'
                        ? 'bg-[#4F6CE8] text-white shadow-xs'
                        : 'bg-white dark:bg-[#363336] text-[#6E6C67] dark:text-[#A1A1AA] border border-black/5 dark:border-white/5'
                    }`}
                  >
                    Tous ({salespersonDetailKpis.total})
                  </button>
                  <button
                    onClick={() => {
                      setSalespersonDetailFilter('VISITED');
                      setSalespersonDetailPage(1);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      salespersonDetailFilter === 'VISITED'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-[#363336] text-emerald-600 dark:text-emerald-400 border border-black/5 dark:border-white/5'
                    }`}
                  >
                    Visités sur le terrain ({salespersonDetailKpis.visited})
                  </button>
                  <button
                    onClick={() => {
                      setSalespersonDetailFilter('UNVISITED');
                      setSalespersonDetailPage(1);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      salespersonDetailFilter === 'UNVISITED'
                        ? 'bg-[#4F6CE8] text-white shadow-xs'
                        : 'bg-white dark:bg-[#363336] text-[#4F6CE8] border border-black/5 dark:border-white/5'
                    }`}
                  >
                    Pas encore visités ({salespersonDetailKpis.unvisited})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Icons.Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={salespersonDetailSearch}
                    onChange={(e) => {
                      setSalespersonDetailSearch(e.target.value);
                      setSalespersonDetailPage(1);
                    }}
                    placeholder="Rechercher un compte..."
                    className="w-full bg-white dark:bg-[#363336] pl-8 pr-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5 text-xs text-[#242124] dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#4F6CE8]"
                  />
                </div>
              </div>

              {/* Accounts Table */}
              <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden flex flex-col gap-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[800px]">
                    <thead>
                      <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                        <th className="py-3 px-3.5 min-w-[180px]">Entreprise</th>
                        <th className="py-3 px-3.5">Plaque & Commune</th>
                        <th className="py-3 px-3.5">Contact Référent</th>
                        <th className="py-3 px-3.5">Statut Visite</th>
                        <th className="py-3 px-3.5">Statut SOHO</th>
                        <th className="py-3 px-3.5 text-right">Réaffectation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {paginatedSalespersonDetailAccounts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                            Aucun compte assigné ne correspond aux critères sélectionnés.
                          </td>
                        </tr>
                      ) : (
                        paginatedSalespersonDetailAccounts.map((ent) => (
                          <tr key={ent.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <td className="py-3 px-3">
                              <div className="flex flex-col">
                                <span className="font-semibold text-[#242124] dark:text-white">{ent.name}</span>
                                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                                  {ent.crm_id} • {ent.sector}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col">
                                <span className="font-semibold text-xs text-[#4F6CE8]">{ent.plaque_code || ent.plaque || '—'}</span>
                                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{ent.commune || ent.city || 'Kinshasa'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col">
                                <span className="font-550 text-[#242124] dark:text-white">{ent.contact_name || 'Non renseigné'}</span>
                                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{ent.contact_phone || '—'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              {ent.is_visited ? (
                                <div className="flex flex-col">
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1 w-fit">
                                    <Icons.CheckCircle size={10} /> Visité sur le terrain
                                  </span>
                                  {ent.last_visited_at && (
                                    <span className="text-[9px] text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5 pl-1">
                                      le {new Date(ent.last_visited_at).toLocaleDateString()}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => setSalespersonDetailTab('reports')}
                                    className="text-[9px] font-bold text-[#4F6CE8] hover:underline mt-0.5 pl-1 text-left flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>Consulter le rapport</span>
                                    <Icons.ArrowRight size={10} />
                                  </button>
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 text-[10px] font-semibold flex items-center gap-1 w-fit">
                                  <Icons.Clock size={10} /> Pas encore visité
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
                              <select
                                value={ent.assigned_salesperson || ''}
                                onChange={(e) => handleAssignClick(ent.id, e.target.value ? Number(e.target.value) : null)}
                                disabled={assigningEnterpriseId === ent.id}
                                className="bg-white dark:bg-[#363336] text-[11px] font-semibold py-1 px-2 rounded-xl border border-black/5 dark:border-white/5 text-[#242124] dark:text-white cursor-pointer focus:outline-none"
                              >
                                <option value="">Désassigner</option>
                                {salespersons.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.full_name}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <BackofficePagination
                  currentPage={salespersonDetailPage}
                  totalPages={Math.ceil(filteredSalespersonDetailAccounts.length / salespersonDetailPageSize) || 1}
                  totalItems={filteredSalespersonDetailAccounts.length}
                  pageSize={salespersonDetailPageSize}
                  onPageChange={setSalespersonDetailPage}
                  onPageSizeChange={(sz) => {
                    setSalespersonDetailPageSize(sz);
                    setSalespersonDetailPage(1);
                  }}
                  itemName="comptes"
                />
              </div>
            </div>
          )}

          {/* SUB-TAB 2: COMPTES-RENDUS & FORMULAIRES DE VISITE */}
          {salespersonDetailTab === 'reports' && (
            <div className="flex flex-col gap-4">
              {/* Sub-Filters & Counter Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3 rounded-2xl border border-black/5 dark:border-white/5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setSalespersonDetailReportsFilter('ALL')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      salespersonDetailReportsFilter === 'ALL'
                        ? 'bg-[#4F6CE8] text-white shadow-xs'
                        : 'bg-white dark:bg-[#363336] text-[#6E6C67] dark:text-[#A1A1AA] border border-black/5 dark:border-white/5'
                    }`}
                  >
                    Tous les comptes-rendus ({salespersonReports.length + salespersonSubmissions.length})
                  </button>
                  <button
                    onClick={() => setSalespersonDetailReportsFilter('FORMS')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      salespersonDetailReportsFilter === 'FORMS'
                        ? 'bg-[#4F6CE8] text-white shadow-xs'
                        : 'bg-white dark:bg-[#363336] text-[#6E6C67] dark:text-[#A1A1AA] border border-black/5 dark:border-white/5'
                    }`}
                  >
                    Formulaires Guidés ({salespersonSubmissions.length})
                  </button>
                  <button
                    onClick={() => setSalespersonDetailReportsFilter('AI_REPORTS')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      salespersonDetailReportsFilter === 'AI_REPORTS'
                        ? 'bg-[#4F6CE8] text-white shadow-xs'
                        : 'bg-white dark:bg-[#363336] text-[#6E6C67] dark:text-[#A1A1AA] border border-black/5 dark:border-white/5'
                    }`}
                  >
                    Synthèses Dictaphone / IA ({salespersonReports.length})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                    Visites transmises depuis l'application mobile
                  </span>
                </div>
              </div>

              {/* Reports Feed Cards */}
              {loadingSalespersonReports ? (
                <div className="p-8 text-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 flex flex-col items-center justify-center gap-3">
                  <div className="w-6 h-6 border-2 border-[#4F6CE8] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">Chargement des comptes-rendus de visite...</span>
                </div>
              ) : (salespersonReports.length === 0 && salespersonSubmissions.length === 0) ? (
                <div className="p-12 text-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 flex flex-col items-center justify-center gap-2">
                  <Icons.FileText size={32} className="text-zinc-400 mb-1" />
                  <span className="text-sm font-bold text-[#242124] dark:text-white">Aucun compte-rendu de visite enregistré</span>
                  <span className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] max-w-md">
                    Ce commercial n'a pas encore finalisé de visite guidée ou de compte-rendu dictaphone sur son terminal mobile.
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* 1. Form Submissions */}
                  {(salespersonDetailReportsFilter === 'ALL' || salespersonDetailReportsFilter === 'FORMS') &&
                    salespersonSubmissions.map((sub) => (
                      <div
                        key={`sub-${sub.id}`}
                        className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-3 shadow-xs hover:border-black/10 dark:hover:border-white/10 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-extrabold text-[#242124] dark:text-white">
                                {sub.enterprise_name}
                              </h4>
                              <span className="px-2 py-0.5 rounded-full bg-[#4F6CE8]/10 text-[#4F6CE8] text-[10px] font-semibold">
                                Formulaire Guidé
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                                <Icons.CheckCircle size={10} /> Score : {sub.qualification_score}/100
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5 flex-wrap">
                              {sub.plaque_code && <span className="font-semibold text-[#4F6CE8]">{sub.plaque_code}</span>}
                              {sub.enterprise_commune && <span>• {sub.enterprise_commune}</span>}
                              {sub.enterprise_sector && <span>• {sub.enterprise_sector}</span>}
                              <span>• Visité le {new Date(sub.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setSelectedReportToInspect({ ...sub, type: 'SUBMISSION' })}
                              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#363336] text-[#242124] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold border border-black/5 dark:border-white/5 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                            >
                              <Icons.FileText size={13} />
                              <span>Voir les réponses ({sub.answers?.length || 0})</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Offre ciblée :</span>
                            <span className="text-xs font-bold text-[#242124] dark:text-white">{sub.target_offer_name}</span>
                          </div>

                          {sub.ai_summary && (
                            <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 text-xs text-[#242124] dark:text-white whitespace-pre-line leading-relaxed shadow-xs">
                              {sub.ai_summary}
                            </div>
                          )}

                          {sub.detected_needs && sub.detected_needs.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Besoins détectés :</span>
                              {sub.detected_needs.map((need, idx) => (
                                <span key={idx} className="px-2 py-0.5 rounded-md bg-[#4F6CE8]/10 text-[#4F6CE8] text-[10px] font-semibold">
                                  {need}
                                </span>
                              ))}
                            </div>
                          )}

                          {sub.objections_noted && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                              <span className="text-[10px] font-semibold">Points d'attention / Objections :</span>
                              <span>{sub.objections_noted}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                  {/* 2. Dictaphone & AI Visit Reports */}
                  {(salespersonDetailReportsFilter === 'ALL' || salespersonDetailReportsFilter === 'AI_REPORTS') &&
                    salespersonReports.map((rep) => (
                      <div
                        key={`rep-${rep.id}`}
                        className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-3 shadow-xs hover:border-black/10 dark:hover:border-white/10 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-extrabold text-[#242124] dark:text-white">
                                {rep.enterprise_name}
                              </h4>
                              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-semibold">
                                Compte-Rendu Dictaphone / IA
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5 flex-wrap">
                              {rep.plaque_code && <span className="font-semibold text-[#4F6CE8]">{rep.plaque_code}</span>}
                              <span>• Visite enregistrée le {new Date(rep.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setSelectedReportToInspect({ ...rep, type: 'REPORT' })}
                              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#363336] text-[#242124] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold border border-black/5 dark:border-white/5 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                            >
                              <Icons.FileText size={13} />
                              <span>Détails & Plan d'actions</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {rep.executive_summary && (
                            <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 text-xs text-[#242124] dark:text-white whitespace-pre-line leading-relaxed shadow-xs">
                              {rep.executive_summary}
                            </div>
                          )}

                          {rep.confirmed_needs && rep.confirmed_needs.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Besoins confirmés :</span>
                              {rep.confirmed_needs.map((need, idx) => (
                                <span key={idx} className="px-2 py-0.5 rounded-md bg-[#4F6CE8]/10 text-[#4F6CE8] text-[10px] font-semibold">
                                  {need}
                                </span>
                              ))}
                            </div>
                          )}

                          {rep.actions_todo && rep.actions_todo.length > 0 && (
                            <div className="flex flex-col gap-1 mt-1">
                              <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Actions à mener :</span>
                              <ul className="list-disc list-inside text-xs text-[#242124] dark:text-white space-y-0.5">
                                {rep.actions_todo.map((act, idx) => (
                                  <li key={idx}>{act}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* MAIN SALESPERSONS TABLE & OVERVIEW */
        <div className="flex flex-col gap-4">
          {/* Header Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
                {sortedSalespersons.length} commerciaux terrain actifs • Cliquez sur un commercial pour voir ses comptes et visites
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAddSalespersonOpen(true)}
                className="px-3.5 py-1.5 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                <Icons.UserPlus size={14} />
                <span>Ajouter un Commercial</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex items-center gap-1.5 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-2.5 rounded-2xl border border-black/5 dark:border-white/5 flex-wrap">
            {[
              { id: 'ALL', label: `Tous (${salespersons.length})` },
              { id: 'AVAILABLE', label: 'En tournée' },
              { id: 'UNAVAILABLE', label: 'En pause' },
              { id: 'WITH_PLAQUES', label: 'Avec plaques' },
              { id: 'NO_PLAQUES', label: 'Sans plaque' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setSalespersonFilter(f.id as any);
                  setSalespersonsPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  salespersonFilter === f.id
                    ? 'bg-[#4F6CE8] text-white shadow-xs'
                    : 'bg-white dark:bg-[#363336] text-[#6E6C67] dark:text-[#A1A1AA] border border-black/5 dark:border-white/5'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Salespersons Table */}
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden flex flex-col gap-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead>
                  <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                    <th className="py-3 px-3.5 min-w-[180px]">Commercial</th>
                    <th className="py-3 px-3.5">Plaques Affectées</th>
                    <th className="py-3 px-3.5">Points Cumulés</th>
                    <th className="py-3 px-3.5">Signatures SOHO</th>
                    <th className="py-3 px-3.5">Visites Réalisées</th>
                    <th className="py-3 px-3.5">Statut</th>
                    <th className="py-3 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {paginatedSalespersons.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                        Aucun commercial terrain répertorié.
                      </td>
                    </tr>
                  ) : (
                    paginatedSalespersons.map((sp) => (
                      <tr
                        key={sp.id}
                        onClick={() => setSelectedSalespersonDetail(sp)}
                        className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-white dark:bg-[#363336] p-0.5 border border-black/5 dark:border-white/5 overflow-hidden shrink-0">
                              <img
                                src={sp.profile_picture_url || sp.avatar || '/avatars/default_avatar.svg'}
                                alt={sp.full_name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = '/avatars/default_avatar.svg';
                                }}
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-extrabold text-[#242124] dark:text-white hover:text-[#4F6CE8] transition-colors">{sp.full_name}</span>
                              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">@{sp.username} • {sp.phone || 'Non renseigné'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {sp.assigned_plaques && sp.assigned_plaques.length > 0 ? (
                              sp.assigned_plaques.map((plCode) => (
                                <span key={plCode} className="px-2 py-0.5 rounded-md bg-[#4F6CE8]/10 text-[#4F6CE8] font-semibold text-[10px]">
                                  {plCode}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-zinc-400">Aucune plaque</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-extrabold text-xs text-[#4F6CE8]">
                            {sp.incentive_points || 0} pts
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                            {sp.conversions_count || 0}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-[#242124] dark:text-white text-xs">
                            {sp.visits_count || 0} visites
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {sp.is_available ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1 w-fit">
                              <Icons.CheckCircle size={10} /> En tournée
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold w-fit">
                              En pause
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedSalespersonDetail(sp)}
                              className="px-2.5 py-1 rounded-xl bg-[#4F6CE8]/10 hover:bg-[#4F6CE8]/20 text-[#4F6CE8] font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-1 border border-[#4F6CE8]/20"
                              title="Ouvrir la fiche détaillée du commercial"
                            >
                              <Icons.Eye size={12} />
                              <span>Fiche & Visites</span>
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Confirmez-vous la révocation du compte ${sp.full_name} ?`)) {
                                  await fetchAPI(`/api/sales/salespersons/${sp.id}/`, { method: 'DELETE' });
                                  await loadDashboardData();
                                }
                              }}
                              className="p-1.5 rounded-xl hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                              title="Révoquer le compte"
                            >
                              <Icons.Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <BackofficePagination
              currentPage={salespersonsPage}
              totalPages={Math.ceil(sortedSalespersons.length / salespersonsPageSize) || 1}
              totalItems={sortedSalespersons.length}
              pageSize={salespersonsPageSize}
              onPageChange={setSalespersonsPage}
              onPageSizeChange={(sz) => {
                setSalespersonsPageSize(sz);
                setSalespersonsPage(1);
              }}
              itemName="commerciaux"
            />
          </div>
        </div>
      )}

      {/* Add Salesperson Modal */}
      <BackofficeAddSalespersonModal
        isOpen={isAddSalespersonOpen}
        onClose={() => setIsAddSalespersonOpen(false)}
        onCreateSalesperson={handleCreateSalesperson}
      />

      {/* Inspect Report Modal */}
      {selectedReportToInspect && (
        <BackofficeReportInspectModal
          report={selectedReportToInspect}
          onClose={() => setSelectedReportToInspect(null)}
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
