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

export default function AdminScoringView() {
  const [profiles, setProfiles] = useState<ScoreProfileData[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Profile Form State
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
      setErrorMsg(err.message || "Impossible de charger les profils de scoring.");
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
      setSuccessMsg(res.message || "Calcul terminé avec succès pour tous les comptes.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors du recalcul des scores.");
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
      // Mettre à jour localement
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
      alert("Erreur lors de la modification de la règle : " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-[#6E6C67] dark:text-[#A1A1AA]">
        <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin mb-3" />
        <span className="text-xs font-medium">Chargement du moteur de scoring...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto pr-1 gap-6 select-none animate-fade-in">
      {/* 1. HEADER DU MOTEUR DE SCORING */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#4F6CE8]/10 text-[#4F6CE8] flex items-center justify-center shrink-0">
            <Icons.Target size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#242124] dark:text-white">
                Moteur de Scoring Déterministe & Règles Métier
              </h2>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                100% Algorithmique Sans IA
              </span>
            </div>
            <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
              Configurez les dimensions, les poids, les règles d&apos;attribution de points et les actions automatiques pour le MSP.
            </p>
          </div>
        </div>

        {/* Boutons d'action : Ouvrir Simulateur & Recalculer */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/admin/scoring-lab"
            className="px-4 py-2.5 rounded-2xl bg-[#4F6CE8]/10 hover:bg-[#4F6CE8]/20 text-[#4F6CE8] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <Icons.Activity size={15} />
            <span>Laboratoire de Test & Simulateur</span>
          </Link>

          <button
            type="button"
            onClick={handleRecalculateAll}
            disabled={calculating || !activeProfile}
            className="px-4 py-2.5 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {calculating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Calcul en cours...</span>
              </>
            ) : (
              <>
                <Icons.Refresh size={14} />
                <span>Recalculer les comptes réels</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Messages Feedback */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <Icons.CheckCircle size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
          <Icons.AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. SÉLECTEUR DE PROFIL DE SCORING */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {profiles.map((p) => {
          const isSelected = p.id === selectedProfileId;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedProfileId(p.id)}
              className={`px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer shrink-0 border ${
                isSelected
                  ? 'bg-white dark:bg-[#2D2A2D] text-[#242124] dark:text-white border-[#4F6CE8] shadow-sm'
                  : 'bg-black/[0.02] dark:bg-white/[0.02] text-[#6E6C67] dark:text-[#A1A1AA] border-transparent hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  p.score_type === 'ACCOUNT_HEALTH' ? 'bg-emerald-500' : 'bg-[#4F6CE8]'
                }`}
              />
              <div className="text-left">
                <span className="block font-bold">{p.name}</span>
                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                  {p.rules.length} règles • Base : {p.base_score} pts • {p.score_type === 'ACCOUNT_HEALTH' ? 'Risque Churn' : 'Expansion Upsell'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {activeProfile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLONNE GAUCHE : Paramètres & Dimensions (1 col) */}
          <div className="flex flex-col gap-6">
            {/* Fiche Métadonnées */}
            <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-4 shadow-xs">
              <h3 className="text-xs font-bold text-[#242124] dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Icons.Sliders size={14} className="text-[#4F6CE8]" />
                <span>Paramètres de Surveillance</span>
              </h3>

              <div className="flex flex-col gap-3 text-xs">
                <div>
                  <span className="text-[#6E6C67] dark:text-[#A1A1AA] text-[11px] block">Objectif :</span>
                  <span className="font-semibold text-[#242124] dark:text-white">{activeProfile.objective}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-black/5 dark:border-white/5">
                  <div>
                    <span className="text-[#6E6C67] dark:text-[#A1A1AA] text-[11px] block">Période d&apos;analyse :</span>
                    <span className="font-semibold text-[#242124] dark:text-white">{activeProfile.analysis_window_days} jours</span>
                  </div>
                  <div>
                    <span className="text-[#6E6C67] dark:text-[#A1A1AA] text-[11px] block">Fréquence :</span>
                    <span className="font-semibold text-[#242124] dark:text-white">{activeProfile.recalculation_frequency}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-black/5 dark:border-white/5">
                  <div>
                    <span className="text-[#6E6C67] dark:text-[#A1A1AA] text-[11px] block">Population cible :</span>
                    <span className="font-semibold text-[#242124] dark:text-white">{activeProfile.population}</span>
                  </div>
                  <div>
                    <span className="text-[#6E6C67] dark:text-[#A1A1AA] text-[11px] block">Score de départ :</span>
                    <span className="font-bold text-[#4F6CE8]">{activeProfile.base_score} / 100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Poids des Dimensions (Doivent totaliser 100%) */}
            <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#242124] dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Icons.Layers size={14} className="text-[#4F6CE8]" />
                  <span>Poids des Dimensions</span>
                </h3>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  Total : 100%
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {activeProfile.dimensions.map((d, i) => (
                  <div key={i} className="flex flex-col gap-1 text-xs">
                    <div className="flex justify-between items-center font-medium">
                      <span className="text-[#242124] dark:text-white">{d.label}</span>
                      <span className="font-bold text-[#4F6CE8]">{d.weight}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-[#4F6CE8] rounded-full transition-all duration-300"
                        style={{ width: `${d.weight}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Seuils & Niveaux d'Alerte */}
            <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-3 shadow-xs">
              <h3 className="text-xs font-bold text-[#242124] dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Icons.Shield size={14} className="text-[#4F6CE8]" />
                <span>Seuils & Actions Déclenchées</span>
              </h3>

              <div className="flex flex-col gap-2">
                {activeProfile.thresholds.map((t, i) => {
                  const action = activeProfile.actions[t.label] || "Aucune action";
                  return (
                    <div
                      key={i}
                      className="p-2.5 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-3 h-3 rounded-full shrink-0 ${
                            t.color === 'emerald'
                              ? 'bg-emerald-500'
                              : t.color === 'blue'
                              ? 'bg-[#4F6CE8]'
                              : t.color === 'amber'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        <div>
                          <span className="font-bold text-[#242124] dark:text-white block">{t.label}</span>
                          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{action}</span>
                        </div>
                      </div>
                      <span className="font-bold text-[#6E6C67] dark:text-[#A1A1AA]">
                        {t.min}–{t.max} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* COLONNE DROITE : Grille des Règles Actives (2 cols) */}
          <div className="lg:col-span-2 bg-white dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
              <div>
                <h3 className="text-sm font-bold text-[#242124] dark:text-white flex items-center gap-2">
                  <Icons.Sliders size={16} className="text-[#4F6CE8]" />
                  <span>Règles Métier Actives ({activeProfile.rules.length})</span>
                </h3>
                <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                  Conditions formelles appliquées lors de chaque calcul automatique.
                </p>
              </div>
            </div>

            {/* Table des Règles */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[#6E6C67] dark:text-[#A1A1AA] border-b border-black/5 dark:border-white/5 pb-2">
                    <th className="py-2.5 px-3 font-semibold">Condition Métier</th>
                    <th className="py-2.5 px-3 font-semibold">Dimension</th>
                    <th className="py-2.5 px-3 font-semibold">Champ & Opérateur</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Points</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {activeProfile.rules.map((rule) => {
                    const isPositive = rule.points > 0;
                    return (
                      <tr key={rule.id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 px-3 font-medium text-[#242124] dark:text-white max-w-xs">
                          {rule.name}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[#6E6C67] dark:text-[#A1A1AA]">
                            {rule.dimension}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#6E6C67] dark:text-[#A1A1AA] font-mono text-[11px]">
                          {rule.field} {rule.operator}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-xl font-bold text-xs ${
                              isPositive
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {isPositive ? `+${rule.points}` : rule.points}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleRule(rule.id, rule.is_active)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold cursor-pointer transition-colors ${
                              rule.is_active
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-rose-500/15 hover:text-rose-700'
                                : 'bg-zinc-500/15 text-zinc-500 hover:bg-emerald-500/15 hover:text-emerald-700'
                            }`}
                          >
                            {rule.is_active ? 'Actif' : 'Désactivé'}
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
    </div>
  );
}
