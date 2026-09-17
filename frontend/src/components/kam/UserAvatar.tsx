"use client";

import React, { useState } from 'react';

export type ActivityStatus = 'AVAILABLE' | 'CLIENT_MEETING' | 'IN_MEETING' | 'UNAVAILABLE';

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  status?: ActivityStatus | null;
  showStatusDot?: boolean;
  alt?: string;
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

const DOT_SIZE_CLASSES = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
};

const STATUS_COLORS: Record<ActivityStatus, string> = {
  AVAILABLE: 'bg-emerald-500',
  CLIENT_MEETING: 'bg-amber-500',
  IN_MEETING: 'bg-[#4F6CE8]',
  UNAVAILABLE: 'bg-zinc-400',
};

export default function UserAvatar({
  src,
  name = '',
  size = 'md',
  className = '',
  status,
  showStatusDot = false,
  alt = 'Avatar',
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Filter out any legacy memojis path
  const isMemoji = src ? src.includes('memoji') || src.includes('assets/memojis') : false;
  const validSrc = !isMemoji && src && src.trim() !== '' ? src : null;

  // Compute initials as secondary fallback
  const getInitials = (str: string) => {
    if (!str) return 'U';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  // Resolve media URLs to full API host if necessary
  const resolveSrc = (path: string | null | undefined) => {
    if (!path) return '/avatars/default_avatar.svg';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/media/')) {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      return `${apiBase}${path}`;
    }
    return path;
  };

  // Only use image if we have a valid, non-memoji source and no load error
  const hasRealPhoto = Boolean(validSrc && !imageError);
  const initials = getInitials(name);

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 rounded-2xl overflow-visible select-none ${className}`}>
      <div className={`relative flex items-center justify-center rounded-2xl overflow-hidden font-extrabold border border-black/5 dark:border-white/5 ${SIZE_CLASSES[size]} ${
        hasRealPhoto ? 'bg-black/5 dark:bg-white/10 text-zinc-800 dark:text-white' : 'bg-[#4F6CE8]/12 dark:bg-[#4F6CE8]/20 text-[#4F6CE8] dark:text-[#7C97F8]'
      }`}>
        {hasRealPhoto ? (
          <img
            src={resolveSrc(validSrc)}
            alt={alt || name || 'Photo de profil'}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : initials && initials !== 'U' ? (
          <span className="font-bold tracking-tight select-none">{initials}</span>
        ) : (
          <img
            src="/avatars/default_avatar.svg"
            alt={alt || name || 'Avatar par défaut'}
            className="w-full h-full object-cover opacity-80"
          />
        )}
      </div>

      {showStatusDot && status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-[#242124] ${DOT_SIZE_CLASSES[size]} ${STATUS_COLORS[status] || 'bg-zinc-400'}`}
          title={`Statut : ${status}`}
        />
      )}
    </div>
  );
}
