"use client";

import React, { useState } from 'react';
import { Icons } from '@/components/shared/Icons';

interface BackofficeAddSalespersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSalesperson: (data: {
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    phone: string;
    password?: string;
  }) => Promise<void>;
  error?: string | null;
}

export default function BackofficeAddSalespersonModal({
  isOpen,
  onClose,
  onCreateSalesperson,
  error,
}: BackofficeAddSalespersonModalProps) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreateSalesperson(form);
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
            <Icons.UserPlus size={18} className="text-[#4F6CE8]" />
            <h3 className="font-extrabold text-sm text-[#242124] dark:text-white">Nouveau Commercial Terrain</h3>
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
              <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Prénom *</label>
              <input
                required
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                placeholder="Jean"
                className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Nom *</label>
              <input
                required
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                placeholder="Mukendi"
                className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Identifiant (username) *</label>
            <input
              required
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="jean.mukendi"
              className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Email *</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jean@orange.cd"
              className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Téléphone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+243..."
                className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Mot de passe *</label>
              <input
                required
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
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
              {loading ? "Création..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
