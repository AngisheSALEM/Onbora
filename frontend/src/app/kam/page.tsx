"use client";

import React, { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/lib/api';
import KamSidebar, { KamView } from '@/components/kam/KamSidebar';
import KamHeader from '@/components/kam/KamHeader';
import KamAccountsListView from '@/components/kam/KamAccountsListView';
import KamBriefingView from '@/components/kam/KamBriefingView';
import KamSignalsView from '@/components/kam/KamSignalsView';
import KamDebriefView from '@/components/kam/KamDebriefView';
import KamCreateAccountModal from '@/components/kam/KamCreateAccountModal';
import { StrategicVisit } from '@/components/kam/kamTypes';
import { Icons } from '@/components/shared/Icons';

export default function KamCommandCenterPage() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<StrategicVisit[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [activeView, setActiveView] = useState<KamView>('accounts');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chargement des comptes STRICTEMENT assignés au KAM connecté
  const loadAssignedAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAPI('/api/kam/accounts/');
      if (data && Array.isArray(data.accounts)) {
        setVisits(data.accounts);
        if (data.accounts.length > 0) {
          setSelectedVisitId((prev) => {
            const exists = data.accounts.some((v: StrategicVisit) => v.id === prev);
            return exists ? prev : data.accounts[0].id;
          });
        }
      }
    } catch (err: any) {
      console.error("Erreur lors de la récupération des comptes KAM assignés:", err);
      setError("Impossible de charger votre portefeuille de comptes. Veuillez vérifier votre session.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignedAccounts();
  }, [loadAssignedAccounts]);

  const selectedVisit = visits.find((v) => v.id === selectedVisitId) || visits[0] || null;

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

  const handleDebriefSaved = (updatedVisit: StrategicVisit) => {
    setVisits((prev) => prev.map((v) => (v.id === updatedVisit.id ? updatedVisit : v)));
  };

  return (
    <ProtectedRoute allowedRoles={['KAM']}>
      <div className="flex h-screen w-full bg-[#ECEAE5] dark:bg-[#242124] text-zinc-900 dark:text-white font-sans antialiased overflow-hidden select-none transition-colors duration-300">
        
        {/* 1. FLOATING LEFT VERTICAL NAVIGATION SIDEBAR */}
        <KamSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          unreadSignalsCount={visits.filter(v => v.dot_color === 'orange').length || 1}
        />

        {/* 2. MAIN WORKSPACE CONTENT AREA */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Top Header Bar : Floating Live Search Input & Page Title */}
          <KamHeader
            activeView={activeView}
            accountName={selectedVisit?.account_name}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {/* Loading Indicator */}
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
                <Icons.AlertTriangle size={32} className="text-amber-500 mx-auto" />
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">Portefeuille indisponible</h3>
                <p className="text-xs text-zinc-500">{error}</p>
                <button
                  onClick={loadAssignedAccounts}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all"
                >
                  Réessayer
                </button>
              </div>
            </div>
          ) : visits.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="p-12 max-w-lg bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[32px] border border-black/5 dark:border-white/5 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 mx-auto flex items-center justify-center">
                  <Icons.Folder size={28} />
                </div>
                <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">
                  Aucun compte assigné pour le moment
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Votre superviseur du <strong className="text-zinc-800 dark:text-zinc-200">KAM Office</strong> n&apos;a pas encore affecté de comptes Grands Comptes ou PME à votre profil (<span className="font-mono text-blue-600">{user?.username}</span>). Dès qu&apos;une attribution est effectuée dans le tableau de bord Direction, vos comptes s&apos;afficheront ici en direct.
                </p>
                <button
                  onClick={loadAssignedAccounts}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full text-xs font-semibold cursor-pointer transition-all inline-flex items-center gap-2"
                >
                  <Icons.RefreshCw size={14} />
                  <span>Actualiser mon portefeuille</span>
                </button>
              </div>
            </div>
          ) : (
            /* Dynamic Active View Rendering */
            <div className="flex-1 flex overflow-hidden">
              {activeView === 'accounts' && (
                <KamAccountsListView
                  visits={visits}
                  searchQuery={searchQuery}
                  onSelectAccount={handleOpenBriefingForAccount}
                  onOpenBriefing={handleOpenBriefingForAccount}
                  onOpenDebrief={handleOpenDebriefForAccount}
                  onOpenCreateAccount={() => setIsCreateAccountOpen(true)}
                />
              )}

              {activeView === 'briefing' && selectedVisit && (
                <KamBriefingView
                  visits={visits}
                  selectedVisitId={selectedVisit.id}
                  onSelectVisitId={setSelectedVisitId}
                  onLaunchDebrief={handleOpenDebriefForAccount}
                  onBackToAccounts={() => setActiveView('accounts')}
                />
              )}

              {activeView === 'signals' && (
                <KamSignalsView
                  visits={visits}
                  onOpenBriefingForAccount={handleOpenBriefingForAccount}
                />
              )}

              {activeView === 'debrief' && selectedVisit && (
                <KamDebriefView
                  visits={visits}
                  selectedVisitId={selectedVisit.id}
                  onSelectVisitId={setSelectedVisitId}
                  onDebriefSaved={handleDebriefSaved}
                />
              )}
            </div>
          )}

        </main>

        {/* CREATE NEW STRATEGIC ACCOUNT MODAL */}
        <KamCreateAccountModal
          isOpen={isCreateAccountOpen}
          onClose={() => setIsCreateAccountOpen(false)}
          onAddAccount={handleAddNewAccount}
        />

      </div>
    </ProtectedRoute>
  );
}

