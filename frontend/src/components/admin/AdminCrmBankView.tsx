"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Pagination from '@/components/kam/Pagination';
import { fetchAPI } from '@/lib/api';
import { EnterpriseItem } from './adminTypes';
import { useAdminContext } from './AdminContext';

export default function AdminCrmBankView() {
  const { searchQuery, setSearchPlaceholder, updateCount } = useAdminContext();
  const [enterprises, setEnterprises] = useState<EnterpriseItem[]>([]);
  const [crmTotalCount, setCrmTotalCount] = useState<number>(0);
  const [crmTotalPages, setCrmTotalPages] = useState<number>(1);
  const [crmSegmentFilter, setCrmSegmentFilter] = useState<string>('ALL');
  const [crmEntityFilter, setCrmEntityFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [crmPage, setCrmPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setSearchPlaceholder("Rechercher une entreprise CRM (nom, CRM ID, ville, secteur, RCCM)...");
  }, [setSearchPlaceholder]);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setCrmPage(1);
  }, [crmSegmentFilter, crmEntityFilter, searchQuery]);

  const loadCrmEnterprises = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/sales/enterprises/?page=${crmPage}&page_size=${PAGE_SIZE}`;
      if (crmSegmentFilter !== 'ALL') url += `&segment=${crmSegmentFilter}`;
      if (crmEntityFilter !== 'ALL') url += `&assigned_entity=${crmEntityFilter}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery)}`;

      const data = await fetchAPI(url);
      const results = data?.results || data?.enterprises || (Array.isArray(data) ? data : []);
      const count = data?.count ?? data?.total ?? results.length;
      const pages = data?.total_pages ?? Math.max(1, Math.ceil(count / PAGE_SIZE));

      setEnterprises(results);
      setCrmTotalCount(count);
      setCrmTotalPages(pages);
      updateCount('crm', count);
    } catch (err) {
      console.error("Erreur chargement entreprises CRM:", err);
    } finally {
      setLoading(false);
    }
  }, [crmEntityFilter, crmPage, crmSegmentFilter, searchQuery, updateCount]);

  useEffect(() => {
    loadCrmEnterprises();
  }, [loadCrmEnterprises]);

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#242124] dark:text-white mt-1">Entreprises CRM</h2>
        </div>

        {/* Combined Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={crmSegmentFilter}
            onChange={(e) => setCrmSegmentFilter(e.target.value)}
            className="px-3 py-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl text-xs font-medium text-[#242124] dark:text-white focus:outline-none border-0 cursor-pointer"
          >
            <option value="ALL">Tous les Segments</option>
            <option value="GRAND_COMPTE">Grands Comptes (Top C-Level)</option>
            <option value="PME">PME (Moyennes structures)</option>
            <option value="TPE_INFORMEL">Très petites entreprises (Commerces, Artisans)</option>
          </select>

          <select
            value={crmEntityFilter}
            onChange={(e) => setCrmEntityFilter(e.target.value)}
            className="px-3 py-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl text-xs font-medium text-[#242124] dark:text-white focus:outline-none border-0 cursor-pointer"
          >
            <option value="ALL">Toutes les Entités</option>
            <option value="BACK_OFFICE">Back-Office Terrain (SOHO)</option>
            <option value="KAM_OFFICE">KAM Office (GC & PME)</option>
          </select>
        </div>
      </div>

      {/* Table / List Container */}
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#242124] dark:text-white">
            Résultats ({crmTotalCount} entreprise{crmTotalCount > 1 ? 's' : ''} au total)
          </h3>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-7 h-7 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
          </div>
        ) : enterprises.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
            Aucune entreprise CRM trouvée.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {enterprises.map((ent) => (
                <div
                  key={ent.id}
                  className="bg-[#F6F5F2] dark:bg-[#242124] p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-medium text-[10px] shrink-0 ${
                        ent.segment === 'GRAND_COMPTE'
                          ? 'bg-black/5 dark:bg-white/10 text-[#242124] dark:text-white font-medium'
                          : ent.segment === 'PME'
                          ? 'bg-[#4F6CE8]/15 text-[#4F6CE8] font-medium'
                          : 'bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA] font-medium'
                      }`}
                    >
                      {ent.segment === 'GRAND_COMPTE' ? 'GC' : ent.segment === 'PME' ? 'PME' : 'TPE'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#242124] dark:text-white">{ent.name}</span>
                        <span className="text-[9px] font-medium text-[#6E6C67] dark:text-[#A1A1AA]">
                          ({ent.crm_id})
                        </span>
                      </div>
                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                        {ent.sector} • {ent.city} ({ent.commune}) • Connectivité : {ent.current_connectivity || "Standard"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <span className="font-medium text-[#242124] dark:text-white block">
                        {Number(ent.annual_revenue).toLocaleString()} $ / an
                      </span>
                      <span
                        className={`text-[9px] font-medium px-2 py-0.5 rounded-full inline-block ${
                          ent.assigned_entity === 'BACK_OFFICE'
                            ? 'bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA]'
                            : 'bg-[#4F6CE8]/15 text-[#4F6CE8]'
                        }`}
                      >
                        {ent.assigned_entity === 'BACK_OFFICE' ? 'Back-Office Terrain' : 'KAM Office'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={crmPage}
              totalPages={crmTotalPages}
              onPageChange={setCrmPage}
              totalItems={crmTotalCount}
              pageSize={PAGE_SIZE}
              itemName="entreprises"
            />
          </>
        )}
      </div>
    </div>
  );
}
