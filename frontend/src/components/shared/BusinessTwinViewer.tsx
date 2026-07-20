"use client";

import React, { useState } from 'react';

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

interface BusinessTwinViewerProps {
  twin: Twin;
  companyName?: string;
}

export default function BusinessTwinViewer({ twin, companyName = "votre entreprise" }: BusinessTwinViewerProps) {
  const [activeTab, setActiveTab] = useState<'impact' | 'roadmap' | 'services'>('impact');
  const [selectedStep, setSelectedStep] = useState<number>(0);

  const services = twin.recommended_services || [];
  const hasNetwork = services.some(s => s.name.toLowerCase().includes('fibre') || s.name.toLowerCase().includes('sd-wan') || s.name.toLowerCase().includes('connectivité'));
  const hasSecurity = services.some(s => s.name.toLowerCase().includes('firewall') || s.name.toLowerCase().includes('edr') || s.name.toLowerCase().includes('sécurité'));
  const hasCollab = services.some(s => s.name.toLowerCase().includes('365') || s.name.toLowerCase().includes('teams') || s.name.toLowerCase().includes('téléphonie'));

  const metrics = [
    {
      key: 'network',
      label: 'Débits & Réseau',
      before: 20,
      after: hasNetwork ? 95 : 45,
      color: 'text-orange-500',
      strokeColor: 'stroke-orange-500',
      bgColor: 'bg-orange-500/10',
      description: hasNetwork ? 'Transition Fibre Optique Pro dédiée avec GTR' : 'Amélioration standard du réseau local'
    },
    {
      key: 'security',
      label: 'Niveau de Sécurité',
      before: 15,
      after: hasSecurity ? 98 : 40,
      color: 'text-red-500',
      strokeColor: 'stroke-red-500',
      bgColor: 'bg-red-500/10',
      description: hasSecurity ? 'Pare-feu managé centralisé & protection EDR' : 'Mises à jour de sécurité basiques'
    },
    {
      key: 'collab',
      label: 'Collaboration & Teams',
      before: 35,
      after: hasCollab ? 90 : 55,
      color: 'text-orange-500',
      strokeColor: 'stroke-orange-500',
      bgColor: 'bg-orange-500/10',
      description: hasCollab ? 'Suite Microsoft 365 cloud & Téléphonie IP intégrée' : 'Outils collaboratifs standards'
    }
  ];

  // Circular progress settings
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = (percent: number) => circumference - (percent / 100) * circumference;

  // Helper to generate realistic checklist for timeline step click
  const getStepDetails = (stepText: string) => {
    const text = stepText.toLowerCase();
    if (text.includes('audit') || text.includes('préparation')) {
      return {
        title: "Audit & Études d'Éligibilité",
        duration: "Semaine 1",
        tasks: [
          "Mesures des débits réels (ADSL vs Fibre)",
          "Audit de la sécurité des postes de travail et serveurs",
          "Cartographie des solutions collaboratives existantes",
          "Validation finale de l'éligibilité technique de la Fibre Optique"
        ]
      };
    } else if (text.includes('fibre') || text.includes('raccordement') || text.includes('réseau')) {
      return {
        title: "Raccordement Réseau Fibre Pro",
        duration: "Semaine 2 - 3",
        tasks: [
          "Tirage de la fibre dédiée depuis le point de mutualisation",
          "Pose et test du boîtier de terminaison optique (PTO) sur site",
          "Livraison et configuration du routeur principal sécurisé",
          "Vérification de la bande passante symétrique"
        ]
      };
    } else if (text.includes('cloud') || text.includes('migration') || text.includes('hébergement')) {
      return {
        title: "Migration Cloud & Hébergement",
        duration: "Semaine 4",
        tasks: [
          "Sauvegarde complète de sécurité des serveurs locaux",
          "Création de la structure cloud sécurisée (HDS ou M365)",
          "Transfert des données et fichiers métiers vers le nouveau cloud",
          "Test d'accès aux fichiers partagés avec les nouveaux droits"
        ]
      };
    } else if (text.includes('déploiement') || text.includes('logiciel') || text.includes('téléphonie') || text.includes('collaboration')) {
      return {
        title: "Configuration Logicielle & Collaboration",
        duration: "Semaine 5",
        tasks: [
          "Déploiement des agents de sécurité EDR sur les ordinateurs",
          "Création et affectation des comptes Microsoft 365",
          "Migration des numéros de téléphone et configuration Teams VoIP",
          "Formation des utilisateurs finaux aux bonnes pratiques"
        ]
      };
    }
    return {
      title: "Mise en service & Transfert",
      duration: "Semaine 6",
      tasks: [
        "Session de validation finale avec vos équipes",
        "Remise du document technique d'architecture",
        "Activation officielle du support client Onbora (GTR)",
        "Clôture du projet de transition numérique"
      ]
    };
  };

  const steps = twin.roadmap || ["Étape 1: Audit initial", "Étape 2: Installation réseau", "Étape 3: Déploiement cloud"];
  const currentStepDetails = getStepDetails(steps[selectedStep] || '');

  return (
    <div className="glass-card rounded-2xl p-6 shadow-sm flex flex-col gap-6 w-full animate-fade-in">
      
      {/* Sub-Header & Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-900 pb-4 shrink-0">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Business Twin Interactif</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Étudiez la transformation numérique planifiée pour {companyName}.</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-850 shrink-0">
          <button
            onClick={() => setActiveTab('impact')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'impact'
                ? 'bg-white dark:bg-zinc-900 text-orange-500 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            📊 Impacts & Comparatif
          </button>
          <button
            onClick={() => setActiveTab('roadmap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'roadmap'
                ? 'bg-white dark:bg-zinc-900 text-orange-500 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            🗓️ Chronologie Déploiement
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'services'
                ? 'bg-white dark:bg-zinc-900 text-orange-500 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            💼 Services Recommandés
          </button>
        </div>
      </div>

      {/* Tab 1: Impact Comparative */}
      {activeTab === 'impact' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          
          {/* Metrics Gauges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.map((m) => (
              <div key={m.key} className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-950/10 flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide">{m.label}</span>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">{m.description}</span>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] font-semibold text-zinc-500">
                    <span className="line-through text-red-500/80">{m.before}%</span>
                    <span>→</span>
                    <span className="text-orange-500 font-extrabold">{m.after}%</span>
                  </div>
                </div>
                
                {/* SVG Progress Circle */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <svg className="w-14 h-14 transform -rotate-90">
                    <circle cx="28" cy="28" r="24" className="stroke-zinc-150 dark:stroke-zinc-800" strokeWidth="4.5" fill="transparent" />
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      className={`${m.strokeColor} transition-all duration-1000 ease-out`}
                      strokeWidth="4.5"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset(m.after)}
                    />
                  </svg>
                  <span className="absolute text-[10px] font-black text-zinc-700 dark:text-zinc-300">{m.after}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Side-by-Side Avant/Après */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            
            {/* Avant (Red) */}
            <div className="p-5 rounded-2xl border border-red-500/10 bg-red-500/[0.02] flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-red-500/10 pb-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-black uppercase text-red-500 tracking-wider">État Initial (Avant)</span>
              </div>
              <ul className="flex flex-col gap-2.5">
                {(twin.current_state || []).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="text-red-500 shrink-0 font-bold mt-0.5">⚠️</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Après (Orange) */}
            <div className="p-5 rounded-2xl border border-orange-500/10 bg-orange-500/[0.01] flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-orange-500/10 pb-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-xs font-black uppercase text-orange-500 tracking-wider">État Cible (Après)</span>
              </div>
              <ul className="flex flex-col gap-2.5">
                {(twin.proposed_state || []).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                    <span className="text-orange-500 shrink-0 font-black mt-0.5">✓</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      )}

      {/* Tab 2: Chronological Deployment (Roadmap / Gantt style) */}
      {activeTab === 'roadmap' && (
        <div className="flex flex-col md:flex-row gap-6 animate-fade-in">
          
          {/* Steps Timeline Line (Left) */}
          <div className="flex flex-row md:flex-col justify-between md:justify-start gap-4 md:w-[220px] border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800/80 pb-4 md:pb-0 md:pr-4 shrink-0 overflow-x-auto">
            {steps.map((step, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedStep(idx)}
                className={`flex items-center gap-2.5 p-2 rounded-lg text-left transition-all cursor-pointer shrink-0 ${
                  selectedStep === idx
                    ? 'bg-orange-500/5 text-orange-500 font-bold border-l-2 border-orange-500'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 border-l-2 border-transparent'
                }`}
              >
                <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border shrink-0 ${
                  selectedStep === idx
                    ? 'orange-gradient-bg text-white border-orange-500'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-750 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                }`}>
                  {idx + 1}
                </span>
                <span className="text-xs truncate max-w-[150px]">{step.split(':')[1]?.trim() || step}</span>
              </button>
            ))}
          </div>

          {/* Step Detail Card (Right) */}
          <div className="flex-1 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-800/60 pb-2.5">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Phase {selectedStep + 1}</span>
                <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-50">{currentStepDetails.title}</h4>
              </div>
              <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 text-[10px] font-bold">
                {currentStepDetails.duration}
              </span>
            </div>

            {/* Tasks checklist */}
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Tâches opérationnelles</span>
              <div className="flex flex-col gap-2 mt-1">
                {currentStepDetails.tasks.map((task, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <input
                      type="checkbox"
                      defaultChecked={idx === 0}
                      disabled
                      className="rounded border-zinc-300 dark:border-zinc-700 text-orange-500 focus:ring-orange-500 w-3.5 h-3.5 pointer-events-none"
                    />
                    <span>{task}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Detailed Services cards */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
          {services.map((svc, idx) => (
            <div
              key={idx}
              className="p-4 bg-zinc-50/50 dark:bg-zinc-950/15 border border-zinc-150 dark:border-zinc-800 rounded-xl flex flex-col gap-2 hover:shadow-sm hover:border-zinc-250 dark:hover:border-zinc-750 transition-all"
            >
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs font-black text-zinc-900 dark:text-zinc-50">{svc.name}</span>
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                  svc.priority.toLowerCase() === 'high'
                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                    : 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                }`}>
                  {svc.priority}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">{svc.reasoning}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
