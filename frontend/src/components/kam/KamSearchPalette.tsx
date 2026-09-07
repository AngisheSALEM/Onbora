"use client";

import React, { useState, useEffect } from 'react';
import { StrategicVisit } from './kamTypes';
import { Icons } from '@/components/shared/Icons';

interface KamSearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  visits: StrategicVisit[];
  onSelectVisit: (visit: StrategicVisit) => void;
}

export default function KamSearchPalette({
  isOpen,
  onClose,
  visits,
  onSelectVisit
}: KamSearchPaletteProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredVisits = visits.filter((v) => {
    const q = query.toLowerCase();
    return (
      v.account_name.toLowerCase().includes(q) ||
      v.meeting_title.toLowerCase().includes(q) ||
      v.briefing.industry.toLowerCase().includes(q) ||
      v.briefing.stakeholders_mapping.some((s) => s.full_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1C1C1E] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 p-4 border-b border-black/5 dark:border-white/10">
          <Icons.Search size={20} className="text-zinc-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un compte, un décideur, un contrat, un signal..."
            className="flex-1 bg-transparent border-none text-sm md:text-base font-550 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-0"
          />
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs font-semibold text-zinc-400 hover:text-black dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 rounded-lg"
          >
            ESC
          </button>
        </div>

        {/* Results Feed */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-3 py-1">
            Comptes Clés & Visites Stratégiques ({filteredVisits.length})
          </div>

          {filteredVisits.length > 0 ? (
            filteredVisits.map((v) => (
              <div
                key={v.id}
                onClick={() => {
                  onSelectVisit(v);
                  onClose();
                }}
                className="cursor-pointer flex items-center justify-between p-3 rounded-2xl hover:bg-blue-500/10 dark:hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-semibold text-xs">
                    {v.account_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs md:text-sm font-semibold text-zinc-900 dark:text-white group-hover:text-blue-500 transition-colors">
                      {v.account_name}
                    </h4>
                    <p className="text-[11px] text-zinc-500 line-clamp-1">
                      {v.meeting_title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-550 text-zinc-400">
                  <span>{v.meeting_time}</span>
                  <Icons.ChevronRight size={14} />
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-zinc-400">
              Aucun résultat pour &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-zinc-50 dark:bg-black/40 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
          <span>Naviguer avec <strong>↑ ↓</strong></span>
          <span>Sélectionner avec <strong>Entrée</strong></span>
        </div>

      </div>
    </div>
  );
}
