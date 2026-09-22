"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { fetchAPI } from '@/lib/api';
import {
  EnterpriseItem,
  PlaqueItem,
  SalespersonItem,
  VisitReportItem,
  VisitSubmissionItem,
} from './backofficeTypes';

export interface BackofficeCounts {
  enterprises?: number;
  salespersons?: number;
  plaques?: number;
}

export interface EnterpriseVisitInfo {
  count: number;
  isVisited: boolean;
  label: string;
  lastVisitDate?: string;
  lastSalesperson?: string;
  lastReport?: any;
}

interface BackofficeContextType {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchPlaceholder: string;
  setSearchPlaceholder: (p: string) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (c: boolean) => void;
  toggleSidebar: () => void;
  counts: BackofficeCounts;
  headerTitle: string;
  setHeaderTitle: (t: string) => void;
  headerAction: ReactNode | null;
  setHeaderAction: (a: ReactNode | null) => void;

  // Data
  enterprises: EnterpriseItem[];
  setEnterprises: React.Dispatch<React.SetStateAction<EnterpriseItem[]>>;
  plaques: PlaqueItem[];
  setPlaques: React.Dispatch<React.SetStateAction<PlaqueItem[]>>;
  salespersons: SalespersonItem[];
  setSalespersons: React.Dispatch<React.SetStateAction<SalespersonItem[]>>;
  recentReportsFeed: VisitReportItem[];
  recentFormSubmissions: VisitSubmissionItem[];
  kpis: { total: number; assigned: number; converted: number; visited: number };
  loading: boolean;
  loadDashboardData: () => Promise<void>;

  // Visit Info helper
  getEnterpriseVisitInfo: (ent: EnterpriseItem) => EnterpriseVisitInfo;

  // Modals & Selected Entities
  selectedAccountForDetail: EnterpriseItem | null;
  setSelectedAccountForDetail: (ent: EnterpriseItem | null) => void;
  selectedReportToInspect: any | null;
  setSelectedReportToInspect: (rep: any | null) => void;
  selectedPlaqueForAssign: PlaqueItem | null;
  setSelectedPlaqueForAssign: (plaque: PlaqueItem | null) => void;
  isAddSalespersonOpen: boolean;
  setIsAddSalespersonOpen: (open: boolean) => void;
  isAddPlaqueOpen: boolean;
  setIsAddPlaqueOpen: (open: boolean) => void;

  // Notification banners
  dispatchNotification: { plaqueCode: string; message: string; type: 'success' | 'error' } | null;
  setDispatchNotification: (notif: { plaqueCode: string; message: string; type: 'success' | 'error' } | null) => void;

  // Actions
  handleAssignEnterpriseSalesperson: (enterpriseId: number, salespersonId: number | null) => Promise<void>;
  handleAutoDispatch: (plaque: PlaqueItem) => Promise<void>;
  handleSavePlaqueAssignment: (plaqueId: number, salespersonIds: number[]) => Promise<void>;
  handleCreateSalesperson: (data: any) => Promise<void>;
  handleCreatePlaque: (data: any) => Promise<void>;
}

const BackofficeContext = createContext<BackofficeContextType | null>(null);

