"use client";

import React, { useState, useEffect } from 'react';
import Logo from './Logo';
import { Icons } from './Icons';

interface Service {
  service_id?: number;
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

interface BusinessTwinSlidesProps {
  twin: Twin;
  companyName?: string;
  isMiniPreview?: boolean;
  onOpenFull?: () => void;
  slides?: Slide[];
  initialSlide?: number;
}

export default function BusinessTwinSlides({
  twin,
  companyName = "votre entreprise",
  isMiniPreview = false,
  onOpenFull,
  slides,
  initialSlide = 0
}: BusinessTwinSlidesProps) {
  const [currentSlide, setCurrentSlide] = useState(initialSlide);

  useEffect(() => {
    setCurrentSlide(initialSlide);
  }, [initialSlide]);

  const totalSlides = slides ? slides.length : 5;

  const services = slides && slides[3] 
    ? (slides[3].content.services || []) 
    : (twin.recommended_services || []);

  const hasNetwork = services.some(s => s.name.toLowerCase().includes('fibre') || s.name.toLowerCase().includes('sd-wan'));
  const hasSecurity = services.some(s => s.name.toLowerCase().includes('firewall') || s.name.toLowerCase().includes('edr'));
  const hasCollab = services.some(s => s.name.toLowerCase().includes('365') || s.name.toLowerCase().includes('teams') || s.name.toLowerCase().includes('téléphonie'));

  const metrics = slides && slides[2] && slides[2].content.metrics
    ? slides[2].content.metrics
    : [
        { label: 'Débit / Réseau', before: 20, after: hasNetwork ? 95 : 45 },
        { label: 'Cybersécurité', before: 15, after: hasSecurity ? 98 : 40 },
        { label: 'Collaboration', before: 35, after: hasCollab ? 90 : 55 }
      ];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide(prev => (prev + 1) % totalSlides);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide(prev => (prev - 1 + totalSlides) % totalSlides);
  };

  if (isMiniPreview) {
    return (
      <div 
        onClick={onOpenFull}
        className="w-full max-w-sm glass-card rounded-xl border border-orange-500/20 p-4 hover:border-orange-500/40 cursor-pointer flex flex-col gap-3 transition-all relative overflow-hidden group shadow-md shadow-black/30"
      >
        <div className="absolute top-0 right-0 p-1 bg-orange-500/10 text-orange-500 rounded-bl-lg text-[9px] font-bold tracking-wider uppercase">
          Diapositive IA
        </div>
        <div className="flex items-center gap-2.5">
          <Logo size={24} showBg={true} />
          <div>
            <h4 className="text-xs font-bold text-zinc-100">Diagnostic d'Architecture Cible</h4>
            <p className="text-[10px] text-zinc-400 font-medium">{companyName}</p>
          </div>
        </div>
        
        {/* Fake Mini Slide View */}
        <div className="h-24 bg-zinc-950/60 rounded-lg border border-zinc-900 flex items-center justify-center p-3 relative overflow-hidden">
          <div className="text-center">
            <Icons.Sparkles className="text-orange-500 w-5 h-5 mx-auto mb-1 animate-pulse" />
            <span className="text-[10px] font-bold text-zinc-300">Présentation PowerPoint disponible</span>
            <p className="text-[9px] text-zinc-500 mt-0.5">5 diapositives d'impact & roadmap</p>
          </div>
        </div>

        <button className="w-full py-1.5 rounded-lg orange-gradient-bg text-[10px] font-bold text-white flex items-center justify-center gap-1.5">
          <Icons.LineChart size={12} />
          Ouvrir le Mode Présentation ➜
        </button>
      </div>
    );
  }

