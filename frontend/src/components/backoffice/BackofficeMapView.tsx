"use client";

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useBackofficeContext } from './BackofficeContext';

const SupervisorTerritoryMap = dynamic(
  () => import('@/components/supervisor/SupervisorTerritoryMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] rounded-3xl flex flex-col items-center justify-center gap-3 bg-black/5 dark:bg-white/5 text-xs text-[#6E6C67] dark:text-[#A1A1AA] font-semibold">
        <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
        <span>Chargement de la carte interactive & moteur de plaques...</span>
      </div>
    ),
  }
);

export default function BackofficeMapView() {
  const router = useRouter();
  const {
    plaques,
    enterprises,
    salespersons,
    recentReportsFeed,
    loadDashboardData,
    setHeaderTitle,
    setSearchPlaceholder,
  } = useBackofficeContext();

  useEffect(() => {
    setHeaderTitle("Carte Territoire Interactive");
    setSearchPlaceholder("Rechercher sur la carte...");
  }, [setHeaderTitle, setSearchPlaceholder]);

  return (
    <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-4 border border-black/5 dark:border-white/5 overflow-hidden">
      <SupervisorTerritoryMap
        plaques={plaques as any}
        enterprises={enterprises as any}
        salespersons={salespersons as any}
        recentReports={recentReportsFeed as any}
        onPlaqueCreated={loadDashboardData}
        onSalespersonAssigned={loadDashboardData}
        onSalespersonChanged={loadDashboardData}
        onOpenPlaqueDetail={(_plaque) => {
          router.push('/backoffice/plaques');
        }}
      />
    </div>
  );
}
