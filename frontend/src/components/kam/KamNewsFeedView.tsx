"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/shared/Icons';
import { fetchAPI } from '@/lib/api';
import { B2BNewsItem } from './kamTypes';
import { useKamContext } from './KamContext';

type FeedTypeFilter = 'ALL' | 'PORTFOLIO' | 'WEB_DISCOVERY' | 'SAVED';

export default function KamNewsFeedView() {
  const router = useRouter();
  const { searchQuery, visits } = useKamContext();

  const [feedItems, setFeedItems] = useState<B2BNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [feedType, setFeedType] = useState<FeedTypeFilter>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [counters, setCounters] = useState({
    all: 0,
    portfolio: 0,
    web_discovery: 0,
    unread: 0,
    saved: 0,
  });

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/kam/feed/?';
      if (feedType === 'PORTFOLIO') url += 'type=PORTFOLIO&';
      else if (feedType === 'WEB_DISCOVERY') url += 'type=WEB_DISCOVERY&';
      else if (feedType === 'SAVED') url += 'saved=true&';

      if (selectedCategory !== 'ALL') {
        url += `category=${encodeURIComponent(selectedCategory)}&`;
      }
      if (searchQuery) {
        url += `search=${encodeURIComponent(searchQuery)}&`;
      }

      const res = await fetchAPI(url);
      if (res && Array.isArray(res.results)) {
        setFeedItems(res.results);
        if (res.counters) {
          setCounters(res.counters);
        }
      } else {
        setFeedItems([]);
      }
    } catch (err: any) {
      console.error("Erreur chargement fil d'actualité:", err);
      setError(err?.message || "Impossible de charger le fil d'actualité.");
    } finally {
      setLoading(false);
    }
  }, [feedType, selectedCategory, searchQuery]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleRefreshFeed = async () => {
    setRefreshing(true);
    try {
      await fetchAPI('/api/kam/feed/refresh/', { method: 'POST' });
      await loadFeed();
      setSuccessToast("Veille web et signaux B2B actualisés avec succès.");
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error("Erreur rafraîchissement veille:", err);
      setError("Échec de l'actualisation de la veille.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleRead = async (item: B2BNewsItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetchAPI(`/api/kam/feed/${item.id}/read/`, {
        method: 'POST',
        body: JSON.stringify({ is_read: !item.is_read }),
      });
      if (res && res.id) {
        setFeedItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, is_read: res.is_read } : it)));
        setCounters((prev) => ({
          ...prev,
          unread: res.is_read ? Math.max(0, prev.unread - 1) : prev.unread + 1,
        }));
      }
    } catch (err) {
      console.error("Erreur toggle read:", err);
    }
  };

  const handleToggleSave = async (item: B2BNewsItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetchAPI(`/api/kam/feed/${item.id}/save/`, {
        method: 'POST',
      });
      if (res && res.id) {
        setFeedItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, is_saved: res.is_saved } : it)));
        setCounters((prev) => ({
          ...prev,
          saved: res.is_saved ? prev.saved + 1 : Math.max(0, prev.saved - 1),
        }));
      }
    } catch (err) {
      console.error("Erreur toggle save:", err);
    }
  };

  const handleConvertToPortfolio = async (item: B2BNewsItem) => {
    setConvertingId(item.id);
    try {
      const res = await fetchAPI(`/api/kam/feed/${item.id}/convert/`, {
        method: 'POST',
      });
      if (res && res.enterprise_id) {
        setFeedItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  is_converted_to_portfolio: true,
                  enterprise: res.enterprise_id,
                  enterprise_name: res.enterprise_name,
                }
              : it
          )
        );
        setSuccessToast(res.message || "Compte ajouté avec succès à votre portefeuille.");
        setTimeout(() => setSuccessToast(null), 5000);
      }
    } catch (err: any) {
      console.error("Erreur conversion en portefeuille:", err);
      alert(err?.message || "Impossible d'ajouter le compte au portefeuille.");
    } finally {
      setConvertingId(null);
    }
  };

  const handleOpenAccountOrBriefing = (item: B2BNewsItem) => {
    if (item.enterprise) {
      // Rechercher la visite ou compte dans le contexte
      const match = visits.find((v) => String(v.account_id) === String(item.enterprise));
      if (match) {
        router.push(`/kam/briefing?id=${encodeURIComponent(match.id)}`);
      } else {
        router.push(`/kam/accounts`);
      }
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return "À l'instant";
      if (diffHours === 1) return "Il y a 1h";
      if (diffHours < 24) return `Il y a ${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "Hier";
      return `Il y a ${diffDays}j`;
    } catch {
      return "Récemment";
    }
  };

  const categories = [
    { id: 'ALL', label: 'Toutes les catégories' },
    { id: 'EXPANSION', label: 'Croissance & Agences' },
    { id: 'MANAGEMENT', label: 'Gouvernance & DSI' },
    { id: 'TECH_PROJECT', label: 'Projets Tech' },
    { id: 'INCIDENT', label: 'Incidents Fournisseurs' },
    { id: 'FINANCE', label: 'Financement & M&A' },
    { id: 'NEW_ACCOUNT', label: 'Nouveaux Comptes' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-6 md:px-10 py-6 space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-3.5 bg-[#4F6CE8] text-white rounded-2xl flex items-center justify-between text-xs font-semibold shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <Icons.CheckCircle size={18} />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          >
            <Icons.X size={14} />
          </button>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-1.5 rounded-xl bg-[#4F6CE8]/10 text-[#4F6CE8] flex items-center justify-center">
              <Icons.Rss size={18} />
            </span>
            <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              Fil d&apos;actualité B2B & Veille Web
            </h2>
          </div>
          <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
            Surveillance continue de vos comptes stratégiques et détection en temps réel de nouvelles opportunités sur le net.
          </p>
        </div>

        {/* Action Button: Refresh Web Feed */}
        <button
          onClick={handleRefreshFeed}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D57C5] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
        >
          <Icons.RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Scan du net en cours...' : 'Actualiser la veille web'}</span>
        </button>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total des signaux</span>
          <div className="text-2xl font-black text-zinc-900 dark:text-white">{counters.all}</div>
          <p className="text-[11px] text-zinc-500">Flux d&apos;intelligence B2B Onbora</p>
        </div>

        <div className="p-4 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F6CE8]">Comptes Portefeuille</span>
          <div className="text-2xl font-black text-zinc-900 dark:text-white">{counters.portfolio}</div>
          <p className="text-[11px] text-zinc-500">Actualités sur vos clients actifs</p>
        </div>

        <div className="p-4 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-900 dark:text-white">Nouveaux Comptes du Net</span>
          <div className="text-2xl font-black text-zinc-900 dark:text-white">{counters.web_discovery}</div>
          <p className="text-[11px] text-zinc-500">Sociétés repérées sur le web</p>
        </div>

        <div className="p-4 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Non Lus / À traiter</span>
          <div className="text-2xl font-black text-zinc-900 dark:text-white">{counters.unread}</div>
          <p className="text-[11px] text-zinc-500">{counters.saved} signaux favoris sauvegardés</p>
        </div>
      </div>

      {/* Tabs & Filters Navigation */}
      <div className="flex flex-col gap-3">
        {/* Main Feed Type Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#E4E1DB] dark:bg-[#363336] rounded-2xl w-fit">
          <button
            onClick={() => setFeedType('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              feedType === 'ALL'
                ? 'bg-white dark:bg-[#242124] text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Tous les signaux ({counters.all})
          </button>

          <button
            onClick={() => setFeedType('PORTFOLIO')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              feedType === 'PORTFOLIO'
                ? 'bg-white dark:bg-[#242124] text-[#4F6CE8] shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Icons.Building size={14} />
            <span>Mon Portefeuille B2B ({counters.portfolio})</span>
          </button>

          <button
            onClick={() => setFeedType('WEB_DISCOVERY')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              feedType === 'WEB_DISCOVERY'
                ? 'bg-white dark:bg-[#242124] text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Icons.Globe size={14} />
            <span>Nouveaux Comptes du Net ({counters.web_discovery})</span>
          </button>

          <button
            onClick={() => setFeedType('SAVED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              feedType === 'SAVED'
                ? 'bg-white dark:bg-[#242124] text-[#4F6CE8] shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Icons.Star size={14} />
            <span>Favoris ({counters.saved})</span>
          </button>
        </div>

        {/* Secondary Category Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#4F6CE8] text-white shadow-xs'
                    : 'bg-[#F6F5F2] dark:bg-[#2D2A2D] text-zinc-600 dark:text-zinc-400 hover:bg-[#E4E1DB] dark:hover:bg-[#363336]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed List Content */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
          <Icons.Sparkles size={28} className="animate-spin text-[#4F6CE8]" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Recherche et analyse des flux B2B en cours...
          </span>
        </div>
      ) : error ? (
        <div className="p-8 max-w-md mx-auto text-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 space-y-3">
          <Icons.AlertTriangle size={32} className="text-zinc-500 mx-auto" />
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Erreur de chargement</h4>
          <p className="text-xs text-zinc-500">{error}</p>
          <button
            onClick={loadFeed}
            className="px-4 py-2 bg-[#4F6CE8] text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      ) : feedItems.length === 0 ? (
        <div className="p-12 text-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 space-y-3 max-w-lg mx-auto">
          <Icons.Globe size={36} className="text-zinc-400 mx-auto" />
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Aucun signal trouvé</h4>
          <p className="text-xs text-zinc-500">
            Aucun résultat ne correspond à vos filtres actuels. Lancez un scan de la veille pour explorer le net.
          </p>
          <button
            onClick={handleRefreshFeed}
            className="px-4 py-2 bg-[#4F6CE8] text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Lancer un scan du net
          </button>
        </div>
      ) : (
        <div className="space-y-4 pb-8">
          {feedItems.map((item) => {
            const isWeb = item.is_web_discovery;
            const companyDisplayName = isWeb
              ? item.discovered_company_name
              : item.enterprise_name || 'Compte B2B';

            return (
              <div
                key={item.id}
                className={`p-5 md:p-6 rounded-3xl transition-all duration-200 border ${
                  !item.is_read
                    ? 'bg-[#F6F5F2] dark:bg-[#2D2A2D] border-black/10 dark:border-white/10 shadow-sm'
                    : 'bg-[#F6F5F2]/60 dark:bg-[#2D2A2D]/60 border-black/5 dark:border-white/5 opacity-90'
                }`}
              >
                {/* Card Header Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Badge Web Discovery vs Portfolio */}
                    {isWeb ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-black/5 dark:bg-white/10 text-zinc-800 dark:text-zinc-200">
                        <Icons.Globe size={13} />
                        <span>Nouveau Compte Découvert sur le Net</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#4F6CE8]/10 text-[#4F6CE8]">
                        <Icons.Building size={13} />
                        <span>Compte en Portefeuille</span>
                      </span>
                    )}

                    {/* Source Name */}
                    <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
                      {item.source_name}
                    </span>

                    {/* Category */}
                    <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                      • {item.category_display}
                    </span>

                    {/* Relative Time */}
                    <span className="text-[11px] text-zinc-400">
                      • {formatRelativeTime(item.published_at)}
                    </span>
                  </div>

                  {/* Top Right Quick Actions: Save / Star & Read Toggle */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleToggleSave(item, e)}
                      title={item.is_saved ? "Retirer des favoris" : "Sauvegarder en favori"}
                      className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                        item.is_saved
                          ? 'bg-[#4F6CE8]/10 text-[#4F6CE8]'
                          : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <Icons.Star size={15} />
                    </button>

                    <button
                      onClick={(e) => handleToggleRead(item, e)}
                      title={item.is_read ? "Marquer comme non lu" : "Marquer comme lu"}
                      className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                        item.is_read
                          ? 'text-zinc-400 hover:text-zinc-700 dark:hover:text-white'
                          : 'bg-[#4F6CE8]/10 text-[#4F6CE8]'
                      }`}
                    >
                      <Icons.CheckCircle size={15} />
                    </button>
                  </div>
                </div>

                {/* Company Name & News Title */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-900 dark:text-white">
                      {companyDisplayName}
                    </span>
                    {item.priority === 'HIGH' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                        Action prioritaire sous 24h
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm md:text-base font-extrabold text-zinc-900 dark:text-white leading-snug">
                    {item.title}
                  </h3>
                </div>

                {/* Summary Text */}
                <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4">
                  {item.summary}
                </p>

                {/* Web Discovery Details Strip (if discovered account) */}
                {isWeb && (
                  <div className="p-3 bg-[#E4E1DB]/60 dark:bg-[#363336]/60 rounded-2xl flex flex-wrap items-center gap-4 text-xs text-zinc-600 dark:text-zinc-300 mb-4">
                    {item.discovered_sector && (
                      <div className="flex items-center gap-1.5">
                        <Icons.Briefcase size={14} className="text-zinc-400" />
                        <span>{item.discovered_sector}</span>
                      </div>
                    )}
                    {item.discovered_location && (
                      <div className="flex items-center gap-1.5">
                        <Icons.MapPin size={14} className="text-zinc-400" />
                        <span>{item.discovered_location}</span>
                      </div>
                    )}
                    {item.discovered_size && (
                      <div className="flex items-center gap-1.5">
                        <Icons.Users size={14} className="text-zinc-400" />
                        <span>{item.discovered_size}</span>
                      </div>
                    )}
                    {item.discovered_website && (
                      <a
                        href={item.discovered_website}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[#4F6CE8] hover:underline"
                      >
                        <Icons.ExternalLink size={13} />
                        <span>{item.discovered_website.replace('https://', '')}</span>
                      </a>
                    )}
                  </div>
                )}

                {/* AI Opportunity & Commercial Angle Callout */}
                <div className="p-4 bg-white/70 dark:bg-[#1E1B1E]/70 rounded-2xl border border-black/5 dark:border-white/5 space-y-2 mb-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-[#4F6CE8]">
                      <Icons.Sparkles size={15} />
                      <span>Angle Commercial IA & Déclencheur</span>
                    </div>

                    {item.recommended_offer && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4F6CE8]/10 text-[#4F6CE8]">
                        <Icons.Zap size={12} />
                        <span>{item.recommended_offer}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                    {item.commercial_angle}
                  </p>

                  {item.recommended_action && (
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-black/5 dark:border-white/5 flex items-center gap-1.5">
                      <span className="font-bold text-zinc-900 dark:text-white">Action suggérée :</span>
                      <span>{item.recommended_action}</span>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {isWeb ? (
                      item.is_converted_to_portfolio ? (
                        <button
                          onClick={() => handleOpenAccountOrBriefing(item)}
                          className="px-3.5 py-2 rounded-xl bg-[#4F6CE8]/10 text-[#4F6CE8] hover:bg-[#4F6CE8]/15 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Icons.Check size={14} />
                          <span>En portefeuille (Consulter le compte)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConvertToPortfolio(item)}
                          disabled={convertingId === item.id}
                          className="px-4 py-2 rounded-xl bg-[#4F6CE8] hover:bg-[#3D57C5] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <Icons.Plus size={14} />
                          <span>
                            {convertingId === item.id ? 'Ajout en cours...' : 'Ajouter à mon portefeuille B2B'}
                          </span>
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handleOpenAccountOrBriefing(item)}
                        className="px-4 py-2 rounded-xl bg-[#4F6CE8] hover:bg-[#3D57C5] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Icons.FileText size={14} />
                        <span>Ouvrir le briefing du compte</span>
                      </button>
                    )}

                    {/* Planifier un échange / rendez-vous */}
                    <Link
                      href="/kam/agenda"
                      className="px-3.5 py-2 rounded-xl bg-[#E4E1DB] dark:bg-[#363336] text-zinc-800 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Icons.Calendar size={14} />
                      <span>Planifier un rendez-vous</span>
                    </Link>
                  </div>

                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-zinc-400 hover:text-[#4F6CE8] inline-flex items-center gap-1 transition-colors"
                    >
                      <span>Consulter la source</span>
                      <Icons.ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
