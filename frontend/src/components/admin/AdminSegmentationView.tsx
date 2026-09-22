"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Icons } from '@/components/shared/Icons';
import { fetchAPI } from '@/lib/api';
import { SegmentationConfigData } from './adminTypes';

export default function AdminSegmentationView() {
  const [config, setConfig] = useState<SegmentationConfigData | null>(null);
  const [tpeThreshold, setTpeThreshold] = useState<number>(2400);
  const [pmeThreshold, setPmeThreshold] = useState<number>(30000);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccessMsg, setConfigSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSegmentationConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAPI('/api/sales/segmentation-config/');
      if (data && data.id) {
        setConfig(data);
        setTpeThreshold(Number(data.tpe_max_revenue));
        setPmeThreshold(Number(data.pme_max_revenue));
      }
    } catch (err) {
      console.error("Erreur chargement configuration segmentation:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSegmentationConfig();
  }, [loadSegmentationConfig]);

  const handleSaveSegmentation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tpeThreshold >= pmeThreshold) {
      alert("Le seuil TPE/SOHO doit être strictement inférieur au seuil Grand Compte !");
      return;
    }
    setSavingConfig(true);
    setConfigSuccessMsg(null);
    try {
      const res = await fetchAPI('/api/sales/segmentation-config/', {
        method: 'POST',
        body: JSON.stringify({
          tpe_max_revenue: tpeThreshold,
          pme_max_revenue: pmeThreshold,
        }),
      });
      if (res && res.id) {
        setConfig(res);
        setConfigSuccessMsg("Seuils de segmentation mis à jour et ré-appliqués à toutes les entreprises !");
        setTimeout(() => setConfigSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      alert(err?.message || "Erreur lors de la sauvegarde des seuils.");
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Title Card */}
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-5 shadow-sm border border-black/5 dark:border-white/5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#242124] dark:text-white">
            Règles & Seuils de Segmentation
          </h2>
        </div>
        <Link
          href="/admin/settings"
          className="px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[11px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Icons.HelpCircle size={13} />
          <span>Consulter la FAQ</span>
        </Link>
      </div>

      {/* Configuration Form */}
      <form
        onSubmit={handleSaveSegmentation}
        className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-5"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Threshold 1 : TPE vs PME */}
          <div className="flex flex-col gap-2 bg-[#F6F5F2] dark:bg-[#242124] p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#242124] dark:text-white">Seuil Plafond SOHO</span>
              <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
                &lt; 200 $/mois
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium text-[#6E6C67] dark:text-[#A1A1AA]">$</span>
              <input
                type="number"
                step="100"
                value={tpeThreshold}
                onChange={(e) => setTpeThreshold(Number(e.target.value))}
                className="w-full px-4 py-2 bg-white dark:bg-[#2D2A2D] rounded-xl text-sm font-medium text-[#242124] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
              />
              <span className="text-xs font-medium text-[#6E6C67] dark:text-[#A1A1AA] shrink-0">USD / an</span>
            </div>
          </div>

          {/* Threshold 2 : PME vs Grand Compte */}
          <div className="flex flex-col gap-2 bg-[#F6F5F2] dark:bg-[#242124] p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#242124] dark:text-white">Seuil Entrée Grand Compte</span>
              <span className="text-[10px] font-medium text-[#4F6CE8] uppercase tracking-wider">
                &gt; 2 500 $/mois
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium text-[#6E6C67] dark:text-[#A1A1AA]">$</span>
              <input
                type="number"
                step="500"
                value={pmeThreshold}
                onChange={(e) => setPmeThreshold(Number(e.target.value))}
                className="w-full px-4 py-2 bg-white dark:bg-[#2D2A2D] rounded-xl text-sm font-medium text-[#242124] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
              />
              <span className="text-xs font-medium text-[#6E6C67] dark:text-[#A1A1AA] shrink-0">USD / an</span>
            </div>
          </div>
        </div>

        {/* Entities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-black/5 dark:bg-white/10 text-[#242124] dark:text-white rounded-xl">
                <Icons.Map size={18} />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#242124] dark:text-white">Back-Office Terrain</h4>
                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] font-medium">
                  Plaques Cartographiques SOHO
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-[#242124] dark:text-white block">
                {config?.stats?.tpe_count || 0}
              </span>
              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">comptes routés</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#4F6CE8]/15 text-[#4F6CE8] rounded-xl">
                <Icons.Briefcase size={18} />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#242124] dark:text-white">Direction KAM Office</h4>
                <span className="text-[10px] text-[#4F6CE8] font-medium">
                  Portefeuilles PME & Grands Comptes
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-[#4F6CE8] block">
                {(config?.stats?.pme_count || 0) + (config?.stats?.grand_compte_count || 0)}
              </span>
              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">comptes routés</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
          <div className="text-xs font-medium text-[#4F6CE8]">{configSuccessMsg}</div>
          <button
            type="submit"
            disabled={savingConfig}
            className="px-6 py-3 bg-[#4F6CE8] hover:bg-[#3D5BD9] active:scale-98 text-white rounded-2xl text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-2"
          >
            <Icons.Refresh size={14} className={savingConfig ? "animate-spin" : ""} />
            <span>{savingConfig ? "Recalcul de la segmentation..." : "Enregistrer & Ré-appliquer"}</span>
          </button>
        </div>
      </form>

      {/* Current Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
            Très petites entreprises (&lt; {tpeThreshold.toLocaleString()} $)
          </span>
          <span className="text-2xl font-extrabold text-[#242124] dark:text-white mt-1">
            {config?.stats?.tpe_count || 0}
          </span>
          <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
            Routés vers le Back-Office Terrain (Plaques)
          </span>
        </div>

        <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
            PME ({tpeThreshold.toLocaleString()} $ - {pmeThreshold.toLocaleString()} $)
          </span>
          <span className="text-2xl font-extrabold text-[#4F6CE8] mt-1">{config?.stats?.pme_count || 0}</span>
          <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">Routés vers le KAM Office</span>
        </div>

        <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
            Grands Comptes (&ge; {pmeThreshold.toLocaleString()} $)
          </span>
          <span className="text-2xl font-extrabold text-[#242124] dark:text-white mt-1">
            {config?.stats?.grand_compte_count || 0}
          </span>
          <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
            Routés vers le KAM Office (Top C-Level)
          </span>
        </div>
      </div>
    </div>
  );
}
