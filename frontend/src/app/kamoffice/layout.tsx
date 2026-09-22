"use client";

import React from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { KamOfficeProvider, useKamOfficeContext } from '@/components/kamoffice/KamOfficeContext';
import KamOfficeSidebar from '@/components/kamoffice/KamOfficeSidebar';
import KamOfficeHeader from '@/components/kamoffice/KamOfficeHeader';

function KamOfficeShell({ children }: { children: React.ReactNode }) {
  const { loadKamOfficeData, loadingData } = useKamOfficeContext();

  return (
    <div className="flex h-screen w-full bg-[#ECEAE5] dark:bg-[#242124] text-zinc-900 dark:text-white font-sans antialiased overflow-hidden select-none transition-colors duration-300">
      <KamOfficeSidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden p-4 pl-4 min-w-0">
        <KamOfficeHeader onRefresh={loadKamOfficeData} loading={loadingData} />
        <main className="flex-1 overflow-y-auto pr-1 pb-4 flex flex-col gap-4">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function KamOfficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['KAM_MANAGER', 'ADMIN']}>
      <KamOfficeProvider>
        <KamOfficeShell>{children}</KamOfficeShell>
      </KamOfficeProvider>
    </ProtectedRoute>
  );
}
