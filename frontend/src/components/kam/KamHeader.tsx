"use client";

import React from 'react';
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
  accountName,
  searchQuery: propSearchQuery,
  onSearchChange: propOnSearchChange,
}: KamHeaderProps) {
  const pathname = usePathname() || '';
  
  // Use context search state if props are not explicitly provided
  let contextSearchQuery = '';
  let contextSetSearchQuery: ((q: string) => void) | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const kamContext = useKamContext();
    contextSearchQuery = kamContext.searchQuery;
    contextSetSearchQuery = kamContext.setSearchQuery;
  } catch {
    // Rendered outside KamProvider, fallback to props
  }

  const query = propSearchQuery !== undefined ? propSearchQuery : contextSearchQuery;
  const setQuery = propOnSearchChange || contextSetSearchQuery || (() => {});

  const isAccountsView = activeView === 'accounts' || pathname === '/kam' || pathname === '/kam/' || pathname.startsWith('/kam/accounts');
  const isAgendaView = activeView === 'agenda' || pathname === '/kam/agenda';
  const isVisitsView = activeView === 'visits' || pathname === '/kam/visits';
  const isSettingsView = activeView === 'settings' || pathname === '/kam/settings';
  const isPrepareView = pathname.startsWith('/kam/prepare-visit');
  const isVocalView = pathname.startsWith('/kam/vocal-visit');
  const isBriefingView = activeView === 'briefing' || pathname.startsWith('/kam/briefing');
  const isReportView = activeView === 'report' || pathname.startsWith('/kam/report');

  return (
    <header className="h-16 px-8 flex items-center justify-between shrink-0 select-none border-b border-black/5 dark:border-white/5">
      {/* Left : Dynamic contextual breadcrumb or title */}
      <div className="flex items-center gap-3">
        {isAgendaView && (
          <span className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Agenda & Rendez-vous
          </span>
        )}
        {isVisitsView && (
          <span className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Historique des visites & Comptes-rendus
          </span>
        )}
        {isSettingsView && (
          <span className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Paramètres & FAQ Méthodologique
          </span>
        )}
        {isVocalView && (
          <span className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Brief Vocal Live en Visite</span>
          </span>
        )}
        {isBriefingView && accountName && (
          <span className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Fiche Pré-call : {accountName}
          </span>
        )}
      </div>

      {/* Right : Direct Live Search Input (shown on accounts view) */}
      <div className="flex items-center gap-3">
        {isAccountsView && (
          <div className="flex items-center gap-2.5 px-4 py-1.5 bg-[#F6F5F2]/90 dark:bg-[#2D2A2D] text-zinc-800 dark:text-zinc-200 rounded-full shadow-xs backdrop-blur-md text-xs font-medium w-64 md:w-80 border border-black/5 dark:border-white/5 transition-all focus-within:ring-2 focus-within:ring-[#4F6CE8] focus-within:w-72 md:focus-within:w-96">
            <Icons.Search size={14} className="text-zinc-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un compte, un décideur..."
              className="bg-transparent outline-none w-full text-zinc-900 dark:text-white placeholder-zinc-400 font-medium text-xs"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors cursor-pointer"
                title="Effacer la recherche"
              >
                <Icons.X size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
