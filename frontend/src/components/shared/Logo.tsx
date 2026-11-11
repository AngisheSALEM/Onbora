/* eslint-disable @next/next/no-img-element */
"use client";

import React from 'react';

interface LogoProps {
  className?: string;
  showBg?: boolean;
  size?: number;
  variant?: 'icon' | 'full';
  primaryColor?: string;
  accentColor?: string;
}

/**
 * Composant Logo officiel d'Onbora (Identité officielle).
 * - En mode 'full' : Lockup horizontal complet ("On" badge + typographie "bora").
 *   Bascule automatique : texte noir en light mode, texte blanc pur en dark mode.
 * - En mode 'icon' (défaut) : Badge monogramme officiel "On" (Bleu Cobalt #4F6CE8).
 */
export default function Logo({
  className = "",
  showBg = false,
  size = 36,
  variant = 'icon',
}: LogoProps) {
  // Mode Lockup complet (Badge 'On' + 'bora')
  if (variant === 'full') {
    // Ratio original : 745w / 282h ≈ 2.64
    const width = Math.round(size * (711 / 270));

    return (
      <div
        className={`relative inline-flex items-center select-none transition-transform duration-200 ${className}`}
        style={{ height: size, width }}
      >
        {/* Version Light Mode (texte bora noir) */}
        <img
          src="/onbora_logo.png?v=3"
          alt="Onbora"
          width={width}
          height={size}
          className="w-full h-full object-contain dark:hidden"
          loading="eager"
        />
        {/* Version Dark Mode (texte bora blanc) */}
        <img
          src="/onbora_logo_dark.png?v=3"
          alt="Onbora"
          width={width}
          height={size}
          className="w-full h-full object-contain hidden dark:block"
          loading="eager"
        />
      </div>
    );
  }

  // Mode Icône / Favicon (Badge 'On' seul)
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none transition-transform duration-200 ${
        showBg ? "shadow-sm" : ""
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/icon.png?v=3"
        alt="Logo Onbora"
        width={size}
        height={size}
        className="w-full h-full object-contain"
        loading="eager"
      />
    </div>
  );
}
