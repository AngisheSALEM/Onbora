"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface AdminCounts {
  converted?: number;
  catalog?: number;
  crm?: number;
  supervisors?: number;
  kamManagers?: number;
  sales?: number;
  kams?: number;
}

interface AdminContextType {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  executeSearch: () => void;
  setExecuteSearchHandler: (fn: (() => void) | null) => void;
  searchPlaceholder: string;
  setSearchPlaceholder: (p: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (c: boolean) => void;
  toggleCollapsed: () => void;
  counts: AdminCounts;
  setCounts: React.Dispatch<React.SetStateAction<AdminCounts>>;
  updateCount: (key: keyof AdminCounts, value: number) => void;
  successMessage: string | null;
  setSuccessMessage: (msg: string | null) => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [executeSearchHandler, setExecuteSearchHandler] = useState<(() => void) | null>(null);
  const [searchPlaceholder, setSearchPlaceholder] = useState('Rechercher...');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [counts, setCounts] = useState<AdminCounts>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleCollapsed = () => setIsCollapsed((prev) => !prev);

  const executeSearch = () => {
    if (executeSearchHandler) {
      executeSearchHandler();
    }
  };

  const updateCount = (key: keyof AdminCounts, value: number) => {
    setCounts((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <AdminContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        executeSearch,
        setExecuteSearchHandler,
        searchPlaceholder,
        setSearchPlaceholder,
        isCollapsed,
        setIsCollapsed,
        toggleCollapsed,
        counts,
        setCounts,
        updateCount,
        successMessage,
        setSuccessMessage,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdminContext() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error('useAdminContext must be used within an AdminProvider');
  }
  return ctx;
}
