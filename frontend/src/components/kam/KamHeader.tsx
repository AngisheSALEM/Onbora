"use client";

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
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

  const [localScrolled, setLocalScrolled] = useState(false);

  // Dynamic Scroll Listener capturing scroll events across all KAM views
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target;
      if (target instanceof HTMLElement) {
        if (target.clientHeight > 180) {
          const isDeepScrolled = target.scrollTop > 20;
          setLocalScrolled(isDeepScrolled);
          if (kamContext?.setIsScrolled) {
            kamContext.setIsScrolled(isDeepScrolled);
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [kamContext]);

  // Reset scroll on navigation
  useEffect(() => {
    setLocalScrolled(false);
    if (kamContext?.setIsScrolled) {
      kamContext.setIsScrolled(false);
    }
  }, [pathname, kamContext]);

  // Determine Title, Subtitle and Back navigation based on current route
  const pageMeta = useMemo(() => {
    if (pathname.includes('/kam/accounts/risk')) {
      return {
        title: 'Comptes à risque élevé',
        subtitle: 'Signaux de fragilité et d’attrition identifiés',
        backHref: '/kam/accounts',
      };
    }
    if (pathname.includes('/kam/accounts/renewals')) {
      return {
        title: 'Renouvellements à surveiller',
        subtitle: 'Contrats arrivant à échéance sous 90 jours',
        backHref: '/kam/accounts',
      };
    }
    if (pathname.includes('/kam/accounts/upsell')) {
      return {
        title: 'Opportunités d’upsell',
        subtitle: 'Potentiels d’expansion et nouvelles offres',
        backHref: '/kam/accounts',
      };
    }
    if (pathname.includes('/kam/accounts/no-action')) {
      return {
        title: 'Sans prochaine action',
        subtitle: 'Comptes inactifs depuis plus de 14 jours',
        backHref: '/kam/accounts',
      };
    }
    if (pathname.includes('/kam/accounts/all')) {
      return {
        title: 'Tous mes comptes B2B',
        subtitle: 'Annuaire complet du portefeuille',
        backHref: '/kam/accounts',
      };
    }
    if (pathname.startsWith('/kam/accounts') || pathname === '/kam' || pathname === '/kam/') {
      return {
        title: 'Portefeuille',
        subtitle: null,
        backHref: null,
      };
    }
    if (pathname.startsWith('/kam/agenda')) {
      return {
        title: 'Rendez-vous',
        subtitle: null,
        backHref: null,
      };
    }
    if (pathname.startsWith('/kam/visits')) {
      return {
        title: 'Historique des visites',
        subtitle: null,
        backHref: null,
      };
    }
    if (pathname.startsWith('/kam/settings')) {
      return {
        title: 'Paramètres',
        subtitle: null,
        backHref: null,
      };
    }
    if (pathname.startsWith('/kam/prepare-visit') || pathname.startsWith('/kam/briefing')) {
      return {
        title: 'Briefing Pré-Visite',
        subtitle: null,
        backHref: '/kam/agenda',
      };
    }
    if (pathname.startsWith('/kam/vocal-visit')) {
      return {
        title: 'Compte-Rendu Vocal',
        subtitle: null,
        backHref: '/kam/agenda',
      };
    }
    if (pathname.startsWith('/kam/report')) {
      return {
        title: 'Rapport de visite',
        subtitle: null,
        backHref: '/kam/visits',
      };
    }
    return {
      title: 'Portefeuille',
      subtitle: null,
      backHref: null,
    };
  }, [pathname]);

  const activeTitle = kamContext?.headerTitle || pageMeta.title;
  const activeSubtitle = kamContext?.headerSubtitle || pageMeta.subtitle;
  const activeBackHref = kamContext?.headerBackLink !== undefined && kamContext?.headerBackLink !== null
    ? kamContext.headerBackLink
    : pageMeta.backHref;

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
    <header
      className={`px-6 md:px-8 flex items-center justify-between shrink-0 select-none border-b transition-all duration-300 ease-out z-20 ${
        localScrolled
          ? 'h-14 bg-[#ECEAE5]/95 dark:bg-[#242124]/95 backdrop-blur-lg border-black/10 dark:border-white/10 shadow-xs'
          : 'h-20 bg-[#ECEAE5]/80 dark:bg-[#242124]/80 backdrop-blur-md border-black/5 dark:border-white/5'
      }`}
    >
      {/* Title & Navigation on the left */}
      <div className="flex items-center gap-3 min-w-0 mr-4">
        {activeBackHref && (
          <Link
            href={activeBackHref}
            className="p-2 rounded-xl bg-white/70 dark:bg-black/30 hover:bg-white dark:hover:bg-black/50 text-zinc-600 dark:text-zinc-300 border border-black/5 dark:border-white/5 transition-colors cursor-pointer shrink-0"
            title="Retour"
          >
            <Icons.ArrowLeft size={15} />
          </Link>
        )}

        <div className="flex flex-col min-w-0 justify-center">
          <h1
            className={`font-black text-zinc-900 dark:text-white tracking-tight truncate transition-all duration-300 origin-left ${
              localScrolled
                ? 'text-sm md:text-base'
                : 'text-2xl md:text-3xl'
            }`}
          >
            {activeTitle}
          </h1>

          {!localScrolled && activeSubtitle && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
              {activeSubtitle}
            </p>
          )}
        </div>
      </div>

      {/* Search Input on the right */}
      <div className="flex items-center gap-3 w-full max-w-xs sm:max-w-sm md:max-w-md shrink-0">
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
