"use client";

import React from 'react';
import { Icons } from '@/components/shared/Icons';
import { EnterpriseItem } from './backofficeTypes';

interface BackofficeAccountDetailModalProps {
  account: EnterpriseItem | null;
  onClose: () => void;
}

export default function BackofficeAccountDetailModal({
  account,
  onClose,
}: BackofficeAccountDetailModalProps) {
  if (!account) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 w-full max-w-lg border border-black/5 dark:border-white/5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div>
            <h3 className="font-extrabold text-sm text-[#242124] dark:text-white">{account.name}</h3>
            <span className="font-mono text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{account.crm_id}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <Icons.X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Secteur & Ville</span>
            <span className="font-semibold text-[#242124] dark:text-white">
              {account.sector || 'SOHO'} • {account.city}
            </span>
          </div>
          <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">RCCM</span>
            <span className="font-mono font-semibold text-[#242124] dark:text-white">
              {account.rccm || 'Non renseigné'}
            </span>
          </div>
          <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Contact Principal</span>
            <span className="font-semibold text-[#242124] dark:text-white">
              {account.contact_name || 'Direction'}
            </span>
            <span className="text-[10px] text-[#4F6CE8]">{account.contact_phone || 'Aucun numéro'}</span>
          </div>
          <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Commercial Affecté</span>
            <span className="font-semibold text-[#242124] dark:text-white">
              {account.assigned_salesperson_name || 'Non affecté'}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-1 text-xs">
          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Solution Proposée & Concurrence</span>
          <div className="flex items-center justify-between mt-1">
            <span className="font-semibold text-[#4F6CE8]">{account.recommended_solution || 'Pack Fibre TPE'}</span>
            <span className="text-[10px] text-zinc-500 font-medium">
              Actuel : {account.current_operator || 'Inconnu'}
            </span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-2xl bg-[#4F6CE8] text-white text-xs font-semibold cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
