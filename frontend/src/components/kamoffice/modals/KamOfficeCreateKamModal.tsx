"use client";

import React, { useState } from 'react';
import { Icons } from '@/components/shared/Icons';

interface KamOfficeCreateKamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateKam: (data: {
    username: string;
    password: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    location: string;
    kam_specialization: 'GRAND_COMPTE' | 'PME';
  }) => Promise<void>;
  error?: string | null;
}

export default function KamOfficeCreateKamModal({
  isOpen,
  onClose,
  onCreateKam,
  error,
}: KamOfficeCreateKamModalProps) {
  const [form, setForm] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    location: 'Kinshasa',
    kam_specialization: 'GRAND_COMPTE' as 'GRAND_COMPTE' | 'PME',
  });
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password || !form.first_name || !form.last_name) {
      setLocalError("Veuillez renseigner tous les champs obligatoires.");
      return;
    }
    setSubmitting(true);
    setLocalError('');
    try {
      await onCreateKam(form);
      setForm({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        location: 'Kinshasa',
        kam_specialization: 'GRAND_COMPTE',
      });
      onClose();
    } catch (err: any) {
      setLocalError(err.message || "Erreur lors de la création du compte KAM.");
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
              Créer un Nouveau Compte KAM
            </h3>
            <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
              Ajouter un gestionnaire de portefeuille à l&apos;équipe
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 cursor-pointer"
          >
            <Icons.X size={16} />
          </button>
        </div>

        {(error || localError) && (
          <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            {error || localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Prénom</label>
              <input
                type="text"
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                placeholder="Chantal"
                className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Nom</label>
              <input
                type="text"
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                placeholder="Kanyinda"
                className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Identifiant Unique</label>
              <input
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="kam_nom"
                className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Mot de Passe</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Email Professionnel</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="kam@onbora.cd"
                className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Téléphone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+243..."
                className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Pôle de Spécialisation</label>
            <select
              value={form.kam_specialization}
              onChange={(e) => setForm({ ...form, kam_specialization: e.target.value as any })}
              className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none cursor-pointer"
            >
              <option value="GRAND_COMPTE">Pôle Grands Comptes (&gt; 1M$)</option>
              <option value="PME">Pôle PME Stratégiques (100k$ - 1M$)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white dark:bg-[#363336] text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/5 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Création en cours..." : "Créer le compte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
