"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKamContext } from '@/components/kam/KamContext';
import { useAuth } from '@/context/AuthContext';
import KamAccountsListView from '@/components/kam/KamAccountsListView';
import KamVoiceDebriefModal from '@/components/kam/KamVoiceDebriefModal';
import { StrategicVisit } from '@/components/kam/kamTypes';
import { Icons } from '@/components/shared/Icons';

export default function KamAccountsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { visits, searchQuery, loadAssignedAccounts, updateVisit } = useKamContext();
  const [activeDebriefVisit, setActiveDebriefVisit] = useState<StrategicVisit | null>(null);

  const handleOpenBriefing = (visit: StrategicVisit) => {
    router.push(`/kam/briefing?id=${encodeURIComponent(visit.id)}`);
  };

  const handleOpenDebrief = (visit: StrategicVisit) => {
    setActiveDebriefVisit(visit);
  };

  const handleDebriefSaved = (updatedVisit: StrategicVisit) => {
    updateVisit(updatedVisit);
    setActiveDebriefVisit(null);
  };

  if (visits.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="p-12 max-w-lg bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[32px] border border-black/5 dark:border-white/5 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#4F6CE8]/10 text-[#4F6CE8] mx-auto flex items-center justify-center">
            <Icons.Folder size={28} />
          </div>
          <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">
            Aucun compte assigné pour le moment
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Votre superviseur du <strong className="text-zinc-800 dark:text-zinc-200">KAM Office</strong> n&apos;a pas encore affecté de comptes Grands Comptes ou PME à votre profil (<span className="font-mono text-[#4F6CE8]">{user?.username}</span>). Dès qu&apos;une attribution est effectuée dans le tableau de bord Direction, vos comptes s&apos;afficheront ici en direct.
          </p>
          <button
            onClick={loadAssignedAccounts}
            className="px-5 py-2.5 bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 text-white rounded-full text-xs font-semibold cursor-pointer transition-all inline-flex items-center gap-2"
          >
            <Icons.RefreshCw size={14} />
            <span>Actualiser mon portefeuille</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <KamAccountsListView
        visits={visits}
        searchQuery={searchQuery}
        onSelectAccount={handleOpenBriefing}
        onOpenBriefing={handleOpenBriefing}
        onOpenDebrief={handleOpenDebrief}
      />

      <KamVoiceDebriefModal
        visit={activeDebriefVisit}
        isOpen={!!activeDebriefVisit}
        onClose={() => setActiveDebriefVisit(null)}
        onDebriefSaved={handleDebriefSaved}
      />
    </>
  );
}
