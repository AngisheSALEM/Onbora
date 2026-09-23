"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons } from '@/components/shared/Icons';
import Logo from '@/components/shared/Logo';
import { useAuth } from '@/context/AuthContext';
import UserAvatar, { ActivityStatus } from './UserAvatar';

export type KamView = 'precall' | 'visits' | 'leadscoring' | 'churnradar' | 'accounts' | 'agenda' | 'signals' | 'settings' | 'briefing' | 'report' | 'prepare-visit' | 'vocal-visit';

interface KamSidebarProps {
  activeView?: KamView;
  onViewChange?: (view: KamView) => void;
  unreadSignalsCount?: number;
  unreadDirectivesCount?: number;
}

export default function KamSidebar({
  activeView,
  onViewChange,
  unreadSignalsCount = 0,
  unreadDirectivesCount = 0,
}: KamSidebarProps) {
  const pathname = usePathname() || '';
  const { user, logout } = useAuth();
  const displayName = user ? `${user.first_name || user.username}` : 'Salem';
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activityStatus, setActivityStatus] = useState<ActivityStatus>('AVAILABLE');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('onbora_kam_activity_status') as ActivityStatus | null;
      if (saved) setActivityStatus(saved);
    } catch {
      // ignore
    }

    const handleStatusChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ status: ActivityStatus }>;
      if (customEvent.detail?.status) {
        setActivityStatus(customEvent.detail.status);
      }
    };

    window.addEventListener('kam:activity_status_changed', handleStatusChange);
    return () => {
      window.removeEventListener('kam:activity_status_changed', handleStatusChange);
    };
  }, []);

  const navItems = [
    {
      id: 'accounts' as KamView,
      href: '/kam/accounts',
      label: 'Comptes',
      icon: Icons.Building,
      badge: null,
    },
    {
      id: 'agenda' as KamView,
      href: '/kam/agenda',
      label: 'Agenda & Rendez-vous',
      icon: Icons.Calendar,
      badge: null,
    },
    {
      id: 'visits' as KamView,
      href: '/kam/visits',
      label: 'Historique des visites',
      icon: Icons.FileText,
      badge: null,
    },
    {
      id: 'settings' as KamView,
      href: '/kam/settings',
      label: 'Paramètres',
      icon: Icons.Settings,
      badge: null,
    },
  ];

  const checkIsActive = (item: typeof navItems[0]) => {
    if (activeView) {
      return activeView === item.id;
    }
    if (item.id === 'accounts') {
      return pathname === '/kam' || pathname === '/kam/' || pathname.startsWith('/kam/accounts') || pathname.startsWith('/kam/briefing');
    }
    if (item.id === 'agenda') {
      return pathname.startsWith('/kam/agenda') || pathname.startsWith('/kam/prepare-visit') || pathname.startsWith('/kam/vocal-visit');
    }
    if (item.id === 'visits') {
      return pathname.startsWith('/kam/visits') || pathname.startsWith('/kam/report');
    }
    if (item.id === 'settings') {
      return pathname.startsWith('/kam/settings');
    }
    return pathname === item.href;
  };

  return (
    <aside
      className={`m-4 mr-0 rounded-[32px] bg-[#F6F5F2]/90 dark:bg-[#2D2A2D]/90 backdrop-blur-3xl shadow-xl dark:shadow-2xl flex flex-col justify-between shrink-0 h-[calc(100vh-2rem)] sticky top-4 select-none transition-all duration-300 ${
        isCollapsed ? 'w-20 p-3' : 'w-72 p-5'
      }`}
    >
      {/* Top Header : Logo & Sidebar Toggle Icon */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-1 py-1">
          {!isCollapsed && (
            <Link href="/kam/accounts" className="flex items-center gap-3 group">
              <Logo size={36} />
              <div>
                <h1 className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-tight group-hover:text-[#4F6CE8] transition-colors">
                  ONBORA KAM
                </h1>
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  Cockpit Grands Comptes
                </span>
              </div>
            </Link>
          )}

          {isCollapsed && (
            <Link href="/kam/accounts" className="mx-auto">
              <Logo size={32} />
            </Link>
          )}

          {/* Sidebar Collapse Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Déplier la barre latérale" : "Replier la barre latérale"}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-[#E4E1DB] dark:hover:bg-[#363336] transition-colors cursor-pointer"
          >
            <Icons.Sidebar size={18} />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = checkIsActive(item);
            const Icon = item.icon;

            const buttonClass = `group flex items-center ${isCollapsed ? 'justify-center p-3.5' : 'justify-between p-3.5'} rounded-2xl transition-all text-left cursor-pointer ${
              isActive
                ? 'bg-[#4F6CE8] text-white shadow-none font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-[#E4E1DB]/60 dark:hover:bg-[#363336]/60 hover:text-[#4F6CE8] dark:hover:text-[#7B92F2]'
            }`;

            const content = (
              <>
                <div className="flex items-center gap-3">
                  <Icon
                    size={20}
                    className={
                      isActive
                        ? 'text-white'
                        : 'text-zinc-400 dark:text-zinc-500 group-hover:text-[#4F6CE8] dark:group-hover:text-[#7B92F2] transition-colors'
                    }
                  />
                  {!isCollapsed && (
                    <span className={`text-xs font-semibold leading-tight ${isActive ? 'text-white' : 'text-zinc-800 dark:text-white group-hover:text-[#4F6CE8] dark:group-hover:text-[#7B92F2] transition-colors'}`}>
                      {item.label}
                    </span>
                  )}
                </div>

                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white text-[#4F6CE8]'
                        : 'bg-[#4F6CE8]/15 text-[#4F6CE8] dark:bg-[#4F6CE8]/25 dark:text-[#7B92F2]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </>
            );

            if (onViewChange) {
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={buttonClass}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={buttonClass}
              >
                {content}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom : Profile Capsule with Avatar & Dedicated Logout Button */}
      <div className="flex flex-col gap-2 pt-2 border-t border-black/5 dark:border-white/5">
        <div className={`p-2.5 bg-[#E4E1DB] dark:bg-[#363336] rounded-2xl flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed ? (
            <Link
              href="/kam/settings"
              className="flex items-center gap-2.5 truncate text-left cursor-pointer hover:opacity-85 transition-opacity w-full"
              title="Voir mon profil & paramètres"
            >
              <UserAvatar
                src={user?.profile_picture_url || user?.avatar}
                name={displayName}
                size="sm"
                showStatusDot
                status={activityStatus}
              />
              <div className="truncate">
                <span className="text-xs font-semibold text-zinc-900 dark:text-white block leading-tight truncate">
                  {displayName}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">
                  Key Account Manager
                </span>
              </div>
            </Link>
          ) : (
            <Link href="/kam/settings" title="Paramètres">
              <UserAvatar
                src={user?.profile_picture_url || user?.avatar}
                name={displayName}
                size="sm"
                showStatusDot
                status={activityStatus}
              />
            </Link>
          )}
        </div>

        {/* Dedicated Logout Action Button */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className={`flex items-center gap-2.5 p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors text-xs font-semibold cursor-pointer ${isCollapsed ? 'justify-center' : 'w-full'}`}
          title="Se déconnecter"
        >
          <Icons.LogOut size={16} />
          {!isCollapsed && <span>Déconnexion</span>}
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 max-w-sm w-full border border-black/10 dark:border-white/10 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Icons.AlertTriangle size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                Confirmer la déconnexion
              </h3>
              <p className="text-xs text-zinc-500">
                Êtes-vous sûr de vouloir quitter votre session de travail ?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs cursor-pointer hover:bg-zinc-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={logout}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs cursor-pointer transition-colors"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
