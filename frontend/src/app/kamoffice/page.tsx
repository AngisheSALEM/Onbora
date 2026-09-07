"use client";

import React, { useState, useEffect, useMemo } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/lib/api';
import Logo from '@/components/shared/Logo';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { Icons } from '@/components/shared/Icons';

interface KamOfficeMetrics {
  total_accounts: number;
  grands_comptes_count: number;
  pme_count: number;
  assigned_count: number;
  unassigned_count: number;
  unassigned_grands_comptes: number;
  unassigned_pme: number;
  assignment_rate_percent: number;
  total_annual_revenue_usd: number;
  total_converted_count: number;
  total_signed_amount_usd: number;
  total_kams_count: number;
  gc_specialist_kams: number;
  pme_specialist_kams: number;
}

interface KamUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  location: string;
  is_available: boolean;
  is_active: boolean;
  kam_specialization: 'GRAND_COMPTE' | 'PME';
  kam_specialization_display: string;
  avatar?: string;
  assigned_total_count: number;
  assigned_grands_comptes_count: number;
  assigned_pme_count: number;
  total_portfolio_revenue_usd: number;
  converted_accounts_count: number;
  converted_amount_usd: number;
}

interface KamAccount {
  id: number;
  crm_id: string;
  name: string;
  sector: string;
  city: string;
  commune: string;
  address: string;
  annual_revenue: number;
  employee_count: number;
  site_count: number;
  segment: 'GRAND_COMPTE' | 'PME' | string;
  segment_display: string;
  assigned_entity: string;
  conversion_status: string;
  conversion_status_display: string;
  converted_amount: number;
  current_operator: string;
  current_connectivity: string;
  contact_name: string;
  contact_role: string;
  contact_phone: string;
  rccm: string;
  assigned_kam: {
    id: number;
    username: string;
    full_name: string;
    email: string;
    phone: string;
    kam_specialization: 'GRAND_COMPTE' | 'PME';
    location: string;
    avatar?: string;
  } | null;
  assigned_at: string | null;
}

