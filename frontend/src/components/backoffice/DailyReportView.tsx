"use client";

import React, { useState, useMemo } from 'react';
import { Icons } from '@/components/shared/Icons';
import BackofficePagination from './BackofficePagination';
import UserAvatar from '@/components/kam/UserAvatar';

export interface DailyVisitItem {
  id: string;
  rawId: number;
  type: 'AI_REPORT' | 'GUIDED_FORM';
  created_at: string;
  timeString: string;
  dateString: string;
  salesperson_id?: number;
  salesperson_name: string;
  salesperson_avatar?: string;
  salesperson_profile_picture_url?: string;
  enterprise_id?: number;
  enterprise_name: string;
  enterprise_commune?: string;
  enterprise_sector?: string;
  plaque_code?: string;
  status: string;
  qualification_score?: number;
  executive_summary: string;
  detected_needs: string[];
  objections: string[];
  next_steps: string[];
  target_offer_name?: string;
  rawObject: any;
}

export interface DailyReportViewProps {
  reports: any[];
  submissions: any[];
  salespersons: any[];
  enterprises: any[];
  plaques: any[];
  onOpenReportDetail: (report: any) => void;
  onRefresh: () => void;
  loading: boolean;
}

export default function DailyReportView({
  reports,
  submissions,
  salespersons,
  enterprises,
  plaques,
  onOpenReportDetail,
  onRefresh,
  loading,
}: DailyReportViewProps) {
  // Current local ISO date string "YYYY-MM-DD"
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Filter States
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [dateMode, setDateMode] = useState<'today' | 'yesterday' | 'all' | 'custom'>('today');
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>('ALL');
  const [selectedPlaqueCode, setSelectedPlaqueCode] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Map and unify all visits into DailyVisitItem objects
  const allVisits = useMemo<DailyVisitItem[]>(() => {
    const items: DailyVisitItem[] = [];

    // Helper to find salesperson info
    const spMap = new Map<number, any>();
    salespersons.forEach((sp) => {
      if (sp.id) spMap.set(sp.id, sp);
    });

    // Helper to find enterprise info
    const entMap = new Map<number, any>();
    enterprises.forEach((ent) => {
      if (ent.id) entMap.set(ent.id, ent);
    });

    // 1. Process AI Dictaphone Visit Reports
    (reports || []).forEach((r) => {
      if (!r || !r.id) return;
      const d = r.created_at ? new Date(r.created_at) : new Date();
      const dateStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : todayStr;
      const timeStr = !isNaN(d.getTime())
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '--:--';

      const sp = r.salesperson_id ? spMap.get(r.salesperson_id) : null;
      const ent = r.enterprise_id ? entMap.get(r.enterprise_id) : null;

      items.push({
        id: `rep-${r.id}`,
        rawId: r.id,
        type: 'AI_REPORT',
        created_at: r.created_at || new Date().toISOString(),
        timeString: timeStr,
        dateString: dateStr,
        salesperson_id: r.salesperson_id || sp?.id,
        salesperson_name: r.salesperson_name || sp?.full_name || 'Commercial Terrain',
        salesperson_avatar: sp?.avatar,
        salesperson_profile_picture_url: sp?.profile_picture_url,
        enterprise_id: r.enterprise_id || ent?.id,
        enterprise_name: r.enterprise_name || ent?.name || 'Compte TPE',
        enterprise_commune: ent?.commune || ent?.city,
        enterprise_sector: ent?.sector,
        plaque_code: r.plaque_code || ent?.plaque_code || (typeof ent?.plaque === 'string' ? ent.plaque : ''),
        status: r.confirmed_needs?.length > 0 ? 'Besoins Validés' : 'Visite Réalisée',
        executive_summary: r.executive_summary || '',
        detected_needs: Array.isArray(r.confirmed_needs) ? r.confirmed_needs : [],
        objections: Array.isArray(r.objections_raised) ? r.objections_raised : [],
        next_steps: Array.isArray(r.actions_todo) ? r.actions_todo : [],
        rawObject: { ...r, type: 'REPORT' },
      });
    });

    // 2. Process Guided Visit Form Submissions
    (submissions || []).forEach((s) => {
      if (!s || !s.id) return;
      const d = s.created_at ? new Date(s.created_at) : new Date();
      const dateStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : todayStr;
      const timeStr = !isNaN(d.getTime())
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '--:--';

      const eid = typeof s.enterprise === 'object' ? s.enterprise?.id : s.enterprise;
      const ent = eid ? entMap.get(eid) : null;
      const sid = typeof s.salesperson === 'object' ? s.salesperson?.id : s.salesperson;
      const sp = sid ? spMap.get(sid) : null;

      items.push({
        id: `sub-${s.id}`,
        rawId: s.id,
        type: 'GUIDED_FORM',
        created_at: s.created_at || new Date().toISOString(),
        timeString: timeStr,
        dateString: dateStr,
        salesperson_id: sid || sp?.id,
        salesperson_name: s.salesperson_name || sp?.full_name || 'Commercial Terrain',
        salesperson_avatar: sp?.avatar,
        salesperson_profile_picture_url: sp?.profile_picture_url,
        enterprise_id: eid || ent?.id,
        enterprise_name: s.enterprise_name || ent?.name || 'Compte TPE',
        enterprise_commune: s.enterprise_commune || ent?.commune || ent?.city,
        enterprise_sector: s.enterprise_sector || ent?.sector,
        plaque_code: s.plaque_code || ent?.plaque_code || (typeof ent?.plaque === 'string' ? ent.plaque : ''),
        status: s.qualification_score ? `Score ${s.qualification_score}/100` : (s.status || 'Visite Guidée'),
        qualification_score: s.qualification_score,
        executive_summary: s.ai_summary || '',
        detected_needs: Array.isArray(s.detected_needs) ? s.detected_needs : [],
        objections: s.objections_noted ? [s.objections_noted] : [],
        next_steps: s.next_action ? [s.next_action] : [],
        target_offer_name: s.target_offer_name,
        rawObject: { ...s, type: 'SUBMISSION' },
      });
    });

    // Sort chronologically descending (newest first)
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [reports, submissions, salespersons, enterprises, todayStr]);

  // Yesterday date string
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Filter visits according to selected date, salesperson, plaque, and search
  const filteredVisits = useMemo(() => {
    return allVisits.filter((v) => {
      // Date Filter
      if (dateMode === 'today' && v.dateString !== todayStr) return false;
      if (dateMode === 'yesterday' && v.dateString !== yesterdayStr) return false;
      if (dateMode === 'custom' && v.dateString !== selectedDate) return false;
      // 'all' includes all dates

      // Salesperson Filter
      if (selectedSalespersonId !== 'ALL' && String(v.salesperson_id) !== selectedSalespersonId) {
        return false;
      }

      // Plaque Filter
      if (selectedPlaqueCode !== 'ALL' && v.plaque_code !== selectedPlaqueCode) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = v.enterprise_name.toLowerCase().includes(q);
        const matchesSp = v.salesperson_name.toLowerCase().includes(q);
        const matchesCommune = Boolean(v.enterprise_commune && v.enterprise_commune.toLowerCase().includes(q));
        const matchesSummary = v.executive_summary.toLowerCase().includes(q);
        const matchesNeeds = v.detected_needs.some((n) => n.toLowerCase().includes(q));
        if (!matchesName && !matchesSp && !matchesCommune && !matchesSummary && !matchesNeeds) {
          return false;
        }
      }

      return true;
    });
  }, [allVisits, dateMode, selectedDate, todayStr, yesterdayStr, selectedSalespersonId, selectedPlaqueCode, searchQuery]);

  // Compute Daily KPIs based on filtered visits
  const kpis = useMemo(() => {
    const totalVisits = filteredVisits.length;

    // Distinct active salespersons
    const activeSpSet = new Set<string>();
    filteredVisits.forEach((v) => {
      if (v.salesperson_id) activeSpSet.add(String(v.salesperson_id));
      else if (v.salesperson_name) activeSpSet.add(v.salesperson_name);
    });
    const activeSalespersonsCount = activeSpSet.size;

    // Total detected / identified needs
    const allNeedsSet = new Set<string>();
    let needsCount = 0;
    filteredVisits.forEach((v) => {
      needsCount += v.detected_needs.length;
      v.detected_needs.forEach((need) => allNeedsSet.add(need.trim()));
    });

    // Qualified opportunities (score >= 60, or converted, or needs detected)
    const qualifiedOpportunities = filteredVisits.filter(
      (v) => (v.qualification_score !== undefined && v.qualification_score >= 60) || v.detected_needs.length > 0
    ).length;

    return {
      totalVisits,
      activeSalespersonsCount,
      needsCount: allNeedsSet.size || needsCount,
      qualifiedOpportunities,
    };
  }, [filteredVisits]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredVisits.length / pageSize) || 1;
  const paginatedVisits = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVisits.slice(start, start + pageSize);
  }, [filteredVisits, currentPage, pageSize]);

  // Handle date mode switches
  const handleDateModeChange = (mode: 'today' | 'yesterday' | 'all' | 'custom') => {
    setDateMode(mode);
    setCurrentPage(1);
    if (mode === 'today') setSelectedDate(todayStr);
    if (mode === 'yesterday') setSelectedDate(yesterdayStr);
  };

  return (
    <div className="flex flex-col gap-5 select-none">
      
      {/* Top Banner Toolbar */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#4F6CE8]/10 text-[#4F6CE8] flex items-center justify-center">
              <Icons.FileText size={18} />
            </div>
            <h3 className="text-base font-extrabold text-[#242124] dark:text-white tracking-tight">
              Rapport de la Journée & Activité Terrain
            </h3>
          </div>
          <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] pl-10">
            Suivi chronologique de l'ensemble des visites, comptes-rendus et besoins qualifiés par les commerciaux.
          </p>
        </div>

        {/* Date Selector Pills & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-white dark:bg-[#363336] p-1 rounded-2xl border border-black/5 dark:border-white/5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleDateModeChange('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                dateMode === 'today'
                  ? 'bg-[#4F6CE8] text-white shadow-xs'
                  : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={() => handleDateModeChange('yesterday')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                dateMode === 'yesterday'
                  ? 'bg-[#4F6CE8] text-white shadow-xs'
                  : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
              }`}
            >
              Hier
            </button>
            <button
              type="button"
              onClick={() => handleDateModeChange('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                dateMode === 'all'
                  ? 'bg-[#4F6CE8] text-white shadow-xs'
                  : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
              }`}
            >
              Toutes les dates
            </button>
          </div>

          {/* Custom Date Input */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#363336] px-3 py-1.5 rounded-2xl border border-black/5 dark:border-white/5 shadow-2xs">
            <Icons.Calendar size={14} className="text-[#6E6C67] dark:text-[#A1A1AA]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setDateMode('custom');
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title="Actualiser les visites"
            className="p-2.5 rounded-2xl bg-white dark:bg-[#363336] hover:bg-black/5 dark:hover:bg-white/10 text-[#6E6C67] dark:text-white transition-all cursor-pointer border border-black/5 dark:border-white/5 disabled:opacity-50 shadow-2xs"
          >
            <Icons.Refresh size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Synthetic Daily KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Visites du jour */}
        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
              Visites Réalisées
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#4F6CE8]/10 text-[#4F6CE8] flex items-center justify-center">
              <Icons.FileText size={13} />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-[#242124] dark:text-white mt-1">
            {kpis.totalVisits}
          </span>
          <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
            {dateMode === 'today' ? "Aujourd'hui sur le terrain" : dateMode === 'yesterday' ? "Hier sur le terrain" : "Sur la période filtrée"}
          </span>
        </div>

        {/* KPI 2: Commerciaux actifs */}
        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
              Commerciaux Actifs
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#4F6CE8]/10 text-[#4F6CE8] flex items-center justify-center">
              <Icons.Users size={13} />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-[#4F6CE8] mt-1">
            {kpis.activeSalespersonsCount}
          </span>
          <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
            Sur {salespersons.length} commerciaux répertoriés
          </span>
        </div>

        {/* KPI 3: Besoins identifiés */}
        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
              Besoins Détectés
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Icons.CheckCircle size={13} />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {kpis.needsCount}
          </span>
          <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
            Fibre, Cloud, Sécurité, Outils TPE
          </span>
        </div>

        {/* KPI 4: Opportunités qualifiées */}
        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
              Opportunités Qualifiées
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#4F6CE8]/10 text-[#4F6CE8] flex items-center justify-center">
              <Icons.Target size={13} />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-[#242124] dark:text-white mt-1">
            {kpis.qualifiedOpportunities}
          </span>
          <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
            Prêtes pour conversion ou KAM
          </span>
        </div>
      </div>

      {/* Secondary Filters & Search Bar */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Commercial Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Commercial :</span>
            <select
              value={selectedSalespersonId}
              onChange={(e) => {
                setSelectedSalespersonId(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Tous les commerciaux</option>
              {salespersons.map((sp) => (
                <option key={sp.id} value={String(sp.id)}>
                  {sp.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Plaque Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Plaque :</span>
            <select
              value={selectedPlaqueCode}
              onChange={(e) => {
                setSelectedPlaqueCode(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Toutes les plaques</option>
              {plaques.map((pl) => (
                <option key={pl.id} value={pl.code}>
                  {pl.code} - {pl.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search input in view */}
        <div className="flex items-center gap-2 bg-white dark:bg-[#363336] px-3.5 py-1.5 rounded-2xl border border-black/5 dark:border-white/5 w-full sm:w-64">
          <Icons.Search size={13} className="text-[#6E6C67] dark:text-[#A1A1AA]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Rechercher entreprise, commercial..."
            className="bg-transparent text-xs font-medium text-[#242124] dark:text-white outline-none w-full placeholder-[#6E6C67] dark:placeholder-[#A1A1AA]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer"
            >
              <Icons.X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Chronological Visits Table */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                <th className="py-3 px-3.5 whitespace-nowrap">Heure</th>
                <th className="py-3 px-3.5 min-w-[180px]">Commercial</th>
                <th className="py-3 px-3.5 min-w-[180px]">Compte TPE</th>
                <th className="py-3 px-3.5 min-w-[200px]">Besoins & Objections</th>
                <th className="py-3 px-3.5">Statut & Qualification</th>
                <th className="py-3 px-3.5 text-right">Rapport</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {paginatedVisits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Icons.FileText size={28} className="text-zinc-400" />
                      <span className="font-bold text-[#242124] dark:text-white">
                        Aucune visite enregistrée pour cette sélection
                      </span>
                      <span className="text-[11px] max-w-sm">
                        Modifiez la date, réinitialisez les filtres ou attendez les transmissions des commerciaux depuis le terrain.
                      </span>
                      {dateMode !== 'all' && (
                        <button
                          type="button"
                          onClick={() => handleDateModeChange('all')}
                          className="mt-2 px-3.5 py-1.5 rounded-xl bg-[#4F6CE8] text-white text-xs font-semibold cursor-pointer shadow-xs hover:bg-[#3D5BD9] transition-all"
                        >
                          Afficher toutes les visites historiques
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedVisits.map((visit) => {
                  const avatarSrc =
                    visit.salesperson_profile_picture_url ||
                    visit.salesperson_avatar ||
                    '/avatars/default_avatar.svg';

                  return (
                    <tr
                      key={visit.id}
                      className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      {/* 1. Heure */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-xs text-[#242124] dark:text-white flex items-center gap-1">
                            <Icons.Clock size={11} className="text-[#4F6CE8]" />
                            {visit.timeString}
                          </span>
                          {dateMode === 'all' && (
                            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                              {new Date(visit.created_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                              })}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Commercial */}
                      <td className="py-2.5 px-3.5 min-w-[180px]">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            src={visit.salesperson_profile_picture_url || visit.salesperson_avatar}
                            name={visit.salesperson_name}
                            size="sm"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-[#242124] dark:text-white truncate">
                              {visit.salesperson_name}
                            </span>
                            <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                              {visit.type === 'GUIDED_FORM' ? 'Formulaire Guidé' : 'Dictaphone IA'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Compte TPE */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col min-w-0">
                          <span className="font-extrabold text-[#242124] dark:text-white truncate">
                            {visit.enterprise_name}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                            {visit.plaque_code && (
                              <span className="px-1.5 py-0.2 rounded bg-[#4F6CE8]/10 text-[#4F6CE8] font-bold">
                                {visit.plaque_code}
                              </span>
                            )}
                            <span>{visit.enterprise_commune || 'Kinshasa'}</span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Besoins & Objections */}
                      <td className="py-3.5 px-3 max-w-xs">
                        <div className="flex flex-col gap-1">
                          {visit.detected_needs.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {visit.detected_needs.slice(0, 2).map((need, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md bg-[#4F6CE8]/10 text-[#4F6CE8] font-semibold text-[10px] truncate max-w-[140px]"
                                  title={need}
                                >
                                  {need}
                                </span>
                              ))}
                              {visit.detected_needs.length > 2 && (
                                <span className="text-[9px] text-[#6E6C67] dark:text-[#A1A1AA] self-center">
                                  +{visit.detected_needs.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] italic">
                              Aucun besoin formulé
                            </span>
                          )}

                          {visit.objections.length > 0 && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate max-w-[180px]">
                              Contrainte : {visit.objections[0]}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Statut & Qualification */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {visit.qualification_score !== undefined ? (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            visit.qualification_score >= 70
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : visit.qualification_score >= 50
                              ? 'bg-[#4F6CE8]/15 text-[#4F6CE8]'
                              : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                          }`}>
                            <Icons.CheckCircle size={10} />
                            <span>Score {visit.qualification_score}/100</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] inline-flex items-center gap-1">
                            <Icons.CheckCircle size={10} />
                            <span>Visite Réalisée</span>
                          </span>
                        )}
                      </td>

                      {/* 6. Action : Consulter le rapport */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenReportDetail(visit.rawObject)}
                          className="px-3 py-1.5 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                          title="Consulter les détails du rapport de visite"
                        >
                          <Icons.FileText size={12} />
                          <span>Détails</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Numbered Pagination */}
        <BackofficePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredVisits.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemName="visites"
        />
      </div>
    </div>
  );
}
