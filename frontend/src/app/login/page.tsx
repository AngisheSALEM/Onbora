"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Logo from '@/components/shared/Logo';
import ThemeToggle from '@/components/shared/ThemeToggle';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      // Redirect to admin / supervisor console
      if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
        router.push('/admin');
      } else if (user.role === 'KAM') {
        router.push('/kam');
      } else if (user.role === 'CLIENT_B2B') {
        router.push('/client');
      } else {
        router.push('/admin');
      }
    }
  }, [user, loading, router]);

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
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.non_field_errors?.[0] || 'Identifiants incorrects.');
      }

      const data = await res.json();
      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la connexion.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-zinc-950">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative bg-white dark:bg-zinc-950">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md glass-card rounded-2xl p-8 flex flex-col gap-6 animate-fade-in shadow-xl">
        <div className="text-center">
          <Logo className="mx-auto mb-4 shadow-sm shadow-orange-500/20" size={44} />
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            Portail Superviseur & Back-office
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 font-medium">
            Découpage territorial, affectation des commerciaux & supervision terrain
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-950/20 border border-red-900/50 rounded-xl text-xs font-medium text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Identifiant Superviseur / Admin
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: supervisor ou admin"
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-sm focus:outline-none focus:border-orange-500 transition-all text-zinc-900 dark:text-zinc-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-sm focus:outline-none focus:border-orange-500 transition-all text-zinc-900 dark:text-zinc-50"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 mt-2 orange-gradient-bg hover:opacity-90 active:scale-98 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-55 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-orange-500/10"
          >
            {submitting ? 'Connexion en cours...' : 'Accéder au Back-office'}
          </button>
        </form>
      </div>
    </div>
  );
}
