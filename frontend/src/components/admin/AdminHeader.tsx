"use client";

import React from 'react';
import { Icons } from '@/components/shared/Icons';
import { useAdminContext } from './AdminContext';

export default function AdminHeader() {
  const {
    searchQuery,
    setSearchQuery,
    executeSearch,
    searchPlaceholder,
    successMessage,
  } = useAdminContext();

  return (
    <header className="bg-white/80 dark:bg-[#2D2A2D]/90 backdrop-blur-2xl rounded-3xl px-6 py-3.5 flex items-center justify-between shadow-sm border border-black/5 dark:border-white/5 shrink-0 z-10">
      {/* Universal search input */}
      <div className="flex-1 max-w-lg relative flex items-center">
        <Icons.Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E6C67] dark:text-[#A1A1AA] pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              executeSearch();
            }
          }}
          placeholder={searchPlaceholder}
          className="w-full pl-10 pr-20 py-2 bg-black/5 dark:bg-white/5 rounded-2xl text-xs font-semibold text-[#242124] dark:text-white placeholder-[#6E6C67] dark:placeholder-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#4F6CE8]/50 transition-all border-0"
        />
        <div className="absolute right-2.5 flex items-center gap-1">
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTimeout(() => executeSearch(), 50);
              }}
              className="p-1 rounded-full text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer text-[10px]"
              title="Effacer la recherche"
            >
              <Icons.X size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={executeSearch}
            className="px-2 py-0.5 rounded-lg bg-[#4F6CE8]/10 hover:bg-[#4F6CE8] text-[#4F6CE8] hover:text-white font-mono text-[10px] font-medium transition-all cursor-pointer"
            title="Valider la recherche (Entrée)"
          >
            ↵
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {successMessage && (
          <div className="px-3.5 py-1.5 bg-[#4F6CE8]/10 text-[#4F6CE8] rounded-full text-[11px] font-semibold flex items-center gap-1.5 animate-fade-in">
            <Icons.CheckCircle size={13} />
            <span>{successMessage}</span>
          </div>
        )}
      </div>
    </header>
  );
}
