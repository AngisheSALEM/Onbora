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

export default function ScoringLabPage() {
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [enterprises, setEnterprises] = useState<EnterpriseOption[]>([]);
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<number | null>(null);
  const [activeMode, setActiveMode] = useState<'sandbox' | 'real_account'>('sandbox');
  
  // Sandbox Interactive Metrics State
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
    quote_requested: false,
    explicit_need_detected: false,
    competitor_mentioned: false,
    opportunity_lost_recently: false,
    opportunity_stale_60d: false,
    expansion_project_mentioned: false,
    positive_feedback_detected: true,
    explicit_dissatisfaction: false,
    complaint_noted: false,
    issue_resolved: false,
    unresolved_issue_30d: false,
  });

  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Charger les profils et les entreprises
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

  // Exécuter la simulation
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
        {/* HEADER TOP BAR */}
        <header className="h-16 px-6 bg-white/80 dark:bg-[#2D2A2D]/80 backdrop-blur-md border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <Icons.ChevronLeft size={16} />
              <span>Retour Cockpit Admin</span>
            </Link>

            <div className="h-5 w-px bg-black/10 dark:bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <Logo size={28} />
              <div>
                <h1 className="text-xs font-bold text-[#242124] dark:text-white flex items-center gap-2">
                  <span>Laboratoire de Test & Simulateur de Scoring</span>
                  <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-[#4F6CE8]/15 text-[#4F6CE8] font-bold">
                    Sandbox Déterministe
                  </span>
                </h1>
                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                  Évaluation algorithmique en direct sans modèle IA • Résultats immédiats
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>

        {/* CONTENU DU LABORATOIRE */}
        <div className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
          
          {/* BARRE DE SÉLECTION DU PROFIL & MODE */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 shadow-xs">
            {/* Profil Sélectionné */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#6E6C67] dark:text-[#A1A1AA]">Profil évalué :</span>
              <div className="flex items-center gap-2">
                {profiles.map((p) => {
                  const isSel = p.id === selectedProfileId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProfileId(p.id)}
                      className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                        isSel
                          ? 'bg-[#4F6CE8] text-white shadow-xs'
                          : 'bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA] hover:bg-black/10'
                      }`}
                    >
                      {p.name} ({p.score_type === 'ACCOUNT_HEALTH' ? 'Santé' : 'Upsell'})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sélecteur de Mode */}
            <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 p-1 rounded-2xl">
              <button
                onClick={() => setActiveMode('sandbox')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMode === 'sandbox'
                    ? 'bg-white dark:bg-[#242124] text-[#242124] dark:text-white shadow-xs'
                    : 'text-[#6E6C67] dark:text-[#A1A1AA]'
                }`}
              >
                Simulateur Sandbox
              </button>
              <button
                onClick={() => setActiveMode('real_account')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMode === 'real_account'
                    ? 'bg-white dark:bg-[#242124] text-[#242124] dark:text-white shadow-xs'
                    : 'text-[#6E6C67] dark:text-[#A1A1AA]'
                }`}
              >
                Tester Compte Réel
              </button>
            </div>
          </div>

          {/* GRILLE PRINCIPALE : CONTRÔLES À GAUCHE (2 cols), RÉSULTAT À DROITE (1 col) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* PANNEAU DE CONTRÔLE (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              
              {/* Si Mode Compte Réel */}
              {activeMode === 'real_account' && (
                <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-3 shadow-xs">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#242124] dark:text-white flex items-center gap-2">
                    <Icons.Briefcase size={14} className="text-[#4F6CE8]" />
                    <span>Sélectionner une Entreprise CRM</span>
                  </h2>
                  <select
                    value={selectedEnterpriseId || ''}
                    onChange={(e) => setSelectedEnterpriseId(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-[#F6F5F2] dark:bg-[#242124] border border-black/10 dark:border-white/10 rounded-2xl text-xs font-medium text-[#242124] dark:text-white outline-none focus:ring-2 focus:ring-[#4F6CE8]"
                  >
                    {enterprises.map((ent) => (
                      <option key={ent.id} value={ent.id}>
                        {ent.name} ({ent.sector || 'Secteur indéfini'} • {ent.city || 'RDC'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
                    Les métriques réelles (visites, interlocuteurs, relances, opportunités) seront automatiquement extraites et évaluées.
                  </p>
                </div>
              )}

              {/* Si Mode Sandbox : Curseurs & Interrupteurs */}
              {activeMode === 'sandbox' && (
                <div className="bg-white dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-6 shadow-xs">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#242124] dark:text-white flex items-center gap-2">
                      <Icons.Sliders size={14} className="text-[#4F6CE8]" />
                      <span>Paramètres de Simulation Interactifs</span>
                    </h2>
                    <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                      Modifiez les valeurs ci-dessous pour observer en temps réel la réaction mathématique du score.
                    </p>
                  </div>

                  {/* 1. Curseurs Numériques */}
                  <div className="flex flex-col gap-4 p-4 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124]">
                    {/* Jours depuis dernier RDV */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-[#242124] dark:text-white">Jours depuis le dernier rendez-vous</span>
                        <span className="text-[#4F6CE8] font-bold">{metrics.days_since_last_meeting} jours</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="120"
                        step="5"
                        value={metrics.days_since_last_meeting}
                        onChange={(e) => updateMetric('days_since_last_meeting', Number(e.target.value))}
                        className="w-full accent-[#4F6CE8] cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                        <span>0j (Récent)</span>
                        <span>30j</span>
                        <span>60j (Alerte -20)</span>
                        <span>90j+ (Critique -35)</span>
                      </div>
                    </div>

                    {/* Relances sans réponse */}
                    <div className="flex flex-col gap-1.5 pt-3 border-t border-black/5 dark:border-white/5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-[#242124] dark:text-white">Nombre de relances sans réponse</span>
                        <span className="text-[#4F6CE8] font-bold">{metrics.unanswered_followups} relance(s)</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="1"
                        value={metrics.unanswered_followups}
                        onChange={(e) => updateMetric('unanswered_followups', Number(e.target.value))}
                        className="w-full accent-[#4F6CE8] cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* 2. Interrupteurs Métier booléens */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'decision_maker_identified', label: 'Décideur identifié (DG/DSI)', pts: '+15' },
                      { key: 'champion_identified', label: 'Contact Champion identifié', pts: '+10' },
                      { key: 'future_meeting_next_14d', label: 'RDV planifié sous 14 jours', pts: '+10' },
                      { key: 'recent_meeting_report_added', label: 'Compte rendu récent ajouté', pts: '+5' },
                      { key: 'multiple_active_contacts', label: 'Plusieurs contacts actifs', pts: '+10' },
                      { key: 'has_overdue_tasks', label: 'Tâche de suivi en retard', pts: '-10' },
                      { key: 'no_contacts_associated', label: 'Aucun contact associé', pts: '-20' },
                      { key: 'quote_requested', label: 'Demande de devis enregistrée', pts: '+15' },
                      { key: 'explicit_need_detected', label: 'Besoin explicite détecté', pts: '+15' },
                      { key: 'competitor_mentioned', label: 'Concurrent mentionné', pts: '-20' },
                      { key: 'opportunity_lost_recently', label: 'Opportunité perdue récemment', pts: '-20' },
                      { key: 'expansion_project_mentioned', label: 'Projet d’expansion / site', pts: '+10' },
                      { key: 'positive_feedback_detected', label: 'Feedback positif / satisfaction', pts: '+10' },
                      { key: 'explicit_dissatisfaction', label: 'Insatisfaction mentionnée', pts: '-15' },
                      { key: 'complaint_noted', label: 'Plainte enregistrée', pts: '-20' },
                      { key: 'issue_resolved', label: 'Problème déclaré résolu', pts: '+10' },
                      { key: 'unresolved_issue_30d', label: 'Problème non résolu > 30j', pts: '-20' },
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
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold">{item.label}</span>
                            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] font-mono">
                              Impact : {item.pts} pts
                            </span>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
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
              )}
            </div>

            {/* PANNEAU DE RÉSULTAT EN DIRECT (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {simResult ? (
                <>
                  {/* JAUGE ET SCORE FINAL */}
                  <div className="bg-white dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col items-center text-center shadow-xs">
                    <span className="text-xs font-bold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
                      {simResult.profile_name}
                    </span>

                    {/* Grand Chiffre de Score */}
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

                    {/* Badge de Statut */}
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
                        Niveau : {simResult.status_label}
                      </span>
                    </div>

                    {/* Action Automatique Déclenchée */}
                    {simResult.triggered_action && (
                      <div className="w-full p-3 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124] border border-black/5 dark:border-white/5 text-xs text-left flex items-start gap-2.5">
                        <Icons.Zap size={16} className="text-[#4F6CE8] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-[#242124] dark:text-white block">Action déclenchée :</span>
                          <span className="text-[#6E6C67] dark:text-[#A1A1AA]">{simResult.triggered_action}</span>
                        </div>
                      </div>
                    )}

                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] mt-3 block">
                      Source : {simResult.source_label}
                    </span>
                  </div>

                  {/* DÉCOMPOSITION PAR DIMENSION */}
                  <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-3 shadow-xs">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#242124] dark:text-white flex items-center gap-2">
                      <Icons.Layers size={14} className="text-[#4F6CE8]" />
                      <span>Ventilation par Dimension</span>
                    </h3>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(simResult.dimension_scores).map(([dim, pts]) => {
                        const isPos = pts > 0;
                        return (
                          <div key={dim} className="p-3 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124] flex justify-between items-center">
                            <span className="font-semibold capitalize text-[#242124] dark:text-white">{dim}</span>
                            <span className={`font-bold ${isPos ? 'text-emerald-600 dark:text-emerald-400' : pts < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-400'}`}>
                              {isPos ? `+${pts}` : pts} pts
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AUDIT TRAIL : RÈGLES DÉCLENCHÉES */}
                  <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#242124] dark:text-white flex items-center gap-2">
                        <Icons.CheckCircle size={14} className="text-[#4F6CE8]" />
                        <span>Règles Déclenchées ({simResult.triggered_rules.length})</span>
                      </h3>
                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Base : {simResult.base_score} pts</span>
                    </div>

                    {simResult.triggered_rules.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124] text-xs text-[#6E6C67] dark:text-[#A1A1AA] text-center">
                        Aucune règle conditionnelle déclenchée. Le score reste au niveau de base.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                        {simResult.triggered_rules.map((rule, idx) => {
                          const isPos = rule.points > 0;
                          return (
                            <div
                              key={idx}
                              className="p-3 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124] flex items-center justify-between text-xs"
                            >
                              <div className="flex flex-col pr-2">
                                <span className="font-semibold text-[#242124] dark:text-white">{rule.name}</span>
                                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] capitalize">
                                  Dimension : {rule.dimension}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-lg font-bold text-xs shrink-0 ${
                                  isPos
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                }`}
                              >
                                {rule.points_formatted}
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
                  <span>En attente de simulation...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
