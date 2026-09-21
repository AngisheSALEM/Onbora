"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '@/components/shared/Icons';
import { fetchAPI } from '@/lib/api';

export type ActivityStatusKey = 'AVAILABLE' | 'CLIENT_MEETING' | 'IN_MEETING' | 'UNAVAILABLE';

export interface ActivityStatusConfig {
  key: ActivityStatusKey;
  label: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  description: string;
}

export const ACTIVITY_STATUSES: ActivityStatusConfig[] = [
  {
    key: 'AVAILABLE',
    label: 'Disponible',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    borderColor: 'border-emerald-500/30',
    description: 'Prêt pour les appels, briefs et opportunités',
  },
  {
    key: 'CLIENT_MEETING',
    label: 'En clientèle / RDV',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/15',
    badgeText: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-500/30',
    description: 'En visite terrain ou entretien décisionnel',
  },
  {
    key: 'IN_MEETING',
    label: 'En réunion',
    dotColor: 'bg-[#4F6CE8]',
    badgeBg: 'bg-[#4F6CE8]/10 dark:bg-[#4F6CE8]/15',
    badgeText: 'text-[#4F6CE8] dark:text-[#7B93F8]',
    borderColor: 'border-[#4F6CE8]/30',
    description: 'Comité interne, briefing ou point d\'équipe',
  },
  {
    key: 'UNAVAILABLE',
    label: 'Indisponible',
    dotColor: 'bg-zinc-400',
    badgeBg: 'bg-zinc-500/10 dark:bg-zinc-500/15',
    badgeText: 'text-zinc-600 dark:text-zinc-400',
    borderColor: 'border-zinc-500/30',
    description: 'En pause, déplacement ou hors service',
  },
];

const STORAGE_KEY = 'onbora_kam_activity_status';

interface KamActivityStatusSelectorProps {
  compact?: boolean;
  className?: string;
  onStatusChange?: (status: ActivityStatusKey) => void;
}

export default function KamActivityStatusSelector({
  compact = false,
  className = '',
  onStatusChange,
}: KamActivityStatusSelectorProps) {
  const [currentStatus, setCurrentStatus] = useState<ActivityStatusKey>('AVAILABLE');
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load initial status from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ActivityStatusKey | null;
      if (saved && ACTIVITY_STATUSES.some((s) => s.key === saved)) {
        setCurrentStatus(saved);
      }
    } catch {
      // ignore
    }

    const handleExternalChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ status: ActivityStatusKey }>;
      if (customEvent.detail?.status) {
        setCurrentStatus(customEvent.detail.status);
      }
    };

    window.addEventListener('kam:activity_status_changed', handleExternalChange);
    return () => {
      window.removeEventListener('kam:activity_status_changed', handleExternalChange);
    };
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectStatus = async (statusKey: ActivityStatusKey) => {
    setCurrentStatus(statusKey);
    setIsOpen(false);

    // Persist to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, statusKey);
    } catch {
      // ignore
    }

    // Dispatch global event for reactive sync across views
    window.dispatchEvent(
      new CustomEvent('kam:activity_status_changed', { detail: { status: statusKey } })
    );

    if (onStatusChange) {
      onStatusChange(statusKey);
    }

    // Show visual feedback toast
    const activeConfig = ACTIVITY_STATUSES.find((s) => s.key === statusKey);
    setFeedbackMsg(`Statut : ${activeConfig?.label}`);
    setTimeout(() => setFeedbackMsg(null), 2500);

    // Optional backend sync (non-blocking)
    try {
      await fetchAPI('/api/accounts/me/', {
        method: 'PATCH',
        body: JSON.stringify({
          activity_status: statusKey,
          is_available: statusKey === 'AVAILABLE',
        }),
      });
    } catch {
      // Gracefully handle if backend does not yet accept activity_status field
    }
  };

  const activeConfig = ACTIVITY_STATUSES.find((s) => s.key === currentStatus) || ACTIVITY_STATUSES[0];

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Modifier mon statut d'activité kam"
        className={`flex items-center gap-2 rounded-2xl transition-all cursor-pointer border ${activeConfig.borderColor} ${activeConfig.badgeBg} hover:opacity-90 active:scale-98 select-none ${
          compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs font-semibold'
        }`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${activeConfig.dotColor}`} />
        <span className={`truncate font-medium ${activeConfig.badgeText}`}>
          {activeConfig.label}
        </span>
        <Icons.ChevronDown
          size={12}
          className={`transition-transform duration-200 ${activeConfig.badgeText} ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Temporary confirmation toast pill */}
      {feedbackMsg && (
        <div className="absolute top-full left-0 mt-1.5 z-30 px-2.5 py-1 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-[10px] font-semibold whitespace-nowrap shadow-sm animate-fade-in pointer-events-none">
          {feedbackMsg}
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-64 rounded-2xl bg-white dark:bg-[#2D2A2D] border border-black/5 dark:border-white/5 shadow-sm p-1.5 z-50 focus:outline-none backdrop-blur-xl"
        >
          <div className="px-3 py-2 border-b border-black/5 dark:border-white/5 mb-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
              Statut d&apos;activité CAM
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
              Visible dans le cockpit et par le KAM Office
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            {ACTIVITY_STATUSES.map((item) => {
              const isSelected = item.key === currentStatus;
              return (
                <button
                  key={item.key}
                  role="menuitem"
                  type="button"
                  onClick={() => handleSelectStatus(item.key)}
                  className={`w-full flex items-start justify-between gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-black/5 dark:bg-white/10 font-semibold text-zinc-900 dark:text-white'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${item.dotColor}`} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold leading-tight text-zinc-900 dark:text-white">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal mt-0.5">
                        {item.description}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Icons.Check size={14} className="text-[#4F6CE8] shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
