"use client";

import React from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { KamProvider, useKamContext } from '@/components/kam/KamContext';
import KamSidebar from '@/components/kam/KamSidebar';
import KamHeader from '@/components/kam/KamHeader';
import { Icons } from '@/components/shared/Icons';

function KamShell({ children }: { children: React.ReactNode }) {
  const { loading, error, loadAssignedAccounts, visits } = useKamContext();

  return (
    <div className="flex h-screen w-full bg-[#ECEAE5] dark:bg-[#242124] text-zinc-900 dark:text-white font-sans antialiased overflow-hidden select-none transition-colors duration-300">
      <KamSidebar unreadSignalsCount={visits.length > 0 ? 1 : 0} />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <KamHeader />
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-3">
              <Icons.Sparkles size={32} className="animate-spin text-[#4F6CE8]" />
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Chargement de votre portefeuille de comptes assignés...
              </span>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="p-8 max-w-md bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 text-center space-y-3">
              <Icons.AlertTriangle size={32} className="text-rose-500 mx-auto" />
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">Portefeuille indisponible</h3>
              <p className="text-xs text-zinc-500">{error}</p>
              <button
                onClick={loadAssignedAccounts}
                className="px-4 py-2 bg-[#4F6CE8] hover:bg-[#3D57C5] text-white rounded-xl text-xs font-semibold cursor-pointer transition-all"
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}

export default function KamLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['KAM', 'ADMIN']}>
      <KamProvider>
        <KamShell>{children}</KamShell>
      </KamProvider>
    </ProtectedRoute>
  );
}
