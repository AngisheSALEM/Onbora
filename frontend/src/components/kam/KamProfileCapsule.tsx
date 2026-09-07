"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Icons } from '@/components/shared/Icons';

export default function KamProfileCapsule() {
  const { user, logout } = useAuth();

  const displayName = user ? `${user.first_name || user.username}` : 'Salem';
  const roleLabel = 'Directeur Grands Comptes (KAM)';
  const userEmail = user?.email || 'salem.kam@orange.com';

  return (
    <div className="w-full flex items-center justify-between p-3.5 bg-[#0B0B0F] rounded-full shadow-lg">
      <div className="flex items-center gap-3">
        {/* Avatar with Status Dot */}
        <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-zinc-800 border border-white/10 text-white font-extrabold text-sm shadow-sm shrink-0 overflow-hidden">
          <img
            src={`/memojis/${(user?.avatar || 'memoji_019.png').replace('assets/memojis/', '')}`}
            alt="Memoji"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#0B0B0F]" />
        </div>

        {/* User Info */}
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-white leading-tight">
            {displayName}
          </span>
          <span className="text-[11px] font-medium text-zinc-400 truncate max-w-[140px] md:max-w-[180px]">
            {userEmail}
          </span>
        </div>
      </div>

      {/* Metric & Logout */}
      <div className="flex items-center gap-2 pr-1">
        <div className="hidden xl:flex flex-col items-end mr-2">
          <span className="text-[10px] uppercase font-semibold text-zinc-500">Portefeuille</span>
          <span className="text-xs font-mono font-extrabold text-white">485 k€ MRR</span>
        </div>

        <button
          onClick={() => logout()}
          title="Déconnexion"
          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors active:scale-95 cursor-pointer"
        >
          <Icons.LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
