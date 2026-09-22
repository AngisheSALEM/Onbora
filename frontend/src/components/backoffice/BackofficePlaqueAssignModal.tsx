"use client";

import React, { useState, useEffect } from 'react';
import { Icons } from '@/components/shared/Icons';
import UserAvatar from '@/components/kam/UserAvatar';
import { PlaqueItem, SalespersonItem } from './backofficeTypes';

interface BackofficePlaqueAssignModalProps {
  plaque: PlaqueItem | null;
  salespersons: SalespersonItem[];
  onClose: () => void;
  onSaveAssignment: (plaqueId: number, salespersonIds: number[]) => Promise<void>;
  successMsg?: string | null;
  errorMsg?: string | null;
}

export default function BackofficePlaqueAssignModal({
  plaque,
  salespersons,
  onClose,
  onSaveAssignment,
  successMsg,
  errorMsg,
}: BackofficePlaqueAssignModalProps) {
  const [assignedIds, setAssignedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (plaque) {
      setAssignedIds(plaque.assigned_salespersons || []);
    }
  }, [plaque]);

  if (!plaque) return null;

  const toggleSalesperson = (spId: number) => {
    setAssignedIds((prev) =>
      prev.includes(spId) ? prev.filter((id) => id !== spId) : [...prev, spId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveAssignment(plaque.id, assignedIds);
    } catch {
      // Handled by caller
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 w-full max-w-lg border border-black/5 dark:border-white/5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#4F6CE8]/10 text-[#4F6CE8] flex items-center justify-center">
              <Icons.UserPlus size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#242124] dark:text-white">
                Affecter des Commerciaux à la Plaque {plaque.code}
              </h3>
              <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
                {plaque.name} ({plaque.city})
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

        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 shrink-0">
            <Icons.CheckCircle size={15} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-red-500/15 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2 shrink-0">
            <Icons.AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] shrink-0">
          Cochez les commerciaux autorisés et prioritaires pour prospecter ce secteur territorial :
        </p>

        <div className="flex-1 overflow-y-auto divide-y divide-black/5 dark:divide-white/5 rounded-2xl border border-black/5 dark:border-white/5 bg-white dark:bg-[#363336] p-1">
          {salespersons.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
              Aucun commercial terrain disponible.
            </div>
          ) : (
            salespersons.map((sp) => {
              const isChecked = assignedIds.includes(sp.id);
              return (
                <label
                  key={sp.id}
                  className="flex items-center justify-between p-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar src={sp.avatar} name={sp.full_name} size="sm" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-[#242124] dark:text-white">
                        {sp.full_name}
                      </span>
                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                        @{sp.username} • {sp.location || 'Kinshasa'} • {sp.visits_count || 0} visites
                      </span>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSalesperson(sp.id)}
                    className="w-4 h-4 rounded text-[#4F6CE8] focus:ring-[#4F6CE8] border-zinc-300 dark:border-zinc-600 cursor-pointer"
                  />
                </label>
              );
            })
          )}
        </div>

        <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
            {assignedIds.length} commercial(aux) sélectionné(s)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl bg-black/5 dark:bg-white/5 text-xs font-semibold text-[#242124] dark:text-white cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold cursor-pointer transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Icons.Check size={14} className={saving ? "animate-spin" : ""} />
              <span>{saving ? "Enregistrement..." : "Valider l'Affectation"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
