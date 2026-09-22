"use client";

import React, { useState, useEffect } from 'react';
import { Icons } from '@/components/shared/Icons';
import { StrategicVisit } from './kamTypes';
import { fetchAPI } from '@/lib/api';

// ============================================================================
// DATA TYPES
// ============================================================================

export interface SourceRef {
  evidence_id: number;
  title?: string;
  url: string;
  publisher?: string;
}

export interface SourcedStatement {
  text: string;
  sources?: SourceRef[];
}

export interface RecommendedSolutionItem {
  id?: string;
  name: string;
  category: string;
  description: string;
  sla?: string;
  rdc_availability?: string;
}

export interface EvidenceItem {
  evidence_id: number;
  url: string;
  title: string;
  publisher: string;
  source_type: string;
  relationship: string;
  access_status: string;
  relevance_score: number;
  verdict: string;
  reasons: string[];
  relevant_excerpt: string;
  collected_at: string;
}

export interface DiscoveredSource {
  url: string;
  title: string;
  snippet?: string;
  category: string;
  query: string;
  provider: string;
  discovery_score: number;
}

export interface OnboraAnalysisBrief {
  id?: number;
  enterprise_id: number | string;
  enterprise_name: string;
  identity_status?: string;
  coverage?: string;
  company?: {
    legal_name?: string;
    trade_name?: string;
    rccm?: string;
    dossier_number?: string;
    province?: string;
    activity_arsp?: string;
  };
  ai_summary?: {
    status?: string;
    model?: string;
    overview: SourcedStatement;
    key_facts?: SourcedStatement[];
    contradictions?: SourcedStatement[];
    gaps?: string[];
  };
  recommended_solutions?: RecommendedSolutionItem[];
  lead_qualification?: {
    status?: string;
    catalog_version?: string;
    journeys?: Array<{
      journey_id?: string;
      title: string;
      description?: string;
      verdict?: string;
      reason?: string;
      offers?: Array<{
        service_id?: string;
        name: string;
        category: string;
        description: string;
        rdc_availability?: string;
        sla?: string;
      }>;
    }>;
  };
  custom_pitch_angles?: Array<{
    target_solution?: string;
    angle_title?: string;
    business_impact?: string;
    recommended_package?: string;
  }>;
  evidence?: EvidenceItem[];
  sources?: DiscoveredSource[];
  created_at?: string;
  updated_at?: string;
}

// Curated catalog presets for instant auto-completion
const ORANGE_CATALOG_PRESETS = [
  {
    name: "Fibre Dédiée Pro 100 Mbps",
    category: "Connectivité",
    description: "Liaison symétrique sécurisée à débit garanti 100% avec supervision proactive 24/7.",
    sla: "SLA 99.99% · GTR 4h"
  },
  {
    name: "SD-WAN Managé Multi-Sites",
    category: "Réseaux",
    description: "Interconnexion résiliente de succursales avec routage intelligent et tunnels IPsec chiffrés.",
    sla: "Supervision 24/7"
  },
  {
    name: "CyberSOC 24/7 & Firewall Managé",
    category: "Cybersécurité",
    description: "Protection périmétrique, filtrage DNS et détection d'intrusions opérée par Orange Cyberdefense.",
    sla: "Temps d'alerte < 15 min"
  },
  {
    name: "Orange Money B2B & API Bulk Payments",
    category: "Monétique",
    description: "Paiement de salaires en masse et encaissement sécurisé par API directe pour les grandes entreprises.",
    sla: "Disponibilité 99.9%"
  },
  {
    name: "Cloud Backup Datacenter Kinshasa",
    category: "Cloud & Hébergement",
    description: "Sauvegarde automatisée et hébergement souverain en Datacenter Tier III avec réplication.",
    sla: "RPO 1h · RTO 2h"
  },
  {
    name: "Flotte Mobile Entreprise (Business GFU)",
    category: "Mobile & Flotte",
    description: "Partage d'un pool d'heures d'appels intra-flotte illimités et forfaits data mutualisés.",
    sla: "Gestionnaire dédié"
  },
  {
    name: "Offre Mobile Postpayé (Business Flex)",
    category: "Mobile & Flotte",
    description: "Facturation centralisée des lignes mobiles professionnelles avec plafonnement et suivi consommation.",
    sla: "Facture mensuelle unique"
  },
  {
    name: "IP-VPN MPLS National",
    category: "Réseaux",
    description: "Réseau privé d'entreprise reliant Kinshasa, Lubumbashi, Kolwezi et Goma avec QOS garantie.",
    sla: "SLA 99.9% · GTR 4h"
  },
  {
    name: "Liaison Satellite VSAT Backup",
    category: "Connectivité",
    description: "Connectivité de secours pour sites miniers ou zones reculées hors emprise fibre optique.",
    sla: "GTR 8h"
  },
  {
    name: "VoIP Trunk SIP & Standard Téléphonique",
    category: "Téléphonie",
    description: "Acheminement VoIP haute qualité avec numéros courts et accueil vocal interactif (IVR).",
    sla: "Qualité HD Voice"
  }
];

