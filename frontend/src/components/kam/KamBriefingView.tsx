"use client";

import React from 'react';
import { StrategicVisit } from './kamTypes';
import { Icons } from '@/components/shared/Icons';

interface KamBriefingViewProps {
  visits: StrategicVisit[];
  selectedVisitId: string;
  onSelectVisitId: (id: string) => void;
  onLaunchDebrief: (visit: StrategicVisit) => void;
}

export default function KamBriefingView({
  visits,
  selectedVisitId,
  onSelectVisitId,
  onLaunchDebrief
}: KamBriefingViewProps) {
  const selectedVisit = visits.find((v) => v.id === selectedVisitId) || visits[0];
  const briefing = selectedVisit.briefing;

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; color: string }> = {
      ECONOMIC_BUYER: { label: 'Economic Buyer', color: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300' },
      CHAMPION: { label: 'Champion', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300' },
      TECHNICAL_BUYER: { label: 'Tech Buyer', color: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300' },
      INFLUENCER: { label: 'Influenceur', color: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200' },
      BLOCKER: { label: 'Bloqueur / Risque', color: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300' },
      GATEKEEPER: { label: 'Gatekeeper', color: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300' }
    };
    return roles[role] || { label: role, color: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300' };
  };

  const getStanceBadge = (stance: string) => {
    switch (stance) {
      case 'POSITIVE':
        return (
          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
            <Icons.CheckCircle size={13} />
            <span>Allié Orange</span>
          </span>
        );
      case 'NEGATIVE':
        return (
          <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5">
            <Icons.AlertCircle size={13} />
            <span>Bloqueur</span>
          </span>
        );
      case 'NEUTRAL':
        return (
          <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
            <Icons.Clock size={13} />
            <span>Pragmatique</span>
          </span>
        );
      default:
        return (
          <span className="text-zinc-400 font-bold flex items-center gap-1.5">
            <Icons.HelpCircle size={13} />
            <span>Inconnu</span>
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-8 overflow-y-auto select-none">
      
      {/* Top Bar : Account Switcher Pills */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-white/5">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Fiche Briefing 360° Pré-Visite
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Dossier consolidé de préparation (lecture en 5 min) pour le rendez-vous C-Level.
          </p>
        </div>

        {/* Account Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
          {visits.map((v) => {
            const isSelected = v.id === selectedVisit.id;
            return (
              <button
                key={v.id}
                onClick={() => onSelectVisitId(v.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md font-black'
                    : 'bg-[#F6F5F2] dark:bg-[#2D2A2D] text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-[#363336] shadow-sm'
                }`}
              >
                {v.account_name.split(' (')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Header Card of the Account */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[32px] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm border border-black/5 dark:border-white/5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#191816] dark:bg-[#363336] text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
            {selectedVisit.account_name.charAt(0)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                {selectedVisit.account_name}
              </h3>
              <span className="px-3 py-1 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 text-xs font-bold rounded-full">
                {briefing.industry}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
              Rendez-vous prévu aujourd&apos;hui à <strong className="text-zinc-900 dark:text-white font-mono">{selectedVisit.meeting_time}</strong> ({selectedVisit.duration_minutes} min) — {selectedVisit.location}
            </p>
          </div>
        </div>

        {/* Action Button : Launch Debrief (Cobalt Blue 10% CTA) */}
        <button
          onClick={() => onLaunchDebrief(selectedVisit)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black rounded-full shadow-md transition-all shrink-0 cursor-pointer"
        >
          <Icons.Mic size={16} />
          <span>Lancer le Débriefing de Réunion</span>
        </button>
      </div>

      {/* Règle d'or Cruciale */}
      <div className="p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl flex items-start gap-4 text-xs text-blue-950 dark:text-blue-200 border border-blue-200/60 dark:border-blue-500/20">
        <Icons.Shield size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-black text-blue-900 dark:text-blue-100 uppercase tracking-wide block mb-0.5">
            Règle d&apos;Or Avant d&apos;Entrer en Salle de Réunion :
          </strong>
          <span className="text-zinc-700 dark:text-zinc-300 font-medium">{selectedVisit.golden_rule}</span>
        </div>
      </div>

      {/* 3 Main Structured Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Section 1 : Firmographics & Contrats En Cours */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 flex flex-col gap-4 shadow-sm border border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Icons.Building size={16} className="text-blue-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Structure & Chiffres Clés
              </h4>
            </div>

            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
              {briefing.firmographics.business_model_summary}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-200/60 dark:border-white/5 text-xs">
              <div>
                <span className="text-zinc-400 block text-[10px]">Effectif</span>
                <span className="font-bold text-zinc-900 dark:text-white">{briefing.firmographics.headcount.toLocaleString()} employés</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">Chiffre d&apos;Affaires</span>
                <span className="font-bold text-zinc-900 dark:text-white">{briefing.firmographics.estimated_annual_revenue}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">Sites Raccordés</span>
                <span className="font-bold text-zinc-900 dark:text-white">{briefing.firmographics.locations_count} agences</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">Présence</span>
                <span className="font-bold text-zinc-900 dark:text-white">{briefing.firmographics.countries.join(', ')}</span>
              </div>
            </div>
          </div>

          {/* Contrats & Concurrents */}
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 flex flex-col gap-4 shadow-sm border border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Icons.Layers size={16} className="text-zinc-600 dark:text-zinc-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Part de Portefeuille & Concurrents
              </h4>
            </div>

            <div className="p-3 bg-[#E4E1DB] dark:bg-[#363336] rounded-2xl flex items-center justify-between text-xs">
              <span className="text-zinc-600 dark:text-zinc-400">Part Orange : <strong className="text-blue-600 dark:text-blue-400 font-mono">{briefing.orange_relationship.wallet_share_percentage}%</strong></span>
              <span className="text-zinc-600 dark:text-zinc-400">MRR : <strong className="text-zinc-900 dark:text-white font-mono">{briefing.orange_relationship.mrr_current.toLocaleString()} €</strong></span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1.5">Concurrents en place :</span>
              <div className="flex flex-wrap gap-1.5">
                {briefing.technical_environment.current_competitors.map((c, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[11px] font-semibold">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 : Comité Décisionnel (MEDDIC) */}
        <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 flex flex-col gap-4 shadow-sm border border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icons.Users size={16} className="text-blue-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Comité Décisionnel (MEDDIC)
              </h4>
            </div>
          </div>

          {/* Alerte Décideur Manquant */}
          {briefing.missing_stakeholders_alert.length > 0 && (
            <div className="p-3 bg-[#E4E1DB] dark:bg-[#363336] rounded-2xl text-[11px] text-zinc-800 dark:text-zinc-200 space-y-1">
              <strong className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-black">
                <Icons.AlertTriangle size={14} />
                <span>Alerte Décisionnelle :</span>
              </strong>
              {briefing.missing_stakeholders_alert.map((alert, i) => (
                <div key={i}>• {alert}</div>
              ))}
            </div>
          )}

          {/* Stakeholders Cards */}
          <div className="space-y-3 overflow-y-auto flex-1">
            {briefing.stakeholders_mapping.map((stk) => {
              const role = getRoleBadge(stk.role_in_decision);
              return (
                <div key={stk.id} className="p-4 bg-[#E4E1DB] dark:bg-[#363336] rounded-2xl text-xs space-y-2 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-white text-sm">
                        {stk.full_name}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {stk.job_title}
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${role.color}`}>
                      {role.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 text-[11px]">
                    <div>{getStanceBadge(stk.stance_towards_orange)}</div>
                    <span className="text-zinc-400 text-[10px]">Contact : {stk.last_contacted_date || 'N/A'}</span>
                  </div>

                  <p className="text-[11px] text-zinc-700 dark:text-zinc-300 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-2.5 rounded-xl leading-relaxed italic">
                    &ldquo;{stk.key_notes}&rdquo;
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3 : Playbook & Pains IA Détectés */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Icons.Brain size={16} className="text-[#4F6CE8]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#4F6CE8] dark:text-[#7B92F2]">
                Pains & Opportunités IA
              </h4>
            </div>

            <div className="space-y-3">
              {briefing.ai_hypotheses_and_playbook.pain_hypotheses.map((p, i) => (
                <div key={i} className="p-3.5 bg-[#E4E1DB] dark:bg-[#363336] rounded-2xl text-xs space-y-1.5">
                  <div className="font-bold text-zinc-900 dark:text-white">
                    {i + 1}. {p.hypothesis}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    <strong>Preuve :</strong> {p.trigger_evidence}
                  </div>
                  <div className="p-2 bg-[#4F6CE8]/10 dark:bg-[#4F6CE8]/20 rounded-xl text-[11px] text-[#4F6CE8] dark:text-[#7B92F2] font-semibold">
                    Angle de question : {p.discovery_angle}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agenda & Pièges */}
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 flex flex-col gap-3 shadow-sm flex-1">
            <div className="flex items-center gap-2">
              <Icons.Target size={16} className="text-[#4F6CE8]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Agenda de Négociation (45 min)
              </h4>
            </div>

            <div className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
              {briefing.visit_strategy.suggested_agenda.map((ag, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F6CE8] shrink-0 mt-1.5" />
                  <span>{ag}</span>
                </div>
              ))}
            </div>

            <div className="pt-3">
              <span className="font-bold text-rose-600 dark:text-rose-400 text-[11px] uppercase flex items-center gap-1.5 mb-1">
                <Icons.AlertTriangle size={13} />
                <span>Pièges à Éviter :</span>
              </span>
              <div className="space-y-1">
                {briefing.visit_strategy.traps_to_avoid.map((trap, i) => (
                  <div key={i} className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                    • {trap}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
