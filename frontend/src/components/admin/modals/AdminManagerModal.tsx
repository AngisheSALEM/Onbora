"use client";

import React, { useState } from 'react';
import { Icons } from '@/components/shared/Icons';
import ProfilePhotoUploader from '@/components/shared/ProfilePhotoUploader';

interface AdminManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: 'SUPERVISOR' | 'KAM_MANAGER';
  onCreateManager: (managerData: {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    password?: string;
    role: 'SUPERVISOR' | 'KAM_MANAGER';
    phone: string;
    location: string;
    avatar?: string;
  }) => Promise<void>;
  error?: string | null;
}

export default function AdminManagerModal({
  isOpen,
  onClose,
  targetRole,
  onCreateManager,
  error,
}: AdminManagerModalProps) {
  const [form, setForm] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    location: '',
    avatar: '',
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreateManager({
        ...form,
        role: targetRole,
      });
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-5 animate-scale-in text-[#242124] dark:text-white border border-black/5 dark:border-white/5">
        <div className="flex justify-between items-center pb-2 border-b border-black/5 dark:border-white/5">
          <div>
            <h3 className="text-base font-semibold">
              {targetRole === 'SUPERVISOR' ? 'Nouveau Superviseur Back-Office Terrain' : 'Nouveau Gérant KAM Office'}
            </h3>
            <p className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
              {targetRole === 'SUPERVISOR'
                ? 'Gestionnaire des commerciaux terrain et des découpages de plaques cartographiques.'
                : 'Responsable du pool de Key Account Managers et du portefeuille Grands Comptes.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer"
          >
            <Icons.X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-500/10 text-red-500 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Prénom</label>
              <input
                type="text"
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                placeholder="Ex: Alain"
                className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Nom</label>
              <input
                type="text"
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                placeholder="Ex: Mabiala"
                className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Identifiant (Login)</label>
              <input
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().trim() })}
                placeholder="Ex: sup_kinshasa"
                className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Mot de Passe</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Email professionnel</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="alain@onbora.cg"
                className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Téléphone mobile</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+243810000000"
                className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">
              {targetRole === 'SUPERVISOR' ? 'Direction Régionale / Ville de Supervision' : 'Portefeuille de spécialisation'}
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder={targetRole === 'SUPERVISOR' ? 'Ex: Direction Régionale Kinshasa' : 'Ex: Banques & Groupes Miniers Katanga'}
              className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <ProfilePhotoUploader
              currentPhotoUrl={form.avatar && form.avatar.startsWith('/') ? form.avatar : null}
              name={form.username || "Nouveau manager"}
              title="Photo de profil du collaborateur"
              description="Téléversez la photo du collaborateur pour son profil Onbora officiel."
              allowSelfUpdate={false}
              size="sm"
              onPhotoUploaded={(uploadedUrl) => {
                setForm({ ...form, avatar: uploadedUrl });
              }}
              onPhotoRemoved={() => {
                setForm({ ...form, avatar: '/avatars/default_avatar.svg' });
              }}
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-black/5 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 font-medium hover:bg-black/10 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white rounded-xl font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Icons.CheckCircle size={14} />
              <span>{loading ? "Création en cours..." : "Créer le Compte"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
