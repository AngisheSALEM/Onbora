"use client";

import React, { useEffect } from 'react';
import KamLeadScoringView from '@/components/kam/KamLeadScoringView';
import { useKamOfficeContext } from '@/components/kamoffice/KamOfficeContext';

export default function KamOfficeLeadScoringPage() {
  const { setHeaderTitle, setSearchPlaceholder } = useKamOfficeContext();

  useEffect(() => {
    setHeaderTitle("Scoring B2B & Priorisation IA");
    setSearchPlaceholder("Rechercher un lead qualifié...");
  }, [setHeaderTitle, setSearchPlaceholder]);

  return <KamLeadScoringView />;
}
