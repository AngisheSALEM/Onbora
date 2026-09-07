"use client";

import React, { useState } from 'react';
import { StrategicVisit, Stakeholder } from './kamTypes';
import { Icons } from '@/components/shared/Icons';

interface KamOrgChartModalProps {
  visit: StrategicVisit | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function KamOrgChartModal({
  visit,
  isOpen,
  onClose
}: KamOrgChartModalProps) {
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null);
  const [filterRole, setFilterRole] = useState<string>('ALL');

  if (!isOpen || !visit) return null;

  const stakeholders = visit.briefing.stakeholders_mapping;
  const filteredStakeholders = filterRole === 'ALL'
    ? stakeholders
    : stakeholders.filter((s) => s.role_in_decision === filterRole);

  const roleColors: Record<string, { bg: string; text: string; border: string }> = {
    ECONOMIC_BUYER: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30' },
    CHAMPION: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
    TECHNICAL_BUYER: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
    INFLUENCER: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
    BLOCKER: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30' },
    GATEKEEPER: { bg: 'bg-zinc-500/10', text: 'text-zinc-600 dark:text-zinc-400', border: 'border-zinc-500/30' }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-white dark:bg-[#121215] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-zinc-50 dark:bg-[#1C1C1E] border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <Icons.Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white">
                Cartographie Décisionnelle (MEDDIC) — {visit.account_name}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Organigramme des parties prenantes, niveau d&apos;influence et posture vis-à-vis d&apos;Orange.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <Icons.Close size={20} />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 p-4 bg-zinc-100/60 dark:bg-black/40 border-b border-black/5 dark:border-white/5 text-xs font-semibold">
          <span className="text-zinc-400 text-[11px] uppercase mr-2">Filtrer par Rôle :</span>
          {['ALL', 'ECONOMIC_BUYER', 'CHAMPION', 'TECHNICAL_BUYER', 'INFLUENCER', 'BLOCKER'].map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-3 py-1 rounded-full transition-all ${
                filterRole === role
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
              }`}
            >
              {role === 'ALL' ? 'Tous les Décideurs' : role.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Content: Visual Nodes Grid & Details Panel */}
        <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
          
          {/* Left 2 Cols: Stakeholders Visual Grid */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-max">
            {filteredStakeholders.map((stk) => {
              const styling = roleColors[stk.role_in_decision] || roleColors.GATEKEEPER;
              const isSelected = selectedStakeholder?.id === stk.id;

              return (
                <div
                  key={stk.id}
                  onClick={() => setSelectedStakeholder(stk)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                      : 'bg-zinc-50 dark:bg-[#1C1C1E] border-black/5 dark:border-white/10 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-zinc-900 dark:text-white text-sm">
                        {stk.full_name}
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                        {stk.job_title}
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styling.bg} ${styling.text} ${styling.border}`}>
                      {stk.role_in_decision.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5 dark:border-white/5 text-xs">
                    <span className="text-[11px] font-550 flex items-center gap-1.5">
                      {stk.stance_towards_orange === 'POSITIVE' && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          <span>Allié Orange</span>
                        </>
                      )}
                      {stk.stance_towards_orange === 'NEUTRAL' && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                          <span>Neutre</span>
                        </>
                      )}
                      {stk.stance_towards_orange === 'NEGATIVE' && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                          <span>Bloqueur</span>
                        </>
                      )}
                    </span>
                    <span className="text-zinc-400 text-[10px]">
                      Influence : <strong className="text-zinc-700 dark:text-zinc-300">{stk.influence_level}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Col: Selected Stakeholder Profile Inspector */}
          <div className="p-4 bg-zinc-50 dark:bg-[#1C1C1E] rounded-2xl border border-black/5 dark:border-white/10 flex flex-col justify-between">
            {selectedStakeholder ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase">Fiche Décideur</span>
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-white mt-0.5">
                    {selectedStakeholder.full_name}
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    {selectedStakeholder.job_title}
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5 text-xs space-y-2">
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Rôle MEDDIC :</span>
                    <strong className="text-zinc-900 dark:text-white">{selectedStakeholder.role_in_decision}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Dernier Contact :</span>
                    <span className="text-zinc-700 dark:text-zinc-300">{selectedStakeholder.last_contacted_date || 'Jamais contacté'} (par {selectedStakeholder.last_contacted_by || 'N/A'})</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase block mb-1">Notes Clés & Analyse Comportementale :</span>
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed italic">
                    &ldquo;{selectedStakeholder.key_notes}&rdquo;
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-400 text-xs">
                <Icons.Users size={32} className="mb-2 opacity-40" />
                <span>Sélectionnez un décideur pour afficher sa fiche d&apos;influence détaillée.</span>
              </div>
            )}

            <button
              onClick={() => alert("Fonctionnalité d'ajout de contact MEDDIC")}
              className="mt-4 w-full py-2.5 bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black rounded-xl text-xs font-semibold transition-all"
            >
              + Ajouter un Nouveau Décideur
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
