"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchAPI } from '@/lib/api';
import { StrategicVisit, B2BNewsItem } from './kamTypes';

export interface KamFilterOption {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface KamContextType {
  visits: StrategicVisit[];
  loading: boolean;
  error: string | null;
  selectedVisitId: string;
  setSelectedVisitId: React.Dispatch<React.SetStateAction<string>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  headerTitle: string | null;
  setHeaderTitle: React.Dispatch<React.SetStateAction<string | null>>;
  headerSubtitle: string | null;
  setHeaderSubtitle: React.Dispatch<React.SetStateAction<string | null>>;
  headerBackLink: string | null;
  setHeaderBackLink: React.Dispatch<React.SetStateAction<string | null>>;
  activeFilter: string;
  setActiveFilter: React.Dispatch<React.SetStateAction<string>>;
  filterOptions: KamFilterOption[];
  setFilterOptions: React.Dispatch<React.SetStateAction<KamFilterOption[]>>;
  filterCategoryLabel: string;
  setFilterCategoryLabel: React.Dispatch<React.SetStateAction<string>>;
  dateFilter: string;
  setDateFilter: React.Dispatch<React.SetStateAction<string>>;
  isScrolled: boolean;
  setIsScrolled: React.Dispatch<React.SetStateAction<boolean>>;
  loadAssignedAccounts: () => Promise<void>;
  updateVisit: (updated: StrategicVisit) => void;
  // Veille B2B, signaux forts & badge actualité
  unreadNewsCount: number;
  setUnreadNewsCount: React.Dispatch<React.SetStateAction<number>>;
  strongSignals: B2BNewsItem[];
  setStrongSignals: React.Dispatch<React.SetStateAction<B2BNewsItem[]>>;
  loadNewsData: () => Promise<void>;
  markAllNewsAsRead: () => Promise<void>;
  markArticleAsRead: (articleId: string) => Promise<void>;
}

const KamContext = createContext<KamContextType | undefined>(undefined);

export function KamProvider({ children }: { children: React.ReactNode }) {
  const [visits, setVisits] = useState<StrategicVisit[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [headerTitle, setHeaderTitle] = useState<string | null>(null);
  const [headerSubtitle, setHeaderSubtitle] = useState<string | null>(null);
  const [headerBackLink, setHeaderBackLink] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [filterOptions, setFilterOptions] = useState<KamFilterOption[]>([]);
  const [filterCategoryLabel, setFilterCategoryLabel] = useState<string>('FILTRER PAR STATUT');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Unread news & strong signals
  const [unreadNewsCount, setUnreadNewsCount] = useState<number>(0);
  const [strongSignals, setStrongSignals] = useState<B2BNewsItem[]>([]);

  const accountsLoaded = useRef(false);

  const loadAssignedAccounts = useCallback(async () => {
    if (!accountsLoaded.current) setLoading(true);
    setError(null);
    try {
      const data = await fetchAPI('/api/kam/accounts/');
      if (data && Array.isArray(data.accounts)) {
        accountsLoaded.current = true;
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible de charger les comptes";
      console.error("Erreur chargement comptes assignés KAM:", err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNewsData = useCallback(async () => {
    try {
      const data = await fetchAPI('/api/kam/feed/?signal=STRONG&limit=10');
      if (data && Array.isArray(data.results)) {
        setStrongSignals(data.results);
        setUnreadNewsCount(data.counters?.unread ?? 0);
      }
    } catch (err) {
      console.error("Erreur chargement signaux et actualités KAM:", err);
    }
  }, []);

  const markAllNewsAsRead = useCallback(async () => {
    try {
      await fetchAPI('/api/kam/feed/mark-all-read/', { method: 'POST' });
      setUnreadNewsCount(0);
      setStrongSignals((prev) => prev.map((s) => ({ ...s, is_read: true })));
    } catch (err) {
      console.error("Erreur mark all news as read:", err);
    }
  }, []);

  const markArticleAsRead = useCallback(async (articleId: string) => {
    try {
      await fetchAPI(`/api/kam/feed/${articleId}/read/`, {
        method: 'POST',
        body: JSON.stringify({ is_read: true }),
      });
      setUnreadNewsCount((prev) => Math.max(0, prev - 1));
      setStrongSignals((prev) =>
        prev.map((s) => (s.id === articleId ? { ...s, is_read: true } : s))
      );
    } catch (err) {
      console.error("Erreur mark article as read:", err);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetchAPI('/api/kam/accounts/')
      .then((data) => {
        if (!ignore) {
          if (data && Array.isArray(data.accounts)) {
            accountsLoaded.current = true;
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
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Impossible de charger les comptes";
          console.error("Erreur chargement comptes assignés KAM:", err);
          setError(msg);
          setLoading(false);
        }
      });

    fetchAPI('/api/kam/feed/?signal=STRONG&limit=10')
      .then((data) => {
        if (!ignore) {
          if (data && Array.isArray(data.results)) {
            setStrongSignals(data.results);
            setUnreadNewsCount(data.counters?.unread ?? 0);
          }
        }
      })
      .catch((err) => {
        console.error("Erreur chargement signaux et actualités KAM:", err);
      });

    return () => {
      ignore = true;
    };
  }, []);

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
        headerTitle,
        setHeaderTitle,
        headerSubtitle,
        setHeaderSubtitle,
        headerBackLink,
        setHeaderBackLink,
        activeFilter,
        setActiveFilter,
        filterOptions,
        setFilterOptions,
        filterCategoryLabel,
        setFilterCategoryLabel,
        dateFilter,
        setDateFilter,
        isScrolled,
        setIsScrolled,
        loadAssignedAccounts,
        updateVisit,
        unreadNewsCount,
        setUnreadNewsCount,
        strongSignals,
        setStrongSignals,
        loadNewsData,
        markAllNewsAsRead,
        markArticleAsRead,
      }}
    >
      {children}
    </KamContext.Provider>
  );
}

export function useKamContext() {
  const context = useContext(KamContext);
  if (!context) {
    throw new Error('useKamContext must be used within a KamProvider');
  }
  return context;
}
