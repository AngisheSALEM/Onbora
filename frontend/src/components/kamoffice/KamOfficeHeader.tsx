"use client";

import React from 'react';
import { Icons } from '@/components/shared/Icons';
import { useKamOfficeContext } from './KamOfficeContext';

interface KamOfficeHeaderProps {
  onRefresh?: () => void;
  loading?: boolean;
}

export default function KamOfficeHeader({ onRefresh, loading }: KamOfficeHeaderProps) {
  const {
    searchQuery,
    setSearchQuery,
    searchPlaceholder,
    headerTitle,
    headerAction,
    notification,
  } = useKamOfficeContext();

  return (
    <div className="flex flex-col gap-3 shrink-0 mb-4">
      {/* Top Bar */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5">
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold text-[#242124] dark:text-white tracking-tight">
            {headerTitle}
          </h2>
        </div>

        {/* Actions & Search */}
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

      {/* Notification banner */}
      {notification && (
        <div
          className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}
        >
          {notification.type === 'success' ? (
            <Icons.CheckCircle size={15} />
          ) : (
            <Icons.AlertCircle size={15} />
          )}
          <span>{notification.message}</span>
        </div>
      )}
    </div>
  );
}
