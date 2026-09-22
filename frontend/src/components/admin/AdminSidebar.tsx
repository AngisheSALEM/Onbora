"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/shared/Logo';
import { Icons } from '@/components/shared/Icons';
import UserAvatar from '@/components/kam/UserAvatar';
import { useAuth } from '@/context/AuthContext';
import { useAdminContext } from './AdminContext';

export interface AdminNavItem {
  id: string;
  href: string;
  label: string;
  icon: React.ReactNode;
  countKey?: keyof import('./AdminContext').AdminCounts;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: 'converted',
    href: '/admin/converted',
    label: 'Comptes Convertis',
    icon: <Icons.CheckCircle size={16} />,
    countKey: 'converted',
  },
  {
    id: 'catalog',
    href: '/admin/catalog',
    label: "Catalogue d'offres",
    icon: <Icons.Server size={16} />,
    countKey: 'catalog',
  },
  {
    id: 'crm_bank',
    href: '/admin/crm-bank',
    label: 'Entreprises CRM',
    icon: <Icons.Layers size={16} />,
    countKey: 'crm',
  },
  {
    id: 'supervisors',
    href: '/admin/supervisors',
    label: 'Superviseurs Back-Office',
    icon: <Icons.Map size={16} />,
    countKey: 'supervisors',
  },
  {
    id: 'kam_managers',
    href: '/admin/kam-managers',
    label: 'Gérants KAM Office',
    icon: <Icons.Briefcase size={16} />,
    countKey: 'kamManagers',
  },
  {
    id: 'field_sales',
    href: '/admin/field-sales',
    label: 'Commerciaux & Plaques',
    icon: <Icons.Users size={16} />,
    countKey: 'sales',
  },
  {
    id: 'kams_team',
    href: '/admin/kams-team',
    label: 'Effectif des KAMs',
    icon: <Icons.Award size={16} />,
    countKey: 'kams',
  },
  {
    id: 'segmentation',
    href: '/admin/segmentation',
    label: 'Règles de Segmentation',
    icon: <Icons.Sliders size={16} />,
  },
  {
    id: 'scoring',
    href: '/admin/scoring',
    label: 'Moteur de Scoring',
    icon: <Icons.Target size={16} />,
  },
  {
    id: 'settings',
    href: '/admin/settings',
    label: 'Paramètres & FAQ',
    icon: <Icons.Settings size={16} />,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isCollapsed, toggleCollapsed, counts } = useAdminContext();

  const isItemActive = (item: AdminNavItem) => {
    if (pathname === item.href) return true;
    if (item.id === 'converted' && (pathname === '/admin' || pathname === '/admin/')) return true;
    if (item.id === 'catalog' && pathname.startsWith('/admin/b2b-catalog')) return true;
    return pathname.startsWith(item.href) && item.href !== '/admin';
  };

  return (
    <aside
      className={`bg-white/80 dark:bg-[#2D2A2D]/90 backdrop-blur-2xl rounded-3xl p-4 flex flex-col justify-between shadow-sm border border-black/5 dark:border-white/5 shrink-0 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      <div className="flex flex-col gap-6">
        {/* Brand & Collapse */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-3">
            <Logo size={isCollapsed ? 32 : 36} />
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-[#242124] dark:text-white">
                  ONBORA
                </span>
                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] font-medium">
                  Cockpit Direction B2B
                </span>
              </div>
            )}
          </div>
          <button
            onClick={toggleCollapsed}
            title={isCollapsed ? "Agrandir le menu" : "Réduire le menu"}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white transition-colors cursor-pointer"
          >
            <Icons.Sidebar size={16} />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex flex-col gap-1">
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = isItemActive(item);
            const count = item.countKey ? counts[item.countKey] : undefined;

            return (
              <Link
                key={item.id}
                href={item.href}
                title={item.label}
                className={`w-full ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                } rounded-2xl text-xs font-medium transition-all flex items-center cursor-pointer ${
                  active
                    ? 'bg-[#4F6CE8] text-white shadow-sm'
                    : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#242124] dark:hover:text-white'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                  {item.icon}
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!isCollapsed && count !== undefined && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-black/5 dark:bg-white/10 text-[#6E6C67] dark:text-[#A1A1AA]'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile bottom */}
      <div className="flex flex-col gap-3 pt-4 border-t border-black/5 dark:border-white/5">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-1`}>
          <Link
            href="/admin/settings"
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} text-left cursor-pointer group`}
            title={isCollapsed ? "Mon Profil" : "Accéder aux paramètres"}
          >
            <UserAvatar
              src={user?.profile_picture_url || user?.avatar}
              name={user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || 'Admin Onbora'}
              size="sm"
              className="shrink-0 group-hover:ring-2 group-hover:ring-[#4F6CE8] transition-all"
            />
            {!isCollapsed && (
              <div className="flex flex-col truncate max-w-[130px]">
                <span className="text-xs font-medium leading-tight text-[#242124] dark:text-white truncate group-hover:text-[#4F6CE8] transition-colors">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || 'Admin Onbora'}
                </span>
                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] truncate">
                  Administrateur Suprême
                </span>
              </div>
            )}
          </Link>
        </div>
      </div>
    </aside>
  );
}
