"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import Logo from '@/components/shared/Logo';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { Icons } from '@/components/shared/Icons';
import { fetchAPI } from '@/lib/api';

interface ProfileOption {
  id: number;
  name: string;
  score_type: string;
  base_score: number;
}

interface EnterpriseOption {
  id: number;
  name: string;
  sector?: string;
  city?: string;
}

interface SimulationResult {
  score: number;
  base_score: number;
  status_label: string;
  status_color: string;
  triggered_action: string;
  triggered_rules: {
    id: number;
    name: string;
    dimension: string;
    points: number;
    points_formatted: string;
    field: string;
    value_observed: any;
  }[];
  dimension_scores: Record<string, number>;
  profile_name: string;
  source_label: string;
}

const SITUATION_TRANSLATIONS: Record<string, { label: string; positive: boolean }> = {
  "new_site_project_detected": { label: "Nouveau site ou agence prévu", positive: true },
  "explicit_need_detected": { label: "Besoin technique clairement exprimé", positive: true },
  "quote_requested": { label: "Demande de devis ou d'étude", positive: true },
  "expansion_project_mentioned": { label: "Projet d’expansion identifié", positive: true },
  "decision_maker_identified": { label: "Décideur impliqué dans les échanges", positive: true },
  "champion_identified": { label: "Contact référent principal actif", positive: true },
  "multisite_client": { label: "Client multi-sites", positive: true },
  "multiple_active_contacts": { label: "Plusieurs interlocuteurs joignables", positive: true },
  "recent_meeting_report_added": { label: "Compte rendu de réunion récent", positive: true },
  "positive_feedback_detected": { label: "Satisfaction exprimée par le client", positive: true },
  "future_meeting_next_14d": { label: "Réunion planifiée sous 14 jours", positive: true },
  "active_opportunity_recent_update": { label: "Opportunité commerciale active", positive: true },
  "budget_known": { label: "Budget télécom / CA renseigné", positive: true },
  "issue_resolved": { label: "Incident déclaré résolu", positive: true },
  "competitor_mentioned": { label: "Concurrent déjà retenu ou mentionné", positive: false },
  "opportunity_lost_recently": { label: "Opportunité perdue récemment", positive: false },
  "opportunity_stale_60d": { label: "Opportunité sans avancée depuis 60j", positive: false },
  "unanswered_followups": { label: "Plusieurs relances sans réponse", positive: false },
  "has_overdue_tasks": { label: "Actions de suivi en retard", positive: false },
  "no_contacts_associated": { label: "Aucun contact associé", positive: false },
  "complaint_noted": { label: "Réclamation ou incident technique noté", positive: false },
  "explicit_dissatisfaction": { label: "Insatisfaction critique exprimée", positive: false },
  "unresolved_issue_30d": { label: "Incident non résolu depuis plus de 30j", positive: false },
  "days_since_last_meeting": { label: "Délai important depuis le dernier contact", positive: false },
  "no_decision_maker_interaction_90d": { label: "Aucun échange avec le décideur depuis 90j", positive: false },
};

