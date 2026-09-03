"use client";

import React, { useState } from 'react';
import { Icons } from '@/components/shared/Icons';
import Logo from '@/components/shared/Logo';
import { useAuth } from '@/context/AuthContext';

export type KamView = 'accounts' | 'briefing' | 'signals' | 'debrief';

interface KamSidebarProps {
  activeView: KamView;
  onViewChange: (view: KamView) => void;
  unreadSignalsCount?: number;
}

export default function KamSidebar({
  activeView,
  onViewChange,
  unreadSignalsCount = 3
}: KamSidebarProps) {
  const { user, logout } = useAuth();
  const displayName = user ? `${user.first_name || user.username}` : 'Salem';
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    {
      id: 'accounts' as KamView,
      label: 'Mes Comptes Clés',
      description: 'Portefeuille 15-30 comptes',
      icon: Icons.Building,
      badge: null
    },
    {
      id: 'briefing' as KamView,
      label: 'Fiche Briefing 360°',
      description: 'Préparation RDV C-Level',
      icon: Icons.FileText,
      badge: 'Prioritaire'
    },
    {
      id: 'signals' as KamView,
      label: 'Notes & Éditeur Document',
      description: 'Éditeur riche & synthèse IA',
      icon: Icons.FileEdit,
      badge: unreadSignalsCount > 0 ? `${unreadSignalsCount}` : null
    },
    {
      id: 'debrief' as KamView,
      label: 'Débriefing & CR Vocal',
      description: 'Génération email & engagements',
      icon: Icons.Mic,
      badge: null
    }
  ];

  return (
    <aside
      className={`m-4 mr-0 rounded-[32px] bg-white/70 dark:bg-[#1C1B20]/80 backdrop-blur-3xl border border-black/5 dark:border-white/10 shadow-2xl flex flex-col justify-between shrink-0 h-[calc(100vh-2rem)] sticky top-4 select-none transition-all duration-300 ${
        isCollapsed ? 'w-20 p-3' : 'w-72 p-5'
      }`}
    >
      {/* Top Header : Logo & Sidebar Toggle Icon (Apple iPadOS / visionOS style) */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-1 py-1">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <Logo size={36} />
              <div>
                <h1 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">
                  ONBORA KAM
                </h1>
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
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
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
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
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={20}
                    className={
                      isActive
                        ? 'text-white'
                        : 'text-zinc-400 dark:text-zinc-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'
                    }
                  />
                  {!isCollapsed && (
                    <div>
                      <span className={`block text-xs font-bold leading-tight ${isActive ? 'text-white' : 'text-zinc-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'}`}>
                        {item.label}
                      </span>
                      <span className={`text-[10px] block mt-0.5 ${isActive ? 'text-blue-100 font-medium' : 'text-zinc-500 dark:text-zinc-400'}`}>
                        {item.description}
                      </span>
                    </div>
                  )}
                </div>

                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white text-blue-600'
                        : 'bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400'
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

      {/* Bottom : Profile Capsule */}
      <div className={`p-3 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-black text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm border border-white/10">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <span className="text-xs font-bold text-zinc-900 dark:text-white block leading-tight truncate">
                  {displayName}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">
                  Directeur Grands Comptes
                </span>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Déconnexion"
              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
            >
              <Icons.LogOut size={16} />
            </button>
          </>
        ) : (
          <button
            onClick={() => logout()}
            title="Déconnexion"
            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
          >
            <Icons.LogOut size={18} />
          </button>
        )}
      </div>

    </aside>
  );
}

