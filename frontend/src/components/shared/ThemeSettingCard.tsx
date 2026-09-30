"use client";

import React, { useState, useEffect } from 'react';
import { Icons } from '@/components/shared/Icons';

interface ThemeSettingCardProps {
  className?: string;
}

export default function ThemeSettingCard({ className = "" }: ThemeSettingCardProps) {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Lire la préférence actuelle depuis localStorage ou classList du document
    const isDark = document.documentElement.classList.contains('dark');
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initial = saved || (isDark ? 'dark' : 'light');
    setCurrentTheme(initial);

    // Écouter les changements de thème globaux (par ex. depuis le header ThemeToggle)
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: 'light' | 'dark' }>;
      if (customEvent.detail?.theme) {
        setCurrentTheme(customEvent.detail.theme);
      }
    };

    window.addEventListener('onbora:theme_changed', handleThemeChange);
    return () => {
      window.removeEventListener('onbora:theme_changed', handleThemeChange);
    };
  }, []);

  const handleSelectTheme = (newTheme: 'light' | 'dark') => {
    setCurrentTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Notifier tous les toggles et composants de l'application
    window.dispatchEvent(
      new CustomEvent('onbora:theme_changed', { detail: { theme: newTheme } })
    );
  };

  return (
    <div className={`bg-[#F6F5F2] dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-5 shadow-xs ${className}`}>
      {/* En-tête de la section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <Icons.Sun size={17} className="text-[#787570]" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              Apparence & Thème de l'Interface
            </h3>
          </div>
         
        </div>

        <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA] shrink-0 self-start sm:self-auto">
          Thème actif : <strong className="text-[#242124] dark:text-white capitalize">{currentTheme === 'dark' ? 'Sombre' : 'Clair'}</strong>
        </span>
      </div>

      {/* Cartes de sélection Clair / Sombre */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        {/* CARTE 1 : THÈME CLAIR */}
        <div
          onClick={() => handleSelectTheme('light')}
          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 ${
            currentTheme === 'light'
              ? 'border-[#9B978F] bg-white dark:bg-[#242124] shadow-xs'
              : 'border-black/5 dark:border-white/5 bg-white/60 dark:bg-[#242124]/60 hover:border-black/20 dark:hover:border-white/20'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                  <Icons.Sun size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Mode Clair
                  </h4>
                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                    Standard diurne
                  </span>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  currentTheme === 'light'
                    ? 'border-[#9B978F] bg-[#55524E]'
                    : 'border-zinc-300 dark:border-zinc-600'
                }`}
              >
                {currentTheme === 'light' && <Icons.Check size={11} className="text-white" />}
              </div>
            </div>

          
         
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSelectTheme('light');
            }}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              currentTheme === 'light'
                ? 'bg-[#55524E] text-white'
                : 'bg-black/5 dark:bg-white/5 text-[#242124] dark:text-white hover:bg-black/10'
            }`}
          >
            {currentTheme === 'light' ? (
              <>
                <Icons.Check size={13} />
                <span>Actif</span>
              </>
            ) : (
              <span>Activer le mode clair</span>
            )}
          </button>
        </div>

        {/* CARTE 2 : THÈME SOMBRE */}
        <div
          onClick={() => handleSelectTheme('dark')}
          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 ${
            currentTheme === 'dark'
              ? 'border-[#9B978F] bg-white dark:bg-[#242124] shadow-xs'
              : 'border-black/5 dark:border-white/5 bg-white/60 dark:bg-[#242124]/60 hover:border-black/20 dark:hover:border-white/20'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-500/15 text-zinc-500 dark:text-zinc-400 flex items-center justify-center shrink-0">
                  <Icons.Moon size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Mode Sombre
                  </h4>
                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                    Confort nocturne
                  </span>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  currentTheme === 'dark'
                    ? 'border-[#9B978F] bg-[#55524E]'
                    : 'border-zinc-300 dark:border-zinc-600'
                }`}
              >
                {currentTheme === 'dark' && <Icons.Check size={11} className="text-white" />}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSelectTheme('dark');
            }}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              currentTheme === 'dark'
                ? 'bg-[#55524E] text-white'
                : 'bg-black/5 dark:bg-white/5 text-[#242124] dark:text-white hover:bg-black/10'
            }`}
          >
            {currentTheme === 'dark' ? (
              <>
                <Icons.Check size={13} />
                <span>Actif</span>
              </>
            ) : (
              <span>Activer le mode sombre</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