  // Slide Render Switcher
  const renderSlideContent = () => {
    // If slides array is passed and we have it, we use its details
    if (slides && slides[currentSlide]) {
      const slide = slides[currentSlide];
      
      switch (slide.type) {
        case 'welcome':
          return (
            <div className="flex flex-col items-center justify-center text-center h-full gap-4 animate-fade-in p-6">
              <Logo size={60} showBg={true} className="mb-2 shadow-sm shadow-orange-500/20" />
              <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">
                {slide.title || "Transformation MSP"}
              </h2>
              <div className="h-0.5 w-12 orange-gradient-bg" />
              <p className="text-sm text-zinc-650 dark:text-zinc-350 max-w-md font-medium leading-relaxed">
                {slide.content.subtitle || "Diagnostic d'Architecture Cible & Plan de transition technologique pour"}
              </p>
              <span className="px-3.5 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 text-orange-500 text-xs font-bold shadow-sm shadow-orange-500/10 uppercase tracking-wider">
                {companyName}
              </span>
            </div>
          );

        case 'diagnostic':
          return (
            <div className="flex flex-col h-full justify-between animate-fade-in p-5">
              <div>
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">DIAPOSITIVE {currentSlide + 1}</span>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mt-0.5 flex items-center gap-1.5">
                  <Icons.AlertCircle className="text-orange-500" size={14} />
                  {slide.title}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-2.5 my-3 overflow-y-auto max-h-[220px] pr-1">
                {(slide.content.items || []).map((state, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-900">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase">Situation Actuelle</span>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-normal">{state}</p>
                    </div>
                    <div className="flex flex-col gap-1 border-l border-zinc-150 dark:border-zinc-900 pl-3">
                      <span className="text-[9px] font-bold text-orange-500 uppercase">Cible MSP</span>
                      <p className="text-xs text-zinc-800 dark:text-zinc-200 font-semibold leading-normal">
                        {slide.content.targetItems?.[idx] || "Solution d'intégration optimisée"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-zinc-500 font-medium text-center">
                Onbora analyse les anomalies réseau pour projeter le futur état de service.
              </p>
            </div>
          );

        case 'chart':
          return (
            <div className="flex flex-col h-full justify-between animate-fade-in p-5">
              <div>
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">DIAPOSITIVE {currentSlide + 1}</span>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mt-0.5 flex items-center gap-1.5">
                  <Icons.LineChart className="text-orange-500" size={14} />
                  {slide.title}
                </h3>
              </div>

              {/* SVG Comparison Graph */}
              <div className="my-2 p-3 bg-zinc-50/50 dark:bg-zinc-950/30 rounded-xl border border-zinc-150 dark:border-zinc-900 flex flex-col gap-4">
                {(slide.content.metrics || []).map((m, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{m.label}</span>
                      <div className="flex gap-2 text-[10px] font-bold">
                        <span className="text-zinc-500">Avant: {m.before}%</span>
                        <span className="text-orange-500">Après: {m.after}%</span>
                      </div>
                    </div>
                    {/* Custom SVG Bar Graph */}
                    <div className="relative h-6 bg-zinc-100 dark:bg-zinc-950 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-900 flex items-center px-1">
                      {/* Before Bar */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-zinc-300/50 dark:bg-zinc-800/60 border-r border-zinc-400 dark:border-zinc-700 transition-all duration-1000"
                        style={{ width: `${m.before}%` }}
                      />
                      {/* After Bar */}
                      <div 
                        className="absolute left-0 top-1 bottom-1 orange-gradient-bg rounded-md opacity-90 transition-all duration-1000"
                        style={{ width: `${m.after}%` }}
                      />
                      {/* Labels over bar */}
                      <span className="relative z-10 text-[9px] font-black text-white pl-2">
                        +{m.after - m.before}% de performance
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-zinc-500 font-medium text-center">
                Le graphique d'impact montre le gain estimé après migration fibre et cloud.
              </p>
            </div>
          );

        case 'services':
          return (
            <div className="flex flex-col h-full justify-between animate-fade-in p-5">
              <div>
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">DIAPOSITIVE {currentSlide + 1}</span>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mt-0.5 flex items-center gap-1.5">
                  <Icons.Sparkles className="text-orange-500" size={14} />
                  {slide.title}
                </h3>
              </div>

              <div className="my-2 overflow-y-auto max-h-[220px] flex flex-col gap-2 pr-1">
                {(slide.content.services || []).map((s, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-900 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{s.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                        s.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                        s.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                        'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}>
                        {s.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-normal">{s.reasoning}</p>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-zinc-500 font-medium text-center">
                Chaque recommandation répond à une problématique détectée pendant l'audit.
              </p>
            </div>
          );

        case 'roadmap':
          return (
            <div className="flex flex-col h-full justify-between animate-fade-in p-5">
              <div>
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">DIAPOSITIVE {currentSlide + 1}</span>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mt-0.5 flex items-center gap-1.5">
                  <Icons.Activity className="text-orange-500" size={14} />
                  {slide.title}
                </h3>
              </div>

              <div className="my-2 overflow-y-auto max-h-[220px] flex flex-col gap-2 pr-1">
                {(slide.content.roadmap || []).map((step, idx) => (
                  <div key={idx} className="flex gap-3 items-start p-2.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-900">
                    <span className="w-5 h-5 rounded-full orange-gradient-bg text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Étape {idx + 1}</span>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mt-0.5">{step}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-zinc-500 font-medium text-center">
                Planification séquentielle recommandée pour minimiser les interruptions de service.
              </p>
            </div>
          );

        case 'custom':
        default:
          return (
            <div className="flex flex-col h-full justify-between animate-fade-in p-5">
              <div>
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">DIAPOSITIVE {currentSlide + 1}</span>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mt-0.5 flex items-center gap-1.5">
                  <Icons.Sparkles className="text-orange-500" size={14} />
                  {slide.title}
                </h3>
              </div>
              <div className="my-2 flex-1 flex flex-col justify-center overflow-y-auto max-h-[220px]">
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                  {slide.content.customText || slide.content.description || ''}
                </p>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium text-center">
                Diapositive personnalisée modélisée dans l'éditeur.
              </p>
            </div>
          );
      }
    }

    // Fallback switch if no slides prop is passed (maintains old behavior)
    switch (currentSlide) {
      case 0:
        return (
          <div className="flex flex-col items-center justify-center text-center h-full gap-4 animate-fade-in p-6">
            <Logo size={60} showBg={true} className="mb-2 shadow-sm shadow-orange-500/20" />
            <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">
              Transformation MSP
            </h2>
            <div className="h-0.5 w-12 orange-gradient-bg" />
            <p className="text-sm text-zinc-600 dark:text-zinc-300 max-w-xs font-medium">
              Diagnostic d'Architecture Cible & Plan de transition technologique pour
            </p>
            <span className="px-3.5 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 text-orange-500 text-xs font-bold shadow-sm shadow-orange-500/10 uppercase tracking-wider">
              {companyName}
            </span>
          </div>
        );

      case 1:
        return (
          <div className="flex flex-col h-full justify-between animate-fade-in p-5">
            <div>
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">DIAPOSITIVE 2</span>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mt-0.5 flex items-center gap-1.5">
                <Icons.AlertCircle className="text-orange-500" size={14} />
                Diagnostic : Diagnostic de Transition (Avant / Après)
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-2.5 my-3 overflow-y-auto max-h-[220px] pr-1">
              {twin.current_state.map((state, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-900">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Situation Actuelle</span>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-normal">{state}</p>
                  </div>
                  <div className="flex flex-col gap-1 border-l border-zinc-150 dark:border-zinc-900 pl-3">
                    <span className="text-[9px] font-bold text-orange-500 uppercase">Cible MSP</span>
                    <p className="text-xs text-zinc-800 dark:text-zinc-200 font-semibold leading-normal">
                      {twin.proposed_state[idx] || "Solution d'intégration optimisée"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-zinc-500 font-medium text-center">
              Onbora analyse les anomalies réseau pour projeter le futur état de service.
            </p>
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col h-full justify-between animate-fade-in p-5">
            <div>
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">DIAPOSITIVE 3</span>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mt-0.5 flex items-center gap-1.5">
                <Icons.LineChart className="text-orange-500" size={14} />
                Graphique d'Impact de Performance B2B
              </h3>
            </div>

            {/* SVG Comparison Graph */}
            <div className="my-2 p-3 bg-zinc-50/50 dark:bg-zinc-950/30 rounded-xl border border-zinc-150 dark:border-zinc-900 flex flex-col gap-4">
              {metrics.map((m, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{m.label}</span>
                    <div className="flex gap-2 text-[10px] font-bold">
                      <span className="text-zinc-500">Avant: {m.before}%</span>
                      <span className="text-orange-500">Après: {m.after}%</span>
                    </div>
                  </div>
                  {/* Custom SVG Bar Graph */}
                  <div className="relative h-6 bg-zinc-100 dark:bg-zinc-950 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-900 flex items-center px-1">
                    {/* Before Bar */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-zinc-300/50 dark:bg-zinc-800/60 border-r border-zinc-400 dark:border-zinc-700 transition-all duration-1000"
                      style={{ width: `${m.before}%` }}
                    />
                    {/* After Bar */}
                    <div 
                      className="absolute left-0 top-1 bottom-1 orange-gradient-bg rounded-md opacity-90 transition-all duration-1000"
                      style={{ width: `${m.after}%` }}
                    />
                    {/* Labels over bar */}
                    <span className="relative z-10 text-[9px] font-black text-white pl-2">
                      +{m.after - m.before}% de performance
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-zinc-500 font-medium text-center">
              Le graphique d'impact montre le gain estimé après migration fibre et cloud.
            </p>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col h-full justify-between animate-fade-in p-5">
            <div>
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">DIAPOSITIVE 4</span>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mt-0.5 flex items-center gap-1.5">
                <Icons.Sparkles className="text-orange-500" size={14} />
                Solutions & Services Recommandés
              </h3>
            </div>

            <div className="my-2 overflow-y-auto max-h-[220px] flex flex-col gap-2 pr-1">
              {services.map((s, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-900 flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{s.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                      s.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                      s.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                      'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {s.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-normal">{s.reasoning}</p>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-zinc-500 font-medium text-center">
              Chaque recommandation répond à une problématique détectée pendant l'audit.
            </p>
          </div>
        );

      case 4:
        return (
          <div className="flex flex-col h-full justify-between animate-fade-in p-5">
            <div>
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">DIAPOSITIVE 5</span>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mt-0.5 flex items-center gap-1.5">
                <Icons.Activity className="text-orange-500" size={14} />
                Roadmap de Transition & Installation
              </h3>
            </div>

            <div className="my-2 overflow-y-auto max-h-[220px] flex flex-col gap-2 pr-1">
              {twin.roadmap.map((step, idx) => (
                <div key={idx} className="flex gap-3 items-start p-2.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-900">
                  <span className="w-5 h-5 rounded-full orange-gradient-bg text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Étape {idx + 1}</span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mt-0.5">{step}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-zinc-500 font-medium text-center">
              Planification séquentielle recommandée pour minimiser les interruptions de service.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="glass-card rounded-2xl border border-zinc-200 dark:border-zinc-900/60 shadow-lg flex flex-col justify-between w-full h-[400px] overflow-hidden animate-fade-in relative">
      
      {/* Background slide effects */}
      <div className="absolute inset-0 bg-radial-gradient(circle at 50% 50%, rgba(249, 115, 22, 0.025) 0%, transparent 80%) pointer-events-none" />

      {/* Slide body */}
      <div className="flex-1 overflow-hidden relative">
        {renderSlideContent()}
      </div>

      {/* Slide controls footer */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-900/60 bg-zinc-50 dark:bg-zinc-950/20 shrink-0 flex items-center justify-between">
        <button
          onClick={handlePrev}
          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-100 dark:bg-zinc-900/60 text-zinc-650 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer flex items-center justify-center"
        >
          <Icons.ChevronLeft size={16} />
        </button>

        {/* Dots indicators */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); setCurrentSlide(idx); }}
              className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                currentSlide === idx ? 'w-4 orange-gradient-bg' : 'bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600'
              }`}
              aria-label={`Aller à la diapositive ${idx + 1}`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-100 dark:bg-zinc-900/60 text-zinc-650 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer flex items-center justify-center"
        >
          <Icons.ChevronRight size={16} />
        </button>
      </div>

    </div>
  );
}
