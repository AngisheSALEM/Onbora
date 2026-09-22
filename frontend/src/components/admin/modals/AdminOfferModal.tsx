"use client";

import React, { useState, useEffect } from 'react';
import { Icons } from '@/components/shared/Icons';
import { B2BOfferItem } from '../adminTypes';

export interface B2BOfferFormState {
  service_id: string;
  name: string;
  category: string;
  description: string;
  allowed_benefits: string;
  target_customers: string;
  commercial_terms: string;
  need_keywords: string;
  source_url: string;
  rdc_availability: 'published_local' | 'to_confirm';
}

interface AdminOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingOffer: B2BOfferItem | null;
  onSaveOffer: (formState: B2BOfferFormState, isEditMode: boolean) => Promise<void>;
  error?: string | null;
}

export default function AdminOfferModal({
  isOpen,
  onClose,
  editingOffer,
  onSaveOffer,
  error,
}: AdminOfferModalProps) {
  const isEditMode = Boolean(editingOffer);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState<B2BOfferFormState>({
    service_id: '',
    name: '',
    category: 'Internet fixe et réseaux',
    description: '',
    allowed_benefits: '',
    target_customers: '',
    commercial_terms: '',
    need_keywords: '',
    source_url: '',
    rdc_availability: 'published_local',
  });

  useEffect(() => {
    if (editingOffer) {
      setFormState({
        service_id: editingOffer.service_id,
        name: editingOffer.name,
        category: editingOffer.category || 'Internet fixe et réseaux',
        description: editingOffer.description || '',
        allowed_benefits: (editingOffer.allowed_benefits || []).join('\n'),
        target_customers: (editingOffer.target_customers || []).join('\n'),
        commercial_terms: (editingOffer.commercial_terms || []).join('\n'),
        need_keywords: (editingOffer.match?.need_keywords || []).join(', '),
        source_url: editingOffer.source_url || '',
        rdc_availability: editingOffer.rdc_availability || 'published_local',
      });
    } else {
      setFormState({
        service_id: '',
        name: '',
        category: 'Internet fixe et réseaux',
        description: '',
        allowed_benefits: '',
        target_customers: '',
        commercial_terms: '',
        need_keywords: '',
        source_url: '',
        rdc_availability: 'published_local',
      });
    }
  }, [editingOffer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveOffer(formState, isEditMode);
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl w-full max-w-2xl p-6 shadow-2xl flex flex-col gap-5 animate-scale-in text-[#242124] dark:text-white border border-black/5 dark:border-white/5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-2 border-b border-black/5 dark:border-white/5">
          <div>
            <h3 className="text-base font-semibold">
              {isEditMode ? `Modifier l'offre B2B : ${formState.name}` : 'Créer une Nouvelle Offre B2B'}
            </h3>
            <p className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
              Les modifications sont validées par le contrat de données et injectées directement dans le Core AI.
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
              <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">
                Identifiant Unique (service_id)
              </label>
              <input
                type="text"
                required
                disabled={isEditMode}
                value={formState.service_id}
                onChange={(e) => setFormState({ ...formState, service_id: e.target.value.toLowerCase().trim() })}
                placeholder="Ex: fibre_pro_kinshasa"
                className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0 disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">
                Nom Commercial de l'Offre
              </label>
              <input
                type="text"
                required
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                placeholder="Ex: Fibre Entreprise Dédiée 100 Mbps"
                className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Catégorie</label>
              <input
                type="text"
                required
                value={formState.category}
                onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                placeholder="Ex: Internet fixe et réseaux"
                className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Disponibilité RDC</label>
              <select
                value={formState.rdc_availability}
                onChange={(e) => setFormState({ ...formState, rdc_availability: e.target.value as any })}
                className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0 cursor-pointer"
              >
                <option value="published_local">Publié Local RDC (published_local)</option>
                <option value="to_confirm">À confirmer (to_confirm)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Description Complète</label>
            <textarea
              rows={3}
              required
              value={formState.description}
              onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              placeholder="Présentation détaillée de la solution, débits, technologies..."
              className="px-3.5 py-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-normal focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Avantages Permis (1 par ligne)</label>
              <textarea
                rows={3}
                value={formState.allowed_benefits}
                onChange={(e) => setFormState({ ...formState, allowed_benefits: e.target.value })}
                placeholder="Débit garanti 1:1&#10;GTR 4h en RDC&#10;IP fixe incluse"
                className="px-3.5 py-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Clients Cibles (1 par ligne)</label>
              <textarea
                rows={3}
                value={formState.target_customers}
                onChange={(e) => setFormState({ ...formState, target_customers: e.target.value })}
                placeholder="Grands comptes miniers&#10;PME du secteur bancaire"
                className="px-3.5 py-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Conditions Commerciales & Tarifs</label>
              <textarea
                rows={2}
                value={formState.commercial_terms}
                onChange={(e) => setFormState({ ...formState, commercial_terms: e.target.value })}
                placeholder="Sur devis personnalisé selon éligibilité fibre"
                className="px-3.5 py-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Mots-clés de Matching Core AI (séparés par virgules)</label>
              <textarea
                rows={2}
                value={formState.need_keywords}
                onChange={(e) => setFormState({ ...formState, need_keywords: e.target.value })}
                placeholder="fibre, débit garanti, gtr 4h, internet haut débit"
                className="px-3.5 py-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">URL Source / Documentation Publique</label>
            <input
              type="url"
              value={formState.source_url}
              onChange={(e) => setFormState({ ...formState, source_url: e.target.value })}
              placeholder="https://business.orange.cd/fr/catalogs/..."
              className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
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
              disabled={saving}
              className="px-5 py-2.5 bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white rounded-xl font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Icons.CheckCircle size={14} />
              <span>{saving ? "Enregistrement Core AI..." : "Enregistrer dans le Core AI"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
