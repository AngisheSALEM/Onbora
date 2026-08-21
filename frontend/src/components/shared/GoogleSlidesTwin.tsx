"use client";

import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import Logo from './Logo';

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

interface GoogleSlidesTwinProps {
  twin: {
    current_state?: string[];
    proposed_state?: string[];
    roadmap?: string[];
    recommended_services?: { name: string; priority: string; reasoning: string }[];
  };
  companyName: string;
  isMiniPreview?: boolean;
  onOpenFull?: () => void;
  slides?: Slide[];
  onChangeSlides?: (newSlides: Slide[]) => void;
}

// Inline Editable Text Sub-component
const EditableText = ({
  text,
  onChange,
  className = "",
  isTextArea = false
}: {
  text: string;
  onChange: (val: string) => void;
  className?: string;
  isTextArea?: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(text);

  useEffect(() => {
    setVal(text);
  }, [text]);

  const handleBlur = () => {
    setIsEditing(false);
    if (val.trim() !== text.trim()) {
      onChange(val);
    }
  };

  if (isEditing) {
    if (isTextArea) {
      return (
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={handleBlur}
          autoFocus
          className={`bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 border border-blue-600 rounded p-1 focus:outline-none w-full leading-normal ${className}`}
        />
      );
    }
    return (
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        autoFocus
        className={`bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 border border-blue-600 rounded p-1 focus:outline-none w-full ${className}`}
      />
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={`cursor-pointer hover:bg-blue-600/10 hover:border-blue-600/30 border border-transparent rounded p-0.5 transition-all ${className}`}
      title="Double-cliquer pour modifier"
    >
      {text || <span className="text-zinc-400 italic">Double-cliquer pour modifier</span>}
    </div>
  );
};

export default function GoogleSlidesTwin({
  twin,
  companyName,
  isMiniPreview = false,
  onOpenFull,
  slides: propsSlides,
  onChangeSlides: propsOnChangeSlides
}: GoogleSlidesTwinProps) {
  const [localSlides, setLocalSlides] = useState<Slide[]>([]);

  const slides = propsSlides !== undefined ? propsSlides : localSlides;
  const setSlides = (newSlides: any) => {
    if (propsOnChangeSlides) {
      if (typeof newSlides === 'function') {
        propsOnChangeSlides(newSlides(slides));
      } else {
        propsOnChangeSlides(newSlides);
      }
    } else {
      setLocalSlides(newSlides);
    }
  };

  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [presentationTitle, setPresentationTitle] = useState(`Onbora — Diagnostic d'Architecture Cible ${companyName}`);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  // Slideshow Presentation Mode State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlayMode, setIsPlayMode] = useState(false);
  const [playIntervalId, setPlayIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Google Slide Import Inline State
  const [showImportView, setShowImportView] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStepMsg, setImportStepMsg] = useState('');

  // Initial Slides load from twin object
  useEffect(() => {
    if (twin) {
      const initialSlides: Slide[] = [
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
            items: twin.current_state || ["Réseau WAN cuivre instable", "Pas de protection Endpoint (EDR)", "Messagerie hétérogène"],
            targetItems: twin.proposed_state || ["Fibre Pro Dédiée Orange", "Protection EDR & Firewall managé", "Messagerie Microsoft 365 Pro"]
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
            services: twin.recommended_services || [
              { name: "Fibre Optique Pro", priority: "CRITICAL", reasoning: "Raccordement réseau fibre dédié avec garantie de rétablissement en 4h." },
              { name: "Firewall managé & EDR", priority: "HIGH", reasoning: "Protection du réseau local et des postes contre les ransomwares." }
            ]
          },
          notes: "Présentation des offres phares (Fibre Optique Pro, EDR & Firewall centralisé, Microsoft 365)."
        },
        {
          id: 'slide-5',
          title: 'Roadmap chronologique de déploiement',
          type: 'roadmap',
          content: {
            roadmap: twin.roadmap || ["Phase 1: Raccordement Fibre (S1-S2)", "Phase 2: Déploiement Sécurité & Office 365 (S3)", "Phase 3: Formation des équipes & recette (S4)"]
          },
          notes: "Présentation de la roadmap en 3 phases pour assurer la continuité de service lors du déploiement."
        }
      ];
      setSlides(initialSlides);
    }
  }, [twin, companyName]);

  // Slideshow Navigation handler
  const handleNextSlide = () => {
    if (showImportView) return;
    setActiveSlideIdx(prev => (prev + 1) % slides.length);
  };

  const handlePrevSlide = () => {
    if (showImportView) return;
    setActiveSlideIdx(prev => (prev - 1 + slides.length) % slides.length);
  };

  // Keyboard navigation inside fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        handleNextSlide();
      } else if (e.key === 'ArrowLeft') {
        handlePrevSlide();
      } else if (e.key === 'Escape') {
        exitFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, slides.length, showImportView]);

  // Fullscreen toggle helpers
  const enterFullscreen = () => {
    if (showImportView) return;
    setIsFullscreen(true);
  };

  const exitFullscreen = () => {
    setIsFullscreen(false);
    setIsPlayMode(false);
    if (playIntervalId) {
      clearInterval(playIntervalId);
      setPlayIntervalId(null);
    }
  };

  // Slideshow play/pause handler
  const togglePlayMode = () => {
    if (showImportView) return;
    if (isPlayMode) {
      if (playIntervalId) {
        clearInterval(playIntervalId);
        setPlayIntervalId(null);
      }
      setIsPlayMode(false);
    } else {
      setIsPlayMode(true);
      const id = setInterval(() => {
        handleNextSlide();
      }, 3500); // Auto advance every 3.5s
      setPlayIntervalId(id);
    }
  };

  // Add Custom Slide
  const handleAddSlide = () => {
    setShowImportView(false);
    const newSlide: Slide = {
      id: `custom-slide-${Date.now()}`,
      title: 'Nouvelle Diapositive',
      type: 'custom',
      content: {
        customText: 'Double-cliquez pour saisir le contenu de votre diapositive personnalisée...'
      },
      notes: 'Notes du présentateur pour cette nouvelle diapositive.'
    };
    const newSlides = [...slides];
    const targetIdx = activeSlideIdx === -1 ? 0 : activeSlideIdx;
    newSlides.splice(targetIdx + 1, 0, newSlide);
    setSlides(newSlides);
    setActiveSlideIdx(targetIdx + 1);
  };

  // Delete Slide
  const handleDeleteSlide = () => {
    if (showImportView || slides.length <= 1) return;
    const newSlides = slides.filter((_, idx) => idx !== activeSlideIdx);
    setSlides(newSlides);
    setActiveSlideIdx(prev => (prev >= newSlides.length ? newSlides.length - 1 : prev));
  };

  // Move Slide Up
  const handleMoveSlideUp = () => {
    if (showImportView || activeSlideIdx <= 0) return;
    const newSlides = [...slides];
    const temp = newSlides[activeSlideIdx];
    newSlides[activeSlideIdx] = newSlides[activeSlideIdx - 1];
    newSlides[activeSlideIdx - 1] = temp;
    setSlides(newSlides);
    setActiveSlideIdx(activeSlideIdx - 1);
  };

  // Move Slide Down
  const handleMoveSlideDown = () => {
    if (showImportView || activeSlideIdx === -1 || activeSlideIdx === slides.length - 1) return;
    const newSlides = [...slides];
    const temp = newSlides[activeSlideIdx];
    newSlides[activeSlideIdx] = newSlides[activeSlideIdx + 1];
    newSlides[activeSlideIdx + 1] = temp;
    setSlides(newSlides);
    setActiveSlideIdx(activeSlideIdx + 1);
  };

  // Simulate Google Slides import logic
  const handleImportSlidesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportStepMsg("Connexion sécurisée aux serveurs Google Drive...");

    const steps = [
      { progress: 25, msg: "Établissement du tunnel API Google Presentation..." },
      { progress: 55, msg: "Scraping du document et téléchargement du layout original..." },
      { progress: 85, msg: "Alignement intelligent avec le catalogue de services MSP Onbora..." },
      { progress: 100, msg: "Importation terminée avec succès !" }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setImportProgress(steps[currentStep].progress);
        setImportStepMsg(steps[currentStep].msg);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          // Injects custom imported slides
          const importedSlides: Slide[] = [
            {
              id: 'imp-1',
              title: 'Diagnostic Réseau Orange Business Services',
              type: 'welcome',
              content: {
                subtitle: `Audit d\'infrastructure WAN importé pour ${companyName}`,
                description: "Vérifié et consolidé avec le référentiel des services managés."
              },
              notes: "Diapositive importée. Commencer par l'introduction du rapport d'audit réseau et télécom."
            },
            {
              id: 'imp-2',
              title: 'WAN : Diagnostic débits et saturation',
              type: 'diagnostic',
              content: {
                items: [
                  "Ligne ADSL saturée à 100% pendant les pics",
                  "Garantie de Temps de Rétablissement (GTR) inexistante",
                  "Pas de sécurité sur les flux critiques"
                ],
                targetItems: [
                  "Fibre Orange dédiée symétrique (95% gain de débit)",
                  "GTR de 4h garantie contractuelle",
                  "Tunnel VPN IPsec chiffré centralisé"
                ]
              },
              notes: "Montrer l'écart de performance de débit brut entre l'ADSL cuivré saturé et la Fibre Orange dédiée."
            },
            {
              id: 'imp-3',
              title: 'Recommandations & Sécurité Fortinet',
              type: 'services',
              content: {
                services: [
                  { name: "Fibre Pro Dédiée Orange", priority: "CRITICAL", reasoning: "Raccordement physique en fibre avec fibre de secours LTE." },
                  { name: "Firewall managé Fortigate", priority: "HIGH", reasoning: "Filtrage web, protection IPS, et EDR sur l'ensemble du LAN." },
                  { name: "Switching & LAN Managé", priority: "MEDIUM", reasoning: "Garantie de continuité de service des switchs locaux." }
                ]
              },
              notes: "Expliquer les avantages du pack Fortinet/Orange Business Services pour sécuriser les sites distants."
            }
          ];
          setSlides(importedSlides);
          setActiveSlideIdx(0);
          setShowImportView(false);
          setIsImporting(false);
          setImportUrl('');
        }, 800);
      }
    }, 850);
  };

  const activeSlide = slides[activeSlideIdx];

  // MINI CHATBOARD PREVIEW MODE
  if (isMiniPreview) {
    return (
      <div 
        onClick={onOpenFull}
        className="w-full max-w-sm studio-card p-4 hover:shadow-md cursor-pointer flex flex-col gap-3 transition-all relative overflow-hidden group shadow-sm"
      >
        <div className="absolute top-0 right-0 p-1 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-bl-lg text-[9px] font-bold tracking-wider uppercase">
          Architecture Cible
        </div>
        <div className="flex items-center gap-2.5">
          <Logo size={24} showBg={true} />
          <div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-150">Présentation Google Slides</h4>
            <p className="text-[10px] text-zinc-500 font-medium">{companyName}</p>
          </div>
        </div>
        
        {/* Fake Mini Slide View */}
        <div className="h-24 studio-subcard rounded-xl flex items-center justify-center p-3 relative overflow-hidden">
          <div className="text-center">
            <Icons.Sparkles className="text-blue-600 dark:text-blue-400 w-5 h-5 mx-auto mb-1 animate-pulse" />
            <span className="text-[10px] font-black text-zinc-800 dark:text-zinc-300 uppercase tracking-wider">
              Consulter les slides Google Slides
            </span>
            <p className="text-[9px] text-zinc-500 mt-0.5">
              Cliquez pour ouvrir l'espace de présentation
            </p>
          </div>
        </div>
      </div>
    );
  }

  // RENDER DETAILED PRESENTATION FRAMEWORK
  return (
    <div className="flex flex-col w-full h-[540px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xl animate-fade-in relative text-black dark:text-zinc-200">
      
      {/* 1. Header Google Slides Style */}
      <header className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-850 px-4 py-2 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo Google Slides Clone */}
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-blue-600/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <line x1="9" y1="9" x2="15" y2="9"/>
              <line x1="9" y1="13" x2="13" y2="13"/>
              <line x1="9" y1="17" x2="11" y2="17"/>
            </svg>
          </div>
          
          <div className="flex flex-col">
            {/* Slide Title */}
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={presentationTitle}
                  onChange={(e) => setPresentationTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  autoFocus
                  className="text-sm font-bold text-zinc-900 dark:text-zinc-50 border-b border-blue-600 focus:outline-none bg-transparent py-0.5"
                />
              ) : (
                <span 
                  onClick={() => setIsEditingTitle(true)}
                  className="text-sm font-bold text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-900 px-1 rounded cursor-pointer truncate max-w-[280px]"
                >
                  {presentationTitle}
                </span>
              )}
              {/* Starred */}
              <Icons.Sparkles size={12} className="text-blue-600 dark:text-blue-400 cursor-pointer animate-pulse" />
            </div>
          </div>
        </div>

        {/* Presentation & Share Buttons */}
        <div className="flex items-center gap-2">
          {/* Present Slides Button (Slideshow) */}
          <button 
            onClick={enterFullscreen}
            disabled={showImportView}
            className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icons.Sun size={14} className="text-blue-600 rotate-90" />
            Lire la présentation
          </button>
          
          {/* Google Share Blue Button */}
          <button 
            onClick={() => alert("Lien de partage copié dans le presse-papiers !")}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-98 text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_20px_rgba(37,99,235,0.20)]"
          >
            <Icons.Send size={12} />
            Partager
          </button>
        </div>
      </header>

      {/* 2. Shortcuts / Tooling Bar */}
      <div className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-850 px-4 py-1 flex items-center justify-between shrink-0 text-zinc-600 dark:text-zinc-300">
        <div className="flex items-center gap-2">
          {/* Add Slide */}
          <button 
            onClick={handleAddSlide}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-850 transition-all cursor-pointer text-zinc-900 dark:text-zinc-50"
            title="Ajouter une diapositive (+)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="M12 5v14"/>
            </svg>
          </button>
          {/* Delete Slide */}
          <button 
            onClick={handleDeleteSlide}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-850 transition-all cursor-pointer text-red-500"
            title="Supprimer la diapositive"
            disabled={showImportView || slides.length <= 1}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
          <span className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
          
          {/* Order arrows */}
          <button 
            onClick={handleMoveSlideUp}
            disabled={showImportView || activeSlideIdx <= 0}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-850 transition-all cursor-pointer disabled:opacity-30"
            title="Déplacer vers le haut"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
          <button 
            onClick={handleMoveSlideDown}
            disabled={showImportView || activeSlideIdx === -1 || activeSlideIdx === slides.length - 1}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-850 transition-all cursor-pointer disabled:opacity-30"
            title="Déplacer vers le bas"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <span className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
          
          {/* Inline Import Icon Button */}
          <button 
            onClick={() => {
              setShowImportView(true);
              setActiveSlideIdx(-1);
            }}
            className={`p-1 rounded transition-all cursor-pointer flex items-center justify-center ${showImportView ? 'bg-blue-600 text-white' : 'hover:bg-zinc-200 dark:hover:bg-zinc-850 text-blue-600 dark:text-blue-400'}`}
            title="Importer depuis Google Slides (Lien)"
          >
            <Icons.Download size={15} />
          </button>
          <span className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

          <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono select-none">
            Zoom 80%
          </span>
          <span className="text-[10px] text-zinc-500 font-medium select-none ml-2">
            {showImportView ? "Menu Importation" : `Diapositive ${activeSlideIdx + 1} sur ${slides.length}`}
          </span>
        </div>

        {/* Right side shortcuts */}
        <span className="text-[10px] text-zinc-400 font-semibold italic">Double-cliquer sur le texte pour l'éditer en direct</span>
      </div>

      {/* 3. Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Slide Miniatures */}
        <div className="w-[120px] bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-850 flex flex-col gap-2 p-2 overflow-y-auto shrink-0 select-none">
          {slides.map((slide, idx) => (
            <div 
              key={slide.id}
              onClick={() => {
                setShowImportView(false);
                setActiveSlideIdx(idx);
              }}
              className={`flex items-start gap-1 p-1 rounded-lg border cursor-pointer transition-all ${
                (!showImportView && activeSlideIdx === idx) 
                  ? 'border-blue-600 bg-blue-600/5' 
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
              }`}
            >
              <span className="text-[10px] font-bold text-zinc-400 mt-1">{idx + 1}</span>
              {/* Miniature card */}
              <div className="flex-1 aspect-video bg-zinc-100 dark:bg-zinc-900 rounded border border-zinc-300 dark:border-zinc-850 flex items-center justify-center p-1 overflow-hidden relative">
                <span className="text-[6px] font-black text-zinc-700 dark:text-zinc-300 uppercase truncate max-w-[80px] text-center">{slide.title}</span>
                {/* Tiny preview details */}
                <div className="absolute bottom-0.5 right-0.5 p-px bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded text-[5px] font-extrabold scale-75">
                  {slide.type.toUpperCase()}
                </div>
              </div>
            </div>
          ))}

          {/* Special Sidebar Item for Import */}
          <div 
            onClick={() => {
              setShowImportView(true);
              setActiveSlideIdx(-1);
            }}
            className={`flex items-start gap-1 p-1 mt-2 rounded-lg border cursor-pointer transition-all ${
              showImportView 
                ? 'border-blue-600 bg-blue-600/5' 
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
            }`}
          >
            <span className="text-[10px] font-bold text-zinc-400 mt-1">📥</span>
            <div className="flex-1 aspect-video bg-zinc-55 dark:bg-zinc-900 rounded border border-zinc-300 dark:border-zinc-850 flex flex-col items-center justify-center p-1 overflow-hidden relative text-center">
              <Icons.Download className="text-blue-600 dark:text-blue-400" size={12} />
              <span className="text-[5px] font-black text-zinc-650 dark:text-zinc-400 uppercase mt-0.5">Importer Slides</span>
            </div>
          </div>
          
          {/* Add Slide Shortcut in Sidebar */}
          <button 
            onClick={handleAddSlide}
            className="w-full py-1.5 mt-2 rounded border border-dashed border-zinc-300 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-[10px] font-bold text-zinc-500 transition-all cursor-pointer shrink-0"
          >
            + Nouvelle diapo
          </button>
        </div>

        {/* Center/Right presentation panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-200 dark:bg-zinc-950/40 p-4">
          
          {/* Slide Box Wrapper */}
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            
            {/* The 16:9 Slide Screen */}
            <div className="w-full aspect-video max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl shadow-lg flex flex-col justify-between p-8 relative overflow-hidden text-left">
              
              {/* Radial gradient background */}
              <div className="absolute inset-0 bg-radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.015) 0%, transparent 80%) pointer-events-none" />

              {showImportView ? (
                /* INLINE SLIDES IMPORT MENU (NO MODALS) */
                <div className="flex flex-col justify-center h-full gap-4 max-w-md mx-auto p-4 z-10">
                  <div className="flex items-center gap-2 border-b border-zinc-150 dark:border-zinc-800 pb-2">
                    <span className="p-1 bg-blue-600 text-white rounded shadow-sm flex items-center justify-center">
                      <Icons.Download size={14} />
                    </span>
                    <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wide">
                      Importer depuis Google Slides
                    </h3>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal">
                    Collez l'URL de votre document Google Slides existant pour synchroniser et mettre à jour le jumeau numérique avec l'IA d'Onbora.
                  </p>

                  {isImporting ? (
                    <div className="flex flex-col gap-2.5 py-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        <span>Importation en cours...</span>
                        <span>{importProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-850 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all duration-305"
                          style={{ width: `${importProgress}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-zinc-450 italic mt-1 font-medium">{importStepMsg}</span>
                    </div>
                  ) : (
                    <form onSubmit={handleImportSlidesSubmit} className="flex flex-col gap-3">
                      <input
                        type="url"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        required
                        placeholder="https://docs.google.com/presentation/d/..."
                        className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-55 dark:bg-zinc-950/40 text-[10px] focus:outline-none focus:border-blue-600 transition-all w-full text-zinc-900 dark:text-zinc-150"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowImportView(false);
                            setActiveSlideIdx(0);
                          }}
                          className="px-3 py-1.5 border border-zinc-205 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-[9px] font-bold text-zinc-500 rounded-lg transition-all cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-[9px] font-bold text-white rounded-lg transition-all cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.20)]"
                        >
                          Lancer l'importation
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : activeSlide ? (
                <>
                  {/* Title of active slide */}
                  <div className="border-b border-zinc-100 dark:border-zinc-850 pb-2 flex justify-between items-center shrink-0 z-10">
                    <EditableText
                      text={activeSlide.title}
                      onChange={(val) => {
                        const newSlides = [...slides];
                        newSlides[activeSlideIdx].title = val;
                        setSlides(newSlides);
                      }}
                      className="text-base font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-tight"
                    />
                    <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded border border-blue-600/20 bg-blue-600/10 text-blue-600 dark:text-blue-400 tracking-wider">
                      {activeSlide.type}
                    </span>
                  </div>

                  {/* Body Slide Contents by Type */}
                  <div className="flex-1 flex flex-col justify-center my-4 overflow-y-auto z-10">
                    
                    {/* TYPE 1: Welcome/Title slide */}
                    {activeSlide.type === 'welcome' && (
                      <div className="flex flex-col items-center justify-center text-center gap-2">
                        <Logo size={44} showBg={true} className="mb-1" />
                        <EditableText
                          text={activeSlide.content.subtitle || ''}
                          onChange={(val) => {
                            const newSlides = [...slides];
                            newSlides[activeSlideIdx].content.subtitle = val;
                            setSlides(newSlides);
                          }}
                          className="text-xs text-zinc-650 dark:text-zinc-300 font-bold max-w-md"
                        />
                        <EditableText
                          text={activeSlide.content.description || ''}
                          onChange={(val) => {
                            const newSlides = [...slides];
                            newSlides[activeSlideIdx].content.description = val;
                            setSlides(newSlides);
                          }}
                          className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium"
                        />
                      </div>
                    )}

                    {/* TYPE 2: Diagnostic Comparison list */}
                    {activeSlide.type === 'diagnostic' && (
                      <div className="grid grid-cols-2 gap-6 h-full items-center">
                        {/* Situation Actuelle (Left) */}
                        <div className="flex flex-col gap-2 p-3 bg-red-500/[0.01] border border-red-500/10 rounded-xl">
                          <span className="text-[8px] font-black uppercase text-red-500 border-b border-red-500/10 pb-1 flex items-center gap-1.5">
                            <Icons.AlertCircle size={10} className="text-red-500" /> Situation Actuelle (Avant)
                          </span>
                          <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto">
                            {(activeSlide.content.items || []).map((item, idx) => (
                              <div key={idx} className="flex items-start gap-1.5 text-[10px] text-zinc-500">
                                <Icons.AlertCircle className="text-red-500 shrink-0 mt-0.5" size={12} />
                                <EditableText
                                  text={item}
                                  onChange={(val) => {
                                    const newSlides = [...slides];
                                    const items = [...(newSlides[activeSlideIdx].content.items || [])];
                                    items[idx] = val;
                                    newSlides[activeSlideIdx].content.items = items;
                                    setSlides(newSlides);
                                  }}
                                  className="flex-1 leading-normal"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Cible MSP (Right) */}
                        <div className="flex flex-col gap-2 p-3 bg-blue-600/[0.02] border border-blue-600/10 rounded-xl">
                          <span className="text-[8px] font-black uppercase text-blue-600 dark:text-blue-400 border-b border-blue-600/10 pb-1 flex items-center gap-1.5">
                            <Icons.Check size={10} className="text-blue-600 dark:text-blue-400" /> Cible MSP (Après)
                          </span>
                          <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto">
                            {(activeSlide.content.targetItems || []).map((item, idx) => (
                              <div key={idx} className="flex items-start gap-1.5 text-[10px] text-zinc-800 dark:text-zinc-200">
                                <Icons.Check className="text-emerald-500 shrink-0 mt-0.5" size={12} />
                                <EditableText
                                  text={item}
                                  onChange={(val) => {
                                    const newSlides = [...slides];
                                    const items = [...(newSlides[activeSlideIdx].content.targetItems || [])];
                                    items[idx] = val;
                                    newSlides[activeSlideIdx].content.targetItems = items;
                                    setSlides(newSlides);
                                  }}
                                  className="flex-1 font-semibold leading-normal"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TYPE 3: Charts/Progress meters */}
                    {activeSlide.type === 'chart' && (
                      <div className="flex flex-col gap-3 justify-center">
                        {(activeSlide.content.metrics || []).map((m, idx) => (
                          <div key={idx} className="flex flex-col gap-1">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{m.label}</span>
                              <div className="flex gap-2 text-[9px] font-black">
                                <span className="text-zinc-500">Avant: {m.before}%</span>
                                <span className="text-blue-600 dark:text-blue-400">Après: {m.after}%</span>
                              </div>
                            </div>
                            {/* SVG comparison bar */}
                            <div className="relative h-4.5 bg-zinc-100 dark:bg-zinc-950 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 flex items-center px-1">
                              <div 
                                className="absolute left-0 top-0 bottom-0 bg-zinc-300/40 dark:bg-zinc-800/60 border-r border-zinc-400 dark:border-zinc-700 transition-all duration-700"
                                style={{ width: `${m.before}%` }}
                              />
                              <div 
                                className="absolute left-0 top-0.5 bottom-0.5 bg-blue-600 rounded opacity-90 transition-all duration-700"
                                style={{ width: `${m.after}%` }}
                              />
                              <span className="relative z-10 text-[8px] font-black text-white pl-1 bg-black/10 rounded px-1">
                                +{m.after - m.before}% gain estimé
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* TYPE 4: Recomended Services list */}
                    {activeSlide.type === 'services' && (
                      <div className="grid grid-cols-2 gap-3 max-h-[145px] overflow-y-auto">
                        {(activeSlide.content.services || []).map((svc, idx) => (
                          <div 
                            key={idx} 
                            className="p-3 bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-850 rounded-xl flex flex-col gap-1"
                          >
                            <div className="flex justify-between items-center">
                              <EditableText
                                text={svc.name}
                                onChange={(val) => {
                                  const newSlides = [...slides];
                                  const services = [...(newSlides[activeSlideIdx].content.services || [])];
                                  services[idx].name = val;
                                  newSlides[activeSlideIdx].content.services = services;
                                  setSlides(newSlides);
                                }}
                                className="text-[10px] font-bold text-zinc-900 dark:text-zinc-50"
                              />
                              <span className={`text-[7px] font-black px-1 rounded uppercase ${
                                svc.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-600/20'
                              }`}>
                                {svc.priority}
                              </span>
                            </div>
                            <EditableText
                              text={svc.reasoning}
                              onChange={(val) => {
                                const newSlides = [...slides];
                                const services = [...(newSlides[activeSlideIdx].content.services || [])];
                                services[idx].reasoning = val;
                                newSlides[activeSlideIdx].content.services = services;
                                setSlides(newSlides);
                              }}
                              className="text-[9px] text-zinc-500 dark:text-zinc-400 leading-normal"
                              isTextArea={true}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* TYPE 5: Roadmap Phase timeline */}
                    {activeSlide.type === 'roadmap' && (
                      <div className="flex flex-col gap-2 max-h-[145px] overflow-y-auto">
                        {(activeSlide.content.roadmap || []).map((step, idx) => (
                          <div key={idx} className="flex gap-2.5 items-start p-2 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-900">
                            <span className="w-4.5 h-4.5 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-blue-600/20">
                              {idx + 1}
                            </span>
                            <EditableText
                              text={step}
                              onChange={(val) => {
                                const newSlides = [...slides];
                                const roadmap = [...(newSlides[activeSlideIdx].content.roadmap || [])];
                                roadmap[idx] = val;
                                newSlides[activeSlideIdx].content.roadmap = roadmap;
                                setSlides(newSlides);
                              }}
                              className="text-[10px] text-zinc-650 dark:text-zinc-350 leading-relaxed flex-1"
                              isTextArea={true}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* TYPE 6: Custom Layout */}
                    {activeSlide.type === 'custom' && (
                      <div className="flex flex-col justify-center h-full">
                        <EditableText
                          text={activeSlide.content.customText || ''}
                          onChange={(val) => {
                            const newSlides = [...slides];
                            newSlides[activeSlideIdx].content.customText = val;
                            setSlides(newSlides);
                          }}
                          className="text-[11px] text-zinc-650 dark:text-zinc-300 leading-relaxed font-medium"
                          isTextArea={true}
                        />
                      </div>
                    )}

                  </div>

                  {/* Logo footer */}
                  <div className="border-t border-zinc-100 dark:border-zinc-850 pt-2 flex justify-between items-center text-[8px] text-zinc-400 dark:text-zinc-500 shrink-0 z-10">
                    <span className="font-bold">Copilote Onbora</span>
                    <span>Confidence level: 98%</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-zinc-400">
                  Veuillez ajouter ou sélectionner une diapositive.
                </div>
              )}
            </div>

          </div>

          {/* Presenter Speaker Notes Area (Bottom) */}
          <div className="mt-3 shrink-0 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
              <Icons.FileText size={12} className="text-zinc-500" /> Notes du Présentateur
            </span>
            <textarea
              value={activeSlide?.notes || ''}
              onChange={(e) => {
                if (showImportView) return;
                const newSlides = [...slides];
                newSlides[activeSlideIdx].notes = e.target.value;
                setSlides(newSlides);
              }}
              disabled={showImportView}
              rows={2}
              className="w-full p-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl outline-none focus:border-blue-600 text-zinc-800 dark:text-zinc-300 transition-all font-medium disabled:opacity-55"
              placeholder="Cliquez pour ajouter des notes sur le pitch client..."
            />
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. PRESENTATION MODE FULLSCREEN DIALOG (Absolute overlay) */}
      {/* ========================================================================= */}
      {isFullscreen && activeSlide && (
        <div 
          onClick={handleNextSlide} // click to advance
          className="fixed inset-0 z-55 bg-black flex flex-col items-center justify-center cursor-pointer select-none"
        >
          {/* Main big 16:9 canvas centered */}
          <div 
            onClick={(e) => e.stopPropagation()} // prevent double advance
            className="w-full aspect-video max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col justify-between p-12 relative overflow-hidden text-left"
          >
            {/* Glowing background effect */}
            <div className="absolute inset-0 bg-radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.04) 0%, transparent 80%) pointer-events-none" />

            {/* Slide title */}
            <div className="border-b border-zinc-800 pb-3 flex justify-between items-center shrink-0">
              <span className="text-xl font-black text-zinc-50 tracking-tight uppercase">{activeSlide.title}</span>
              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border border-blue-600/20 bg-blue-600/10 text-blue-600 dark:text-blue-400 tracking-wider">
                {activeSlide.type}
              </span>
            </div>

            {/* Slide Body */}
            <div className="flex-1 flex flex-col justify-center my-6 overflow-y-auto">
              
              {/* Welcome layout */}
              {activeSlide.type === 'welcome' && (
                <div className="flex flex-col items-center justify-center text-center gap-3">
                  <Logo size={60} showBg={true} className="mb-2" />
                  <p className="text-sm text-zinc-300 font-bold max-w-lg">{activeSlide.content.subtitle}</p>
                  <p className="text-[11px] text-zinc-500 font-medium">{activeSlide.content.description}</p>
                </div>
              )}

              {/* Diagnostic layout */}
              {activeSlide.type === 'diagnostic' && (
                <div className="grid grid-cols-2 gap-8 h-full items-center">
                  <div className="flex flex-col gap-3 p-4 bg-red-500/[0.02] border border-red-500/10 rounded-xl">
                    <span className="text-[9px] font-black uppercase text-red-500 border-b border-red-500/10 pb-1.5 flex items-center gap-1.5">
                      <Icons.AlertCircle size={10} className="text-red-500" /> Situation Actuelle (Avant)
                    </span>
                    <ul className="flex flex-col gap-2">
                      {(activeSlide.content.items || []).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-zinc-405 leading-normal">
                          <Icons.AlertCircle className="text-red-500 shrink-0 mt-0.5" size={12} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col gap-3 p-4 bg-blue-600/[0.02] border border-blue-600/10 rounded-xl">
                    <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 border-b border-blue-600/10 pb-1.5 flex items-center gap-1.5">
                      <Icons.Check size={10} className="text-blue-600 dark:text-blue-400" /> Cible MSP (Après)
                    </span>
                    <ul className="flex flex-col gap-2">
                      {(activeSlide.content.targetItems || []).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-zinc-100 font-bold leading-normal">
                          <Icons.Check className="text-emerald-500 shrink-0 mt-0.5" size={12} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Chart layout */}
              {activeSlide.type === 'chart' && (
                <div className="flex flex-col gap-4">
                  {(activeSlide.content.metrics || []).map((m, idx) => (
                    <div key={idx} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-zinc-300">{m.label}</span>
                        <div className="flex gap-2 text-[10px] font-black">
                          <span className="text-zinc-500">Avant: {m.before}%</span>
                          <span className="text-blue-600 dark:text-blue-400">Après: {m.after}%</span>
                        </div>
                      </div>
                      <div className="relative h-6 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800 flex items-center px-1">
                        <div className="absolute left-0 top-0 bottom-0 bg-zinc-800/60 border-r border-zinc-700 w-1/5" style={{ width: `${m.before}%` }} />
                        <div className="absolute left-0 top-0.5 bottom-0.5 bg-blue-600 rounded opacity-90 w-4/5" style={{ width: `${m.after}%` }} />
                        <span className="relative z-10 text-[9px] font-black text-white pl-2">
                          +{m.after - m.before}% gain de performance
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Services layout */}
              {activeSlide.type === 'services' && (
                <div className="grid grid-cols-2 gap-4">
                  {(activeSlide.content.services || []).map((svc, idx) => (
                    <div key={idx} className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-xl flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-100">{svc.name}</span>
                        <span className={`text-[8px] font-black px-1.5 rounded uppercase ${
                          svc.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-600/20'
                        }`}>
                          {svc.priority}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-normal">{svc.reasoning}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Roadmap layout */}
              {activeSlide.type === 'roadmap' && (
                <div className="flex flex-col gap-3">
                  {(activeSlide.content.roadmap || []).map((step, idx) => (
                    <div key={idx} className="flex gap-3 items-start p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-blue-600/20">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed flex-1">{step}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Custom layout */}
              {activeSlide.type === 'custom' && (
                <p className="text-sm text-zinc-300 leading-relaxed font-medium px-4 text-center">{activeSlide.content.customText}</p>
              )}

            </div>

            {/* Footer */}
            <div className="border-t border-zinc-800 pt-3 flex justify-between items-center text-[9px] text-zinc-500 shrink-0">
              <span className="font-bold">Onbora Diagnostic d'Architecture Cible</span>
              <span>Diapositive {activeSlideIdx + 1} / {slides.length}</span>
            </div>
          </div>

          {/* Fullscreen Floating Controls Bar (Bottom Left) */}
          <div 
            onClick={(e) => e.stopPropagation()} // prevent advancing
            className="absolute bottom-6 left-6 z-60 bg-zinc-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-zinc-800 flex items-center gap-4 text-white text-xs select-none shadow-2xl"
          >
            {/* Play/Pause Auto-Advance */}
            <button 
              onClick={togglePlayMode}
              className="p-1 text-zinc-350 hover:text-white transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
              title={isPlayMode ? "Pause" : "Lecture automatique (3.5s)"}
            >
              {isPlayMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="4" height="16" x="6" y="4" rx="1"/><rect width="4" height="16" x="14" y="4" rx="1"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-600">
                  <polygon points="6 3 20 12 6 21 6 3"/>
                </svg>
              )}
            </button>
            <span className="w-px h-4 bg-zinc-800" />
            
            {/* Prev/Next arrows */}
            <button 
              onClick={handlePrevSlide}
              className="p-1 text-zinc-355 hover:text-white transition-all cursor-pointer border-none bg-transparent"
            >
              Précédent
            </button>
            <span className="font-semibold">{activeSlideIdx + 1} / {slides.length}</span>
            <button 
              onClick={handleNextSlide}
              className="p-1 text-zinc-355 hover:text-white transition-all cursor-pointer border-none bg-transparent"
            >
              Suivant
            </button>
            <span className="w-px h-4 bg-zinc-800" />
            
            {/* Close Button */}
            <button 
              onClick={exitFullscreen}
              className="px-2.5 py-1 bg-red-650 hover:bg-red-700 text-[10px] font-black rounded-lg transition-all cursor-pointer border-none"
            >
              Quitter la lecture (Esc)
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
