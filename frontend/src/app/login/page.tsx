"use client";

import React, { useState, useEffect } from 'react';
import { useAuth, User } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Logo from '@/components/shared/Logo';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { Icons } from '@/components/shared/Icons';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('kam_salem');
  const [password, setPassword] = useState('orange2026');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'KAM') {
        router.push('/kam');
      } else if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
        router.push('/admin');
      } else if (user.role === 'CLIENT_B2B') {
        router.push('/client');
      } else if (user.role === 'SALESPERSON') {
        router.push('/sales');
      } else {
        router.push('/kam');
      }
    }
  }, [user, loading, router]);

  const handleDirectDemoLogin = (role: 'KAM' | 'ADMIN' | 'SALESPERSON' | 'CLIENT_B2B') => {
    const demoUsers: Record<string, User> = {
      KAM: {
        id: 101,
        username: 'kam_salem',
        email: 'salem.kam@orange.com',
        first_name: 'Salem',
        last_name: 'Directeur KAM',
        role: 'KAM',
        company_name: 'Orange Business'
      },
      ADMIN: {
        id: 1,
        username: 'admin',
        email: 'admin@onbora.ci',
        first_name: 'Admin',
        last_name: 'Superviseur',
        role: 'ADMIN',
        company_name: 'Onbora Management'
      },
      SALESPERSON: {
        id: 201,
        username: 'sales_pierre',
        email: 'pierre.sales@onbora.ci',
        first_name: 'Pierre',
        last_name: 'Commercial',
        role: 'SALESPERSON',
        company_name: 'Onbora Field'
      },
      CLIENT_B2B: {
        id: 301,
        username: 'sgb_client',
        email: 'dsi@sgb.ci',
        first_name: 'Jean-Marc',
        last_name: 'Kouassi',
        role: 'CLIENT_B2B',
        company_name: 'Société Générale de Banque'
      }
    };

    const targetUser = demoUsers[role];
    login(`demo-token-${role.toLowerCase()}-${Date.now()}`, targetUser);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        // Fallback for demo if backend is offline or credentials don't match
        if (username.toLowerCase().includes('kam') || username.toLowerCase().includes('salem')) {
          handleDirectDemoLogin('KAM');
          return;
        } else if (username.toLowerCase().includes('admin') || username.toLowerCase().includes('sup')) {
          handleDirectDemoLogin('ADMIN');
          return;
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.non_field_errors?.[0] || 'Identifiants incorrects.');
      }

      const data = await res.json();
      login(data.token, data.user);
    } catch (err: any) {
      // In dev mode, if backend is unavailable, gracefully offer demo login
      if (username.toLowerCase().includes('kam') || username.toLowerCase().includes('salem')) {
        handleDirectDemoLogin('KAM');
      } else {
        setError(err.message || 'Serveur backend injoignable. Utilisez les accès directs démo ci-dessous.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2F2F7] dark:bg-[#000000]">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative bg-[#F2F2F7] dark:bg-[#000000] text-zinc-900 dark:text-white font-sans select-none">
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-3xl p-8 sm:p-10 flex flex-col gap-6 shadow-2xl animate-fade-in">
        <div className="text-center">
          <Logo className="mx-auto mb-3" size={48} />
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
            Onbora Command Center
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
            Plateforme de Pilotage Grands Comptes (KAM) & Supervision B2B
          </p>
        </div>

        {/* 1-CLICK DEMO ACCESS BUTTONS (Fastest Way to Test) */}
        <div className="p-4 bg-zinc-50 dark:bg-black/30 rounded-2xl border border-black/5 dark:border-white/5 space-y-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block text-center">
            🚀 Accès Démo Immédiat en 1 Clic
          </span>

          <button
            type="button"
            onClick={() => handleDirectDemoLogin('KAM')}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl font-bold text-xs flex items-center justify-between shadow-md transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Icons.Briefcase size={16} />
              <span>Espace KAM Desk (Salem — Grands Comptes)</span>
            </div>
            <Icons.ChevronRight size={15} />
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDirectDemoLogin('ADMIN')}
              className="py-2.5 px-3 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 active:scale-98 text-zinc-900 dark:text-white rounded-xl font-bold text-[11px] flex items-center justify-between transition-all"
            >
              <span>Portail Superviseur</span>
              <Icons.ChevronRight size={13} />
            </button>

            <button
              type="button"
              onClick={() => handleDirectDemoLogin('CLIENT_B2B')}
              className="py-2.5 px-3 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 active:scale-98 text-zinc-900 dark:text-white rounded-xl font-bold text-[11px] flex items-center justify-between transition-all"
            >
              <span>Espace Client B2B</span>
              <Icons.ChevronRight size={13} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
          <span className="text-[10px] font-bold text-zinc-400 uppercase">Ou Connexion Classique</span>
          <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs font-semibold text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Identifiant / Login
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="kam_salem"
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold focus:outline-none focus:border-blue-600 transition-all text-zinc-950 dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold focus:outline-none focus:border-blue-600 transition-all text-zinc-950 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 mt-1 bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 dark:text-black text-white rounded-xl font-black text-xs transition-all disabled:opacity-55 flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            {submitting ? 'Connexion en cours...' : 'Se Connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
