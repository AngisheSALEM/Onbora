"use client";

import React, { useState, useEffect } from 'react';
import { Icons } from '@/components/shared/Icons';
import { KamAccount, KamUser } from '../kamOfficeTypes';

interface KamOfficeAssignModalProps {
  account: KamAccount | null;
  kamsList: KamUser[];
  onClose: () => void;
  onConfirmAssignment: (enterpriseId: number, kamId: number | null) => Promise<void>;
}

export default function KamOfficeAssignModal({
  account,
  kamsList,
  onClose,
  onConfirmAssignment,
}: KamOfficeAssignModalProps) {
  const [targetKamId, setTargetKamId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setTargetKamId(account.assigned_kam ? account.assigned_kam.id : null);
    }
  }, [account]);

  if (!account) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirmAssignment(account.id, targetKamId);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-2xl border border-black/10 dark:border-white/10 flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Affectation du Compte Clé
            </h3>
            <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
              {account.name} ({account.segment === 'GRAND_COMPTE' ? 'Grand Compte' : 'PME Stratégique'})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 cursor-pointer"
          >
            <Icons.X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Sélectionnez le Key Account Manager responsable :
          </label>

          <select
            value={targetKamId || ''}
            onChange={(e) => setTargetKamId(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-2xl p-3 text-xs font-semibold text-zinc-900 dark:text-white outline-none cursor-pointer"
          >
            <option value="">-- Vivier Non Affecté (Désaffecter) --</option>
            {kamsList.map((kam) => (
              <option key={kam.id} value={kam.id}>
                {kam.full_name} ({kam.kam_specialization === 'GRAND_COMPTE' ? 'Pôle Grands Comptes' : 'Pôle PME'}) • {kam.assigned_total_count} comptes en cours
              </option>
            ))}
          </select>

          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-[11px] text-[#6E6C67] dark:text-[#A1A1AA] leading-relaxed">
            L&apos;affectation délègue l&apos;accès complet au dossier client, au brief pré-visite et à la cartographie d&apos;architecture cible dans l&apos;espace de ce KAM.
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white dark:bg-[#363336] text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/5 cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="px-5 py-2 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Icons.Loader size={14} className="animate-spin" />}
            <span>Confirmer l&apos;affectation</span>
          </button>
        </div>
      </div>
    </div>
  );
}
