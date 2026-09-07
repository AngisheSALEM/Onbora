"use client";

import React from 'react';
import { Icons } from '@/components/shared/Icons';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { KamView } from './KamSidebar';

interface KamHeaderProps {
  activeView: KamView;
  accountName?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function KamHeader({
  activeView,
  accountName,
  searchQuery,
  onSearchChange
}: KamHeaderProps) {
  const getTitle = () => {
    switch (activeView) {
      case 'accounts':
        return ''; // Retiré car le grand titre est affiché dans le corps de page
      case 'briefing':
        return accountName ? `Info — ${accountName}` : 'Info Client';
      case 'agenda':
        return 'Agenda & Planification des Rendez-vous';
      case 'visits':
        return 'Historique des Visites & Rapports Exécutifs';
      case 'signals':
        return 'Notes & Ingestion (Desk G-Notes)';
      case 'directives':
        return 'Directives & Messages Stratégiques';
      case 'copilot':
        return 'Copilote IA — Codex B2B';
      case 'settings':
        return 'Paramètres & Base de Connaissances FAQ';
      default:
        return 'Cockpit Grands Comptes';
    }
  };

  const showHeaderSearch = activeView === 'accounts';

  return (
    <header className="h-16 px-8 flex items-center justify-between shrink-0 select-none border-b border-black/5 dark:border-white/5">
      {/* Left : Page Title (empty for accounts to avoid duplicate with large body title) */}
      <div className="flex items-center gap-3">
        {getTitle() && (
          <h1 className="text-sm md:text-base font-extrabold text-zinc-900 dark:text-white tracking-tight">
            {getTitle()}
          </h1>
        )}
      </div>

      {/* Right : Direct Live Search Input (shown only on relevant views) & Theme Toggle */}
      <div className="flex items-center gap-3">
        {showHeaderSearch && (
          <div className="flex items-center gap-2.5 px-4 py-1.5 bg-[#F6F5F2]/90 dark:bg-[#2D2A2D] text-zinc-800 dark:text-zinc-200 rounded-full shadow-xs backdrop-blur-md text-xs font-550 w-64 md:w-80 border border-black/5 dark:border-white/5 transition-all focus-within:ring-2 focus-within:ring-[#4F6CE8] focus-within:w-72 md:focus-within:w-96">
            <Icons.Search size={14} className="text-zinc-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher un compte, un décideur..."
              className="bg-transparent outline-none w-full text-zinc-900 dark:text-white placeholder-zinc-400 font-medium text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors cursor-pointer"
                title="Effacer la recherche"
              >
                <Icons.Close size={13} />
              </button>
            )}
          </div>
        )}

        {/* Theme Toggle Sun / Moon */}
        <ThemeToggle />
      </div>
    </header>
  );
}
