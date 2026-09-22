"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { fetchAPI } from '@/lib/api';
import {
  KamOfficeMetrics,
  KamUser,
  KamAccount,
  KamVisitRecord,
} from './kamOfficeTypes';

interface KamOfficeContextType {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchPlaceholder: string;
  setSearchPlaceholder: (p: string) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (c: boolean) => void;
  toggleSidebar: () => void;
  headerTitle: string;
  setHeaderTitle: (t: string) => void;
  headerAction: ReactNode | null;
  setHeaderAction: (a: ReactNode | null) => void;

  // Data
  metrics: KamOfficeMetrics | null;
  kamsList: KamUser[];
  setKamsList: React.Dispatch<React.SetStateAction<KamUser[]>>;
  accountsList: KamAccount[];
  setAccountsList: React.Dispatch<React.SetStateAction<KamAccount[]>>;
  kamReports: KamVisitRecord[];
  loadingData: boolean;
  loadingKamReports: boolean;
  notification: { type: 'success' | 'error'; message: string } | null;
  setNotification: (notif: { type: 'success' | 'error'; message: string } | null) => void;
  loadKamOfficeData: () => Promise<void>;
  loadKamReports: () => Promise<void>;
  citiesList: string[];

  // Actions
  handleConfirmAssignment: (enterpriseId: number, kamId: number | null) => Promise<void>;
  handleUnassignAccount: (enterpriseId: number) => Promise<void>;
  handleCreateKamSubmit: (data: any) => Promise<void>;
  handleUpdateKam: (kamId: number, fields: Partial<KamUser>) => Promise<void>;

  // Modals & Selections
  selectedAccountToAssign: KamAccount | null;
  setSelectedAccountToAssign: (acc: KamAccount | null) => void;
  isCreateKamModalOpen: boolean;
  setIsCreateKamModalOpen: (open: boolean) => void;
  selectedAccountForDetail: KamAccount | null;
  setSelectedAccountForDetail: (acc: KamAccount | null) => void;
  selectedReportDetail: KamVisitRecord | null;
  setSelectedReportDetail: (rep: KamVisitRecord | null) => void;
  selectedKamDetail: KamUser | null;
  setSelectedKamDetail: (kam: KamUser | null) => void;
}

const KamOfficeContext = createContext<KamOfficeContextType | null>(null);

