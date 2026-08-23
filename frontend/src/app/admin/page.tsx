"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/lib/api';
import Logo from '@/components/shared/Logo';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { Icons } from '@/components/shared/Icons';
import AdvProvisioningConsole from '@/components/adv/AdvProvisioningConsole';
import BackOfficeDashboard, { BackOfficeData } from '@/components/analytics/BackOfficeDashboard';

const SupervisorTerritoryMap = dynamic(
  () => import('@/components/supervisor/SupervisorTerritoryMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] rounded-2xl flex items-center justify-center bg-zinc-100 dark:bg-zinc-900/40 text-xs text-zinc-400 font-medium animate-pulse">
        Chargement de la carte vectorielle...
      </div>
    ),
  }
);

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
  const [stats, setStats] = useState<BackOfficeData | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Tabs and CRUD States
  const [activeTab, setActiveTab] = useState<'territory' | 'supervision' | 'catalog' | 'adv'>('territory');
  const [supervisorData, setSupervisorData] = useState<{
    plaques: any[];
    enterprises: any[];
    salespersons: any[];
    recent_reports_feed: any[];
  }>({
    plaques: [],
    enterprises: [],
    salespersons: [],
    recent_reports_feed: []
  });
  const [loadingSupervisor, setLoadingSupervisor] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);

  // Document Ingest States
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'parsing' | 'ai_structuring' | 'done'>('idle');
  const [proposedServices, setProposedServices] = useState<any[]>([]);
  const [selectedProposedIndices, setSelectedProposedIndices] = useState<number[]>([]);
  const [ingestError, setIngestError] = useState('');

  // Scraping Credentials States
  const [scraperCredentials, setScraperCredentials] = useState<any[]>([]);
  const [isCredsModalOpen, setIsCredsModalOpen] = useState(false);
  const [selectedCredsPlatform, setSelectedCredsPlatform] = useState('');
  const [credsCookiesValue, setCredsCookiesValue] = useState('');

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
      question: "Qu'est-ce que le Diagnostic d'Architecture Cible ?",
      answer: "Le Diagnostic d'Architecture Cible est une cartographie virtuelle de l'infrastructure réseau et cybersécurité proposée à un client, simulant ses débits et ses gains opérationnels en temps réel.",
      category: "GENERAL"
    }
  ];

  const loadSupervisorData = async () => {
    setLoadingSupervisor(true);
    try {
      const data = await fetchAPI('/api/sales/supervisor-dashboard/');
      setSupervisorData({
        plaques: data.plaques || [],
        enterprises: data.enterprises || [],
        salespersons: data.salespersons || [],
        recent_reports_feed: data.recent_reports_feed || [],
      });
    } catch (err) {
      console.error("Erreur de chargement du tableau de bord superviseur:", err);
    } finally {
      setLoadingSupervisor(false);
    }
  };

  useEffect(() => {
    loadSupervisorData();

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

  const loadCredentials = async () => {
    try {
      const data = await fetchAPI('/api/sales/credentials/');
      setScraperCredentials(data);
    } catch (err) {
      console.error("Erreur de chargement des identifiants de scraping:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'catalog') {
      loadServices();
      loadCredentials();
    } else if (activeTab === 'territory') {
      loadSupervisorData();
    }
  }, [activeTab]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await loadSupervisorData();
      const statsData = await fetchAPI('/api/reporting/demo-stats/');
      setStats(statsData);
      const logsData = await fetchAPI('/api/reporting/demo-logs/');
      setLogs(logsData);
      if (activeTab === 'catalog') {
        loadServices();
        loadCredentials();
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    setIngestError('');
    setProposedServices([]);
    setSelectedProposedIndices([]);

    // Step 1: Uploading
    setUploadStage('uploading');
    await new Promise(resolve => setTimeout(resolve, 800));

    // Step 2: Parsing (PDF/DOCX/OCR/Speech-to-Text)
    setUploadStage('parsing');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: AI Structuring
    setUploadStage('ai_structuring');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Backend Request
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/catalog/services/upload/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'analyse du fichier.");
      }

      const data = await response.json();
      setProposedServices(data.services || []);
      // Select all by default
      setSelectedProposedIndices(data.services.map((_: any, i: number) => i));
      setUploadStage('done');
    } catch (err: any) {
      console.error(err);
      setIngestError(err.message || "Impossible de parser ce document. Vérifiez le format.");
      setUploadStage('idle');
      setUploadingDoc(false);
    }
  };

  const handleImportProposed = async () => {
    const toImport = proposedServices.filter((_, idx) => selectedProposedIndices.includes(idx));
    if (toImport.length === 0) return;

    setLoadingServices(true);
    try {
      for (const service of toImport) {
        await fetchAPI('/api/catalog/services/', {
          method: 'POST',
          body: JSON.stringify(service)
        });
      }
      setProposedServices([]);
      setSelectedProposedIndices([]);
      setUploadingDoc(false);
      setUploadStage('idle');
      loadServices();
    } catch (err) {
      console.error("Erreur import services:", err);
      alert("Erreur lors de l'importation.");
    } finally {
      setLoadingServices(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterType === 'ALL') return true;
    return log.event_type === filterType;
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR']}>
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
              disabled={loading || loadingSupervisor}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-xs font-bold text-zinc-300 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Icons.Refresh size={12} /> Rafraîchir
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                {user?.role === 'SUPERVISOR' ? 'Superviseur Back-office' : 'Administrateur MSP'}
              </p>
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
                <span className="px-2.5 py-0.5 w-fit bg-blue-600/10 border border-blue-600/20 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-bold tracking-wider uppercase shadow-sm shadow-blue-500/20">
                  Supervision Back-office & Territoires
                </span>
                <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 mt-2 uppercase">Console Superviseur Onbora</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl font-medium">
                  Délimitez des plaques territoriales sur la carte, affectez des commerciaux aux secteurs et suivez les comptes-rendus de visite terrain.
                </p>
              </div>

              {/* Tab Switcher */}
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-2xl gap-1.5 border border-zinc-200/80 dark:border-zinc-800 shrink-0">
                <button
                  onClick={() => setActiveTab('territory')}
                  className={`py-2 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'territory'
                      ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.20)]'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                  }`}
                >
                  <Icons.Map size={14} /> Territoires & Plaques
                </button>
                <button
                  onClick={() => setActiveTab('supervision')}
                  className={`py-2 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'supervision'
                      ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.20)]'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                  }`}
                >
                  <Icons.BarChart size={14} /> Supervision & Métriques
                </button>
                <button
                  onClick={() => setActiveTab('adv')}
                  className={`py-2 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'adv'
                      ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.20)]'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                  }`}
                >
                  <Icons.Zap size={14} /> File ADV & Provisioning STP
                </button>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className={`py-2 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'catalog'
                      ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.20)]'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                  }`}
                >
                  <Icons.Layers size={14} /> Catalogue MSP & FAQ
                </button>
              </div>
            </div>

            {loading && !stats && loadingSupervisor ? (
              <div className="flex-1 flex items-center justify-center p-12">
                <div className="text-xs text-zinc-400 font-medium animate-pulse">Chargement des données de supervision...</div>
              </div>
            ) : activeTab === 'territory' ? (
              <SupervisorTerritoryMap
                plaques={supervisorData.plaques}
                enterprises={supervisorData.enterprises}
                salespersons={supervisorData.salespersons}
                recentReports={supervisorData.recent_reports_feed}
                onPlaqueCreated={loadSupervisorData}
                onSalespersonAssigned={loadSupervisorData}
                onSalespersonChanged={loadSupervisorData}
              />
            ) : activeTab === 'adv' ? (
              <AdvProvisioningConsole />
            ) : activeTab === 'supervision' ? (
              <BackOfficeDashboard
                initialData={stats}
                onRefresh={async () => {
                  const statsData = await fetchAPI('/api/reporting/demo-stats/');
                  setStats(statsData);
                }}
              />
            ) : (
                /* Catalogue MSP Tab Content */
                <div className="flex flex-col gap-8 animate-fadeIn text-zinc-800 dark:text-zinc-100">
                  {/* Catalog controls */}
                  <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/40 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <div>
                      <h3 className="text-sm font-bold">Catalogue des Solutions B2B</h3>
                      <p className="text-[10px] text-zinc-500">Gérez le catalogue des forfaits et offres télécoms recommandés aux entreprises.</p>
                    </div>
                    <button
                      onClick={() => handleOpenModal()}
                      className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-[0_0_20px_rgba(37,99,235,0.20)] hover:bg-blue-700 cursor-pointer transition-all animate-pulse hover:animate-none"
                    >
                      <Icons.Sparkles size={12} /> Ajouter une offre
                    </button>
                  </div>

                  {/* Intelligent Document Ingestion Zone */}
                  <div className="studio-card rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-stretch">
                    {/* Left: upload drag zone */}
                    <div className="flex-1 flex flex-col justify-center items-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center hover:border-blue-600/50 transition-colors relative cursor-pointer group">
                      <input
                        type="file"
                        accept=".pdf,.docx,image/*,video/*"
                        onChange={handleFileUpload}
                        disabled={uploadingDoc && uploadStage !== 'done'}
                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed z-20"
                      />
                      
                      {uploadStage === 'idle' ? (
                        <div className="flex flex-col items-center gap-2 text-zinc-500">
                          <div className="p-3 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-105 transition-transform duration-200">
                            <Icons.Download size={24} className="rotate-180" />
                          </div>
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Importer une grille tarifaire</span>
                          <span className="text-[10px] text-zinc-400 max-w-xs leading-relaxed">Glissez-déposez ou sélectionnez un fichier <strong>PDF, DOCX ou image de catalogue</strong></span>
                        </div>
                      ) : uploadStage === 'done' ? (
                        <div className="flex flex-col items-center gap-2 text-emerald-500">
                          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                            <Icons.CheckCircle size={24} />
                          </div>
                          <span className="text-xs font-bold">Document importé</span>
                          <span className="text-[10px] text-zinc-400">Validez les offres extraites à droite ou importez un nouveau fichier.</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 text-blue-600 py-3">
                          <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                              {uploadStage === 'uploading' && "Téléversement du fichier..."}
                              {uploadStage === 'parsing' && "Lecture et analyse du document..."}
                              {uploadStage === 'ai_structuring' && "Structuration des offres du catalogue..."}
                            </span>
                            <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-black animate-pulse">
                              Traitement en cours
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: proposed items or status info */}
                    <div className="flex-1 flex flex-col justify-between min-h-[160px] studio-subcard p-5 rounded-2xl">
                      {proposedServices.length > 0 ? (
                        <div className="flex flex-col gap-4 h-full justify-between">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Offres extraites ({proposedServices.length})</span>
                              <button
                                onClick={() => {
                                  if (selectedProposedIndices.length === proposedServices.length) {
                                    setSelectedProposedIndices([]);
                                  } else {
                                    setSelectedProposedIndices(proposedServices.map((_, i) => i));
                                  }
                                }}
                                className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase hover:underline cursor-pointer"
                              >
                                {selectedProposedIndices.length === proposedServices.length ? "Tout désélectionner" : "Tout sélectionner"}
                              </button>
                            </div>
                            
                            <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
                              {proposedServices.map((s, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-2 rounded-lg text-[10px]">
                                  <input
                                    type="checkbox"
                                    checked={selectedProposedIndices.includes(idx)}
                                    onChange={() => {
                                      setSelectedProposedIndices(prev =>
                                        prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                                      );
                                    }}
                                    className="accent-blue-600 cursor-pointer"
                                  />
                                  <div className="flex-1">
                                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{s.name}</span>
                                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[8px] text-zinc-500 font-bold uppercase">{s.category}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={handleImportProposed}
                            disabled={selectedProposedIndices.length === 0}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 text-white rounded-lg text-xs font-bold shadow-[0_0_20px_rgba(37,99,235,0.20)] cursor-pointer flex items-center justify-center gap-1.5 transition-all mt-3"
                          >
                            <Icons.Sparkles size={12} /> Importer les services sélectionnés ({selectedProposedIndices.length})
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col justify-center items-center text-center h-full gap-2 py-4">
                          <Icons.Sparkles size={20} className="text-zinc-300 dark:text-zinc-700" />
                          <span className="text-xs font-bold text-zinc-400">Aucun fichier en attente</span>
                          <p className="text-[10px] text-zinc-500 max-w-xs leading-relaxed">Téléversez un fichier de spécifications pour extraire et modéliser automatiquement vos offres MSP mensuelles.</p>
                          {ingestError && (
                            <span className="text-[10px] text-red-500 font-semibold mt-2 flex items-center justify-center gap-1">
                              <Icons.AlertCircle size={12} /> {ingestError}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {loadingServices ? (
                    <div className="flex justify-center p-12">
                      <div className="w-6 h-6 border-2 border-zinc-750 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {services.map(s => (
                        <div key={s.id} className="studio-card p-5 hover:shadow-md transition-all flex flex-col gap-4 relative group">
                          
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
                                className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-blue-600 transition-colors cursor-pointer"
                                title="Modifier"
                              >
                                <Icons.Edit size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteService(s.id)}
                                className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-red-500 transition-colors cursor-pointer"
                                title="Supprimer"
                              >
                                <Icons.Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex flex-col gap-1.5">
                            <h4 className="text-xs font-bold leading-snug">{s.name}</h4>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed">{s.description}</p>
                          </div>

                          {/* Benefits footer */}
                          <div className="border-t border-zinc-100 dark:border-zinc-900 pt-3 flex flex-col gap-1">
                            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Avantages</span>
                            <span className="text-[10px] text-zinc-600 dark:text-zinc-300 font-medium line-clamp-2 leading-relaxed">{s.benefits}</span>
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
                        className="px-3.5 py-1.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-600/20 hover:bg-blue-600/20 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                      >
                        <Icons.Sparkles size={12} /> Ajouter une FAQ
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {faqs.map(faq => (
                        <div key={faq.id} className="studio-card p-5 hover:shadow-md transition-all flex flex-col gap-3 relative group">
                          <div className="flex justify-between items-center">
                            <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 uppercase tracking-wider">
                              {faq.category}
                            </span>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleOpenFaqModal(faq)}
                                className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-blue-600 transition-colors cursor-pointer"
                                title="Modifier"
                              >
                                <Icons.Edit size={10} />
                              </button>
                              <button
                                onClick={() => handleDeleteFaq(faq.id)}
                                className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-red-500 transition-colors cursor-pointer"
                                title="Supprimer"
                              >
                                <Icons.Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                              <Icons.HelpCircle size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                              {faq.question}
                            </h4>
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
            }

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
                        className="p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 outline-none focus:border-blue-600"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Catégorie</label>
                      <select
                        value={formCategory}
                        onChange={e => setFormCategory(e.target.value)}
                        className="p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 outline-none focus:border-blue-600"
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
                        className="p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 outline-none focus:border-blue-600 resize-none"
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
                        className="p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 outline-none focus:border-blue-600"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Spécifications techniques (JSON)</label>
                      <textarea
                        rows={4}
                        required
                        value={formTechnical}
                        onChange={e => setFormTechnical(e.target.value)}
                        className="p-2 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 outline-none focus:border-blue-600"
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
                        className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.20)]"
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
                        className="p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 outline-none focus:border-blue-600"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Catégorie FAQ</label>
                      <select
                        value={faqCategory}
                        onChange={e => setFaqCategory(e.target.value)}
                        className="p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 outline-none focus:border-blue-600"
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
                        className="p-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 outline-none focus:border-blue-600 resize-none"
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
                        className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.20)]"
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
