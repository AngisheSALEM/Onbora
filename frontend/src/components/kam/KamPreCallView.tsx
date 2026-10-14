"use client";

import React, { useState, useEffect } from 'react';
import { Icons } from '@/components/shared/Icons';
import { StrategicVisit } from './kamTypes';
import { fetchAPI } from '@/lib/api';
import KamAccountSignalsSheet, { AccountRadarDetail } from './KamAccountSignalsSheet';

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
  real_needs?: NeedItem[];
  predicted_needs?: NeedItem[];
  evidence?: EvidenceItem[];
  sources?: DiscoveredSource[];
  installed_offers?: InstalledOfferItem[];
  created_at?: string;
  updated_at?: string;
}

export interface NeedItem {
  need: string;
  source?: string;
  visit_id?: number | string;
  status?: string;
  category?: string;
  reason?: string;
  priority?: string;
}

export interface InstalledOfferItem {
  id: number | string;
  installed_offer_name?: string;
  name?: string;
  category?: string;
  provider?: string;
  provider_label?: string;
  contract_status?: string;
  contract_status_label?: string;
  installation_date?: string | null;
  contract_end_date?: string | null;
  monthly_cost_mrr?: number;
  bandwidth_mbps?: number | null;
  active_licenses_count?: number;
  unresolved_tickets_count?: number;
  technical_equipment?: string;
  created_at?: string;
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
  const [activeTab, setActiveTab] = useState<'brief' | 'details' | 'churn' | 'upsell'>('brief');
  const [radarResult, setRadarResult] = useState<{ accountId: string; data: AccountRadarDetail | null; error?: string } | null>(null);
  const radarData = radarResult?.accountId === selectedAccountId ? radarResult.data : null;
  const hasChurnRisk = !!radarData && ['MEDIUM', 'HIGH', 'CRITICAL'].includes(radarData.risk_level);
  const hasUpsell = !!radarData?.upsell_opportunities?.length;
  const visibleTab = (activeTab === 'churn' && !hasChurnRisk) || (activeTab === 'upsell' && !hasUpsell) ? 'brief' : activeTab;

