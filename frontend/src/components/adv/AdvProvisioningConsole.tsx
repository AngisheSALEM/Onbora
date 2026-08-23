"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '@/components/shared/Icons';

export interface AdvQueueItem {
  id: number;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  rccm: string;
  status: string;
  provisioning_status: 'READY_FOR_PROVISIONING' | 'PROVISIONING' | 'ACTIVE';
  provisioning_details?: Record<string, string>;
  has_twin?: boolean;
  source: string;
  created_at: string;
  updated_at: string;
}

export default function AdvProvisioningConsole() {
  const [queue, setQueue] = useState<AdvQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // STP Modal & Trigger State
  const [selectedDossier, setSelectedDossier] = useState<AdvQueueItem | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [stpStep, setStpStep] = useState<number>(0);
  const [stpResult, setStpResult] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Token ${token}`;

      const res = await fetch(`${API_URL}/api/sales/provisioning/queue/`, { headers });
      if (res.ok) {
        const data = await res.json();
        setQueue(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Erreur chargement file ADV:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Trigger 1-Click STP Orchestration
  const handleTriggerStp = async (dossier: AdvQueueItem) => {
    setSelectedDossier(dossier);
    setIsTriggering(true);
    setStpStep(1);
    setStpResult(null);

    try {
      // Step 1: Microsoft CSP
      await new Promise((r) => setTimeout(r, 600));
      setStpStep(2);

      // Step 2: ZTE ZSmart
      await new Promise((r) => setTimeout(r, 600));
      setStpStep(3);

      // Step 3: TOM Fibre
      await new Promise((r) => setTimeout(r, 600));
      setStpStep(4);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Token ${token}`;

      const res = await fetch(`${API_URL}/api/sales/provisioning/trigger-stp/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          dossier_id: dossier.id,
          company_name: dossier.company_name,
          admin_email: dossier.email,
          location: "Kinshasa (Gombe)",
        }),
      });

      if (!res.ok) throw new Error("Erreur de déclenchement STP");

      const data = await res.json();
      setStpResult(data);
      setStpStep(5);
      setStatusMessage({ text: `Provisioning STP 1-clic activé avec succès pour '${dossier.company_name}'. Lignes ZTE, Tenant M365 et Fibre TOM opérationnels.`, type: 'success' });
      loadQueue();
    } catch (err: any) {
      setStatusMessage({ text: `Erreur STP: ${err.message}`, type: 'error' });
      setIsTriggering(false);
    }
  };

  const filteredQueue = queue.filter((item) => {
    const matchesSearch =
      item.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.rccm.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    return item.provisioning_status === statusFilter;
  });

  const activeCount = queue.filter((q) => q.provisioning_status === 'ACTIVE').length;
  const readyCount = queue.filter((q) => q.provisioning_status === 'READY_FOR_PROVISIONING').length;
  const inProgressCount = queue.filter((q) => q.provisioning_status === 'PROVISIONING').length;

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in font-sans">
      {/* Toast Notification */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold ${
          statusMessage.type === 'success' ? 'badge-success border-none' : 'badge-error border-none'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <Icons.CheckCircle size={16} /> : <Icons.AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
          >
            <Icons.Close size={14} />
          </button>
        </div>
      )}

      {/* Gateway Status Cards Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ZTE ZSmart Gateway */}
        <div className="studio-card p-5 flex flex-col gap-2 shadow-sm border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-zinc-500 tracking-wider">Passerelle BSS Mobile</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-black flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Connecté
            </span>
          </div>
          <h4 className="text-sm font-black text-zinc-950 dark:text-white flex items-center gap-1.5">
            <Icons.Zap size={16} className="text-blue-600" /> ZTE ZSmart 5G Engine
          </h4>
          <p className="text-[11px] text-zinc-600 dark:text-gray-300">
            Activation SIM/eSIM automatique, attribution des plages MSISDN B2B et quotas voix/data.
          </p>
        </div>

        {/* Microsoft CSP Gateway */}
        <div className="studio-card p-5 flex flex-col gap-2 shadow-sm border-l-4 border-indigo-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-zinc-500 tracking-wider">Passerelle Cloud MSP</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-black flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Connecté
            </span>
          </div>
          <h4 className="text-sm font-black text-zinc-950 dark:text-white flex items-center gap-1.5">
            <Icons.Cloud size={16} className="text-indigo-600" /> Microsoft Partner Center CSP
          </h4>
          <p className="text-[11px] text-zinc-600 dark:text-gray-300">
            Génération instantanée du Tenant M365, provisioning des licences Business Standard et EDR.
          </p>
        </div>

        {/* TOM Fibre Gateway */}
        <div className="studio-card p-5 flex flex-col gap-2 shadow-sm border-l-4 border-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-zinc-500 tracking-wider">Passerelle Réseau Fixe</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-black flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Connecté
            </span>
          </div>
          <h4 className="text-sm font-black text-zinc-950 dark:text-white flex items-center gap-1.5">
            <Icons.Layers size={16} className="text-emerald-600" /> TOM Fibre Core (FTTO/FTTH)
          </h4>
          <p className="text-[11px] text-zinc-600 dark:text-gray-300">
            Déclaration OLT automatique, assignation du VLAN client et routage de la plage d'IP fixes.
          </p>
        </div>
      </div>

      {/* Main ADV File d'Attente Table */}
      <div className="studio-card p-6 md:p-8 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-base font-black text-zinc-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Icons.FileCheck size={18} className="text-blue-600 dark:text-blue-400" />
              File d'Attente ADV & Provisioning STP
            </h3>
            <p className="text-xs text-zinc-600 dark:text-gray-300 mt-0.5">
              Dossiers validés par le terrain / KAM prêts pour contractualisation et activation 1-clic.
            </p>
          </div>

          {/* Quick Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher par entreprise, RCCM..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs rounded-xl font-medium bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800"
              />
              <Icons.Search size={14} className="absolute left-2.5 top-2.5 text-zinc-400" />
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                  statusFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                Tous ({queue.length})
              </button>
              <button
                onClick={() => setStatusFilter('READY_FOR_PROVISIONING')}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                  statusFilter === 'READY_FOR_PROVISIONING' ? 'bg-amber-600 text-white' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                }`}
              >
                À Provisionner ({readyCount})
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                  statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                Actifs ({activeCount})
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold">
                <th className="py-3 px-3">Dossier / Entreprise</th>
                <th className="py-3 px-3">Contact & Email</th>
                <th className="py-3 px-3">RCCM Validé</th>
                <th className="py-3 px-3 text-center">Statut Provisioning</th>
                <th className="py-3 px-3 text-right">Action ADV</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400 animate-pulse">
                    Chargement de la file ADV...
                  </td>
                </tr>
              ) : filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    Aucun dossier dans la file d'attente ADV.
                  </td>
                </tr>
              ) : (
                filteredQueue.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-200/50 dark:border-zinc-800/60 hover:bg-white/40 dark:hover:bg-zinc-800/40">
                    <td className="py-3.5 px-3">
                      <div className="font-black text-sm text-zinc-950 dark:text-white">{item.company_name}</div>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">Dossier #{item.id} • {item.source}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-zinc-900 dark:text-zinc-200">{item.contact_name}</div>
                      <span className="text-[10px] text-zinc-500">{item.email} • {item.phone}</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                      {item.rccm}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        item.provisioning_status === 'ACTIVE'
                          ? 'badge-success'
                          : item.provisioning_status === 'PROVISIONING'
                          ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 animate-pulse'
                          : 'badge-warning'
                      }`}>
                        {item.provisioning_status === 'ACTIVE' ? (
                          <>
                            <Icons.CheckCircle size={12} /> Opérationnel (3/3)
                          </>
                        ) : item.provisioning_status === 'PROVISIONING' ? (
                          <>
                            <Icons.RefreshCw size={12} className="animate-spin" /> En cours
                          </>
                        ) : (
                          <>
                            <Icons.Clock size={12} /> Prêt pour Activation
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {item.provisioning_status === 'ACTIVE' ? (
                        <button
                          onClick={() => {
                            setSelectedDossier(item);
                            setStpStep(5);
                            setIsTriggering(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-blue-600 hover:text-white text-zinc-800 dark:text-zinc-200 font-extrabold text-[10px] transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Icons.Eye size={12} /> Certificat Actif
                        </button>
                      ) : (
                        <button
                          onClick={() => handleTriggerStp(item)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] transition-all cursor-pointer shadow-[0_0_15px_rgba(37,99,235,0.25)] inline-flex items-center gap-1.5"
                        >
                          <Icons.Zap size={12} /> Provisioning STP 1-Clic
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Live STP Orchestration & Activation Certificate */}
      {isTriggering && selectedDossier && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="studio-card p-6 md:p-8 max-w-2xl w-full flex flex-col gap-5 shadow-2xl border-2 border-blue-600/30">
            <div className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-1">
                  <Icons.Zap size={12} /> Activation des Services Télécom & Cloud
                </span>
                <h3 className="text-base font-black text-zinc-950 dark:text-white">
                  Dossier : {selectedDossier.company_name}
                </h3>
              </div>
              {stpStep === 5 && (
                <button onClick={() => setIsTriggering(false)} className="text-zinc-400 hover:text-zinc-600">
                  <Icons.Close size={18} />
                </button>
              )}
            </div>

            {/* Stepper Pipeline */}
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
              <div className={`p-2.5 rounded-xl transition-all ${
                stpStep >= 1 ? 'bg-blue-600 text-white' : 'studio-subcard text-zinc-400'
              }`}>
                1. Tenant M365 CSP
              </div>
              <div className={`p-2.5 rounded-xl transition-all ${
                stpStep >= 2 ? 'bg-blue-600 text-white' : 'studio-subcard text-zinc-400'
              }`}>
                2. Lignes 5G ZTE
              </div>
              <div className={`p-2.5 rounded-xl transition-all ${
                stpStep >= 3 ? 'bg-blue-600 text-white' : 'studio-subcard text-zinc-400'
              }`}>
                3. VLAN Fibre TOM
              </div>
              <div className={`p-2.5 rounded-xl transition-all ${
                stpStep >= 4 ? 'bg-emerald-600 text-white' : 'studio-subcard text-zinc-400'
              }`}>
                4. SMS & Email Client
              </div>
            </div>

            {/* Active Output details */}
            {stpStep === 5 ? (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                  <Icons.CheckCircle size={24} />
                  <div>
                    <span className="font-black text-xs block">Activation des services réussie</span>
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-300">
                      Les services 5G, Microsoft 365 et liaison Fibre sont désormais opérationnels.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* ZTE Card */}
                  <div className="studio-subcard p-3.5 rounded-xl flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase text-blue-600">ZTE ZSmart Mobile</span>
                    <span className="font-extrabold text-zinc-950 dark:text-white">5 Lignes 5G Pro</span>
                    <span className="text-[10px] text-zinc-500">Forfait Flotte Illimité</span>
                  </div>

                  {/* Microsoft Card */}
                  <div className="studio-subcard p-3.5 rounded-xl flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase text-indigo-600">Microsoft CSP</span>
                    <span className="font-extrabold text-zinc-950 dark:text-white">5 Licences M365 Std</span>
                    <span className="text-[10px] text-zinc-500">admin@tenant.onmicrosoft</span>
                  </div>

                  {/* TOM Fibre Card */}
                  <div className="studio-subcard p-3.5 rounded-xl flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase text-emerald-600">TOM Fibre Core</span>
                    <span className="font-extrabold text-zinc-950 dark:text-white">100 Mbps FTTO</span>
                    <span className="text-[10px] text-zinc-500">IP Fixe Allouée</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      alert(`Le bordereau d'activation officiel d'Onbora pour '${selectedDossier.company_name}' a été généré.`);
                      setIsTriggering(false);
                    }}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs transition-all cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.20)] flex items-center justify-center gap-1.5"
                  >
                    <Icons.Download size={14} /> Télécharger le Bordereau d'Activation (PDF)
                  </button>
                  <button
                    onClick={() => setIsTriggering(false)}
                    className="py-3 px-5 studio-subcard text-zinc-700 dark:text-zinc-300 rounded-2xl font-bold text-xs hover:opacity-80"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                <Icons.RefreshCw size={32} className="text-blue-600 animate-spin" />
                <span className="text-xs font-black text-zinc-950 dark:text-white">
                  Activation des services en cours...
                </span>
                <span className="text-[11px] text-zinc-500">
                  Déploiement des accès réseau et configuration des accès cloud en temps réel.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
