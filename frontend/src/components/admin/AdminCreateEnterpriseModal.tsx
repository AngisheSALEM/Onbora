"use client";

import React, { useState } from 'react';
import { Icons } from '@/components/shared/Icons';

export interface AdminEnterpriseCreatePayload {
  name: string;
  crm_id: string;
  sector: string;
  annual_revenue: number;
  employee_count: number;
  city: string;
  commune: string;
  contact_name: string;
  contact_role: string;
  contact_phone: string;
  contact_email: string;
  current_connectivity: string;
}

interface AdminCreateEnterpriseModalProps {
  isOpen: boolean;
  isSaving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: AdminEnterpriseCreatePayload) => Promise<void>;
}

const initialForm: AdminEnterpriseCreatePayload = {
  name: '',
  crm_id: '',
  sector: '',
  annual_revenue: 0,
  employee_count: 1,
  city: 'Kinshasa',
  commune: '',
  contact_name: '',
  contact_role: '',
  contact_phone: '',
  contact_email: '',
  current_connectivity: '4G LTE',
};

export default function AdminCreateEnterpriseModal({
  isOpen,
  isSaving,
  error,
  onClose,
  onSubmit,
}: AdminCreateEnterpriseModalProps) {
  const [form, setForm] = useState(initialForm);

  if (!isOpen) return null;

  const updateField = <K extends keyof AdminEnterpriseCreatePayload>(key: K, value: AdminEnterpriseCreatePayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit({
      ...form,
      name: form.name.trim(),
      crm_id: form.crm_id.trim(),
      sector: form.sector.trim(),
      city: form.city.trim(),
      commune: form.commune.trim(),
      contact_name: form.contact_name.trim(),
      contact_role: form.contact_role.trim(),
      contact_phone: form.contact_phone.trim(),
      contact_email: form.contact_email.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="create-enterprise-title">
      <form onSubmit={handleSubmit} className="my-8 flex w-full max-w-2xl flex-col gap-5 rounded-3xl border border-black/10 bg-[#F6F5F2] p-6 text-zinc-900 shadow-2xl dark:border-white/10 dark:bg-[#2D2A2D] dark:text-white">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 pb-4 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#4F6CE8] text-white">
              <Icons.Building size={18} />
            </div>
            <div>
              <h2 id="create-enterprise-title" className="text-base font-semibold">Nouvelle entreprise CRM</h2>
              <p className="mt-0.5 text-xs text-[#6E6C67] dark:text-[#A1A1AA]">Le segment et l&apos;entité destinataire sont calculés selon les seuils de segmentation.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl p-1.5 text-zinc-400 transition-colors hover:bg-black/5 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Fermer">
            <Icons.X size={17} />
          </button>
        </div>

        {error && <div className="rounded-2xl bg-rose-500/15 px-3 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300">{error}</div>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium">Nom de l&apos;entreprise *
            <input required value={form.name} onChange={(e) => updateField('name', e.target.value)} className="rounded-xl border border-black/5 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4F6CE8] dark:border-white/10 dark:bg-[#242124]" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">Identifiant CRM
            <input value={form.crm_id} onChange={(e) => updateField('crm_id', e.target.value)} placeholder="Ex. CRM-CD-1002" className="rounded-xl border border-black/5 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4F6CE8] dark:border-white/10 dark:bg-[#242124]" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">Secteur d&apos;activité *
            <input required value={form.sector} onChange={(e) => updateField('sector', e.target.value)} placeholder="Ex. Télécoms et IT" className="rounded-xl border border-black/5 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4F6CE8] dark:border-white/10 dark:bg-[#242124]" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">Chiffre d&apos;affaires annuel (USD) *
            <input required type="number" min="0" step="0.01" value={form.annual_revenue} onChange={(e) => updateField('annual_revenue', Number(e.target.value))} className="rounded-xl border border-black/5 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4F6CE8] dark:border-white/10 dark:bg-[#242124]" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">Effectif *
            <input required type="number" min="1" value={form.employee_count} onChange={(e) => updateField('employee_count', Number(e.target.value))} className="rounded-xl border border-black/5 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4F6CE8] dark:border-white/10 dark:bg-[#242124]" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">Connectivité actuelle
            <select value={form.current_connectivity} onChange={(e) => updateField('current_connectivity', e.target.value)} className="rounded-xl border border-black/5 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4F6CE8] dark:border-white/10 dark:bg-[#242124]">
              <option>4G LTE</option><option>Fibre Optique</option><option>Faisceau Hertzien</option><option>VSAT</option><option>Aucune</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">Ville *
            <input required value={form.city} onChange={(e) => updateField('city', e.target.value)} className="rounded-xl border border-black/5 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4F6CE8] dark:border-white/10 dark:bg-[#242124]" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">Commune
            <input value={form.commune} onChange={(e) => updateField('commune', e.target.value)} className="rounded-xl border border-black/5 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4F6CE8] dark:border-white/10 dark:bg-[#242124]" />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-black/5 pt-4 sm:grid-cols-2 dark:border-white/5">
          <label className="flex flex-col gap-1 text-xs font-medium">Contact principal
            <input value={form.contact_name} onChange={(e) => updateField('contact_name', e.target.value)} className="rounded-xl border border-black/5 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4F6CE8] dark:border-white/10 dark:bg-[#242124]" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">Fonction
            <input value={form.contact_role} onChange={(e) => updateField('contact_role', e.target.value)} placeholder="Ex. DSI" className="rounded-xl border border-black/5 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4F6CE8] dark:border-white/10 dark:bg-[#242124]" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">Téléphone
            <input value={form.contact_phone} onChange={(e) => updateField('contact_phone', e.target.value)} className="rounded-xl border border-black/5 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4F6CE8] dark:border-white/10 dark:bg-[#242124]" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">E-mail
            <input type="email" value={form.contact_email} onChange={(e) => updateField('contact_email', e.target.value)} className="rounded-xl border border-black/5 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4F6CE8] dark:border-white/10 dark:bg-[#242124]" />
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-black/5 pt-4 dark:border-white/5">
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl px-4 py-2 text-xs font-medium text-[#6E6C67] transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#A1A1AA] dark:hover:bg-white/10">Annuler</button>
          <button type="submit" disabled={isSaving} className="flex items-center gap-2 rounded-xl bg-[#4F6CE8] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#3D5BD9] disabled:cursor-not-allowed disabled:opacity-50">
            {isSaving ? <Icons.Loader size={14} className="animate-spin" /> : <Icons.Plus size={14} />}
            <span>{isSaving ? 'Création…' : 'Créer l’entreprise'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
