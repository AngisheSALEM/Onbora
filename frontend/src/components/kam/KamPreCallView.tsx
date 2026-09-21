"use client";

import React, { useState, useEffect } from 'react';
import { Icons } from '@/components/shared/Icons';
import { StrategicVisit } from './kamTypes';

interface DecisionMaker {
  role: string;
  name: string;
  profile_type: string;
  concerns: string;
  influence: string;
}

interface PitchAngle {
  target_offer: string;
  why_relevant: string;
  hook_sentence: string;
}

interface PreCallData {
  id: number;
  enterprise_id: number;
  enterprise_name: string;
  company_overview: {
    company_name: string;
    summary: string;
    estimated_employees: string;
    estimated_sites: number;
    annual_revenue_usd: string;
    digital_maturity: string;
    telecom_budget_monthly_usd: number;
  };
  key_decision_makers: DecisionMaker[];
  detected_business_challenges: string[];
  custom_pitch_angles: PitchAngle[];
  critical_discovery_questions: string[];
  golden_rules: string[];
  created_at: string;
  updated_at: string;
}

import { fetchAPI } from '@/lib/api';

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
  const [briefingData, setBriefingData] = useState<PreCallData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enrichment State
  const [enrichmentData, setEnrichmentData] = useState<any>(null);
  const [enriching, setEnriching] = useState(false);

  const handleEnrich = async () => {
    if (!briefingData) return;
    setEnriching(true);
    try {
      const res = await fetchAPI('/api/ai/sales-enrichment/', {
        method: 'POST',
        body: JSON.stringify({
          company_name: briefingData.enterprise_name,
          sector: briefingData.company_overview?.summary || 'Inconnu',
          website: ''
        })
      });
      setEnrichmentData(res);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enrichissement depuis le Web");
    } finally {
      setEnriching(false);
    }
  };

  // RAG Catalog Explorer State
  const [ragQuery, setRagQuery] = useState('Fibre Dédiée');
  const [ragResults, setRagResults] = useState<any[]>([]);
  const [ragSearching, setRagSearching] = useState(false);
  const [copiedRagPackage, setCopiedRagPackage] = useState<string | null>(null);

  const searchRagCatalog = async (queryText: string) => {
    if (!queryText.trim()) return;
    setRagSearching(true);
    try {
      const res = await fetchAPI('/api/ai/catalog/search/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText, limit: 3 }),
      });
      if (res && Array.isArray(res.results)) {
        setRagResults(res.results);
      }
    } catch (e) {
      console.warn("Erreur recherche RAG catalogue:", e);
    } finally {
      setRagSearching(false);
    }
  };

  useEffect(() => {
    searchRagCatalog(ragQuery);
  }, []);

  // Synchroniser si initialAccountId change depuis le parent
  useEffect(() => {
    if (initialAccountId && String(initialAccountId) !== selectedAccountId) {
      setSelectedAccountId(String(initialAccountId));
    }
  }, [initialAccountId]);

  // Charger le briefing dès que le compte sélectionné change
  useEffect(() => {
    if (!selectedAccountId) return;
    fetchBriefing(selectedAccountId);
  }, [selectedAccountId]);

  const fetchBriefing = async (accountId: string, forceRegenerate = false) => {
    setLoading(true);
    setError(null);
    setEnrichmentData(null);
    try {
      const cleanId = String(accountId).replace('account-', '');
      const method = forceRegenerate ? 'POST' : 'GET';
      const data = await fetchAPI(`/api/kam/pre-call/${cleanId}/`, { method });
      setBriefingData(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur de connexion au serveur.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const copyBriefingToClipboard = () => {
    if (!briefingData) return;
    const text = `=== BRIEFING PRE-CALL COMMERCIAL : ${briefingData.enterprise_name} ===
Date : ${briefingData.updated_at}

1. VUE D'ENSEMBLE
${briefingData.company_overview.summary}
Effectif : ${briefingData.company_overview.estimated_employees}
Budget télécom estimé : ${briefingData.company_overview.telecom_budget_monthly_usd} USD/mois

2. DÉCIDEURS CLÉS
${briefingData.key_decision_makers.map(d => `- ${d.role} (${d.name}) : ${d.concerns}`).join('\n')}

3. ENJEUX BUSINESS
${briefingData.detected_business_challenges.map((c, i) => `${i + 1}. ${c}`).join('\n')}

4. ANGLES D'ATTAQUE CATALOGUE
${briefingData.custom_pitch_angles.map(p => `• Offre : ${p.target_offer}\n  Pourquoi : ${p.why_relevant}\n  Accroche : "${p.hook_sentence}"`).join('\n\n')}

5. QUESTIONS INDISPENSABLES (DISCOVERY)
${briefingData.critical_discovery_questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

6. RÈGLES D'OR
${briefingData.golden_rules.map(r => `! ${r}`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#ECEAE5] dark:bg-[#242124] overflow-y-auto p-6 md:p-8 select-none transition-colors duration-300">
      
      {/* 1. TOP SELECTOR & HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-4">
          {onBackToAccounts && (
            <button
              onClick={onBackToAccounts}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#E4E1DB] dark:bg-[#363336] hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer shadow-none active:scale-95 shrink-0"
              title="Retour au portefeuille des comptes"
            >
              <Icons.ChevronLeft size={16} />
            
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">

            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {briefingData?.enterprise_name ? briefingData.enterprise_name : "Préparation Stratégique Avant Rendez-vous"}
            </h2>
          </div>
        </div>

        {/* Account Selector & Action Buttons */}
        <div className="flex items-center gap-3">
         
          <button
            onClick={() => fetchBriefing(selectedAccountId, true)}
            disabled={loading}
            title="Régénérer le briefing avec les dernières données du compte"
            className="p-2.5 bg-[#FFFFFF] dark:bg-[#2F2C30] hover:bg-[#ECEAE5] dark:hover:bg-[#3B373D] text-zinc-700 dark:text-zinc-200 rounded-2xl transition-colors cursor-pointer"
          >
            <Icons.RefreshCw size={16} className={loading ? "animate-spin text-[#4F6CE8]" : ""} />
          </button>

          <button
            onClick={copyBriefingToClipboard}
            disabled={!briefingData}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 text-white text-xs font-semibold rounded-2xl transition-all shadow-none cursor-pointer"
          >
            {copied ? <Icons.Check size={14} /> : <Icons.Copy size={14} />}
            <span>{copied ? "Briefing copié !" : "Copier la fiche"}</span>
          </button>

          <button
            onClick={handleEnrich}
            disabled={!briefingData || enriching}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 active:scale-95 text-white text-xs font-semibold rounded-2xl transition-all shadow-none cursor-pointer disabled:opacity-50"
          >
            <Icons.Globe size={14} className={enriching ? "animate-spin" : ""} />
            <span>{enriching ? "Enrichissement..." : "Enrichir depuis le Web"}</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN BRIEFING CONTENT */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <Icons.Sparkles size={36} className="animate-spin text-[#4F6CE8] mb-4" />
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
            Génération du dossier d&apos;attaque en cours...
          </h4>
          <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
            Analyse des décideurs, détection des enjeux et matching avec les offres Orange.
          </p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-3xl bg-[#FFFFFF] dark:bg-[#2F2C30] text-center max-w-md mx-auto my-auto space-y-3">
          <Icons.AlertTriangle size={32} className="text-[#EF4444] mx-auto" />
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Dossier indisponible</h4>
          <p className="text-xs text-zinc-500">{error}</p>
          <button
            onClick={() => fetchBriefing(selectedAccountId)}
            className="px-4 py-2 bg-[#4F6CE8] text-white rounded-xl text-xs font-semibold"
          >
            Réessayer
          </button>
        </div>
      ) : briefingData ? (
        <div className="space-y-6 max-w-6xl">

          {/* ENRICHMENT PANEL */}
          {enrichmentData && (
            <div className="p-6 rounded-[28px] bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Icons.Globe size={18} className="text-[#4F6CE8]" />
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Données enrichies depuis le Web
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Aperçu</h4>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{enrichmentData.company_overview}</p>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Hypothèses Commerciales</h4>
                    <ul className="list-disc pl-4 text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
                      {enrichmentData.commercial_hypotheses?.map((h: string, i: number) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Pitch Adapté</h4>
                    <div className="p-3 rounded-xl bg-white dark:bg-black/20 text-xs font-medium text-zinc-900 dark:text-white italic border border-black/5 dark:border-white/5">
                      "{enrichmentData.tailored_pitch}"
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Questions Stratégiques</h4>
                    <ul className="list-decimal pl-4 text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
                      {enrichmentData.strategic_questions?.map((q: string, i: number) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Card 1: Overview & Metrics */}
          <div className="p-6 rounded-[28px] bg-[#FFFFFF] dark:bg-[#2F2C30] shadow-none space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-black/5 dark:border-white/5">
              <div>
                <span className="text-[11px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
                  Profil Entreprise & Infrastructure
                </span>
                <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">
                  {briefingData.enterprise_name}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-xl bg-black/5 dark:bg-white/5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {briefingData.company_overview.estimated_employees}
                </div>
                <div className="px-3 py-1 rounded-xl bg-black/5 dark:bg-white/5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {briefingData.company_overview.estimated_sites} site(s) raccordé(s)
                </div>
                <div className="px-3 py-1 rounded-xl bg-[#4F6CE8]/10 text-[#4F6CE8] text-xs font-bold">
                  Budget : ~{briefingData.company_overview.telecom_budget_monthly_usd} USD/mois
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {briefingData.company_overview.summary}
            </p>
          </div>

          {/* Card 2: Décideurs Clés (DSI, RSSI, DAF) */}
          <div className="p-6 rounded-[28px] bg-[#FFFFFF] dark:bg-[#2F2C30] shadow-none space-y-4">
            <div className="flex items-center gap-2">
              <Icons.Users size={18} className="text-[#4F6CE8]" />
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider">
                Cartographie des Décideurs à Rencontrer
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {briefingData.key_decision_makers.map((dec, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[#ECEAE5] dark:bg-[#3B373D] space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 uppercase">
                        {dec.influence === 'DECISION_MAKER' ? 'Décideur Clé' : dec.influence === 'ECONOMIC_BUYER' ? 'Signataire DAF' : 'Influenceur'}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                      {dec.role}
                    </h4>
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-2">
                      {dec.name}
                    </span>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-normal">
                      <strong>Sensible à :</strong> {dec.concerns}
                    </p>
                  </div>
                  <div className="pt-2 text-[10px] font-semibold text-[#4F6CE8]">
                    Profil : {dec.profile_type}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Angles d'Attaque & Argumentaire Catalogue Orange */}
          <div className="p-6 rounded-[28px] bg-[#FFFFFF] dark:bg-[#2F2C30] shadow-none space-y-4">
            <div className="flex items-center gap-2">
              <Icons.Award size={18} className="text-[#4F6CE8]" />
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider">
                Angles d&apos;Attaque Ciblés (Catalogue Orange B2B)
              </h3>
            </div>

            <div className="space-y-3">
              {briefingData.custom_pitch_angles.map((angle, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[#ECEAE5] dark:bg-[#3B373D] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-zinc-900 dark:text-white">
                      {angle.target_offer}
                    </h4>
                    <span className="text-[10px] font-bold text-[#4F6CE8] uppercase tracking-wider">
                      Argumentaire Dédié
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    <strong>Pourquoi cette offre :</strong> {angle.why_relevant}
                  </p>
                  <div className="p-3 rounded-xl bg-black/5 dark:bg-black/20 text-xs font-medium text-zinc-900 dark:text-white italic">
                    Phrase d&apos;accroche recommandée : &ldquo;{angle.hook_sentence}&rdquo;
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3bis: Moteur RAG Catalogue Orange Business B2B */}
          <div className="p-6 rounded-[28px] bg-[#FFFFFF] dark:bg-[#2F2C30] shadow-none space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Icons.Layers size={18} className="text-[#4F6CE8]" />
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Recherche dans le  Catalogue Orange B2B en Direct
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>TF-IDF Inversé (&lt; 2ms)</span>
              </span>
            </div>

            {/* Search Input & Quick Keyword Chips */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') searchRagCatalog(ragQuery);
                    }}
                    placeholder="Rechercher une offre (ex: Fibre 100M, SD-WAN, Cloud, CyberSOC)..."
                    className="w-full px-4 py-2.5 pl-9 rounded-2xl bg-[#ECEAE5] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 text-xs text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#4F6CE8]"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                    <Icons.Search size={14} />
                  </div>
                </div>
                <button
                  onClick={() => searchRagCatalog(ragQuery)}
                  disabled={ragSearching}
                  className="px-4 py-2.5 bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 text-white text-xs font-semibold rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Icons.Sparkles size={14} className={ragSearching ? "animate-spin" : ""} />
                  <span>Rechercher</span>
                </button>
              </div>

              {/* Quick suggestion chips */}
              <div className="flex flex-wrap gap-1.5">
                {["Fibre Dédiée Pro", "SD-WAN Managé", "CyberSOC 24/7", "Cloud Backup", "IP VPN", "GTR 4h"].map((keyword, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setRagQuery(keyword);
                      searchRagCatalog(keyword);
                    }}
                    className="px-2.5 py-1 bg-[#ECEAE5] dark:bg-[#1C1C1E] hover:bg-white dark:hover:bg-[#3B373D] text-zinc-700 dark:text-zinc-300 text-[11px] font-medium rounded-lg border border-black/5 dark:border-white/5 transition-all cursor-pointer"
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>

            {/* RAG Results Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {ragResults.length > 0 ? (
                ragResults.map((result: any, idx: number) => {
                  const isCopied = copiedRagPackage === (result.id || String(idx));
                  return (
                    <div
                      key={result.id || idx}
                      className="p-4 rounded-2xl bg-[#ECEAE5] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 flex flex-col justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                            {result.categorie || 'Orange Business'}
                          </span>
                          {result.score !== undefined && (
                            <span className="text-[10px] font-mono text-zinc-400">
                              Pertinence: {(result.score * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>

                        <h4 className="font-extrabold text-zinc-900 dark:text-white leading-tight">
                          {result.nom_offre || result.titre}
                        </h4>

                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {result.description_commerciale || result.resume}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                        <div className="text-[11px]">
                          <span className="font-bold text-zinc-900 dark:text-white block">
                            {result.tarification || 'Sur devis'}
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            {result.sla || 'SLA 99.9%'}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            const snippet = `Offre Orange : ${result.nom_offre || result.titre} (${result.tarification || 'Sur devis'}) - SLA : ${result.sla || 'GTR 4h'} - ${result.description_commerciale || ''}`;
                            navigator.clipboard.writeText(snippet);
                            setCopiedRagPackage(result.id || String(idx));
                            setTimeout(() => setCopiedRagPackage(null), 2000);
                          }}
                          className="px-2.5 py-1 bg-white dark:bg-[#2F2C30] hover:bg-[#4F6CE8] hover:text-white text-zinc-700 dark:text-zinc-200 rounded-lg text-[10px] font-semibold transition-all cursor-pointer border border-black/5 dark:border-white/5"
                        >
                          {isCopied ? "Copié !" : "Copier"}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="md:col-span-3 text-center py-4 text-xs text-zinc-400 italic">
                  Aucune offre ne correspond à cette recherche. Essayez un autre mot-clé.
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Questions d'Audit Stratégiques (Discovery) */}
          <div className="p-6 rounded-[28px] bg-[#FFFFFF] dark:bg-[#2F2C30] shadow-none space-y-4">
            <div className="flex items-center gap-2">
              <Icons.HelpCircle size={18} className="text-[#4F6CE8]" />
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider">
                5 Questions Clés à Poser Pendant le Rendez-vous
              </h3>
            </div>

            <div className="space-y-2.5">
              {briefingData.critical_discovery_questions.map((q, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#ECEAE5] dark:bg-[#3B373D]"
                >
                  <div className="w-5 h-5 rounded-full bg-[#4F6CE8] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-xs font-medium text-zinc-900 dark:text-white leading-relaxed">
                    {q}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 5: Règles d'Or pour le KAM */}
          <div className="p-6 rounded-[28px] bg-[#FFFFFF] dark:bg-[#2F2C30] shadow-none space-y-3">
            <div className="flex items-center gap-2">
              <Icons.Shield size={18} className="text-[#4F6CE8]" />
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider">
                Règles d&apos;Or de Négociation
              </h3>
            </div>
            <ul className="space-y-2">
              {briefingData.golden_rules.map((rule, idx) => (
                <li
                  key={idx}
                  className="text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F6CE8] shrink-0" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom Action Footer */}
          {onLaunchMeetingForAccount && (
            <div className="flex justify-end pt-4">
              <button
                onClick={() => onLaunchMeetingForAccount(briefingData.enterprise_id)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#4F6CE8] hover:bg-[#3D57C5] text-white text-xs font-bold rounded-2xl shadow-none cursor-pointer transition-all"
              >
                <Icons.Mic size={16} />
                <span>Démarrer le rendez-vous & Enregistrement</span>
              </button>
            </div>
          )}

        </div>
      ) : null}

    </div>
  );
}
