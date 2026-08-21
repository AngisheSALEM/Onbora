"use client";

import React, { useState, useEffect } from 'react';
import { Icons } from '../shared/Icons';

interface TrainingLauncherProps {
  onClick: () => void;
  hasNewNotification?: boolean;
}

export default function TrainingLauncher({
  onClick,
  hasNewNotification = true
}: TrainingLauncherProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (hasNewNotification) {
      // Auto show tooltip after 2s for attention, hide after 8s
      const timer = setTimeout(() => {
        setShowTooltip(true);
      }, 2000);
      const hideTimer = setTimeout(() => {
        setShowTooltip(false);
      }, 8000);

      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    }
  }, [hasNewNotification]);

  return (
    <div className="relative inline-block">
      {/* Launcher Button */}
      <button
        onClick={() => {
          onClick();
          setShowTooltip(false);
        }}
        className="relative p-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/15 border border-blue-600/20 text-blue-600 dark:text-blue-400 transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
      >
        <Icons.BookOpen size={16} className="animate-pulse" />
        <span className="text-xs font-bold font-sans">
          Apprentissage & Aide
        </span>
        
        {/* Notification Badge */}
        {hasNewNotification && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
          </span>
        )}
      </button>

      {/* Popover Tooltip for Just-in-Time Learning Alert */}
      {hasNewNotification && showTooltip && (
        <div className="absolute right-0 top-12 w-64 studio-card shadow-2xl p-3.5 z-50 animate-fade-in flex flex-col gap-2">
          {/* Arrow */}
          <div className="absolute -top-1.5 right-6 w-3 h-3 bg-[#F1F2F6] dark:bg-[#1C1C22] rotate-45"></div>
          
          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-600/20 shrink-0">
              <Icons.Sparkles size={12} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-extrabold uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                Nouveau Service Activé
              </span>
              <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                Le MSP vient d'activer votre double authentification (MFA).
              </p>
            </div>
          </div>

          <p className="text-[10px] text-zinc-650 dark:text-zinc-400 font-medium leading-relaxed mt-0.5">
            Une formation interactive d'une minute est disponible pour associer votre compte de façon sécurisée.
          </p>

          <div className="flex justify-between items-center gap-3 mt-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setShowTooltip(false)}
              className="text-[9px] font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 border-none bg-transparent cursor-pointer"
            >
              Plus tard
            </button>
            <button
              onClick={() => {
                onClick();
                setShowTooltip(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-[9px] font-bold text-white transition-all border-none cursor-pointer shadow-[0_0_10px_rgba(37,99,235,0.20)]"
            >
              Commencer (2 min)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
