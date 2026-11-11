"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKamContext } from '@/components/kam/KamContext';
import KamAccountsListView from '@/components/kam/KamAccountsListView';
import KamMeetingReportModal from '@/components/kam/KamMeetingReportModal';
import { StrategicVisit } from '@/components/kam/kamTypes';

export default function KamAccountsPage() {
  const router = useRouter();
  const { visits, searchQuery, loadAssignedAccounts } = useKamContext();
  const [activeDebriefVisit, setActiveDebriefVisit] = useState<StrategicVisit | null>(null);

  const handleOpenBriefing = (visit: StrategicVisit) => {
    router.push(`/kam/briefing?id=${encodeURIComponent(visit.id)}`);
  };

  const handleOpenDebrief = (visit: StrategicVisit) => {
    setActiveDebriefVisit(visit);
  };

  const handleDebriefSaved = (reportId: number) => {
    void loadAssignedAccounts();
    setActiveDebriefVisit(null);
    router.push(`/kam/report?reportId=${reportId}`);
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

      <KamMeetingReportModal
        visit={activeDebriefVisit}
        onClose={() => setActiveDebriefVisit(null)}
        onSaved={handleDebriefSaved}
      />
    </>
  );
}
