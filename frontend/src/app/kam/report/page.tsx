"use client";

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import KamVisitReportView from '@/components/kam/KamVisitReportView';
import { Icons } from '@/components/shared/Icons';

function KamReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportIdParam = searchParams.get('reportId') || searchParams.get('id');
  const reportId = reportIdParam ? parseInt(reportIdParam, 10) : null;
  const from = searchParams.get('from');

  const handleBack = () => {
    if (from === 'agenda') {
      router.push('/kam/agenda');
    } else if (from === 'visits') {
      router.push('/kam/visits');
    } else {
      router.back();
    }
  };

  return (
    <KamVisitReportView
      reportId={reportId}
      onBack={handleBack}
    />
  );
}

export default function KamReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <Icons.Sparkles size={28} className="animate-spin text-[#4F6CE8]" />
            <span className="text-xs font-semibold text-zinc-500">Chargement du rapport...</span>
          </div>
        </div>
      }
    >
      <KamReportContent />
    </Suspense>
  );
}
