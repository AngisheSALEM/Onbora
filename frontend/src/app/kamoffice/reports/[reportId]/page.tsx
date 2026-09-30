"use client";

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import KamVisitReportView from '@/components/kam/KamVisitReportView';
import { useKamOfficeContext } from '@/components/kamoffice/KamOfficeContext';

export default function KamOfficeReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = use(params);
  const router = useRouter();
  const { setHeaderTitle, setSearchPlaceholder } = useKamOfficeContext();

  useEffect(() => {
    setHeaderTitle('Rapport de visite');
    setSearchPlaceholder('Rechercher rapport, compte, contact...');
  }, [setHeaderTitle, setSearchPlaceholder]);

  return (
    <KamVisitReportView
      key={reportId}
      reportId={Number(reportId)}
      onBack={() => router.push('/kamoffice/reports')}
    />
  );
}
