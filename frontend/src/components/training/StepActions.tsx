"use client";

import React from 'react';
import { Icons } from '../shared/Icons';

interface StepActionsProps {
  onNext: () => void;
  onPrev: () => void;
  onBlocked: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  isLast: boolean;
  actionLabel?: string;
  actionType?: 'do_it_for_me';
  actionConfig?: string;
  onDoItForMe?: (actionConfig: string) => void;
  isExecutingDoItForMe?: boolean;
  onAskCopilot?: () => void;
}

export default function StepActions({
  onNext,
  onPrev,
  onBlocked,
  hasPrev,
  hasNext,
  isLast,
  actionLabel,
  actionType,
  actionConfig,
  onDoItForMe,
  isExecutingDoItForMe = false,
  onAskCopilot
}: StepActionsProps) {
  return (
    <div className="flex flex-col gap-3 shrink-0">
      {/* Do It For Me Action (if present) */}
      {actionType === 'do_it_for_me' && actionLabel && onDoItForMe && actionConfig && (
        <button
          onClick={() => onDoItForMe(actionConfig)}
          disabled={isExecutingDoItForMe}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-linear-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-md shadow-orange-500/10 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed border-none"
        >
          {isExecutingDoItForMe ? (
            <>
              <Icons.Loader size={14} className="animate-spin text-white" />
              Configuration en cours...
            </>
          ) : (
            <>
              <Icons.Sparkles size={14} className="text-white" />
              {actionLabel}
            </>
          )}
        </button>
      )}

      {/* Main navigation buttons */}
      <div className="flex gap-2.5">
        {hasPrev && (
          <button
            onClick={onPrev}
            className="flex-1 py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-900 active:scale-[0.98] transition-all cursor-pointer bg-transparent"
          >
            Précédent
          </button>
        )}
        
        <button
          onClick={onNext}
          className="flex-3 py-2 px-4 rounded-lg bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all text-xs font-bold text-white dark:text-zinc-900 cursor-pointer border-none flex items-center justify-center gap-1.5"
        >
          {isLast ? 'Passer au Quiz' : 'Valider & Suivre'}
          <Icons.ChevronRight size={14} />
        </button>
      </div>

      {/* Blocked / AI Chat Actions Row */}
      <div className="flex gap-2 w-full">
        <button
          onClick={onBlocked}
          className="flex-1 py-2 px-3 rounded-lg border border-dashed border-red-250 dark:border-red-900/60 hover:bg-red-500/5 text-xs font-bold text-red-500 hover:text-red-650 dark:hover:text-red-400 active:scale-[0.98] transition-all cursor-pointer bg-transparent"
        >
          J'ai une erreur / Bloqué
        </button>
        
        {onAskCopilot && (
          <button
            onClick={onAskCopilot}
            className="flex-1 py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-900 active:scale-[0.98] transition-all cursor-pointer bg-transparent flex items-center justify-center gap-1.5"
          >
            <Icons.MessageSquare size={13} className="text-zinc-500" />
            Demander à l'IA
          </button>
        )}
      </div>
    </div>
  );
}
