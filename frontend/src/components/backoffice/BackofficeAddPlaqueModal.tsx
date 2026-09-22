"use client";

import React, { useState } from 'react';
import { Icons } from '@/components/shared/Icons';

interface BackofficeAddPlaqueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePlaque: (data: {
    code: string;
    city: string;
    name: string;
    latitude: number;
    longitude: number;
    radius_km: number;
  }) => Promise<void>;
  error?: string | null;
}

export default function BackofficeAddPlaqueModal({
  isOpen,
  onClose,
  onCreatePlaque,
  error,
}: BackofficeAddPlaqueModalProps) {
  const [form, setForm] = useState({
    code: '',
    city: 'Kinshasa',
    name: '',
    latitude: -4.325,
    longitude: 15.3222,
    radius_km: 1.5,
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreatePlaque(form);
      onClose();
    } catch {
      // Handled by caller
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 w-full max-w-md border border-black/5 dark:border-white/5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <Icons.Layers size={18} className="text-[#4F6CE8]" />
            <h3 className="font-extrabold text-sm text-[#242124] dark:text-white">Créer une Plaque Cartographique</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <Icons.X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-500/15 text-red-700 dark:text-red-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Code Plaque *</label>
              <input
                required
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="Ex: PLQ-GOMBE-01"
                className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Ville *</label>
              <input
                required
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Kinshasa"
                className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Nom du Secteur *</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Zone Commerciale Huileries"
              className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-2 py-2 text-xs text-[#242124] dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-2 py-2 text-xs text-[#242124] dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Rayon (km)</label>
              <input
                type="number"
                step="0.1"
                value={form.radius_km}
                onChange={(e) => setForm({ ...form, radius_km: parseFloat(e.target.value) || 1 })}
                className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-2 py-2 text-xs text-[#242124] dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl bg-black/5 dark:bg-white/5 text-xs font-semibold text-[#242124] dark:text-white cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
            >
              {loading ? "Création..." : "Enregistrer la Plaque"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
