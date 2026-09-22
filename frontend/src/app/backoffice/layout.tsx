"use client";

import React from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { BackofficeProvider, useBackofficeContext } from '@/components/backoffice/BackofficeContext';
import BackofficeSidebar from '@/components/backoffice/BackofficeSidebar';
import BackofficeHeader from '@/components/backoffice/BackofficeHeader';

function BackofficeShell({ children }: { children: React.ReactNode }) {
  const { loadDashboardData, loading } = useBackofficeContext();

  return (
    <div className="flex h-screen w-full bg-[#ECEAE5] dark:bg-[#242124] p-4 gap-4 text-[#242124] dark:text-white font-sans antialiased overflow-hidden select-none transition-colors duration-300">
      <BackofficeSidebar />
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <BackofficeHeader onRefresh={loadDashboardData} loading={loading} />
        <main className="flex-1 overflow-y-auto pr-1 pb-4 flex flex-col gap-4">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['SUPERVISOR', 'ADMIN']}>
      <BackofficeProvider>
        <BackofficeShell>{children}</BackofficeShell>
      </BackofficeProvider>
    </ProtectedRoute>
  );
}