export function KamOfficeProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPlaceholder, setSearchPlaceholder] = useState('Rechercher un compte, CRM, contact...');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [headerTitle, setHeaderTitle] = useState("Cockpit Key Account Management");
  const [headerAction, setHeaderAction] = useState<ReactNode | null>(null);

  // Entities
  const [metrics, setMetrics] = useState<KamOfficeMetrics | null>(null);
  const [kamsList, setKamsList] = useState<KamUser[]>([]);
  const [accountsList, setAccountsList] = useState<KamAccount[]>([]);
  const [kamReports, setKamReports] = useState<KamVisitRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingKamReports, setLoadingKamReports] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Selection states
  const [selectedAccountToAssign, setSelectedAccountToAssign] = useState<KamAccount | null>(null);
  const [isCreateKamModalOpen, setIsCreateKamModalOpen] = useState(false);
  const [selectedAccountForDetail, setSelectedAccountForDetail] = useState<KamAccount | null>(null);
  const [selectedReportDetail, setSelectedReportDetail] = useState<KamVisitRecord | null>(null);
  const [selectedKamDetail, setSelectedKamDetail] = useState<KamUser | null>(null);

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  // Load Dashboard Data
  const loadKamOfficeData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [overviewData, kamsData, accountsData] = await Promise.all([
        fetchAPI('/api/kam-office/overview/'),
        fetchAPI('/api/kam-office/kams/'),
        fetchAPI('/api/kam-office/accounts/?limit=600'),
      ]);

      if (overviewData && overviewData.metrics) {
        setMetrics(overviewData.metrics);
      }
      if (kamsData && kamsData.kams) {
        setKamsList(kamsData.kams);
      }
      if (accountsData && accountsData.accounts) {
        setAccountsList(accountsData.accounts);
      }
    } catch (err) {
      console.error("Erreur de chargement des données KAM Office:", err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Load Visit Reports
  const loadKamReports = useCallback(async () => {
    setLoadingKamReports(true);
    try {
      const data = await fetchAPI('/api/kam/visits/');
      if (data && Array.isArray(data.visits)) {
        setKamReports(data.visits);
      } else {
        setKamReports([]);
      }
    } catch (err) {
      console.error("Erreur de chargement des rapports KAM:", err);
      setKamReports([]);
    } finally {
      setLoadingKamReports(false);
    }
  }, []);

  useEffect(() => {
    loadKamOfficeData();
    loadKamReports();
  }, [loadKamOfficeData, loadKamReports]);

  // Keep selected KAM detail updated
  useEffect(() => {
    if (selectedKamDetail && kamsList.length > 0) {
      const refreshed = kamsList.find((k) => k.id === selectedKamDetail.id);
      if (refreshed) setSelectedKamDetail(refreshed);
    }
  }, [kamsList]);

  // Unique cities list for filters
  const citiesList = useMemo(() => {
    const set = new Set<string>();
    accountsList.forEach((acc) => {
      if (acc.city) set.add(acc.city);
    });
    return Array.from(set).sort();
  }, [accountsList]);

  // Assignment Handler
  const handleConfirmAssignment = async (enterpriseId: number, kamId: number | null) => {
    try {
      const res = await fetchAPI('/api/kam-office/assign/', {
        method: 'POST',
        body: JSON.stringify({
          enterprise_id: enterpriseId,
          kam_id: kamId,
        }),
      });

      setNotification({
        type: 'success',
        message: res.message || "Affectation enregistrée avec succès.",
      });
      setTimeout(() => setNotification(null), 4500);
      setSelectedAccountToAssign(null);
      await loadKamOfficeData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || "Erreur lors de l'affectation du compte.",
      });
      setTimeout(() => setNotification(null), 4500);
      throw err;
    }
  };

  // Direct Unassign Handler
  const handleUnassignAccount = async (enterpriseId: number) => {
    try {
      const res = await fetchAPI('/api/kam-office/assign/', {
        method: 'POST',
        body: JSON.stringify({
          enterprise_id: enterpriseId,
          kam_id: null,
        }),
      });

      setNotification({
        type: 'success',
        message: res.message || "Compte remis dans le vivier non affecté.",
      });
      setTimeout(() => setNotification(null), 4000);
      await loadKamOfficeData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || "Erreur lors de la désaffectation.",
      });
      setTimeout(() => setNotification(null), 4000);
      throw err;
    }
  };

  // Create KAM Handler
  const handleCreateKamSubmit = async (data: any) => {
    try {
      await fetchAPI('/api/kam-office/kams/', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      setIsCreateKamModalOpen(false);
      setNotification({
        type: 'success',
        message: "Nouveau Key Account Manager créé avec succès.",
      });
      setTimeout(() => setNotification(null), 4000);
      await loadKamOfficeData();
    } catch (err: any) {
      console.error("Erreur création KAM:", err);
      throw err;
    }
  };

  // Toggle KAM Specialization or Availability
  const handleUpdateKam = async (kamId: number, fields: Partial<KamUser>) => {
    try {
      await fetchAPI(`/api/kam-office/kams/${kamId}/`, {
        method: 'PATCH',
        body: JSON.stringify(fields),
      });
      setKamsList((prev) => prev.map((k) => (k.id === kamId ? { ...k, ...fields } : k)));
      if (selectedKamDetail && selectedKamDetail.id === kamId) {
        setSelectedKamDetail((prev) => (prev ? { ...prev, ...fields } : null));
      }
      setNotification({
        type: 'success',
        message: "Fiche KAM mise à jour avec succès.",
      });
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || "Erreur lors de la modification du KAM.",
      });
      setTimeout(() => setNotification(null), 4000);
      throw err;
    }
  };

  return (
    <KamOfficeContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        searchPlaceholder,
        setSearchPlaceholder,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
        headerTitle,
        setHeaderTitle,
        headerAction,
        setHeaderAction,
        metrics,
        kamsList,
        setKamsList,
        accountsList,
        setAccountsList,
        kamReports,
        loadingData,
        loadingKamReports,
        notification,
        setNotification,
        loadKamOfficeData,
        loadKamReports,
        citiesList,
        handleConfirmAssignment,
        handleUnassignAccount,
        handleCreateKamSubmit,
        handleUpdateKam,
        selectedAccountToAssign,
        setSelectedAccountToAssign,
        isCreateKamModalOpen,
        setIsCreateKamModalOpen,
        selectedAccountForDetail,
        setSelectedAccountForDetail,
        selectedReportDetail,
        setSelectedReportDetail,
        selectedKamDetail,
        setSelectedKamDetail,
      }}
    >
      {children}
    </KamOfficeContext.Provider>
  );
}

export function useKamOfficeContext() {
  const ctx = useContext(KamOfficeContext);
  if (!ctx) {
    throw new Error('useKamOfficeContext must be used within a KamOfficeProvider');
  }
  return ctx;
}
