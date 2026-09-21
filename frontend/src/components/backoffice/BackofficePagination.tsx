"use client";

import React from 'react';
import { Icons } from '@/components/shared/Icons';

export interface BackofficePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
}

export default function BackofficePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemName = 'éléments',
}: BackofficePaginationProps) {
  if (totalItems === 0) {
    return null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Helper to build page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      const leftThreshold = Math.max(2, currentPage - 1);
      const rightThreshold = Math.min(totalPages - 1, currentPage + 1);

      if (leftThreshold > 2) {
        pages.push('...');
      }

      for (let i = leftThreshold; i <= rightThreshold; i++) {
        pages.push(i);
      }

      if (rightThreshold < totalPages - 1) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-2 border-t border-black/5 dark:border-white/5 select-none">
      {/* Items count summary */}
      <div className="flex items-center gap-2 text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
        <span>
          Affichage de <span className="font-semibold text-[#242124] dark:text-white">{startItem}</span> à{' '}
          <span className="font-semibold text-[#242124] dark:text-white">{endItem}</span> sur{' '}
          <span className="font-semibold text-[#242124] dark:text-white">{totalItems}</span> {itemName}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-3">
            <span className="text-[11px]">Par page :</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-lg px-2 py-0.5 text-xs text-[#242124] dark:text-white outline-none cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Numbered page controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {/* Previous Page Button */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border border-black/5 dark:border-white/5 bg-white dark:bg-[#363336] text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[#6E6C67] dark:disabled:hover:text-[#A1A1AA]"
            title="Page précédente"
          >
            <Icons.ChevronLeft size={13} />
            <span className="hidden sm:inline">Précédent</span>
          </button>

          {/* Number buttons */}
          <div className="flex items-center gap-1">
            {pages.map((p, idx) => {
              if (p === '...') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-2 py-1 text-xs text-[#6E6C67] dark:text-[#A1A1AA] font-semibold"
                  >
                    ...
                  </span>
                );
              }

              const pageNum = Number(p);
              const isActive = pageNum === currentPage;

              return (
                <button
                  key={`page-${pageNum}`}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`min-w-8 h-8 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                    isActive
                      ? 'bg-[#4F6CE8] text-white shadow-xs'
                      : 'bg-white dark:bg-[#363336] text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-black/5 dark:border-white/5'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Page Button */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border border-black/5 dark:border-white/5 bg-white dark:bg-[#363336] text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[#6E6C67] dark:disabled:hover:text-[#A1A1AA]"
            title="Page suivante"
          >
            <span className="hidden sm:inline">Suivant</span>
            <Icons.ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
