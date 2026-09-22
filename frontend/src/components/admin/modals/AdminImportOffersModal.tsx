"use client";

import React, { useState } from 'react';
import { Icons } from '@/components/shared/Icons';

interface AdminImportOffersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportJson: (jsonString: string) => Promise<void>;
  error?: string | null;
}

export default function AdminImportOffersModal({
  isOpen,
  onClose,
  onImportJson,
  error,
}: AdminImportOffersModalProps) {
  const [rawJson, setRawJson] = useState('');
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    try {
      await onImportJson(rawJson);
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl w-full max-w-2xl p-6 shadow-2xl flex flex-col gap-5 animate-scale-in text-[#242124] dark:text-white border border-black/5 dark:border-white/5">
        <div className="flex justify-between items-center pb-2 border-b border-black/5 dark:border-white/5">
          <div>
            <h3 className="text-base font-semibold">Importer / Synchroniser un Catalogue JSON</h3>
            <p className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
              Collez le JSON complet du catalogue ou des offres B2B pour le synchroniser instantanément avec le Core AI.
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Payload JSON du Catalogue</label>
            <textarea
              rows={12}
              required
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              placeholder={`{\n  "schema_version": "1.0",\n  "catalog_version": "custom-catalog-2026",\n  "status": "approved",\n  "services": [\n    {\n      "service_id": "fibre_pro",\n      "name": "Fibre Pro",\n      "category": "Internet fixe et réseaux",\n      ...\n    }\n  ]\n}`}
              className="px-3.5 py-3 bg-[#F6F5F2] dark:bg-[#242124] rounded-2xl font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0 leading-relaxed"
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
              disabled={importing}
              className="px-5 py-2.5 bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white rounded-xl font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Icons.CheckCircle size={14} />
              <span>{importing ? "Validation & Injection..." : "Valider & Synchroniser"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
