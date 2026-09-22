"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Icons } from '@/components/shared/Icons';
import { fetchAPI } from '@/lib/api';
import { B2BOfferItem } from './adminTypes';
import { useAdminContext } from './AdminContext';
import AdminOfferModal, { B2BOfferFormState } from './modals/AdminOfferModal';
import AdminImportOffersModal from './modals/AdminImportOffersModal';

export default function AdminCatalogView() {
  const { searchQuery, setSearchPlaceholder, updateCount, setSuccessMessage } = useAdminContext();
  const [b2bOffers, setB2bOffers] = useState<B2BOfferItem[]>([]);
  const [b2bTotalCount, setB2bTotalCount] = useState<number>(0);
  const [b2bCategoryFilter, setB2bCategoryFilter] = useState<string>('ALL');
  const [b2bRdcFilter, setB2bRdcFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<B2BOfferItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    setSearchPlaceholder("Rechercher une offre (nom, catégorie, mot-clé, débit)...");
  }, [setSearchPlaceholder]);

  const loadB2bOffers = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/sales/b2b-offers/?';
      if (b2bCategoryFilter !== 'ALL') url += `&category=${encodeURIComponent(b2bCategoryFilter)}`;
      if (b2bRdcFilter !== 'ALL') url += `&rdc_availability=${encodeURIComponent(b2bRdcFilter)}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery)}`;

      const data = await fetchAPI(url);
      if (data && Array.isArray(data.services)) {
        setB2bOffers(data.services);
        const count = data.count ?? data.services.length;
        setB2bTotalCount(count);
        updateCount('catalog', count);
      }
    } catch (err) {
      console.error("Erreur chargement catalogue B2B:", err);
    } finally {
      setLoading(false);
    }
  }, [b2bCategoryFilter, b2bRdcFilter, searchQuery, updateCount]);

  useEffect(() => {
    loadB2bOffers();
  }, [loadB2bOffers]);

  const b2bCategories = useMemo(() => {
    const cats = new Set<string>();
    b2bOffers.forEach((o) => {
      if (o.category) cats.add(o.category);
    });
    return Array.from(cats);
  }, [b2bOffers]);

  const handleOpenCreateOffer = () => {
    setEditingOffer(null);
    setModalError(null);
    setIsOfferModalOpen(true);
  };

  const handleOpenEditOffer = (offer: B2BOfferItem) => {
    setEditingOffer(offer);
    setModalError(null);
    setIsOfferModalOpen(true);
  };

  const handleSaveOffer = async (formState: B2BOfferFormState, isEditMode: boolean) => {
    setModalError(null);
    const payload = {
      service_id: formState.service_id,
      name: formState.name,
      category: formState.category,
      description: formState.description,
      allowed_benefits: formState.allowed_benefits
        ? formState.allowed_benefits.split('\n').map((s) => s.trim()).filter(Boolean)
        : [],
      target_customers: formState.target_customers
        ? formState.target_customers.split('\n').map((s) => s.trim()).filter(Boolean)
        : [],
      commercial_terms: formState.commercial_terms
        ? formState.commercial_terms.split('\n').map((s) => s.trim()).filter(Boolean)
        : [],
      match: {
        need_keywords: formState.need_keywords
          ? formState.need_keywords.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      },
      source_url: formState.source_url,
      rdc_availability: formState.rdc_availability,
    };

    try {
      if (isEditMode) {
        await fetchAPI(`/api/sales/b2b-offers/${formState.service_id}/`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setSuccessMessage("Offre B2B mise à jour avec succès dans le Core AI.");
      } else {
        await fetchAPI('/api/sales/b2b-offers/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSuccessMessage("Nouvelle offre B2B ajoutée avec succès au catalogue.");
      }
      setTimeout(() => setSuccessMessage(null), 4000);
      loadB2bOffers();
    } catch (err: any) {
      setModalError(err?.message || "Erreur lors de l'enregistrement de l'offre B2B.");
      throw err;
    }
  };

  const handleDeleteOffer = async (serviceId: string, name: string) => {
    if (!window.confirm(`Confirmez-vous la suppression de l'offre "${name}" du catalogue Core AI ?`)) {
      return;
    }
    try {
      await fetchAPI(`/api/sales/b2b-offers/${serviceId}/`, {
        method: 'DELETE',
      });
      setSuccessMessage(`Offre "${name}" retirée du catalogue.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      loadB2bOffers();
    } catch (err: any) {
      alert(err?.message || "Erreur lors de la suppression de l'offre.");
    }
  };

  const handleImportJson = async (jsonString: string) => {
    setModalError(null);
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      setModalError("Format JSON invalide. Veuillez vérifier la syntaxe.");
      throw new Error("Invalid JSON");
    }

    try {
      await fetchAPI('/api/sales/b2b-offers/import/', {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      setSuccessMessage("Catalogue JSON importé et synchronisé avec succès !");
      setTimeout(() => setSuccessMessage(null), 4000);
      loadB2bOffers();
    } catch (err: any) {
      setModalError(err?.message || "Erreur lors de l'importation du catalogue.");
      throw err;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#242124] dark:text-white mt-1">Catalogue d'offres</h2>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              setModalError(null);
              setIsImportModalOpen(true);
            }}
            className="px-4 py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#242124] dark:text-white rounded-2xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2"
          >
            <Icons.Download size={14} />
            <span>Importer / Sync JSON</span>
          </button>
          <button
            onClick={handleOpenCreateOffer}
            className="px-4 py-2.5 bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white rounded-2xl text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-2"
          >
            <Icons.Plus size={14} />
            <span>Nouvelle Offre B2B</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
            Total Offres B2B Actives
          </span>
          <span className="text-2xl font-extrabold text-[#242124] dark:text-white mt-1">{b2bTotalCount}</span>
          <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">Solutions intégrées dans le moteur IA</span>
        </div>

        <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
            Catégories Métier
          </span>
          <span className="text-2xl font-extrabold text-[#4F6CE8] mt-1">{b2bCategories.length}</span>
          <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">Connectivité, Cloud, Cybersécurité, Mobile...</span>
        </div>

        <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
            Disponibilité RDC Directe
          </span>
          <span className="text-2xl font-extrabold text-[#242124] dark:text-white mt-1">
            {b2bOffers.filter((o) => o.rdc_availability === 'published_local').length}
          </span>
          <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">Offres publiées et souscriptibles localement</span>
        </div>
      </div>

      {/* Offers Filter & Grid */}
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[#242124] dark:text-white">
            Liste des Solutions B2B ({b2bOffers.length} affichées)
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={b2bCategoryFilter}
              onChange={(e) => setB2bCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl text-xs font-medium text-[#242124] dark:text-white focus:outline-none border-0 cursor-pointer"
            >
              <option value="ALL">Toutes les Catégories</option>
              {b2bCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={b2bRdcFilter}
              onChange={(e) => setB2bRdcFilter(e.target.value)}
              className="px-3 py-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl text-xs font-medium text-[#242124] dark:text-white focus:outline-none border-0 cursor-pointer"
            >
              <option value="ALL">Tous les Scopes</option>
              <option value="published_local">Publié Local RDC</option>
              <option value="to_confirm">International / À confirmer</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-7 h-7 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
          </div>
        ) : b2bOffers.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
            Aucune offre B2B trouvée avec ces critères.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {b2bOffers.map((offer) => (
              <div
                key={offer.service_id}
                className="bg-[#F6F5F2] dark:bg-[#242124] p-5 rounded-2xl flex flex-col justify-between gap-4 text-xs"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-[#242124] dark:text-white">{offer.name}</h4>
                        <span className="text-[9px] font-mono px-2 py-0.5 bg-black/5 dark:bg-white/10 rounded-md text-[#6E6C67] dark:text-[#A1A1AA]">
                          {offer.service_id}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#4F6CE8] font-medium block mt-0.5">
                        {offer.category}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold shrink-0 bg-black/5 dark:bg-white/10 text-[#242124] dark:text-white">
                      {offer.rdc_availability === 'published_local' ? 'RDC Local' : 'À Confirmer'}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA] leading-relaxed line-clamp-3">
                    {offer.description}
                  </p>

                  {/* Allowed Benefits */}
                  {offer.allowed_benefits && offer.allowed_benefits.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {offer.allowed_benefits.slice(0, 3).map((b, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 bg-white dark:bg-[#2D2A2D] text-[#242124] dark:text-white rounded-md border border-black/5 dark:border-white/5"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Match Keywords */}
                  {offer.match?.need_keywords && offer.match.need_keywords.length > 0 && (
                    <div className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] pt-1">
                      <span className="font-medium">Mots-clés IA :</span>{' '}
                      {offer.match.need_keywords.slice(0, 5).join(', ')}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5">
                  <a
                    href={offer.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-[#6E6C67] hover:text-[#4F6CE8] transition-colors truncate max-w-[180px]"
                  >
                    Documentation officielle ↗
                  </a>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditOffer(offer)}
                      className="px-3 py-1.5 bg-white dark:bg-[#2D2A2D] hover:bg-black/5 text-[#242124] dark:text-white rounded-xl text-xs font-medium border border-black/5 dark:border-white/5 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Icons.Edit size={12} />
                      <span>Éditer</span>
                    </button>
                    <button
                      onClick={() => handleDeleteOffer(offer.service_id, offer.name)}
                      className="p-1.5 hover:bg-red-500/10 text-[#6E6C67] hover:text-red-500 rounded-xl transition-colors cursor-pointer"
                      title="Supprimer l'offre"
                    >
                      <Icons.Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AdminOfferModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        editingOffer={editingOffer}
        onSaveOffer={handleSaveOffer}
        error={modalError}
      />

      <AdminImportOffersModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportJson={handleImportJson}
        error={modalError}
      />
    </div>
  );
}
