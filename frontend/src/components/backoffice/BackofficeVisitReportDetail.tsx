"use client";

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import KamVisitReportView from '@/components/kam/KamVisitReportView';
import { useBackofficeContext } from './BackofficeContext';
import { fetchBackofficeReport } from './backofficeReport';

interface BackofficeVisitReportDetailProps {
  reportId: number;
  reportType: string;
  from?: string;
}

export default function BackofficeVisitReportDetail({ reportId, reportType, from }: BackofficeVisitReportDetailProps) {
  const router = useRouter();
  const { setHeaderTitle, setSearchPlaceholder } = useBackofficeContext();
  const fetchReport = useCallback((id: number, signal?: AbortSignal) =>
    fetchBackofficeReport(reportType, id, signal), [reportType]);
  const returnPage = from && ['daily-report', 'soho-managed', 'salespersons'].includes(from) ? from : 'daily-report';

  useEffect(() => {
    setHeaderTitle('Rapport de visite');
    setSearchPlaceholder('Rechercher dans le flux d’activité...');
  }, [setHeaderTitle, setSearchPlaceholder]);

  return (
    <KamVisitReportView
      key={`${reportType}-${reportId}`}
      reportId={reportId}
      fetchReport={fetchReport}
      allowCrmSync={false}
      onBack={() => router.push(`/backoffice/${returnPage}`)}
    />
  );
}
