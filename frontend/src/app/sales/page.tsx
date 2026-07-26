"use client";

import React, { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/lib/api';
import HelpDrawer from '@/components/shared/HelpDrawer';
import Logo from '@/components/shared/Logo';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { Icons } from '@/components/shared/Icons';
import GoogleSlidesTwin from '@/components/shared/GoogleSlidesTwin';
import BusinessTwinSlides from '@/components/shared/BusinessTwinSlides';

interface Enterprise {
  id: number;
  name: string;
  website: string;
  sector: string;
  approximate_size: string;
  location: string;
  existing_crm_data: any;
}

interface VisitPreparation {
  id: number;
  enterprise: number;
  enterprise_details: Enterprise;
  hypothesis_to_verify: string;
  custom_pitch: string;
  key_questions: string;
  meeting_objective: string;
}

interface VisitReport {
  id: number;
  raw_transcript: string;
  executive_summary: string;
  confirmed_needs: string[];
  objections_raised: string[];
  actions_todo: string[];
  follow_up_email_draft: string;
}

interface Slide {
  id: string;
  title: string;
  type: 'welcome' | 'diagnostic' | 'chart' | 'services' | 'roadmap' | 'custom';
  content: {
    subtitle?: string;
    description?: string;
    items?: string[];
    targetItems?: string[];
    metrics?: { label: string; before: number; after: number }[];
    services?: { name: string; priority: string; reasoning: string }[];
    roadmap?: string[];
    customText?: string;
  };
  notes: string;
}

type WorkflowStep = 'search' | 'brief' | 'visit' | 'report' | 'transmitted';

export default function SalesDashboard() {
  const { user, logout } = useAuth();
  
  const [step, setStep] = useState<WorkflowStep>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [selectedEnterprise, setSelectedEnterprise] = useState<Enterprise | null>(null);
  const [visitPrep, setVisitPrep] = useState<VisitPreparation | null>(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  
  // Visit recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [rawNotes, setRawNotes] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioFilePath, setAudioFilePath] = useState<string>('');
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  
  const [generatingReport, setGeneratingReport] = useState(false);
  const [visitReport, setVisitReport] = useState<VisitReport | null>(null);
  
  const [emailDraft, setEmailDraft] = useState('');
  const [transmitting, setTransmitting] = useState(false);
  const [createdDossierId, setCreatedDossierId] = useState<number | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  // Slideshow Twin states
  const [slidesTwinData, setSlidesTwinData] = useState<any>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeTab, setActiveTab] = useState<'workflow' | 'slides'>('workflow');
  const [isEditingSlides, setIsEditingSlides] = useState(false);

  // Auto-suggest on query change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setEnterprises([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await fetchAPI(`/api/sales/enterprises/search/?q=${encodeURIComponent(searchQuery)}`);
        setEnterprises(data || []);
      } catch (err) {
        console.error("Erreur de recherche d'entreprises:", err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Audio timer simulator
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const getInitialSlides = (twin: any, companyName: string): Slide[] => {
    return [
      {
        id: 'slide-1',
        title: 'Transformation Technologique',
        type: 'welcome',
        content: {
          subtitle: `Plan de transition numérique conçu pour ${companyName}`,
          description: "Modélisation en temps réel générée par le copilote commercial Onbora."
        },
        notes: "Diapositive d'accueil. Présenter les objectifs généraux du plan d'accompagnement de transition numérique pour l'entreprise."
      },
      {
        id: 'slide-2',
        title: 'Diagnostic : Situation comparative',
        type: 'diagnostic',
        content: {
          items: twin.current_state || [],
          targetItems: twin.proposed_state || []
        },
        notes: "Détail du diagnostic. Mettre l'accent sur les dysfonctionnements identifiés et les solutions d'infrastructure cibles."
      },
      {
        id: 'slide-3',
        title: 'Graphique d\'impact de performance',
        type: 'chart',
        content: {
          metrics: [
            { label: 'Débit / Réseau', before: 20, after: 95 },
            { label: 'Cybersécurité', before: 15, after: 98 },
            { label: 'Collaboration', before: 35, after: 90 }
          ]
        },
        notes: "Graphique d'impact. Expliquer le gain de performance en pourcentage suite aux raccordements de la Fibre et au déploiement du Cloud."
      },
      {
        id: 'slide-4',
        title: 'Solutions & Services recommandés',
        type: 'services',
        content: {
          services: twin.recommended_services || []
        },
        notes: "Présentation des offres phares (Fibre Optique Pro, EDR & Firewall centralisé, Microsoft 365)."
      },
      {
        id: 'slide-5',
        title: 'Roadmap chronologique de déploiement',
        type: 'roadmap',
        content: {
          roadmap: twin.roadmap || []
        },
        notes: "Présentation de la roadmap en 3 phases pour assurer la continuité de service lors du déploiement."
      }
    ];
  };

  const handleSelectEnterprise = async (ent: Enterprise) => {
    setSelectedEnterprise(ent);
    setGeneratingBrief(true);
    setStep('brief');
    
    // Set initial default slides template immediately so they are available in slides tab
    const initialTwin = {
      current_state: [
        "Infrastructures WAN obsolètes",
        "Processus collaboratifs fragmentés",
        "Sécurité des accès distants non garantie"
      ],
      proposed_state: [
        "Fibre Optique Sécurisée Orange",
        "Espace collaboratif unifié",
        "Accès VPN managé & Pare-feu"
      ],
      roadmap: [
        "Phase 1 : Audit et étude d'éligibilité fibre",
        "Phase 2 : Déploiement des accès et outils",
        "Phase 3 : Accompagnement au changement"
      ],
      recommended_services: [
        { name: "Fibre Optique Pro", priority: "CRITICAL", reasoning: "Remplacement du lien internet instable." }
      ]
    };
    setSlidesTwinData(initialTwin);
    setSlides(getInitialSlides(initialTwin, ent.name));

    try {
      const prep = await fetchAPI('/api/sales/visit-preparations/', {
        method: 'POST',
        body: JSON.stringify({ enterprise: ent.id })
      });
      setVisitPrep(prep);
      
      // Update slides template with live generated brief data
      if (prep) {
        const updatedTwin = {
          current_state: [
            "Infrastructures WAN sous-dimensionnées",
            "Absence de supervision proactive",
            prep.hypothesis_to_verify || "Diagnostic en attente"
          ],
          proposed_state: [
            "Liaison Fibre Orange Pro",
            "Firewall de sécurité & WAN optimisé",
            "Licences collaboratives centralisées"
          ],
          roadmap: [
            "Phase 1: Raccordement physique de la Fibre (S1)",
            "Phase 2: Configuration des switchs et pare-feux (S2)",
            "Phase 3: Migration Cloud et accompagnement utilisateur (S3)"
          ],
          recommended_services: [
            { name: "Fibre Pro Dédiée Orange", priority: "CRITICAL", reasoning: "Remplacement du lien ADSL saturé." },
            { name: "Firewall managé Fortinet", priority: "HIGH", reasoning: "Filtrage et protection UTM centralisée." }
          ]
        };
        setSlidesTwinData(updatedTwin);
        setSlides(getInitialSlides(updatedTwin, ent.name));
      }
    } catch (err) {
      console.error("Erreur de génération du brief:", err);
      alert("Impossible de générer le brief de visite.");
      setStep('search');
    } finally {
      setGeneratingBrief(false);
    }
  };

  const handleStartVisit = () => {
    if (visitPrep) {
      const mockTwin = {
        current_state: [
          "Infrastructures WAN sous-dimensionnées",
          "Absence de supervision proactive",
          visitPrep.hypothesis_to_verify || "Diagnostic en attente"
        ],
        proposed_state: [
          "Liaison Fibre Orange Pro",
          "Firewall de sécurité & WAN optimisé",
          "Licences collaboratives centralisées"
        ],
        roadmap: [
          "Phase 1: Raccordement physique de la Fibre (S1)",
          "Phase 2: Configuration des switchs et pare-feux (S2)",
          "Phase 3: Migration Cloud et accompagnement utilisateur (S3)"
        ],
        recommended_services: [
          { name: "Fibre Pro Dédiée Orange", priority: "CRITICAL", reasoning: "Remplacement du lien ADSL saturé identifié." },
          { name: "Firewall managé Fortinet", priority: "HIGH", reasoning: "Filtrage et protection UTM centralisée." }
        ]
      };
      setSlidesTwinData(mockTwin);
      setSlides(getInitialSlides(mockTwin, selectedEnterprise?.name || ''));
    }
    setStep('visit');
    // If not recording in background, reset notes. If already recording, keep it running!
    if (!isRecording) {
      setRawNotes('');
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size === 0) return;

        setIsProcessingAudio(true);
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, `recording_${Date.now()}.webm`);
          if (visitPrep?.id) {
            formData.append('preparation_id', visitPrep.id.toString());
          }

          const token = localStorage.getItem('token');
          const headers: HeadersInit = {};
          if (token) {
            headers['Authorization'] = `Token ${token}`;
          }

          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          const response = await fetch(`${apiBaseUrl}/api/sales/voice-upload/`, {
            method: 'POST',
            headers,
            body: formData
          });

          if (!response.ok) {
            throw new Error("Erreur de téléchargement audio");
          }

          const data = await response.json();
          setAudioFilePath(data.audio_file_path);
          setRawNotes(prev => {
            const base = prev.trim() ? prev + "\n\n" : "";
            return base + data.transcript;
          });
        } catch (err) {
          console.error("Erreur de transcription audio:", err);
          alert("Erreur lors de la transcription automatique de l'audio. Reprise de la simulation.");
          setRawNotes(prev => {
            const base = prev.trim() ? prev + "\n\n" : "";
            return base + "Discussion client : Le prospect souhaite raccorder son site médical à une fibre pro sécurisée HDS. Ils ont des soucis de standard téléphonique (obsolète) et s'inquiètent du budget.";
          });
        } finally {
          setIsProcessingAudio(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Impossible d'accéder au microphone:", err);
      alert("Accès au microphone refusé ou non supporté.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  const handleGenerateReport = async () => {
    if (!visitPrep || generatingReport) return;
    setGeneratingReport(true);
    
    try {
      const report = await fetchAPI('/api/sales/visit-reports/', {
        method: 'POST',
        body: JSON.stringify({
          preparation: visitPrep.id,
          raw_transcript: rawNotes,
          audio_file_path: audioFilePath
        })
      });
      setVisitReport(report);
      setEmailDraft(report.follow_up_email_draft);

      const mockTwin = {
        current_state: [
          ...report.objections_raised,
          "Dysfonctionnements d'accès débits constatés"
        ],
        proposed_state: [
          ...report.confirmed_needs,
          "Migration vers environnement managé"
        ],
        roadmap: report.actions_todo.map((act: string, idx: number) => `Phase ${idx+1}: ${act}`),
        recommended_services: [
          { name: "Fibre Optique Pro", priority: "CRITICAL", reasoning: "Offre standard raccordement WAN." },
          { name: "Licences Microsoft 365 Pro", priority: "MEDIUM", reasoning: "Pour uniformiser les outils collaboratifs." }
        ]
      };
      setSlidesTwinData(mockTwin);
      setSlides(getInitialSlides(mockTwin, selectedEnterprise?.name || ''));

      setStep('report');
    } catch (err) {
      console.error("Erreur de génération du rapport:", err);
      alert("Impossible de générer le rapport de visite.");
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleTransmitToKam = async () => {
    if (!visitReport || transmitting) return;
    setTransmitting(true);
    
    try {
      await fetchAPI(`/api/sales/visit-reports/${visitReport.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          follow_up_email_draft: emailDraft
        })
      });
      
      const res = await fetchAPI(`/api/sales/visit-reports/${visitReport.id}/transmit/`, {
        method: 'POST'
      });
      setCreatedDossierId(res.dossier_id);
      setStep('transmitted');
    } catch (err) {
      console.error("Erreur de transmission au KAM:", err);
      alert("Impossible de transmettre le dossier au KAM.");
    } finally {
      setTransmitting(false);
    }
  };

  const handleReset = () => {
    setStep('search');
    setSearchQuery('');
    setSelectedEnterprise(null);
    setVisitPrep(null);
    setVisitReport(null);
    setRawNotes('');
    setAudioFilePath('');
    setIsProcessingAudio(false);
    setCreatedDossierId(null);
    setActiveTab('workflow');
    setIsEditingSlides(false);
    setSlides([]);
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <ProtectedRoute allowedRoles={['SALESPERSON', 'ADMIN']}>
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col font-sans text-black dark:text-zinc-50">
        {/* Header */}
        <header className="border-b border-zinc-200 dark:border-zinc-900 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <Logo size={32} showBg={true} />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Onbora</h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Copilote Commercial de Terrain</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{user?.first_name} {user?.last_name}</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Commercial Orange</p>
            </div>
            <ThemeToggle />
             <button
              onClick={() => setHelpOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-250 dark:border-zinc-850 dark:hover:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Icons.HelpCircle size={14} /> Guide
            </button>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-transparent text-zinc-700 hover:text-zinc-950 dark:border-zinc-800 dark:hover:border-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-100 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Icons.LogOut size={14} /> Déconnexion
            </button>
          </div>
        </header>

        {/* Dynamic sub-header navigation tabs */}
        {selectedEnterprise && (
          <div className="w-full border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/20 py-2.5 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('workflow')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'workflow'
                    ? 'orange-gradient-bg text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-250 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                {step === 'brief' && "① Brief de prévisite"}
                {step === 'visit' && "② Rendez-vous client"}
                {step === 'report' && "③ Rapport de visite"}
                {step === 'transmitted' && "④ Dossier Transmis"}
              </button>
              
              <button
                onClick={() => setActiveTab('slides')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'slides'
                    ? 'orange-gradient-bg text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-250 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                <Icons.FileText size={14} />
                Support de Présentation (Slides)
              </button>
            </div>

            {/* Persistent background recording pill */}
            {isRecording && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl text-[10px] text-red-500 font-bold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span>Enregistrement en cours ({formatDuration(recordDuration)})</span>
                <button
                  onClick={handleStopRecording}
                  className="ml-2 bg-red-500 hover:bg-red-600 text-white rounded-lg px-2 py-0.5 text-[9px] cursor-pointer transition-all uppercase"
                >
                  Stop
                </button>
              </div>
            )}
          </div>
        )}

        {/* Dashboard Content */}
        <main className={`flex-1 w-full mx-auto p-6 md:p-8 flex flex-col justify-center transition-all duration-300 ${
          activeTab === 'slides' ? 'max-w-5xl' : 'max-w-3xl'
        }`}>
          
          {/* Step 1: Search & targeting */}
          {step === 'search' && (
            <div className="glass-card rounded-2xl p-6 md:p-8 shadow-sm flex flex-col gap-6 animate-fade-in">
              <div className="flex flex-col gap-2">
                <span className="mr-auto px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[9px] font-bold uppercase tracking-wide">
                  Ciblage
                </span>
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Sélectionner l'entreprise cible</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Recherchez une entreprise. Notre outil simulera un scraping web et consultera le CRM pour pré-remplir la fiche.</p>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Tapez le nom d'une entreprise (ex: Cabinet Médical Santé, TechSoft...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-sm focus:outline-none focus:border-orange-500 transition-all text-zinc-900 dark:text-zinc-50"
                />
                {searching && (
                  <div className="absolute right-3 top-3.5 w-4 h-4 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
                )}
                {/* Suggestions */}
                {enterprises.length > 0 && (
                  <div className="mt-4 border border-zinc-200 dark:border-zinc-850 rounded-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-850">
                    {enterprises.map((ent) => (
                      <button
                        key={ent.id}
                        onClick={() => handleSelectEnterprise(ent)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-950/40 transition-all cursor-pointer bg-white dark:bg-zinc-950/10"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200">{ent.name}</span>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                            <span>{ent.sector}</span>
                            <span>•</span>
                            <span>{ent.location}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-orange-500">Préparer la visite →</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step !== 'search' && (
            <>
              {activeTab === 'workflow' && (
                <>
                  {/* Step 2: Brief pre-visit */}
                  {step === 'brief' && (
                    <div className="glass-card rounded-2xl p-6 md:p-8 shadow-sm flex flex-col gap-6 animate-fade-in">
                      <div className="flex justify-between items-center">
                        <span className="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[9px] font-bold uppercase tracking-wide">
                          Brief Pré-Visite
                        </span>
                        <button
                          onClick={handleReset}
                          className="text-xs text-zinc-400 hover:text-zinc-650 bg-transparent border-none cursor-pointer font-medium"
                        >
                          Retour
                        </button>
                      </div>

                      {generatingBrief ? (
                        <div className="flex flex-col gap-6 animate-pulse mt-4">
                          <div className="flex flex-col gap-2">
                            <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-1/2" />
                            <div className="flex gap-2">
                              <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-20" />
                              <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-16" />
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-3 mt-2">
                            <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-md w-24" />
                            <div className="h-16 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
                              <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-md w-full" />
                              <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-md w-5/6" />
                            </div>
                          </div>

                          <div className="flex flex-col gap-3">
                            <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-md w-32" />
                            <div className="h-20 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
                              <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-md w-11/12" />
                              <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-md w-full" />
                              <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-md w-3/4" />
                            </div>
                          </div>
                          <p className="text-xs text-zinc-500 italic mt-2">Scraping du site web & consultation CRM en cours...</p>
                        </div>
                      ) : visitPrep ? (
                        <div className="flex flex-col gap-6">
                          <div>
                            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                              {visitPrep.enterprise_details.name}
                            </h2>
                            <div className="flex flex-wrap gap-2 items-center mt-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                              <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 font-semibold">{visitPrep.enterprise_details.sector}</span>
                              <span>•</span>
                              <span>{visitPrep.enterprise_details.location}</span>
                              <span>•</span>
                              <span>{visitPrep.enterprise_details.approximate_size}</span>
                            </div>
                          </div>

                          {/* Objective */}
                          <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wide">Objectif de la visite</span>
                            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-normal">{visitPrep.meeting_objective}</p>
                          </div>

                          {/* Hypothesis to verify */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Hypothèses à vérifier</span>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed bg-zinc-100 dark:bg-zinc-950/20 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl font-medium">
                              {visitPrep.hypothesis_to_verify}
                            </p>
                          </div>

                          {/* Custom pitch */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Pitch personnalisé suggéré</span>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed bg-zinc-100 dark:bg-zinc-950/20 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl font-medium">
                              {visitPrep.custom_pitch}
                            </p>
                          </div>

                          {/* Key questions */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Questions d'accroche clés</span>
                            <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed bg-zinc-100 dark:bg-zinc-950/20 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl whitespace-pre-line font-medium">
                              {visitPrep.key_questions}
                            </div>
                          </div>

                          <button
                            onClick={handleStartVisit}
                            className="w-full py-3 orange-gradient-bg hover:opacity-90 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                          >
                            Démarrer le Rendez-vous →
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Step 3: Active Visit Mode */}
                  {step === 'visit' && (
                    <div className="w-full flex flex-col gap-5 glass-card rounded-2xl p-6 shadow-sm justify-between bg-white dark:bg-zinc-950/20 animate-fade-in">
                      <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
                        <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-bold uppercase tracking-wide animate-pulse">
                          Rendez-vous en cours
                        </span>
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50 truncate max-w-[200px]">
                          {selectedEnterprise?.name}
                        </span>
                      </div>

                      {/* Dictaphone Audio Recorder */}
                      <div className="bg-zinc-100 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col items-center gap-4 w-full">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Dictaphone Assistant Commercial (Whisper)</span>
                        
                        <div className="flex flex-col items-center gap-4 mt-2">
                          <button
                            onClick={handleToggleRecording}
                            disabled={isProcessingAudio}
                            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md disabled:opacity-50 ${
                              isRecording
                                ? 'bg-red-500 hover:bg-red-650 text-white scale-105 animate-pulse'
                                : 'orange-gradient-bg hover:opacity-90 text-white'
                            }`}
                          >
                            {isRecording ? (
                              <span className="w-5 h-5 bg-white rounded-sm" />
                            ) : (
                              <span className="w-5 h-5 bg-white rounded-full" />
                            )}
                          </button>
                          
                          {isRecording && (
                            <div className="flex flex-col items-center gap-1 text-center">
                              <span className="text-sm font-black text-red-500">{formatDuration(recordDuration)}</span>
                              <span className="text-[9px] font-semibold text-zinc-400">Enregistrement audio en cours...</span>
                            </div>
                          )}

                          {isProcessingAudio && (
                            <div className="flex items-center gap-2 text-[10px] text-orange-500 font-bold">
                              <div className="w-3.5 h-3.5 border-2 border-zinc-350 border-t-orange-500 rounded-full animate-spin" />
                              <span>Transcription par Whisper en cours...</span>
                            </div>
                          )}

                          {audioFilePath && !isRecording && !isProcessingAudio && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 px-3 py-1.5 rounded-xl">
                              <Icons.Check size={14} />
                              <span>Audio enregistré et rattaché avec succès ({audioFilePath.split('/').pop()})</span>
                            </div>
                          )}
                        </div>

                        {isRecording && (
                          <div className="flex items-center gap-1 h-10 justify-center w-full mt-3 px-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => {
                              const heights = ['h-3', 'h-6', 'h-9', 'h-5', 'h-10', 'h-7', 'h-11', 'h-6', 'h-9', 'h-4', 'h-8', 'h-3', 'h-7', 'h-5', 'h-3'];
                              const delays = ['0ms', '150ms', '300ms', '450ms', '200ms', '350ms', '100ms', '500ms', '250ms', '400ms', '150ms', '300ms', '450ms', '100ms', '200ms'];
                              return (
                                <span 
                                  key={i} 
                                  className={`w-1 ${heights[i % heights.length]} bg-gradient-to-t from-red-500 via-orange-500 to-amber-400 rounded-full`} 
                                  style={{ animationDelay: delays[i % delays.length], animationDuration: '0.8s' }}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Raw notes input */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                          Notes de réunion & transcription (Éditable)
                        </label>
                        <textarea
                          placeholder="Tapez vos notes ou arrêtez l'enregistrement audio ci-dessus pour transcrire automatiquement la discussion..."
                          value={rawNotes}
                          onChange={(e) => setRawNotes(e.target.value)}
                          rows={5}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 text-sm focus:outline-none focus:border-orange-500 transition-all text-zinc-900 dark:text-zinc-50 font-medium"
                        />
                      </div>

                      <div className="flex justify-between gap-4 mt-1">
                        <button
                          onClick={() => setStep('brief')}
                          className="px-5 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer"
                        >
                          Retour brief
                        </button>
                        <button
                          onClick={handleGenerateReport}
                          disabled={!rawNotes.trim() || generatingReport}
                          className="flex-1 py-2.5 orange-gradient-bg hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md"
                        >
                          {generatingReport ? 'Analyse par l\'IA...' : 'Générer le Rapport →'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Post-Visit Report Analysis & Validation */}
                  {step === 'report' && visitReport && (
                    <div className="w-full flex flex-col gap-5 glass-card rounded-2xl p-6 shadow-sm bg-white dark:bg-zinc-950/20">
                      <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
                        <span className="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[9px] font-bold uppercase tracking-wide">
                          Rapport Commercial Généré
                        </span>
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50 truncate max-w-[160px]">
                          {selectedEnterprise?.name}
                        </span>
                      </div>

                      {/* Executive Summary */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Résumé analytique de l'IA</span>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-950/20 p-3.5 border border-zinc-200 dark:border-zinc-800 rounded-xl font-medium">
                          {visitReport.executive_summary}
                        </p>
                      </div>

                      {/* Needs & Objections */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Besoins validés</span>
                          <div className="flex flex-wrap gap-1">
                            {visitReport.confirmed_needs.map((need, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-650 dark:text-orange-400 border border-orange-500/20 text-[9px] font-bold">
                                {need}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Objections</span>
                          <div className="flex flex-wrap gap-1">
                            {visitReport.objections_raised.map((obj, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-red-500/5 text-red-650 dark:text-red-400 border border-red-500/10 text-[9px] font-bold">
                                {obj}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Todo actions */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Actions recommandées</span>
                        <ul className="text-xs text-zinc-650 dark:text-zinc-400 list-disc pl-4 space-y-0.5">
                          {visitReport.actions_todo.map((act, idx) => (
                            <li key={idx} className="font-medium">{act}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Follow-up email draft */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                          Email de suivi (Modifiable)
                        </label>
                        <textarea
                          value={emailDraft}
                          onChange={(e) => setEmailDraft(e.target.value)}
                          rows={5}
                          className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-xs font-mono focus:outline-none focus:border-orange-500 transition-all text-zinc-900 dark:text-zinc-50"
                        />
                      </div>

                      <div className="flex justify-between gap-3 mt-1 border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
                        <button
                          onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sales/visit-reports/${visitReport.id}/export/`, '_blank')}
                          className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-850 text-[10px] font-bold text-zinc-800 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Icons.Download size={12} /> PDF
                        </button>
                        <button
                          onClick={() => setStep('visit')}
                          className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-850 text-[10px] font-bold text-zinc-800 transition-all cursor-pointer"
                        >
                          Retour notes
                        </button>
                        <button
                          onClick={handleTransmitToKam}
                          disabled={transmitting}
                          className="flex-1 py-2 orange-gradient-bg hover:opacity-90 text-white rounded-xl text-[10px] font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-orange-500/10 flex items-center justify-center gap-1"
                        >
                          {transmitting ? 'Transmission...' : 'Transmettre KAM'} <Icons.ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 5: Transmitted screen */}
                  {step === 'transmitted' && (
                    <div className="glass-card rounded-2xl p-8 shadow-sm flex flex-col items-center gap-6 text-center animate-fade-in">
                      <div className="w-14 h-14 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-full flex items-center justify-center text-xl font-bold shadow-sm shadow-orange-500/25">
                        ✓
                      </div>
                      <div className="flex flex-col gap-2">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Dossier transmis avec succès</h2>
                        <p className="text-xs text-zinc-400 leading-normal max-w-md mx-auto">
                          Le rapport de visite a été structuré et envoyé au **Workspace KAM** sous le dossier **#{createdDossierId}**. Un e-mail de suivi a été préparé pour le prospect.
                        </p>
                      </div>

                      <button
                        onClick={handleReset}
                        className="px-6 py-2.5 orange-gradient-bg hover:opacity-90 active:scale-98 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Prospecter une autre entreprise
                      </button>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'slides' && (
                <div className="w-full flex flex-col bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6 shadow-sm animate-fade-in gap-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-zinc-150 dark:border-zinc-850 pb-4 gap-3">
                    <div className="flex flex-col">
                      <span className="px-2 py-0.5 mr-auto rounded bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[9px] font-bold uppercase tracking-wide">
                        Livrable de Présentation
                      </span>
                      <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-1">
                        Diapositives commerciales pour {selectedEnterprise?.name}
                      </h3>
                    </div>
                    
                    {/* Slide mode toggler button */}
                    <button
                      onClick={() => setIsEditingSlides(!isEditingSlides)}
                      className="px-4 py-2 rounded-xl border border-orange-500/20 hover:border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 text-orange-650 dark:text-orange-400 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto shadow-sm"
                    >
                      {isEditingSlides ? (
                        <>
                          <Icons.FileText size={14} />
                          Quitter l'éditeur (Mode Lecture)
                        </>
                      ) : (
                        <>
                          <Icons.FileEdit size={14} />
                          Modifier le slide
                        </>
                      )}
                    </button>
                  </div>

                  {/* Slides view switcher */}
                  <div className="w-full">
                    {isEditingSlides ? (
                      <GoogleSlidesTwin
                        twin={slidesTwinData || {
                          current_state: ["Diagnostic en attente"],
                          proposed_state: ["Liaison Fibre Pro"],
                          roadmap: ["S1: Déploiement"],
                          recommended_services: []
                        }}
                        companyName={selectedEnterprise?.name || "l'entreprise"}
                        slides={slides}
                        onChangeSlides={setSlides}
                      />
                    ) : (
                      <BusinessTwinSlides
                        twin={slidesTwinData || {
                          current_state: ["Diagnostic en attente"],
                          proposed_state: ["Liaison Fibre Pro"],
                          roadmap: ["S1: Déploiement"],
                          recommended_services: []
                        }}
                        companyName={selectedEnterprise?.name || "l'entreprise"}
                        slides={slides}
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          )}

        </main>
      </div>
      <HelpDrawer isOpen={helpOpen} onClose={() => setHelpOpen(false)} role="SALESPERSON" />
    </ProtectedRoute>
  );
}
