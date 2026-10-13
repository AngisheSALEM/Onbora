"use client";

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Icons } from '@/components/shared/Icons';
import { KamView } from './KamSidebar';
import { useKamContext } from './KamContext';

interface KamHeaderProps {
  activeView?: KamView;
  accountName?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function KamHeader({
  activeView,
  searchQuery: propSearchQuery,
  onSearchChange: propOnSearchChange,
}: KamHeaderProps) {
  const pathname = usePathname() || '';

  let kamContext: ReturnType<typeof useKamContext> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    kamContext = useKamContext();
  } catch {
    // Rendered outside KamProvider, fallback to props
  }

  const query = propSearchQuery !== undefined ? propSearchQuery : (kamContext?.searchQuery || '');
  const setQuery = propOnSearchChange || kamContext?.setSearchQuery || (() => {});

  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setShowDateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setShowFilterDropdown(false);
    setShowDateDropdown(false);
  }, [pathname]);

  const searchPlaceholder = useMemo(() => {
    if (pathname.includes('/kam/accounts/risk')) return 'Rechercher un compte à risque dans ONBORA...';
    if (pathname.includes('/kam/accounts/renewals')) return 'Rechercher un renouvellement sous 90j...';
    if (pathname.includes('/kam/accounts/upsell')) return 'Rechercher une opportunité d’upsell...';
    if (pathname.includes('/kam/accounts/no-action')) return 'Rechercher un compte sans engagement...';
    if (pathname.startsWith('/kam/accounts') || pathname === '/kam' || pathname === '/kam/') {
      return 'Rechercher un compte, un secteur, un contact dans ONBORA...';
    }
    if (pathname.startsWith('/kam/agenda')) return 'Rechercher un rendez-vous, un contact...';
    if (pathname.startsWith('/kam/visits')) return 'Rechercher une visite, un compte-rendu...';
    if (pathname.startsWith('/kam/briefing') || pathname.startsWith('/kam/prepare-visit')) return 'Rechercher dans le briefing...';
    if (pathname.startsWith('/kam/settings')) return 'Rechercher dans les paramètres...';
    return 'Rechercher dans ONBORA...';
  }, [pathname]);

  const filterOptions = kamContext?.filterOptions || [];
  const activeFilter = kamContext?.activeFilter || 'ALL';
  const setActiveFilter = kamContext?.setActiveFilter || (() => {});
  const filterCategoryLabel = kamContext?.filterCategoryLabel || 'FILTRER PAR STATUT';

  const dateFilter = kamContext?.dateFilter || 'ALL';
  const setDateFilter = kamContext?.setDateFilter || (() => {});

  const dateOptions = [
    { id: 'ALL', label: 'Toutes les dates' },
    { id: 'TODAY', label: "Aujourd'hui" },
    { id: 'WEEK', label: 'Cette semaine' },
    { id: 'MONTH', label: 'Ce mois' },
    { id: 'UPCOMING', label: 'À venir' },
  ];

  const activeDateLabel = dateOptions.find((d) => d.id === dateFilter)?.label || 'Toutes les dates';

  return (
    <header className="h-16 px-6 md:px-8 flex items-center justify-between gap-4 shrink-0 select-none bg-[#ECEAE5]/80 dark:bg-[#242124]/80 backdrop-blur-md z-30">
      {/* Search Input Bar (Pilule épurée style Image 2 avec zéro bordure intérieure) */}
      <div className="flex-1 max-w-2xl md:max-w-3xl relative" ref={filterDropdownRef}>
        <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-[#2D2A2D] text-zinc-800 dark:text-zinc-200 rounded-full border border-black/8 dark:border-white/10 text-xs font-medium w-full transition-all focus-within:ring-2 focus-within:ring-zinc-400/20 dark:focus-within:ring-zinc-600/30 shadow-xs">
          <Icons.Search size={16} className="text-zinc-400 shrink-0 ml-0.5" />
          <input
            type="text"
            aria-label="Rechercher dans ONBORA"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 shadow-none flex-1 min-w-0 text-zinc-900 dark:text-white placeholder-zinc-400 font-normal text-xs md:text-sm px-1 py-0.5"
          />

          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors cursor-pointer shrink-0"
              title="Effacer la recherche"
            >
              <Icons.X size={13} />
            </button>
          )}

          {/* Bouton Filtre (Sliders icon) - ZÉRO ligne de séparation comme sur l'image 2 */}
          {filterOptions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowFilterDropdown((prev) => !prev)}
              className={`p-1.5 rounded-full transition-colors cursor-pointer flex items-center justify-center shrink-0 relative ${
                activeFilter !== 'ALL' || showFilterDropdown
                  ? 'bg-[#4F6CE8]/10 text-[#4F6CE8]'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              title="Filtrer"
            >
              <Icons.Sliders size={15} />
              {activeFilter !== 'ALL' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#4F6CE8] absolute top-1 right-1" />
              )}
            </button>
          )}
        </div>

        {/* Dropdown Filtres contextuels (Style Procezo) */}
        {showFilterDropdown && filterOptions.length > 0 && (
          <div className="absolute left-0 right-0 sm:left-auto sm:right-0 sm:w-72 top-full mt-2 z-40 bg-white dark:bg-[#1E1B1E] rounded-2xl shadow-xl border border-black/10 dark:border-white/10 p-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              {filterCategoryLabel}
            </div>
            <div className="space-y-0.5">
              {filterOptions.map((opt) => {
                const isActive = activeFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setActiveFilter(opt.id);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#4F6CE8]/10 text-[#4F6CE8] font-bold'
                        : 'text-zinc-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-4 flex items-center justify-center shrink-0">
                        {isActive && <Icons.Check size={13} className="text-[#4F6CE8]" />}
                      </span>
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {opt.count !== undefined && (
                      <span className="text-[11px] font-mono text-zinc-400 ml-2 shrink-0">
                        {opt.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Date Filter Dropdown (Toutes les dates ˅) */}
      <div className="relative shrink-0" ref={dateDropdownRef}>
        <button
          type="button"
          onClick={() => setShowDateDropdown((prev) => !prev)}
          className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-[#2D2A2D] hover:bg-zinc-50 dark:hover:bg-[#363336] text-zinc-700 dark:text-zinc-200 rounded-full border border-black/8 dark:border-white/10 text-xs font-semibold transition-all cursor-pointer shadow-xs"
        >
          <Icons.Calendar size={13} className="text-zinc-500" />
          <span className="truncate max-w-[120px] sm:max-w-none">{activeDateLabel}</span>
          <Icons.ChevronDown size={12} className="text-zinc-400" />
        </button>

        {showDateDropdown && (
          <div className="absolute right-0 top-full mt-2 w-48 z-40 bg-white dark:bg-[#1E1B1E] rounded-2xl shadow-xl border border-black/10 dark:border-white/10 p-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Filtrer par date
            </div>
            <div className="space-y-0.5">
              {dateOptions.map((opt) => {
                const isActive = dateFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setDateFilter(opt.id);
                      setShowDateDropdown(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#4F6CE8]/10 text-[#4F6CE8] font-bold'
                        : 'text-zinc-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 font-medium'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isActive && <Icons.Check size={13} className="text-[#4F6CE8]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
