"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '@/lib/api';
import { StrategicVisit } from './kamTypes';

interface KamContextType {
  visits: StrategicVisit[];
  loading: boolean;
  error: string | null;
  selectedVisitId: string;
  setSelectedVisitId: React.Dispatch<React.SetStateAction<string>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  loadAssignedAccounts: () => Promise<void>;
  updateVisit: (updated: StrategicVisit) => void;
}

const KamContext = createContext<KamContextType | undefined>(undefined);

export function KamProvider({ children }: { children: React.ReactNode }) {
  const [visits, setVisits] = useState<StrategicVisit[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAssignedAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAPI('/api/kam/accounts/');
      if (data && Array.isArray(data.accounts)) {
        setVisits(data.accounts);
        if (data.accounts.length > 0) {
          setSelectedVisitId((prev) => {
            const exists = data.accounts.some((v: StrategicVisit) => v.id === prev);
            return exists ? prev : data.accounts[0].id;
          });
        }
      } else {
        setVisits([]);
      }
    } catch (err: any) {
      console.error("Erreur chargement comptes assignés KAM:", err);
      setError(err?.message || "Impossible de charger les comptes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignedAccounts();
  }, [loadAssignedAccounts]);

  const updateVisit = useCallback((updated: StrategicVisit) => {
    setVisits((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  }, []);

  return (
    <KamContext.Provider
      value={{
        visits,
        loading,
        error,
        selectedVisitId,
        setSelectedVisitId,
        searchQuery,
        setSearchQuery,
        loadAssignedAccounts,
        updateVisit,
      }}
    >
      {children}
    </KamContext.Provider>
  );
}

export function useKamContext() {
  const context = useContext(KamContext);
  if (!context) {
    throw new Error("useKamContext doit être utilisé à l'intérieur d'un KamProvider");
  }
  return context;
}
