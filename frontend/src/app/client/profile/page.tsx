'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/shared/Logo';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { Icons } from '@/components/shared/Icons';

interface Service {
  name: string;
  category: string;
  reasoning: string;
}

export default function ClientProfilePage() {
  const { user, logout } = useAuth();
  
  // Local state for profile and active conversation
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  
  const [profile, setProfile] = useState({
    sector: '',
    company_size_estimate: '',
    locations_count: 1,
    crm: '',
    current_problems: [] as string[],
    current_tools: [] as string[],
  });

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [rccm, setRccm] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  
  const [recommendations, setRecommendations] = useState<Service[]>([]);
  const [dossierDetails, setDossierDetails] = useState<any | null>(null);
  const [transmissionSuccess, setTransmissionSuccess] = useState(false);

  // Local state for theme
  const [themePreference, setThemePreference] = useState<'light' | 'dark' | 'system'>('system');

  // Load theme preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system';
    setThemePreference(savedTheme);
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setThemePreference(newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      // System
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  // Load data on mount
  useEffect(() => {
    async function loadProfileDashboard() {
      try {
        setLoading(true);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const token = localStorage.getItem('token');
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Token ${token}`;
        }

        // 1. Fetch conversations list
        const res = await fetch(`${API_URL}/api/discovery/conversations/`, { headers });
        if (res.ok) {
          const conversations = await res.json();
          setHistory(conversations);
          
          if (conversations && conversations.length > 0) {
            // Use the most recent conversation (first element)
            const activeConv = conversations[0];
            setConversationId(activeConv.id);
            
            // Populate profile
            if (activeConv.extracted_profile) {
              const ep = activeConv.extracted_profile;
              setProfile({
                sector: ep.sector || '',
                company_size_estimate: ep.company_size_estimate || '',
                current_problems: ep.current_problems || [],
                current_tools: ep.current_tools || [],
                locations_count: ep.locations_count || 1,
                crm: ep.crm || ''
              });
            }

            // Populate dossier
            if (activeConv.dossier_details) {
              const dd = activeConv.dossier_details;
              setDossierDetails(dd);
              setContactName(dd.contact_name || '');
              setContactPhone(dd.phone || '');
              setRccm(dd.rccm || '');
              setBillingAddress(dd.billing_address || '');
              
              if (dd.status === 'IN_REVIEW' || dd.status === 'ACCEPTED') {
                setTransmissionSuccess(true);
              }

              // Load active recommendations if qualified
              if (dd.has_twin) {
                const recRes = await fetch(`${API_URL}/api/discovery/conversations/${activeConv.id}/recommendations/`, { headers });
                if (recRes.ok) {
                  const recData = await recRes.json();
                  setRecommendations(recData.recommendations || []);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Erreur de chargement du tableau de bord profil:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfileDashboard();
  }, []);

  const mapServiceNameToKey = (name: string): string => {
    const clean = name.toLowerCase();
    if (clean.includes('fibre') || clean.includes('pro')) return 'fibre_optical';
    if (clean.includes('mobile') || clean.includes('flotte')) return 'mobile_fleet';
    if (clean.includes('sd-wan') || clean.includes('sdwan')) return 'sd_wan';
    if (clean.includes('microsoft') || clean.includes('365')) return 'm365_cloud';
    if (clean.includes('cyber') || clean.includes('sécurité') || clean.includes('cybersecurity')) return 'cybersecurity_pack';
    return 'fibre_optical';
  };

  const handleSaveProfileOnly = async () => {
    if (!conversationId || profileSaving) return;
    setProfileSaving(true);
    setProfileSaveSuccess(false);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      const res = await fetch(`${API_URL}/api/discovery/conversations/${conversationId}/transmit/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contact_name: contactName,
          phone: contactPhone,
          rccm: rccm,
          billing_address: billingAddress,
          only_save: true
        })
      });
      if (res.ok) {
        const data = await res.json();
        setProfileSaveSuccess(true);
        if (data.dossier_details) {
          setDossierDetails(data.dossier_details);
          if (data.dossier_details.status === 'IN_REVIEW' || data.dossier_details.status === 'ACCEPTED') {
            setTransmissionSuccess(true);
          }
        }
        setTimeout(() => setProfileSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du profil:", err);
    } finally {
      setProfileSaving(false);
    }
  };

  const getAllGlobalRecommendations = () => {
    const allRecs: any[] = [];
    const seenNames = new Set<string>();

    // Current conversation recommendations
    if (dossierDetails?.has_twin && recommendations.length > 0) {
      recommendations.forEach(r => {
        allRecs.push({
          ...r,
          convId: conversationId,
          companyName: dossierDetails?.company_name || user?.company_name || 'Mon Entreprise',
          dossierStatus: dossierDetails?.status || 'NEW',
          isCurrent: true,
          provisioning: dossierDetails?.raw_qualification_data?.provisioning || {},
          transmissionSuccess: transmissionSuccess
        });
        seenNames.add(r.name.toLowerCase());
      });
    }

    // Recommendations from past conversations
    history.forEach(conv => {
      if (conv.id !== conversationId && conv.dossier_details?.has_twin && conv.dossier_details?.recommendations) {
        const prov = conv.dossier_details?.raw_qualification_data?.provisioning || {};
        const isTransmitted = conv.dossier_details?.status === 'IN_REVIEW' || conv.dossier_details?.status === 'ACCEPTED';
        
        conv.dossier_details.recommendations.forEach((r: any) => {
          if (!seenNames.has(r.name.toLowerCase())) {
            allRecs.push({
              ...r,
              convId: conv.id,
              companyName: conv.dossier_details.company_name || conv.extracted_profile?.sector || 'Autre Session',
              dossierStatus: conv.dossier_details.status,
              isCurrent: false,
              provisioning: prov,
              transmissionSuccess: isTransmitted
            });
            seenNames.add(r.name.toLowerCase());
          }
        });
      }
    });

    return allRecs;
  };

  return (
    <ProtectedRoute allowedRoles={['CLIENT_B2B', 'ADMIN']}>
      <div className="h-screen bg-white dark:bg-zinc-950 flex flex-col font-sans text-black dark:text-zinc-55 overflow-hidden">
        {/* Header App Bar */}
        <header className="border-b border-zinc-200 dark:border-zinc-900 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <Logo size={32} showBg={true} />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-55 flex items-center gap-1 select-none">
                Onbora
              </h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Tableau de Bord & Profil B2B</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/client"
              className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-orange-500/50 hover:text-orange-500 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Icons.MessageSquare size={14} />
              <span>Retour au Chat</span>
            </Link>
          </div>
        </header>

        {/* Main Panel */}
        <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-6 sm:p-10 flex flex-col gap-6">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
              <p className="text-xs text-zinc-500">Chargement de votre espace de gestion...</p>
            </div>
          ) : (
            <>
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <Icons.Users size={20} className="text-orange-500 shrink-0" /> Mon Espace Profil & Commandes
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Gérez vos informations de facturation, suivez l'avancement de vos commandes et visualisez les besoins transmis à votre KAM.
                  </p>
                </div>
              </div>

              {/* Dashboard Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Column 1: Coordonnées de l'Entreprise & Facturation */}
                <div className="lg:col-span-1 flex flex-col gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h3 className="text-xs font-bold text-zinc-850 dark:text-zinc-200 uppercase tracking-wide flex items-center gap-1.5 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <Icons.FileText size={16} className="text-orange-500 shrink-0" /> Coordonnées Contractuelles
                  </h3>

                  {transmissionSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-500 rounded-xl text-[11px] leading-normal font-semibold flex gap-2 items-start">
                      <span className="text-sm">✓</span>
                      <span>Vos coordonnées sont verrouillées car une commande a été validée et transmise à votre Account Manager.</span>
                    </div>
                  )}

                  {/* Inputs */}
                  <div className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wide">Nom Complet du Contact</label>
                      <input
                        type="text"
                        disabled={transmissionSuccess || profileSaving}
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Nom Prénom du responsable"
                        className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955/40 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-orange-500 transition-all disabled:opacity-60"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wide">Numéro de Téléphone Direct</label>
                      <input
                        type="text"
                        disabled={transmissionSuccess || profileSaving}
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="Ex: +33 6 12 34 56 78"
                        className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955/40 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-orange-500 transition-all disabled:opacity-60"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wide">Numéro RCCM</label>
                      <input
                        type="text"
                        disabled={transmissionSuccess || profileSaving}
                        value={rccm}
                        onChange={(e) => setRccm(e.target.value)}
                        placeholder="Ex: RCCM-BF-OUA-2023-B-1234"
                        className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955/40 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-orange-500 transition-all disabled:opacity-60"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wide">Adresse Complète de Facturation</label>
                      <textarea
                        disabled={transmissionSuccess || profileSaving}
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        placeholder="Adresse postale complète..."
                        rows={3}
                        className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955/40 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-orange-500 transition-all disabled:opacity-60 resize-none"
                      />
                    </div>

                    {!transmissionSuccess && (
                      <div className="flex flex-col gap-2 mt-2">
                        <button
                          type="button"
                          onClick={handleSaveProfileOnly}
                          disabled={profileSaving}
                          className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-850 dark:text-zinc-200 font-bold text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {profileSaving ? 'Enregistrement...' : 'Enregistrer mon Profil'}
                        </button>
                        
                        {profileSaveSuccess && (
                          <span className="text-[10px] text-emerald-500 font-bold text-center animate-pulse">
                            ✓ Modifications enregistrées avec succès !
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: Suivi de l'Avancement des Commandes */}
                <div className="lg:col-span-1 flex flex-col gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-850 shadow-sm">
                  <h3 className="text-xs font-bold text-zinc-850 dark:text-zinc-200 uppercase tracking-wide flex items-center gap-1.5 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <Icons.Folder size={16} className="text-orange-500 shrink-0" /> Avancement de vos Commandes
                  </h3>

                  {(() => {
                    const globalRecs = getAllGlobalRecommendations();
                    if (globalRecs.length === 0) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-400 italic text-xs">
                          <Icons.Info size={24} className="mb-2 text-zinc-300 dark:text-zinc-700 animate-pulse" />
                          <span>Aucune commande active. Veuillez terminer votre qualification de services dans le Chat.</span>
                        </div>
                      );
                    }
                    return (
                      <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px] pr-1">
                        {globalRecs.map((service, idx) => {
                          const provStatus = service.provisioning?.[mapServiceNameToKey(service.name)] || 
                                             (service.transmissionSuccess ? 'COMMANDÉ' : 'BROUILLON');
                          
                          const steps = [
                            { label: 'Cadrage', done: true, active: false },
                            { label: 'Devis', done: service.transmissionSuccess || provStatus !== 'BROUILLON', active: !service.transmissionSuccess && provStatus === 'BROUILLON' },
                            { label: 'Acquisition', done: provStatus === 'PROVISIONING' || provStatus === 'COMPLETED' || provStatus === 'ACTIVE', active: provStatus === 'PROVISIONING' },
                            { label: 'Livré', done: provStatus === 'COMPLETED' || provStatus === 'ACTIVE', active: provStatus === 'COMPLETED' || provStatus === 'ACTIVE' }
                          ];

                          return (
                            <div
                              key={idx}
                              className="p-3 border border-zinc-150 dark:border-zinc-850 bg-white dark:bg-zinc-900/60 rounded-xl flex flex-col gap-3 hover:border-orange-500/30 transition-all group hover:shadow-sm"
                            >
                              <div className="flex justify-between items-start gap-1.5">
                                <div>
                                  <span className="text-[8px] font-bold text-orange-500 uppercase">{service.category}</span>
                                  <h4 className="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 leading-tight group-hover:text-orange-500 transition-colors">{service.name}</h4>
                                  {!service.isCurrent && (
                                    <span className="text-[7.5px] text-zinc-400 dark:text-zinc-500 font-medium">({service.companyName})</span>
                                  )}
                                </div>
                                <span className={`text-[8.5px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 ${
                                  provStatus === 'COMPLETED' || provStatus === 'ACTIVE' 
                                    ? 'bg-emerald-500/10 text-emerald-500' 
                                    : provStatus === 'PROVISIONING' 
                                      ? 'bg-orange-500/10 text-orange-500 animate-pulse'
                                      : 'bg-zinc-100 text-zinc-655 dark:bg-zinc-800 dark:text-zinc-400'
                                }`}>
                                  {provStatus === 'COMPLETED' || provStatus === 'ACTIVE' ? 'Livré' : provStatus === 'PROVISIONING' ? 'Acquisition' : 'Devis'}
                                </span>
                              </div>

                              <div className="flex md:flex-row flex-col md:items-center items-start justify-between gap-3 text-[8.5px] font-medium text-zinc-550 mt-1 relative px-1 w-full font-sans">
                                {steps.map((st, sidx) => (
                                  <div key={sidx} className="flex md:flex-col flex-row items-center gap-2 md:gap-1 z-10 relative">
                                    <div className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-extrabold border shrink-0 ${
                                      st.done 
                                        ? 'bg-orange-500 border-orange-600 text-white' 
                                        : st.active 
                                          ? 'bg-orange-100 border-orange-500 text-orange-500 animate-pulse'
                                          : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-450'
                                    }`}>
                                      {st.done ? '✓' : sidx + 1}
                                    </div>
                                    <span className={st.done || st.active ? 'text-orange-500 font-bold' : 'text-zinc-400'}>{st.label}</span>
                                  </div>
                                ))}
                                <div className="absolute top-[8px] left-[15%] right-[15%] h-0.5 bg-zinc-200 dark:bg-zinc-800 -z-0 hidden md:block" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Column 3: Outils & Besoins transmis au KAM */}
                <div className="lg:col-span-1 flex flex-col gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h3 className="text-xs font-bold text-zinc-855 dark:text-zinc-200 uppercase tracking-wide flex items-center gap-1.5 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <Icons.Settings size={16} className="text-orange-500 shrink-0" /> Synthèse des Besoins Transmis
                  </h3>

                  <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px]">
                    <div className="p-3 bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-855 rounded-xl flex flex-col gap-2">
                      <h4 className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Identité & Sites</h4>
                      <ul className="text-xs text-zinc-800 dark:text-zinc-300 space-y-1">
                        <li className="flex justify-between">
                          <span className="font-semibold text-zinc-500">Secteur :</span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-50">{profile.sector || 'Non renseigné'}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="font-semibold text-zinc-500">Employés :</span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-50">{profile.company_size_estimate || 'Non détecté'}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="font-semibold text-zinc-500">Sites d'exercice :</span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-50">{profile.locations_count} site(s)</span>
                        </li>
                        {profile.crm && (
                          <li className="flex justify-between">
                            <span className="font-semibold text-zinc-500">CRM de l'entreprise :</span>
                            <span className="font-bold text-zinc-900 dark:text-zinc-50">{profile.crm}</span>
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className="flex flex-col gap-2">
                      <h4 className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Dysfonctionnements Identifiés</h4>
                      {profile.current_problems.length === 0 ? (
                        <span className="text-xs text-zinc-400 italic">Aucun problème identifié</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {profile.current_problems.map((p, idx) => (
                            <span key={idx} className="text-[9px] font-bold px-2 py-1 rounded bg-rose-500/10 text-rose-500 border border-rose-500/10 uppercase tracking-wide flex items-center gap-1">
                              <Icons.AlertTriangle size={10} className="shrink-0" /> {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <h4 className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">Outils & Connectivité Actuelle</h4>
                      {profile.current_tools.length === 0 ? (
                        <span className="text-xs text-zinc-450 italic">Aucun outil identifié</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {profile.current_tools.map((t, idx) => (
                            <span key={idx} className="text-[9px] font-bold px-2 py-1 rounded bg-orange-500/10 text-orange-500 border border-orange-500/10 uppercase tracking-wide flex items-center gap-1">
                              🎓 {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Settings Section (Theme & Logout) */}
              <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xs font-bold text-zinc-850 dark:text-zinc-200 uppercase tracking-wide flex items-center gap-1.5 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <Icons.Settings size={16} className="text-orange-500 shrink-0" /> Préférences & Paramètres
                  </h3>
                  <div className="flex flex-col gap-3 mt-3">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Thème de l'Application</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleThemeChange('light')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          themePreference === 'light'
                            ? 'bg-orange-500 text-white border-transparent'
                            : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-750'
                        }`}
                      >
                        Clair
                      </button>
                      <button
                        onClick={() => handleThemeChange('dark')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          themePreference === 'dark'
                            ? 'bg-orange-500 text-white border-transparent'
                            : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-750'
                        }`}
                      >
                        Sombre
                      </button>
                      <button
                        onClick={() => handleThemeChange('system')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          themePreference === 'system'
                            ? 'bg-orange-500 text-white border-transparent'
                            : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-750'
                        }`}
                      >
                        Système
                      </button>
                    </div>
                    <span className="text-[9px] text-zinc-450 italic mt-0.5">
                      {themePreference === 'system' 
                        ? "S'adapte automatiquement aux préférences système de votre appareil." 
                        : `Thème manuel : ${themePreference === 'light' ? 'Clair' : 'Sombre'}.`}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-end self-end sm:self-center">
                  <button
                    onClick={logout}
                    className="py-2.5 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-rose-500/10 active:scale-98"
                    title="Se déconnecter de votre compte Onbora"
                  >
                    <Icons.LogOut size={14} />
                    <span>Déconnexion</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