export default function KamOfficePage() {
  const { user, logout, loading: authLoading } = useAuth();

  // Navigation tab (Fixe / Non scrollable dans la barre latérale)
  const [activeTab, setActiveTab] = useState<'overview' | 'kams' | 'accounts'>('overview');

  // Données générales
  const [metrics, setMetrics] = useState<KamOfficeMetrics | null>(null);
  const [kamsList, setKamsList] = useState<KamUser[]>([]);
  const [accountsList, setAccountsList] = useState<KamAccount[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Filtres de l'équipe KAM
  const [kamSpecializationFilter, setKamSpecializationFilter] = useState<'ALL' | 'GRAND_COMPTE' | 'PME'>('ALL');

  // Filtres des comptes clés
  const [accountSegmentFilter, setAccountSegmentFilter] = useState<'ALL' | 'GRAND_COMPTE' | 'PME'>('ALL');
  const [accountAssignmentFilter, setAccountAssignmentFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [accountKamFilter, setAccountKamFilter] = useState<string>('ALL');
  const [accountSearchQuery, setAccountSearchQuery] = useState('');

  // Modale d'affectation
  const [selectedAccountToAssign, setSelectedAccountToAssign] = useState<KamAccount | null>(null);
  const [targetKamIdToAssign, setTargetKamIdToAssign] = useState<number | null>(null);
  const [assigningAccount, setAssigningAccount] = useState(false);
  const [assignSuccessMessage, setAssignSuccessMessage] = useState('');

  // Modale de création d'un nouveau KAM
  const [isCreateKamModalOpen, setIsCreateKamModalOpen] = useState(false);
  const [newKamForm, setNewKamForm] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    location: 'Kinshasa',
    kam_specialization: 'GRAND_COMPTE' as 'GRAND_COMPTE' | 'PME',
  });
  const [creatingKam, setCreatingKam] = useState(false);
  const [createKamError, setCreateKamError] = useState('');

  // Chargement des données KAM Office
  const loadKamOfficeData = async () => {
    setLoadingData(true);
    try {
      const [overviewData, kamsData, accountsData] = await Promise.all([
        fetchAPI('/api/kam-office/overview/'),
        fetchAPI('/api/kam-office/kams/'),
        fetchAPI('/api/kam-office/accounts/?limit=400'),
      ]);

      if (overviewData && overviewData.metrics) {
        setMetrics(overviewData.metrics);
      }
      if (kamsData && kamsData.kams) {
        setKamsList(kamsData.kams);
      }
      if (accountsData && accountsData.accounts) {
        setAccountsList(accountsData.accounts);
      }
    } catch (err) {
      console.error("Erreur de chargement des données KAM Office:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadKamOfficeData();
  }, []);

  // Filtrage des KAMs
  const filteredKams = useMemo(() => {
    if (kamSpecializationFilter === 'ALL') return kamsList;
    return kamsList.filter((k) => k.kam_specialization === kamSpecializationFilter);
  }, [kamsList, kamSpecializationFilter]);

  // Filtrage des comptes
  const filteredAccounts = useMemo(() => {
    return accountsList.filter((acc) => {
      // Filtre segment
      if (accountSegmentFilter !== 'ALL' && acc.segment !== accountSegmentFilter) {
        return false;
      }
      // Filtre affectation
      if (accountAssignmentFilter === 'ASSIGNED' && !acc.assigned_kam) {
        return false;
      }
      if (accountAssignmentFilter === 'UNASSIGNED' && acc.assigned_kam) {
        return false;
      }
      // Filtre par KAM spécifique
      if (accountKamFilter !== 'ALL' && acc.assigned_kam?.id.toString() !== accountKamFilter) {
        return false;
      }
      // Recherche textuelle
      if (accountSearchQuery.trim()) {
        const q = accountSearchQuery.toLowerCase();
        const matchName = acc.name.toLowerCase().includes(q);
        const matchCrm = acc.crm_id.toLowerCase().includes(q);
        const matchCity = acc.city.toLowerCase().includes(q);
        const matchCommune = acc.commune.toLowerCase().includes(q);
        const matchContact = acc.contact_name.toLowerCase().includes(q);
        const matchSector = acc.sector.toLowerCase().includes(q);
        const matchKam = acc.assigned_kam?.full_name.toLowerCase().includes(q);
        if (!matchName && !matchCrm && !matchCity && !matchCommune && !matchContact && !matchSector && !matchKam) {
          return false;
        }
      }
      return true;
    });
  }, [accountsList, accountSegmentFilter, accountAssignmentFilter, accountKamFilter, accountSearchQuery]);

  // Handler Affectation
  const handleOpenAssignModal = (acc: KamAccount) => {
    setSelectedAccountToAssign(acc);
    setTargetKamIdToAssign(acc.assigned_kam ? acc.assigned_kam.id : null);
    setAssignSuccessMessage('');
  };

  const handleConfirmAssignment = async () => {
    if (!selectedAccountToAssign) return;

    setAssigningAccount(true);
    setAssignSuccessMessage('');

    try {
      const res = await fetchAPI('/api/kam-office/assign/', {
        method: 'POST',
        body: JSON.stringify({
          enterprise_id: selectedAccountToAssign.id,
          kam_id: targetKamIdToAssign,
        }),
      });

      setAssignSuccessMessage(res.message || "Affectation mise à jour avec succès.");
      await loadKamOfficeData();
      setTimeout(() => {
        setSelectedAccountToAssign(null);
        setAssignSuccessMessage('');
      }, 1200);
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'affectation.");
    } finally {
      setAssigningAccount(false);
    }
  };

  // Handler Création d'un nouveau KAM
  const handleCreateKamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKamForm.username || !newKamForm.password || !newKamForm.first_name || !newKamForm.last_name) {
      setCreateKamError("Veuillez renseigner les champs obligatoires.");
      return;
    }

    setCreatingKam(true);
    setCreateKamError('');

    try {
      await fetchAPI('/api/kam-office/kams/', {
        method: 'POST',
        body: JSON.stringify(newKamForm),
      });

      setIsCreateKamModalOpen(false);
      setNewKamForm({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        location: 'Kinshasa',
        kam_specialization: 'GRAND_COMPTE',
      });
      await loadKamOfficeData();
    } catch (err: any) {
      setCreateKamError(err.message || "Erreur lors de la création du compte KAM.");
    } finally {
      setCreatingKam(false);
    }
  };

  // Basculer vers le dispatch d'un KAM spécifique
  const handleFilterAccountsByKam = (kamId: number) => {
    setAccountKamFilter(kamId.toString());
    setActiveTab('accounts');
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F6F5F2] dark:bg-[#242124]">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-[#4F6CE8] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['KAM_MANAGER']}>
      {/* Conteneur Plein Écran (h-screen & overflow-hidden) */}
      <div className="h-screen w-full flex bg-[#F6F5F2] dark:bg-[#242124] font-sans text-[#242124] dark:text-[#FFFFFF] antialiased p-3 md:p-4 gap-4 overflow-hidden select-none transition-colors duration-300">
        
        {/* ========================================================================= */}
        {/* 1. SIDEBAR FLOTTANTE NON SCROLLABLE (Sticky, Fixed Height, Frosted Glass)   */}
        {/* ========================================================================= */}
        <aside className="w-72 h-full shrink-0 flex flex-col justify-between bg-white/70 dark:bg-[#2F2C30]/80 backdrop-blur-2xl rounded-3xl p-5 shadow-xl transition-all">
          <div className="flex flex-col gap-6">
            
            {/* Header Brand */}
            <div className="flex items-center gap-3 px-1 pt-1">
              <Logo size={36} showBg={true} />
              <div>
                <h1 className="text-sm font-extrabold tracking-tight text-[#242124] dark:text-[#FFFFFF] uppercase">
                  Onbora
                </h1>
                <p className="text-[10px] text-[#4F6CE8] font-semibold tracking-wider uppercase">
                  Direction KAM Office
                </p>
              </div>
            </div>

            {/* Navigation Pinned / Non Scrollable */}
            <nav className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-widest px-3 mb-1">
                Pilotage Grands Comptes
              </span>

              {/* Tab 1: Vue d'Ensemble & KPIs */}
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-[#4F6CE8] text-white shadow-md shadow-[#4F6CE8]/25'
                    : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#242124] dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icons.Sliders size={16} />
                  <span>Vue d'Ensemble & KPIs</span>
                </div>
              </button>

              {/* Tab 2: Effectif des KAMs & Spécialisation */}
              <button
                onClick={() => setActiveTab('kams')}
                className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                  activeTab === 'kams'
                    ? 'bg-[#4F6CE8] text-white shadow-md shadow-[#4F6CE8]/25'
                    : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#242124] dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icons.Users size={16} />
                  <span>Effectif KAM & Pôles</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'kams' ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-[#6E6C67] dark:text-[#A1A1AA]'
                }`}>
                  {kamsList.length}
                </span>
              </button>

              {/* Tab 3: Dispatch & Affectation */}
              <button
                onClick={() => setActiveTab('accounts')}
                className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                  activeTab === 'accounts'
                    ? 'bg-[#4F6CE8] text-white shadow-md shadow-[#4F6CE8]/25'
                    : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#242124] dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icons.Briefcase size={16} />
                  <span>Dispatch des Comptes</span>
                </div>
                {metrics && metrics.unassigned_count > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                    activeTab === 'accounts' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  }`}>
                    {metrics.unassigned_count}
                  </span>
                )}
              </button>
            </nav>

            {/* Quick Metrics Capsule */}
            {metrics && (
              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 flex flex-col gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                  État du Portefeuille Clé
                </span>
                <div className="flex justify-between text-xs font-550 text-[#6E6C67] dark:text-[#A1A1AA]">
                  <span>Grands Comptes :</span>
                  <span className="font-semibold text-[#4F6CE8]">{metrics.grands_comptes_count}</span>
                </div>
                <div className="flex justify-between text-xs font-550 text-[#6E6C67] dark:text-[#A1A1AA]">
                  <span>PME Stratégiques :</span>
                  <span className="font-semibold text-violet-500">{metrics.pme_count}</span>
                </div>
                <div className="flex justify-between text-xs font-550 text-[#6E6C67] dark:text-[#A1A1AA]">
                  <span>En attente de KAM :</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{metrics.unassigned_count}</span>
                </div>
                <div className="w-full bg-black/10 dark:bg-white/10 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-[#4F6CE8] h-full rounded-full transition-all duration-500"
                    style={{ width: `${metrics.assignment_rate_percent}%` }}
                  />
                </div>
                <span className="text-[9px] font-semibold text-right text-[#6E6C67] dark:text-[#A1A1AA]">
                  {metrics.assignment_rate_percent}% des comptes affectés
                </span>
              </div>
            )}
          </div>

          {/* Profil Directeur KAM & Déconnexion */}
          <div className="flex flex-col gap-3 pt-4 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-9 h-9 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center font-extrabold text-xs shadow-sm overflow-hidden shrink-0">
                  <img
                    src={`/memojis/${(user?.avatar || 'memoji_019.png').replace('assets/memojis/', '')}`}
                    alt="Memoji"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="truncate">
                  <span className="text-xs font-semibold block truncate text-[#242124] dark:text-white">
                    {user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'Direction KAM'}
                  </span>
                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">
                    Gérant KAM Office
                  </span>
                </div>
              </div>
              <ThemeToggle />
            </div>

            <button
              onClick={() => logout()}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Icons.LogOut size={14} />
              <span>Déconnexion Sécurisée</span>
            </button>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* 2. ESPACE DE TRAVAIL PRINCIPAL (Scrollable, Liquid Glass Container)       */}
        {/* ========================================================================= */}
        <main className="flex-1 h-full flex flex-col overflow-hidden bg-white/50 dark:bg-[#2F2C30]/50 backdrop-blur-2xl rounded-3xl p-6 shadow-xl border-0">
          
          {/* Header de l'Espace Actif */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#4F6CE8] bg-[#4F6CE8]/10 px-2.5 py-0.5 rounded-full">
                  Direction Métier B2B
                </span>
                <span className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">• En direct du SI</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-[#242124] dark:text-white mt-1">
                {activeTab === 'overview' && "Tableau de Bord & KPIs Stratégiques"}
                {activeTab === 'kams' && "Effectif des Key Account Managers & Spécialisation"}
                {activeTab === 'accounts' && "Dispatch & Affectation des Comptes Clés (Grands Comptes & PME)"}
              </h2>
            </div>

            {/* Actions Contextuelles d'En-Tête */}
            <div className="flex items-center gap-2.5">
              {activeTab === 'kams' && (
                <button
                  onClick={() => setIsCreateKamModalOpen(true)}
                  className="px-4 py-2.5 bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white rounded-2xl text-xs font-semibold shadow-md shadow-[#4F6CE8]/25 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Icons.UserPlus size={15} />
                  <span>Nouveau Compte KAM</span>
                </button>
              )}

              {activeTab === 'accounts' && (
                <div className="flex items-center gap-2 bg-[#F6F5F2] dark:bg-[#242124] px-3.5 py-2 rounded-2xl">
                  <Icons.Search size={14} className="text-[#6E6C67] dark:text-[#A1A1AA]" />
                  <input
                    type="text"
                    value={accountSearchQuery}
                    onChange={(e) => setAccountSearchQuery(e.target.value)}
                    placeholder="Filtrer un compte, CRM, ville..."
                    className="bg-transparent text-xs font-550 focus:outline-none w-48 text-[#242124] dark:text-white border-0"
                  />
                  {accountSearchQuery && (
                    <button
                      onClick={() => setAccountSearchQuery('')}
                      className="text-xs text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={loadKamOfficeData}
                disabled={loadingData}
                title="Actualiser les données"
                className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#6E6C67] dark:text-white transition-all cursor-pointer"
              >
                <Icons.Refresh size={15} className={loadingData ? "animate-spin" : ""} />
              </button>
            </div>
          </header>

          {/* Corps de Page Scrollable */}
          <div className="flex-1 overflow-y-auto pr-1 pt-5 space-y-6">
            
            {/* =================================================================== */}
            {/* ONGLET 1 : VUE D'ENSEMBLE & KPIS STRATÉGIQUES                       */}
            {/* =================================================================== */}
            {activeTab === 'overview' && metrics && (
              <div className="space-y-6 animate-fade-in">
                
                {/* 4 Cartes Métriques Clés */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Carte 1 : Pipeline Annuel Total */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#242124] shadow-sm flex flex-col justify-between gap-3 border-0">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
                        Chiffre d'Affaires Géré
                      </span>
                      <div className="p-2 bg-[#4F6CE8]/10 text-[#4F6CE8] rounded-xl">
                        <Icons.Briefcase size={16} />
                      </div>
                    </div>
                    <div>
                      <span className="text-2xl font-extrabold text-[#242124] dark:text-white block">
                        +{metrics.total_annual_revenue_usd.toLocaleString()} $
                      </span>
                      <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5 block">
                        Volume annuel cumulé (400 entreprises)
                      </span>
                    </div>
                  </div>

                  {/* Carte 2 : Taux d'Affectation */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#242124] shadow-sm flex flex-col justify-between gap-3 border-0">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
                        Taux d'Affectation
                      </span>
                      <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                        <Icons.CheckCircle size={16} />
                      </div>
                    </div>
                    <div>
                      <span className="text-2xl font-extrabold text-[#242124] dark:text-white block">
                        {metrics.assignment_rate_percent}%
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 block font-550">
                        {metrics.assigned_count} comptes affectés à des KAMs
                      </span>
                    </div>
                  </div>

                  {/* Carte 3 : Pôle Grands Comptes (> 1M$) */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#242124] shadow-sm flex flex-col justify-between gap-3 border-0">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-semibold text-[#4F6CE8] uppercase tracking-wider">
                        Pôle Grands Comptes
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#4F6CE8]/10 text-[#4F6CE8]">
                        &gt; 1M$ CA
                      </span>
                    </div>
                    <div>
                      <span className="text-2xl font-extrabold text-[#242124] dark:text-white block">
                        {metrics.grands_comptes_count} Comptes
                      </span>
                      <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5 block">
                        {metrics.gc_specialist_kams} KAMs Spécialistes dédiés
                      </span>
                    </div>
                  </div>

                  {/* Carte 4 : Pôle PME Stratégiques (100k$ - 1M$) */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#242124] shadow-sm flex flex-col justify-between gap-3 border-0">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider">
                        Pôle PME Dynamiques
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-violet-500/10 text-violet-500">
                        100k$ - 1M$
                      </span>
                    </div>
                    <div>
                      <span className="text-2xl font-extrabold text-[#242124] dark:text-white block">
                        {metrics.pme_count} Comptes
                      </span>
                      <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5 block">
                        {metrics.pme_specialist_kams} KAM Spécialiste dédié
                      </span>
                    </div>
                  </div>

                </div>

                {/* Alerte & Priorité Dispatch si comptes non affectés */}
                {metrics.unassigned_count > 0 && (
                  <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-semibold shrink-0 shadow-md">
                        !
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-amber-700 dark:text-amber-300">
                          {metrics.unassigned_count} Entreprises en attente d'affectation
                        </h4>
                        <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                          {metrics.unassigned_grands_comptes} Grands Comptes et {metrics.unassigned_pme} PME doivent être attribués aux KAMs spécialisés pour engager la prospection.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setAccountAssignmentFilter('UNASSIGNED');
                        setActiveTab('accounts');
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer shrink-0"
                    >
                      Ouvrir le Dispatch Prioritaire →
                    </button>
                  </div>
                )}

                {/* Ventilation des Pôles KAM */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Pôle Grands Comptes */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-[#242124] shadow-sm space-y-4 border-0">
                    <div className="flex justify-between items-center pb-3 border-b border-black/5 dark:border-white/5">
                      <div>
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#4F6CE8] bg-[#4F6CE8]/10 px-2.5 py-0.5 rounded-full">
                          Pôle Grands Comptes
                        </span>
                        <h3 className="text-base font-extrabold text-[#242124] dark:text-white mt-1">
                          Banques, Mines, Groupes & Télécoms
                        </h3>
                      </div>
                      <span className="text-xs font-extrabold text-[#4F6CE8]">
                        {metrics.gc_specialist_kams} KAMs
                      </span>
                    </div>

                    <div className="space-y-3">
                      {kamsList
                        .filter((k) => k.kam_specialization === 'GRAND_COMPTE')
                        .map((kam) => (
                          <div
                            key={kam.id}
                            className="p-3.5 rounded-2xl bg-[#F6F5F2] dark:bg-[#2F2C30] flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#4F6CE8] text-white flex items-center justify-center font-extrabold text-xs">
                                {kam.first_name?.[0] || 'K'}
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-[#242124] dark:text-white block">
                                  {kam.full_name}
                                </span>
                                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                                  {kam.assigned_grands_comptes_count} Grands Comptes sous mandat
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleFilterAccountsByKam(kam.id)}
                              className="px-3 py-1.5 bg-white dark:bg-[#242124] text-[#4F6CE8] text-[11px] font-semibold rounded-xl shadow-xs hover:bg-[#4F6CE8] hover:text-white transition-all cursor-pointer"
                            >
                              Voir portefeuille
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Pôle PME Dynamiques */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-[#242124] shadow-sm space-y-4 border-0">
                    <div className="flex justify-between items-center pb-3 border-b border-black/5 dark:border-white/5">
                      <div>
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-violet-500 bg-violet-500/10 px-2.5 py-0.5 rounded-full">
                          Pôle PME Dynamiques
                        </span>
                        <h3 className="text-base font-extrabold text-[#242124] dark:text-white mt-1">
                          Négoce, Santé, Éducation & Services
                        </h3>
                      </div>
                      <span className="text-xs font-extrabold text-violet-500">
                        {metrics.pme_specialist_kams} KAM
                      </span>
                    </div>

                    <div className="space-y-3">
                      {kamsList
                        .filter((k) => k.kam_specialization === 'PME')
                        .map((kam) => (
                          <div
                            key={kam.id}
                            className="p-3.5 rounded-2xl bg-[#F6F5F2] dark:bg-[#2F2C30] flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-violet-500 text-white flex items-center justify-center font-extrabold text-xs">
                                {kam.first_name?.[0] || 'K'}
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-[#242124] dark:text-white block">
                                  {kam.full_name}
                                </span>
                                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                                  {kam.assigned_pme_count} PME sous mandat
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleFilterAccountsByKam(kam.id)}
                              className="px-3 py-1.5 bg-white dark:bg-[#242124] text-violet-500 text-[11px] font-semibold rounded-xl shadow-xs hover:bg-violet-500 hover:text-white transition-all cursor-pointer"
                            >
                              Voir portefeuille
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* =================================================================== */}
            {/* ONGLET 2 : EFFECTIF DES KAMS & SPÉCIALISATION                       */}
            {/* =================================================================== */}
            {activeTab === 'kams' && (
              <div className="space-y-5 animate-fade-in">
                
                {/* Sélecteur de Spécialisation */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-2xl">
                    <button
                      onClick={() => setKamSpecializationFilter('ALL')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        kamSpecializationFilter === 'ALL'
                          ? 'bg-white dark:bg-[#2F2C30] text-[#242124] dark:text-white shadow-xs'
                          : 'text-[#6E6C67] dark:text-[#A1A1AA]'
                      }`}
                    >
                      Tous ({kamsList.length})
                    </button>
                    <button
                      onClick={() => setKamSpecializationFilter('GRAND_COMPTE')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        kamSpecializationFilter === 'GRAND_COMPTE'
                          ? 'bg-[#4F6CE8] text-white shadow-xs'
                          : 'text-[#6E6C67] dark:text-[#A1A1AA]'
                      }`}
                    >
                      Pôle Grands Comptes ({kamsList.filter(k => k.kam_specialization === 'GRAND_COMPTE').length})
                    </button>
                    <button
                      onClick={() => setKamSpecializationFilter('PME')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        kamSpecializationFilter === 'PME'
                          ? 'bg-violet-500 text-white shadow-xs'
                          : 'text-[#6E6C67] dark:text-[#A1A1AA]'
                      }`}
                    >
                      Pôle PME ({kamsList.filter(k => k.kam_specialization === 'PME').length})
                    </button>
                  </div>

                  <span className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] font-550">
                    {filteredKams.length} Key Account Manager{filteredKams.length > 1 ? 's' : ''} actif{filteredKams.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Cartes des KAMs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredKams.map((kam) => (
                    <div
                      key={kam.id}
                      className="p-5 rounded-3xl bg-white dark:bg-[#242124] shadow-sm flex flex-col justify-between gap-4 border-0 transition-all hover:shadow-md"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center font-extrabold text-sm overflow-hidden shrink-0">
                              <img
                                src={`/memojis/${(kam.avatar || 'memoji_019.png').replace('assets/memojis/', '')}`}
                                alt={kam.full_name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                            <div>
                              <h4 className="text-sm font-extrabold text-[#242124] dark:text-white">
                                {kam.full_name}
                              </h4>
                              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                                @{kam.username} • {kam.location || 'RDC'}
                              </span>
                            </div>
                          </div>

                          <span className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                            kam.kam_specialization === 'GRAND_COMPTE'
                              ? 'bg-[#4F6CE8]/10 text-[#4F6CE8]'
                              : 'bg-violet-500/10 text-violet-500'
                          }`}>
                            {kam.kam_specialization === 'GRAND_COMPTE' ? 'Grands Comptes' : 'PME'}
                          </span>
                        </div>

                        {/* Coordonnées */}
                        <div className="mt-4 p-3 rounded-2xl bg-[#F6F5F2] dark:bg-[#2F2C30] space-y-1.5 text-xs">
                          <div className="flex justify-between text-[#6E6C67] dark:text-[#A1A1AA]">
                            <span>Email :</span>
                            <span className="font-semibold text-[#242124] dark:text-white">{kam.email || 'Non renseigné'}</span>
                          </div>
                          <div className="flex justify-between text-[#6E6C67] dark:text-[#A1A1AA]">
                            <span>Téléphone :</span>
                            <span className="font-semibold text-[#242124] dark:text-white">{kam.phone || 'Non renseigné'}</span>
                          </div>
                        </div>

                        {/* Métriques d'Affectation */}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                          <div className="p-2.5 rounded-2xl bg-[#F6F5F2] dark:bg-[#2F2C30]">
                            <span className="text-[9px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block uppercase">
                              Comptes Détenus
                            </span>
                            <span className="text-base font-extrabold text-[#242124] dark:text-white">
                              {kam.assigned_total_count}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-2xl bg-[#F6F5F2] dark:bg-[#2F2C30]">
                            <span className="text-[9px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block uppercase">
                              Portefeuille Total
                            </span>
                            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                              +{kam.total_portfolio_revenue_usd.toLocaleString()} $
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bouton Voir Portefeuille */}
                      <button
                        onClick={() => handleFilterAccountsByKam(kam.id)}
                        className="w-full py-2.5 bg-black/5 dark:bg-white/5 hover:bg-[#4F6CE8] hover:text-white text-[#4F6CE8] rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Icons.Briefcase size={13} />
                        <span>Voir ses comptes ({kam.assigned_total_count})</span>
                      </button>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* =================================================================== */}
            {/* ONGLET 3 : DISPATCH & AFFECTATION DES COMPTES CLÉS                  */}
            {/* =================================================================== */}
            {activeTab === 'accounts' && (
              <div className="space-y-4 animate-fade-in">
                
                {/* Barre de Filtres Multiples */}
                <div className="p-4 rounded-3xl bg-white dark:bg-[#242124] shadow-sm flex flex-wrap items-center justify-between gap-3 border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    
                    {/* Filtre Segment */}
                    <div className="flex items-center gap-1 p-1 bg-[#F6F5F2] dark:bg-[#2F2C30] rounded-2xl text-xs">
                      <button
                        onClick={() => setAccountSegmentFilter('ALL')}
                        className={`px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer ${
                          accountSegmentFilter === 'ALL' ? 'bg-white dark:bg-[#242124] text-[#242124] dark:text-white shadow-xs' : 'text-[#6E6C67] dark:text-[#A1A1AA]'
                        }`}
                      >
                        Tous
                      </button>
                      <button
                        onClick={() => setAccountSegmentFilter('GRAND_COMPTE')}
                        className={`px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer ${
                          accountSegmentFilter === 'GRAND_COMPTE' ? 'bg-[#4F6CE8] text-white shadow-xs' : 'text-[#6E6C67] dark:text-[#A1A1AA]'
                        }`}
                      >
                        Grands Comptes
                      </button>
                      <button
                        onClick={() => setAccountSegmentFilter('PME')}
                        className={`px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer ${
                          accountSegmentFilter === 'PME' ? 'bg-violet-500 text-white shadow-xs' : 'text-[#6E6C67] dark:text-[#A1A1AA]'
                        }`}
                      >
                        PME
                      </button>
                    </div>

                    {/* Filtre Affectation */}
                    <div className="flex items-center gap-1 p-1 bg-[#F6F5F2] dark:bg-[#2F2C30] rounded-2xl text-xs">
                      <button
                        onClick={() => setAccountAssignmentFilter('ALL')}
                        className={`px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer ${
                          accountAssignmentFilter === 'ALL' ? 'bg-white dark:bg-[#242124] text-[#242124] dark:text-white shadow-xs' : 'text-[#6E6C67] dark:text-[#A1A1AA]'
                        }`}
                      >
                        Tous statuts
                      </button>
                      <button
                        onClick={() => setAccountAssignmentFilter('UNASSIGNED')}
                        className={`px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer ${
                          accountAssignmentFilter === 'UNASSIGNED' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        À Affecter
                      </button>
                      <button
                        onClick={() => setAccountAssignmentFilter('ASSIGNED')}
                        className={`px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer ${
                          accountAssignmentFilter === 'ASSIGNED' ? 'bg-emerald-500 text-white shadow-xs' : 'text-[#6E6C67] dark:text-[#A1A1AA]'
                        }`}
                      >
                        Assignés
                      </button>
                    </div>

                    {/* Filtre par KAM précis */}
                    <select
                      value={accountKamFilter}
                      onChange={(e) => setAccountKamFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-2xl bg-[#F6F5F2] dark:bg-[#2F2C30] text-xs font-semibold text-[#242124] dark:text-white border-0 focus:outline-none"
                    >
                      <option value="ALL">Tous les KAMs</option>
                      {kamsList.map((k) => (
                        <option key={k.id} value={k.id.toString()}>
                          {k.full_name} ({k.kam_specialization === 'GRAND_COMPTE' ? 'GC' : 'PME'})
                        </option>
                      ))}
                    </select>

                  </div>

                  <span className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] font-semibold">
                    {filteredAccounts.length} compte{filteredAccounts.length > 1 ? 's' : ''} correspondant{filteredAccounts.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Liste des Comptes */}
                <div className="space-y-3">
                  {filteredAccounts.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA] bg-white dark:bg-[#242124] rounded-3xl">
                      Aucun compte trouvé pour ces critères de filtrage.
                    </div>
                  ) : (
                    filteredAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="p-4 rounded-3xl bg-white dark:bg-[#242124] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border-0 hover:shadow-md transition-all"
                      >
                        {/* Infos Entreprise */}
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                              acc.segment === 'GRAND_COMPTE'
                                ? 'bg-[#4F6CE8]/10 text-[#4F6CE8]'
                                : 'bg-violet-500/10 text-violet-500'
                            }`}>
                              {acc.segment_display}
                            </span>
                            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] font-550">
                              {acc.crm_id}
                            </span>
                          </div>

                          <h4 className="text-base font-extrabold text-[#242124] dark:text-white">
                            {acc.name}
                          </h4>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                            <span className="font-550 text-emerald-600 dark:text-emerald-400">
                              +{acc.annual_revenue.toLocaleString()} $ / an
                            </span>
                            <span>•</span>
                            <span>{acc.city} ({acc.commune || 'Centre'})</span>
                            <span>•</span>
                            <span>Décideur : <strong className="text-[#242124] dark:text-white">{acc.contact_name || 'Direction Générale'}</strong></span>
                            <span>•</span>
                            <span>Opérateur : {acc.current_operator || 'Non renseigné'}</span>
                          </div>
                        </div>

                        {/* Statut d'Affectation & Action */}
                        <div className="flex items-center gap-3 shrink-0">
                          {acc.assigned_kam ? (
                            <div className="text-right">
                              <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block">
                                KAM Affecté :
                              </span>
                              <div className="flex items-center gap-2 justify-end mt-0.5">
                                <span className={`w-2 h-2 rounded-full ${acc.assigned_kam.kam_specialization === 'GRAND_COMPTE' ? 'bg-[#4F6CE8]' : 'bg-violet-500'}`} />
                                <span className="text-xs font-extrabold text-[#242124] dark:text-white">
                                  {acc.assigned_kam.full_name}
                                </span>
                              </div>
                              <span className="text-[9px] text-[#6E6C67] dark:text-[#A1A1AA] block">
                                {acc.assigned_kam.kam_specialization === 'GRAND_COMPTE' ? 'Pôle Grands Comptes' : 'Pôle PME'}
                              </span>
                            </div>
                          ) : (
                            <div className="text-right">
                              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                                ⚠️ Non Assigné
                              </span>
                              <span className="text-[9px] text-[#6E6C67] dark:text-[#A1A1AA]">
                                En attente de décision KAM Office
                              </span>
                            </div>
                          )}

                          <button
                            onClick={() => handleOpenAssignModal(acc)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              acc.assigned_kam
                                ? 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#242124] dark:text-white'
                                : 'bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white shadow-md shadow-[#4F6CE8]/30 animate-pulse'
                            }`}
                          >
                            {acc.assigned_kam ? "Réassigner" : "Affecter à un KAM"}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}

          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODALE D'AFFECTATION STRATÉGIQUE D'UN COMPTE CLÉ                         */}
      {/* ========================================================================= */}
      {selectedAccountToAssign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#2F2C30] rounded-3xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-5 text-[#242124] dark:text-white border-0 animate-scale-in">
            <div className="flex justify-between items-start pb-3 border-b border-black/5 dark:border-white/5">
              <div>
                <span className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                  selectedAccountToAssign.segment === 'GRAND_COMPTE' ? 'bg-[#4F6CE8]/10 text-[#4F6CE8]' : 'bg-violet-500/10 text-violet-500'
                }`}>
                  {selectedAccountToAssign.segment_display}
                </span>
                <h3 className="text-lg font-extrabold mt-1">{selectedAccountToAssign.name}</h3>
                <span className="text-xs font-550 text-emerald-600 dark:text-emerald-400">
                  CA Annuel : +{selectedAccountToAssign.annual_revenue.toLocaleString()} $ • {selectedAccountToAssign.city}
                </span>
              </div>
              <button
                onClick={() => setSelectedAccountToAssign(null)}
                className="p-1 text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Recommandation intelligente */}
            <div className="p-3.5 rounded-2xl bg-[#4F6CE8]/10 text-xs text-[#4F6CE8] space-y-1">
              <span className="font-extrabold uppercase tracking-wider text-[10px] block">
                💡 Recommandation de l'Entité KAM Office
              </span>
              <p className="leading-relaxed">
                Ce compte est classé <strong>{selectedAccountToAssign.segment_display}</strong>.
                {selectedAccountToAssign.segment === 'GRAND_COMPTE'
                  ? " Nous recommandons l'affectation à un Key Account Manager du Pôle Grands Comptes (> 1M$)."
                  : " Nous recommandons l'affectation à un Key Account Manager du Pôle PME (100k$ - 1M$)."}
              </p>
            </div>

            {/* Sélection du KAM */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
                Sélectionner le Key Account Manager :
              </label>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                
                {/* Option Désaffecter */}
                <div
                  onClick={() => setTargetKamIdToAssign(null)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between border-2 ${
                    targetKamIdToAssign === null
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-transparent bg-[#F6F5F2] dark:bg-[#242124] hover:bg-black/5'
                  }`}
                >
                  <div>
                    <span className="text-xs font-semibold block text-amber-700 dark:text-amber-300">
                      Non affecté (Vivier commun)
                    </span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                      Remettre l'entreprise en attente de décision
                    </span>
                  </div>
                  {targetKamIdToAssign === null && <Icons.CheckCircle size={16} className="text-amber-500" />}
                </div>

                {/* Liste des KAMs */}
                {kamsList.map((kam) => {
                  const isRecommended = (selectedAccountToAssign.segment === kam.kam_specialization);
                  const isSelected = (targetKamIdToAssign === kam.id);

                  return (
                    <div
                      key={kam.id}
                      onClick={() => setTargetKamIdToAssign(kam.id)}
                      className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between border-2 ${
                        isSelected
                          ? 'border-[#4F6CE8] bg-[#4F6CE8]/10'
                          : 'border-transparent bg-[#F6F5F2] dark:bg-[#242124] hover:bg-black/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-semibold text-xs text-white ${
                          kam.kam_specialization === 'GRAND_COMPTE' ? 'bg-[#4F6CE8]' : 'bg-violet-500'
                        }`}>
                          {kam.first_name?.[0] || 'K'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-[#242124] dark:text-white">
                              {kam.full_name}
                            </span>
                            {isRecommended && (
                              <span className="text-[9px] font-extrabold uppercase px-2 py-0.2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-md">
                                Recommandé
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">
                            {kam.kam_specialization_display} • {kam.assigned_total_count} comptes actifs
                          </span>
                        </div>
                      </div>

                      {isSelected && <Icons.CheckCircle size={16} className="text-[#4F6CE8]" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {assignSuccessMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold text-center">
                {assignSuccessMessage}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2 border-t border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => setSelectedAccountToAssign(null)}
                className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-xs font-semibold hover:bg-black/10 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignment}
                disabled={assigningAccount}
                className="px-5 py-2.5 bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white rounded-xl text-xs font-semibold shadow-md shadow-[#4F6CE8]/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {assigningAccount ? "Enregistrement..." : "Valider l'Affectation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE DE CRÉATION D'UN NOUVEAU KEY ACCOUNT MANAGER                     */}
      {/* ========================================================================= */}
      {isCreateKamModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#2F2C30] rounded-3xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-5 text-[#242124] dark:text-white border-0 animate-scale-in">
            <div className="flex justify-between items-center pb-3 border-b border-black/5 dark:border-white/5">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#4F6CE8]">
                  Direction KAM Office
                </span>
                <h3 className="text-lg font-extrabold mt-0.5">
                  Enregistrer un Key Account Manager (KAM)
                </h3>
              </div>
              <button
                onClick={() => setIsCreateKamModalOpen(false)}
                className="p-1 text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createKamError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-550">
                {createKamError}
              </div>
            )}

            <form onSubmit={handleCreateKamSubmit} className="flex flex-col gap-3.5 text-xs">
              
              {/* Choix de la Spécialisation (Clé de la segmentation KAM) */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
                  Pôle & Spécialisation du KAM (Obligatoire) :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewKamForm({ ...newKamForm, kam_specialization: 'GRAND_COMPTE' })}
                    className={`p-3 rounded-2xl text-left border-2 transition-all cursor-pointer ${
                      newKamForm.kam_specialization === 'GRAND_COMPTE'
                        ? 'border-[#4F6CE8] bg-[#4F6CE8]/10'
                        : 'border-transparent bg-[#F6F5F2] dark:bg-[#242124]'
                    }`}
                  >
                    <span className="font-extrabold text-xs text-[#4F6CE8] block">Pôle Grands Comptes</span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5 block">
                      Entreprises &gt; 1M$ CA (Mines, Banques, Telcos)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewKamForm({ ...newKamForm, kam_specialization: 'PME' })}
                    className={`p-3 rounded-2xl text-left border-2 transition-all cursor-pointer ${
                      newKamForm.kam_specialization === 'PME'
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-transparent bg-[#F6F5F2] dark:bg-[#242124]'
                    }`}
                  >
                    <span className="font-extrabold text-xs text-violet-500 block">Pôle PME Dynamiques</span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5 block">
                      Entreprises 100k$ - 1M$ CA (Services, Santé)
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Prénom</label>
                  <input
                    type="text"
                    required
                    value={newKamForm.first_name}
                    onChange={(e) => setNewKamForm({ ...newKamForm, first_name: e.target.value })}
                    placeholder="Ex: Alain"
                    className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-550 focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Nom de famille</label>
                  <input
                    type="text"
                    required
                    value={newKamForm.last_name}
                    onChange={(e) => setNewKamForm({ ...newKamForm, last_name: e.target.value })}
                    placeholder="Ex: Kazadi"
                    className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-550 focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Identifiant de connexion</label>
                  <input
                    type="text"
                    required
                    value={newKamForm.username}
                    onChange={(e) => setNewKamForm({ ...newKamForm, username: e.target.value })}
                    placeholder="ex: kam_alain"
                    className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-550 focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Mot de passe temporaire</label>
                  <input
                    type="password"
                    required
                    value={newKamForm.password}
                    onChange={(e) => setNewKamForm({ ...newKamForm, password: e.target.value })}
                    placeholder="••••••••••••"
                    className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-550 focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Email</label>
                  <input
                    type="email"
                    value={newKamForm.email}
                    onChange={(e) => setNewKamForm({ ...newKamForm, email: e.target.value })}
                    placeholder="kam.alain@onbora.cg"
                    className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-550 focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Téléphone</label>
                  <input
                    type="tel"
                    value={newKamForm.phone}
                    onChange={(e) => setNewKamForm({ ...newKamForm, phone: e.target.value })}
                    placeholder="+243810000000"
                    className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-550 focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Ville / Région d'affectation</label>
                <input
                  type="text"
                  value={newKamForm.location}
                  onChange={(e) => setNewKamForm({ ...newKamForm, location: e.target.value })}
                  placeholder="Ex: Kinshasa, Lubumbashi, Kolwezi..."
                  className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-550 focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsCreateKamModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-xs font-semibold hover:bg-black/10 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creatingKam}
                  className="px-5 py-2.5 bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white rounded-xl text-xs font-semibold shadow-md shadow-[#4F6CE8]/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {creatingKam ? "Création en cours..." : "Créer le Compte KAM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </ProtectedRoute>
  );
}
