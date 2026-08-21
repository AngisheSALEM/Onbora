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
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative bg-[#F8F9FA] dark:bg-[#141416]">
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md studio-card p-8 sm:p-10 flex flex-col gap-6 animate-fade-in shadow-xl">
        <div className="text-center">
          <Logo className="mx-auto mb-4" size={48} />
          <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
            Portail Superviseur
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 font-medium">
            Découpage territorial, affectation des commerciaux & supervision terrain
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs font-semibold text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-extrabold text-zinc-700 dark:text-zinc-300">
              Identifiant Superviseur / Admin
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: supervisor ou admin"
              className="px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:border-blue-600 transition-all text-zinc-950 dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-extrabold text-zinc-700 dark:text-zinc-300">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:border-blue-600 transition-all text-zinc-950 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 mt-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-2xl font-black text-sm transition-all disabled:opacity-55 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.25)]"
          >
            {submitting ? 'Connexion en cours...' : 'Accéder au Back-office'}
          </button>
        </form>
      </div>
    </div>
  );
}
