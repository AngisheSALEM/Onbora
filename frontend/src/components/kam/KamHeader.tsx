"use client";

import React, { useMemo } from 'react';
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

  const searchPlaceholder = useMemo(() => {
    if (pathname.includes('/kam/accounts/risk')) return 'Rechercher un compte à risque...';
    if (pathname.includes('/kam/accounts/renewals')) return 'Rechercher un renouvellement...';
    if (pathname.includes('/kam/accounts/upsell')) return 'Rechercher une opportunité d’upsell...';
    if (pathname.includes('/kam/accounts/no-action')) return 'Rechercher un compte sans action...';
    if (pathname.startsWith('/kam/accounts') || pathname === '/kam' || pathname === '/kam/') {
      return 'Rechercher un compte, un signal...';
    }
    if (pathname.startsWith('/kam/agenda')) return 'Rechercher un rendez-vous, un contact...';
    if (pathname.startsWith('/kam/visits')) return 'Rechercher une visite, un rapport...';
    if (pathname.startsWith('/kam/briefing')) return 'Rechercher dans la fiche...';
    return 'Rechercher...';
  }, [pathname]);

  return (
    <header className="h-16 px-6 md:px-8 flex items-center justify-end shrink-0 select-none border-b border-black/5 dark:border-white/5 bg-[#ECEAE5]/80 dark:bg-[#242124]/80 backdrop-blur-md z-20">
      {/* Recherche alignée à droite dans l'espace de travail KAM. */}
      <div className="ml-auto flex items-center gap-3 w-full max-w-md">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-[#F6F5F2] dark:bg-[#2D2A2D] text-zinc-800 dark:text-zinc-200 rounded-full border border-black/5 dark:border-white/5 text-xs font-medium w-full transition-all focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-zinc-600">
          <Icons.Search size={14} className="text-zinc-400 shrink-0" />
          <input
            type="text"
            aria-label="Rechercher dans l'espace KAM"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
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
      </div>

    </header>
  );
}
