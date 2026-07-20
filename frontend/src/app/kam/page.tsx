"use client";

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/lib/api';
import HelpDrawer from '@/components/shared/HelpDrawer';
import Logo from '@/components/shared/Logo';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { Icons } from '@/components/shared/Icons';
import BusinessTwinSlides from '@/components/shared/BusinessTwinSlides';

interface ProspectDossier {
  id: number;
  source: 'INBOUND_CONVERSATION' | 'OUTBOUND_VISIT';
  status: 'NEW' | 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED';
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  details_summary: string;
  internal_kam_notes: string;
  has_twin: boolean;
  kam: number | null;
  kam_details: { username: string; first_name: string; last_name: string } | null;
  raw_qualification_data: any;
  created_at: string;
  updated_at: string;
}

interface Service {
  service_id: number;
  name: string;
  category: string;
  priority: string;
  reasoning: string;
}

interface Twin {
  current_state: string[];
  proposed_state: string[];
  roadmap: string[];
  recommended_services: Service[];
}

export default function KamDashboard() {
  const { user, logout } = useAuth();
  
  const [dossiers, setDossiers] = useState<ProspectDossier[]>([]);
  const [selectedDossier, setSelectedDossier] = useState<ProspectDossier | null>(null);
  const [selectedTwin, setSelectedTwin] = useState<Twin | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updating, setUpdating] = useState(false);

  // States for dossier updates
  const [internalNotes, setInternalNotes] = useState('');
  const [dossierStatus, setDossierStatus] = useState<'NEW' | 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED'>('NEW');
  const [assignedKam, setAssignedKam] = useState<number | null>(null);
  
  const [activeTab, setActiveTab] = useState<'qualification' | 'twin' | 'provisioning'>('qualification');
  const [provisioningLoading, setProvisioningLoading] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [helpOpen, setHelpOpen] = useState(false);

  // Fetch dossiers list
  const loadDossiers = async (statusFilter = '') => {
    setLoadingList(true);
    try {
      const endpoint = `/api/kam/dossiers/${statusFilter ? `?status=${statusFilter}` : ''}`;
      const data = await fetchAPI(endpoint);
      setDossiers(data || []);
      
      // Auto-select first dossier if none selected
      if (data.length > 0 && !selectedDossier) {
        handleSelectDossier(data[0]);
      }
    } catch (err) {
      console.error("Erreur chargement dossiers:", err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadDossiers(filterStatus);
  }, [filterStatus]);

  const handleSelectDossier = async (dossier: ProspectDossier) => {
    setSelectedDossier(dossier);
    setInternalNotes(dossier.internal_kam_notes || '');
    setDossierStatus(dossier.status);
    setAssignedKam(dossier.kam);
    setSelectedTwin(null);
    
    if (dossier.has_twin) {
      setLoadingDetail(true);
      try {
        const twinData = await fetchAPI(`/api/kam/dossiers/${dossier.id}/business-twin/`);
        setSelectedTwin(twinData);
      } catch (err) {
        console.error("Erreur chargement Business Twin:", err);
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const handleSaveDossier = async () => {
    if (!selectedDossier || updating) return;
    setUpdating(true);
    
    try {
      const updated = await fetchAPI(`/api/kam/dossiers/${selectedDossier.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: dossierStatus,
          internal_kam_notes: internalNotes,
          kam: assignedKam
        })
      });
      
      // Update local list
      setDossiers(prev => prev.map(d => d.id === updated.id ? updated : d));
      setSelectedDossier(updated);
      alert('Dossier mis à jour avec succès !');
    } catch (err) {
      console.error("Erreur de mise à jour du dossier:", err);
      alert("Impossible de mettre à jour le dossier.");
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignToMe = () => {
    if (user) {
      setAssignedKam(user.id);
    }
  };

  const handleProvisionService = async (serviceKey: string, action: 'start' | 'complete') => {
    if (!selectedDossier || provisioningLoading) return;
    setProvisioningLoading(`${serviceKey}_${action}`);
    
    try {
      const updated = await fetchAPI(`/api/kam/dossiers/${selectedDossier.id}/provision/`, {
        method: 'POST',
        body: JSON.stringify({ service: serviceKey, action })
      });
      
      // Update local lists
      setDossiers(prev => prev.map(d => d.id === updated.id ? updated : d));
      setSelectedDossier(updated);
    } catch (err) {
      console.error("Erreur de provisioning:", err);
      alert("Impossible de lancer le provisioning.");
    } finally {
      setTimeout(() => {
        setProvisioningLoading(null);
      }, 1000);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ProtectedRoute allowedRoles={['KAM', 'ADMIN']}>
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col font-sans h-screen overflow-hidden animate-fade-in text-black dark:text-zinc-50">
        {/* Header */}
        <header className="border-b border-zinc-200 dark:border-zinc-900 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-sm shrink-0 z-10">
          <div className="flex items-center gap-3">
            <Logo size={32} showBg={true} />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Onbora</h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Workspace Key Account Manager (KAM)</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{user?.first_name} {user?.last_name}</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Conseiller KAM</p>
            </div>
            <ThemeToggle />
             <button
              onClick={() => setHelpOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-250 dark:border-zinc-850 dark:hover:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Icons.HelpCircle size={14} /> FAQ & Guide
            </button>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-transparent text-zinc-700 hover:text-zinc-950 dark:border-zinc-800 dark:hover:border-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-100 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Icons.LogOut size={14} /> Déconnexion
            </button>
          </div>
        </header>

        {/* Workspace Panels */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Panel: List of Prospects */}
          <div className="w-[320px] md:w-[380px] border-r border-zinc-200 dark:border-zinc-900 bg-zinc-50/10 dark:bg-zinc-950/20 backdrop-blur-sm flex flex-col overflow-hidden shrink-0">
            {/* Filters */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-900 flex items-center justify-between gap-2 shrink-0 bg-zinc-50/40 dark:bg-zinc-950/40">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Prospects Qualifiés</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950/40 text-zinc-800 dark:text-zinc-300 focus:outline-none focus:border-orange-500 transition-all"
              >
                <option value="">Tous les statuts</option>
                <option value="NEW">Nouveaux</option>
                <option value="IN_REVIEW">En revue</option>
                <option value="ACCEPTED">Acceptés</option>
                <option value="REJECTED">Rejetés</option>
              </select>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
               {loadingList ? (
                <div className="flex flex-col p-4 gap-4 animate-pulse">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex flex-col gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800/40">
                      <div className="flex items-center justify-between">
                        <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-md w-2/3" />
                        <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-12" />
                      </div>
                      <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-md w-full" />
                      <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-md w-5/6" />
                    </div>
                  ))}
                </div>
              ) : dossiers.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                  Aucun dossier trouvé.
                </div>
              ) : (
                dossiers.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleSelectDossier(d)}
                    className={`w-full p-4 flex flex-col gap-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-950/40 transition-all cursor-pointer border-l-2 ${
                      selectedDossier?.id === d.id
                        ? 'bg-zinc-100 dark:bg-zinc-950/30 border-orange-500 sidebar-active-tab'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">{d.company_name}</span>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                        d.status === 'NEW'
                          ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          : d.status === 'IN_REVIEW'
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          : d.status === 'ACCEPTED'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                      }`}>
                        {d.status === 'NEW' ? 'Nouveau' : d.status === 'IN_REVIEW' ? 'En Revue' : d.status === 'ACCEPTED' ? 'Accepté' : 'Rejeté'}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-normal">
                      {d.details_summary}
                    </p>

                    <div className="flex items-center justify-between w-full mt-1.5 text-[9px] font-semibold text-zinc-400">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {d.source === 'INBOUND_CONVERSATION' ? 'Inbound (Web)' : 'Outbound (Visite)'}
                      </span>
                      <span>{formatDate(d.created_at)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Panel: Selected Prospect Details */}
          <div className="flex-1 bg-transparent overflow-y-auto flex flex-col">
            {selectedDossier ? (
              <div className="p-6 md:p-8 flex flex-col gap-6 max-w-4xl w-full mx-auto animate-fade-in pb-16">
                
                {/* Prospect Header Card */}
                <div className="glass-card rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[9px] font-bold uppercase tracking-wide">
                        {selectedDossier.source === 'INBOUND_CONVERSATION' ? 'Qualifié en ligne' : 'Rapport Commercial'}
                      </span>
                      <span className="text-zinc-400 text-xs">•</span>
                      <span className="text-[11px] text-zinc-500 font-medium">Reçu le {formatDate(selectedDossier.created_at)}</span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{selectedDossier.company_name}</h2>
                    
                    {/* Contact Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">Contact :</span> {selectedDossier.contact_name}
                      </div>
                      {selectedDossier.email && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">Email :</span> {selectedDossier.email}
                        </div>
                      )}
                      {selectedDossier.phone && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">Téléphone :</span> {selectedDossier.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Assignments */}
                  <div className="flex flex-col gap-3 min-w-[200px] bg-zinc-50/50 dark:bg-zinc-950/20 p-4 border border-zinc-150 dark:border-zinc-800 rounded-xl justify-center shrink-0">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Statut du Prospect</label>
                      <select
                        value={dossierStatus}
                        onChange={(e: any) => setDossierStatus(e.target.value)}
                        className="text-xs px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 text-zinc-800 dark:text-zinc-300 focus:outline-none focus:border-orange-500 transition-all"
                      >
                        <option value="NEW">Nouveau</option>
                        <option value="IN_REVIEW">En revue</option>
                        <option value="ACCEPTED">Prise en charge (Accepté)</option>
                        <option value="REJECTED">Refusé (Rejeté)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">KAM Affecté</label>
                        {!assignedKam && (
                          <button
                            onClick={handleAssignToMe}
                            className="text-[9px] font-bold text-orange-500 hover:text-orange-600 border-none bg-transparent cursor-pointer"
                          >
                            S'assigner
                          </button>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {assignedKam
                          ? (selectedDossier.kam === assignedKam && selectedDossier.kam_details
                              ? `${selectedDossier.kam_details.first_name} ${selectedDossier.kam_details.last_name}`
                              : user?.id === assignedKam ? `${user.first_name} ${user.last_name} (Moi)` : 'Assigné')
                          : 'Non assigné'}
                      </span>
                    </div>

                    <button
                      onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/kam/dossiers/${selectedDossier.id}/export/`, '_blank')}
                      className="w-full py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-[10px] font-bold text-zinc-800 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                    >
                      <Icons.Download size={12} /> Exporter le Dossier (PDF)
                    </button>
                  </div>
                </div>

                {/* Internal Notes card */}
                <div className="glass-card rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Notes Internes du Conseiller</h3>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Saisissez des notes sur les échanges téléphoniques, les relances ou les besoins techniques..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-sm focus:outline-none focus:border-orange-500 transition-all text-zinc-900 dark:text-zinc-50"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveDossier}
                      disabled={updating}
                      className="px-5 py-2.5 orange-gradient-bg hover:opacity-90 active:scale-98 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-orange-500/10"
                    >
                      {updating ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </button>
                  </div>
                </div>

                {/* Details Tab Switcher */}
                <div className="flex border-b border-zinc-200 dark:border-zinc-900">
                  <button
                    onClick={() => setActiveTab('qualification')}
                    className={`py-3.5 px-6 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                      activeTab === 'qualification'
                        ? 'border-orange-500 text-orange-500'
                        : 'border-transparent text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-300'
                    }`}
                  >
                    Dossier de Qualification
                  </button>
                  <button
                    onClick={() => setActiveTab('twin')}
                    className={`py-3.5 px-6 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                      activeTab === 'twin'
                        ? 'border-orange-500 text-orange-500'
                        : 'border-transparent text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-300'
                    }`}
                  >
                    Business Twin Associé
                  </button>
                  <button
                    onClick={() => setActiveTab('provisioning')}
                    className={`py-3.5 px-6 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                      activeTab === 'provisioning'
                        ? 'border-orange-500 text-orange-500'
                        : 'border-transparent text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-300'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 justify-center"><Icons.Settings size={14} /> Provisioning MSP (Démo)</span>
                  </button>
                </div>

                {/* Tab Contents */}
                 {loadingDetail ? (
                  <div className="glass-card rounded-2xl p-6 shadow-sm flex flex-col gap-6 animate-pulse">
                    <div className="flex flex-col gap-2">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-1/3" />
                      <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-1/2" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 border-t border-zinc-100 dark:border-zinc-800/40 pt-4">
                      <div className="flex flex-col gap-4">
                        {[1, 2, 3].map((j) => (
                          <div key={j} className="flex flex-col gap-1.5">
                            <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-md w-20" />
                            <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-40" />
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                          <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-md w-24" />
                          <div className="flex gap-2">
                            <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-14" />
                            <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-16" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 mt-2">
                          <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-md w-20" />
                          <div className="flex gap-2">
                            <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-16" />
                            <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-14" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'qualification' ? (
                  <div className="glass-card rounded-2xl p-6 shadow-sm flex flex-col gap-6 animate-fade-in">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Besoins et contexte client</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Synthèse des informations recueillies.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">Secteur d'activité</span>
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {selectedDossier.raw_qualification_data?.profile?.sector || "Non qualifié"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">Taille estimée</span>
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {selectedDossier.raw_qualification_data?.profile?.company_size_estimate || "Non qualifié"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">Sites géographiques</span>
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {selectedDossier.raw_qualification_data?.profile?.locations_count || 1} site(s)
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">Problèmes et dysfonctionnements relevés</span>
                          {selectedDossier.raw_qualification_data?.profile?.current_problems?.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {selectedDossier.raw_qualification_data.profile.current_problems.map((prob: string, idx: number) => (
                                <span key={idx} className="px-2.5 py-1 rounded bg-red-500/5 text-red-600 border border-red-500/10 text-[10px] font-bold">
                                  {prob}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400 italic">Aucun problème listé</span>
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">Outils actuels</span>
                          {selectedDossier.raw_qualification_data?.profile?.current_tools?.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {selectedDossier.raw_qualification_data.profile.current_tools.map((tool: string, idx: number) => (
                                <span key={idx} className="px-2.5 py-1 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-[10px] font-medium">
                                  {tool}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400 italic">Aucun outil listé</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'twin' ? (
                  // Tab 2: Business Twin details
                  selectedTwin ? (
                    <BusinessTwinSlides twin={selectedTwin} companyName={selectedDossier.company_name} />
                  ) : (
                    <div className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-500 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                      Aucun Business Twin n'a été généré pour ce prospect.
                    </div>
                  )
                ) : (
                  // Tab 3: Simulated MSP Integration Provisioning (Priority 10)
                  <div className="glass-card rounded-2xl p-6 shadow-sm flex flex-col gap-6 animate-fade-in">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                        <Icons.Settings className="text-orange-500" size={16} /> Simulation de Provisioning MSP
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Activez et provisionnez les solutions d'infrastructure et de sécurité à la demande.
                      </p>
                    </div>

                    <div className="flex flex-col gap-4 divide-y divide-zinc-200 dark:divide-zinc-900">
                      {[
                        {
                          key: 'fibre',
                          label: 'Liaison Fibre Optique Pro Dédiée (GTR 4h)',
                          desc: 'Provisioning de la ligne physique Orange Business Services, raccordement du routeur d\'entreprise.',
                        },
                        {
                          key: 'm365',
                          label: 'Création Espace Microsoft 365 Cloud',
                          desc: 'Provisioning automatique des licences utilisateur, boîtes mails Exchange et accès Teams VoIP.',
                        },
                        {
                          key: 'firewall',
                          label: 'Configuration Firewall Centralisé & EDR',
                          desc: 'Déploiement des agents de sécurité cyber-défense sur l\'ensemble des postes du parc.',
                        }
                      ].map((item) => {
                        const provStatus = (selectedDossier.raw_qualification_data?.provisioning?.[item.key]) || 'PENDING';
                        
                        return (
                          <div key={item.key} className="pt-4 first:pt-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex-1 flex flex-col gap-1">
                              <span className="text-xs font-bold text-zinc-100">{item.label}</span>
                              <span className="text-[10px] text-zinc-400 font-medium leading-relaxed">{item.desc}</span>
                              
                              {/* Small simulated status indicator */}
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  provStatus === 'COMPLETED' ? 'bg-orange-500' : provStatus === 'PROVISIONING' ? 'bg-amber-500 animate-pulse' : 'bg-zinc-700'
                                }`} />
                                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                                  {provStatus === 'COMPLETED' ? 'Activé & Opérationnel' : provStatus === 'PROVISIONING' ? 'Configuration en cours' : 'Non configuré'}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 w-full sm:w-auto">
                              {provStatus === 'PENDING' ? (
                                <button
                                  onClick={() => handleProvisionService(item.key, 'start')}
                                  disabled={!!provisioningLoading}
                                  className="w-full sm:w-auto px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-[10px] font-bold text-zinc-300 rounded-xl transition-all cursor-pointer disabled:opacity-40"
                                >
                                  {provisioningLoading === `${item.key}_start` ? 'Initialisation...' : 'Lancer le Provisioning'}
                                </button>
                              ) : provStatus === 'PROVISIONING' ? (
                                <button
                                  onClick={() => handleProvisionService(item.key, 'complete')}
                                  disabled={!!provisioningLoading}
                                  className="w-full sm:w-auto px-4 py-2 orange-gradient-bg hover:opacity-90 text-[10px] font-bold text-white rounded-xl transition-all cursor-pointer disabled:opacity-40 animate-pulse"
                                >
                                  {provisioningLoading === `${item.key}_complete` ? 'Finalisation...' : 'Finaliser la Configuration'}
                                </button>
                              ) : (
                                <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[9px] font-black uppercase tracking-wider rounded-xl text-center">
                                  ✓ Provisionné
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-600 mb-3 text-lg font-bold">
                  i
                </div>
                <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Aucun prospect sélectionné</h3>
                <p className="text-xs text-zinc-400 mt-1">Sélectionnez un prospect dans la colonne latérale pour étudier son dossier.</p>
              </div>
            )}
          </div>

        </div>
      </div>
      <HelpDrawer isOpen={helpOpen} onClose={() => setHelpOpen(false)} role="KAM" />
    </ProtectedRoute>
  );
}
