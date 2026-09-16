"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Icons } from '@/components/shared/Icons';
import { fetchAPI } from '@/lib/api';

export interface ScoreProfileData {
  id: number;
  name: string;
  score_type: string;
  objective: string;
  population: string;
  analysis_window_days: number;
  recalculation_frequency: string;
  base_score: number;
  dimensions: { name: string; label: string; weight: number }[];
  thresholds: { min: number; max: number; label: string; color: string }[];
  actions: Record<string, string>;
  is_active: boolean;
  rules: ScoreRuleData[];
  rules_count: number;
}

export interface ScoreRuleData {
  id: number;
  profile: number;
  name: string;
  dimension: string;
  field: string;
  operator: string;
  value: any;
  points: number;
  valid_for_days?: number | null;
  is_active: boolean;
  order: number;
}

// Dictionnaire de traduction en langage métier clair pour les non-techniciens
const HUMAN_TRANSLATIONS: Record<string, { situation: string; impact: string; impactLevel: 'high_pos' | 'pos' | 'moderate' | 'neg' | 'high_neg' }> = {
  // Opportunités / Expansion
  "new_site_project_detected": {
    situation: "Le client prévoit d’ouvrir un site ou une nouvelle agence",
    impact: "Augmente fortement la priorité",
    impactLevel: "high_pos",
  },
  "expansion_project_mentioned": {
    situation: "Un projet d’expansion ou de croissance est identifié",
    impact: "Augmente la priorité",
    impactLevel: "pos",
  },
  "multisite_client": {
    situation: "Client multi-sites nécessitant une interconnexion réseau",
    impact: "Augmente la priorité",
    impactLevel: "pos",
  },
  "explicit_need_detected": {
    situation: "Un besoin technique a été clairement exprimé en réunion",
    impact: "Augmente fortement la priorité",
    impactLevel: "high_pos",
  },
  "quote_requested": {
    situation: "Une demande de devis ou d’étude a été enregistrée",
    impact: "Augmente fortement la priorité",
    impactLevel: "high_pos",
  },
  "active_opportunity_recent_update": {
    situation: "Une opportunité commerciale est active et traitée récemment",
    impact: "Augmente la priorité",
    impactLevel: "pos",
  },
  "budget_known": {
    situation: "Le budget télécom ou le chiffre d'affaires est renseigné",
    impact: "Augmente la priorité",
    impactLevel: "pos",
  },
  // Relations & Contacts
  "decision_maker_identified": {
    situation: "Un décideur (DG, DSI, DAF, Gérant) participe aux échanges",
    impact: "Augmente la priorité",
    impactLevel: "pos",
  },
  "champion_identified": {
    situation: "Un contact référent clé (champion) est actif",
    impact: "Augmente la priorité",
    impactLevel: "pos",
  },
  "multiple_active_contacts": {
    situation: "Plusieurs interlocuteurs opérationnels sont joignables",
    impact: "Augmente la priorité",
    impactLevel: "pos",
  },
  "recent_meeting_report_added": {
    situation: "Un compte rendu de réunion a été ajouté récemment",
    impact: "Augmente modérément",
    impactLevel: "moderate",
  },
  "positive_feedback_detected": {
    situation: "Le client exprime sa satisfaction sur le service",
    impact: "Augmente la priorité",
    impactLevel: "pos",
  },
  "future_meeting_next_14d": {
    situation: "Une prochaine réunion est programmée sous 14 jours",
    impact: "Augmente modérément",
    impactLevel: "moderate",
  },
  // Facteurs de vigilance et réduction
  "days_since_last_meeting": {
    situation: "Aucun contact ou réunion avec le client depuis longtemps",
    impact: "Réduit la priorité",
    impactLevel: "neg",
  },
  "unanswered_followups": {
    situation: "Plusieurs relances du KAM sont restées sans réponse",
    impact: "Réduit la priorité",
    impactLevel: "neg",
  },
  "has_overdue_tasks": {
    situation: "Des actions de suivi sur ce compte sont en retard",
    impact: "Réduit la priorité",
    impactLevel: "neg",
  },
  "no_contacts_associated": {
    situation: "Aucun interlocuteur identifié pour ce compte",
    impact: "Réduit fortement la priorité",
    impactLevel: "high_neg",
  },
  "competitor_mentioned": {
    situation: "Un concurrent a été retenu ou est activement mentionné",
    impact: "Réduit fortement la priorité",
    impactLevel: "high_neg",
  },
  "opportunity_lost_recently": {
    situation: "Une opportunité sur ce compte a été perdue récemment",
    impact: "Réduit la priorité",
    impactLevel: "neg",
  },
  "opportunity_stale_60d": {
    situation: "Aucune avancée sur l'opportunité depuis plus de 60 jours",
    impact: "Réduit la priorité",
    impactLevel: "neg",
  },
  "complaint_noted": {
    situation: "Réclamations réseau ou insatisfaction technique signalée",
    impact: "Réduit la priorité",
    impactLevel: "neg",
  },
  "explicit_dissatisfaction": {
    situation: "Insatisfaction critique exprimée par le client",
    impact: "Réduit fortement la priorité",
    impactLevel: "high_neg",
  },
  "unresolved_issue_30d": {
    situation: "Incident technique non résolu depuis plus de 30 jours",
    impact: "Réduit fortement la priorité",
    impactLevel: "high_neg",
  },
};

