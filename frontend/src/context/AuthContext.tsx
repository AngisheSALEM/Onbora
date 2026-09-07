"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'CLIENT_B2B' | 'SALESPERSON' | 'KAM' | 'SUPERVISOR' | 'KAM_MANAGER' | 'ADMIN';
  phone?: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updatedFields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultKamUser: User = {
  id: 101,
  username: 'kam_salem',
  email: 'salem.kam@orange.com',
  first_name: 'Salem',
  last_name: 'Directeur KAM',
  role: 'KAM',
  company_name: 'Orange Business',
  avatar: 'memoji_056.png'
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(defaultKamUser);
  const [token, setToken] = useState<string | null>('demo-token-kam');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if token exists in localStorage
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        // Clear corrupt data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(defaultKamUser);
        setToken('demo-token-kam');
      }
    } else {
      setUser(defaultKamUser);
      setToken('demo-token-kam');
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);

    // Redirect user to the corresponding path based on role
    switch (newUser.role) {
      case 'CLIENT_B2B':
        router.push('/client');
        break;
      case 'SALESPERSON':
        router.push('/sales');
        break;
      case 'KAM':
        router.push('/kam');
        break;
      case 'SUPERVISOR':
      case 'ADMIN':
        router.push('/admin');
        break;
      default:
        router.push('/admin');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
