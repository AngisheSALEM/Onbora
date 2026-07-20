"use client";

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/lib/api';
import Logo from '@/components/shared/Logo';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { Icons } from '@/components/shared/Icons';

interface Log {
  id: number;
  event_type: string;
  event_type_display: string;
  description: string;
  user: string;
  created_at: string;
  metadata: any;
}

interface Stats {
  total_dossiers: number;
  inbound_count: number;
  outbound_count: number;
  conversion_rate: number;
  status_counts: {
    NEW: number;
    IN_REVIEW: number;
    ACCEPTED: number;
    REJECTED: number;
  };
}

export default function AdminDashboard() {
  const { user, logout, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    async function loadAdminData() {
      try {
        const statsData = await fetchAPI('/api/reporting/demo-stats/');
        setStats(statsData);
        
        const logsData = await fetchAPI('/api/reporting/demo-logs/');
        setLogs(logsData);
      } catch (err) {
        console.error("Erreur de chargement des données d'administration:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const statsData = await fetchAPI('/api/reporting/demo-stats/');
      setStats(statsData);
      const logsData = await fetchAPI('/api/reporting/demo-logs/');
      setLogs(logsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterType === 'ALL') return true;
    return log.event_type === filterType;
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col font-sans text-black dark:text-zinc-50">
        
        {/* Header */}
        <header className="border-b border-zinc-200 dark:border-zinc-900 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-sm shrink-0 z-10">
          <div className="flex items-center gap-3">
            <Logo size={32} showBg={true} />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Onbora</h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Console Superviseur & Supervision Démo</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-xs font-bold text-zinc-300 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Icons.Refresh size={12} /> Rafraîchir
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Superviseur Orange</p>
            </div>
            <ThemeToggle />
            <button
              onClick={logout}
              className="px-3.5 py-1.5 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-transparent text-xs font-semibold text-zinc-700 hover:text-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-705 dark:text-zinc-300 dark:hover:text-zinc-100 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Icons.LogOut size={14} /> Déconnexion
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto flex flex-col gap-6">
            
            {/* Header info */}
            <div>
              <span className="px-2.5 py-0.5 w-fit bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-full text-[9px] font-bold tracking-wider uppercase shadow-sm shadow-orange-500/20">
                Supervision Technique
              </span>
              <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 mt-2 uppercase">Console d'Adoption MSP</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl font-medium">
                Suivez l'activité commerciale en temps réel, observez l'état du pipe de qualification et analysez l'adoption de la plateforme par les équipes commerciales terrain (Sales) et sédentaires (KAM).
              </p>
            </div>

            {loading && !stats ? (
              <div className="flex-1 flex items-center justify-center p-12">
                <div className="text-xs text-zinc-400 font-medium animate-pulse">Chargement des données de supervision...</div>
              </div>
            ) : (
              stats && (
                <div className="flex flex-col gap-6">
                  
                  {/* Stats cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="glass-card rounded-2xl p-5 shadow-sm flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Prospects Totaux</span>
                      <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{stats.total_dossiers}</span>
                      <p className="text-[9px] text-zinc-500 mt-2">Dossiers créés dans le pipe commercial</p>
                    </div>

                    <div className="glass-card rounded-2xl p-5 shadow-sm flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Qualifiés en Ligne (Inbound)</span>
                      <span className="text-3xl font-black text-orange-500">{stats.inbound_count}</span>
                      <p className="text-[9px] text-zinc-500 mt-2">Qualification conversationnelle autonome</p>
                    </div>

                    <div className="glass-card rounded-2xl p-5 shadow-sm flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Visites Terrain (Outbound)</span>
                      <span className="text-3xl font-black text-orange-400">{stats.outbound_count}</span>
                      <p className="text-[9px] text-zinc-500 mt-2">Qualifiés par les commerciaux via dictaphone</p>
                    </div>

                    <div className="glass-card rounded-2xl p-5 shadow-sm flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Taux de Conversion KAM</span>
                      <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{stats.conversion_rate}%</span>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1 rounded-full overflow-hidden mt-2">
                        <div className="orange-gradient-bg h-full" style={{ width: `${stats.conversion_rate}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Pipeline breakdown & Trend Chart */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Counts */}
                    <div className="glass-card rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Répartition du Pipeline KAM</h3>
                      <div className="grid grid-cols-3 gap-4 text-center my-auto text-zinc-900 dark:text-zinc-100">
                        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-850 rounded-xl">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">Nouveau</span>
                          <p className="text-lg font-black text-zinc-700 dark:text-zinc-300 mt-1">{stats.status_counts.NEW}</p>
                        </div>
                        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-850 rounded-xl">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">En revue</span>
                          <p className="text-lg font-black text-zinc-700 dark:text-zinc-300 mt-1">{stats.status_counts.IN_REVIEW}</p>
                        </div>
                        <div className="p-4 bg-zinc-950/20 border border-zinc-850 rounded-xl">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">Pris en charge</span>
                          <p className="text-lg font-black text-orange-500 mt-1">{stats.status_counts.ACCEPTED}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right: SVG Trend Line Chart */}
                    <div className="glass-card rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Courbe d'Adoption Hebdomadaire</h3>
                      <div className="relative h-32 w-full flex items-end">
                        {/* SVG line chart */}
                        <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                          {/* Grid lines */}
                          <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                          <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                          <line x1="0" y1="80" x2="300" y2="80" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                          
                          {/* Outbound Trend Line (Grey) */}
                          <path
                            d="M 0 90 Q 50 80, 100 65 T 200 45 T 300 25"
                            fill="none"
                            stroke="#71717a"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          
                          {/* Inbound Trend Line (Orange) */}
                          <path
                            d="M 0 95 Q 50 85, 100 70 T 200 35 T 300 15"
                            fill="none"
                            stroke="#f97316"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />

                          {/* Area under orange line */}
                          <path
                            d="M 0 95 Q 50 85, 100 70 T 200 35 T 300 15 L 300 100 L 0 100 Z"
                            fill="url(#gradient-orange)"
                            opacity="0.05"
                          />

                          <defs>
                            <linearGradient id="gradient-orange" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#f97316" />
                              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                        </svg>
                        
                        {/* X Axis Labels */}
                        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[8px] text-zinc-500 font-semibold px-1">
                          <span>Lun</span>
                          <span>Mar</span>
                          <span>Mer</span>
                          <span>Jeu</span>
                          <span>Ven</span>
                          <span>Sam</span>
                          <span>Dim</span>
                        </div>
                      </div>
                      
                      {/* Legend */}
                      <div className="flex gap-4 justify-center text-[9px] font-bold text-zinc-400">
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-0.5 bg-orange-500 inline-block" />
                          <span>Inbound (En Ligne)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-0.5 bg-zinc-600 inline-block" />
                          <span>Outbound (Terrain)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Logs section */}
                  <div className="glass-card rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Logs d'Activité Récents</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {['ALL', 'CONVERSATION_STARTED', 'QUALIFICATION_SUCCESS', 'DOSSIER_TRANSMITTED', 'REPORT_GENERATED', 'PDF_EXPORTED'].map(type => (
                          <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-2 py-1 rounded text-[9px] font-bold transition-all border cursor-pointer ${
                              filterType === type
                                ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 border-transparent'
                                : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950/40 dark:hover:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800'
                            }`}
                          >
                            {type === 'ALL' ? 'Tous' : type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold">
                          <th className="py-2.5">Date</th>
                          <th className="py-2.5">Type</th>
                          <th className="py-2.5">Description</th>
                          <th className="py-2.5">Auteur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-zinc-400">
                              Aucun log d'événement trouvé pour ce filtre.
                            </td>
                          </tr>
                        ) : (
                          filteredLogs.map(log => (
                            <tr key={log.id} className="border-b border-zinc-100 dark:border-zinc-800/55 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20">
                              <td className="py-3 text-zinc-500 whitespace-nowrap">{log.created_at}</td>
                              <td className="py-3 font-bold whitespace-nowrap">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase ${
                                  log.event_type === 'QUALIFICATION_SUCCESS' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                                  log.event_type === 'DOSSIER_TRANSMITTED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' :
                                  log.event_type === 'PDF_EXPORTED' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400' :
                                  'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                }`}>
                                  {log.event_type}
                                </span>
                              </td>
                              <td className="py-3 text-zinc-700 dark:text-zinc-300">{log.description}</td>
                              <td className="py-3 text-zinc-500">{log.user}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )
          )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
