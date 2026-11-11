"use client";



import React, { useState, useEffect, useCallback } from 'react';

import Link from 'next/link';

import { useRouter } from 'next/navigation';

import { Icons } from '@/components/shared/Icons';

import { SkeletonNewsLoader } from '@/components/shared/SkeletonLoader';

import { fetchAPI } from '@/lib/api';

import { B2BNewsItem } from './kamTypes';

import { useKamContext } from './KamContext';
import KamNewLeadCard, { KamNewLeadCardSkeleton } from './KamNewLeadCard';



type FeedScope = 'WEB_DISCOVERY' | 'PORTFOLIO';



const cleanHeadline = (text?: string) => (text || '').replace(/^\[.*?\]\s*/, '').trim();

export default function KamNewsFeedView({ scope = 'PORTFOLIO' }: { scope?: FeedScope }) {

  const router = useRouter();

  const {

    searchQuery,

    visits,

    loadAssignedAccounts,

    activeFilter,

    setActiveFilter,

    setFilterOptions,

    setFilterCategoryLabel,
    markAllNewsAsRead,
    loadNewsData,
  } = useKamContext();



  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [feedItems, setFeedItems] = useState<B2BNewsItem[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);



  const [savedOnly, setSavedOnly] = useState(false);
  const title = scope === 'WEB_DISCOVERY' ? 'Nouveaux leads' : 'Actualité portefeuille';

  const [convertingId, setConvertingId] = useState<string | null>(null);

  const [successToast, setSuccessToast] = useState<string | null>(null);





  // When KAM enters the feed, mark news as viewed after a short delay so the sidebar badge disappears
  useEffect(() => {
    const timer = setTimeout(() => {
      markAllNewsAsRead();
    }, 700);
    return () => clearTimeout(timer);
  }, [markAllNewsAsRead]);

  const handleSelectArticle = (item: B2BNewsItem) => {
    router.push(`/kam/feed/${item.is_web_discovery ? 'leads' : 'portfolio'}/${encodeURIComponent(item.id)}`);
    if (!item.is_read) {
      handleToggleRead(item);
    }
  };



  const [counters, setCounters] = useState({

    all: 0,

    portfolio: 0,

    web_discovery: 0,

    unread: 0,

    saved: 0,

    strong_signals: 0,

    weak_signals: 0,

  });



  // Signal filter is controlled via search bar filter dropdown in KamHeader

  const signalFilter = (activeFilter === 'STRONG' || activeFilter === 'WEAK') ? activeFilter : 'ALL';



  // Configure search bar filter options in KamContext

  useEffect(() => {

    setFilterCategoryLabel("FILTRER PAR INTENSITÉ DU SIGNAL");

    setFilterOptions([

      {

        id: 'ALL',

        label: 'Tous les signaux',

        count: counters.all,

        icon: <Icons.Layers size={13} className="text-zinc-400" />,

      },

      {

        id: 'STRONG',

        label: 'Signaux forts',

        count: counters.strong_signals,

        icon: <Icons.BicepsFlexed size={13} className="text-amber-500" />,

      },

      {

        id: 'WEAK',

        label: 'Signaux faibles',

        count: counters.weak_signals,

        icon: <Icons.SignalLow size={13} className="text-slate-400" />,

      },

    ]);



    return () => {

      setFilterOptions([]);

      setFilterCategoryLabel("FILTRER");

    };

  }, [counters.all, counters.strong_signals, counters.weak_signals, setFilterCategoryLabel, setFilterOptions]);



  const fetchFeedData = useCallback(async (signal?: AbortSignal) => {

    let url = `/api/kam/feed/?type=${scope}&`;
    if (savedOnly) url += 'saved=true&';

    if (signalFilter !== 'ALL') {

      url += `signal=${encodeURIComponent(signalFilter)}&`;

    }



    if (debouncedSearch) {

      url += `search=${encodeURIComponent(debouncedSearch)}&`;

    }



    return await fetchAPI(url, signal ? { signal } : {});

  }, [scope, savedOnly, signalFilter, debouncedSearch]);



  useEffect(() => {

    let ignore = false;
    const controller = new AbortController();

    fetchFeedData(controller.signal)

      .then((res) => {

        if (!ignore) {

          if (res && Array.isArray(res.results)) {

            setFeedItems(res.results);

            if (res.counters) setCounters(res.counters);

          } else {

            setFeedItems([]);

          }

          setLoading(false);

        }

      })

      .catch((err: unknown) => {

        if (!ignore) {

          const msg = err instanceof Error ? err.message : "Impossible de charger le fil d'actualité.";

          setError(msg);

          setLoading(false);

        }

      });



    return () => {

      ignore = true;
      controller.abort();

    };

  }, [fetchFeedData]);



  const loadFeed = async () => {

    setLoading(true);

    try {

      const res = await fetchFeedData();

      if (res && Array.isArray(res.results)) {

        setFeedItems(res.results);

        if (res.counters) setCounters(res.counters);

      } else {

        setFeedItems([]);

      }

    } catch (err: unknown) {

      const msg = err instanceof Error ? err.message : "Impossible de charger le fil d'actualité.";

      setError(msg);

    } finally {

      setLoading(false);

    }

  };



  const handleRefreshFeed = async () => {

    setRefreshing(true);

    try {

      await fetchAPI('/api/kam/feed/refresh/', { method: 'POST' });

      await loadFeed();
      await loadNewsData();

      setSuccessToast("Veille de marché et signaux analysés par Core AI.");

      setTimeout(() => setSuccessToast(null), 3500);

    } catch (err: unknown) {

      console.error("Erreur rafraîchissement veille:", err);

      setError("Échec de l'actualisation de la veille.");

    } finally {

      setRefreshing(false);

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



  const handleToggleSave = async (item: B2BNewsItem, e?: React.MouseEvent) => {

    if (e) e.stopPropagation();

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



  const handleConvertToPortfolio = async (item: B2BNewsItem, e?: React.MouseEvent) => {

    if (e) e.stopPropagation();

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



        setCounters((prev) => ({

          ...prev,

          portfolio: prev.portfolio + 1,

          web_discovery: Math.max(0, prev.web_discovery - 1),

        }));

        try {

          await loadAssignedAccounts();

        } catch (loadErr) {

          console.warn("Rechargement des comptes en arrière-plan :", loadErr);

        }

        setSuccessToast(

          res.message || "Entreprise ajoutée à votre portefeuille avec succès."

        );

        setTimeout(() => setSuccessToast(null), 6000);

      }

    } catch (err: unknown) {

      const msg = err instanceof Error ? err.message : "Impossible d'ajouter le lead au portefeuille.";

      console.error("Erreur conversion en portefeuille:", err);

      alert(msg);

    } finally {

      setConvertingId(null);

    }

  };



  const handleOpenAccountOrBriefing = (item: B2BNewsItem, e?: React.MouseEvent) => {

    if (e) e.stopPropagation();

    if (item.enterprise) {

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



  return (

    <div className="flex-1 flex flex-col h-full overflow-y-auto px-6 md:px-12 py-7 space-y-6 max-w-5xl mx-auto w-full select-none">

      {/* Toast Notification */}

      {successToast && (

        <div className="p-3.5 bg-[#4F6CE8] text-white rounded-2xl flex items-center justify-between text-xs font-semibold shadow-lg animate-in fade-in duration-200">

          <div className="flex items-center gap-2.5">

            <Icons.CheckCircle size={17} />

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



      {/* Editorial Header */}

      <div className="space-y-1">

        <h1 className="text-[34px] leading-[40px] font-black text-zinc-900 dark:text-white tracking-tight">

          {title}

        </h1>



      </div>



      {/* Clean Single Filter Bar: Source Segmented Control on Left + Actualiser on Right */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

        <div className="flex items-center gap-1 p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-xl w-fit" role="group" aria-label="Afficher les actualités">
          {[{ saved: false, label: 'Tous', icon: Icons.Layers }, { saved: true, label: 'Favoris', icon: Icons.Bookmark }].map(({ saved, label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => setSavedOnly(saved)}
              aria-pressed={savedOnly === saved}
              className={`px-3.5 py-2 rounded-lg text-[13px] leading-[21px] font-semibold transition-colors cursor-pointer flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-[#4F6CE8] ${savedOnly === saved ? 'bg-white dark:bg-[#2D2A2D] text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Action Button: Refresh */}

        <button

          onClick={handleRefreshFeed}

          disabled={refreshing}

          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#2D2A2D] text-zinc-700 dark:text-zinc-300 border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold transition-all hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer shadow-xs disabled:opacity-50 self-start sm:self-auto"

        >

          <Icons.RefreshCw size={13} className={refreshing ? 'animate-spin text-[#4F6CE8]' : 'text-zinc-400'} />

          <span>{refreshing ? 'Actualisation...' : 'Actualiser'}</span>

        </button>

      </div>



      {/* Active Signal Filter Indicator if set via Search Bar Filter */}

      {signalFilter !== 'ALL' && (

        <div className="flex items-center gap-2 animate-in fade-in duration-150">

          <span className="text-xs text-zinc-400 font-medium">Signal filtré :</span>

          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${

            signalFilter === 'STRONG'

              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25'

              : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'

          }`}>

            {signalFilter === 'STRONG' ? (

              <Icons.BicepsFlexed size={12} className="text-amber-600 dark:text-amber-400" />

            ) : (

              <Icons.SignalLow size={12} className="text-slate-500 dark:text-slate-400" />

            )}

            <span>{signalFilter === 'STRONG' ? 'Signaux forts' : 'Signaux faibles'}</span>

            <button

              onClick={() => setActiveFilter('ALL')}

              className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full cursor-pointer ml-1 transition-colors"

              title="Réinitialiser le filtre"

            >

              <Icons.X size={11} />

            </button>

          </span>

        </div>

      )}



      {/* Feed List Content */}

      {loading ? (

        scope === 'WEB_DISCOVERY' ? <KamNewLeadCardSkeleton /> : <SkeletonNewsLoader count={3} />

      ) : error ? (

        <div className="p-8 max-w-md mx-auto text-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 space-y-3">

          <Icons.AlertTriangle size={30} className="text-zinc-500 mx-auto" />

          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Actualités indisponibles</h3>

          <p className="text-xs text-zinc-500">{error}</p>

          <button

            onClick={loadFeed}

            className="px-4 py-2 bg-[#4F6CE8] text-white rounded-xl text-xs font-semibold cursor-pointer"

          >

            Réessayer

          </button>

        </div>

      ) : feedItems.length === 0 ? (

        <div className="p-14 text-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 space-y-3 max-w-md mx-auto">

          <Icons.Newspaper size={34} className="text-zinc-400 mx-auto" />

          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Aucun signal trouvé</h3>

          <p className="text-xs text-zinc-500">

            Aucun résultat ne correspond à votre filtre. Vous pouvez lancer une actualisation du flux.

          </p>

          <button

            onClick={handleRefreshFeed}

            className="px-4 py-2 bg-[#4F6CE8] text-white rounded-xl text-xs font-semibold cursor-pointer"

          >

            Actualiser

          </button>

        </div>

      ) : (

        <div className="space-y-3.5 pb-12">

          {feedItems.map((item) => {

            if (scope === 'WEB_DISCOVERY') {
              return (
                <KamNewLeadCard
                  key={item.id}
                  item={item}
                  publishedLabel={formatRelativeTime(item.published_at)}
                  converting={convertingId === item.id}
                  onOpen={() => handleSelectArticle(item)}
                  onSave={(event) => handleToggleSave(item, event)}
                  onConvert={(event) => handleConvertToPortfolio(item, event)}
                />
              );
            }

            const isLead = item.is_web_discovery;

            const companyName = isLead

              ? item.discovered_company_name

              : item.enterprise_name || 'Compte B2B';

            const rawLocation = isLead ? item.discovered_location : item.enterprise_location;

            const city = rawLocation ? rawLocation.split(',')[0].trim() : null;

            const isStrong = item.signal_strength === 'STRONG';



            return (

              <article

                key={item.id}

                onClick={() => handleSelectArticle(item)}

                className={`p-5 md:p-6 rounded-[24px] border border-black/5 dark:border-white/5 bg-[#F6F5F2] dark:bg-[#2D2A2D] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors duration-200 cursor-pointer group space-y-3 ${

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



                  {/* Right: Badges d'icônes (Lead/Portefeuille, Signal fort/faible) & Bookmark */}

                  <div className="flex items-center gap-2 shrink-0">

                    {/* Source Badge: Icon-only for Lead vs Portefeuille */}

                    {isLead ? (

                      <span

                        className="inline-flex items-center justify-center p-1.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"

                        title="Nouveau lead"

                      >

                        <Icons.UserPlus size={12} />

                      </span>

                    ) : (

                      <span

                        className="inline-flex items-center justify-center p-1.5 rounded-full bg-[#4F6CE8]/15 text-[#4F6CE8] border border-[#4F6CE8]/25"

                        title="Compte en portefeuille"

                      >

                        <Icons.Briefcase size={12} />

                      </span>

                    )}



                    {/* Colored Signal Badge: Icon-only for Signal Fort (Biceps) vs Signal Faible (SignalLow) */}

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



                {/* Concise Summary (2 lines max) */}

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

                  <div className="flex items-center gap-3">

                    {isLead ? (

                      item.is_converted_to_portfolio ? (

                        <div className="flex flex-wrap items-center gap-2">

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">

                            <Icons.Check size={12} />

                            <span>Portefeuille</span>

                          </span>

                          <Link

                            href={`/kam/briefing?id=account-${item.enterprise || item.id}&tab=compare`}

                            onClick={(e) => e.stopPropagation()}

                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4F6CE8] text-white hover:bg-[#3D56C7] text-xs font-semibold transition-all shadow-xs cursor-pointer"

                            title="Comparer l'entreprise en fonction de son secteur d'activité"

                          >

                            <Icons.Layers size={12} />

                            <span>Comparer</span>

                          </Link>

                        </div>

                      ) : (

                        <button

                          type="button"

                          onClick={(e) => handleConvertToPortfolio(item, e)}

                          disabled={convertingId === item.id}

                          title="Ajouter au portefeuille"

                          aria-label="Ajouter au portefeuille"

                          className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 inline-flex items-center justify-center cursor-pointer transition-colors disabled:opacity-70 shadow-xs"

                        >

                          {convertingId === item.id ? (

                            <Icons.RefreshCw size={14} className="animate-spin text-[#4F6CE8]" />

                          ) : (

                            <Icons.UserPlus size={14} />

                          )}

                        </button>

                      )

                    ) : (

                      <div className="flex items-center gap-2">

                        <button

                          type="button"

                          onClick={(e) => handleOpenAccountOrBriefing(item, e)}

                          className="inline-flex items-center gap-1 text-xs font-bold text-[#4F6CE8] hover:underline cursor-pointer"

                        >

                          <span>Consulter le compte</span>

                          <Icons.ArrowRight size={13} />

                        </button>

                        {item.enterprise && (

                          <Link

                            href={`/kam/briefing?id=account-${item.enterprise}&tab=compare`}

                            onClick={(e) => e.stopPropagation()}

                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-[#4F6CE8] hover:text-white text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"

                          >

                            <span>Comparer</span>

                          </Link>

                        )}

                      </div>

                    )}



                    <span className="text-xs text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 font-medium inline-flex items-center gap-1">

                      <span>Action commerciale</span>

                      <Icons.ChevronRight size={12} />

                    </span>

                  </div>



                  {item.source_url && (

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

                  )}

                </div>

              </article>

            );

          })}

        </div>

      )}



    </div>

  );

}
