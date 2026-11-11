"use client";

import React, { useMemo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icons } from '@/components/shared/Icons';
import { KamView } from './KamSidebar';
import { useKamContext } from './KamContext';
import { B2BNewsItem } from './kamTypes';

interface KamHeaderProps {
  activeView?: KamView;
  accountName?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const cleanHeadline = (text?: string) => (text || '').replace(/^\[.*?\]\s*/, '').trim();

const formatRelativeTime = (isoString?: string) => {
  if (!isoString) return "Récemment";
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return "À l'instant";
    if (diffHours === 1) return "Il y a 1h";
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Hier";
    return `Il y a ${diffDays}j`;
  } catch {
    return "Récemment";
  }
};

export default function KamHeader({
  searchQuery: propSearchQuery,
  onSearchChange: propOnSearchChange,
}: KamHeaderProps) {
  const pathname = usePathname() || '';
  const router = useRouter();

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
  const [showNotifications, setShowNotifications] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const strongSignals = kamContext?.strongSignals || [];
  const unreadStrongCount = strongSignals.filter((s) => !s.is_read).length;
  const hasUnread = unreadStrongCount > 0;

  const handleMarkAllAsRead = async () => {
    if (kamContext?.markAllNewsAsRead) {
      await kamContext.markAllNewsAsRead();
    }
  };

  const handleNotificationClick = async (item: B2BNewsItem) => {
    if (kamContext?.markArticleAsRead) {
      await kamContext.markArticleAsRead(item.id);
    }
    setShowNotifications(false);
    router.push(item.is_web_discovery ? '/kam/feed/leads' : '/kam/feed/portfolio');
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on route change
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setShowFilterDropdown(false);
    setShowNotifications(false);
  }

  const searchPlaceholder = useMemo(() => {
    if (pathname.includes('/kam/accounts/risk')) return 'Rechercher un compte à risque dans ONBORA...';
    if (pathname.includes('/kam/accounts/renewals')) return 'Rechercher un renouvellement sous 90j...';
    if (pathname.includes('/kam/accounts/upsell')) return 'Rechercher une opportunité d’upsell...';
    if (pathname.includes('/kam/accounts/no-action')) return 'Rechercher un compte sans engagement...';
    if (pathname.startsWith('/kam/accounts') || pathname === '/kam' || pathname === '/kam/') {
      return 'Rechercher un compte, un secteur, un contact dans ONBORA...';
    }
    if (pathname.startsWith('/kam/feed/leads')) return 'Rechercher un nouveau lead...';
    if (pathname.startsWith('/kam/feed')) return 'Rechercher une actualité du portefeuille...';
    if (pathname.startsWith('/kam/agenda')) return 'Rechercher un rendez-vous, un contact...';
    if (pathname.startsWith('/kam/visits')) return 'Rechercher une visite, un compte-rendu...';
    if (pathname.startsWith('/kam/briefing') || pathname.startsWith('/kam/prepare-visit')) return 'Rechercher dans le briefing...';
    if (pathname.startsWith('/kam/settings')) return 'Rechercher dans les paramètres...';
    return 'Rechercher dans ONBORA...';
  }, [pathname]);

  const filterOptions = kamContext?.filterOptions || [];
  const activeFilter = kamContext?.activeFilter || 'ALL';
  const setActiveFilter = kamContext?.setActiveFilter || (() => {});
  const filterCategoryLabel = kamContext?.filterCategoryLabel || 'FILTRER';

  return (
    <header className="pt-4 pb-2 px-6 md:px-8 flex items-start justify-between gap-4 shrink-0 select-none bg-[#ECEAE5]/80 dark:bg-[#242124]/80 backdrop-blur-md z-30">
      {/* Search Input Bar (Pilule épurée style Image 2 avec zéro bordure intérieure) */}
      <div className="flex-1 max-w-2xl md:max-w-3xl relative" ref={filterDropdownRef}>
        <div className="flex items-center gap-3 px-4 h-10 bg-white dark:bg-[#2D2A2D] text-zinc-800 dark:text-zinc-200 rounded-full border border-black/8 dark:border-white/10 text-xs font-medium w-full transition-all focus-within:ring-2 focus-within:ring-zinc-400/20 dark:focus-within:ring-zinc-600/30 shadow-xs">
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

          {/* Bouton Filtre (Sliders icon) - Situé directement sur la barre de recherche */}
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

        {/* Dropdown Filtres contextuels */}
        {showFilterDropdown && filterOptions.length > 0 && (
          <div className="absolute left-0 right-0 sm:left-auto sm:right-0 sm:w-72 top-full mt-2 z-40 bg-white dark:bg-[#1E1B1E] rounded-2xl shadow-xl border border-black/10 dark:border-white/10 p-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 flex items-center justify-between">
              <span>{filterCategoryLabel}</span>
              {activeFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter('ALL');
                    setShowFilterDropdown(false);
                  }}
                  className="text-[10px] text-[#4F6CE8] font-bold hover:underline cursor-pointer lowercase"
                >
                  réinitialiser
                </button>
              )}
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
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
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

      {/* Notification Button & Dropdown (Signaux forts uniquement avec aperçu) */}
      <div className="relative shrink-0" ref={notificationRef}>
        <button
          type="button"
          onClick={() => setShowNotifications((prev) => !prev)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer relative shadow-xs border ${
            showNotifications
              ? 'bg-[#4F6CE8] text-white border-transparent'
              : 'bg-white dark:bg-[#2D2A2D] text-zinc-700 dark:text-zinc-300 border-black/8 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Signaux forts & Veille stratégique"
        >
          <Icons.Bell size={16} />
          {hasUnread && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#242124]" />
          )}
        </button>

        {/* Notifications Dropdown (Pure Floating Card Style) */}
        {showNotifications && (
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-[#1E1B1E] rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 p-4 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3">
            {/* Header: Title + Unread Count + Mark All Read */}
            <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-900 dark:text-white">Signaux forts</span>
                {hasUnread && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    {unreadStrongCount}
                  </span>
                )}
              </div>
              {hasUnread && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] font-semibold text-[#4F6CE8] hover:underline cursor-pointer"
                >
                  Tout marquer lu
                </button>
              )}
            </div>

            {/* Notifications List: Strong signals only with brief overview */}
            <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
              {strongSignals.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Icons.CheckCircle size={26} className="text-zinc-400 mx-auto" />
                  <p className="text-xs text-zinc-500">Aucun signal fort récent</p>
                </div>
              ) : (
                strongSignals.slice(0, 8).map((item) => {
                  const companyName = item.enterprise_name || item.discovered_company_name || 'Entreprise B2B';
                  const brief = item.signal_rationale || item.commercial_angle || item.summary;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3 rounded-2xl transition-all cursor-pointer text-xs space-y-1.5 border border-black/5 dark:border-white/5 group ${
                        !item.is_read
                          ? 'bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10 dark:hover:bg-amber-500/15'
                          : 'bg-black/[0.02] dark:bg-white/[0.02] opacity-75 hover:opacity-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      {/* Top line: Enterprise & Signal pill & Time */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {!item.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[#4F6CE8] shrink-0" />
                          )}
                          <span className="font-bold text-zinc-900 dark:text-white truncate">
                            {companyName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                            <Icons.BicepsFlexed size={11} className="text-amber-600 dark:text-amber-400" />
                            {typeof item.signal_score === 'number' && (
                              <span className="font-mono text-[9px]">{item.signal_score}%</span>
                            )}
                          </span>
                          <span className="text-[10px] text-zinc-400">{formatRelativeTime(item.published_at)}</span>
                        </div>
                      </div>

                      {/* Headline */}
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-1 group-hover:text-[#4F6CE8] transition-colors">
                        {cleanHeadline(item.title)}
                      </p>

                      {/* Brief overview */}
                      {brief && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">Aperçu : </span>
                          {brief}
                        </p>
                      )}

                      {/* Recommended Offer Pill */}
                      {item.recommended_offer && (
                        <div className="pt-0.5 flex items-center gap-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#4F6CE8] bg-[#4F6CE8]/10 px-2 py-0.5 rounded-full">
                            <Icons.Zap size={10} />
                            <span>{item.recommended_offer}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom link to Actualités */}
            <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
              <Link
                href="/kam/feed"
                onClick={() => setShowNotifications(false)}
                className="text-xs font-bold text-[#4F6CE8] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Accéder au fil d&apos;actualité</span>
                <Icons.ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
