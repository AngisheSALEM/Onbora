"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';

export default function KamSettingsView() {
  const { user, updateUser, logout } = useAuth();
  const [memojisCatalog, setMemojisCatalog] = useState<{ id: number; filename: string; gender?: string }[]>([]);
  const [memojiGenderFilter, setMemojiGenderFilter] = useState<'all' | 'homme' | 'femme'>('all');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarSuccessMsg, setAvatarSuccessMsg] = useState('');
  const [avatarErrorMsg, setAvatarErrorMsg] = useState('');
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Charger le catalogue des memojis
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      try {
        const data = await fetchAPI('/api/accounts/memojis/');
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setMemojisCatalog(data);
          return;
        }
      } catch (err) {
        console.warn("Memojis endpoint non disponible, chargement local:", err);
      }

      // Fallback local catalogue 104 memojis
      if (isMounted) {
        const fallback = Array.from({ length: 104 }, (_, i) => {
          const num = String(i + 1).padStart(3, '0');
          const isWoman = [1, 2, 4, 7, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84, 87, 90, 93, 96, 99, 102].includes(i + 1);
          return {
            id: i + 1,
            filename: `memoji_${num}.png`,
            gender: isWoman ? 'femme' : 'homme',
          };
        });
        setMemojisCatalog(fallback);
      }
    }
    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredMemojis = useMemo(() => {
    if (memojiGenderFilter === 'all') return memojisCatalog;
    return memojisCatalog.filter((m) => m.gender === memojiGenderFilter);
  }, [memojisCatalog, memojiGenderFilter]);

  const handleSelectAvatar = async (filename: string) => {
    setSavingAvatar(true);
    setAvatarSuccessMsg('');
    setAvatarErrorMsg('');
    try {
      await fetchAPI('/api/accounts/me/', {
        method: 'PATCH',
        body: JSON.stringify({ avatar: filename }),
      });
      updateUser({ avatar: filename });
      setAvatarSuccessMsg("Avatar Bitmoji 3D synchronisé avec succès.");
      setTimeout(() => setAvatarSuccessMsg(''), 2500);
    } catch (err: any) {
      console.error("Erreur lors de la sauvegarde de l'avatar:", err);
      setAvatarErrorMsg("Impossible de mettre à jour votre avatar.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const faqItems = [
    {
      question: "Quelles sont les règles de gouvernance du portefeuille KAM ?",
      answer: "Chaque Key Account Manager pilote un portefeuille restreint et qualifié de 15 à 30 comptes stratégiques (Grands Comptes et PME à fort potentiel). L'affectation est effectuée et orchestrée par le KAM Office. Le KAM est responsable du cycle complet : préparation 360°, audit MEDDIC, négociation d'offres sur-mesure et fidélisation."
    },
    {
      question: "Comment préparer un entretien décisionnel avec la méthode MEDDIC ?",
      answer: "Avant chaque rendez-vous, consultez la fiche Briefing 360°. Identifiez impérativement l'Economic Buyer (décideur budgétaire), le Tech Buyer (DSI) et les points de blocage concurrentiels. Utilisez les angles de questionnement IA proposés pour auditer l'inadéquation du lien actuel avant d'aborder le volet tarifaire."
    },
    {
      question: "Comment mettre à jour les contacts et décideurs découverts sur le terrain ?",
      answer: "Directement depuis la vue Briefing 360°, utilisez le bouton 'Modifier Fiche & Décideurs' situé en haut de la fiche ou dans la section Comité Décisionnel. Les modifications sont enregistrées en temps réel dans la base CRM et partagées avec la Direction KAM Office."
    },
    {
      question: "Quels sont les barèmes de remises et conditions commerciales autorisés ?",
      answer: "Pour les contrats pluriannuels de 36 mois, une remise standard de 15% sur les redevances mensuelles est pré-approuvée. Le raccordement optique dédié et la bascule secours 4G/Satellite sont inclus sur les packs Grands Comptes. Tout barème dérogatoire supérieur à 20% requiert une directive formelle du Super Admin."
    },
    {
      question: "Comment traiter et clôturer une directive assignée ?",
      answer: "Dans le menu 'Directives & Messages', accédez aux consignes reçues. Après avoir mené l'action requise auprès du compte ou de l'équipe technique, cliquez sur 'Prendre en charge / Répondre', détaillez votre compte-rendu dans le champ prévu et sélectionnez le statut 'Traité & Complété'."
    }
  ];

  return (
    <div className="flex-1 flex flex-col gap-6 p-8 overflow-y-auto select-none font-sans max-w-5xl">
      
      {/* Top Header */}
      <div className="pb-3 border-b border-black/5 dark:border-white/5">
        <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          Paramètres & Base de Connaissances
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Gestion de votre profil personnel, sélection d'avatar 3D et guides opérationnels KAM.
        </p>
      </div>

      {/* 1. Profil Utilisateur & Avatar Actuel */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-2xs">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-[#4F6CE8]/10 border-2 border-[#4F6CE8]/30 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
            <img
              src={`/memojis/${(user?.avatar || 'memoji_044.png').replace('assets/memojis/', '')}`}
              alt="Avatar KAM"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4F6CE8]/15 text-[#4F6CE8]">
                Key Account Manager
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Identifiant : <span className="font-mono font-semibold text-zinc-900 dark:text-white">@{user?.username}</span> • {user?.email || 'email non renseigné'}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Périmètre : Portefeuille Grands Comptes & PME Stratégiques (RDC)
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer shrink-0 border border-rose-500/20"
        >
          <Icons.LogOut size={16} />
          <span>Se déconnecter</span>
        </button>
      </div>

      {/* 2. Catalogue de Sélection du Bitmoji / Memoji 3D */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/5">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Personnaliser votre Avatar Memoji 3D
            </h3>
            <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
              Sélectionnez un style qui vous représente sur l'ensemble des écrans et directives.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 shrink-0">
            <button
              onClick={() => setMemojiGenderFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                memojiGenderFilter === 'all'
                  ? 'bg-[#4F6CE8] text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Tous ({memojisCatalog.length})
            </button>
            <button
              onClick={() => setMemojiGenderFilter('homme')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                memojiGenderFilter === 'homme'
                  ? 'bg-[#4F6CE8] text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Hommes ({memojisCatalog.filter(m => m.gender === 'homme').length})
            </button>
            <button
              onClick={() => setMemojiGenderFilter('femme')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                memojiGenderFilter === 'femme'
                  ? 'bg-[#4F6CE8] text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Femmes ({memojisCatalog.filter(m => m.gender === 'femme').length})
            </button>
          </div>
        </div>

        {avatarSuccessMsg && (
          <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Icons.CheckCircle size={15} />
            <span>{avatarSuccessMsg}</span>
          </div>
        )}

        {avatarErrorMsg && (
          <div className="p-3 rounded-2xl bg-red-500/15 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
            <Icons.AlertCircle size={15} />
            <span>{avatarErrorMsg}</span>
          </div>
        )}

        {/* Grille des Memojis */}
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2.5 max-h-64 overflow-y-auto p-1">
          {filteredMemojis.slice(0, 48).map((m) => {
            const isSelected = (user?.avatar || '').includes(m.filename);
            return (
              <button
                key={m.id}
                onClick={() => handleSelectAvatar(m.filename)}
                disabled={savingAvatar}
                className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all p-1 bg-white dark:bg-[#363336] cursor-pointer hover:scale-105 active:scale-95 ${
                  isSelected
                    ? 'border-[#4F6CE8] ring-2 ring-[#4F6CE8]/30 shadow-md'
                    : 'border-transparent hover:border-black/10 dark:hover:border-white/10'
                }`}
                title={`Sélectionner ${m.filename}`}
              >
                <img
                  src={`/memojis/${m.filename}`}
                  alt="Memoji option"
                  className="w-full h-full object-cover rounded-xl"
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Base de Connaissances & FAQ Opérationnelle */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-2 border-b border-black/5 dark:border-white/5">
          <Icons.HelpCircle size={18} className="text-[#4F6CE8]" />
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              FAQ Opérationnelle & Bonnes Pratiques KAM
            </h3>
            <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
              Consignes d'engagement client, gouvernance et processus de remontée.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {faqItems.map((item, idx) => {
            const isOpen = faqOpenIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-[#363336] rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setFaqOpenIndex(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 font-semibold text-xs text-zinc-900 dark:text-white cursor-pointer hover:bg-black/2 dark:hover:bg-white/2"
                >
                  <span>{item.question}</span>
                  <Icons.ChevronDown
                    size={16}
                    className={`text-zinc-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed pt-1 border-t border-black/5 dark:border-white/5">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Déconnexion Modale */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-2xl border border-black/10 dark:border-white/10 flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 mx-auto flex items-center justify-center">
              <Icons.LogOut size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Confirmer la déconnexion
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Êtes-vous sûr de vouloir fermer votre session KAM ? Vos données en cours de saisie non enregistrées seront perdues.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-[#363336] text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/5 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => logout()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-all shadow-sm"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
