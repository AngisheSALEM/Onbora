"use client";

import React from 'react';
import { Icons } from '@/components/shared/Icons';
import { ConvertedAccount } from '../adminTypes';

interface AdminConvertedDetailModalProps {
  account: ConvertedAccount | null;
  onClose: () => void;
}

export default function AdminConvertedDetailModal({
  account,
  onClose,
}: AdminConvertedDetailModalProps) {
  if (!account) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl w-full max-w-xl p-6 shadow-2xl flex flex-col gap-5 animate-scale-in text-[#242124] dark:text-white border border-black/5 dark:border-white/5">
        <div className="flex justify-between items-start pb-3 border-b border-black/5 dark:border-white/5">
          <div>
            <span className={`text-[9px] font-medium uppercase px-2 py-0.5 rounded-full ${
              account.converted_by_entity === 'BACK_OFFICE'
                ? 'bg-black/5 dark:bg-white/10 text-[#242124] dark:text-white'
                : 'bg-[#4F6CE8]/15 text-[#4F6CE8]'
            }`}>
              {account.converted_by_entity === 'BACK_OFFICE' ? 'Converti par le Back-Office Terrain' : 'Converti par le KAM Office'}
            </span>
            <h3 className="text-lg font-semibold mt-1">{account.name}</h3>
            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Identifiant CRM : {account.crm_id}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer"
          >
            <Icons.X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs bg-[#F6F5F2] dark:bg-[#242124] p-4 rounded-2xl">
          <div>
            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">Montant Souscrit :</span>
            <span className="text-sm font-medium text-[#242124] dark:text-white">
              +{Number(account.converted_amount).toLocaleString()} $ / an
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">Offre Commerciale :</span>
            <span className="text-xs font-medium text-[#4F6CE8]">
              {account.converted_offer || "Fibre Entreprise Dédiée"}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">Localisation :</span>
            <span className="font-semibold">{account.city} ({account.commune})</span>
          </div>
          <div>
            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">Numéro RCCM :</span>
            <span className="font-semibold">{account.rccm || "CD/KNG/RCCM/22-B-0142"}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">Interlocuteur Décideur :</span>
            <span className="font-semibold">{account.contact_name} ({account.contact_role})</span>
          </div>
          <div>
            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">Téléphone de Contact :</span>
            <span className="font-semibold">{account.contact_phone || "+243..."}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 text-xs">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">Notes de Signature & Raccordement :</span>
          <p className="p-3 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl text-[#6E6C67] dark:text-[#A1A1AA] leading-relaxed">
            {account.conversion_notes || "Dossier KYC et bon de commande validés par le décideur. Étude de tirage fibre lancée."}
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#4F6CE8] text-white rounded-xl text-xs font-medium cursor-pointer hover:bg-[#3D5BD9] transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
