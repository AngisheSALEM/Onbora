"use client";

import React, { useState } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import KamSidebar, { KamView } from '@/components/kam/KamSidebar';
import KamHeader from '@/components/kam/KamHeader';
import KamAccountsListView from '@/components/kam/KamAccountsListView';
import KamBriefingView from '@/components/kam/KamBriefingView';
import KamSignalsView from '@/components/kam/KamSignalsView';
import KamDebriefView from '@/components/kam/KamDebriefView';
import KamSearchPalette from '@/components/kam/KamSearchPalette';
import KamCreateAccountModal from '@/components/kam/KamCreateAccountModal';
import { mockStrategicVisits } from '@/components/kam/kamMockData';
import { StrategicVisit } from '@/components/kam/kamTypes';

export default function KamCommandCenterPage() {
  const [visits, setVisits] = useState<StrategicVisit[]>(mockStrategicVisits);
  const [selectedVisitId, setSelectedVisitId] = useState<string>(mockStrategicVisits[0].id);
  const [activeView, setActiveView] = useState<KamView>('accounts');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);

  const selectedVisit = visits.find((v) => v.id === selectedVisitId) || visits[0];

  const handleOpenBriefingForAccount = (visit: StrategicVisit) => {
    setSelectedVisitId(visit.id);
    setActiveView('briefing');
  };

  const handleOpenDebriefForAccount = (visit: StrategicVisit) => {
    setSelectedVisitId(visit.id);
    setActiveView('debrief');
  };

  const handleAddNewAccount = (newAccount: StrategicVisit) => {
    setVisits((prev) => [newAccount, ...prev]);
    setSelectedVisitId(newAccount.id);
    setActiveView('briefing');
  };

  return (
    <ProtectedRoute allowedRoles={['KAM', 'ADMIN']}>
      <div className="flex h-screen w-full bg-[#ECEAE5] dark:bg-[#242124] text-zinc-900 dark:text-white font-sans antialiased overflow-hidden select-none transition-colors duration-300">
        
        {/* 1. FLOATING LEFT VERTICAL NAVIGATION SIDEBAR (Apple Glassmorphism) */}
        <KamSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          unreadSignalsCount={3}
        />

        {/* 2. MAIN WORKSPACE CONTENT AREA */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Top Header Bar : Floating Search Pill & Breadcrumb */}
          <KamHeader
            activeView={activeView}
            accountName={selectedVisit.account_name}
            onOpenSearch={() => setIsSearchOpen(true)}
          />

          {/* Dynamic Active View Rendering */}
          <div className="flex-1 flex overflow-hidden">
            {activeView === 'accounts' && (
              <KamAccountsListView
                visits={visits}
                onSelectAccount={handleOpenBriefingForAccount}
                onOpenBriefing={handleOpenBriefingForAccount}
                onOpenDebrief={handleOpenDebriefForAccount}
                onOpenCreateAccount={() => setIsCreateAccountOpen(true)}
              />
            )}

            {activeView === 'briefing' && (
              <KamBriefingView
                visits={visits}
                selectedVisitId={selectedVisitId}
                onSelectVisitId={setSelectedVisitId}
                onLaunchDebrief={handleOpenDebriefForAccount}
              />
            )}

            {activeView === 'signals' && (
              <KamSignalsView
                visits={visits}
                onOpenBriefingForAccount={handleOpenBriefingForAccount}
              />
            )}

            {activeView === 'debrief' && (
              <KamDebriefView
                visits={visits}
                selectedVisitId={selectedVisitId}
                onSelectVisitId={setSelectedVisitId}
              />
            )}
          </div>

        </main>

        {/* CREATE NEW STRATEGIC ACCOUNT MODAL */}
        <KamCreateAccountModal
          isOpen={isCreateAccountOpen}
          onClose={() => setIsCreateAccountOpen(false)}
          onAddAccount={handleAddNewAccount}
        />

        {/* SPOTLIGHT SEARCH PALETTE (⌘K) */}
        <KamSearchPalette
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          visits={visits}
          onSelectVisit={(v) => {
            setSelectedVisitId(v.id);
            setActiveView('briefing');
          }}
        />

      </div>
    </ProtectedRoute>
  );
}
