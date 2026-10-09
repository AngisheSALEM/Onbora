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
    <div className={`bg-[#F6F5F2] dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-2xs ${className}`}>
      {/* Information & Titre */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-800 dark:text-zinc-200 transition-colors">
          {currentTheme === 'dark' ? (
            <Icons.Moon size={20} className="text-zinc-200" />
          ) : (
            <Icons.Sun size={20} className="text-zinc-800" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              Apparence & Thème de l'Interface
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
              {currentTheme === 'dark' ? 'Mode Sombre' : 'Mode Clair'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Basculez entre le thème clair et le thème sombre selon votre préférence visuelle.
          </p>
        </div>
      </div>

      {/* Switch Toggle Interactif */}
      <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto bg-black/5 dark:bg-white/5 p-1.5 px-3 rounded-2xl border border-black/5 dark:border-white/5">
        <button
          type="button"
          onClick={() => handleSelectTheme('light')}
          className={`flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            currentTheme === 'light'
              ? 'text-zinc-900 dark:text-white font-bold'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
          title="Activer le mode clair"
        >
          <Icons.Sun size={14} className={currentTheme === 'light' ? 'text-amber-500' : 'text-zinc-400'} />
          <span>Clair</span>
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={currentTheme === 'dark'}
          aria-label="Basculer entre le mode clair et le mode sombre"
          onClick={() => handleSelectTheme(currentTheme === 'dark' ? 'light' : 'dark')}
          className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out p-0.5 focus:outline-hidden ${
            currentTheme === 'dark' ? 'bg-[#55524E]' : 'bg-black/20'
          }`}
          title={currentTheme === 'dark' ? "Passer au thème clair" : "Passer au thème sombre"}
        >
          <span className="sr-only">Changer de thème</span>
          <span
            className={`pointer-events-none flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-[#1E1C1E] shadow-sm transition-transform duration-200 ease-in-out ${
              currentTheme === 'dark' ? 'translate-x-6' : 'translate-x-0'
            }`}
          >
            {currentTheme === 'dark' ? (
              <Icons.Moon size={12} className="text-zinc-200" />
            ) : (
              <Icons.Sun size={12} className="text-amber-500" />
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTheme('dark')}
          className={`flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            currentTheme === 'dark'
              ? 'text-zinc-900 dark:text-white font-bold'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
          title="Activer le mode sombre"
        >
          <span>Sombre</span>
          <Icons.Moon size={14} className={currentTheme === 'dark' ? 'text-zinc-200' : 'text-zinc-400'} />
        </button>
      </div>
    </div>
  );
}
