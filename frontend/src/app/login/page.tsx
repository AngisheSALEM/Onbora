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
      // Redirect to their default page if already logged in
      switch (user.role) {
        case 'CLIENT_B2B': router.push('/client'); break;
        case 'SALESPERSON': router.push('/sales'); break;
        case 'KAM': router.push('/kam'); break;
        case 'ADMIN': router.push('/admin'); break;
        default: router.push('/');
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

  const handleDemoClick = (demoUser: string, demoPass: string) => {
    setUsername(demoUser);
    setPassword(demoPass);
    setError('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md glass-card rounded-2xl p-8 flex flex-col gap-6 animate-fade-in">
        <div className="text-center">
          <Logo className="mx-auto mb-4 shadow-sm shadow-orange-500/20" size={40} />
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Connexion à <span className="text-orange-500">Onbora</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
            Accédez à votre espace Onbora commercial
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-950/20 border border-red-900/50 rounded-xl text-xs font-medium text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Nom d'utilisateur
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: client ou sales"
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-sm focus:outline-none focus:border-orange-500 transition-all text-zinc-900 dark:text-zinc-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
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
            {submitting ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div className="border-t border-zinc-200 dark:border-zinc-800/80 pt-5">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              ⚡ Connexion Rapide (Comptes de Démo)
            </label>
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                const [demoUser, demoPass] = val.split(':');
                setUsername(demoUser);
                setPassword(demoPass);
                setError('');
              }}
              defaultValue=""
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 transition-all cursor-pointer shadow-sm"
            >
              <option value="" disabled className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-250">-- Choisir un compte de démonstration --</option>
              <optgroup label="Prospecteurs / Commerciaux (Sales)" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                <option value="sales1:sales1pass" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">sales1 - Alice Martin (SNCF Connect)</option>
                <option value="sales2:sales2pass" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">sales2 - Robert Durand</option>
                <option value="sales3:sales3pass" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">sales3 - Clara Dubois</option>
              </optgroup>
              <optgroup label="Key Account Managers (KAM)" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                <option value="kam1:kam1pass" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">kam1 - Pierre Richard</option>
                <option value="kam2:kam2pass" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">kam2 - Chloé Mercier</option>
                <option value="kam3:kam3pass" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">kam3 - Thomas Legrand</option>
              </optgroup>

              <optgroup label="Administrateur MSP" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                <option value="admin:adminpass" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">admin - Sophie Bernard</option>
              </optgroup>
              <optgroup label="Clients B2B (Startups & ETI)" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                <option value="client_sncf:client_sncfpass" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">client_sncf - SNCF Connect (Transport)</option>
                <option value="client_doctolib:client_doctolibpass" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">client_doctolib - Doctolib Pro (Santé)</option>
                <option value="client_decathlon:client_decathlonpass" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">client_decathlon - Decathlon Retail (Sport)</option>
                <option value="client_backmarket:client_backmarketpass" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">client_backmarket - BackMarket HQ (Tech)</option>
                <option value="client_alan:client_alanpass" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">client_alan - Alan Assurance (Fintech)</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
