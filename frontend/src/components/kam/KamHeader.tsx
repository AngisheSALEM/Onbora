"use client";

import React from 'react';
import { Icons } from '@/components/shared/Icons';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { KamView } from './KamSidebar';

interface KamHeaderProps {
  activeView: KamView;
  accountName?: string;
  onOpenSearch: () => void;
}

export default function KamHeader({
  activeView,
  accountName,
  onOpenSearch
}: KamHeaderProps) {
  const getTitle = () => {
    switch (activeView) {
      case 'accounts':
        return 'Portefeuille des Comptes Clés';
      case 'briefing':
        return accountName ? `Fiche Briefing 360° — ${accountName}` : 'Fiche Briefing 360°';
      case 'signals':
        return 'Signaux d\'Intention & Détections Marché';
      case 'debrief':
        return accountName ? `Débriefing & Compte-Rendu — ${accountName}` : 'Débriefing & Compte-Rendu';
      default:
        return 'Espace de Travail KAM';
    }
  };

  return (
    <header className="h-18 px-8 flex items-center justify-between shrink-0 select-none">
      {/* Left : Breadcrumb Label */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm md:text-base font-black text-zinc-900 dark:text-white tracking-tight">
          {getTitle()}
        </h1>
      </div>

      {/* Right : Floating Search Pill Capsule & Theme Toggle */}
      <div className="flex items-center gap-3">
        {/* Search Pill Capsule */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2.5 px-4 py-2 bg-[#F6F5F2]/90 dark:bg-[#2D2A2D] hover:bg-white dark:hover:bg-[#363336] text-zinc-600 dark:text-zinc-300 rounded-full shadow-sm backdrop-blur-md transition-all active:scale-95 cursor-pointer text-xs font-semibold"
        >
          <Icons.Search size={14} className="text-zinc-400" />
          <span>Rechercher un compte, un décideur...</span>
        </button>

        {/* Theme Toggle Sun / Moon */}
        <ThemeToggle />
      </div>
    </header>
  );
}
