"use client";

import React from 'react';
import { Icons } from '@/components/shared/Icons';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  itemName?: string;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  itemName = 'éléments',
  className = '',
}: PaginationProps) {
  if (totalPages <= 0) return null;

  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    pages.push(1);

    if (currentPage > 3) {
      pages.push('ellipsis-start');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('ellipsis-end');
    }

    pages.push(totalPages);
    return pages;
  };

  const pages = getPageNumbers();

  const startItem = totalItems !== undefined && pageSize !== undefined
    ? Math.min((currentPage - 1) * pageSize + 1, totalItems)
    : undefined;
  const endItem = totalItems !== undefined && pageSize !== undefined
    ? Math.min(currentPage * pageSize, totalItems)
    : undefined;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-2 border-t border-black/5 dark:border-white/5 text-xs select-none ${className}`}
      aria-label="Pagination"
    >
      {/* Total & Current Indicator */}
      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-medium">
        {totalItems !== undefined && startItem !== undefined && endItem !== undefined ? (
          <span>
            Affichage <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{startItem}-{endItem}</strong> sur{' '}
            <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{totalItems.toLocaleString('fr-FR')}</strong> {itemName}
          </span>
        ) : (
          <span>
            Total : <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{totalPages}</strong> pages
          </span>
        )}
        <span className="hidden sm:inline">•</span>
        <span className="inline-flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
          Page {currentPage} sur {totalPages}
        </span>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1">
        {/* Précédent */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5 bg-white dark:bg-[#2D2A2D] text-zinc-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-medium"
        >
          <Icons.ChevronLeft size={14} />
          <span>Précédent</span>
        </button>

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-zinc-400 select-none font-semibold text-[11px]"
                >
                  ...
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={isActive ? 'page' : undefined}
                className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                  isActive
                    ? 'bg-[#4F6CE8] text-white shadow-none font-bold'
                    : 'bg-white dark:bg-[#2D2A2D] text-zinc-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 border border-black/5 dark:border-white/5'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Suivant */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5 bg-white dark:bg-[#2D2A2D] text-zinc-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-medium"
        >
          <span>Suivant</span>
          <Icons.ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
