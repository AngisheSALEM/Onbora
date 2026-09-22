"use client";

import React, { useEffect } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { fetchAPI } from '@/lib/api';
import { AdminProvider, useAdminContext } from '@/components/admin/AdminContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

function AdminShell({ children }: { children: React.ReactNode }) {
  const { setCounts } = useAdminContext();

  // Load summary counts once for sidebar badges
  useEffect(() => {
    async function loadSummary() {
      try {
        const [segData, mgrData, kamsData, salesData] = await Promise.allSettled([
          fetchAPI('/api/sales/segmentation-config/'),
          fetchAPI('/api/accounts/managers/'),
          fetchAPI('/api/accounts/kams/'),
          fetchAPI('/api/sales/salespersons/'),
        ]);

        let convertedCount = 0;
        let crmCount = 0;
        if (segData.status === 'fulfilled' && segData.value?.stats) {
          convertedCount = segData.value.stats.total_converted || 0;
          crmCount = segData.value.stats.total_enterprises || 0;
        }

        let supervisorsCount = 0;
        let kamManagersCount = 0;
        if (mgrData.status === 'fulfilled' && Array.isArray(mgrData.value)) {
          supervisorsCount = mgrData.value.filter((m: any) => m.role === 'SUPERVISOR').length;
          kamManagersCount = mgrData.value.filter((m: any) => m.role === 'KAM_MANAGER').length;
        }

        let kamsCount = 0;
        if (kamsData.status === 'fulfilled' && Array.isArray(kamsData.value)) {
          kamsCount = kamsData.value.length;
        }

        let salesCount = 0;
        if (salesData.status === 'fulfilled' && Array.isArray(salesData.value)) {
          salesCount = salesData.value.length;
        }

        setCounts({
          converted: convertedCount,
          crm: crmCount,
          supervisors: supervisorsCount,
          kamManagers: kamManagersCount,
          kams: kamsCount,
          sales: salesCount,
        });
      } catch (e) {
        console.error("Failed to load initial summary counts:", e);
      }
    }
    loadSummary();
  }, [setCounts]);

  return (
    <div className="flex h-screen w-full bg-[#ECEAE5] dark:bg-[#242124] p-4 gap-4 text-[#242124] dark:text-white font-sans antialiased overflow-hidden select-none transition-colors duration-300">
      <AdminSidebar />
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden gap-4">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto pr-1 pb-4 flex flex-col gap-5">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AdminProvider>
        <AdminShell>{children}</AdminShell>
      </AdminProvider>
    </ProtectedRoute>
  );
}
