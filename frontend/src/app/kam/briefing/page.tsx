"use client";

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useKamContext } from '@/components/kam/KamContext';
import KamPreCallView from '@/components/kam/KamPreCallView';
import { Icons } from '@/components/shared/Icons';

function KamBriefingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { visits, selectedVisitId, setSelectedVisitId } = useKamContext();

  const accountIdParam = searchParams.get('id') || searchParams.get('accountId') || selectedVisitId;
  const from = searchParams.get('from');
  const appointmentId = searchParams.get('appointmentId');

  const handleBack = () => {
    if (from === 'prepare-visit' && appointmentId) {
      router.push(`/kam/prepare-visit?appointmentId=${appointmentId}`);
    } else {
      router.back();
    }
  };

  return (
    <KamPreCallView
      assignedAccounts={visits}
      initialAccountId={accountIdParam}
      onBackToAccounts={handleBack}
      onLaunchMeetingForAccount={(accId) => {
        setSelectedVisitId(String(accId));
        router.push('/kam/agenda');
      }}
    />
  );
}

export default function KamBriefingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <Icons.Sparkles size={28} className="animate-spin text-[#4F6CE8]" />
            <span className="text-xs font-semibold text-zinc-500">Chargement de la fiche Pré-call...</span>
          </div>
        </div>
      }
    >
      <KamBriefingContent />
    </Suspense>
  );
}
