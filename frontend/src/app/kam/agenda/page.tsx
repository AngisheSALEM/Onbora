"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useKamContext } from '@/components/kam/KamContext';
import KamAgendaView from '@/components/kam/KamAgendaView';

export default function KamAgendaPage() {
  const router = useRouter();
  const { visits, updateVisit } = useKamContext();

  return (
    <KamAgendaView
      assignedAccounts={visits}
      onOpenVisitsHistory={() => router.push('/kam/visits')}
      onOpenReport={(reportId) => router.push(`/kam/report?reportId=${reportId}&from=agenda`)}
      onAccountUpdated={updateVisit}
    />
  );
}
