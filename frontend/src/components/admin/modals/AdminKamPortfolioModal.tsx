"use client";

import React, { useState, useMemo } from 'react';
import { Icons } from '@/components/shared/Icons';
import UserAvatar from '@/components/kam/UserAvatar';
import { KamTeamMemberItem, EnterpriseItem } from '../adminTypes';

interface AdminKamPortfolioModalProps {
  kam: KamTeamMemberItem | null;
  accounts: EnterpriseItem[];
  loading: boolean;
  onClose: () => void;
}

export default function AdminKamPortfolioModal({
  kam,
  accounts,
  loading,
  onClose,
}: AdminKamPortfolioModalProps) {
  const [search, setSearch] = useState('');

  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return accounts;
    const q = search.toLowerCase();
    return accounts.filter(
      (a) =>
        a.name?.toLowerCase().includes(q) ||
        a.crm_id?.toLowerCase().includes(q) ||
        a.city?.toLowerCase().includes(q) ||
        a.sector?.toLowerCase().includes(q)
    );
  }, [accounts, search]);

  if (!kam) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl w-full max-w-4xl p-6 shadow-2xl flex flex-col gap-5 animate-scale-in text-[#242124] dark:text-white border border-black/5 dark:border-white/5 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-3.5">
            <UserAvatar
              src={kam.avatar}
              name={kam.full_name}
              size="lg"
              className="shrink-0 border-2 border-[#4F6CE8]/30 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-[#242124] dark:text-white">
                  Portefeuille de {kam.full_name}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#4F6CE8]/15 text-[#4F6CE8] font-semibold text-[10px]">
                  KAM Office
                </span>
              </div>
              <span className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                @{kam.username} • {kam.company_name || "Direction Grands Comptes & PME"} • {kam.email}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={onClose}
              className="p-2 rounded-full text-[#6E6C67] hover:text-[#242124] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Fermer la modale"
            >
              <Icons.X size={16} />
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="p-3 bg-[#F6F5F2] dark:bg-[#242124] rounded-2xl flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Comptes Rattachés</span>
            <span className="text-base font-medium text-[#242124] dark:text-white">{accounts.length}</span>
          </div>
          <div className="p-3 bg-[#F6F5F2] dark:bg-[#242124] rounded-2xl flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase">Comptes Convertis</span>
            <span className="text-base font-medium text-emerald-600 dark:text-emerald-400">
              {accounts.filter(a => a.is_converted || a.conversion_status === 'CONVERTED').length}
            </span>
          </div>
          <div className="p-3 bg-[#F6F5F2] dark:bg-[#242124] rounded-2xl flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-[#4F6CE8] uppercase">CA Signé Portefeuille</span>
            <span className="text-base font-medium text-[#4F6CE8]">
              +{(kam.converted_amount || 0).toLocaleString()} $
            </span>
          </div>
          <div className="p-3 bg-[#F6F5F2] dark:bg-[#242124] rounded-2xl flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Taux de Conversion</span>
            <span className="text-base font-medium text-[#242124] dark:text-white">
              {accounts.length > 0 
                ? Math.round((accounts.filter(a => a.is_converted || a.conversion_status === 'CONVERTED').length / accounts.length) * 100) 
                : 0}%
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-[#F6F5F2] dark:bg-[#242124] px-3.5 py-2 rounded-2xl shrink-0">
          <Icons.Search size={14} className="text-[#6E6C67] dark:text-[#A1A1AA] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer parmi les comptes du portefeuille (nom, CRM ID, ville, secteur)..."
            className="w-full bg-transparent text-xs font-medium text-[#242124] dark:text-white placeholder-[#6E6C67] dark:placeholder-[#A1A1AA] border-0 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-xs text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer px-1"
            >
              <Icons.X size={16} />
            </button>
          )}
        </div>

        {/* Scrollable accounts list */}
        <div className="flex-1 overflow-y-auto min-h-64 border border-black/5 dark:border-white/5 rounded-2xl">
          {loading ? (
            <div className="py-20 flex justify-center items-center">
              <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
              {search ? "Aucun compte ne correspond à votre recherche dans ce portefeuille." : "Aucune entreprise assignée à ce KAM pour le moment."}
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="sticky top-0 bg-[#F6F5F2] dark:bg-[#242124] border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                <tr>
                  <th className="py-2.5 px-3">Entreprise & CRM ID</th>
                  <th className="py-2.5 px-3">Segment</th>
                  <th className="py-2.5 px-3">CA Annuel</th>
                  <th className="py-2.5 px-3">Statut</th>
                  <th className="py-2.5 px-3">Localisation</th>
                  <th className="py-2.5 px-3">Interlocuteur Décideur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredAccounts.map((acc) => {
                  const isConverted = Boolean(acc.is_converted || acc.conversion_status === 'CONVERTED');
                  return (
                    <tr key={acc.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-[#242124] dark:text-white block">{acc.name}</span>
                        <span className="font-mono text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{acc.crm_id}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          acc.segment === 'GRAND_COMPTE'
                            ? 'bg-black/5 dark:bg-white/10 text-[#242124] dark:text-white'
                            : 'bg-[#4F6CE8]/15 text-[#4F6CE8]'
                        }`}>
                          {acc.segment === 'GRAND_COMPTE' ? 'Grand Compte' : 'PME'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#242124] dark:text-white">
                        {Number(acc.annual_revenue || 0).toLocaleString()} $
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isConverted
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-black/5 dark:bg-white/10 text-[#6E6C67] dark:text-[#A1A1AA]'
                        }`}>
                          {isConverted ? 'Converti' : 'En prospection'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#6E6C67] dark:text-[#A1A1AA]">
                        {acc.city} {acc.commune ? `(${acc.commune})` : ''}
                      </td>
                      <td className="py-2.5 px-3 text-[#6E6C67] dark:text-[#A1A1AA]">
                        <span className="font-medium text-[#242124] dark:text-white block">{acc.contact_name || "Non renseigné"}</span>
                        <span className="text-[10px]">{acc.contact_role || acc.contact_phone || ""}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 shrink-0">
          <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
            Affichage de {filteredAccounts.length} compte(s) sur {accounts.length}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#242124] dark:text-white rounded-xl text-xs font-medium cursor-pointer transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