  useEffect(() => {
    if (!selectedAccountId) return;
    const controller = new AbortController();
    const cleanId = String(selectedAccountId).replace('account-', '');
    fetchAPI(`/api/kam/accounts/${cleanId}/radar/`, { signal: controller.signal })
      .then((data: AccountRadarDetail) => {
        if (!controller.signal.aborted) setRadarResult({ accountId: selectedAccountId, data });
      })
      .catch((err: unknown) => {
        if (
          controller.signal.aborted ||
          (typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError') ||
          (err instanceof Error && (err.name === 'AbortError' || err.message?.toLowerCase().includes('aborted')))
        ) {
          return;
        }
        setRadarResult({ accountId: selectedAccountId, data: null, error: err instanceof Error ? err.message : 'Impossible de charger les signaux du compte.' });
      });
    return () => controller.abort();
  }, [selectedAccountId]);

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

  // Sub-tabs for Solutions: 'recommended' | 'installed'
  const [solutionsTab, setSolutionsTab] = useState<'recommended' | 'installed'>('recommended');
  const [installedOffers, setInstalledOffers] = useState<InstalledOfferItem[]>([]);
  const [loadingInstalled, setLoadingInstalled] = useState(false);
  const [showAddInstalledModal, setShowAddInstalledModal] = useState(false);

  // Form buffers for new installed product modal
  const [newInstalledName, setNewInstalledName] = useState('');
  const [newInstalledCategory, setNewInstalledCategory] = useState('Connectivité');
  const [newInstalledProvider, setNewInstalledProvider] = useState('ORANGE_BUSINESS');
  const [newInstalledStatus, setNewInstalledStatus] = useState('ACTIVE');
  const [newInstalledBandwidth, setNewInstalledBandwidth] = useState('');
  const [newInstalledLicenses, setNewInstalledLicenses] = useState('1');
  const [newInstalledMrr, setNewInstalledMrr] = useState('');
  const [newInstalledEndDate, setNewInstalledEndDate] = useState('');
  const [newInstalledEquipment, setNewInstalledEquipment] = useState('');
  const [isSubmittingInstalled, setIsSubmittingInstalled] = useState(false);

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

  // Charger le briefing et les solutions implantées dès que le compte change
  useEffect(() => {
    if (!selectedAccountId) return;
    fetchBriefing(selectedAccountId);
    fetchInstalledOffers(selectedAccountId);
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
    if (data.installed_offers) {
      setInstalledOffers(data.installed_offers);
    }
  };

  const fetchInstalledOffers = async (accountId: string) => {
    const cleanId = String(accountId).replace('account-', '');
    setLoadingInstalled(true);
    try {
      const data = await fetchAPI(`/api/kam/accounts/${cleanId}/installed-offers/`);
      if (Array.isArray(data)) {
        setInstalledOffers(data);
      }
    } catch (e) {
      console.error('Erreur chargement solutions implantées:', e);
    } finally {
      setLoadingInstalled(false);
    }
  };

  const handleAddInstalledOffer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newInstalledName.trim() || !selectedAccountId) return;
    setIsSubmittingInstalled(true);
    try {
      const cleanId = String(selectedAccountId).replace('account-', '');
      const created = await fetchAPI(`/api/kam/accounts/${cleanId}/installed-offers/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installed_offer_name: newInstalledName.trim(),
          category: newInstalledCategory,
          provider: newInstalledProvider,
          contract_status: newInstalledStatus,
          bandwidth_mbps: newInstalledBandwidth ? parseInt(newInstalledBandwidth, 10) : null,
          active_licenses_count: newInstalledLicenses ? parseInt(newInstalledLicenses, 10) : 1,
          monthly_cost_mrr: newInstalledMrr ? parseFloat(newInstalledMrr) : 0,
          contract_end_date: newInstalledEndDate || null,
          technical_equipment: newInstalledEquipment.trim(),
        }),
      });
      setInstalledOffers((prev) => [created, ...prev]);
      setShowAddInstalledModal(false);
      setNewInstalledName('');
      setNewInstalledBandwidth('');
      setNewInstalledMrr('');
      setNewInstalledEndDate('');
      setNewInstalledEquipment('');
    } catch (err) {
      console.error('Erreur création solution implantée:', err);
    } finally {
      setIsSubmittingInstalled(false);
    }
  };

  const handleDeleteInstalledOffer = async (offerId: string | number) => {
    if (!selectedAccountId) return;
    const cleanId = String(selectedAccountId).replace('account-', '');
    try {
      await fetchAPI(`/api/kam/accounts/${cleanId}/installed-offers/${offerId}/`, {
        method: 'DELETE',
      });
      setInstalledOffers((prev) => prev.filter((o) => o.id !== offerId));
    } catch (err) {
      console.error('Erreur suppression solution implantée:', err);
    }
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
    <div className="flex-1 min-w-0 flex flex-col h-full bg-[#ECEAE5] dark:bg-[#242124] overflow-y-auto p-4 sm:p-6 md:p-10 select-none transition-colors duration-300">
      
      {/* 1. TOP HEADER: ONLY COMPANY NAME & CLEAN ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToAccounts && (
            <button
              onClick={onBackToAccounts}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
              title="Retour aux comptes"
            >
              <Icons.ChevronLeft size={18} />
            </button>
          )}

          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight break-words">
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
        <div className="flex items-center flex-wrap gap-2">
          {briefingData && (visibleTab === 'brief' || visibleTab === 'details') && (
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
              className="primary-cta px-4 py-2 bg-[#4F6CE8] hover:bg-[#3E5AC8] active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
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
            <Icons.RefreshCw size={14} className={isSaving || loading ? "animate-spin text-[#787570]" : ""} />
          </button>

          <button
            onClick={copyBriefingToClipboard}
            disabled={!briefingData}
            title="Copier le document"
            className="p-2 rounded-xl bg-white dark:bg-[#2D2A2D] hover:bg-zinc-100 dark:hover:bg-[#383438] text-zinc-600 dark:text-zinc-300 border border-black/5 dark:border-white/5 cursor-pointer"
          >
            {copied ? <Icons.Check size={14} className="text-zinc-500" /> : <Icons.Copy size={14} />}
          </button>

          {onLaunchMeetingForAccount && (briefingData || currentAccount) && !isEditing && !error && (
            <button
              onClick={() => onLaunchMeetingForAccount(briefingData?.enterprise_id || currentAccount!.account_id || selectedAccountId.replace('account-', ''))}
              className="primary-cta px-4 py-2 bg-[#4F6CE8] hover:bg-[#3E5AC8] active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Icons.Mic size={14} />
              <span>Démarrer RDV</span>
            </button>
          )}
        </div>
      </div>

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="mb-4 p-3 rounded-xl bg-zinc-500/10 border border-zinc-500/20 text-zinc-800 dark:text-zinc-300 text-xs font-medium flex items-center gap-2">
          <Icons.Check size={14} className="text-zinc-600" />
          <span>Synthèse et solutions recommandées mises à jour.</span>
        </div>
      )}

      {saveError && (
        <div className="mb-4 p-3 rounded-xl bg-zinc-500/10 border border-zinc-500/20 text-zinc-800 dark:text-zinc-300 text-xs font-medium flex items-center gap-2">
          <Icons.AlertTriangle size={14} className="text-zinc-600" />
          <span>{saveError}</span>
        </div>
      )}

      {/* 2. DISCREET TABS (Minimalist underline style, zero visual clutter) */}
      {(briefingData || currentAccount || radarData) && (
        <nav aria-label="Sections du compte" className="flex items-center gap-6 overflow-x-auto shrink-0 mb-6">
          <button
            onClick={() => setActiveTab('brief')}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
              visibleTab === 'brief'
                ? 'text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            Synthèse & Solutions
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
              visibleTab === 'details'
                ? 'text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            Faits & Vigilance
          </button>
          {hasChurnRisk && (
            <button type="button" onClick={() => { setActiveTab('churn'); setIsEditing(false); }} aria-current={visibleTab === 'churn' ? 'page' : undefined} className={`pb-3 text-sm font-semibold whitespace-nowrap cursor-pointer ${visibleTab === 'churn' ? 'text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}>Risques de churn</button>
          )}
          {hasUpsell && (
            <button type="button" onClick={() => { setActiveTab('upsell'); setIsEditing(false); }} aria-current={visibleTab === 'upsell' ? 'page' : undefined} className={`pb-3 text-sm font-semibold whitespace-nowrap cursor-pointer ${visibleTab === 'upsell' ? 'text-zinc-900 dark:text-white border-b-2 border-zinc-900 dark:border-white' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}>Opportunités d’upsell</button>
          )}
        </nav>
      )}
      {radarResult?.accountId === selectedAccountId && radarResult.error && <p role="alert" className="mb-4 text-xs text-zinc-600 dark:text-zinc-400">Les risques et opportunités ne sont pas disponibles : {radarResult.error}</p>}

      {/* 3. LOADING & ERROR STATES */}
      {radarData && (visibleTab === 'churn' || visibleTab === 'upsell') ? (
        <KamAccountSignalsSheet data={radarData} kind={visibleTab} />
      ) : loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <Icons.RefreshCw size={28} className="animate-spin text-[#787570] mb-3" />
          <p className="text-xs text-zinc-500">Chargement...</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-[#282528] text-center max-w-md mx-auto my-auto space-y-3 border border-black/5 dark:border-white/5">
          <p className="text-xs text-zinc-500">{error}</p>
          <button
            onClick={() => fetchBriefing(selectedAccountId)}
            className="primary-cta px-4 py-2 bg-[#4F6CE8] text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      ) : briefingData ? (
        <div className="max-w-4xl mx-auto w-full pb-12">

          {/* ========================================================================= */}
          {/* TAB 1: SINGLE CARD (LIKE A WORD DOCUMENT) - RÉSUMÉ ET SOLUTIONS            */}
          {/* ========================================================================= */}
          {visibleTab === 'brief' && (
            <div className="bg-white dark:bg-[#282528] rounded-2xl p-7 md:p-9 shadow-xs border border-black/5 dark:border-white/5 text-zinc-800 dark:text-zinc-200 animate-in fade-in duration-150">
              
              {/* Executive Summary (No title, flows naturally like a page) */}
              <div className="space-y-4">
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editOverview}
                      onChange={(e) => setEditOverview(e.target.value)}
                      rows={7}
                      className="w-full p-3 rounded-xl bg-[#F6F5F2] dark:bg-[#1E1B1E] border border-black/5 dark:border-white/5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-[#9B978F] leading-relaxed resize-y"
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

                {/* Discrete Needs Breakdown : Real Client Needs vs Core AI Inferred Needs */}
                {!isEditing && ((briefingData.real_needs && briefingData.real_needs.length > 0) || (briefingData.predicted_needs && briefingData.predicted_needs.length > 0)) && (
                  <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {briefingData.real_needs && briefingData.real_needs.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-[#F6F5F2] dark:bg-[#1E1B1E] border border-black/5 dark:border-white/5 space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          <Icons.CheckCircle size={13} className="text-zinc-700 dark:text-zinc-300" />
                          <span>Besoins réels confirmés (Terrain)</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {briefingData.real_needs.map((rn, idx) => (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#282528] border border-black/5 dark:border-white/5 text-xs text-zinc-800 dark:text-zinc-200 shadow-2xs"
                              title={rn.source}
                            >
                              <span className="font-medium">{rn.need}</span>
                              {rn.source && (
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">
                                  • {rn.source}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {briefingData.predicted_needs && briefingData.predicted_needs.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-[#F6F5F2] dark:bg-[#1E1B1E] border border-black/5 dark:border-white/5 space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          <Icons.Sparkles size={13} className="text-zinc-700 dark:text-zinc-300" />
                          <span>Besoins anticipés (Core AI)</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {briefingData.predicted_needs.map((pn, idx) => (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#282528] border border-black/5 dark:border-white/5 text-xs text-zinc-800 dark:text-zinc-200 shadow-2xs"
                              title={pn.reason}
                            >
                              <span className="font-medium">{pn.need}</span>
                              {pn.category && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 font-normal">
                                  {pn.category}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Seamless transition within the SAME card */}
              <div className="my-6" />

              {/* Sub-Tabs: Solutions recommandées vs Produits implantés */}
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSolutionsTab('recommended')}
                      className={`pb-2 px-1 text-sm font-bold flex items-center gap-2 transition-colors relative cursor-pointer ${
                        solutionsTab === 'recommended'
                          ? 'text-zinc-900 dark:text-white border-b-2 border-[#4F6CE8]'
                          : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                      }`}
                    >
                      
                      <span>Solutions recommandées</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono font-medium">
                        {displayedSolutions.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSolutionsTab('installed')}
                      className={`pb-2 px-1 text-sm font-bold flex items-center gap-2 transition-colors relative cursor-pointer ${
                        solutionsTab === 'installed'
                          ? 'text-zinc-900 dark:text-white border-b-2 border-[#4F6CE8]'
                          : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                      }`}
                    >
                      
                      <span>Produits implantés</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono font-medium">
                        {installedOffers.length}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {solutionsTab === 'recommended' && !isEditing && (
                      <button
                        type="button"
                        onClick={() => handleSaveBrief(true)}
                        disabled={isSaving}
                        className="text-xs text-[#787570] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Icons.RefreshCw size={11} className={isSaving ? "animate-spin" : ""} />
                        <span>{isSaving ? "Réactualisation..." : "Réactualiser"}</span>
                      </button>
                    )}

                    {solutionsTab === 'installed' && (
                      <button
                        type="button"
                        onClick={() => setShowAddInstalledModal(true)}
                        className="px-3 py-1.5 rounded-lg bg-[#4F6CE8] hover:bg-[#435ec9] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                      >
                        <Icons.Plus size={13} />
                        <span>Ajouter un produit</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-tab 1: Solutions recommandées */}
                {solutionsTab === 'recommended' && (
                  <div>
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
                                className="p-1.5 text-zinc-400 hover:text-zinc-500 cursor-pointer"
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
                              className="text-xs text-[#787570] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
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
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/30 border border-black/5 text-xs outline-none focus:ring-2 focus:ring-[#9B978F]"
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
                                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 shrink-0 font-semibold">
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
                              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 shrink-0 self-start sm:self-auto">
                                {sol.sla}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-tab 2: Produits implantés */}
                {solutionsTab === 'installed' && (
                  <div className="space-y-3">
                    {loadingInstalled ? (
                      <div className="py-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                        <Icons.RefreshCw size={14} className="animate-spin text-[#4F6CE8]" />
                        <span>Chargement des produits implantés...</span>
                      </div>
                    ) : installedOffers.length === 0 ? (
                      <div className="py-8 px-4 rounded-xl border border-dashed border-black/10 dark:border-white/10 text-center space-y-3 bg-[#FBFBFA] dark:bg-[#1C1A1C]">
                        <div className="w-10 h-10 rounded-full bg-[#4F6CE8]/10 text-[#4F6CE8] flex items-center justify-center mx-auto">
                          <Icons.Layers size={18} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">
                            Aucun produit implanté répertorié
                          </p>
                          <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                            Référencez les solutions actives chez ce client ou enregistrez un compte-rendu de visite mentionnant un contrat signé pour une mise à jour automatique.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddInstalledModal(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#282528] border border-black/10 dark:border-white/10 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:border-[#4F6CE8] transition-colors cursor-pointer"
                        >
                          <Icons.Plus size={13} className="text-[#4F6CE8]" />
                          <span>Ajouter le premier produit</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {installedOffers.map((offer) => {
                          const isOrange = offer.provider === 'ORANGE_BUSINESS';
                          const statusLabels: Record<string, { label: string; color: string }> = {
                            ACTIVE: { label: 'En service', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
                            DEPLOYING: { label: 'En déploiement', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
                            PENDING_RENEWAL: { label: 'À renouveler', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
                            TERMINATED: { label: 'Résilié', color: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20' },
                          };
                          const statusKey = offer.contract_status || 'ACTIVE';
                          const statusInfo = statusLabels[statusKey] || {
                            label: statusKey,
                            color: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
                          };

                          return (
                            <div
                              key={offer.id}
                              className="p-3.5 rounded-xl bg-[#F6F5F2] dark:bg-[#1E1B1E] border border-black/5 dark:border-white/5 flex flex-col gap-2.5 transition-all"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                        isOrange
                                          ? 'bg-[#4F6CE8]/10 text-[#4F6CE8] border-[#4F6CE8]/20'
                                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'
                                      }`}
                                    >
                                      {isOrange ? 'Orange Business' : (offer.provider || 'Opérateur tiers')}
                                    </span>
                                    <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                                      {offer.category}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${statusInfo.color}`}>
                                      {statusInfo.label}
                                    </span>
                                  </div>
                                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                                    {offer.installed_offer_name}
                                  </h4>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteInstalledOffer(offer.id)}
                                  title="Supprimer ce produit implanté"
                                  className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Icons.Trash2 size={13} />
                                </button>
                              </div>

                              {/* Attributes Row */}
                              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-zinc-600 dark:text-zinc-400 border-t border-black/5 dark:border-white/5">
                                {offer.bandwidth_mbps && (
                                  <span className="flex items-center gap-1 font-mono font-medium">
                                    <Icons.Activity size={12} className="text-[#4F6CE8]" />
                                    <span>{offer.bandwidth_mbps} Mbps</span>
                                  </span>
                                )}
                                {offer.monthly_cost_mrr && Number(offer.monthly_cost_mrr) > 0 && (
                                  <span className="flex items-center gap-1 font-mono font-medium">
                                    <Icons.FileText size={12} className="text-zinc-400" />
                                    <span>{Number(offer.monthly_cost_mrr).toLocaleString('fr-FR')} €/mois</span>
                                  </span>
                                )}
                                {offer.active_licenses_count && offer.active_licenses_count > 1 && (
                                  <span className="flex items-center gap-1">
                                    <Icons.Users size={12} className="text-zinc-400" />
                                    <span>{offer.active_licenses_count} licences</span>
                                  </span>
                                )}
                                {offer.contract_end_date && (
                                  <span className="flex items-center gap-1">
                                    <Icons.Calendar size={12} className="text-zinc-400" />
                                    <span>Échéance : {offer.contract_end_date}</span>
                                  </span>
                                )}
                                {offer.technical_equipment && (
                                  <span className="flex items-center gap-1 text-zinc-500 truncate max-w-xs" title={offer.technical_equipment}>
                                    <Icons.Server size={12} className="text-zinc-400" />
                                    <span className="truncate">{offer.technical_equipment}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: SINGLE CLEAN CARD - FAITS, VIGILANCE ET MANQUES                    */}
          {/* ========================================================================= */}
          {visibleTab === 'details' && (
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
                          className="p-1.5 text-zinc-400 hover:text-zinc-500 cursor-pointer"
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
                          className="p-1.5 text-zinc-400 hover:text-zinc-500 cursor-pointer"
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
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0 mt-1.5" />
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
                            className="hover:underline text-zinc-600 dark:text-zinc-400 truncate max-w-sm inline-flex items-center gap-1"
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
                <Icons.Search size={16} className="text-[#787570]" />
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
                  className="w-full px-4 py-2.5 pl-9 rounded-xl bg-[#F6F5F2] dark:bg-[#1E1B1E] text-xs outline-none focus:ring-2 focus:ring-[#9B978F]"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                  <Icons.Search size={14} />
                </div>
              </div>
              <button
                onClick={() => handleSearchCatalog(catalogModalQuery)}
                disabled={isSearchingCatalog}
                className="px-4 py-2.5 bg-[#55524E] hover:bg-[#55524E] text-white text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {isSearchingCatalog ? <Icons.RefreshCw size={13} className="animate-spin" /> : <Icons.Search size={13} />}
                <span>Chercher</span>
              </button>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto divide-y divide-black/5 dark:divide-white/5 space-y-2 pr-1">
              {isSearchingCatalog ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  <Icons.RefreshCw size={20} className="animate-spin text-[#787570] mx-auto mb-2" />
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
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 font-semibold">
                            {offerCat}
                          </span>
                          <strong className="text-zinc-900 dark:text-white font-bold">
                            {offerName}
                          </strong>
                        </div>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2">
                          {offerDesc}
                        </p>
                        <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium block">
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
                        className="px-3 py-1.5 bg-[#55524E] hover:bg-[#55524E] active:scale-95 text-white rounded-lg text-[11px] font-bold cursor-pointer shrink-0 transition-all"
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

      {/* Modal: Ajouter un produit implanté */}
      {showAddInstalledModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1E1B1E] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-black/10 dark:border-white/10 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 border-b border-black/5 dark:border-white/5 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Icons.Plus size={16} className="text-[#4F6CE8]" />
                  <span>Ajouter un produit implanté</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Référencez une solution actuellement déployée ou en service chez ce compte.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddInstalledModal(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
                title="Fermer"
              >
                <Icons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddInstalledOffer} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Nom de la solution ou offre *
                </label>
                <input
                  type="text"
                  required
                  value={newInstalledName}
                  onChange={(e) => setNewInstalledName(e.target.value)}
                  placeholder="Ex : Connect Entreprise Fibre 1Gbps, Business VPN..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F6F5F2] dark:bg-black/30 border border-black/5 dark:border-white/5 text-xs text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-[#4F6CE8]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Fournisseur
                  </label>
                  <select
                    value={newInstalledProvider}
                    onChange={(e) => setNewInstalledProvider(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F6F5F2] dark:bg-black/30 border border-black/5 dark:border-white/5 text-xs text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-[#4F6CE8]"
                  >
                    <option value="ORANGE_BUSINESS">Orange Business</option>
                    <option value="COMPETITOR">Opérateur tiers / Concurrent</option>
                    <option value="INTERNAL">Solution interne client</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Catégorie
                  </label>
                  <select
                    value={newInstalledCategory}
                    onChange={(e) => setNewInstalledCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F6F5F2] dark:bg-black/30 border border-black/5 dark:border-white/5 text-xs text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-[#4F6CE8]"
                  >
                    <option value="Connectivité">Connectivité & Réseaux</option>
                    <option value="Cybersécurité">Cybersécurité</option>
                    <option value="Cloud & Data">Cloud & Datacenter</option>
                    <option value="Collaboration">Collaboration & Voix</option>
                    <option value="Mobilité">Mobilité Entreprise</option>
                    <option value="Sur-mesure">Offre Sur-Mesure</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Statut du contrat
                  </label>
                  <select
                    value={newInstalledStatus}
                    onChange={(e) => setNewInstalledStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F6F5F2] dark:bg-black/30 border border-black/5 dark:border-white/5 text-xs text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-[#4F6CE8]"
                  >
                    <option value="ACTIVE">En service (Actif)</option>
                    <option value="DEPLOYING">En cours de déploiement</option>
                    <option value="PENDING_RENEWAL">À renouveler / Proche échéance</option>
                    <option value="TERMINATED">Résilié</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Débit (Mbps)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newInstalledBandwidth}
                    onChange={(e) => setNewInstalledBandwidth(e.target.value)}
                    placeholder="Ex : 1000"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F6F5F2] dark:bg-black/30 border border-black/5 dark:border-white/5 text-xs text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-[#4F6CE8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Coût mensuel (MRR en €)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newInstalledMrr}
                    onChange={(e) => setNewInstalledMrr(e.target.value)}
                    placeholder="Ex : 1450"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F6F5F2] dark:bg-black/30 border border-black/5 dark:border-white/5 text-xs text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-[#4F6CE8]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Postes / Licences
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newInstalledLicenses}
                    onChange={(e) => setNewInstalledLicenses(e.target.value)}
                    placeholder="Ex : 50"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F6F5F2] dark:bg-black/30 border border-black/5 dark:border-white/5 text-xs text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-[#4F6CE8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Échéance contrat
                  </label>
                  <input
                    type="date"
                    value={newInstalledEndDate}
                    onChange={(e) => setNewInstalledEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F6F5F2] dark:bg-black/30 border border-black/5 dark:border-white/5 text-xs text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-[#4F6CE8]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Équipements & CPE
                  </label>
                  <input
                    type="text"
                    value={newInstalledEquipment}
                    onChange={(e) => setNewInstalledEquipment(e.target.value)}
                    placeholder="Ex : Routeur Cisco ISR 4331, ONT..."
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F6F5F2] dark:bg-black/30 border border-black/5 dark:border-white/5 text-xs text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-[#4F6CE8]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddInstalledModal(false)}
                  disabled={isSubmittingInstalled}
                  className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInstalled || !newInstalledName.trim()}
                  className="px-4 py-2 rounded-xl bg-[#4F6CE8] hover:bg-[#435ec9] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingInstalled ? (
                    <Icons.RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Icons.Check size={13} />
                  )}
                  <span>{isSubmittingInstalled ? "Enregistrement..." : "Ajouter le produit"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