interface KamPreCallViewProps {
  assignedAccounts: StrategicVisit[];
  initialAccountId?: string | number;
  onLaunchMeetingForAccount?: (accountId: number | string) => void;
  onBackToAccounts?: () => void;
}

export default function KamPreCallView({
  assignedAccounts,
  initialAccountId,
  onLaunchMeetingForAccount,
  onBackToAccounts,
}: KamPreCallViewProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    initialAccountId ? String(initialAccountId) : (assignedAccounts[0]?.id || '')
  );
  const [briefingData, setBriefingData] = useState<OnboraAnalysisBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Discreet Tabs Navigation: 'brief' (Synthèse & Solutions) | 'details' (Faits & Vigilance)
  const [activeTab, setActiveTab] = useState<'brief' | 'details'>('brief');

  // Manual Editing States
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Editable Form Buffers
  const [editOverview, setEditOverview] = useState('');
  const [editKeyFacts, setEditKeyFacts] = useState<string[]>([]);
  const [editContradictions, setEditContradictions] = useState<string[]>([]);
  const [editGaps, setEditGaps] = useState<string[]>([]);
  const [editSolutions, setEditSolutions] = useState<RecommendedSolutionItem[]>([]);

  // Temp inline add inputs
  const [newFactText, setNewFactText] = useState('');
  const [newContraText, setNewContraText] = useState('');
  const [newGapText, setNewGapText] = useState('');
  const [newSolName, setNewSolName] = useState('');
  const [newSolCategory, setNewSolCategory] = useState('');
  const [newSolDesc, setNewSolDesc] = useState('');
  const [newSolSla, setNewSolSla] = useState('SLA 99.9%');

  // Autocomplete & Catalog Search States
  const [showCatalogSuggestions, setShowCatalogSuggestions] = useState(false);
  const [catalogSearchResults, setCatalogSearchResults] = useState<any[]>([]);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogModalQuery, setCatalogModalQuery] = useState('');

  // Sources Accordion Drawer State
  const [showSourcesDrawer, setShowSourcesDrawer] = useState(false);

  // Synchroniser initialAccountId
  useEffect(() => {
    if (initialAccountId && String(initialAccountId) !== selectedAccountId) {
      setSelectedAccountId(String(initialAccountId));
    }
  }, [initialAccountId]);

  // Charger le briefing dès que le compte change
  useEffect(() => {
    if (!selectedAccountId) return;
    fetchBriefing(selectedAccountId);
  }, [selectedAccountId]);

  // Extraire les solutions recommandées
  const extractRecommendedSolutions = (data: OnboraAnalysisBrief): RecommendedSolutionItem[] => {
    if (data.recommended_solutions && data.recommended_solutions.length > 0) {
      return data.recommended_solutions;
    }
    const extracted: RecommendedSolutionItem[] = [];
    const seenNames = new Set<string>();

    if (data.lead_qualification?.journeys) {
      for (const journey of data.lead_qualification.journeys) {
        if (journey.offers) {
          for (const off of journey.offers) {
            if (!seenNames.has(off.name)) {
              seenNames.add(off.name);
              extracted.push({
                id: off.service_id || String(extracted.length + 1),
                name: off.name,
                category: off.category || 'Connectivité',
                description: off.description || journey.reason || 'Solution adaptée au profil identifié.',
                sla: off.sla || 'GTR 4h · SLA 99.9%',
                rdc_availability: off.rdc_availability || 'Validée RDC',
              });
            }
          }
        }
      }
    }

    if (extracted.length === 0 && data.custom_pitch_angles) {
      data.custom_pitch_angles.forEach((angle, idx) => {
        extracted.push({
          id: String(idx + 1),
          name: angle.recommended_package || angle.target_solution || 'Offre Sur-Mesure Orange',
          category: 'Orange Business',
          description: angle.business_impact || angle.angle_title || 'Solution stratégique recommandée.',
          sla: 'GTR 4h · SLA 99.9%',
          rdc_availability: 'Validée RDC',
        });
      });
    }

    if (extracted.length === 0) {
      extracted.push(
        {
          id: '1',
          name: 'Fibre Dédiée Pro 100 Mbps',
          category: 'Connectivité',
          description: 'Liaison symétrique sécurisée avec débit garanti et supervision 24/7.',
          sla: 'SLA 99.9% · GTR 4h',
          rdc_availability: 'Validée RDC',
        },
        {
          id: '2',
          name: 'SD-WAN Managé Multi-Sites',
          category: 'Réseaux',
          description: 'Interconnexion résiliente avec routage applicatif intelligent et chiffrement IPsec.',
          sla: 'Supervision 24/7',
          rdc_availability: 'Validée RDC',
        }
      );
    }

    return extracted;
  };

  const populateEditBuffers = (data: OnboraAnalysisBrief) => {
    setEditOverview(data.ai_summary?.overview?.text || '');
    setEditKeyFacts((data.ai_summary?.key_facts || []).map((f) => f.text));
    setEditContradictions((data.ai_summary?.contradictions || []).map((c) => c.text));
    setEditGaps(data.ai_summary?.gaps || []);
    setEditSolutions(extractRecommendedSolutions(data));
  };

  const fetchBriefing = async (accountId: string, forceRegenerate = false) => {
    setLoading(true);
    setError(null);
    setIsEditing(false);
    try {
      const cleanId = String(accountId).replace('account-', '');
      const method = forceRegenerate ? 'POST' : 'GET';
      const data: OnboraAnalysisBrief = await fetchAPI(`/api/kam/pre-call/${cleanId}/`, { method });
      setBriefingData(data);
      populateEditBuffers(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur de chargement du brief.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBrief = async (forceResynthesize = true) => {
    if (!briefingData || !selectedAccountId) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const cleanId = String(selectedAccountId).replace('account-', '');
      const updatedAiSummary = {
        ...(briefingData.ai_summary || {}),
        status: 'kam_edited',
        overview: {
          text: editOverview,
          sources: briefingData.ai_summary?.overview?.sources || [],
        },
        key_facts: editKeyFacts.map((text, idx) => ({
          text,
          sources: briefingData.ai_summary?.key_facts?.[idx]?.sources || [],
        })),
        contradictions: editContradictions.map((text, idx) => ({
          text,
          sources: briefingData.ai_summary?.contradictions?.[idx]?.sources || [],
        })),
        gaps: editGaps,
      };

      const updatedData: OnboraAnalysisBrief = await fetchAPI(`/api/kam/pre-call/${cleanId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_summary: updatedAiSummary,
          recommended_solutions: editSolutions,
          resynthesize: forceResynthesize,
        }),
      });

      setBriefingData(updatedData);
      populateEditBuffers(updatedData);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la mise à jour.";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Catalog Auto-completion filtering
  const matchingSuggestions = newSolName.trim().length >= 1
    ? ORANGE_CATALOG_PRESETS.filter((p) =>
        p.name.toLowerCase().includes(newSolName.toLowerCase()) ||
        p.category.toLowerCase().includes(newSolName.toLowerCase())
      )
    : [];

  const selectCatalogOffer = (offer: { name: string; category?: string; description?: string; sla?: string }) => {
    setNewSolName(offer.name);
    if (offer.category) setNewSolCategory(offer.category);
    if (offer.description) setNewSolDesc(offer.description);
    if (offer.sla) setNewSolSla(offer.sla);
    setShowCatalogSuggestions(false);
    setShowCatalogModal(false);
  };

  // Search catalog through RAG API
  const handleSearchCatalog = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : (catalogModalQuery || newSolName || 'Fibre')).trim();
    setCatalogModalQuery(q);
    setIsSearchingCatalog(true);
    setShowCatalogModal(true);
    try {
      const res = await fetchAPI('/api/ai/catalog/search/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q || 'Fibre', limit: 8 }),
      });
      if (res && Array.isArray(res.results) && res.results.length > 0) {
        setCatalogSearchResults(res.results);
      } else {
        // Fallback on local presets
        const lower = q.toLowerCase();
        setCatalogSearchResults(
          ORANGE_CATALOG_PRESETS.filter(
            (p) => p.name.toLowerCase().includes(lower) || p.category.toLowerCase().includes(lower)
          )
        );
      }
    } catch (e) {
      console.warn("Recherche catalogue locale :", e);
      const lower = q.toLowerCase();
      setCatalogSearchResults(
        ORANGE_CATALOG_PRESETS.filter(
          (p) => p.name.toLowerCase().includes(lower) || p.category.toLowerCase().includes(lower)
        )
      );
    } finally {
      setIsSearchingCatalog(false);
    }
  };

  const copyBriefingToClipboard = () => {
    if (!briefingData) return;
    const ai = briefingData.ai_summary;
    const solutions = extractRecommendedSolutions(briefingData);
    const text = `${briefingData.enterprise_name}

${ai?.overview?.text || ''}

Solutions recommandées :
${solutions.map((s, i) => `${i + 1}. [${s.category}] ${s.name} : ${s.description} (${s.sla || 'GTR 4h'})`).join('\n')}

Faits clés :
${(ai?.key_facts || []).map((f, i) => `- ${f.text}`).join('\n')}

Contradictions & Vigilance :
${(ai?.contradictions || []).map((c, i) => `- ${c.text}`).join('\n')}

Informations manquantes :
${(ai?.gaps || []).map((g, i) => `- ${g}`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const currentAccount = assignedAccounts.find(
    (a) => String(a.id) === selectedAccountId || String(a.account_id) === selectedAccountId
  );

  const displayedSolutions = briefingData ? extractRecommendedSolutions(briefingData) : [];
  const enterpriseTitle = briefingData?.enterprise_name || currentAccount?.account_name || "Entreprise";

  return (
    <div className="flex-1 flex flex-col h-full bg-[#ECEAE5] dark:bg-[#242124] overflow-y-auto p-6 md:p-10 select-none transition-colors duration-300">
      
      {/* 1. TOP HEADER: ONLY COMPANY NAME & CLEAN ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3">
          {onBackToAccounts && (
            <button
              onClick={onBackToAccounts}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
              title="Retour aux comptes"
            >
              <Icons.ChevronLeft size={18} />
            </button>
          )}

          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              {enterpriseTitle}
            </h1>
            {briefingData?.company?.province && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {briefingData.company.province} {briefingData.company.activity_arsp ? `· ${briefingData.company.activity_arsp}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Clean, discreet top actions */}
        <div className="flex items-center gap-2">
          {briefingData && (
            <button
              onClick={() => {
                if (isEditing) {
                  populateEditBuffers(briefingData);
                  setIsEditing(false);
                } else {
                  populateEditBuffers(briefingData);
                  setIsEditing(true);
                }
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isEditing
                  ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 shadow-xs'
                  : 'bg-white dark:bg-[#2D2A2D] hover:bg-zinc-100 dark:hover:bg-[#383438] text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/5'
              }`}
            >
              {isEditing ? "Annuler l'édition" : "Éditer"}
            </button>
          )}

          {isEditing && (
            <button
              onClick={() => handleSaveBrief(true)}
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? <Icons.RefreshCw size={13} className="animate-spin" /> : <Icons.Check size={13} />}
              <span>{isSaving ? "Mise à jour..." : "Enregistrer"}</span>
            </button>
          )}

          <button
            onClick={() => handleSaveBrief(true)}
            disabled={loading || isSaving}
            title="Mettre à jour la synthèse et les solutions"
            className="p-2 rounded-xl bg-white dark:bg-[#2D2A2D] hover:bg-zinc-100 dark:hover:bg-[#383438] text-zinc-600 dark:text-zinc-300 border border-black/5 dark:border-white/5 cursor-pointer"
          >
            <Icons.RefreshCw size={14} className={isSaving || loading ? "animate-spin text-[#4F6CE8]" : ""} />
          </button>

          <button
            onClick={copyBriefingToClipboard}
            disabled={!briefingData}
            title="Copier le document"
            className="p-2 rounded-xl bg-white dark:bg-[#2D2A2D] hover:bg-zinc-100 dark:hover:bg-[#383438] text-zinc-600 dark:text-zinc-300 border border-black/5 dark:border-white/5 cursor-pointer"
          >
            {copied ? <Icons.Check size={14} className="text-emerald-500" /> : <Icons.Copy size={14} />}
          </button>

          {onLaunchMeetingForAccount && briefingData && (
            <button
              onClick={() => onLaunchMeetingForAccount(briefingData.enterprise_id)}
              className="px-4 py-2 bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Icons.Mic size={14} />
              <span>Démarrer RDV</span>
            </button>
          )}
        </div>
      </div>

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <Icons.Check size={14} className="text-emerald-600" />
          <span>Synthèse et solutions recommandées mises à jour.</span>
        </div>
      )}

      {saveError && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
          <Icons.AlertTriangle size={14} className="text-rose-600" />
          <span>{saveError}</span>
        </div>
      )}

      {/* 2. DISCREET TABS (Minimalist underline style, zero visual clutter) */}
      {briefingData && !loading && !error && (
        <div className="flex items-center gap-8 border-b border-black/5 dark:border-white/5 mb-6">
          <button
            onClick={() => setActiveTab('brief')}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
              activeTab === 'brief'
                ? 'text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            Synthèse & Solutions
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
              activeTab === 'details'
                ? 'text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            Faits & Vigilance
          </button>
        </div>
      )}

      {/* 3. LOADING & ERROR STATES */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <Icons.RefreshCw size={28} className="animate-spin text-[#4F6CE8] mb-3" />
          <p className="text-xs text-zinc-500">Chargement...</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-[#282528] text-center max-w-md mx-auto my-auto space-y-3 border border-black/5 dark:border-white/5">
          <p className="text-xs text-zinc-500">{error}</p>
          <button
            onClick={() => fetchBriefing(selectedAccountId)}
            className="px-4 py-2 bg-[#4F6CE8] text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      ) : briefingData ? (
        <div className="max-w-4xl mx-auto w-full pb-12">

          {/* ========================================================================= */}
          {/* TAB 1: SINGLE CARD (LIKE A WORD DOCUMENT) - RÉSUMÉ ET SOLUTIONS            */}
          {/* ========================================================================= */}
          {activeTab === 'brief' && (
            <div className="bg-white dark:bg-[#282528] rounded-2xl p-7 md:p-9 shadow-xs border border-black/5 dark:border-white/5 text-zinc-800 dark:text-zinc-200 animate-in fade-in duration-150">
              
              {/* Executive Summary (No title, flows naturally like a page) */}
              <div className="space-y-4">
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editOverview}
                      onChange={(e) => setEditOverview(e.target.value)}
                      rows={7}
                      className="w-full p-3 rounded-xl bg-[#F6F5F2] dark:bg-[#1E1B1E] border border-black/5 dark:border-white/5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-[#4F6CE8] leading-relaxed resize-y"
                      placeholder="Saisissez la synthèse..."
                    />
                    <p className="text-[11px] text-zinc-400">
                      Astuce : À l&apos;enregistrement, la synthèse et les solutions sont réalignées avec vos faits édités.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm md:text-[15px] leading-relaxed font-normal whitespace-pre-line text-zinc-800 dark:text-zinc-200">
                    {briefingData.ai_summary?.overview?.text || "Aucune synthèse disponible."}
                  </p>
                )}
              </div>

              {/* Seamless transition within the SAME card */}
              <div className="border-t border-black/5 dark:border-white/5 my-8" />

              {/* Solutions recommandées (Simple title, clean list, NO nested card) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Solutions recommandées
                  </h3>
                  {!isEditing && (
                    <button
                      onClick={() => handleSaveBrief(true)}
                      disabled={isSaving}
                      className="text-xs text-[#4F6CE8] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Icons.RefreshCw size={11} className={isSaving ? "animate-spin" : ""} />
                      <span>{isSaving ? "Réactualisation..." : "Réactualiser"}</span>
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    {editSolutions.map((sol, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-[#F6F5F2] dark:bg-[#1E1B1E] space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <input
                            type="text"
                            value={sol.name}
                            onChange={(e) => {
                              const updated = [...editSolutions];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setEditSolutions(updated);
                            }}
                            placeholder="Nom de l'offre"
                            className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-black/30 border border-black/5 text-xs font-bold outline-none"
                          />
                          <input
                            type="text"
                            value={sol.category}
                            onChange={(e) => {
                              const updated = [...editSolutions];
                              updated[idx] = { ...updated[idx], category: e.target.value };
                              setEditSolutions(updated);
                            }}
                            placeholder="Catégorie"
                            className="w-32 px-2.5 py-1.5 rounded-lg bg-white dark:bg-black/30 border border-black/5 text-xs outline-none"
                          />
                          <button
                            onClick={() => setEditSolutions(editSolutions.filter((_, i) => i !== idx))}
                            className="p-1.5 text-zinc-400 hover:text-rose-500 cursor-pointer"
                            title="Supprimer"
                          >
                            <Icons.Trash2 size={14} />
                          </button>
                        </div>
                        <textarea
                          value={sol.description}
                          onChange={(e) => {
                            const updated = [...editSolutions];
                            updated[idx] = { ...updated[idx], description: e.target.value };
                            setEditSolutions(updated);
                          }}
                          rows={2}
                          placeholder="Description de la solution..."
                          className="w-full p-2.5 rounded-lg bg-white dark:bg-black/30 border border-black/5 text-xs outline-none resize-y"
                        />
                      </div>
                    ))}

                    {/* Auto-completion & Search Input for New Solution */}
                    <div className="p-4 rounded-xl bg-[#F6F5F2] dark:bg-[#1E1B1E] space-y-3 relative">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                          Ajouter une solution Orange
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSearchCatalog(newSolName)}
                          className="text-xs text-[#4F6CE8] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                        >
                          <Icons.Search size={12} />
                          <span>Parcourir le catalogue</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 relative">
                        {/* Auto-completing Input Field */}
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={newSolName}
                            onChange={(e) => {
                              setNewSolName(e.target.value);
                              setShowCatalogSuggestions(true);
                            }}
                            onFocus={() => {
                              if (newSolName.trim().length > 0) setShowCatalogSuggestions(true);
                            }}
                            placeholder="Tapez le nom d'une solution (ex: Fibre, SD-WAN, CyberSOC)..."
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/30 border border-black/5 text-xs outline-none focus:ring-2 focus:ring-[#4F6CE8]"
                          />

                          {/* Search Button Next to Input */}
                          <button
                            type="button"
                            onClick={() => handleSearchCatalog(newSolName)}
                            title="Rechercher dans le catalogue"
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                          >
                            <Icons.Search size={13} />
                          </button>

                          {/* Floating Auto-completion Suggestions Dropdown */}
                          {showCatalogSuggestions && matchingSuggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white dark:bg-[#282528] rounded-xl shadow-lg border border-black/5 dark:border-white/10 max-h-56 overflow-y-auto divide-y divide-black/5 dark:divide-white/5 animate-in fade-in duration-100">
                              {matchingSuggestions.map((item, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => selectCatalogOffer(item)}
                                  className="w-full px-3.5 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-black/20 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                                >
                                  <div>
                                    <div className="text-xs font-bold text-zinc-900 dark:text-white">
                                      {item.name}
                                    </div>
                                    <div className="text-[11px] text-zinc-500 truncate max-w-sm">
                                      {item.description}
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 font-semibold">
                                    {item.category}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <input
                          type="text"
                          value={newSolCategory}
                          onChange={(e) => setNewSolCategory(e.target.value)}
                          placeholder="Catégorie"
                          className="w-32 px-3 py-2.5 rounded-xl bg-white dark:bg-black/30 border border-black/5 text-xs outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newSolDesc}
                          onChange={(e) => setNewSolDesc(e.target.value)}
                          placeholder="Description et valeur ajoutée..."
                          className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-black/30 border border-black/5 text-xs outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newSolName.trim()) {
                              setEditSolutions([
                                ...editSolutions,
                                {
                                  id: String(editSolutions.length + 1),
                                  name: newSolName.trim(),
                                  category: newSolCategory.trim() || 'Orange Business',
                                  description: newSolDesc.trim() || 'Solution adaptée au compte.',
                                  sla: newSolSla || 'SLA 99.9%',
                                },
                              ]);
                              setNewSolName('');
                              setNewSolDesc('');
                              setNewSolCategory('');
                              setShowCatalogSuggestions(false);
                            }
                          }}
                          disabled={!newSolName.trim()}
                          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                        >
                          <Icons.Plus size={13} />
                          <span>Ajouter</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayedSolutions.map((sol, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3.5 border-b border-black/5 dark:border-white/5 last:border-b-0"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-zinc-500 uppercase">
                              {sol.category}
                            </span>
                            <span className="text-[11px] font-bold text-zinc-900 dark:text-white">
                              {sol.name}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            {sol.description}
                          </p>
                        </div>

                        {sol.sla && (
                          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0 self-start sm:self-auto">
                            {sol.sla}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: SINGLE CLEAN CARD - FAITS, VIGILANCE ET MANQUES                    */}
          {/* ========================================================================= */}
          {activeTab === 'details' && (
            <div className="bg-white dark:bg-[#282528] rounded-2xl p-7 md:p-9 shadow-xs border border-black/5 dark:border-white/5 space-y-8 animate-in fade-in duration-150">
              
              {/* Faits clés */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Faits clés
                </h3>

                {isEditing ? (
                  <div className="space-y-2">
                    {editKeyFacts.map((factText, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={factText}
                          onChange={(e) => {
                            const updated = [...editKeyFacts];
                            updated[idx] = e.target.value;
                            setEditKeyFacts(updated);
                          }}
                          className="flex-1 p-2 rounded-lg bg-[#F6F5F2] dark:bg-[#1E1B1E] text-xs outline-none"
                        />
                        <button
                          onClick={() => setEditKeyFacts(editKeyFacts.filter((_, i) => i !== idx))}
                          className="p-1.5 text-zinc-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Icons.Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newFactText}
                        onChange={(e) => setNewFactText(e.target.value)}
                        placeholder="Nouveau fait clé..."
                        className="flex-1 px-3 py-2 rounded-lg bg-[#F6F5F2] dark:bg-[#1E1B1E] text-xs outline-none"
                      />
                      <button
                        onClick={() => {
                          if (newFactText.trim()) {
                            setEditKeyFacts([...editKeyFacts, newFactText.trim()]);
                            setNewFactText('');
                          }
                        }}
                        disabled={!newFactText.trim()}
                        className="px-3 py-2 bg-zinc-900 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                    {(briefingData.ai_summary?.key_facts || []).length > 0 ? (
                      (briefingData.ai_summary?.key_facts || []).map((fact, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0 mt-1.5" />
                          <span className="leading-relaxed">{fact.text}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-zinc-400 italic">Aucun fait clé renseigné.</li>
                    )}
                  </ul>
                )}
              </div>

              <div className="border-t border-black/5 dark:border-white/5" />

              {/* Contradictions & Points de vigilance */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Contradictions & Vigilance
                </h3>

                {isEditing ? (
                  <div className="space-y-2">
                    {editContradictions.map((contraText, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={contraText}
                          onChange={(e) => {
                            const updated = [...editContradictions];
                            updated[idx] = e.target.value;
                            setEditContradictions(updated);
                          }}
                          className="flex-1 p-2 rounded-lg bg-amber-500/10 text-xs outline-none"
                        />
                        <button
                          onClick={() => setEditContradictions(editContradictions.filter((_, i) => i !== idx))}
                          className="p-1.5 text-zinc-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Icons.Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newContraText}
                        onChange={(e) => setNewContraText(e.target.value)}
                        placeholder="Nouveau point de vigilance..."
                        className="flex-1 px-3 py-2 rounded-lg bg-[#F6F5F2] dark:bg-[#1E1B1E] text-xs outline-none"
                      />
                      <button
                        onClick={() => {
                          if (newContraText.trim()) {
                            setEditContradictions([...editContradictions, newContraText.trim()]);
                            setNewContraText('');
                          }
                        }}
                        disabled={!newContraText.trim()}
                        className="px-3 py-2 bg-zinc-900 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(briefingData.ai_summary?.contradictions || []).length > 0 ? (
                      (briefingData.ai_summary?.contradictions || []).map((contra, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                          <Icons.AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                          <p className="leading-relaxed">{contra.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-zinc-500 italic">
                        Aucune divergence d&apos;identité ou vigilance majeure détectée.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-black/5 dark:border-white/5" />

              {/* Informations manquantes */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Informations manquantes
                </h3>

                {isEditing ? (
                  <div className="space-y-2">
                    {editGaps.map((gapText, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={gapText}
                          onChange={(e) => {
                            const updated = [...editGaps];
                            updated[idx] = e.target.value;
                            setEditGaps(updated);
                          }}
                          className="flex-1 p-2 rounded-lg bg-[#F6F5F2] dark:bg-[#1E1B1E] text-xs outline-none"
                        />
                        <button
                          onClick={() => setEditGaps(editGaps.filter((_, i) => i !== idx))}
                          className="p-1.5 text-zinc-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Icons.Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newGapText}
                        onChange={(e) => setNewGapText(e.target.value)}
                        placeholder="Information manquante..."
                        className="flex-1 px-3 py-2 rounded-lg bg-[#F6F5F2] dark:bg-[#1E1B1E] text-xs outline-none"
                      />
                      <button
                        onClick={() => {
                          if (newGapText.trim()) {
                            setEditKeyFacts([...editGaps, newGapText.trim()]);
                            setNewGapText('');
                          }
                        }}
                        disabled={!newGapText.trim()}
                        className="px-3 py-2 bg-zinc-900 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                    {(briefingData.ai_summary?.gaps || []).length > 0 ? (
                      (briefingData.ai_summary?.gaps || []).map((gap, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                          <span className="leading-relaxed">{gap}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-zinc-400 italic">Aucune information manquante critique.</li>
                    )}
                  </ul>
                )}
              </div>

              {/* Minimalist Collapsed Sources Link */}
              {(briefingData.evidence?.length || briefingData.sources?.length) ? (
                <div className="pt-4 border-t border-black/5 dark:border-white/5">
                  <button
                    onClick={() => setShowSourcesDrawer(!showSourcesDrawer)}
                    className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{showSourcesDrawer ? "Masquer les sources" : `Voir les sources (${briefingData.evidence?.length || 0})`}</span>
                    {showSourcesDrawer ? <Icons.ChevronUp size={13} /> : <Icons.ChevronDown size={13} />}
                  </button>

                  {showSourcesDrawer && (
                    <div className="mt-3 space-y-2">
                      {(briefingData.evidence || []).map((item) => (
                        <div key={item.evidence_id} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                          <span className="font-mono text-[10px] text-zinc-400">[{item.evidence_id}]</span>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-blue-600 dark:text-blue-400 truncate max-w-sm inline-flex items-center gap-1"
                          >
                            <span>{item.title || item.publisher}</span>
                            <Icons.ExternalLink size={10} />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

            </div>
          )}

        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* CATALOG SEARCH MODAL (SEARCH BUTTON NEXT TO INPUT)                        */}
      {/* ========================================================================= */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#282528] rounded-2xl w-full max-w-xl p-6 shadow-2xl border border-black/10 dark:border-white/10 space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Icons.Search size={16} className="text-[#4F6CE8]" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Rechercher dans le Catalogue Orange Business
                </h3>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
              >
                <Icons.X size={16} />
              </button>
            </div>

            {/* Modal Search Input */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={catalogModalQuery}
                  onChange={(e) => setCatalogModalQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearchCatalog(catalogModalQuery);
                  }}
                  placeholder="Rechercher (ex: Fibre, SD-WAN, Datacenter, CyberSOC, VoIP)..."
                  className="w-full px-4 py-2.5 pl-9 rounded-xl bg-[#F6F5F2] dark:bg-[#1E1B1E] text-xs outline-none focus:ring-2 focus:ring-[#4F6CE8]"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                  <Icons.Search size={14} />
                </div>
              </div>
              <button
                onClick={() => handleSearchCatalog(catalogModalQuery)}
                disabled={isSearchingCatalog}
                className="px-4 py-2.5 bg-[#4F6CE8] hover:bg-[#3D57C5] text-white text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {isSearchingCatalog ? <Icons.RefreshCw size={13} className="animate-spin" /> : <Icons.Search size={13} />}
                <span>Chercher</span>
              </button>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto divide-y divide-black/5 dark:divide-white/5 space-y-2 pr-1">
              {isSearchingCatalog ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  <Icons.RefreshCw size={20} className="animate-spin text-[#4F6CE8] mx-auto mb-2" />
                  <span>Recherche dans l&apos;index catalogue...</span>
                </div>
              ) : catalogSearchResults.length > 0 ? (
                catalogSearchResults.map((result: any, i: number) => {
                  const offerName = result.nom_offre || result.name || result.titre;
                  const offerCat = result.categorie || result.category || 'Orange Business';
                  const offerDesc = result.description_commerciale || result.description || result.resume || '';
                  const offerSla = result.sla || 'SLA 99.9% · GTR 4h';

                  return (
                    <div
                      key={i}
                      className="p-3 rounded-xl hover:bg-[#F6F5F2] dark:hover:bg-black/20 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">
                            {offerCat}
                          </span>
                          <strong className="text-zinc-900 dark:text-white font-bold">
                            {offerName}
                          </strong>
                        </div>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2">
                          {offerDesc}
                        </p>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
                          {offerSla}
                        </span>
                      </div>

                      <button
                        onClick={() =>
                          selectCatalogOffer({
                            name: offerName,
                            category: offerCat,
                            description: offerDesc,
                            sla: offerSla,
                          })
                        }
                        className="px-3 py-1.5 bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 text-white rounded-lg text-[11px] font-bold cursor-pointer shrink-0 transition-all"
                      >
                        Sélectionner
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-zinc-400">
                  Aucune offre trouvée pour ce terme.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
