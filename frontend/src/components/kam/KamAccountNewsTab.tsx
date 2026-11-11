"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Icons } from '@/components/shared/Icons';
import { SkeletonNewsLoader } from '@/components/shared/SkeletonLoader';
import { fetchAPI } from '@/lib/api';
import { B2BNewsItem } from './kamTypes';

interface KamAccountNewsTabProps {
  accountId: string | number;
  accountName: string;
  sector?: string;
  onLaunchMeeting?: (accountId: string | number) => void;
  onNewsCountChange?: (count: number) => void;
}

type SignalStrengthFilter = 'ALL' | 'STRONG' | 'WEAK';

const cleanHeadline = (text?: string) => (text || '').replace(/^\[.*?\]\s*/, '').trim();

export default function KamAccountNewsTab({
  accountId,
  accountName,
  sector,
  onLaunchMeeting,
  onNewsCountChange,
}: KamAccountNewsTabProps) {
  const cleanId = String(accountId).replace('account-', '').trim();

  const [newsItems, setNewsItems] = useState<B2BNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signalFilter, setSignalFilter] = useState<SignalStrengthFilter>('ALL');

  // Selected article for Apple News style modal reader
  const [selectedNews, setSelectedNews] = useState<B2BNewsItem | null>(null);

  const fetchAccountNews = useCallback(async () => {
    if (!cleanId) return null;
    let url = `/api/kam/accounts/${cleanId}/news/`;
    if (signalFilter !== 'ALL') {
      url += `?signal=${encodeURIComponent(signalFilter)}`;
    }
    return await fetchAPI(url);
  }, [cleanId, signalFilter]);

  useEffect(() => {
    let ignore = false;
    fetchAccountNews()
      .then((res) => {
        if (!ignore) {
          setError(null);
          if (res && Array.isArray(res.results)) {
            setNewsItems(res.results);
            onNewsCountChange?.(res.counters?.all ?? res.results.length);
          } else {
            setNewsItems([]);
            onNewsCountChange?.(0);
          }
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Impossible de charger les actualités de l'entreprise.";
          console.error("Erreur chargement actualités compte:", err);
          setError(msg);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [fetchAccountNews, onNewsCountChange]);

  const loadAccountNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAccountNews();
      if (res && Array.isArray(res.results)) {
        setNewsItems(res.results);
        onNewsCountChange?.(res.counters?.all ?? res.results.length);
      } else {
        setNewsItems([]);
        onNewsCountChange?.(0);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible de charger les actualités de l'entreprise.";
      console.error("Erreur chargement actualités compte:", err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAPI('/api/kam/feed/refresh/', { method: 'POST' });
      await loadAccountNews();
    } catch (err) {
      console.error("Erreur rafraîchissement veille:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleSave = async (item: B2BNewsItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetchAPI(`/api/kam/feed/${item.id}/save/`, {
        method: 'POST',
      });
      if (res && res.id) {
        setNewsItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, is_saved: res.is_saved } : it))
        );
        if (selectedNews && selectedNews.id === item.id) {
          setSelectedNews((prev) => (prev ? { ...prev, is_saved: res.is_saved } : null));
        }
      }
    } catch (err) {
      console.error("Erreur toggle save:", err);
    }
  };

  const handleToggleRead = async (item: B2BNewsItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetchAPI(`/api/kam/feed/${item.id}/read/`, {
        method: 'POST',
        body: JSON.stringify({ is_read: !item.is_read }),
      });
      if (res && res.id) {
        setNewsItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, is_read: res.is_read } : it))
        );
        if (selectedNews && selectedNews.id === item.id) {
          setSelectedNews((prev) => (prev ? { ...prev, is_read: res.is_read } : null));
        }
      }
    } catch (err) {
      console.error("Erreur toggle read:", err);
    }
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return "Récemment";
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

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Sleek Header Bar with Signal Filters & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wide uppercase">
            Actualités & Signaux de veille
          </span>
          {newsItems.length > 0 && (
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {newsItems.length}
            </span>
          )}
        </div>

        {/* Filters and Refresh */}
        <div className="flex items-center gap-2">
          {/* Signal Filter Chips: Tous | Signaux forts | Signaux faibles */}
          <div className="flex items-center gap-1 p-0.5 bg-black/[0.04] dark:bg-white/[0.06] rounded-xl text-xs">
            <button
              onClick={() => setSignalFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                signalFilter === 'ALL'
                  ? 'bg-white dark:bg-[#2D2A2D] text-zinc-900 dark:text-white shadow-xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setSignalFilter('STRONG')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                signalFilter === 'STRONG'
                  ? 'bg-white dark:bg-[#2D2A2D] text-amber-700 dark:text-amber-300 shadow-xs font-bold'
                  : 'text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400'
              }`}
            >
              <Icons.BicepsFlexed size={12} className="text-amber-500" />
              <span>Signaux forts</span>
            </button>
            <button
              onClick={() => setSignalFilter('WEAK')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                signalFilter === 'WEAK'
                  ? 'bg-white dark:bg-[#2D2A2D] text-slate-700 dark:text-slate-200 shadow-xs font-bold'
                  : 'text-zinc-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Icons.SignalLow size={12} className="text-slate-400" />
              <span>Signaux faibles</span>
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#2D2A2D] text-zinc-700 dark:text-zinc-300 border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold transition-all hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer shadow-xs disabled:opacity-50"
            title="Actualiser la veille"
          >
            <Icons.RefreshCw size={12} className={refreshing ? 'animate-spin text-[#4F6CE8]' : 'text-zinc-400'} />
            <span className="hidden sm:inline">{refreshing ? 'Actualisation...' : 'Actualiser'}</span>
          </button>
        </div>
      </div>

      {/* Main Content: News Feed List Style */}
      {loading ? (
        <SkeletonNewsLoader count={2} />
      ) : error ? (
        <div className="p-8 text-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 space-y-3">
          <Icons.AlertTriangle size={30} className="text-zinc-500 mx-auto" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Actualités indisponibles</h3>
          <p className="text-xs text-zinc-500">{error}</p>
          <button
            onClick={loadAccountNews}
            className="px-4 py-2 bg-[#4F6CE8] text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      ) : newsItems.length === 0 ? (
        <div className="p-12 text-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 space-y-3">
          <Icons.Newspaper size={34} className="text-zinc-400 mx-auto" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Aucun signal trouvé</h3>
          <p className="text-xs text-zinc-500">Aucun signal ne correspond au filtre sélectionné.</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-[#4F6CE8] text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Lancer un scan
          </button>
        </div>
      ) : (
        <div className="space-y-3.5 pb-6">
          {newsItems.map((item) => {
            const companyName = item.enterprise_name || accountName || 'Compte B2B';
            const rawLocation = item.enterprise_location || sector;
            const city = rawLocation ? rawLocation.split(',')[0].trim() : null;
            const isStrong = item.signal_strength === 'STRONG';

            return (
              <article
                key={item.id}
                onClick={() => setSelectedNews(item)}
                className={`p-5 md:p-6 rounded-xl border border-black/5 dark:border-white/5 bg-[#F6F5F2] dark:bg-[#2D2A2D] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors duration-200 cursor-pointer group space-y-3 ${
                  item.is_read ? 'opacity-75 hover:opacity-100' : ''
                }`}
              >
                {/* Meta Header Line: Entreprise & Localisation à gauche / Badges d'état & Signaux à droite */}
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Titre de l'entreprise & localisation & temps relatif */}
                  <div className="flex items-center gap-2 text-xs min-w-0">
                    <span className="font-bold text-zinc-900 dark:text-white truncate max-w-[260px] md:max-w-md">
                      {companyName}
                    </span>
                    {city && (
                      <span className="text-zinc-400 font-normal truncate shrink-0">
                        ({city})
                      </span>
                    )}
                    <span className="text-zinc-300 dark:text-zinc-700">•</span>
                    <span className="text-zinc-400 font-normal shrink-0">
                      {formatRelativeTime(item.published_at)}
                    </span>
                  </div>

                  {/* Right: Badges d'icônes (Portefeuille, Signal fort/faible) & Bookmark */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Portefeuille badge */}
                    <span
                      className="inline-flex items-center justify-center p-1.5 rounded-full bg-[#4F6CE8]/15 text-[#4F6CE8] border border-[#4F6CE8]/25"
                      title="Compte en portefeuille"
                    >
                      <Icons.Briefcase size={12} />
                    </span>

                    {/* Signal Badge */}
                    {isStrong ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25"
                        title="Signal fort"
                      >
                        <Icons.BicepsFlexed size={12} className="text-amber-600 dark:text-amber-400" />
                        {typeof item.signal_score === 'number' && (
                          <span className="opacity-80 font-mono text-[10px]">
                            {item.signal_score}%
                          </span>
                        )}
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                        title="Signal faible"
                      >
                        <Icons.SignalLow size={12} className="text-slate-500 dark:text-slate-400" />
                        {typeof item.signal_score === 'number' && (
                          <span className="opacity-80 font-mono text-[10px]">
                            {item.signal_score}%
                          </span>
                        )}
                      </span>
                    )}

                    {/* Bookmark Toggle Icon */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleSave(item, e)}
                      title={item.is_saved ? "Retirer des favoris" : "Enregistrer en favori"}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors cursor-pointer ml-1"
                    >
                      <Icons.Bookmark size={18} className={item.is_saved ? 'fill-[#4F6CE8] text-[#4F6CE8]' : ''} />
                    </button>
                  </div>
                </div>

                {/* Editorial Headline */}
                <h2 className="text-base md:text-lg font-bold text-zinc-900 dark:text-white leading-snug group-hover:text-[#4F6CE8] transition-colors">
                  {cleanHeadline(item.title)}
                </h2>

                {/* Concise Summary */}
                <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
                  {item.summary}
                </p>

                {/* Core AI Opportunity Rationale line */}
                {item.signal_rationale && (
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium pt-0.5">
                    <span className="truncate">{item.signal_rationale}</span>
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    {onLaunchMeeting && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLaunchMeeting(cleanId);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#4F6CE8] text-white hover:bg-[#3D56C7] text-xs font-semibold transition-all shadow-xs cursor-pointer"
                        title="Lancer un rendez-vous préparé avec ce signal"
                      >
                        <Icons.Mic size={12} />
                        <span>Démarrer RDV</span>
                      </button>
                    )}

                    <Link
                      href={`/kam/briefing?id=account-${cleanId}&tab=compare`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-[#4F6CE8] hover:text-white text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
                      title="Comparer l'entreprise en fonction de son secteur d'activité"
                    >
                      <Icons.Layers size={12} />
                      <span>Comparer</span>
                    </Link>

                    <span className="text-xs text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 font-medium inline-flex items-center gap-1">
                      <span>Détails</span>
                      <Icons.ChevronRight size={12} />
                    </span>
                  </div>

                  {item.source_url ? (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 inline-flex items-center gap-1 transition-colors"
                    >
                      <span>Source</span>
                      <Icons.ExternalLink size={12} />
                    </a>
                  ) : item.source_name ? (
                    <span className="text-xs text-zinc-400 font-normal">
                      {item.source_name}
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Apple News Minimalist Article Reader Modal */}
      {selectedNews && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedNews(null)}
        >
          <div
            className="bg-white dark:bg-[#2A272A] w-full max-w-xl rounded-2xl p-7 md:p-9 space-y-6 shadow-2xl border border-black/5 dark:border-white/5 max-h-[88vh] overflow-y-auto select-text"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar: Badges + Source + Close */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#4F6CE8]/15 text-[#4F6CE8] border border-[#4F6CE8]/25"
                  title="Compte portefeuille"
                >
                  <Icons.Briefcase size={12} />
                  <span>Portefeuille</span>
                </span>

                {/* Signal Badge */}
                {selectedNews.signal_strength === 'STRONG' ? (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25"
                    title="Signal fort"
                  >
                    <Icons.BicepsFlexed size={13} className="text-amber-600 dark:text-amber-400" />
                    {typeof selectedNews.signal_score === 'number' && (
                      <span className="font-mono text-[10px]">
                        {selectedNews.signal_score}%
                      </span>
                    )}
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                    title="Signal faible"
                  >
                    <Icons.SignalLow size={13} className="text-slate-500 dark:text-slate-400" />
                    {typeof selectedNews.signal_score === 'number' && (
                      <span className="font-mono text-[10px]">
                        {selectedNews.signal_score}%
                      </span>
                    )}
                  </span>
                )}

                <span className="text-zinc-400">
                  {selectedNews.source_name} • {formatRelativeTime(selectedNews.published_at)}
                </span>
              </div>

              <button
                onClick={() => setSelectedNews(null)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Fermer"
              >
                <Icons.X size={17} />
              </button>
            </div>

            {/* Company Byline & Article Headline */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                {[
                  selectedNews.enterprise_name || accountName,
                  selectedNews.enterprise_location || sector,
                  selectedNews.enterprise_sector || sector,
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </div>
              <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white leading-snug tracking-tight">
                {cleanHeadline(selectedNews.title)}
              </h2>
            </div>

            {/* Core AI Opportunity Analysis Box */}
            <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-white">
                  <Icons.Cpu size={14} className="text-[#4F6CE8]" />
                  <span>Qualification Core AI</span>
                </div>
                {typeof selectedNews.signal_score === 'number' && (
                  <span className="font-mono text-[11px] font-bold text-zinc-600 dark:text-zinc-300">
                    Score opportunité : {selectedNews.signal_score}/100
                  </span>
                )}
              </div>

              {selectedNews.signal_rationale && (
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  <span className="font-semibold text-zinc-900 dark:text-white">Déclencheur : </span>
                  {selectedNews.signal_rationale}
                </p>
              )}

              {selectedNews.recommended_offer && (
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span className="text-zinc-400 font-medium">Offre cible recommandée :</span>
                  <span className="font-bold text-[#4F6CE8] bg-[#4F6CE8]/10 px-2.5 py-0.5 rounded-full">
                    {selectedNews.recommended_offer}
                  </span>
                </div>
              )}
            </div>

            {/* Article Summary */}
            <p className="text-sm md:text-[15px] text-zinc-700 dark:text-zinc-200 leading-relaxed font-normal">
              {selectedNews.summary}
            </p>

            {/* Commercial Angle & Recommendation */}
            {(selectedNews.commercial_angle || selectedNews.recommended_action) && (
              <div className="border-l-2 border-[#4F6CE8] pl-4 py-1 space-y-1.5">
                {selectedNews.commercial_angle && (
                  <p className="text-xs font-medium text-zinc-900 dark:text-white leading-relaxed">
                    <span className="font-bold text-[#4F6CE8]">Opportunité commerciale : </span>
                    {selectedNews.commercial_angle}
                  </p>
                )}
                {selectedNews.recommended_action && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">Action KAM : </span>
                    {selectedNews.recommended_action}
                  </p>
                )}
              </div>
            )}

            {/* Minimal Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                {onLaunchMeeting && (
                  <button
                    onClick={() => {
                      setSelectedNews(null);
                      onLaunchMeeting(cleanId);
                    }}
                    className="px-5 py-2.5 rounded-lg bg-[#4F6CE8] hover:bg-[#3D57C5] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
                  >
                    <Icons.Mic size={14} />
                    <span>Démarrer RDV</span>
                  </button>
                )}

                <Link
                  href={`/kam/briefing?id=account-${cleanId}&tab=compare`}
                  className="px-4 py-2.5 rounded-lg bg-[#F6F5F2] dark:bg-[#242124] text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Comparer dans son secteur
                </Link>

                <Link
                  href="/kam/agenda"
                  className="px-4 py-2.5 rounded-lg bg-[#F6F5F2] dark:bg-[#242124] text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Planifier un RDV
                </Link>
              </div>

              <div className="flex items-center gap-1.5">
                {selectedNews.source_url && (
                  <a
                    href={selectedNews.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    title="Source originale"
                  >
                    <Icons.ExternalLink size={16} />
                  </a>
                )}

                <button
                  onClick={(e) => handleToggleSave(selectedNews, e)}
                  className={`p-2 rounded-full cursor-pointer transition-colors ${
                    selectedNews.is_saved
                      ? 'bg-[#4F6CE8]/10 text-[#4F6CE8]'
                      : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  title={selectedNews.is_saved ? "Retirer des favoris" : "Enregistrer"}
                >
                  <Icons.Bookmark size={16} />
                </button>

                <button
                  onClick={(e) => handleToggleRead(selectedNews, e)}
                  className={`p-2 rounded-full cursor-pointer transition-colors ${
                    selectedNews.is_read
                      ? 'text-zinc-400 hover:text-zinc-700 dark:hover:text-white'
                      : 'bg-[#4F6CE8]/10 text-[#4F6CE8]'
                  }`}
                  title={selectedNews.is_read ? "Non lu" : "Marquer lu"}
                >
                  <Icons.Check size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
