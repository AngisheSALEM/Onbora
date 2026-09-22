"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/shared/Logo';
import { Icons } from '@/components/shared/Icons';
import UserAvatar from '@/components/kam/UserAvatar';
import { useAuth } from '@/context/AuthContext';
import { useBackofficeContext } from './BackofficeContext';

export interface BackofficeNavItem {
  id: string;
  href: string;
  label: string;
  icon: any;
  countKey?: keyof import('./BackofficeContext').BackofficeCounts;
}

export const BACKOFFICE_NAV_ITEMS: BackofficeNavItem[] = [
  {
    id: 'soho_managed',
    href: '/backoffice/soho-managed',
    label: 'Comptes',
    icon: Icons.Building,
    countKey: 'enterprises',
  },
  {
    id: 'salespersons',
    href: '/backoffice/salespersons',
    label: 'Commerciaux Terrain',
    icon: Icons.Users,
    countKey: 'salespersons',
  },
  {
    id: 'daily_report',
    href: '/backoffice/daily-report',
    label: 'Rapport de la journée',
    icon: Icons.FileText,
  },
  {
    id: 'plaques_list',
    href: '/backoffice/plaques',
    label: 'Plaques',
    icon: Icons.Layers,
    countKey: 'plaques',
  },
  {
    id: 'map',
    href: '/backoffice/map',
    label: 'Carte Territoire',
    icon: Icons.Map,
  },
  {
    id: 'soho_directory',
    href: '/backoffice/directory',
    label: 'Annuaire',
    icon: Icons.FileText,
  },
  {
    id: 'settings',
    href: '/backoffice/settings',
    label: 'Paramètres',
    icon: Icons.Settings,
  },
];

export default function BackofficeSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isSidebarCollapsed, toggleSidebar, counts } = useBackofficeContext();

  const isItemActive = (item: BackofficeNavItem) => {
    if (pathname === item.href) return true;
    if (item.id === 'soho_managed' && (pathname === '/backoffice' || pathname === '/backoffice/')) return true;
    if (item.id === 'plaques_list' && pathname.startsWith('/backoffice/plaques')) return true;
    if (item.id === 'soho_directory' && (pathname.startsWith('/backoffice/directory') || pathname.startsWith('/backoffice/soho-directory'))) return true;
    return pathname.startsWith(item.href) && item.href !== '/backoffice';
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

        {/* Navigation List */}
        <nav className="flex flex-col gap-1.5">
          {BACKOFFICE_NAV_ITEMS.map((item) => {
            const isActive = isItemActive(item);
            const Icon = item.icon;
            const badge = item.countKey && counts[item.countKey] !== undefined ? `${counts[item.countKey]}` : null;

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
                    <span className="text-xs font-semibold tracking-tight">{item.label}</span>
                  )}
                </div>

                {!isSidebarCollapsed && badge && (
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
          <Link
            href="/backoffice/settings"
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} cursor-pointer group`}
            title={isSidebarCollapsed ? "Mon Profil" : "Accéder aux paramètres"}
          >
            <UserAvatar
              src={user?.profile_picture_url || user?.avatar}
              name={user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || 'Superviseur'}
              size="sm"
              className="shrink-0 group-hover:ring-2 group-hover:ring-[#4F6CE8] transition-all"
            />
            {!isSidebarCollapsed && (
              <div className="flex flex-col truncate max-w-[130px]">
                <span className="text-xs font-medium leading-tight text-zinc-900 dark:text-white truncate group-hover:text-[#4F6CE8] transition-colors">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || 'Superviseur'}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                  Superviseur Back-Office
                </span>
              </div>
            )}
          </Link>
        </div>
      </div>
    </aside>
  );
}
