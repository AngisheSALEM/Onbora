"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Logo from '@/components/shared/Logo';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { Icons } from '@/components/shared/Icons';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirection automatique selon le rôle de l'utilisateur authentifié
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'ADMIN') {
        router.push('/admin');
      } else if (user.role === 'SUPERVISOR') {
        router.push('/backoffice');
      } else if (user.role === 'KAM_MANAGER') {
        router.push('/kamoffice');
      } else if (user.role === 'KAM') {
        router.push('/kam');
      } else if (user.role === 'CLIENT_B2B') {
        router.push('/client');
      } else if (user.role === 'SALESPERSON') {
        router.push('/sales');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Veuillez renseigner votre identifiant et votre mot de passe.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${API_URL}/api/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.non_field_errors?.[0] || 'Identifiant ou mot de passe incorrect.';
        throw new Error(errorMessage);
      }

      const data = await res.json();
      if (!data.token || !data.user) {
        throw new Error('Réponse d\'authentification invalide.');
      }

      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Échec de connexion. Vérifiez vos identifiants.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F6F5F2] dark:bg-[#242124]">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-[#4F6CE8] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative bg-[#F6F5F2] dark:bg-[#242124] text-zinc-900 dark:text-white font-sans select-none transition-colors duration-300">
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-[#2F2C30] rounded-3xl p-8 sm:p-10 flex flex-col gap-6 shadow-2xl animate-fade-in border-0">
        <div className="text-center">
          <Logo className="mx-auto mb-3" size={48} />
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white uppercase">
            Onbora
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-normal">
            Portail d'Authentification Sécurisé
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
            <Icons.AlertTriangle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Identifiant / Nom d'utilisateur
            </label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex: admin, supervisor, kam_director..."
              className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-550 focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] transition-all text-zinc-950 dark:text-white border-0"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Mot de passe
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-550 focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] transition-all text-zinc-950 dark:text-white border-0"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 mt-2 bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white rounded-xl font-extrabold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#4F6CE8]/30 active:scale-98"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Vérification des droits...</span>
              </div>
            ) : (
              <span>Connexion Sécurisée</span>
            )}
          </button>
        </form>

        <div className="p-3 bg-black/5 dark:bg-white/5 rounded-2xl text-[11px] text-zinc-500 dark:text-zinc-400 text-center leading-relaxed">
          <p className="font-550 text-zinc-700 dark:text-zinc-300 mb-1">Politique de Cloisonnement des Rôles</p>
          Chaque compte accède strictement et exclusivement à son espace métier habilité (Cockpit Admin, Direction KAM, Back-Office Supervision ou Force Commerciale).
        </div>
      </div>
    </div>
  );
}
