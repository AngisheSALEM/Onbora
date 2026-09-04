"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  updatedAt: string;
  previewText: string;
  contentHtml: string;
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
  // Navigation state between Cards Hub and Document Editor
  const [viewMode, setViewMode] = useState<'grid' | 'editor'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Initial rich document notes
  const [docNotes, setDocNotes] = useState<DocNote[]>([
    {
      id: 'doc-1',
      title: 'bled IT',
      accountName: 'bled IT - Consortium Tech RDC',
      updatedAt: 'Modifié aujourd\'hui à 11:20',
      previewText: 'Membres : Postes - YENGO Geyser, YAMBA Japhet, KALANGA Christian, MUANGALA Jonathan, MAVUELA Steve. Notes : 1. Choisir un chef. 2. Compétences managériales. 3. Stratégie de prospection...',
      contentHtml: `
        <h3 style="font-weight: 900; font-size: 1.15rem; margin-bottom: 0.75rem; letter-spacing: -0.02em;">Membres : Postes</h3>
        <p style="margin-bottom: 0.4rem; line-height: 1.6;"><span style="text-decoration: underline wavy #EF4444; font-weight: 700;">YENGO Geyser</span> : Responsable de gestion de projets.</p>
        <p style="margin-bottom: 0.4rem; line-height: 1.6;"><span style="text-decoration: underline wavy #EF4444; font-weight: 700;">YAMBA Japhet</span> : Gestionnaire comptable financier.</p>
        <p style="margin-bottom: 0.4rem; line-height: 1.6;"><span style="text-decoration: underline wavy #EF4444; font-weight: 700;">KALANGA Christian</span> : Responsable de la communication digitale.</p>
        <p style="margin-bottom: 0.4rem; line-height: 1.6;"><span style="text-decoration: underline wavy #EF4444; font-weight: 700;">MUANGALA Jonathan</span> : Responsable en prospection et en étude de faisabilité.</p>
        <p style="margin-bottom: 0.4rem; line-height: 1.6;"><span style="text-decoration: underline wavy #EF4444; font-weight: 700;">MAVUELA Steve</span> : Responsable technique & Logiciel,</p>
        <br/>
        <h3 style="font-weight: 900; font-size: 1.15rem; margin-bottom: 0.75rem; letter-spacing: -0.02em;">Notes :</h3>
        <p style="margin-bottom: 0.4rem; line-height: 1.6;">1. Choisir un chef.</p>
        <p style="margin-bottom: 0.4rem; line-height: 1.6;">2. Compétences managériales.</p>
        <p style="margin-bottom: 0.4rem; line-height: 1.6;">3. Stratégie de prospection.</p>
        <p style="margin-bottom: 0.4rem; line-height: 1.6;">4. Commencer avec des petits tarifs.</p>
        <p style="margin-bottom: 0.4rem; line-height: 1.6;">5. Avoir une liste de produits : Gestion des présences par emprunte digitale, logiciel de gestion des étudiants,</p>
      `,
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
      updatedAt: 'Modifié hier à 16:45',
      previewText: 'Comité de direction IT : Dieudonné Mwembo (DSI), Patricia Lumumba (Achats), Alain Kabasele (Infrastructure). Renouvellement lien Fibre Dédiée 200 Mbps sous 60 jours...',
      contentHtml: `
        <h3 style="font-weight: 900; font-size: 1.15rem; margin-bottom: 0.75rem; letter-spacing: -0.02em;">Membres du Comité & Décideurs</h3>
        <p style="margin-bottom: 0.4rem; line-height: 1.6;"><span style="font-weight: 700;">Dieudonné Mwembo</span> : Directeur des Systèmes d'Information (DSI)</p>
        <p style="margin-bottom: 0.4rem; line-height: 1.6;"><span style="font-weight: 700;">Patricia Lumumba</span> : Directrice des Achats & Moyens Généraux</p>
        <p style="margin-bottom: 0.4rem; line-height: 1.6;"><span style="font-weight: 700;">Alain Kabasele</span> : Responsable Infrastructure Réseaux</p>
        <br/>
        <h3 style="font-weight: 900; font-size: 1.15rem; margin-bottom: 0.75rem; letter-spacing: -0.02em;">Relevé des Décisions :</h3>
        <p style="margin-bottom: 0.4rem; line-height: 1.6;">1. Renouvellement impératif du lien Fibre Dédiée 200 Mbps avant la fin du trimestre.</p>
        <p style="margin-bottom: 0.4rem; line-height: 1.6;">2. Lancement d'un appel d'offres restreint pour le raccordement SD-WAN de 18 agences provinciales (Lubumbashi, Goma, Matadi).</p>
        <p style="margin-bottom: 0.4rem; line-height: 1.6;">3. Exigence de haute disponibilité 99,99% avec bascule automatique sur lien satellite et 4G/5G de secours.</p>
      `,
      extractedOpportunity: {
        title: 'SD-WAN Managé & Double Adduction Fibre',
        category: 'EXPANSION & INFRASTRUCTURE',
        estimatedMrr: 42500,
        painPoint: 'Exigence de continuité 99.99% pour les transactions monétiques bancaires.'
      }
    }
  ]);

  const [activeDocId, setActiveDocId] = useState<string>(docNotes[0].id);
  const activeDoc = docNotes.find((d) => d.id === activeDocId) || docNotes[0];

  // Editor Toolbar State
  const [fontSize, setFontSize] = useState<number>(14);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAiInsights, setShowAiInsights] = useState(true);

  const editorRef = useRef<HTMLDivElement>(null);

  // Sync content into DOM only when active note changes or switching to editor view
  useEffect(() => {
    if (editorRef.current && viewMode === 'editor') {
      editorRef.current.innerHTML = activeDoc.contentHtml;
    }
  }, [activeDocId, viewMode]);

  // Check active formatting (bold, italic, underline) on selection change
  const updateActiveFormats = useCallback(() => {
    try {
      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));
    } catch {}
  }, []);

  // Save content to state WITHOUT re-injecting into DOM (prevents cursor jumping backwards!)
  const handleEditorInput = () => {
    if (!editorRef.current) return;
    const newHtml = editorRef.current.innerHTML;
    const plainText = editorRef.current.innerText.slice(0, 160);
    setDocNotes((prev) =>
      prev.map((d) =>
        d.id === activeDoc.id
          ? { ...d, contentHtml: newHtml, previewText: plainText }
          : d
      )
    );
    updateActiveFormats();
  };

  // Execute formatting command on text selection
  const executeCommand = (command: string, value: string = '') => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const handleUpdateActiveDocTitle = (newTitle: string) => {
    setDocNotes((prev) =>
      prev.map((d) => (d.id === activeDoc.id ? { ...d, title: newTitle } : d))
    );
  };

  const handleSelectNoteCard = (docId: string) => {
    setActiveDocId(docId);
    setViewMode('editor');
  };

  const handleCreateNewDoc = () => {
    const newDoc: DocNote = {
      id: `doc-${Date.now()}`,
      title: 'Nouvelle Note',
      accountName: visits[0]?.account_name || 'Nouveau Compte',
      updatedAt: 'Modifié à l\'instant',
      previewText: 'Nouvelle note vierge. Cliquez pour rédiger votre compte-rendu...',
      contentHtml: `
        <h3 style="font-weight: 900; font-size: 1.15rem; margin-bottom: 0.75rem; letter-spacing: -0.02em;">Membres Présents :</h3>
        <p style="margin-bottom: 0.4rem; line-height: 1.6;"><strong>Contact Principal</strong> : Titre / Fonction</p>
        <br/>
        <h3 style="font-weight: 900; font-size: 1.15rem; margin-bottom: 0.75rem; letter-spacing: -0.02em;">Points de Discussion & Décisions :</h3>
        <p style="margin-bottom: 0.4rem; line-height: 1.6;">1. Objectifs de la réunion...</p>
        <p style="margin-bottom: 0.4rem; line-height: 1.6;">2. Engagements pris...</p>
      `,
      extractedOpportunity: null
    };

    setDocNotes((prev) => [newDoc, ...prev]);
    setActiveDocId(newDoc.id);
    setViewMode('editor');
  };

  const handleDeleteActiveDoc = () => {
    if (docNotes.length <= 1) return;
    const remaining = docNotes.filter((d) => d.id !== activeDoc.id);
    setDocNotes(remaining);
    setActiveDocId(remaining[0].id);
    setViewMode('grid');
  };

  const handleRunAiAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowAiInsights(true);
    }, 1000);
  };

  const filteredDocs = docNotes.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.previewText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#ECEAE5] dark:bg-[#242124] text-zinc-900 dark:text-white select-none overflow-hidden font-sans transition-colors duration-300">
      
      {/* ========================================================================= */}
      {/* ÉTAPE 1 : GRILLE DES CARTES DE NOTES (HUB PRINCIPAL)                       */}
      {/* ========================================================================= */}
      {viewMode === 'grid' && (
        <div className="flex-1 flex flex-col h-full overflow-y-auto p-8 space-y-8">
          
          {/* Top Bar : Titre, Recherche & Bouton Ajouter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                Notes & Comptes-Rendus
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Sélectionnez une note pour l&apos;ouvrir dans l&apos;éditeur ou créez un nouveau document.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Search Box */}
              <div className="flex items-center gap-2 px-3.5 py-2 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-full shadow-sm flex-1 sm:w-64">
                <Icons.Search size={14} className="text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une note..."
                  className="bg-transparent text-xs text-zinc-900 dark:text-white outline-none w-full placeholder-zinc-400"
                />
              </div>

              {/* Bouton Ajouter une Note */}
              <button
                onClick={handleCreateNewDoc}
                className="px-4 py-2 bg-[#4F6CE8] hover:bg-[#3E5AC8] active:scale-95 text-white rounded-full text-xs font-black shadow-md shadow-[#4F6CE8]/20 flex items-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <Icons.Plus size={15} />
                <span>Nouvelle Note</span>
              </button>
            </div>
          </div>

          {/* Grille des Cartes */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {/* Carte Spéciale : Créer une Nouvelle Note */}
            <div
              onClick={handleCreateNewDoc}
              className="bg-[#E4E1DB]/60 dark:bg-[#363336]/60 rounded-[28px] p-8 flex flex-col items-center justify-center text-center gap-3 hover:bg-[#E4E1DB] dark:hover:bg-[#363336] transition-all cursor-pointer min-h-[220px] group shadow-sm"
            >
              <div className="w-12 h-12 rounded-full bg-[#4F6CE8]/15 text-[#4F6CE8] dark:bg-[#4F6CE8]/25 dark:text-[#7B92F2] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icons.Plus size={22} />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-white">
                  Créer un document
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Ouvrir une page d&apos;édition vierge
                </p>
              </div>
            </div>

            {/* Cartes des Notes Existantes */}
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleSelectNoteCard(doc.id)}
                className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[28px] p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group min-h-[220px]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-[#4F6CE8] dark:text-[#7B92F2] uppercase tracking-wider flex items-center gap-1.5 truncate">
                      <Icons.Building size={13} />
                      <span className="truncate">{doc.accountName.split(' - ')[0]}</span>
                    </span>

                    {doc.extractedOpportunity && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#4F6CE8]/15 text-[#4F6CE8] dark:bg-[#4F6CE8]/25 dark:text-[#7B92F2] shrink-0">
                        +{doc.extractedOpportunity.estimatedMrr.toLocaleString()} $ / m
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-black text-zinc-900 dark:text-white group-hover:text-[#4F6CE8] transition-colors leading-tight">
                    {doc.title}
                  </h3>

                  <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-3 leading-relaxed">
                    {doc.previewText}
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Icons.Clock size={12} />
                    <span>{doc.updatedAt}</span>
                  </span>

                  <span className="text-[#4F6CE8] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <span>Éditer</span>
                    <Icons.ArrowRight size={12} />
                  </span>
                </div>
              </div>
            ))}

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ÉTAPE 2 : INTERFACE D'ÉDITION DE DOCUMENT PLEIN ÉCRAN                     */}
      {/* ========================================================================= */}
      {viewMode === 'editor' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Header de l'Éditeur : Bouton Retour, Titre Éditable, Actions */}
          <div className="h-14 px-6 bg-[#F6F5F2] dark:bg-[#2D2A2D] shadow-sm flex items-center justify-between shrink-0">
            
            {/* Left : Bouton Retour aux Cartes & Titre Modifiable */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                onClick={() => setViewMode('grid')}
                className="px-3 py-1.5 bg-[#E4E1DB] dark:bg-[#363336] text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Icons.ChevronLeft size={16} />
                <span>Toutes les notes</span>
              </button>

              <div className="h-5 w-px bg-zinc-300 dark:bg-zinc-700 mx-1 hidden sm:block shrink-0" />

              {/* Titre de la Note directement éditable */}
              <input
                type="text"
                value={activeDoc.title}
                onChange={(e) => handleUpdateActiveDocTitle(e.target.value)}
                placeholder="Nom du document..."
                className="w-full max-w-sm bg-transparent text-base font-black text-zinc-900 dark:text-white outline-none tracking-tight focus:bg-[#E4E1DB]/50 dark:focus:bg-[#363336]/50 px-2 py-0.5 rounded-lg transition-colors cursor-text"
              />
            </div>

            {/* Right : Extraction IA & Supprimer */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleRunAiAnalysis}
                className="px-4 py-1.5 bg-[#4F6CE8] hover:bg-[#3E5AC8] active:scale-95 text-white rounded-full text-xs font-black shadow-md shadow-[#4F6CE8]/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Icons.Sparkles size={14} className={isAnalyzing ? 'animate-spin' : ''} />
                <span>{isAnalyzing ? 'Analyse en cours...' : 'Extraction IA'}</span>
              </button>

              <button
                onClick={handleDeleteActiveDoc}
                title="Supprimer cette note"
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-[#E4E1DB] dark:hover:bg-[#363336] rounded-xl transition-colors cursor-pointer"
              >
                <Icons.Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Barre d'Outils de Formatage (Zero Bordure, Fond Surface Secondaire) */}
          <div className="h-12 px-6 bg-[#E4E1DB] dark:bg-[#363336] flex items-center justify-between shrink-0 overflow-x-auto shadow-inner">
            <div className="flex items-center gap-1.5">
              
              {/* Undo */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('undo')}
                title="Annuler"
                className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-[#DAD7D0] dark:hover:bg-[#403C40] transition-colors cursor-pointer"
              >
                <Icons.RotateCcw size={15} />
              </button>

              <div className="h-4 w-px bg-zinc-400/30 dark:bg-zinc-600/30 mx-1" />

              {/* Bold Button (B) */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('bold')}
                title="Gras"
                className={`px-3 py-1 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                  isBold
                    ? 'bg-[#4F6CE8] text-white shadow-md'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-[#DAD7D0] dark:hover:bg-[#403C40]'
                }`}
              >
                B
              </button>

              {/* Italic Button (I) */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('italic')}
                title="Italique"
                className={`px-3 py-1 rounded-lg text-xs font-serif italic transition-colors cursor-pointer ${
                  isItalic
                    ? 'bg-[#4F6CE8] text-white shadow-md font-bold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-[#DAD7D0] dark:hover:bg-[#403C40]'
                }`}
              >
                I
              </button>

              {/* Underline Button (U) */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('underline')}
                title="Souligné"
                className={`px-3 py-1 rounded-lg text-xs underline transition-colors cursor-pointer ${
                  isUnderline
                    ? 'bg-[#4F6CE8] text-white shadow-md font-bold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-[#DAD7D0] dark:hover:bg-[#403C40]'
                }`}
              >
                U
              </button>

              {/* Heading (H) */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('formatBlock', '<h3>')}
                title="Titre de section"
                className="px-3 py-1 rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-[#DAD7D0] dark:hover:bg-[#403C40] transition-colors cursor-pointer"
              >
                H
              </button>

              {/* Quote */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('formatBlock', '<blockquote>')}
                title="Citation"
                className="px-3 py-1 rounded-lg text-xs font-serif text-zinc-700 dark:text-zinc-300 hover:bg-[#DAD7D0] dark:hover:bg-[#403C40] transition-colors cursor-pointer"
              >
                ❝
              </button>

              <div className="h-4 w-px bg-zinc-400/30 dark:bg-zinc-600/30 mx-1" />

              {/* Font Size +/- */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setFontSize((prev) => Math.min(prev + 1, 22))}
                title="Agrandir texte"
                className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-[#DAD7D0] dark:hover:bg-[#403C40] transition-colors cursor-pointer"
              >
                <Icons.PlusCircle size={16} />
              </button>

              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setFontSize((prev) => Math.max(prev - 1, 11))}
                title="Réduire texte"
                className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-[#DAD7D0] dark:hover:bg-[#403C40] transition-colors cursor-pointer"
              >
                <Icons.MinusCircle size={16} />
              </button>

              <div className="h-4 w-px bg-zinc-400/30 dark:bg-zinc-600/30 mx-1" />

              {/* Text Alignments */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setAlignment('left');
                  executeCommand('justifyLeft');
                }}
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
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setAlignment('center');
                  executeCommand('justifyCenter');
                }}
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
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setAlignment('right');
                  executeCommand('justifyRight');
                }}
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
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setAlignment('justify');
                  executeCommand('justifyFull');
                }}
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

              {/* Lists */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('insertUnorderedList')}
                title="Liste à puces"
                className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-[#DAD7D0] dark:hover:bg-[#403C40] transition-colors cursor-pointer"
              >
                <Icons.List size={16} />
              </button>

              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => executeCommand('insertOrderedList')}
                title="Liste numérotée"
                className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-[#DAD7D0] dark:hover:bg-[#403C40] transition-colors cursor-pointer"
              >
                <Icons.ListOrdered size={16} />
              </button>

            </div>

            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 hidden sm:inline">
              {fontSize}px · {activeDoc.accountName}
            </span>
          </div>

          {/* Canvas de Document Continu (Feuille d'Édition Continue - Zero Mini-Formulaires) */}
          <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-[#ECEAE5] dark:bg-[#242124]">
            <div className="w-full max-w-4xl bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[32px] p-12 shadow-xl dark:shadow-2xl space-y-8 min-h-[720px]">
              
              {/* Zone d'Édition WYSIWYG Réelle & Continue (Sans dangerouslySetInnerHTML sur les re-renders = Plus d'écriture inversée !) */}
              <div
                ref={editorRef}
                contentEditable={true}
                suppressContentEditableWarning={true}
                onInput={handleEditorInput}
                onKeyUp={updateActiveFormats}
                onMouseUp={updateActiveFormats}
                style={{ fontSize: `${fontSize}px` }}
                className="outline-none min-h-[500px] text-zinc-900 dark:text-white leading-relaxed font-sans cursor-text selection:bg-[#4F6CE8]/30 focus:outline-none"
              />

              {/* Capsule d'Opportunité IA Détectée (Zéro Bordure, Zéro Emoji) */}
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
      )}

    </div>
  );
}