// Choix de priorité métier traduits en points
const PRIORITY_OPTIONS = [
  { label: "Très important", points: 25, effect: "Augmente fortement" },
  { label: "Important", points: 15, effect: "Augmente" },
  { label: "À prendre en compte", points: 8, effect: "Modéré" },
  { label: "Peu important", points: 4, effect: "Léger" },
  { label: "Ignorer", points: 0, effect: "Neutre" },
  { label: "Réduit la priorité", points: -15, effect: "Réduit" },
  { label: "Réduit fortement la priorité", points: -30, effect: "Réduit fortement" },
];

export default function AdminScoringView() {
  const [profiles, setProfiles] = useState<ScoreProfileData[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'wizard'>('summary');
  const [showAdvancedParams, setShowAdvancedParams] = useState(false);

  // Assistant de Configuration (4 Étapes)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [wizardObjective, setWizardObjective] = useState<string>("expansion");
  const [wizardSignals, setWizardSignals] = useState<Record<string, string>>({
    "new_site_project_detected": "Très important",
    "explicit_need_detected": "Très important",
    "quote_requested": "Très important",
    "expansion_project_mentioned": "Important",
    "decision_maker_identified": "Important",
    "multisite_client": "À prendre en compte",
    "budget_known": "À prendre en compte",
    "competitor_mentioned": "Réduit fortement la priorité",
    "days_since_last_meeting": "Réduit la priorité",
  });
  const [wizardAlertCondition, setWizardAlertCondition] = useState<string>("multiple_signals");
  const [wizardPrudenceLevel, setWizardPrudenceLevel] = useState<string>("high");
  const [wizardActions, setWizardActions] = useState<{ [key: string]: boolean }>({
    "add_to_todo": true,
    "suggest_question": true,
    "create_task": true,
    "auto_create_crm_opp": false,
    "auto_email": false,
  });

  const activeProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0] || null;

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchAPI('/api/sales/scoring/profiles/');
      const list = Array.isArray(data) ? data : data.results || [];
      setProfiles(list);
      if (list.length > 0 && !selectedProfileId) {
        setSelectedProfileId(list[0].id);
      }
    } catch (err: any) {
      console.error("Erreur chargement profils scoring:", err);
      setErrorMsg(err.message || "Impossible de charger les profils d'alerte.");
    } finally {
      setLoading(false);
    }
  }, [selectedProfileId]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleRecalculateAll = async () => {
    if (!activeProfile) return;
    setCalculating(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetchAPI('/api/sales/scoring/calculate/', {
        method: 'POST',
        body: JSON.stringify({ profile_id: activeProfile.id }),
      });
      setSuccessMsg(res.message || "Alertes et scores mis à jour avec succès.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de la mise à jour des alertes.");
    } finally {
      setCalculating(false);
    }
  };

  const handleToggleRule = async (ruleId: number, currentActive: boolean) => {
    try {
      await fetchAPI(`/api/sales/scoring/rules/${ruleId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !currentActive }),
      });
      setProfiles((prev) =>
        prev.map((p) => {
          if (p.id !== selectedProfileId) return p;
          return {
            ...p,
            rules: p.rules.map((r) => (r.id === ruleId ? { ...r, is_active: !currentActive } : r)),
          };
        })
      );
    } catch (err: any) {
      setErrorMsg("Impossible de modifier le statut de cette condition.");
    }
  };

  const getRuleHumanDisplay = (rule: ScoreRuleData) => {
    const translation = HUMAN_TRANSLATIONS[rule.field];
    if (translation) {
      return {
        situation: translation.situation,
        impact: translation.impact,
        level: translation.impactLevel,
      };
    }
    // Fallback propre
    const cleanName = rule.name || rule.field.replace(/_/g, ' ');
    const isPositive = rule.points >= 0;
    return {
      situation: cleanName,
      impact: isPositive ? (rule.points >= 20 ? "Augmente fortement" : "Augmente") : "Réduit la priorité",
      level: (isPositive ? (rule.points >= 20 ? "high_pos" : "pos") : "neg") as any,
    };
  };

  if (loading && profiles.length === 0) {
    return (
      <div className="w-full h-80 rounded-3xl bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center gap-3">
        <div className="w-7 h-7 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
        <span className="text-xs font-medium text-[#6E6C67] dark:text-[#A1A1AA]">
          Chargement de la configuration des alertes clients...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête Institutionnel & Actions */}
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#4F6CE8]/10 text-[#4F6CE8]">
              Pilotage Commercial & Rétention
            </span>
            <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
              Règles simples et automatisées
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#242124] dark:text-white tracking-tight">
            Configuration des alertes clients
          </h2>
          <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] max-w-2xl leading-relaxed">
            Définissez ce que vous souhaitez détecter chez vos clients. Onbora traduit automatiquement vos critères en priorités claires pour les KAMs, sans aucun jargon technique.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/scoring-lab"
            className="px-3.5 py-2 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold text-[#242124] dark:text-white transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Icons.Activity size={14} className="text-[#4F6CE8]" />
            <span>Tester dans le Scoring Lab</span>
          </Link>

          <button
            onClick={handleRecalculateAll}
            disabled={calculating || !activeProfile}
            className="px-4 py-2 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D56C7] text-white text-xs font-semibold transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-none"
          >
            <Icons.RefreshCw size={14} className={calculating ? "animate-spin" : ""} />
            <span>{calculating ? "Mise à jour en cours..." : "Mettre à jour les alertes"}</span>
          </button>
        </div>
      </div>

      {/* Messages d'état */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
          <Icons.Check size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-center gap-3">
          <Icons.AlertTriangle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">{errorMsg}</span>
        </div>
      )}

      {/* Sélecteur de Mode : Synthèse active vs Assistant pas-à-pas */}
      <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-[#242124] text-white dark:bg-white dark:text-[#242124]'
                : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
            }`}
          >
            Modèle actuellement en vigueur
          </button>
          <button
            onClick={() => setActiveTab('wizard')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'wizard'
                ? 'bg-[#242124] text-white dark:bg-white dark:text-[#242124]'
                : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
            }`}
          >
            <Icons.Sliders size={13} />
            <span>Assistant de configuration (4 étapes)</span>
          </button>
        </div>

        {/* Sélecteur de profil actif */}
        {profiles.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">Modèle :</span>
            <select
              value={selectedProfileId || ''}
              onChange={(e) => setSelectedProfileId(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#242124] border border-black/10 dark:border-white/10 text-xs font-semibold text-[#242124] dark:text-white focus:outline-none"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VUE 1 : SYNTHÈSE MÉTIER CLAIRE ET RASSURANTE                              */}
      {/* ========================================================================= */}
      {activeTab === 'summary' && activeProfile && (
        <div className="flex flex-col gap-6">
          {/* Fiche Objectif Métier */}
          <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
                  Ce que vous surveillez
                </span>
                <h3 className="text-base font-bold text-[#242124] dark:text-white mt-0.5">
                  {activeProfile.name}
                </h3>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1.5">
                <Icons.Check size={13} />
                <span>Modèle actif</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
              <div className="p-3.5 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                  Objectif principal
                </span>
                <p className="text-xs font-semibold text-[#242124] dark:text-white mt-1 leading-snug">
                  {activeProfile.objective}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                  Comptes concernés
                </span>
                <p className="text-xs font-semibold text-[#242124] dark:text-white mt-1">
                  {activeProfile.population}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                  Seuil d’alerte
                </span>
                <p className="text-xs font-semibold text-[#242124] dark:text-white mt-1">
                  Plusieurs signaux fiables réunis
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                  Action pour le KAM
                </span>
                <p className="text-xs font-semibold text-[#242124] dark:text-white mt-1">
                  Recommandation à valider par le KAM
                </p>
              </div>
            </div>
          </div>

          {/* Tableau des Situations Prises en Compte */}
          <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#242124] dark:text-white">
                  Situations prises en compte par Onbora
                </h3>
                <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                  Lorsqu'une situation ci-dessous est détectée, la priorité du compte s'ajuste automatiquement pour le KAM.
                </p>
              </div>
              <button
                onClick={() => setShowAdvancedParams(!showAdvancedParams)}
                className="text-xs font-semibold text-[#4F6CE8] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{showAdvancedParams ? "Masquer les paramètres techniques" : "Voir les paramètres avancés"}</span>
                <Icons.ChevronRight size={13} className={`transition-transform ${showAdvancedParams ? 'rotate-90' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-black/10 dark:border-white/10 text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[11px] font-bold bg-black/[0.02] dark:bg-white/[0.02]">
                    <th className="py-3 px-4 font-bold">Situation détectée</th>
                    <th className="py-3 px-4 font-bold">Impact sur la priorité</th>
                    {showAdvancedParams && <th className="py-3 px-4 font-bold">Signal technique & Points</th>}
                    <th className="py-3 px-4 font-bold text-right">Activée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {activeProfile.rules.map((rule) => {
                    const human = getRuleHumanDisplay(rule);
                    return (
                      <tr key={rule.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 font-medium text-[#242124] dark:text-white">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4F6CE8]" />
                            <span>{human.situation}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              human.level === 'high_pos'
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                                : human.level === 'pos'
                                ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                                : human.level === 'moderate'
                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                                : human.level === 'neg'
                                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {human.impact}
                          </span>
                        </td>
                        {showAdvancedParams && (
                          <td className="py-3.5 px-4 font-mono text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
                            <span className="text-[#242124] dark:text-white">{rule.field}</span> {rule.operator} ({rule.points > 0 ? `+${rule.points}` : rule.points} pts)
                          </td>
                        )}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleToggleRule(rule.id, rule.is_active)}
                            className={`w-9 h-5 rounded-full transition-colors cursor-pointer relative p-0.5 ${
                              rule.is_active ? 'bg-[#4F6CE8]' : 'bg-zinc-300 dark:bg-zinc-700'
                            }`}
                            title={rule.is_active ? "Désactiver cette situation" : "Activer cette situation"}
                          >
                            <span
                              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                                rule.is_active ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 2 : ASSISTANT DE CONFIGURATION EN 4 ÉTAPES                            */}
      {/* ========================================================================= */}
      {activeTab === 'wizard' && (
        <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 space-y-8">
          {/* Stepper Header */}
          <div className="grid grid-cols-4 gap-3 border-b border-black/5 dark:border-white/5 pb-5">
            {[
              { num: 1, title: "1. Objectif métier" },
              { num: 2, title: "2. Importance des signaux" },
              { num: 3, title: "3. Seuil d'alerte" },
              { num: 4, title: "4. Actions à déclencher" },
            ].map((st) => (
              <button
                key={st.num}
                onClick={() => setWizardStep(st.num as any)}
                className={`flex flex-col text-left cursor-pointer transition-all pb-1 border-b-2 ${
                  wizardStep === st.num
                    ? 'border-[#4F6CE8] text-[#4F6CE8]'
                    : wizardStep > st.num
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-[#6E6C67] dark:text-[#A1A1AA]'
                }`}
              >
                <span className="text-xs font-bold">{st.title}</span>
              </button>
            ))}
          </div>

          {/* Étape 1 : Quel est votre objectif ? */}
          {wizardStep === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#242124] dark:text-white">
                  Étape 1 — Que voulez-vous détecter ?
                </h3>
                <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-1">
                  Sélectionnez l'objectif stratégique auquel doit répondre ce modèle de surveillance.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    id: "expansion",
                    title: "Opportunités de développement chez les clients existants",
                    desc: "Détecter les projets d'extension, les ouvertures d'agences et les nouveaux besoins télécoms.",
                    badge: "Recommandé B2B",
                  },
                  {
                    id: "risk",
                    title: "Comptes à risque ou peu suivis",
                    desc: "Identifier le désengagement relationnel, les réclamations ouvertes et l'absence de contact récent.",
                    badge: "Rétention & Churn",
                  },
                  {
                    id: "prospects",
                    title: "Nouveaux prospects à contacter",
                    desc: "Prioriser les entreprises du portefeuille présentant le potentiel le plus fort pour un premier contrat.",
                    badge: "Conquête",
                  },
                  {
                    id: "renewal",
                    title: "Préparation des renouvellements",
                    desc: "Anticiper les fins de contrat sous 90 jours pour sécuriser la reconduction des offres.",
                    badge: "Fidélisation",
                  },
                ].map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => setWizardObjective(opt.id)}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      wizardObjective === opt.id
                        ? 'border-[#4F6CE8] bg-[#4F6CE8]/5'
                        : 'border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#242124] dark:text-white">{opt.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA]">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] leading-relaxed">{opt.desc}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#4F6CE8]">
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${wizardObjective === opt.id ? 'border-[#4F6CE8] bg-[#4F6CE8] text-white' : 'border-zinc-300'}`}>
                        {wizardObjective === opt.id && <Icons.Check size={10} />}
                      </span>
                      <span>{wizardObjective === opt.id ? "Sélectionné" : "Choisir cet objectif"}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setWizardStep(2)}
                  className="px-5 py-2.5 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D56C7] text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-none"
                >
                  <span>Continuer vers les signaux</span>
                  <Icons.ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Étape 2 : Quels signaux sont importants ? */}
          {wizardStep === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#242124] dark:text-white">
                  Étape 2 — Lorsqu'un client présente l'un de ces signaux, quelle importance doit-il avoir ?
                </h3>
                <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-1">
                  Onbora convertit automatiquement chaque niveau d'importance en pondération intelligente pour le calcul.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { key: "new_site_project_detected", label: "Nouveau site ou nouvelle agence prévue" },
                  { key: "explicit_need_detected", label: "Besoin technique exprimé par le client en réunion" },
                  { key: "quote_requested", label: "Demande de devis ou d’étude de prix" },
                  { key: "expansion_project_mentioned", label: "Projet d’expansion détecté publiquement ou via scraping" },
                  { key: "decision_maker_identified", label: "Décideur identifié et impliqué dans la discussion" },
                  { key: "multisite_client", label: "Client déjà multi-sites avec plusieurs implantations" },
                  { key: "competitor_mentioned", label: "Projet abandonné ou concurrent déjà choisi" },
                  { key: "days_since_last_meeting", label: "Aucun contact ou visite depuis plus de 60 jours" },
                ].map((sig) => (
                  <div key={sig.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-[#4F6CE8]" />
                      <span className="text-xs font-semibold text-[#242124] dark:text-white">{sig.label}</span>
                    </div>

                    <select
                      value={wizardSignals[sig.key] || "Important"}
                      onChange={(e) => setWizardSignals({ ...wizardSignals, [sig.key]: e.target.value })}
                      className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#2D2A2D] border border-black/10 dark:border-white/10 text-xs font-semibold text-[#242124] dark:text-white focus:outline-none cursor-pointer"
                    >
                      {PRIORITY_OPTIONS.map((opt) => (
                        <option key={opt.label} value={opt.label}>
                          {opt.label} ({opt.effect})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setWizardStep(1)}
                  className="px-4 py-2 rounded-2xl bg-black/5 dark:bg-white/5 text-xs font-semibold text-[#242124] dark:text-white cursor-pointer"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setWizardStep(3)}
                  className="px-5 py-2.5 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D56C7] text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-none"
                >
                  <span>Continuer vers les seuils</span>
                  <Icons.ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Étape 3 : Quand alerter le KAM ? */}
          {wizardStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-[#242124] dark:text-white">
                  Étape 3 — Quand alerter le KAM ?
                </h3>
                <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-1">
                  Définissez la rigueur du filtre pour éviter d'inonder les équipes de fausses alertes.
                </p>
              </div>

              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                  Condition de déclenchement
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { id: "single_signal", title: "Un seul signal très important", desc: "Alerte dès qu'un besoin fort ou un nouveau site est détecté." },
                    { id: "multiple_signals", title: "Plusieurs signaux cohérents (Recommandé)", desc: "Alerte quand au moins 2 indicateurs concordants sont réunis." },
                    { id: "kam_confirmed", title: "Confirmation préalable requise", desc: "Alerte uniquement après première vérification manuelle." },
                  ].map((cond) => (
                    <div
                      key={cond.id}
                      onClick={() => setWizardAlertCondition(cond.id)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        wizardAlertCondition === cond.id
                          ? 'border-[#4F6CE8] bg-[#4F6CE8]/5'
                          : 'border-black/5 dark:border-white/5 hover:border-black/20'
                      }`}
                    >
                      <h4 className="text-xs font-bold text-[#242124] dark:text-white">{cond.title}</h4>
                      <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-1">{cond.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                  Niveau de prudence (Filtre qualité)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { id: "high", title: "Élevé (Conseillé en RDC)", desc: "Signaler seulement les opportunités bien justifiées avec budget ou décideur." },
                    { id: "balanced", title: "Équilibré", desc: "Signaler les opportunités probables avec un bon ratio d'engagement." },
                    { id: "wide", title: "Large", desc: "Signaler également les signaux faibles pour exploration proactive." },
                  ].map((pr) => (
                    <div
                      key={pr.id}
                      onClick={() => setWizardPrudenceLevel(pr.id)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        wizardPrudenceLevel === pr.id
                          ? 'border-[#4F6CE8] bg-[#4F6CE8]/5'
                          : 'border-black/5 dark:border-white/5 hover:border-black/20'
                      }`}
                    >
                      <h4 className="text-xs font-bold text-[#242124] dark:text-white">{pr.title}</h4>
                      <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-1">{pr.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2 rounded-2xl bg-black/5 dark:bg-white/5 text-xs font-semibold text-[#242124] dark:text-white cursor-pointer"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setWizardStep(4)}
                  className="px-5 py-2.5 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D56C7] text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-none"
                >
                  <span>Continuer vers les actions</span>
                  <Icons.ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Étape 4 : Que faire quand une opportunité est détectée ? */}
          {wizardStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-[#242124] dark:text-white">
                  Étape 4 — Que faire quand une opportunité est détectée ?
                </h3>
                <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-1">
                  Onbora propose toujours au KAM de valider l'action avant tout envoi externe.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { key: "add_to_todo", label: "Ajouter le compte dans la vue « À traiter » du KAM", desc: "Met en avant l'entreprise en tête de liste de prospection du portefeuille.", recommended: true },
                  { key: "suggest_question", label: "Suggérer une question clé de qualification", desc: "Aide le KAM à aborder le sujet lors du prochain appel téléphonique.", recommended: true },
                  { key: "create_task", label: "Créer une tâche de suivi pour le KAM", desc: "Planifie un rappel automatique dans son agenda sous 48h.", recommended: true },
                  { key: "auto_create_crm_opp", label: "Créer automatiquement une opportunité CRM", desc: "Réservé aux opportunités déjà confirmées.", recommended: false },
                  { key: "auto_email", label: "Envoyer un email automatique au client", desc: "Non recommandé : conservez une validation humaine (HITL).", recommended: false },
                ].map((act) => (
                  <label key={act.key} className="flex items-start gap-3 p-4 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wizardActions[act.key] || false}
                      onChange={(e) => setWizardActions({ ...wizardActions, [act.key]: e.target.checked })}
                      className="mt-0.5 w-4 h-4 rounded text-[#4F6CE8] focus:ring-[#4F6CE8] cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#242124] dark:text-white">{act.label}</span>
                        {act.recommended && (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                            Recommandé
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">{act.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setWizardStep(3)}
                  className="px-4 py-2 rounded-2xl bg-black/5 dark:bg-white/5 text-xs font-semibold text-[#242124] dark:text-white cursor-pointer"
                >
                  Précédent
                </button>
                <button
                  onClick={() => {
                    setActiveTab('summary');
                    setSuccessMsg("Configuration enregistrée ! Vos critères métier sont désormais appliqués.");
                    setTimeout(() => setSuccessMsg(null), 4000);
                  }}
                  className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-none"
                >
                  <Icons.Check size={14} />
                  <span>Enregistrer et appliquer ce modèle</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
