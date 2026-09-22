"use client";

import React from 'react';
import { Icons } from '@/components/shared/Icons';
import UserAvatar from '@/components/kam/UserAvatar';
import { KamAccount } from '../kamOfficeTypes';

interface KamOfficeAccountDetailModalProps {
  account: KamAccount | null;
  onClose: () => void;
  onOpenAssignModal?: (account: KamAccount) => void;
}

export default function KamOfficeAccountDetailModal({
  account,
  onClose,
  onOpenAssignModal,
}: KamOfficeAccountDetailModalProps) {
  if (!account) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-xl bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-2xl border border-black/10 dark:border-white/10 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        
        {/* En-tête */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 dark:bg-black text-white flex items-center justify-center font-extrabold text-sm shrink-0">
              {account.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm text-[#242124] dark:text-white">
                  {account.name}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  account.segment === 'GRAND_COMPTE'
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                    : 'bg-[#4F6CE8]/15 text-[#4F6CE8]'
                }`}>
                  {account.segment === 'GRAND_COMPTE' ? 'Grand Compte (> 1M$)' : 'PME Stratégique'}
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                {account.crm_id || `CRM-${account.id}`} • {account.city}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <Icons.X size={16} />
          </button>
        </div>

        {/* Grille d'Informations */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Secteur & Localisation</span>
            <span className="font-semibold text-[#242124] dark:text-white mt-0.5">
              {account.sector || 'Secteur Tertiaire'}
            </span>
            <span className="text-[10px] text-zinc-500">
              {account.commune ? `${account.commune}, ` : ''}{account.city}
            </span>
          </div>

          <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Identifiants Légaux</span>
            <span className="font-mono font-semibold text-[#242124] dark:text-white mt-0.5">
              RCCM : {account.rccm || 'Non renseigné'}
            </span>
            <span className="font-mono text-[10px] text-zinc-500">
              ID.NAT / NIF : Valide RDC
            </span>
          </div>

          <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Chiffre d&apos;Affaires & Effectif</span>
            <span className="font-bold text-[#4F6CE8] mt-0.5">
              {Number(account.annual_revenue).toLocaleString('fr-FR')} $ / an
            </span>
            <span className="text-[10px] text-zinc-500">
              {account.employee_count || 50} collaborateurs
            </span>
          </div>

          <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Contact Décisionnaire Enregistré</span>
            <span className="font-semibold text-[#242124] dark:text-white mt-0.5">
              {account.contact_name || 'Direction Générale'}
            </span>
            <span className="text-[10px] text-[#4F6CE8] font-mono">
              {account.contact_phone || 'Aucun numéro renseigné'}
            </span>
            {account.contact_email && (
              <span className="text-[10px] text-zinc-500 truncate">
                {account.contact_email}
              </span>
            )}
          </div>
        </div>

        {/* Solution Donnée / Proposée & Concurrence */}
        <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
              Solution Proposée & Architecture Cible
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              Segment : <strong className="text-zinc-700 dark:text-zinc-300">{account.segment === 'GRAND_COMPTE' ? 'Grand Compte' : 'PME Stratégique'}</strong>
            </span>
          </div>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-black/5 dark:border-white/5">
            <span className="font-bold text-[#4F6CE8]">
              {account.recommended_solution || (account.segment === 'GRAND_COMPTE' ? 'Liaison Fibre Dédiée Symétrique 1 Gbps + SD-WAN Managé & Double Adduction' : 'Pack Entreprise Fibre Pro 200 Mbps + Téléphonie IP')}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
              99.99% SLA
            </span>
          </div>
        </div>

        {/* Remises & Conditions Accordées */}
        <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-2 text-xs">
          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
            Remises & Barèmes Accordés
          </span>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-black/3 dark:bg-white/3 flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">Remise Engagement Pluriannuel :</span>
              <strong className="text-[#4F6CE8] font-mono">-15% (36 mois)</strong>
            </div>
            <div className="p-2 rounded-xl bg-black/3 dark:bg-white/3 flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">Frais de Raccordement Optique :</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Offerts</strong>
            </div>
            <div className="p-2 rounded-xl bg-black/3 dark:bg-white/3 flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">Bascule Secours 4G/Satellite :</span>
              <strong className="text-zinc-900 dark:text-white font-semibold">Incluse</strong>
            </div>
            <div className="p-2 rounded-xl bg-black/3 dark:bg-white/3 flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">Modalité de Facturation :</span>
              <strong className="text-zinc-900 dark:text-white font-semibold">Terme échu (Net 30)</strong>
            </div>
          </div>
        </div>

        {/* KAM Affecté */}
        <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center font-extrabold text-xs overflow-hidden shrink-0">
              {account.assigned_kam ? (
                <UserAvatar
                  src={account.assigned_kam.avatar}
                  alt="KAM"
                  size="sm"
                />
              ) : (
                <Icons.User size={16} className="text-zinc-400" />
              )}
            </div>
            <div>
              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">Key Account Manager Dédié</span>
              <span className="font-bold text-[#242124] dark:text-white">
                {account.assigned_kam?.full_name || 'Aucun KAM assigné'}
              </span>
            </div>
          </div>

          {onOpenAssignModal && (
            <button
              onClick={() => onOpenAssignModal(account)}
              className="px-3 py-1.5 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Icons.UserPlus size={13} />
              <span>{account.assigned_kam ? "Changer d'affectation" : "Affecter un KAM"}</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-2xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-900 dark:text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
