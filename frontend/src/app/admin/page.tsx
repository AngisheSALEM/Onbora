"use client";

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/lib/api';
import Logo from '@/components/shared/Logo';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { Icons } from '@/components/shared/Icons';

interface Log {
  id: number;
  event_type: string;
  event_type_display: string;
  description: string;
  user: string;
  created_at: string;
  metadata: any;
}

interface Stats {
  total_dossiers: number;
  inbound_count: number;
  outbound_count: number;
  conversion_rate: number;
  status_counts: {
    NEW: number;
    IN_REVIEW: number;
    ACCEPTED: number;
    REJECTED: number;
  };
}

export default function AdminDashboard() {
  const { user, logout, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Tabs and CRUD States
  const [activeTab, setActiveTab] = useState<'supervision' | 'catalog'>('supervision');
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);

  // Service Form States
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('CONNECTIVITY');
  const [formDescription, setFormDescription] = useState('');
  const [formBenefits, setFormBenefits] = useState('');
  const [formTechnical, setFormTechnical] = useState('{\n  "bandwidth": "100 Mbps"\n}');
  const [errorMsg, setErrorMsg] = useState('');

  // FAQ States
  interface FAQ {
    id: number;
    question: string;
    answer: string;
    category: string;
  }
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategory, setFaqCategory] = useState('GENERAL');

  const defaultFaqs = [
    {
      id: 1,
      question: "Qu'est-ce que l'offre Onbora Connect ?",
      answer: "C'est une offre de connectivité fibre optique d'entreprise avec GTR (Garantie de Temps de Rétablissement) de 4 heures.",
      category: "CONNECTIVITY"
    },
    {
      id: 2,
      question: "La cybersécurité est-elle incluse par défaut ?",
      answer: "Oui, tous les abonnements Onbora incluent une protection réseau Firewall managé et une licence EDR pour les postes clients.",
      category: "SECURITY"
    },
    {
      id: 3,
      question: "Qu'est-ce que le Business Twin ?",
      answer: "Le Business Twin (ou Jumeau Numérique) est une réplique virtuelle de l'infrastructure réseau et cybersécurité proposée à un client, simulant ses débits et ses gains opérationnels en temps réel.",
      category: "GENERAL"
    }
  ];

  useEffect(() => {
    async function loadAdminData() {
      try {
        const statsData = await fetchAPI('/api/reporting/demo-stats/');
        setStats(statsData);
        
        const logsData = await fetchAPI('/api/reporting/demo-logs/');
        setLogs(logsData);
      } catch (err) {
        console.error("Erreur de chargement des données d'administration:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();

    // Load FAQs
    const stored = localStorage.getItem('onbora_faqs');
    if (stored) {
      setFaqs(JSON.parse(stored));
    } else {
      setFaqs(defaultFaqs);
      localStorage.setItem('onbora_faqs', JSON.stringify(defaultFaqs));
    }
  }, []);

  const loadServices = async () => {
    setLoadingServices(true);
    try {
      const data = await fetchAPI('/api/catalog/services/');
      setServices(data);
    } catch (err) {
      console.error("Erreur chargement catalogue:", err);
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'catalog') {
      loadServices();
    }
  }, [activeTab]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const statsData = await fetchAPI('/api/reporting/demo-stats/');
      setStats(statsData);
      const logsData = await fetchAPI('/api/reporting/demo-logs/');
      setLogs(logsData);
      if (activeTab === 'catalog') {
        loadServices();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Service CRUD handlers
  const handleOpenModal = (service: any = null) => {
    setEditingService(service);
    if (service) {
      setFormName(service.name || '');
      setFormCategory(service.category || 'CONNECTIVITY');
      setFormDescription(service.description || '');
      setFormBenefits(service.benefits || '');
      setFormTechnical(JSON.stringify(service.technical_requirements || {}, null, 2));
    } else {
      setFormName('');
      setFormCategory('CONNECTIVITY');
      setFormDescription('');
      setFormBenefits('');
      setFormTechnical('{\n  "bandwidth": "100 Mbps"\n}');
    }
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    let parsedTech = {};
    try {
      parsedTech = JSON.parse(formTechnical);
    } catch (err) {
      setErrorMsg("Le format des exigences techniques doit être du JSON valide.");
      return;
    }

    const payload = {
      name: formName,
      category: formCategory,
      description: formDescription,
      benefits: formBenefits,
      technical_requirements: parsedTech
    };

    try {
      if (editingService) {
        await fetchAPI(`/api/catalog/services/${editingService.id}/`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await fetchAPI('/api/catalog/services/', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      setIsModalOpen(false);
      loadServices();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Une erreur est survenue lors de l'enregistrement.");
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce service du catalogue ?")) {
      return;
    }
    try {
      await fetchAPI(`/api/catalog/services/${id}/`, {
        method: 'DELETE'
      });
      loadServices();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression.");
    }
  };

  // FAQ CRUD handlers
  const saveFaqsToStorage = (newFaqs: FAQ[]) => {
    setFaqs(newFaqs);
    localStorage.setItem('onbora_faqs', JSON.stringify(newFaqs));
  };

  const handleOpenFaqModal = (faq: FAQ | null = null) => {
    setEditingFaq(faq);
    if (faq) {
      setFaqQuestion(faq.question);
      setFaqAnswer(faq.answer);
      setFaqCategory(faq.category);
    } else {
      setFaqQuestion('');
      setFaqAnswer('');
      setFaqCategory('GENERAL');
    }
    setIsFaqModalOpen(true);
  };

  const handleSaveFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFaq) {
      const updated = faqs.map(f => f.id === editingFaq.id ? { ...f, question: faqQuestion, answer: faqAnswer, category: faqCategory } : f);
      saveFaqsToStorage(updated);
    } else {
      const newFaq = {
        id: Date.now(),
        question: faqQuestion,
        answer: faqAnswer,
        category: faqCategory
      };
      saveFaqsToStorage([...faqs, newFaq]);
    }
    setIsFaqModalOpen(false);
  };

  const handleDeleteFaq = (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette FAQ ?")) {
      return;
    }
    const filtered = faqs.filter(f => f.id !== id);
    saveFaqsToStorage(filtered);
  };

  const filteredLogs = logs.filter(log => {
    if (filterType === 'ALL') return true;
    return log.event_type === filterType;
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col font-sans text-black dark:text-zinc-50">
        
        {/* Header */}
        <header className="border-b border-zinc-200 dark:border-zinc-900 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-sm shrink-0 z-10">
          <div className="flex items-center gap-3">
            <Logo size={32} showBg={true} />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Onbora</h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Console Superviseur & Supervision Démo</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-xs font-bold text-zinc-300 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Icons.Refresh size={12} /> Rafraîchir
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Superviseur Orange</p>
            </div>
            <ThemeToggle />
            <button
              onClick={logout}
              className="px-3.5 py-1.5 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-transparent text-xs font-semibold text-zinc-700 hover:text-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-100 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Icons.LogOut size={14} /> Déconnexion
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto flex flex-col gap-6">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div>
                <span className="px-2.5 py-0.5 w-fit bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-full text-[9px] font-bold tracking-wider uppercase shadow-sm shadow-orange-500/20">
                  Supervision Technique
                </span>
                <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 mt-2 uppercase">Console d'Adoption MSP</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl font-medium">
                  Suivez l'activité commerciale en temps réel, observez l'état du pipe de qualification et gérez le catalogue de services MSP.
                </p>
              </div>

              {/* Tab Switcher */}
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl gap-1 border border-zinc-200 dark:border-zinc-800 shrink-0">
                <button
                  onClick={() => setActiveTab('supervision')}
                  className={`py-1.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'supervision'
                      ? 'bg-white dark:bg-zinc-800 text-orange-500 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                  }`}
                >
                  📊 Supervision & Métriques
                </button>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className={`py-1.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'catalog'
                      ? 'bg-white dark:bg-zinc-800 text-orange-500 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                  }`}
                >
                  💼 Catalogue & FAQ
                </button>
              </div>
            </div>

            {loading && !stats ? (
              <div className="flex-1 flex items-center justify-center p-12">
                <div className="text-xs text-zinc-400 font-medium animate-pulse">Chargement des données de supervision...</div>
              </div>
            ) : (
              activeTab === 'supervision' ? (
                stats && (
                  <div className="flex flex-col gap-6 animate-fadeIn">
                    
                    {/* Stats cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="glass-card rounded-2xl p-5 shadow-sm flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Prospects Totaux</span>
                        <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{stats.total_dossiers}</span>
                        <p className="text-[9px] text-zinc-500 mt-2">Dossiers créés dans le pipe commercial</p>
                      </div>

                      <div className="glass-card rounded-2xl p-5 shadow-sm flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Qualifiés en Ligne (Inbound)</span>
                        <span className="text-3xl font-black text-orange-500">{stats.inbound_count}</span>
                        <p className="text-[9px] text-zinc-500 mt-2">Qualification conversationnelle autonome</p>
                      </div>

                      <div className="glass-card rounded-2xl p-5 shadow-sm flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Visites Terrain (Outbound)</span>
                        <span className="text-3xl font-black text-orange-400">{stats.outbound_count}</span>
                        <p className="text-[9px] text-zinc-500 mt-2">Qualifiés par les commerciaux via dictaphone</p>
                      </div>

                      <div className="glass-card rounded-2xl p-5 shadow-sm flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Taux de Conversion KAM</span>
                        <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{stats.conversion_rate}%</span>
                        <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1 rounded-full overflow-hidden mt-2">
                          <div className="orange-gradient-bg h-full" style={{ width: `${stats.conversion_rate}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Pipeline breakdown & Trend Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left: Counts */}
                      <div className="glass-card rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                        <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Répartition du Pipeline KAM</h3>
                        <div className="grid grid-cols-3 gap-4 text-center my-auto text-zinc-900 dark:text-zinc-100">
                          <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-850 rounded-xl">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Nouveau</span>
                            <p className="text-lg font-black text-zinc-700 dark:text-zinc-300 mt-1">{stats.status_counts.NEW}</p>
                          </div>
                          <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-850 rounded-xl">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">En revue</span>
                            <p className="text-lg font-black text-zinc-700 dark:text-zinc-300 mt-1">{stats.status_counts.IN_REVIEW}</p>
                          </div>
                          <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-850 rounded-xl">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Pris en charge</span>
                            <p className="text-lg font-black text-orange-500 mt-1">{stats.status_counts.ACCEPTED}</p>
                          </div>
                        </div>
                      </div>

                      {/* Right: SVG Trend Line Chart */}
                      <div className="glass-card rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                        <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Courbe d'Adoption Hebdomadaire</h3>
                        <div className="relative h-32 w-full flex items-end">
                          <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                            <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                            <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                            <line x1="0" y1="80" x2="300" y2="80" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                            
                            <path
                              d="M 0 90 Q 50 80, 100 65 T 200 45 T 300 25"
                              fill="none"
                              stroke="#71717a"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            
                            <path
                              d="M 0 95 Q 50 85, 100 70 T 200 35 T 300 15"
                              fill="none"
                              stroke="#f97316"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />

                            <path
                              d="M 0 95 Q 50 85, 100 70 T 200 35 T 300 15 L 300 100 L 0 100 Z"
                              fill="url(#gradient-orange)"
                              opacity="0.05"
                            />

                            <defs>
                              <linearGradient id="gradient-orange" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#f97316" />
                                <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                          </svg>
                          
                          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[8px] text-zinc-500 font-semibold px-1">
                            <span>Lun</span>
                            <span>Mar</span>
                            <span>Mer</span>
                            <span>Jeu</span>
                            <span>Ven</span>
                            <span>Sam</span>
                            <span>Dim</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 justify-center text-[9px] font-bold text-zinc-400">
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-0.5 bg-orange-500 inline-block" />
                            <span>Inbound (En Ligne)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-0.5 bg-zinc-600 inline-block" />
                            <span>Outbound (Terrain)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Logs section */}
                    <div className="glass-card rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Logs d'Activité Récents</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {['ALL', 'CONVERSATION_STARTED', 'QUALIFICATION_SUCCESS', 'DOSSIER_TRANSMITTED', 'REPORT_GENERATED', 'PDF_EXPORTED'].map(type => (
                            <button
                              key={type}
                              onClick={() => setFilterType(type)}
                              className={`px-2 py-1 rounded text-[9px] font-bold transition-all border cursor-pointer ${
                                filterType === type
                                  ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 border-transparent'
                                  : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950/40 dark:hover:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800'
                              }`}
                            >
                              {type === 'ALL' ? 'Tous' : type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold">
                              <th className="py-2.5">Date</th>
                              <th className="py-2.5">Type</th>
                              <th className="py-2.5">Description</th>
                              <th className="py-2.5">Auteur</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredLogs.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-8 text-center text-zinc-400">
                                  Aucun log d'événement trouvé pour ce filtre.
                                </td>
                              </tr>
                            ) : (
                              filteredLogs.map(log => (
                                <tr key={log.id} className="border-b border-zinc-100 dark:border-zinc-800/55 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20">
                                  <td className="py-3 text-zinc-500 whitespace-nowrap">{log.created_at}</td>
                                  <td className="py-3 font-bold whitespace-nowrap">
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase ${
                                      log.event_type === 'QUALIFICATION_SUCCESS' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                                      log.event_type === 'DOSSIER_TRANSMITTED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' :
                                      log.event_type === 'PDF_EXPORTED' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400' :
                                      'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                    }`}>
                                      {log.event_type}
                                    </span>
                                  </td>
                                  <td className="py-3 text-zinc-700 dark:text-zinc-300">{log.description}</td>
                                  <td className="py-3 text-zinc-500">{log.user}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                )
              ) : (
                /* Catalogue MSP Tab Content */
                <div className="flex flex-col gap-8 animate-fadeIn text-zinc-800 dark:text-zinc-100">
                  {/* Catalog controls */}
                  <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/40 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <div>
                      <h3 className="text-sm font-bold">Services du Catalogue MSP</h3>
                      <p className="text-[10px] text-zinc-500">Ajoutez, modifiez ou supprimez les offres de services suggérées par l'IA lors des analyses.</p>
                    </div>
                    <button
                      onClick={() => handleOpenModal()}
                      className="px-3.5 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-orange-500/20 hover:bg-orange-600 cursor-pointer transition-all animate-pulse hover:animate-none"
                    >
                      <Icons.Sparkles size={12} /> Ajouter un service
                    </button>
                  </div>

                  {loadingServices ? (
                    <div className="flex justify-center p-12">
                      <div className="w-6 h-6 border-2 border-zinc-750 border-t-orange-500 rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {services.map(s => (
                        <div key={s.id} className="glass-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-850 hover:border-orange-500/30 transition-all flex flex-col gap-4 shadow-sm relative group">
                          
                          {/* Badges */}
                          <div className="flex justify-between items-start">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${
                              s.category === 'CONNECTIVITY' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900' :
                              s.category === 'SECURITY' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900' :
                              s.category === 'CLOUD' ? 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900' :
                              'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-850 dark:text-zinc-300 dark:border-zinc-700'
                            }`}>
                              {s.category_display || s.category}
                            </span>
                            
                            {/* Edit / Delete action overlay */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleOpenModal(s)}
                                className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-orange-500 transition-colors cursor-pointer"
                                title="Modifier"
                              >
                                <Icons.Edit size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteService(s.id)}
                                className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-red-500 transition-colors cursor-pointer"
                                title="Supprimer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Details */}
                          <div>
                            <h4 className="text-xs font-black uppercase text-zinc-900 dark:text-zinc-50">{s.name}</h4>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-3 leading-relaxed">{s.description}</p>
                          </div>

                          <div className="border-t border-zinc-100 dark:border-zinc-850 pt-3 flex flex-col gap-2 mt-auto">
                            <div>
                              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Avantages clients :</span>
                              <p className="text-[9px] text-zinc-600 dark:text-zinc-300 mt-0.5 italic">✓ {s.benefits}</p>
                            </div>
                            
                            {s.technical_requirements && Object.keys(s.technical_requirements).length > 0 && (
                              <div>
                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Prérequis techniques :</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {Object.entries(s.technical_requirements).map(([key, val]: any) => (
                                    <span key={key} className="text-[8px] font-semibold bg-zinc-100 dark:bg-zinc-850 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800">
                                      {key}: {String(val)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* FAQ Section */}
                  <div className="border-t border-zinc-200 dark:border-zinc-900 pt-8 flex flex-col gap-6">
                    <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/40 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                      <div>
                        <h3 className="text-sm font-bold">Foire aux Questions (FAQ)</h3>
                        <p className="text-[10px] text-zinc-500">Gérez les questions fréquemment posées affichées sur l'interface d'adoption client.</p>
                      </div>
                      <button
                        onClick={() => handleOpenFaqModal()}
                        className="px-3.5 py-1.5 bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500/20 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                      >
                        <Icons.Sparkles size={12} /> Ajouter une FAQ
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {faqs.map(faq => (
                        <div key={faq.id} className="glass-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-850 hover:border-orange-500/30 transition-all flex flex-col gap-3 relative group">
                          <div className="flex justify-between items-center">
                            <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 uppercase tracking-wider">
                              {faq.category}
                            </span>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleOpenFaqModal(faq)}
                                className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-orange-500 transition-colors cursor-pointer"
                                title="Modifier"
                              >
                                <Icons.Edit size={10} />
                              </button>
                              <button
                                onClick={() => handleDeleteFaq(faq.id)}
                                className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-red-500 transition-colors cursor-pointer"
                                title="Supprimer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-50">❓ {faq.question}</h4>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-2 bg-zinc-50/50 dark:bg-zinc-950/20 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-900/60 leading-relaxed font-medium">
                              {faq.answer}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Service Form Modal */}
            {isModalOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl flex flex-col gap-5 text-zinc-800 dark:text-zinc-100 animate-scaleIn">
                  <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900 pb-3">
                    <h3 className="text-sm font-bold uppercase tracking-tight text-zinc-900 dark:text-zinc-50">
                      {editingService ? "Modifier le Service" : "Ajouter un Service au Catalogue"}
                    </h3>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      <Icons.Close size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveService} className="flex flex-col gap-4">
                    {errorMsg && (
                      <div className="p-3 bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl text-[10px] font-bold">
                        ⚠️ {errorMsg}
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nom du Service</label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        placeholder="Ex: Fibre Optique d'Entreprise"
                        className="p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Catégorie</label>
                      <select
                        value={formCategory}
                        onChange={e => setFormCategory(e.target.value)}
                        className="p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 outline-none focus:border-orange-500"
                      >
                        <option value="CONNECTIVITY">Connectivité</option>
                        <option value="CLOUD">Cloud / Hébergement</option>
                        <option value="SECURITY">Cybersécurité</option>
                        <option value="COLLABORATIVE">Collaboration & Communication</option>
                        <option value="PAYMENT">Moyens de Paiement</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Description</label>
                      <textarea
                        rows={3}
                        required
                        value={formDescription}
                        onChange={e => setFormDescription(e.target.value)}
                        placeholder="Description complète de l'offre..."
                        className="p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 outline-none focus:border-orange-500 resize-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Avantages Clés</label>
                      <input
                        type="text"
                        required
                        value={formBenefits}
                        onChange={e => setFormBenefits(e.target.value)}
                        placeholder="Ex: Disponibilité garantie 99.9%, débits symétriques."
                        className="p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Spécifications techniques (JSON)</label>
                      <textarea
                        rows={4}
                        required
                        value={formTechnical}
                        onChange={e => setFormTechnical(e.target.value)}
                        className="p-2 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 border-t border-zinc-150 dark:border-zinc-900 pt-3">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-all cursor-pointer shadow-sm"
                      >
                        Enregistrer
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* FAQ Form Modal */}
            {isFaqModalOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl flex flex-col gap-5 text-zinc-800 dark:text-zinc-100 animate-scaleIn">
                  <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900 pb-3">
                    <h3 className="text-sm font-bold uppercase tracking-tight text-zinc-900 dark:text-zinc-50">
                      {editingFaq ? "Modifier la FAQ" : "Ajouter une FAQ"}
                    </h3>
                    <button
                      onClick={() => setIsFaqModalOpen(false)}
                      className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      <Icons.Close size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveFaq} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Question</label>
                      <input
                        type="text"
                        required
                        value={faqQuestion}
                        onChange={e => setFaqQuestion(e.target.value)}
                        placeholder="Ex: Comment activer mon abonnement ?"
                        className="p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Catégorie FAQ</label>
                      <select
                        value={faqCategory}
                        onChange={e => setFaqCategory(e.target.value)}
                        className="p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 outline-none focus:border-orange-500"
                      >
                        <option value="GENERAL">Général</option>
                        <option value="CONNECTIVITY">Connectivité</option>
                        <option value="SECURITY">Cybersécurité</option>
                        <option value="CLOUD">Cloud & Applications</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Réponse</label>
                      <textarea
                        rows={4}
                        required
                        value={faqAnswer}
                        onChange={e => setFaqAnswer(e.target.value)}
                        placeholder="Saisissez la réponse détaillée..."
                        className="p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 outline-none focus:border-orange-500 resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 border-t border-zinc-150 dark:border-zinc-900 pt-3">
                      <button
                        type="button"
                        onClick={() => setIsFaqModalOpen(false)}
                        className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-all cursor-pointer shadow-sm"
                      >
                        Enregistrer
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
