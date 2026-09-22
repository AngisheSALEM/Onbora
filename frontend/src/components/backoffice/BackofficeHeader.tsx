"use client";

import React from 'react';
import { Icons } from '@/components/shared/Icons';
import { useBackofficeContext } from './BackofficeContext';

interface BackofficeHeaderProps {
  onRefresh?: () => void;
  loading?: boolean;
}

export default function BackofficeHeader({ onRefresh, loading }: BackofficeHeaderProps) {
  const {
    searchQuery,
    setSearchQuery,
    searchPlaceholder,
    headerTitle,
    headerAction,
  } = useBackofficeContext();

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5 shrink-0 mb-4">
      <div className="flex flex-col">
        <h2 className="text-xl font-semibold text-[#242124] dark:text-white tracking-tight">
          {headerTitle}
        </h2>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {headerAction}

        <div className="flex items-center gap-2 bg-white dark:bg-[#2D2A2D] px-3.5 py-2 rounded-2xl border border-black/5 dark:border-white/5 shadow-2xs">
          <Icons.Search size={14} className="text-[#6E6C67] dark:text-[#A1A1AA]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="bg-transparent text-xs font-semibold focus:outline-none w-48 sm:w-64 text-[#242124] dark:text-white border-0 placeholder-[#6E6C67] dark:placeholder-[#A1A1AA]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer"
            >
              <Icons.X size={14} />
            </button>
          )}
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Actualiser les données"
            className="p-2.5 rounded-2xl bg-white dark:bg-[#2D2A2D] hover:bg-black/5 dark:hover:bg-white/10 text-[#6E6C67] dark:text-white transition-all cursor-pointer border border-black/5 dark:border-white/5 disabled:opacity-50 shadow-2xs"
          >
            <Icons.Refresh size={15} className={loading ? "animate-spin" : ""} />
          </button>
        )}
      </div>
    </header>
  );
}
