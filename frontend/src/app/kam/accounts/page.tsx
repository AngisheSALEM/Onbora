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