export function BackofficeProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPlaceholder, setSearchPlaceholder] = useState('Rechercher...');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [headerTitle, setHeaderTitle] = useState('Portefeuille Comptes TPE');
  const [headerAction, setHeaderAction] = useState<ReactNode | null>(null);

  // Entities
  const [enterprises, setEnterprises] = useState<EnterpriseItem[]>([]);
  const [plaques, setPlaques] = useState<PlaqueItem[]>([]);
  const [salespersons, setSalespersons] = useState<SalespersonItem[]>([]);
  const [recentReportsFeed, setRecentReportsFeed] = useState<VisitReportItem[]>([]);
  const [recentFormSubmissions, setRecentFormSubmissions] = useState<VisitSubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Inspection states
  const [selectedAccountForDetail, setSelectedAccountForDetail] = useState<EnterpriseItem | null>(null);
  const [selectedReportToInspect, setSelectedReportToInspect] = useState<any | null>(null);
  const [selectedPlaqueForAssign, setSelectedPlaqueForAssign] = useState<PlaqueItem | null>(null);
  const [isAddSalespersonOpen, setIsAddSalespersonOpen] = useState(false);
  const [isAddPlaqueOpen, setIsAddPlaqueOpen] = useState(false);
  const [dispatchNotification, setDispatchNotification] = useState<{ plaqueCode: string; message: string; type: 'success' | 'error' } | null>(null);

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  // Load Dashboard Data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashData, repData, subData] = await Promise.all([
        fetchAPI('/api/sales/supervisor-dashboard/'),
        fetchAPI('/api/sales/visit-reports/').catch(() => []),
        fetchAPI('/api/sales/visit-form/submissions/').catch(() => []),
      ]);

      setPlaques(Array.isArray(dashData?.plaques) ? dashData.plaques : []);
      setEnterprises(Array.isArray(dashData?.enterprises) ? dashData.enterprises : []);
      setSalespersons(Array.isArray(dashData?.salespersons) ? dashData.salespersons : []);

      const combinedReports = [
        ...(Array.isArray(dashData?.recent_reports_feed) ? dashData.recent_reports_feed : []),
        ...(Array.isArray(repData) ? repData : []),
      ];
      const seenRep = new Set<number>();
      const uniqueReports: VisitReportItem[] = [];
      combinedReports.forEach((r: any) => {
        if (r?.id && !seenRep.has(r.id)) {
          seenRep.add(r.id);
          uniqueReports.push(r);
        }
      });
      setRecentReportsFeed(uniqueReports);

      const combinedSubs = [
        ...(Array.isArray(dashData?.recent_form_submissions) ? dashData.recent_form_submissions : []),
        ...(Array.isArray(subData) ? subData : []),
      ];
      const seenSub = new Set<number>();
      const uniqueSubs: VisitSubmissionItem[] = [];
      combinedSubs.forEach((s: any) => {
        if (s?.id && !seenSub.has(s.id)) {
          seenSub.add(s.id);
          uniqueSubs.push(s);
        }
      });
      setRecentFormSubmissions(uniqueSubs);
    } catch (err: any) {
      console.error("Erreur chargement cockpit superviseur:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Counts for sidebar badges
  const counts: BackofficeCounts = useMemo(() => ({
    enterprises: enterprises.length,
    salespersons: salespersons.length,
    plaques: plaques.length,
  }), [enterprises.length, salespersons.length, plaques.length]);

  // KPIs
  const kpis = useMemo(() => {
    const total = enterprises.length;
    const assigned = enterprises.filter((e) => e.assigned_salesperson).length;
    const converted = enterprises.filter((e) => e.is_converted || e.conversion_status === 'CONVERTED').length;
    const visited = enterprises.filter((e) => e.is_visited).length;
    return { total, assigned, converted, visited };
  }, [enterprises]);

  // Visits map
  const enterpriseVisitsMap = useMemo(() => {
    const map = new Map<number, { count: number; lastVisitDate?: string; lastSalesperson?: string; lastReport?: any }>();
    (recentReportsFeed || []).forEach((r) => {
      if (!r.enterprise_id) return;
      const prev = map.get(r.enterprise_id) || { count: 0 };
      map.set(r.enterprise_id, {
        count: prev.count + 1,
        lastVisitDate: prev.lastVisitDate || r.created_at,
        lastSalesperson: prev.lastSalesperson || r.salesperson_name,
        lastReport: prev.lastReport || { ...r, type: 'REPORT' },
      });
    });
    (recentFormSubmissions || []).forEach((s) => {
      const eid = typeof s.enterprise === 'object' ? (s.enterprise as any).id : s.enterprise;
      const entId = eid || (s as any).enterprise_id;
      if (!entId) return;
      const prev = map.get(entId) || { count: 0 };
      map.set(entId, {
        count: prev.count + 1,
        lastVisitDate: prev.lastVisitDate || s.created_at,
        lastSalesperson: prev.lastSalesperson || s.salesperson_name,
        lastReport: prev.lastReport || { ...s, type: 'SUBMISSION' },
      });
    });
    return map;
  }, [recentReportsFeed, recentFormSubmissions]);

  const getEnterpriseVisitInfo = useCallback((ent: EnterpriseItem): EnterpriseVisitInfo => {
    const info = enterpriseVisitsMap.get(ent.id);
    const count = info?.count || (ent.is_visited ? 1 : 0);
    const isVisited = ent.is_visited || count > 0;
    const label = !isVisited || count === 0 ? "Non visité" : count === 1 ? "1 visite" : `${count} visites`;
    return {
      count,
      isVisited,
      label,
      lastVisitDate: info?.lastVisitDate || ent.last_visited_at,
      lastSalesperson: info?.lastSalesperson || ent.last_visited_by_name || ent.assigned_salesperson_name,
      lastReport: info?.lastReport,
    };
  }, [enterpriseVisitsMap]);

  // Assign Enterprise to Salesperson
  const handleAssignEnterpriseSalesperson = async (enterpriseId: number, salespersonId: number | null) => {
    try {
      const res = await fetchAPI(`/api/sales/enterprises/${enterpriseId}/assign-salesperson/`, {
        method: 'POST',
        body: JSON.stringify({ salesperson_id: salespersonId }),
      });
      const targetSp = salespersons.find((s) => s.id === salespersonId);

      setEnterprises((prev) =>
        prev.map((e) => {
          if (e.id === enterpriseId) {
            return {
              ...e,
              assigned_salesperson: salespersonId || undefined,
              assigned_salesperson_name: targetSp ? targetSp.full_name : undefined,
            };
          }
          return e;
        })
      );

      if (res.plaque_id && salespersonId && targetSp) {
        setPlaques((prev) =>
          prev.map((p) => {
            if (p.id === res.plaque_id) {
              const curAssigned = p.assigned_salespersons || [];
              const curNames = p.assigned_salespersons_names || [];
              const nextAssigned = curAssigned.includes(salespersonId) ? curAssigned : [...curAssigned, salespersonId];
              const nextNames = curNames.includes(targetSp.full_name) ? curNames : [...curNames, targetSp.full_name];
              return {
                ...p,
                assigned_salespersons: nextAssigned,
                assigned_salespersons_names: nextNames,
              };
            }
            return p;
          })
        );
      }
      loadDashboardData();
    } catch (err: any) {
      console.error("Erreur assignation commercial:", err);
      throw err;
    }
  };

  // Auto-Dispatch
  const handleAutoDispatch = async (plaque: PlaqueItem) => {
    setDispatchNotification(null);
    try {
      const res = await fetchAPI(`/api/sales/plaques/${plaque.id}/auto-dispatch/`, {
        method: 'POST',
      });
      setDispatchNotification({
        plaqueCode: plaque.code,
        message: res.message || `${res.assigned_count || 0} comptes TPE affectés avec succès.`,
        type: 'success',
      });
      await loadDashboardData();
    } catch (err: any) {
      console.error("Erreur auto-dispatch:", err);
      setDispatchNotification({
        plaqueCode: plaque.code,
        message: err.message || "Erreur lors de l'affectation automatique.",
        type: 'error',
      });
      throw err;
    }
  };

  // Save Plaque Assignment
  const handleSavePlaqueAssignment = async (plaqueId: number, salespersonIds: number[]) => {
    try {
      await fetchAPI(`/api/sales/plaques/${plaqueId}/assign/`, {
        method: 'POST',
        body: JSON.stringify({ salesperson_ids: salespersonIds }),
      });
      await loadDashboardData();
      setSelectedPlaqueForAssign(null);
    } catch (err: any) {
      console.error("Erreur affectation commerciaux plaque:", err);
      throw err;
    }
  };

  // Create Salesperson
  const handleCreateSalesperson = async (data: any) => {
    try {
      await fetchAPI('/api/sales/salespersons/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setIsAddSalespersonOpen(false);
      await loadDashboardData();
    } catch (err: any) {
      console.error("Erreur création commercial:", err);
      throw err;
    }
  };

  // Create Plaque
  const handleCreatePlaque = async (data: any) => {
    try {
      await fetchAPI('/api/sales/plaques/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setIsAddPlaqueOpen(false);
      await loadDashboardData();
    } catch (err: any) {
      console.error("Erreur création plaque:", err);
      throw err;
    }
  };

  return (
    <BackofficeContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        searchPlaceholder,
        setSearchPlaceholder,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
        counts,
        headerTitle,
        setHeaderTitle,
        headerAction,
        setHeaderAction,
        enterprises,
        setEnterprises,
        plaques,
        setPlaques,
        salespersons,
        setSalespersons,
        recentReportsFeed,
        recentFormSubmissions,
        kpis,
        loading,
        loadDashboardData,
        getEnterpriseVisitInfo,
        selectedAccountForDetail,
        setSelectedAccountForDetail,
        selectedReportToInspect,
        setSelectedReportToInspect,
        selectedPlaqueForAssign,
        setSelectedPlaqueForAssign,
        isAddSalespersonOpen,
        setIsAddSalespersonOpen,
        isAddPlaqueOpen,
        setIsAddPlaqueOpen,
        dispatchNotification,
        setDispatchNotification,
        handleAssignEnterpriseSalesperson,
        handleAutoDispatch,
        handleSavePlaqueAssignment,
        handleCreateSalesperson,
        handleCreatePlaque,
      }}
    >
      {children}
    </BackofficeContext.Provider>
  );
}

export function useBackofficeContext() {
  const ctx = useContext(BackofficeContext);
  if (!ctx) {
    throw new Error('useBackofficeContext must be used within a BackofficeProvider');
  }
  return ctx;
}
