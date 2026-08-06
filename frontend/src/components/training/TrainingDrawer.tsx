"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Icons } from '../shared/Icons';
import { 
  TRAINING_MODULES, 
  MOCK_ADOPTION_STATS, 
  TrainingModule, 
  Step, 
  AdoptionStat 
} from './trainingData';
import StepPlayer from './StepPlayer';
import QuizComponent from './QuizComponent';
import EscalationModal from './EscalationModal';

interface TrainingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialModuleId?: string | null;
  onAskCopilot?: (stepTitle: string, moduleTitle: string) => void;
}

export default function TrainingDrawer({ isOpen, onClose, initialModuleId = null, onAskCopilot }: TrainingDrawerProps) {
  const { user } = useAuth();
  
  // States
  const [selectedPersona, setSelectedPersona] = useState<'EMPLOYEE' | 'MANAGER'>('EMPLOYEE');
  const [activeModule, setActiveModule] = useState<TrainingModule | null>(null);
  const [viewState, setViewState] = useState<'CATALOG' | 'STEPS' | 'QUIZ' | 'STATS'>('CATALOG');
  const [currentProgress, setCurrentProgress] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'security' | 'phone' | 'collab' | 'vpn'>('all');
  const [escalationStepTitle, setEscalationStepTitle] = useState<string | null>(null);
  const [isEscalationOpen, setIsEscalationOpen] = useState(false);
  const [completedModules, setCompletedModules] = useState<Record<string, boolean>>({});

  // Sync state with connected user's default role
  useEffect(() => {
    if (user?.role === 'KAM' || user?.role === 'ADMIN') {
      setSelectedPersona('MANAGER');
      setViewState('STATS');
    } else {
      setSelectedPersona('EMPLOYEE');
      setViewState('CATALOG');
    }
  }, [user]);

  // Open initial module if passed
  useEffect(() => {
    if (initialModuleId && isOpen) {
      const module = TRAINING_MODULES.find(m => m.id === initialModuleId);
      if (module) {
        handleStartModule(module);
      }
    }
  }, [initialModuleId, isOpen]);

  if (!isOpen) return null;

  const handleStartModule = (module: TrainingModule) => {
    setActiveModule(module);
    setViewState('STEPS');
    setCurrentProgress(0);
  };

  const handleQuizStart = () => {
    setViewState('QUIZ');
  };

  const handleModuleFinished = () => {
    if (activeModule) {
      setCompletedModules(prev => ({ ...prev, [activeModule.id]: true }));
      alert(`[Félicitations] Vous avez complété et validé le module : "${activeModule.title}" !`);
    }
    setActiveModule(null);
    setViewState(selectedPersona === 'MANAGER' ? 'STATS' : 'CATALOG');
  };

  const handleEscalationTrigger = (stepTitle: string) => {
    setEscalationStepTitle(stepTitle);
    setIsEscalationOpen(true);
  };

  // Filter modules based on category and persona
  const filteredModules = TRAINING_MODULES.filter(m => {
    const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
    const matchesPersona = selectedPersona === 'MANAGER' 
      ? true // Managers can view all modules
      : m.persona === 'employee' || m.persona === 'all';
    return matchesCategory && matchesPersona;
  });

  return (
    <>
      <div className="fixed inset-0 z-40 overflow-hidden flex justify-end">
        {/* Backdrop overlay */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
          onClick={onClose}
        />

        {/* Sliding Panel */}
        <div className="relative w-full max-w-md bg-white/95 dark:bg-zinc-950/90 backdrop-blur-md h-full shadow-2xl flex flex-col z-10 animate-fade-in border-l border-zinc-200 dark:border-zinc-900">
          
          {/* Header */}
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-900 flex items-center justify-between bg-zinc-50/40 dark:bg-zinc-950/40 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center font-black text-xs shadow-sm shadow-orange-500/20">
                <Icons.BookOpen size={14} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Copilote Formation Onbora</h3>
                <p className="text-[10px] text-zinc-500 font-semibold">Just-in-Time Learning</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="text-xs text-zinc-550 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-semibold cursor-pointer border-none bg-transparent"
            >
              Fermer ✕
            </button>
          </div>

          {/* Persona & Navigation Tab Selectors (Only shown when not inside a module training step) */}
          {viewState !== 'STEPS' && viewState !== 'QUIZ' && (
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-900 bg-zinc-50/20 dark:bg-zinc-950/20 flex flex-col gap-3 shrink-0">
              {/* Persona switcher */}
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50">
                <button
                  onClick={() => {
                    setSelectedPersona('EMPLOYEE');
                    setViewState('CATALOG');
                  }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedPersona === 'EMPLOYEE'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-350'
                  }`}
                >
                  <Icons.Users size={12} />
                  Vue Employé
                </button>
                <button
                  onClick={() => {
                    setSelectedPersona('MANAGER');
                    setViewState('STATS');
                  }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedPersona === 'MANAGER'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-350'
                  }`}
                >
                  <Icons.BarChart size={12} />
                  Vue Manager / IT
                </button>
              </div>

              {/* Sub tabs for Manager persona */}
              {selectedPersona === 'MANAGER' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewState('STATS')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer border-none ${
                      viewState === 'STATS'
                        ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    Suivi d'Adoption
                  </button>
                  <button
                    onClick={() => setViewState('CATALOG')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer border-none ${
                      viewState === 'CATALOG'
                        ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    Catalogue
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Dynamic Content area */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* 1. CATALOGUE VIEW */}
            {viewState === 'CATALOG' && (
              <div className="flex flex-col gap-4">
                {/* Category filters */}
                <div className="flex flex-wrap gap-1.5">
                  {(['all', 'security', 'phone', 'collab', 'vpn'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer capitalize transition-all ${
                        categoryFilter === cat
                          ? 'bg-orange-500 border-orange-500 text-white shadow-sm shadow-orange-500/15'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/20'
                      }`}
                    >
                      {cat === 'all' ? 'Tous' : cat === 'collab' ? 'Outils Collaboratifs' : cat === 'phone' ? 'Téléphonie IP' : cat === 'security' ? 'MFA / Sécurité' : cat}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-3">
                  {filteredModules.map(module => {
                    const isCompleted = completedModules[module.id];
                    return (
                      <div
                        key={module.id}
                        className="p-4 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-900 hover:border-zinc-350 dark:hover:border-zinc-850 transition-all flex flex-col gap-3 group"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-extrabold uppercase text-orange-500 tracking-wider">
                              {module.category === 'collab' ? 'Collab' : module.category === 'phone' ? 'Téléphonie' : module.category} • {module.duration}
                            </span>
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 leading-snug">
                              {module.title}
                            </h4>
                          </div>
                          {isCompleted && (
                            <span className="text-green-500 bg-green-500/10 border border-green-500/20 p-1 rounded-full">
                              <Icons.Check size={10} />
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                          {module.description}
                        </p>

                        <div className="flex items-center justify-between mt-1 pt-3 border-t border-zinc-100 dark:border-zinc-900/50">
                          <span className="text-[10px] text-zinc-450 font-bold">
                            {module.steps.length} étapes
                          </span>
                          
                          <button
                            onClick={() => handleStartModule(module)}
                            className="py-1.5 px-3 rounded-lg bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-[10px] font-black text-white dark:text-zinc-950 transition-all border-none cursor-pointer flex items-center gap-1 group-hover:translate-x-0.5 duration-200"
                          >
                            Lancer la formation
                            <Icons.ChevronRight size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. STEP BY STEP MODULE LEARNING */}
            {viewState === 'STEPS' && activeModule && (
              <StepPlayer
                steps={activeModule.steps}
                onComplete={handleQuizStart}
                onBlockEscalated={handleEscalationTrigger}
                onAskCopilot={onAskCopilot ? (stepTitle) => onAskCopilot(stepTitle, activeModule.title) : undefined}
              />
            )}

            {/* 3. FINAL MODULE QUIZ */}
            {viewState === 'QUIZ' && activeModule && (
              <QuizComponent
                quiz={activeModule.quiz}
                onSuccess={handleModuleFinished}
                onCancel={() => {
                  setActiveModule(null);
                  setViewState(selectedPersona === 'MANAGER' ? 'STATS' : 'CATALOG');
                }}
              />
            )}

            {/* 4. MANAGER ADOPTION STATISTICS VIEW */}
            {viewState === 'STATS' && selectedPersona === 'MANAGER' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-0.5">
                  <h4 className="text-xs uppercase font-extrabold text-orange-500 tracking-wider">
                    Tableau de bord d'Adoption
                  </h4>
                  <p className="text-[11px] text-zinc-450 font-medium">
                    Suivez la progression des formations et le taux d'adoption de votre équipe.
                  </p>
                </div>

                {/* Team metrics overview card */}
                <div className="grid grid-cols-2 gap-2.5 bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-900">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-500">Taux d'adoption global</span>
                    <span className="text-xl font-black text-zinc-850 dark:text-zinc-100 mt-1">79%</span>
                    <span className="text-[9px] text-green-500 font-semibold flex items-center gap-0.5 mt-0.5">
                      +4% ce mois
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-500">Formations validées</span>
                    <span className="text-xl font-black text-zinc-850 dark:text-zinc-100 mt-1">14 / 18</span>
                    <span className="text-[9px] text-zinc-400 font-medium mt-0.5">
                      6 collaborateurs actifs
                    </span>
                  </div>
                </div>

                {/* Adoption table listing */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">
                    Progression par Collaborateur
                  </span>

                  <div className="flex flex-col gap-2">
                    {MOCK_ADOPTION_STATS.map((stat, i) => (
                      <div
                        key={i}
                        className="p-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl flex items-center justify-between gap-3 text-[11px]"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-zinc-900 dark:text-zinc-150">{stat.user}</span>
                          <span className="text-[9px] text-zinc-400 font-medium">{stat.module}</span>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {stat.status === 'completed' && (
                            <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-500 font-bold rounded text-[9px]">
                              Validé
                            </span>
                          )}
                          {stat.status === 'in_progress' && (
                            <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-500 font-bold rounded text-[9px] animate-pulse">
                              {stat.progress}%
                            </span>
                          )}
                          {stat.status === 'not_started' && (
                            <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 text-zinc-400 font-semibold rounded text-[9px]">
                              Non débuté
                            </span>
                          )}
                          <span className="text-[8px] text-zinc-450">{stat.lastActive}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50/40 dark:bg-zinc-950/40 shrink-0 text-center flex items-center justify-between text-[10px] text-zinc-450 font-medium">
            <span>Orange Business Services © 2026</span>
            <span className="flex items-center gap-1">
              <Icons.Shield size={10} className="text-green-500" />
              Secured Connection
            </span>
          </div>

        </div>
      </div>

      {/* Escalation Support MSP Modal */}
      <EscalationModal
        isOpen={isEscalationOpen}
        onClose={() => setIsEscalationOpen(false)}
        blockedStepTitle={escalationStepTitle || ''}
      />
    </>
  );
}
