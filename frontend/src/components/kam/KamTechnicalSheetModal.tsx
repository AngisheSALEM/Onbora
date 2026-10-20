"use client";

import React, { useState } from 'react';
import { Icons } from '@/components/shared/Icons';

export interface TechnicalSpecsData {
  reference: string;
  generated_at: string;
  enterprise: {
    id: number;
    name: string;
    sector: string;
    rccm?: string;
    city?: string;
    site_address?: string;
    contact_name?: string;
    contact_role?: string;
    contact_phone?: string;
    contact_email?: string;
  };
  kam?: {
    name: string;
    email: string;
  };
  deployment_overview: {
    title: string;
    objective: string;
    access_constraints: string;
    current_operator: string;
  };
  solutions: Array<{
    name: string;
    category: string;
    speed?: string;
    sla?: string;
    role?: string;
  }>;
  confirmed_needs: string[];
  equipment_list: Array<{
    item: string;
    category: string;
    quantity: number;
    specs: string;
    location: string;
  }>;
  network_configuration: {
    wan: {
      ip_address: string;
      gateway: string;
      netmask: string;
      dns_primary: string;
      dns_secondary: string;
    };
    lan_vlans: Array<{
      vlan_id: string;
      name: string;
      subnet: string;
      gateway: string;
      dhcp_range: string;
    }>;
  };
  acceptance_checklist: Array<{
    step: string;
    expected: string;
    validation: string;
  }>;
  technician_notes?: string;
}

interface KamTechnicalSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  specs: TechnicalSpecsData | null;
  isLoading: boolean;
  isRegenerating: boolean;
  onRegenerate: () => void;
  onDownloadPdf: () => void;
  enterpriseName: string;
}

