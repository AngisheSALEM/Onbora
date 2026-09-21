"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Icons } from '@/components/shared/Icons';
import UserAvatar, { ActivityStatus } from './UserAvatar';

export default function KamProfileCapsule() {
  const { user, logout } = useAuth();
  const [activityStatus, setActivityStatus] = useState<ActivityStatus>('AVAILABLE');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('onbora_kam_activity_status') as ActivityStatus | null;
      if (saved) setActivityStatus(saved);
    } catch {
      // ignore
    }

    const handleStatusChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ status: ActivityStatus }>;
      if (customEvent.detail?.status) {
        setActivityStatus(customEvent.detail.status);
      }
    };

    window.addEventListener('kam:activity_status_changed', handleStatusChange);
    return () => {
      window.removeEventListener('kam:activity_status_changed', handleStatusChange);
    };
  }, []);

  const displayName = user ? `${user.first_name || user.username}` : 'Salem';
  const roleLabel = 'Directeur Grands Comptes (KAM)';
  const userEmail = user?.email || 'salem.kam@orange.com';

  return (
    <div className="w-full flex items-center justify-between p-3.5 bg-[#0B0B0F] rounded-full shadow-lg">
      <div className="flex items-center gap-3">
        {/* Avatar with Status Dot */}
        <UserAvatar
          src={user?.profile_picture_url || user?.avatar}
          name={displayName}
          size="md"
          showStatusDot
          status={activityStatus}
        />

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
