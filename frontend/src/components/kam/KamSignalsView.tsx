"use client";

import React, { useState } from 'react';
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
        { name: 'YAMBA Japhet', role: 'Gestionnaire comptable financier.' },
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

  // Update active note title (editable inline by user)
  const handleUpdateActiveDocTitle = (newTitle: string) => {
    setDocNotes((prev) =>
      prev.map((d) => (d.id === activeDoc.id ? { ...d, title: newTitle } : d))
    );
  };

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

  const handleCreateNewDoc = () => {
    const newDoc: DocNote = {
      id: `doc-${Date.now()}`,
      title: 'Nouvelle Note Stratégique',
      accountName: 'Nouveau Compte Client',
      members: [
        { name: 'Nom du Contact', role: 'Fonction / Poste' }
      ],
      notesList: [
        'Point 1 de la discussion...',
        'Point 2 : Décision stratégique...'
      ],
      extractedOpportunity: null
    };
    setDocNotes((prev) => [newDoc, ...prev]);
    setActiveDocId(newDoc.id);
  };

  const handleRunAiAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowAiInsights(true);
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#ECEAE5] dark:bg-[#242124] text-zinc-900 dark:text-white select-none overflow-hidden font-sans transition-colors duration-300">
      
      {/* 1. TOP DOCUMENT NAVIGATION HEADER (Brand Colors & No Borders) */}
      <div className="h-14 px-6 bg-[#F6F5F2] dark:bg-[#2D2A2D] shadow-sm flex items-center justify-between shrink-0">
        
        {/* Left : Note switcher & Editable Title */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            {docNotes.map((d) => {
              const isSelected = d.id === activeDoc.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setActiveDocId(d.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#4F6CE8] text-white shadow-md'
                      : 'bg-[#E4E1DB] dark:bg-[#363336] text-zinc-600 dark:text-zinc-300 hover:bg-[#DAD7D0] dark:hover:bg-[#403C40]'
                  }`}
                >
                  {d.title}
                </button>
              );
            })}
            
            <button
              onClick={handleCreateNewDoc}
              title="Créer une nouvelle note"
              className="p-1.5 bg-[#E4E1DB] dark:bg-[#363336] text-zinc-600 dark:text-zinc-300 hover:text-[#4F6CE8] rounded-full transition-all cursor-pointer"
            >
              <Icons.Plus size={14} />
            </button>
          </div>

          <div className="h-5 w-px bg-zinc-300 dark:bg-zinc-700 mx-1 hidden sm:block shrink-0" />

          {/* Editable Note Name input */}
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={activeDoc.title}
              onChange={(e) => handleUpdateActiveDocTitle(e.target.value)}
              placeholder="Nom de la note..."
              className="w-full bg-transparent text-sm md:text-base font-black text-zinc-900 dark:text-white outline-none tracking-tight focus:bg-[#E4E1DB]/50 dark:focus:bg-[#363336]/50 px-2 py-0.5 rounded-lg transition-colors"
            />
          </div>
        </div>

        {/* Right : AI Action & Overflow */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleRunAiAnalysis}
            className="px-3.5 py-1.5 bg-[#4F6CE8] hover:bg-[#3E5AC8] active:scale-95 text-white rounded-full text-xs font-black shadow-md shadow-[#4F6CE8]/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Icons.Sparkles size={13} className={isAnalyzing ? 'animate-spin' : ''} />
            <span>{isAnalyzing ? 'Analyse IA...' : 'Extraction IA'}</span>
          </button>

          <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-[#E4E1DB] dark:hover:bg-[#363336] rounded-xl transition-colors cursor-pointer">
            <Icons.MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* 2. FORMATTING TOOLBAR (No borders, Royal Iris #4F6CE8 active pills) */}
      <div className="h-12 px-6 bg-[#E4E1DB] dark:bg-[#363336] flex items-center justify-between shrink-0 overflow-x-auto shadow-inner">
        <div className="flex items-center gap-1.5">
          
          {/* Undo */}
          <button
            title="Annuler"
            className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-[#DAD7D0] dark:hover:bg-[#403C40] transition-colors cursor-pointer"
          >
            <Icons.RotateCcw size={15} />
          </button>

          <div className="h-4 w-px bg-zinc-400/30 dark:bg-zinc-600/30 mx-1" />

          {/* Bold Button (Royal Iris Blue #4F6CE8 Pill) */}
          <button
            onClick={() => setIsBold(!isBold)}
            title="Gras"
            className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
              isBold
                ? 'bg-[#4F6CE8] text-white shadow-md'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-[#DAD7D0] dark:hover:bg-[#403C40]'
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
                ? 'bg-[#4F6CE8] text-white shadow-md font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-[#DAD7D0] dark:hover:bg-[#403C40]'
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
                ? 'bg-[#4F6CE8] text-white shadow-md font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-[#DAD7D0] dark:hover:bg-[#403C40]'
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
                ? 'bg-[#4F6CE8] text-white shadow-md'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-[#DAD7D0] dark:hover:bg-[#403C40]'
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
                ? 'bg-[#4F6CE8] text-white shadow-md font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-[#DAD7D0] dark:hover:bg-[#403C40]'
            }`}
          >
            ❝
          </button>

          <div className="h-4 w-px bg-zinc-400/30 dark:bg-zinc-600/30 mx-1" />

          {/* Zoom / Font Size +/- */}
          <button
            onClick={() => setFontSize((prev) => Math.min(prev + 1, 20))}
            title="Agrandir texte"
            className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-[#DAD7D0] dark:hover:bg-[#403C40] transition-colors cursor-pointer"
          >
            <Icons.PlusCircle size={16} />
          </button>

          <button
            onClick={() => setFontSize((prev) => Math.max(prev - 1, 11))}
            title="Réduire texte"
            className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-[#DAD7D0] dark:hover:bg-[#403C40] transition-colors cursor-pointer"
          >
            <Icons.MinusCircle size={16} />
          </button>

          <div className="h-4 w-px bg-zinc-400/30 dark:bg-zinc-600/30 mx-1" />

          {/* Text Alignment Group (Active Royal Iris Blue Pill) */}
          <button
            onClick={() => setAlignment('left')}
            title="Aligner à gauche"
            className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
              alignment === 'left'
                ? 'bg-[#4F6CE8] text-white shadow-md'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-[#DAD7D0] dark:hover:bg-[#403C40]'
            }`}
          >
            <Icons.AlignLeft size={15} />
          </button>

          <button
            onClick={() => setAlignment('center')}
            title="Centrer"
            className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
              alignment === 'center'
                ? 'bg-[#4F6CE8] text-white shadow-md'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-[#DAD7D0] dark:hover:bg-[#403C40]'
            }`}
          >
            <Icons.AlignCenter size={15} />
          </button>

          <button
            onClick={() => setAlignment('right')}
            title="Aligner à droite"
            className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
              alignment === 'right'
                ? 'bg-[#4F6CE8] text-white shadow-md'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-[#DAD7D0] dark:hover:bg-[#403C40]'
            }`}
          >
            <Icons.AlignRight size={15} />
          </button>

          <button
            onClick={() => setAlignment('justify')}
            title="Justifier"
            className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
              alignment === 'justify'
                ? 'bg-[#4F6CE8] text-white shadow-md'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-[#DAD7D0] dark:hover:bg-[#403C40]'
            }`}
          >
            <Icons.AlignJustify size={15} />
          </button>

          <div className="h-4 w-px bg-zinc-400/30 dark:bg-zinc-600/30 mx-1" />

          {/* Bulleted & Numbered Lists */}
          <button
            onClick={handleAddNoteItem}
            title="Ajouter un point à la liste"
            className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-[#DAD7D0] dark:hover:bg-[#403C40] transition-colors cursor-pointer"
          >
            <Icons.List size={16} />
          </button>

          <button
            onClick={handleAddNoteItem}
            title="Ajouter une note numérotée"
            className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-[#DAD7D0] dark:hover:bg-[#403C40] transition-colors cursor-pointer"
          >
            <Icons.ListOrdered size={16} />
          </button>

        </div>

        {/* Right side indicator */}
        <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 hidden sm:inline">
          {fontSize}px · {activeDoc.accountName}
        </span>
      </div>

      {/* 3. CENTERED DOCUMENT CANVAS (Soft Alabaster #F6F5F2 in Light, Charcoal #2D2A2D in Dark - No Borders) */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-[#ECEAE5] dark:bg-[#242124]">
        <div
          className={`w-full max-w-4xl bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[32px] p-12 shadow-xl dark:shadow-2xl space-y-8 min-h-[700px] transition-all ${
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
            <h2 className="text-base font-black text-zinc-900 dark:text-white tracking-tight">
              Membres : Postes
            </h2>

            <div className="space-y-2.5 font-normal leading-relaxed text-zinc-800 dark:text-zinc-200">
              {activeDoc.members.map((member, idx) => (
                <div key={idx} className="flex flex-wrap items-baseline gap-1 group">
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) => handleUpdateMember(idx, 'name', e.target.value)}
                    className="font-bold text-zinc-900 dark:text-white bg-transparent outline-none underline decoration-red-500/80 decoration-wavy cursor-text shrink-0"
                    style={{ width: `${Math.max(member.name.length * 10, 120)}px` }}
                  />
                  <span className="text-zinc-500 dark:text-zinc-400">:</span>
                  <input
                    type="text"
                    value={member.role}
                    onChange={(e) => handleUpdateMember(idx, 'role', e.target.value)}
                    className="flex-1 min-w-[200px] text-zinc-700 dark:text-zinc-300 bg-transparent outline-none cursor-text focus:bg-[#E4E1DB]/40 dark:focus:bg-[#363336]/40 px-1 rounded"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2 : Notes : (Numbered list) */}
          <div className="space-y-4 pt-6">
            <h2 className="text-base font-black text-zinc-900 dark:text-white tracking-tight">
              Notes :
            </h2>

            <ol className="space-y-3 font-normal leading-relaxed text-zinc-800 dark:text-zinc-200 list-none pl-0">
              {activeDoc.notesList.map((noteText, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="font-black text-zinc-400 shrink-0">{idx + 1}.</span>
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => handleUpdateNote(idx, e.target.value)}
                    className="flex-1 text-zinc-800 dark:text-zinc-200 bg-transparent outline-none cursor-text focus:bg-[#E4E1DB]/40 dark:focus:bg-[#363336]/40 px-1.5 py-0.5 rounded transition-colors"
                  />
                </li>
              ))}
            </ol>
          </div>

          {/* SECTION 3 : AI Extraction Capsule (Brand Royal Iris #4F6CE8 - No Borders) */}
          {activeDoc.extractedOpportunity && showAiInsights && (
            <div className="mt-8 p-6 rounded-[24px] bg-[#E4E1DB] dark:bg-[#363336] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#4F6CE8]/15 text-[#4F6CE8] dark:bg-[#4F6CE8]/25 dark:text-[#7B92F2]">
                    {activeDoc.extractedOpportunity.category}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    +{activeDoc.extractedOpportunity.estimatedMrr.toLocaleString()} $ / mois
                  </span>
                </div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  {activeDoc.extractedOpportunity.title}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {activeDoc.extractedOpportunity.painPoint}
                </p>
              </div>

              <button
                onClick={() => onOpenBriefingForAccount(visits[0])}
                className="px-4 py-2.5 bg-[#4F6CE8] hover:bg-[#3E5AC8] active:scale-95 text-white text-xs font-black rounded-xl shadow-md shadow-[#4F6CE8]/20 shrink-0 transition-all cursor-pointer flex items-center gap-1.5"
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

