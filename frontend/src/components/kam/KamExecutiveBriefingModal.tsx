"use client";

import React, { useState, useEffect } from 'react';
import { StrategicVisit } from './kamTypes';
import { Icons } from '@/components/shared/Icons';

interface KamExecutiveBriefingModalProps {
  visit: StrategicVisit | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunchMeetingMode: (visit: StrategicVisit) => void;
}

export default function KamExecutiveBriefingModal({
  visit,
  isOpen,
  onClose,
  onLaunchMeetingMode
}: KamExecutiveBriefingModalProps) {
  const [prepSeconds, setPrepSeconds] = useState<number>(0);
  const [activeSubTab, setActiveSubTab] = useState<'360' | 'meddic' | 'playbook' | 'contracts'>('360');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      timer = setInterval(() => {
        setPrepSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setPrepSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen || !visit) return null;

  const briefing = visit.briefing;
  const minutes = Math.floor(prepSeconds / 60);
  const seconds = prepSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; color: string }> = {
      ECONOMIC_BUYER: { label: 'Economic Buyer', color: 'bg-purple-500/20 text-purple-300' },
      CHAMPION: { label: 'Champion', color: 'bg-emerald-500/20 text-emerald-300' },
      TECHNICAL_BUYER: { label: 'Tech Buyer', color: 'bg-blue-500/20 text-blue-300' },
      INFLUENCER: { label: 'Influenceur', color: 'bg-amber-500/20 text-amber-300' },
      BLOCKER: { label: 'Bloqueur / Risque', color: 'bg-rose-500/20 text-rose-300' },
      GATEKEEPER: { label: 'Gatekeeper', color: 'bg-zinc-700 text-zinc-300' }
    };
    return roles[role] || { label: role, color: 'bg-zinc-800 text-zinc-300' };
  };

  const getStanceBadge = (stance: string) => {
    switch (stance) {
      case 'POSITIVE':
        return (
          <span className="text-emerald-400 font-bold flex items-center gap-1.5">
            <Icons.CheckCircle size={12} />
            <span>Allié Orange</span>
          </span>
        );
      case 'NEGATIVE':
        return (
          <span className="text-rose-400 font-bold flex items-center gap-1.5">
            <Icons.AlertCircle size={12} />
            <span>Bloqueur</span>
          </span>
        );
      case 'NEUTRAL':
        return (
          <span className="text-amber-400 font-bold flex items-center gap-1.5">
            <Icons.Clock size={12} />
            <span>Pragmatique</span>
          </span>
        );
      default:
        return (
          <span className="text-zinc-500 font-bold flex items-center gap-1.5">
            <Icons.HelpCircle size={12} />
            <span>Inconnu</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-7xl max-h-[92vh] flex flex-col bg-[#0B0B0F] text-white rounded-[32px] shadow-2xl overflow-hidden">
        
        {/* TOP BANNER : Bandeau Haut Exécutif (30 sec de lecture) */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 bg-[#121218]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black text-xl shadow-lg">
              {visit.account_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  {visit.account_name}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                  {briefing.industry}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Rendez-vous prévu aujourd&apos;hui à <strong className="text-white font-mono">{visit.meeting_time}</strong> ({visit.duration_minutes} min) — {visit.location}
              </p>
            </div>
          </div>

          {/* Quick KPI Strip */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            <div className="px-4 py-2 bg-[#1A1A22] rounded-2xl text-center">
              <span className="block text-[10px] uppercase font-bold text-zinc-500">MRR Orange</span>
              <span className="text-sm font-mono font-black text-white">
                {briefing.orange_relationship.mrr_current.toLocaleString()} €
              </span>
            </div>

            <div className="px-4 py-2 bg-[#1A1A22] rounded-2xl text-center">
              <span className="block text-[10px] uppercase font-bold text-zinc-500">Part Portefeuille</span>
              <span className="text-sm font-mono font-black text-blue-400">
                {briefing.orange_relationship.wallet_share_percentage}%
              </span>
            </div>

            <div className="px-4 py-2 bg-[#1A1A22] rounded-2xl text-center">
              <span className="block text-[10px] uppercase font-bold text-zinc-500">Dispo SLA 30j</span>
              <span className="text-sm font-mono font-black text-emerald-400">
                99.82%
              </span>
            </div>

            {/* Preparation Timer Badge */}
            <div className="flex items-center gap-2 px-3.5 py-2 bg-amber-500/10 rounded-2xl text-amber-400">
              <Icons.Clock size={16} />
              <div className="text-left">
                <span className="block text-[9px] uppercase font-bold text-amber-500/80">Temps Prépa</span>
                <span className="text-xs font-mono font-black">{timeFormatted}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-[#1A1A22] rounded-full transition-colors cursor-pointer"
            >
              <Icons.Close size={20} />
            </button>
          </div>
        </div>

        {/* SUB-NAVIGATION TABS */}
        <div className="flex items-center gap-2 px-6 py-3 bg-[#08080C] text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('360')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
              activeSubTab === '360' ? 'bg-white text-black font-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Vue 360° Z-Pattern
          </button>
          <button
            onClick={() => setActiveSubTab('meddic')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
              activeSubTab === 'meddic' ? 'bg-white text-black font-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Comité MEDDIC & Décideurs ({briefing.stakeholders_mapping.length})
          </button>
          <button
            onClick={() => setActiveSubTab('playbook')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
              activeSubTab === 'playbook' ? 'bg-white text-black font-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Playbook Visite & IA
          </button>
          <button
            onClick={() => setActiveSubTab('contracts')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
              activeSubTab === 'contracts' ? 'bg-white text-black font-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Contrats & Incidents
          </button>
        </div>

        {/* MODAL BODY : 3 COLUMNS Z-PATTERN WITH GENEROUS WHITESPACE */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLONNE 1 : Le Compte & Environnement Technique (3 min) */}
          <div className="flex flex-col gap-5">
            <div className="p-5 bg-[#121218] rounded-3xl">
              <div className="flex items-center gap-2 mb-3">
                <Icons.Building size={16} className="text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Firmographics & Activité
                </h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                {briefing.firmographics.business_model_summary}
              </p>
              
              <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-[#1C1C24] text-xs">
                <div>
                  <span className="text-zinc-500 block text-[10px]">Effectif</span>
                  <span className="font-bold text-white">{briefing.firmographics.headcount.toLocaleString()} employés</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Chiffre d&apos;Affaires</span>
                  <span className="font-bold text-white">{briefing.firmographics.estimated_annual_revenue}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Sites & Agences</span>
                  <span className="font-bold text-white">{briefing.firmographics.locations_count} sites</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Présence</span>
                  <span className="font-bold text-white">{briefing.firmographics.countries.join(', ')}</span>
                </div>
              </div>
            </div>

            {/* Stack Technique & Concurrents */}
            <div className="p-5 bg-[#121218] rounded-3xl">
              <div className="flex items-center gap-2 mb-3">
                <Icons.Layers size={16} className="text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Stack & Concurrents en Place
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block">Concurrents installés :</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {briefing.technical_environment.current_competitors.map((c, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 text-[11px] font-semibold">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block">Stack Télécom & Cloud :</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {briefing.technical_environment.installed_cloud_telecom_stack.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-[#1C1C24] text-zinc-300 text-[11px] font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Signaux d'Intention Récents */}
            <div className="p-5 bg-[#121218] rounded-3xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icons.Sparkles size={16} className="text-orange-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400">
                    Signaux d&apos;Intention IA ({briefing.trigger_signals.length})
                  </h3>
                </div>
              </div>

              <div className="space-y-2.5">
                {briefing.trigger_signals.map((sig) => (
                  <div key={sig.id} className="p-3 bg-[#1A1A22] rounded-2xl text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-orange-400 text-[10px] uppercase">
                        {sig.category}
                      </span>
                      <span className="text-[10px] text-zinc-500">{sig.date}</span>
                    </div>
                    <div className="font-bold text-white mt-1">
                      {sig.title}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      {sig.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COLONNE 2 : Organigramme Décisionnel & MEDDIC (2 min) */}
          <div className="flex flex-col gap-5">
            {/* Warning Stakeholder Alert */}
            {briefing.missing_stakeholders_alert.length > 0 && (
              <div className="p-4 bg-amber-500/10 rounded-3xl text-xs text-amber-300">
                <div className="flex items-center gap-2 font-bold mb-1.5">
                  <Icons.AlertCircle size={16} className="text-amber-400" />
                  <span>Alerte Décisionnelle</span>
                </div>
                <ul className="space-y-1 pl-4 list-disc text-[11px] text-amber-200">
                  {briefing.missing_stakeholders_alert.map((alert, i) => (
                    <li key={i}>{alert}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Stakeholders Card Feed */}
            <div className="p-5 bg-[#121218] rounded-3xl flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icons.Users size={16} className="text-purple-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Comité d&apos;Achat ({briefing.stakeholders_mapping.length})
                  </h3>
                </div>
              </div>

              <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                {briefing.stakeholders_mapping.map((stk) => {
                  const roleBadge = getRoleBadge(stk.role_in_decision);
                  return (
                    <div key={stk.id} className="p-4 bg-[#1A1A22] rounded-2xl text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-white text-sm">
                            {stk.full_name}
                          </div>
                          <div className="text-[11px] text-zinc-400 font-medium">
                            {stk.job_title}
                          </div>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${roleBadge.color}`}>
                          {roleBadge.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-[#242430] text-[11px]">
                        <div>{getStanceBadge(stk.stance_towards_orange)}</div>
                        <span className="text-zinc-500 text-[10px]">
                          Contact : {stk.last_contacted_date || 'N/A'}
                        </span>
                      </div>

                      <div className="mt-2 text-[11px] text-zinc-300 bg-[#121218] p-2.5 rounded-xl leading-relaxed">
                        &ldquo;{stk.key_notes}&rdquo;
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* COLONNE 3 : Le Playbook Visite IA & Stratégie (3 min) */}
          <div className="flex flex-col gap-5">
            {/* Hypothèses de Douleur IA */}
            <div className="p-5 bg-[#121218] rounded-3xl">
              <div className="flex items-center gap-2 mb-3">
                <Icons.Brain size={16} className="text-purple-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Hypothèses de Douleur Détectées
                </h3>
              </div>

              <div className="space-y-3">
                {briefing.ai_hypotheses_and_playbook.pain_hypotheses.map((p, i) => (
                  <div key={i} className="p-3.5 bg-[#1A1A22] rounded-2xl text-xs">
                    <div className="font-bold text-white leading-snug">
                      {i + 1}. {p.hypothesis}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">
                      <strong>Preuve :</strong> {p.trigger_evidence}
                    </div>
                    <div className="mt-2.5 p-2.5 bg-purple-500/10 rounded-xl text-[11px] text-purple-200 font-semibold">
                      Angle de découverte : {p.discovery_angle}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agenda Recommandé & Pièges à Éviter */}
            <div className="p-5 bg-[#121218] rounded-3xl flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Icons.Target size={16} className="text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Agenda & Pièges de la Visite
                </h3>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="font-bold text-white">
                  Déroulé Recommandé (45 min) :
                </div>
                <div className="space-y-1.5 pl-2">
                  {briefing.visit_strategy.suggested_agenda.map((ag, i) => (
                    <div key={i} className="text-[11px] text-zinc-300 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                      <span>{ag}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-[#1C1C24]">
                  <span className="font-bold text-red-400 text-[11px] uppercase flex items-center gap-1.5 mb-1">
                    <Icons.AlertTriangle size={13} />
                    <span>Pièges à Éviter Absolument :</span>
                  </span>
                  <div className="space-y-1">
                    {briefing.visit_strategy.traps_to_avoid.map((trap, i) => (
                      <div key={i} className="text-[11px] text-zinc-400 italic">
                        • {trap}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="flex items-center justify-between p-5 bg-[#121218]">
          <div className="text-xs text-zinc-400">
            Temps de lecture recommandé : <strong>5–10 min</strong> | Statut : <span className="text-emerald-400 font-bold">Briefing 100% Consolidé</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-[#1A1A22] transition-all cursor-pointer"
            >
              Fermer
            </button>

            <button
              onClick={() => {
                onClose();
                onLaunchMeetingMode(visit);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-lg transition-all cursor-pointer"
            >
              <Icons.Mic size={15} />
              <span>Valider ma préparation & Lancer le mode Réunion</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
