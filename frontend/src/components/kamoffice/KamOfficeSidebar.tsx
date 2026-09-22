"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/shared/Logo';
import { Icons } from '@/components/shared/Icons';
import UserAvatar from '@/components/kam/UserAvatar';
import { useAuth } from '@/context/AuthContext';
import { useKamOfficeContext } from './KamOfficeContext';

export interface KamOfficeNavItem {
  id: string;
  href: string;
  label: string;
  icon: any;
  getBadge?: (metrics: any, kamsCount: number, reportsCount: number) => number | string | undefined;
}

export const KAM_OFFICE_NAV_ITEMS: KamOfficeNavItem[] = [
  {
    id: 'overview',
    href: '/kamoffice/overview',
    label: 'Portefeuille & KPIs',
    icon: Icons.Sliders,
    getBadge: (metrics) => metrics?.total_accounts,
  },
  {
    id: 'kams',
    href: '/kamoffice/kams',
    label: 'Équipe KAM & Effectifs',
    icon: Icons.Users,
    getBadge: (_m, kamsCount) => (kamsCount > 0 ? kamsCount : undefined),
  },
  {
    id: 'grands_comptes',
    href: '/kamoffice/grands-comptes',
    label: 'Grands Comptes',
    icon: Icons.Building,
    getBadge: (metrics) => metrics?.grands_comptes_count,
  },
  {
    id: 'pme',
    href: '/kamoffice/pme',
    label: 'PME Stratégiques',
    icon: Icons.Briefcase,
    getBadge: (metrics) => metrics?.pme_count,
  },
  {
    id: 'leadscoring',
    href: '/kamoffice/leadscoring',
    label: 'Pipeline & Scoring B2B',
    icon: Icons.Award,
  },
  {
    id: 'churnradar',
    href: '/kamoffice/churnradar',
    label: "Radar Taux d'abandon",
    icon: Icons.AlertTriangle,
  },
  {
    id: 'reports',
    href: '/kamoffice/reports',
    label: 'Rapports de Visite',
    icon: Icons.FileText,
    getBadge: (_m, _k, reportsCount) => (reportsCount > 0 ? reportsCount : undefined),
  },
  {
    id: 'settings',
    href: '/kamoffice/settings',
    label: 'Paramètres & FAQ',
    icon: Icons.Settings,
  },
];

export default function KamOfficeSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const {
    isSidebarCollapsed,
    toggleSidebar,
    metrics,
    kamsList,
    kamReports,
  } = useKamOfficeContext();

  const isItemActive = (item: KamOfficeNavItem) => {
    if (pathname === item.href) return true;
    if (item.id === 'overview' && (pathname === '/kamoffice' || pathname === '/kamoffice/' || pathname === '/kam-office')) return true;
    return pathname.startsWith(item.href) && item.href !== '/kamoffice';
  };

  return (
    <aside
      className={`m-4 mr-0 rounded-[32px] bg-[#F6F5F2]/90 dark:bg-[#2D2A2D]/90 backdrop-blur-3xl shadow-xl dark:shadow-2xl flex flex-col justify-between shrink-0 h-[calc(100vh-2rem)] sticky top-4 select-none transition-all duration-300 ${
        isSidebarCollapsed ? 'w-20 p-3' : 'w-72 p-5'
      }`}
    >
      {/* Top Brand Header & Sidebar Toggle */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-1 py-1">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-3">
              <Logo size={36} />
              <h1 className="text-base font-semibold text-zinc-900 dark:text-white tracking-tight">
                ONBORA
              </h1>
            </div>
          )}

          {isSidebarCollapsed && (
            <div className="mx-auto">
              <Logo size={32} />
            </div>
          )}

          <button
            onClick={toggleSidebar}
            title={isSidebarCollapsed ? "Déplier la barre latérale" : "Replier la barre latérale"}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-[#E4E1DB] dark:hover:bg-[#363336] transition-colors cursor-pointer"
          >
            <Icons.Sidebar size={18} />
          </button>
        </div>

        {/* Navigation Menus */}
        <nav className="flex flex-col gap-1.5">
          {KAM_OFFICE_NAV_ITEMS.map((item) => {
            const isActive = isItemActive(item);
            const Icon = item.icon;
            const badge = item.getBadge ? item.getBadge(metrics, kamsList.length, kamReports.length) : undefined;

            return (
              <Link
                key={item.id}
                href={item.href}
                title={isSidebarCollapsed ? item.label : undefined}
                className={`group flex items-center ${
                  isSidebarCollapsed ? 'justify-center p-3.5' : 'justify-between p-3.5'
                } rounded-2xl transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-[#4F6CE8] text-white shadow-sm'
                    : 'text-zinc-600 dark:text-[#A1A1AA] hover:bg-[#E4E1DB]/60 dark:hover:bg-[#363336]/60 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon
                    size={18}
                    className={
                      isActive
                        ? 'text-white'
                        : 'text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white'
                    }
                  />
                  {!isSidebarCollapsed && (
                    <span className="text-xs font-semibold tracking-tight">
                      {item.label}
                    </span>
                  )}
                </div>

                {!isSidebarCollapsed && badge !== undefined && (
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile Section */}
      <div className="flex flex-col gap-3 pt-4 border-t border-black/5 dark:border-white/5">
        <div className="flex items-center justify-between px-1">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar
                src={user?.profile_picture_url || user?.avatar}
                alt={user?.username || 'KAM Office'}
                size="sm"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
                </span>
                <span className="text-[10px] text-zinc-400 truncate">
                  Responsable KAM
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto">
              <UserAvatar
                src={user?.profile_picture_url || user?.avatar}
                alt={user?.username || 'KAM Office'}
                size="sm"
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
