"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import KamVisitsHistoryView, { KamVisitRecord } from '@/components/kam/KamVisitsHistoryView';

export default function KamVisitsPage() {
  const router = useRouter();

  return (
    <KamVisitsHistoryView
      onScheduleMeeting={() => router.push('/kam/agenda')}
      onOpenReport={(record: KamVisitRecord) => router.push(`/kam/report?reportId=${record.id}&from=visits`)}
    />
  );
}