export const KamTechnicalSheetModal: React.FC<KamTechnicalSheetModalProps> = ({
  isOpen,
  onClose,
  specs,
  isLoading,
  isRegenerating,
  onRegenerate,
  onDownloadPdf,
  enterpriseName,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'equipment' | 'network' | 'checklist'>('overview');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#FCFAF7] dark:bg-[#1A181A] border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden transition-all text-zinc-900 dark:text-zinc-100">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#232023] border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4F6CE8]/10 dark:bg-[#4F6CE8]/20 flex items-center justify-center text-[#4F6CE8] shrink-0">
              <Icons.FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">
                  Fiche Technique d'Installation Télécom
                </h2>
                {specs?.reference && (
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 font-mono text-xs font-semibold">
                    {specs.reference}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 text-[11px] font-medium hidden sm:inline-block">
                  Prêt pour déploiement
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Spécifications réseau & protocole de recette terrain pour {enterpriseName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isLoading || isRegenerating}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
              title="Régénérer les spécifications techniques"
            >
              <Icons.RefreshCw size={13} className={isRegenerating ? "animate-spin text-[#4F6CE8]" : ""} />
              <span className="hidden sm:inline">{isRegenerating ? "Analyse en cours..." : "Régénérer"}</span>
            </button>

            <button
              type="button"
              onClick={onDownloadPdf}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-lg bg-[#4F6CE8] hover:bg-[#435ec9] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            >
              <Icons.Download size={14} />
              <span>Télécharger PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer ml-1"
            >
              <Icons.X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 pb-2 bg-white/70 dark:bg-[#201D20]/70 border-b border-black/5 dark:border-white/5 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Icons.FileText size={13} />
            <span>Synthèse & Chantier</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('equipment')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'equipment'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Icons.Server size={13} />
            <span>Équipements (BOM)</span>
            {specs?.equipment_list && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10 font-mono">
                {specs.equipment_list.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('network')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'network'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Icons.Layers size={13} />
            <span>Plan d'Adressage IP</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'checklist'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Icons.CheckCircle size={13} />
            <span>Recette Terrain</span>
            {specs?.acceptance_checklist && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10 font-mono">
                {specs.acceptance_checklist.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && !specs ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Icons.RefreshCw size={24} className="animate-spin text-[#4F6CE8]" />
              <p className="text-sm">Génération de la fiche technique en cours...</p>
            </div>
          ) : specs ? (
            <>
              {/* TAB 1: OVERVIEW & CHANTIER */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Coordonnées & Référents */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white dark:bg-[#232023] border border-black/5 dark:border-white/5 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        Coordonnées Site & Chantier
                      </div>
                      <div className="text-sm font-bold text-zinc-900 dark:text-white">
                        {specs.enterprise.name}
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1">
                        <div><span className="font-semibold text-zinc-400">Secteur :</span> {specs.enterprise.sector}</div>
                        <div><span className="font-semibold text-zinc-400">Adresse :</span> {specs.enterprise.site_address || specs.enterprise.city || 'Kinshasa'}</div>
                        {specs.enterprise.rccm && (
                          <div><span className="font-semibold text-zinc-400">RCCM :</span> {specs.enterprise.rccm}</div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white dark:bg-[#232023] border border-black/5 dark:border-white/5 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        Interlocuteurs Référents
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1.5">
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-white">
                            {specs.enterprise.contact_name || 'Responsable Technique Client'}
                          </div>
                          <div className="text-zinc-500">{specs.enterprise.contact_role || 'DSI / Décideur Technique'}</div>
                          <div className="text-zinc-400 font-mono text-[11px]">
                            {specs.enterprise.contact_phone} • {specs.enterprise.contact_email}
                          </div>
                        </div>
                        <div className="pt-1.5 border-t border-black/5 dark:border-white/5">
                          <span className="font-semibold text-zinc-400">KAM Référent :</span>{' '}
                          <span className="text-zinc-800 dark:text-zinc-200">{specs.kam?.name || 'Key Account Manager'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Synthèse d'Intervention */}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#232023] border border-black/5 dark:border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4F6CE8] dark:text-[#7B93FF]">
                      <Icons.Shield size={14} />
                      <span>{specs.deployment_overview.title}</span>
                    </div>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {specs.deployment_overview.objective}
                    </p>
                    <div className="pt-2 text-[11px] text-zinc-500 dark:text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-black/5 dark:border-white/5">
                      <div><span className="font-semibold text-zinc-700 dark:text-zinc-300">Accès :</span> {specs.deployment_overview.access_constraints}</div>
                      <div><span className="font-semibold text-zinc-700 dark:text-zinc-300">Contexte :</span> {specs.deployment_overview.current_operator}</div>
                    </div>
                  </div>

                  {/* Solutions Validées */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Solutions & Débits Validés
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {specs.solutions.map((sol, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-white dark:bg-[#232023] border border-black/5 dark:border-white/5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-zinc-900 dark:text-white">
                              {sol.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#4F6CE8]/10 dark:bg-[#4F6CE8]/20 text-[#4F6CE8] dark:text-[#7B93FF] font-medium">
                              {sol.category}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                            {sol.speed} • {sol.sla}
                          </div>
                          {sol.role && (
                            <p className="text-xs text-zinc-600 dark:text-zinc-300">
                              {sol.role}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Consignes Techniques Particulières */}
                  {specs.technician_notes && (
                    <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400">
                        Consignes de Câblage & Sécurité Chantier
                      </div>
                      <div className="text-xs text-blue-900/90 dark:text-blue-200/90 whitespace-pre-line leading-relaxed">
                        {specs.technician_notes}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: EQUIPMENT LIST (BOM) */}
              {activeTab === 'equipment' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                        Nomenclature Matérielle (Bill of Materials)
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Matériel à provisionner dans le véhicule d'intervention avant départ sur site.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-black/5 dark:border-white/5 bg-white dark:bg-[#232023]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F8F7F4] dark:bg-[#1C1A1C] border-b border-black/5 dark:border-white/5 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Désignation Équipement</th>
                            <th className="py-2.5 px-3">Catégorie</th>
                            <th className="py-2.5 px-3 text-center">Qté</th>
                            <th className="py-2.5 px-3">Spécifications</th>
                            <th className="py-2.5 px-3">Emplacement Baie</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                          {specs.equipment_list.map((eq, idx) => (
                            <tr key={idx} className="hover:bg-black/2 dark:hover:bg-white/2">
                              <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-white">
                                {eq.item}
                              </td>
                              <td className="py-3 px-3 text-zinc-500">
                                <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 text-[10px]">
                                  {eq.category}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-zinc-800 dark:text-zinc-200">
                                {eq.quantity}
                              </td>
                              <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300 max-w-xs">
                                {eq.specs}
                              </td>
                              <td className="py-3 px-3 text-zinc-500 font-mono text-[11px]">
                                {eq.location}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: NETWORK CONFIGURATION */}
              {activeTab === 'network' && (
                <div className="space-y-6">
                  {/* WAN Configuration */}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#232023] border border-black/5 dark:border-white/5 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#4F6CE8]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                        Liaison WAN & Adressage Public Fixe
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-[#FAF8F5] dark:bg-[#1D1B1D]">
                        <div className="text-[10px] text-zinc-400 uppercase font-semibold">IP WAN Assignée</div>
                        <div className="font-mono font-bold text-zinc-900 dark:text-white mt-0.5">
                          {specs.network_configuration.wan.ip_address}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-[#FAF8F5] dark:bg-[#1D1B1D]">
                        <div className="text-[10px] text-zinc-400 uppercase font-semibold">Passerelle WAN (Gateway)</div>
                        <div className="font-mono font-bold text-zinc-900 dark:text-white mt-0.5">
                          {specs.network_configuration.wan.gateway}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-[#FAF8F5] dark:bg-[#1D1B1D]">
                        <div className="text-[10px] text-zinc-400 uppercase font-semibold">Masque de Sous-Réseau</div>
                        <div className="font-mono font-bold text-zinc-900 dark:text-white mt-0.5">
                          {specs.network_configuration.wan.netmask}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-[#FAF8F5] dark:bg-[#1D1B1D]">
                        <div className="text-[10px] text-zinc-400 uppercase font-semibold">DNS Orange RDC</div>
                        <div className="font-mono text-zinc-900 dark:text-white text-[11px] mt-0.5">
                          {specs.network_configuration.wan.dns_primary}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* LAN & VLANs Configuration */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                        Topologie LAN & Segmentation VLAN 802.1Q
                      </h3>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-black/5 dark:border-white/5 bg-white dark:bg-[#232023]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F8F7F4] dark:bg-[#1C1A1C] border-b border-black/5 dark:border-white/5 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">VLAN</th>
                            <th className="py-2.5 px-3">Nom</th>
                            <th className="py-2.5 px-3">Sous-réseau IP</th>
                            <th className="py-2.5 px-3">Passerelle (Gateway)</th>
                            <th className="py-2.5 px-3">Plage DHCP / Attribution</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                          {specs.network_configuration.lan_vlans.map((vlan, idx) => (
                            <tr key={idx} className="hover:bg-black/2 dark:hover:bg-white/2">
                              <td className="py-3 px-3 font-mono font-bold text-[#4F6CE8] dark:text-[#7B93FF]">
                                {vlan.vlan_id}
                              </td>
                              <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-white">
                                {vlan.name}
                              </td>
                              <td className="py-3 px-3 font-mono text-zinc-700 dark:text-zinc-300">
                                {vlan.subnet}
                              </td>
                              <td className="py-3 px-3 font-mono text-zinc-700 dark:text-zinc-300">
                                {vlan.gateway}
                              </td>
                              <td className="py-3 px-3 text-zinc-500 font-mono text-[11px]">
                                {vlan.dhcp_range}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CHECKLIST DE RECETTE */}
              {activeTab === 'checklist' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                      Cahier de Recette Contradictoire & Tests Obligatoires
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Chaque test doit être validé en présence du client avant signature du Procès-Verbal de recette.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {specs.acceptance_checklist.map((chk, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-white dark:bg-[#232023] border border-black/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-zinc-900 dark:text-white">
                              {chk.step}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-300 pl-7">
                            <span className="font-semibold text-zinc-400">Attendu :</span> {chk.expected}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 pl-7">
                            <span className="font-semibold text-zinc-400">Protocole :</span> {chk.validation}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pl-7 sm:pl-0">
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[11px] text-zinc-500 font-medium">
                            À vérifier sur site
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Signatures preview note */}
                  <div className="p-3.5 rounded-xl bg-[#F6F5F2] dark:bg-[#1E1B1E] text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                    <span>Le Procès-Verbal officiel d'émargement et les cadres de signature figurent sur le PDF téléchargeable.</span>
                    <button
                      type="button"
                      onClick={onDownloadPdf}
                      className="text-xs font-semibold text-[#4F6CE8] hover:text-[#435ec9] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Icons.Download size={13} />
                      <span>Imprimer le PV</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center text-xs text-zinc-400">
              Aucune donnée technique disponible pour ce compte.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white dark:bg-[#232023] border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span>Orange Business Services • RDC</span>
            {specs?.generated_at && <span>• Généré le {specs.generated_at}</span>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-300 text-xs font-medium cursor-pointer transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
