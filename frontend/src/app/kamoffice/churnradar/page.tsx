"use client";

import React, { useEffect } from 'react';
import KamChurnRadarView from '@/components/kam/KamChurnRadarView';
import { useKamOfficeContext } from '@/components/kamoffice/KamOfficeContext';

export default function KamOfficeChurnRadarPage() {
  const { setHeaderTitle, setSearchPlaceholder } = useKamOfficeContext();

  useEffect(() => {
    setHeaderTitle("Radar Risque d'Attrition & Ventes Additionnelles");
    setSearchPlaceholder("Rechercher alerte churn, opportunité...");
  }, [setHeaderTitle, setSearchPlaceholder]);

  return <KamChurnRadarView />;
}
