"use client";

import React, { useState } from 'react';
import { Icons } from '@/components/shared/Icons';

interface KamIntelligenceProps {
  onOpenSignalDetail: (signal: any) => void;
  onOpenAccountPlan: () => void;
}

export default function KamIntelligenceStacks({
  onOpenSignalDetail,
  onOpenAccountPlan
}: KamIntelligenceProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  const intelligenceItems = [
    {
      id: 'sig-1',
      account: 'Société Générale de Banque (SGB)',
      category: 'EXPANSION BANCAIRE',
      title: 'Projet d\'ouverture de 12 nouvelles agences régionales',
      insight: 'Recrutement d\'un Chef de projet SD-WAN détecté. L\'infrastructure MPLS historique arrive à saturation.',
      opportunity: 'SD-WAN Hybride Souverain & Datacenter Backup',
      potentialMrr: '+24 000 € / mois',
      source: 'Rapport Financier & LinkedIn',
      date: 'Détecté il y a 2h',
      tagColor: 'bg-blue-500/20 text-blue-300'
    },
    {
      id: 'sig-2',
      account: 'Ecobank Côte d\'Ivoire',
      category: 'RISQUE & CONFORMITÉ CYBER',
      title: 'Nomination d\'un nouveau Directeur des Risques UEMOA',
      insight: 'Nouvelle directive bancaire imposant une supervision SOC 24/7 et détection des menaces en moins de 15 min.',
      opportunity: 'SOC Managé Orange Cyberdefense & EDR',
      potentialMrr: '+18 500 € / mois',
      source: 'Circulaire BCEAO & Groupe',
      date: 'Hier',
      tagColor: 'bg-emerald-500/20 text-emerald-300'
    },
    {
      id: 'sig-3',
      account: 'Ministère de la Transition Numérique',
      category: 'APPEL D\'OFFRES NATIONAL',
      title: 'Publication imminente du Cloud Souverain National',
      insight: 'Financement Banque Mondiale de 12M$ pour relier 32 ministères et héberger les données biométriques en local.',
      opportunity: 'Cloud IaaS/PaaS Souverain Datacenter Tier III',
      potentialMrr: '+45 000 € / mois',
      source: 'Journal Officiel',
      date: 'Il y a 3 jours',
      tagColor: 'bg-purple-500/20 text-purple-300'
    }
  ];

  const current = intelligenceItems[activeIdx];

  const handleNext = () => {
    setActiveIdx((prev) => (prev + 1) % intelligenceItems.length);
  };

  const handlePrev = () => {
    setActiveIdx((prev) => (prev - 1 + intelligenceItems.length) % intelligenceItems.length);
  };

  return (
    <div className="w-full bg-[#0B0B0F] rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between min-h-[260px]">
      
      {/* Top Header : Title + Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icons.Sparkles size={16} className="text-orange-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Intelligence IA & Signaux d&apos;Affaires
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#14141A] px-2.5 py-1 rounded-full">
          <button
            onClick={handlePrev}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Précédent"
          >
            <Icons.ChevronLeft size={14} />
          </button>
          <span className="text-[11px] font-mono font-bold text-zinc-300 px-1">
            {activeIdx + 1} / {intelligenceItems.length}
          </span>
          <button
            onClick={handleNext}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Suivant"
          >
            <Icons.ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Focus Signal Body (Asymmetric High Impact) */}
      <div className="my-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${current.tagColor}`}>
            {current.category}
          </span>
          <span className="text-[11px] font-semibold text-zinc-400">
            {current.account}
          </span>
        </div>

        <h3 className="text-base md:text-lg font-bold text-white tracking-tight leading-snug">
          {current.title}
        </h3>

        <p className="text-xs text-zinc-400 mt-2 leading-relaxed font-sans">
          {current.insight}
        </p>
      </div>

      {/* Bottom Opportunity Bar & Growth Target */}
      <div className="p-3.5 bg-[#14141A] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div>
          <span className="text-[10px] uppercase font-bold text-zinc-500 block">Opportunité Orange Associée</span>
          <span className="text-xs font-bold text-white line-clamp-1">{current.opportunity}</span>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
          <span className="text-xs font-mono font-black text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-lg">
            {current.potentialMrr}
          </span>
          <button
            onClick={() => onOpenSignalDetail(current)}
            className="px-3 py-1 bg-white hover:bg-zinc-200 active:scale-95 text-black text-xs font-bold rounded-lg transition-all cursor-pointer"
          >
            Explorer
          </button>
        </div>
      </div>

    </div>
  );
}