export default function ScoringLabPage() {
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [enterprises, setEnterprises] = useState<EnterpriseOption[]>([]);
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<number | null>(null);
  const [activeMode, setActiveMode] = useState<'sandbox' | 'real_account'>('sandbox');
  
  // Paramètres de simulation interactifs en langage métier
  const [metrics, setMetrics] = useState<Record<string, any>>({
    days_since_last_meeting: 15,
    unanswered_followups: 0,
    has_overdue_tasks: false,
    future_meeting_next_14d: true,
    recent_meeting_report_added: true,
    decision_maker_identified: true,
    champion_identified: true,
    multiple_active_contacts: true,
    no_contacts_associated: false,
    active_opportunity_recent_update: true,
    quote_requested: true,
    explicit_need_detected: true,
    new_site_project_detected: true,
    expansion_project_mentioned: true,
    multisite_client: true,
    budget_known: true,
    competitor_mentioned: false,
    opportunity_lost_recently: false,
    opportunity_stale_60d: false,
    positive_feedback_detected: true,
    explicit_dissatisfaction: false,
    complaint_noted: false,
    issue_resolved: true,
    unresolved_issue_30d: false,
  });

  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    async function initLab() {
      try {
        setInitialLoading(true);
        const [profilesData, entData] = await Promise.all([
          fetchAPI('/api/sales/scoring/profiles/'),
          fetchAPI('/api/sales/enterprises/'),
        ]);

        const pList = Array.isArray(profilesData) ? profilesData : profilesData.results || [];
        setProfiles(pList);
        if (pList.length > 0) {
          setSelectedProfileId(pList[0].id);
        }

        const eList = Array.isArray(entData) ? entData : entData.results || [];
        setEnterprises(eList);
        if (eList.length > 0) {
          setSelectedEnterpriseId(eList[0].id);
        }
      } catch (err) {
        console.error("Erreur init scoring lab:", err);
      } finally {
        setInitialLoading(false);
      }
    }
    initLab();
  }, []);

  const runSimulation = useCallback(async () => {
    if (!selectedProfileId) return;
    setLoading(true);
    try {
      const payload: any = {
        profile_id: selectedProfileId,
      };

      if (activeMode === 'real_account' && selectedEnterpriseId) {
        payload.enterprise_id = selectedEnterpriseId;
      } else {
        payload.simulated_metrics = metrics;
      }

      const res = await fetchAPI('/api/sales/scoring/simulate/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setSimResult(res);
    } catch (err) {
      console.error("Erreur simulation:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedProfileId, activeMode, selectedEnterpriseId, metrics]);

  useEffect(() => {
    if (selectedProfileId) {
      runSimulation();
    }
  }, [selectedProfileId, activeMode, selectedEnterpriseId, metrics, runSimulation]);

  const updateMetric = (key: string, value: any) => {
    setMetrics((prev) => ({ ...prev, [key]: value }));
  };

  // Présets en un clic
  const loadPreset = (type: 'expansion_prime' | 'churn_risk' | 'neutral_followup') => {
    if (type === 'expansion_prime') {
      setMetrics({
        days_since_last_meeting: 10,
        unanswered_followups: 0,
        has_overdue_tasks: false,
        future_meeting_next_14d: true,
        recent_meeting_report_added: true,
        decision_maker_identified: true,
        champion_identified: true,
        multiple_active_contacts: true,
        no_contacts_associated: false,
        active_opportunity_recent_update: true,
        quote_requested: true,
        explicit_need_detected: true,
        new_site_project_detected: true,
        expansion_project_mentioned: true,
        multisite_client: true,
        budget_known: true,
        competitor_mentioned: false,
        opportunity_lost_recently: false,
        opportunity_stale_60d: false,
        positive_feedback_detected: true,
        explicit_dissatisfaction: false,
        complaint_noted: false,
        issue_resolved: true,
        unresolved_issue_30d: false,
      });
    } else if (type === 'churn_risk') {
      setMetrics({
        days_since_last_meeting: 95,
        unanswered_followups: 3,
        has_overdue_tasks: true,
        future_meeting_next_14d: false,
        recent_meeting_report_added: false,
        decision_maker_identified: false,
        champion_identified: false,
        multiple_active_contacts: false,
        no_contacts_associated: false,
        active_opportunity_recent_update: false,
        quote_requested: false,
        explicit_need_detected: false,
        new_site_project_detected: false,
        expansion_project_mentioned: false,
        multisite_client: false,
        budget_known: false,
        competitor_mentioned: true,
        opportunity_lost_recently: true,
        opportunity_stale_60d: true,
        positive_feedback_detected: false,
        explicit_dissatisfaction: true,
        complaint_noted: true,
        issue_resolved: false,
        unresolved_issue_30d: true,
      });
    } else {
      setMetrics({
        days_since_last_meeting: 40,
        unanswered_followups: 0,
        has_overdue_tasks: false,
        future_meeting_next_14d: false,
        recent_meeting_report_added: false,
        decision_maker_identified: true,
        champion_identified: true,
        multiple_active_contacts: true,
        no_contacts_associated: false,
        active_opportunity_recent_update: false,
        quote_requested: false,
        explicit_need_detected: false,
        new_site_project_detected: false,
        expansion_project_mentioned: false,
        multisite_client: false,
        budget_known: true,
        competitor_mentioned: false,
        opportunity_lost_recently: false,
        opportunity_stale_60d: false,
        positive_feedback_detected: true,
        explicit_dissatisfaction: false,
        complaint_noted: false,
        issue_resolved: true,
        unresolved_issue_30d: false,
      });
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F6F5F2] dark:bg-[#242124]">
        <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'KAM_MANAGER', 'SUPERVISOR']}>
      <div className="min-h-screen w-full bg-[#F6F5F2] dark:bg-[#242124] text-[#242124] dark:text-white flex flex-col font-sans select-none antialiased">
        {/* TOP BAR */}
        <header className="h-16 px-6 bg-white/80 dark:bg-[#2D2A2D]/80 backdrop-blur-md border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <Icons.ChevronLeft size={16} />
              <span>Retour à la configuration</span>
            </Link>

            <div className="h-5 w-px bg-black/10 dark:bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <Logo size={28} />
              <div>
                <h1 className="text-xs font-bold text-[#242124] dark:text-white flex items-center gap-2">
                  <span>Laboratoire de Test des Alertes Clients</span>
                  <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-[#4F6CE8]/15 text-[#4F6CE8] font-bold">
                    Banc d'essai
                  </span>
                </h1>
                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                  Observez comment vos priorités métier qualifient chaque compte en temps réel
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             
          </div>
        </header>

        {/* CONTENU */}
        <div className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
          {/* BARRE DU MODÈLE ET DU MODE */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#6E6C67] dark:text-[#A1A1AA]">Modèle testé :</span>
              <select
                value={selectedProfileId || ''}
                onChange={(e) => setSelectedProfileId(Number(e.target.value))}
                className="px-3.5 py-1.5 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124] border border-black/5 dark:border-white/5 text-xs font-bold text-[#242124] dark:text-white focus:outline-none cursor-pointer"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Onglets de mode */}
            <div className="flex items-center gap-1.5 p-1 bg-[#F6F5F2] dark:bg-[#242124] rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveMode('sandbox')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMode === 'sandbox'
                    ? 'bg-white dark:bg-[#2D2A2D] text-[#242124] dark:text-white shadow-xs'
                    : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                }`}
              >
                Simuler des situations concrètes
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('real_account')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMode === 'real_account'
                    ? 'bg-white dark:bg-[#2D2A2D] text-[#242124] dark:text-white shadow-xs'
                    : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                }`}
              >
                Tester sur un compte réel
              </button>
            </div>
          </div>

          {/* GRILLE PRINCIPALE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* PANNEAU DE CONFIGURATION DU TEST (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              {activeMode === 'real_account' ? (
                <div className="bg-white dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-4 shadow-xs">
                  <div>
                    <h2 className="text-sm font-bold text-[#242124] dark:text-white">
                      Sélectionner une entreprise du portefeuille
                    </h2>
                    <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-1">
                      Onbora extrait automatiquement l'ensemble des données d'activité réelles de l'entreprise pour évaluer son niveau de priorité.
                    </p>
                  </div>

                  <select
                    value={selectedEnterpriseId || ''}
                    onChange={(e) => setSelectedEnterpriseId(Number(e.target.value))}
                    className="w-full p-3.5 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124] border border-black/10 dark:border-white/10 text-xs font-bold text-[#242124] dark:text-white focus:outline-none cursor-pointer"
                  >
                    {enterprises.map((ent) => (
                      <option key={ent.id} value={ent.id}>
                        {ent.name} {ent.sector ? `• ${ent.sector}` : ''} {ent.city ? `(${ent.city})` : ''}
                      </option>
                    ))}
                  </select>

                  <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
                    <Icons.Check size={16} className="text-[#4F6CE8] shrink-0 mt-0.5" />
                    <span>
                      Les métriques sont directement lues depuis l'historique des réunions, des propositions et des contacts réels du CRM.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-6 shadow-xs">
                  {/* Presets rapides */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                      Exemples de situations types
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => loadPreset('expansion_prime')}
                        className="px-3 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-left transition-all border border-emerald-200 dark:border-emerald-800/40 cursor-pointer"
                      >
                        Client en forte expansion
                      </button>
                      <button
                        type="button"
                        onClick={() => loadPreset('churn_risk')}
                        className="px-3 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold text-left transition-all border border-rose-200 dark:border-rose-800/40 cursor-pointer"
                      >
                        Compte en risque critique
                      </button>
                      <button
                        type="button"
                        onClick={() => loadPreset('neutral_followup')}
                        className="px-3 py-2 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124] hover:bg-black/5 text-[#242124] dark:text-white text-xs font-bold text-left transition-all border border-black/5 dark:border-white/5 cursor-pointer"
                      >
                        Client stable / Suivi normal
                      </button>
                    </div>
                  </div>

                  {/* Curseur temporel */}
                  <div className="p-4 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124] space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span>Délai depuis le dernier contact commercial</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-[#2D2A2D] text-[#4F6CE8]">
                        {metrics.days_since_last_meeting} jours
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="150"
                      step="5"
                      value={metrics.days_since_last_meeting}
                      onChange={(e) => updateMetric('days_since_last_meeting', Number(e.target.value))}
                      className="w-full accent-[#4F6CE8] cursor-pointer"
                    />
                  </div>

                  {/* Situations Clés à Cocher */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                      Situations observées chez le client
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { key: 'new_site_project_detected', label: 'Projet de nouveau site ou agence' },
                        { key: 'explicit_need_detected', label: 'Besoin technique clairement exprimé' },
                        { key: 'quote_requested', label: "Demande d'étude ou devis en cours" },
                        { key: 'expansion_project_mentioned', label: "Projet de croissance ou d'expansion" },
                        { key: 'decision_maker_identified', label: 'Décideur impliqué dans les échanges' },
                        { key: 'multisite_client', label: 'Client multi-sites / plusieurs agences' },
                        { key: 'budget_known', label: 'Budget télécom ou CA connu' },
                        { key: 'positive_feedback_detected', label: 'Retour positif du client' },
                        { key: 'competitor_mentioned', label: 'Concurrent déjà retenu ou mentionné' },
                        { key: 'unanswered_followups', label: 'Relances répétées sans réponse' },
                        { key: 'complaint_noted', label: 'Réclamation ou incident signalé' },
                        { key: 'unresolved_issue_30d', label: 'Incident non résolu depuis > 30j' },
                      ].map((item) => {
                        const active = Boolean(metrics[item.key]);
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => updateMetric(item.key, !active)}
                            className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                              active
                                ? 'bg-[#4F6CE8]/10 border-[#4F6CE8] text-[#242124] dark:text-white'
                                : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 text-[#6E6C67] dark:text-[#A1A1AA] hover:bg-black/5'
                            }`}
                          >
                            <span className="text-xs font-semibold">{item.label}</span>
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ml-2 ${
                                active ? 'border-[#4F6CE8] bg-[#4F6CE8]' : 'border-zinc-400'
                              }`}
                            >
                              {active && <Icons.Check size={10} className="text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PANNEAU DE RÉSULTAT EN DIRECT (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {simResult ? (
                <>
                  {/* CARTE SCORE & STATUT */}
                  <div className="bg-white dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col items-center text-center shadow-xs">
                    <span className="text-xs font-bold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
                      {simResult.profile_name}
                    </span>

                    <div className="relative my-4 flex items-center justify-center">
                      <div className="w-32 h-32 rounded-full border-8 border-black/5 dark:border-white/10 flex flex-col items-center justify-center relative">
                        <span className="text-4xl font-extrabold tracking-tight text-[#242124] dark:text-white">
                          {simResult.score}
                        </span>
                        <span className="text-[11px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
                          / 100
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full ${
                          simResult.status_color === 'emerald'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            : simResult.status_color === 'blue'
                            ? 'bg-[#4F6CE8]/15 text-[#4F6CE8] border border-[#4F6CE8]/30'
                            : simResult.status_color === 'amber'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        Priorité : {simResult.status_label}
                      </span>
                    </div>

                    {simResult.triggered_action && (
                      <div className="w-full p-3.5 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124] border border-black/5 dark:border-white/5 text-xs text-left flex items-start gap-2.5">
                        <Icons.Check size={16} className="text-[#4F6CE8] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-[#242124] dark:text-white block">Recommandation pour le KAM :</span>
                          <span className="text-[#6E6C67] dark:text-[#A1A1AA]">{simResult.triggered_action}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SITUATIONS DÉTECTÉES SUR CE COMPTE */}
                  <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#242124] dark:text-white flex items-center gap-2">
                        <Icons.CheckCircle size={14} className="text-[#4F6CE8]" />
                        <span>Situations actives ({simResult.triggered_rules.length})</span>
                      </h3>
                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Base : {simResult.base_score} pts</span>
                    </div>

                    {simResult.triggered_rules.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124] text-xs text-[#6E6C67] dark:text-[#A1A1AA] text-center">
                        Aucun signal d'alerte spécifique détecté sur ce compte.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                        {simResult.triggered_rules.map((rule, idx) => {
                          const isPos = rule.points > 0;
                          const trans = SITUATION_TRANSLATIONS[rule.field];
                          const displayLabel = trans ? trans.label : rule.name;
                          return (
                            <div
                              key={idx}
                              className="p-3 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124] flex items-center justify-between text-xs"
                            >
                              <span className="font-semibold text-[#242124] dark:text-white pr-2">
                                {displayLabel}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] shrink-0 ${
                                  isPos
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                }`}
                              >
                                {isPos ? "Augmente" : "Réduit"} ({rule.points_formatted})
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-[#2D2A2D] p-8 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col items-center justify-center text-center text-[#6E6C67]">
                  <Icons.Target size={32} className="mb-2 text-[#4F6CE8]" />
                  <span>Calcul en direct...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
