"use client";

import React, { useState } from 'react';
import { Icons } from '@/components/shared/Icons';
import Logo from '@/components/shared/Logo';
import { useAuth } from '@/context/AuthContext';

export type KamView = 'precall' | 'visits' | 'leadscoring' | 'churnradar' | 'accounts' | 'agenda' | 'directives' | 'copilot' | 'signals' | 'settings' | 'briefing';

interface KamSidebarProps {
  activeView: KamView;
  onViewChange: (view: KamView) => void;
  unreadSignalsCount?: number;
  unreadDirectivesCount?: number;
}

export default function KamSidebar({
  activeView,
  onViewChange,
  unreadSignalsCount = 0,
  unreadDirectivesCount = 0,
}: KamSidebarProps) {
  const { user, logout } = useAuth();
  const displayName = user ? `${user.first_name || user.username}` : 'Salem';
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const navItems = [
    {
      id: 'accounts' as KamView,
      label: 'Mes Comptes Clés',
      icon: Icons.Building,
      badge: null
    },
    {
      id: 'leadscoring' as KamView,
      label: 'Lead Scoring & Pipeline',
      icon: Icons.Award,
      badge: 'B2B'
    },
    {
      id: 'churnradar' as KamView,
      label: 'Radar Churn & Upsell',
      icon: Icons.AlertTriangle,
      badge: null
    },
    {
      id: 'agenda' as KamView,
      label: 'Agenda & Rendez-vous',
      icon: Icons.Calendar,
      badge: null
    },
    {
      id: 'visits' as KamView,
      label: 'Post-Call & Visites',
      icon: Icons.FileText,
      badge: null
    },
    {
      id: 'copilot' as KamView,
      label: 'Copilote IA',
      icon: Icons.Bot,
      badge: 'Codex'
    },
    {
      id: 'directives' as KamView,
      label: 'Directives',
      icon: Icons.MessageSquare,
      badge: unreadDirectivesCount > 0 ? `${unreadDirectivesCount}` : null
    },
    {
      id: 'settings' as KamView,
      label: 'Paramètres',
      icon: Icons.Settings,
      badge: null
    }
  ];

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
            <div className="flex items-center gap-3">
              <Logo size={36} />
              <div>
                <h1 className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  ONBORA KAM
                </h1>
                <span className="text-[11px] font-550 text-zinc-500 dark:text-zinc-400">
                  Cockpit Grands Comptes
                </span>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="mx-auto">
              <Logo size={32} />
            </div>
          )}

          {/* Liquid Glass Sidebar Collapse Button */}
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
            const isActive = activeView === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`group flex items-center ${isCollapsed ? 'justify-center p-3.5' : 'justify-between p-3.5'} rounded-2xl transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-[#4F6CE8] text-white shadow-none font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-[#E4E1DB]/60 dark:hover:bg-[#363336]/60 hover:text-[#4F6CE8] dark:hover:text-[#7B92F2]'
                }`}
              >
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
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom : Profile Capsule with 3D Bitmoji & Dedicated Logout Button */}
      <div className="flex flex-col gap-2 pt-2 border-t border-black/5 dark:border-white/5">
        <div className={`p-2.5 bg-[#E4E1DB] dark:bg-[#363336] rounded-2xl flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed ? (
            <button
              onClick={() => onViewChange('settings')}
              className="flex items-center gap-2.5 truncate text-left cursor-pointer hover:opacity-85 transition-opacity w-full"
              title="Voir mon profil & paramètres"
            >
              <div className="w-10 h-10 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center font-extrabold text-xs shrink-0 overflow-hidden border border-black/5 dark:border-white/5">
                <img
                  src={`/memojis/${(user?.avatar || 'memoji_044.png').replace('assets/memojis/', '')}`}
                  alt="Bitmoji KAM"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="truncate">
                <span className="text-xs font-semibold text-zinc-900 dark:text-white block leading-tight truncate">
                  {displayName}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">
                  Key Account Manager
                </span>
              </div>
            </button>
          ) : (
            <button
              onClick={() => onViewChange('settings')}
              title="Profil & Paramètres"
              className="w-10 h-10 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center overflow-hidden border border-black/5 dark:border-white/5 cursor-pointer"
            >
              <img
                src={`/memojis/${(user?.avatar || 'memoji_044.png').replace('assets/memojis/', '')}`}
                alt="Bitmoji KAM"
                className="w-full h-full object-cover"
              />
            </button>
          )}
        </div>

        {/* Dedicated "Se déconnecter" button at bottom of sidebar */}
        <button
          onClick={() => setShowLogoutModal(true)}
          title="Se déconnecter"
          className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-4 py-2.5'} rounded-2xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer border border-black/5 dark:border-white/5`}
        >
          <Icons.LogOut size={16} className="text-rose-500 shrink-0" />
          {!isCollapsed && <span>Se déconnecter</span>}
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] w-full max-w-sm rounded-[28px] border border-black/10 dark:border-white/10 p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 flex items-center justify-center mx-auto">
              <Icons.LogOut size={22} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">
                Confirmer la déconnexion
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Êtes-vous certain de vouloir vous déconnecter de votre espace KAM ?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => logout()}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-xs font-semibold text-white transition-all cursor-pointer shadow-md shadow-rose-600/20"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

