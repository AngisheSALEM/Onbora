"use client";

import React, { useState } from 'react';
import { StrategicVisit } from './kamTypes';
import { Icons } from '@/components/shared/Icons';

interface KamAccountsListViewProps {
  visits: StrategicVisit[];
  searchQuery?: string;
  onSelectAccount: (visit: StrategicVisit) => void;
  onOpenBriefing: (visit: StrategicVisit) => void;
  onOpenDebrief: (visit: StrategicVisit) => void;
  onOpenCreateAccount?: () => void;
}

const formatNumber = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export type AccountSegmentFilter = 'ALL' | 'ENTERPRISE' | 'MID_MARKET' | 'SMALL_BUSINESS';

export default function KamAccountsListView({
  visits,
  searchQuery = '',
  onSelectAccount,
  onOpenBriefing,
  onOpenDebrief,
  onOpenCreateAccount
}: KamAccountsListViewProps) {
  // Filter States
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedSegment, setSelectedSegment] = useState<AccountSegmentFilter>('ALL');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);
  const [expandedSectors, setExpandedSectors] = useState<Record<string, boolean>>({});

  const toggleSectorExpand = (title: string) => {
    setExpandedSectors((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // Helper to determine segment (used strictly for filtering criteria, not for badge display)
  const isAccountInSegment = (visit: StrategicVisit, seg: AccountSegmentFilter) => {
    if (seg === 'ALL') return true;
    const mrr = visit.briefing.orange_relationship.mrr_current;
    const headcount = visit.briefing.firmographics.headcount;
    const sites = visit.briefing.firmographics.locations_count;

    if (seg === 'ENTERPRISE') {
      // Grand Compte: MRR >= 30k€, ou +1000 employés, ou +30 agences
      return mrr >= 30000 || headcount >= 1000 || sites >= 30;
    }
    if (seg === 'MID_MARKET') {
      // PME / Moyen Compte: 10k€ à 30k€
      return mrr >= 10000 && mrr < 30000;
    }
    if (seg === 'SMALL_BUSINESS') {
      // Petit compte: < 10k€
      return mrr < 10000;
    }
    return true;
  };

  // Filter accounts according to search query, sector & segment
  const filteredVisits = visits.filter((v) => {
    // 0. Live Search Input Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesName = v.account_name.toLowerCase().includes(q);
      const matchesIndustry = v.briefing.industry.toLowerCase().includes(q);
      const matchesStakeholder = v.briefing.stakeholders_mapping.some(
        (stk) =>
          stk.full_name.toLowerCase().includes(q) ||
          stk.job_title.toLowerCase().includes(q)
      );
      if (!matchesName && !matchesIndustry && !matchesStakeholder) {
        return false;
      }
    }

    // 1. Sector Filter
    if (selectedSector !== 'ALL') {
      if (selectedSector === 'BANQUE' && !v.briefing.industry.includes('Banque') && !v.briefing.industry.includes('Fintech')) {
        return false;
      }
      if (selectedSector === 'PUBLIC' && !v.briefing.industry.includes('Public') && !v.briefing.industry.includes('Gouvernement')) {
        return false;
      }
      if (selectedSector === 'TRANSPORT' && !v.briefing.industry.includes('Transport') && !v.briefing.industry.includes('Logistique')) {
        return false;
      }
    }

    // 2. Size / Segment Filter
    if (!isAccountInSegment(v, selectedSegment)) {
      return false;
    }

    return true;
  });

  const activeFiltersCount = (selectedSector !== 'ALL' ? 1 : 0) + (selectedSegment !== 'ALL' ? 1 : 0);

  const handleResetFilters = () => {
    setSelectedSector('ALL');
    setSelectedSegment('ALL');
  };

  // Group filtered visits by sector / industry, sorted by operational priority
  // Priority criteria: recent incident/churn risk first, then highest MRR
  const sortAccountsByPriority = (accountsList: StrategicVisit[]) => {
    return [...accountsList].sort((a, b) => {
      const aHasIncident = a.briefing.orange_relationship.recent_incidents_count_30d > 0 ? 1 : 0;
      const bHasIncident = b.briefing.orange_relationship.recent_incidents_count_30d > 0 ? 1 : 0;
      if (bHasIncident !== aHasIncident) return bHasIncident - aHasIncident;

      return b.briefing.orange_relationship.mrr_current - a.briefing.orange_relationship.mrr_current;
    });
  };

  const sectors = [
    {
      title: 'Banque & Services Financiers',
      accounts: sortAccountsByPriority(
        filteredVisits.filter((v) => v.briefing.industry.includes('Banque') || v.briefing.industry.includes('Fintech'))
      )
    },
    {
      title: 'Secteur Public & Gouvernement',
      accounts: sortAccountsByPriority(
        filteredVisits.filter((v) => v.briefing.industry.includes('Public') || v.briefing.industry.includes('Gouvernement'))
      )
    },
    {
      title: 'Transport, Logistique & Industrie',
      accounts: sortAccountsByPriority(
        filteredVisits.filter((v) => v.briefing.industry.includes('Transport') || v.briefing.industry.includes('Logistique'))
      )
    },
    {
      title: 'Autres Secteurs & Nouveaux Comptes',
      accounts: sortAccountsByPriority(
        filteredVisits.filter((v) =>
          !v.briefing.industry.includes('Banque') &&
          !v.briefing.industry.includes('Fintech') &&
          !v.briefing.industry.includes('Public') &&
          !v.briefing.industry.includes('Gouvernement') &&
          !v.briefing.industry.includes('Transport') &&
          !v.briefing.industry.includes('Logistique')
        )
      )
    }
  ];

  return (
    <div className="flex-1 flex flex-col gap-6 p-8 overflow-y-auto select-none">
      
      {/* 1. TOP TOOLBAR : OVERVIEW & FILTER CONTROLS */}
      <div className="flex flex-col gap-3 pb-2 border-b border-zinc-200/80 dark:border-white/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Portefeuille des Comptes Clés
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Suivi opérationnel, segmentation stratégique et accès direct aux fiches 360°.
            </p>
          </div>

          {/* Action Buttons : Filter Capsule + Add Account */}
          <div className="flex items-center gap-2.5">
            
            {/* Filter Toggle Button */}
            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95 ${
                activeFiltersCount > 0 || isFilterPanelOpen
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-[#F6F5F2] dark:bg-[#2D2A2D] hover:bg-white dark:hover:bg-[#363336] text-zinc-700 dark:text-zinc-200 border border-black/5 dark:border-white/5'
              }`}
            >
              <Icons.Filter size={15} />
              <span>Filtrer</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white text-blue-600 text-[10px] font-extrabold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Quick Reset Button if active */}
            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white px-2 py-1 transition-colors cursor-pointer"
                title="Effacer tous les filtres"
              >
                Réinitialiser
              </button>
            )}

            {/* Add Account Button */}
            {onOpenCreateAccount && (
              <button
                onClick={onOpenCreateAccount}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#E4E1DB] dark:bg-[#363336] hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-full text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                <Icons.Plus size={15} />
                <span>Nouveau Compte</span>
              </button>
            )}

          </div>
        </div>

        {/* Expandable Filter Capsule Panel */}
        {isFilterPanelOpen && (
          <div className="mt-2 p-5 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
            
            {/* Filter 1 : Secteur d'Activité */}
            <div className="space-y-1.5 w-full md:w-auto">
              <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                Secteur d&apos;Activité
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'ALL', label: 'Tous les Secteurs' },
                  { id: 'BANQUE', label: 'Banque & Finance' },
                  { id: 'PUBLIC', label: 'Secteur Public' },
                  { id: 'TRANSPORT', label: 'Transport & Logistique' }
                ].map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => setSelectedSector(sec.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      selectedSector === sec.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-[#ECEAE5] dark:bg-[#191816] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {sec.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter 2 : Segmentation Taille (Grand Compte, PME, Petit Compte) */}
            <div className="space-y-1.5 w-full md:w-auto">
              <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                Segmentation Client
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'ALL', label: 'Toutes les Tailles' },
                  { id: 'ENTERPRISE', label: 'Grands Comptes (> 30k€)' },
                  { id: 'MID_MARKET', label: 'PME / Moyens (10k€ - 30k€)' },
                  { id: 'SMALL_BUSINESS', label: 'Petits Comptes (< 10k€)' }
                ].map((seg) => (
                  <button
                    key={seg.id}
                    onClick={() => setSelectedSegment(seg.id as AccountSegmentFilter)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      selectedSegment === seg.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-[#ECEAE5] dark:bg-[#191816] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {seg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Count Badge */}
            <div className="pt-2 md:pt-0 shrink-0 text-xs font-550 text-zinc-500">
              {filteredVisits.length} {filteredVisits.length > 1 ? 'comptes correspondants' : 'compte correspondant'}
            </div>

          </div>
        )}
      </div>

      {/* 2. GROUPED SECTORAL GRIDS */}
      <div className="space-y-8">
        {filteredVisits.length === 0 ? (
          <div className="p-12 text-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[32px] border border-black/5 dark:border-white/5 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#ECEAE5] dark:bg-[#191816] mx-auto flex items-center justify-center text-zinc-400">
              <Icons.Search size={22} />
            </div>
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">
              Aucun compte ne correspond à votre recherche
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {searchQuery
                ? `Aucun résultat pour « ${searchQuery} ». Vérifiez l'orthographe ou effacez la recherche.`
                : 'Modifiez le secteur ou la taille sélectionnée, ou réinitialisez les filtres.'}
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          sectors.map((sec) => {
            if (sec.accounts.length === 0) return null;

            const isExpanded = !!expandedSectors[sec.title];
            // Display top 2 priority accounts by default, or all if expanded
            const displayedAccounts = isExpanded ? sec.accounts : sec.accounts.slice(0, 2);
            const hasMore = sec.accounts.length > 2;

            return (
              <div key={sec.title} className="space-y-4">
                
                {/* Category Title Header with "Voir tout (N)" */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white tracking-tight">
                      {sec.title}
                    </h3>
                    <span className="text-xs font-semibold text-zinc-500">
                      ({sec.accounts.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* "Voir tout" / "Réduire" Button */}
                    {hasMore && (
                      <button
                        onClick={() => toggleSectorExpand(sec.title)}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>{isExpanded ? 'Réduire' : `Voir tout (${sec.accounts.length})`}</span>
                        <Icons.ChevronRight size={14} className={isExpanded ? '-rotate-90 transition-transform' : 'transition-transform'} />
                      </button>
                    )}

                    {/* Add Account Shortcut */}
                    {onOpenCreateAccount && (
                      <button
                        onClick={onOpenCreateAccount}
                        className="px-3 py-1 bg-[#E4E1DB] dark:bg-[#363336] hover:bg-blue-600 hover:text-white text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Icons.Plus size={14} />
                        <span>Ajouter</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {displayedAccounts.map((visit) => {
                    const briefing = visit.briefing;
                    const isHealthy = briefing.orange_relationship.recent_incidents_count_30d === 0;

                    return (
                      <div
                        key={visit.id}
                        onClick={() => onSelectAccount(visit)}
                        className="group bg-[#F6F5F2] dark:bg-[#2D2A2D] hover:bg-white dark:hover:bg-[#363336] rounded-[28px] p-6 shadow-sm hover:shadow-md border border-black/5 dark:border-white/5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          {/* Top Row : Avatar + Clean Status Badges */}
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-[#E4E1DB] dark:bg-[#363336] text-zinc-900 dark:text-white flex items-center justify-center font-extrabold text-lg">
                                {visit.account_name.charAt(0)}
                              </div>
                              {visit.crm_id && (
                                <span className="text-[10px] font-mono text-zinc-400 font-semibold">
                                  {visit.crm_id}
                                </span>
                              )}
                            </div>

                            {/* Conversion Status Badge */}
                            <div className="flex flex-col items-end gap-1">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 ${
                                visit.conversion_status === 'CONVERTED'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : visit.conversion_status === 'IN_NEGOTIATION'
                                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                  : visit.conversion_status === 'LOST'
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  visit.conversion_status === 'CONVERTED' ? 'bg-emerald-500' :
                                  visit.conversion_status === 'IN_NEGOTIATION' ? 'bg-blue-500' :
                                  visit.conversion_status === 'LOST' ? 'bg-rose-500' : 'bg-amber-500'
                                }`} />
                                <span>
                                  {visit.conversion_status === 'CONVERTED' ? 'Contrat Signé' :
                                   visit.conversion_status === 'IN_NEGOTIATION' ? 'En négociation' :
                                   visit.conversion_status === 'LOST' ? 'Perdu' : 'Prospect'}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Account Name & Info */}
                          <h4 className="text-base font-semibold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                            {visit.account_name}
                          </h4>

                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                            {briefing.firmographics.business_model_summary}
                          </p>

                          {/* Quick Specs */}
                          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-zinc-200/60 dark:border-white/5 text-xs">
                            <div>
                              <span className="text-[10px] font-semibold text-zinc-400 uppercase block">MRR Orange</span>
                              <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                                {formatNumber(briefing.orange_relationship.mrr_current)} € / m
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold text-zinc-400 uppercase block">Part Marché</span>
                              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                                {briefing.orange_relationship.wallet_share_percentage}% SOW
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Action Footer */}
                        <div className="mt-5 pt-3 border-t border-zinc-200/60 dark:border-white/5 flex items-center justify-between">
                          <span className="text-[11px] font-550 text-zinc-500">
                            {briefing.firmographics.locations_count} sites connectés
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenBriefing(visit);
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm"
                          >
                            Briefing 360°
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
