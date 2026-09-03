"use client";

import React, { useState, useRef } from 'react';
import { StrategicVisit, TriggerSignal } from './kamTypes';
import { Icons } from '@/components/shared/Icons';

interface KamSignalsViewProps {
  visits: StrategicVisit[];
  onOpenBriefingForAccount: (visit: StrategicVisit) => void;
  onUpdateVisitSignals?: (visitId: string, newSignal: TriggerSignal, newOpportunity?: any) => void;
}

interface DocNote {
  id: string;
  title: string;
  accountName: string;
  members: Array<{ name: string; role: string }>;
  notesList: string[];
  extractedOpportunity?: {
    title: string;
    category: string;
    estimatedMrr: number;
    painPoint: string;
  } | null;
}

export default function KamSignalsView({
  visits,
  onOpenBriefingForAccount
}: KamSignalsViewProps) {
  // Document notes state
  const [docNotes, setDocNotes] = useState<DocNote[]>([
    {
      id: 'doc-1',
      title: 'bled IT',
      accountName: 'bled IT - Consortium Tech RDC',
      members: [
        { name: 'YENGO Geyser', role: 'Responsable de gestion de projets.' },
        { name: 'YAMBA Japhet', role: ': Gestionnaire comptable financier.' },
        { name: 'KALANGA Christian', role: 'Responsable de la communication digitale.' },
        { name: 'MUANGALA Jonathan', role: 'Responsable en prospection et en étude de faisabilité.' },
        { name: 'MAVUELA Steve', role: 'Responsable technique & Logiciel,' }
      ],
      notesList: [
        'Choisir un chef.',
        'Compétences managériales.',
        'Stratégie de prospection.',
        'Commencer avec des petits tarifs.',
        'Avoir une liste de produits : Gestion des présences par emprunte digitale, logiciel de gestion des étudiants,'
      ],
      extractedOpportunity: {
        title: 'Intégration Suite Logicielle Éducative & Biométrie',
        category: 'LOGICIEL & CLOUD SOUVERAIN',
        estimatedMrr: 12500,
        painPoint: 'Besoin de structuration commerciale et de tarification échelonnée.'
      }
    },
    {
      id: 'doc-2',
      title: 'Rawbank RDC - Siège',
      accountName: 'Rawbank RDC',
      members: [
        { name: 'Dieudonné Mwembo', role: 'Directeur des Systèmes d\'Information (DSI)' },
        { name: 'Patricia Lumumba', role: 'Directrice des Achats & Moyens Généraux' },
        { name: 'Alain Kabasele', role: 'Responsable Infrastructure & Réseaux' }
      ],
      notesList: [
        'Renouvellement lien Fibre Dédiée 200 Mbps sous 60 jours.',
        'Étude comparative SD-WAN Orange vs concurrent.',
        'Planification du test de bascule automatique 4G/5G de secours.'
      ],
      extractedOpportunity: {
        title: 'SD-WAN Managé & Double Adduction Fibre',
        category: 'EXPANSION & INFRASTRUCTURE',
        estimatedMrr: 42500,
        painPoint: 'Exigence de continuité 99.99% pour les transactions monétiques.'
      }
    }
  ]);

  const [activeDocId, setActiveDocId] = useState<string>(docNotes[0].id);
  const activeDoc = docNotes.find((d) => d.id === activeDocId) || docNotes[0];

  // Editor Toolbar State
  const [isBold, setIsBold] = useState(true);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isHeading, setIsHeading] = useState(false);
  const [isQuote, setIsQuote] = useState(false);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [fontSize, setFontSize] = useState<number>(14);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAiInsights, setShowAiInsights] = useState(true);

  const handleUpdateMember = (index: number, field: 'name' | 'role', value: string) => {
    const updated = [...activeDoc.members];
    updated[index][field] = value;
    setDocNotes((prev) =>
      prev.map((d) => (d.id === activeDoc.id ? { ...d, members: updated } : d))
    );
  };

  const handleUpdateNote = (index: number, value: string) => {
    const updated = [...activeDoc.notesList];
    updated[index] = value;
    setDocNotes((prev) =>
      prev.map((d) => (d.id === activeDoc.id ? { ...d, notesList: updated } : d))
    );
  };

  const handleAddNoteItem = () => {
    setDocNotes((prev) =>
      prev.map((d) =>
        d.id === activeDoc.id
          ? { ...d, notesList: [...d.notesList, 'Nouveau point stratégique...'] }
          : d
      )
    );
  };

  const handleRunAiAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowAiInsights(true);
    }, 1200);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0D0D11] text-zinc-100 select-none overflow-hidden font-sans">
      
      {/* 1. TOP DOCUMENT NAVIGATION HEADER (Matching Screenshot 1) */}
      <div className="h-14 px-6 bg-[#16161B] border-b border-white/5 flex items-center justify-between shrink-0">
        
        {/* Left : Back button & Document Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              const nextIndex = (docNotes.findIndex((d) => d.id === activeDoc.id) + 1) % docNotes.length;
              setActiveDocId(docNotes[nextIndex].id);
            }}
            title="Changer de document"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Icons.ChevronLeft size={20} />
          </button>

          {/* Centered Document Title with Red Spellcheck / Squiggle indicator */}
          <div className="relative group">
            <span className="text-base font-black text-white tracking-wide cursor-text">
              {activeDoc.title}
            </span>
            {/* Red wavy spellcheck line like in user screenshot */}
            <div className="h-[2px] w-8 bg-red-500 rounded-full mt-0.5" />
          </div>
        </div>

        {/* Right : Search & Overflow Menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleRunAiAnalysis()}
            className="px-3.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-full text-xs font-bold border border-blue-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <Icons.Sparkles size={13} className={isAnalyzing ? 'animate-spin' : ''} />
            <span>{isAnalyzing ? 'Analyse IA...' : 'Extraction IA'}</span>
          </button>

          <button className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
            <Icons.Search size={18} />
          </button>
          
          <button className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
            <Icons.MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* 2. FORMATTING TOOLBAR (Exact matching of Screenshot 1 Toolbar) */}
      <div className="h-12 px-6 bg-[#1A1A20] border-b border-white/5 flex items-center justify-between shrink-0 overflow-x-auto">
        <div className="flex items-center gap-2">
          
          {/* Undo */}
          <button
            title="Annuler"
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Icons.RotateCcw size={15} />
          </button>

          <div className="h-5 w-[1px] bg-white/10 mx-1" />

          {/* Bold Button (Active Blue Pill from Screenshot 1) */}
          <button
            onClick={() => setIsBold(!isBold)}
            title="Gras"
            className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
              isBold
                ? 'bg-[#2563EB] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            B
          </button>

          {/* Italic */}
          <button
            onClick={() => setIsItalic(!isItalic)}
            title="Italique"
            className={`px-3 py-1 rounded-lg text-xs font-serif italic transition-all cursor-pointer ${
              isItalic
                ? 'bg-[#2563EB] text-white shadow-md font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            I
          </button>

          {/* Underline */}
          <button
            onClick={() => setIsUnderline(!isUnderline)}
            title="Souligné"
            className={`px-3 py-1 rounded-lg text-xs underline transition-all cursor-pointer ${
              isUnderline
                ? 'bg-[#2563EB] text-white shadow-md font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            U
          </button>

          {/* Heading */}
          <button
            onClick={() => setIsHeading(!isHeading)}
            title="Titre"
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isHeading
                ? 'bg-[#2563EB] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            H
          </button>

          {/* Quotes */}
          <button
            onClick={() => setIsQuote(!isQuote)}
            title="Citation"
            className={`px-3 py-1 rounded-lg text-xs font-serif transition-all cursor-pointer ${
              isQuote
                ? 'bg-[#2563EB] text-white shadow-md font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            ❝
          </button>

          <div className="h-5 w-[1px] bg-white/10 mx-1" />

          {/* Zoom / Font Size +/- */}
          <button
            onClick={() => setFontSize((prev) => Math.min(prev + 1, 20))}
            title="Agrandir texte"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Icons.PlusCircle size={16} />
          </button>

          <button
            onClick={() => setFontSize((prev) => Math.max(prev - 1, 11))}
            title="Réduire texte"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Icons.MinusCircle size={16} />
          </button>

          <div className="h-5 w-[1px] bg-white/10 mx-1" />

          {/* Text Alignment Group (Active Blue Pill for selected mode) */}
          <button
            onClick={() => setAlignment('left')}
            title="Aligner à gauche"
            className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
              alignment === 'left'
                ? 'bg-[#2563EB] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icons.AlignLeft size={15} />
          </button>

          <button
            onClick={() => setAlignment('center')}
            title="Centrer"
            className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
              alignment === 'center'
                ? 'bg-[#2563EB] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icons.AlignCenter size={15} />
          </button>

          <button
            onClick={() => setAlignment('right')}
            title="Aligner à droite"
            className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
              alignment === 'right'
                ? 'bg-[#2563EB] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icons.AlignRight size={15} />
          </button>

          <button
            onClick={() => setAlignment('justify')}
            title="Justifier"
            className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
              alignment === 'justify'
                ? 'bg-[#2563EB] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icons.AlignJustify size={15} />
          </button>

          <div className="h-5 w-[1px] bg-white/10 mx-1" />

          {/* Bulleted & Numbered Lists */}
          <button
            onClick={handleAddNoteItem}
            title="Liste à puces"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Icons.List size={16} />
          </button>

          <button
            onClick={handleAddNoteItem}
            title="Liste numérotée"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Icons.ListOrdered size={16} />
          </button>

        </div>

        {/* Right side indicator */}
        <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
          {fontSize}px · {activeDoc.accountName}
        </span>
      </div>

      {/* 3. CENTERED DOCUMENT CANVAS (Exact visual replication of Screenshot 1) */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-[#0D0D11]">
        <div
          className={`w-full max-w-4xl bg-[#18181D] rounded-2xl p-12 shadow-2xl border border-white/5 space-y-8 min-h-[700px] transition-all ${
            alignment === 'center'
              ? 'text-center'
              : alignment === 'right'
              ? 'text-right'
              : alignment === 'justify'
              ? 'text-justify'
              : 'text-left'
          }`}
          style={{ fontSize: `${fontSize}px` }}
        >
          
          {/* SECTION 1 : Membres : Postes */}
          <div className="space-y-4">
            <h2 className="text-base font-black text-white tracking-tight">
              Membres : Postes
            </h2>

            <div className="space-y-2.5 font-normal leading-relaxed text-zinc-200">
              {activeDoc.members.map((member, idx) => (
                <div key={idx} className="flex flex-wrap items-baseline gap-1 group">
                  {/* Name with subtle spellcheck wave highlight */}
                  <span className="font-bold text-white relative">
                    {member.name}
                    <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-red-500/80 rounded-full" />
                  </span>
                  <span className="text-zinc-300">
                    : {member.role.replace(/^:\s*/, '')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2 : Notes : (Numbered list) */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h2 className="text-base font-black text-white tracking-tight">
              Notes :
            </h2>

            <ol className="space-y-3 font-normal leading-relaxed text-zinc-200 list-none pl-0">
              {activeDoc.notesList.map((noteText, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="font-black text-zinc-400 shrink-0">{idx + 1}.</span>
                  <span className="text-zinc-200">{noteText}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* SECTION 3 : AI Extraction Capsule (Liquid Glass Pill) */}
          {activeDoc.extractedOpportunity && showAiInsights && (
            <div className="mt-8 p-6 rounded-2xl bg-blue-950/30 border border-blue-500/20 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {activeDoc.extractedOpportunity.category}
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    +{activeDoc.extractedOpportunity.estimatedMrr.toLocaleString()} $ / mois
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">
                  {activeDoc.extractedOpportunity.title}
                </h4>
                <p className="text-xs text-zinc-400">
                  {activeDoc.extractedOpportunity.painPoint}
                </p>
              </div>

              <button
                onClick={() => onOpenBriefingForAccount(visits[0])}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 shrink-0 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Insérer dans le Briefing</span>
                <Icons.ArrowRight size={14} />
              </button>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

