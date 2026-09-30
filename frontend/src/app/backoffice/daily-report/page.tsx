"use client";

import React, { useEffect } from 'react';
import DailyReportView from '@/components/backoffice/DailyReportView';
import { useBackofficeContext } from '@/components/backoffice/BackofficeContext';

export default function BackofficeDailyReportPage() {
  const {
    recentReportsFeed,
    recentFormSubmissions,
    salespersons,
    enterprises,
    plaques,
    openReportDetail,
    loadDashboardData,
    loading,
    setHeaderTitle,
    setSearchPlaceholder,
  } = useBackofficeContext();

  useEffect(() => {
    setHeaderTitle("Rapport de la Journée");
    setSearchPlaceholder("Rechercher dans le flux d'activité...");
  }, [setHeaderTitle, setSearchPlaceholder]);

  return (
    <>
      <DailyReportView
        reports={recentReportsFeed}
        submissions={recentFormSubmissions}
        salespersons={salespersons}
        enterprises={enterprises}
        plaques={plaques}
        onOpenReportDetail={openReportDetail}
        onRefresh={loadDashboardData}
        loading={loading}
      />
    </>
  );
}
