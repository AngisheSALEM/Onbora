"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';
import UserAvatar, { ActivityStatus } from './UserAvatar';
import KamActivityStatusSelector, { ACTIVITY_STATUSES } from './KamActivityStatusSelector';
import ProfilePhotoUploader from '@/components/shared/ProfilePhotoUploader';
import ThemeSettingCard from '@/components/shared/ThemeSettingCard';

export default function KamSettingsView() {
  const { user, updateUser, logout } = useAuth();
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoSuccessMsg, setPhotoSuccessMsg] = useState('');
  const [photoErrorMsg, setPhotoErrorMsg] = useState('');
  const [activityStatus, setActivityStatus] = useState<ActivityStatus>('AVAILABLE');
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('onbora_kam_activity_status') as ActivityStatus | null;
      if (saved) setActivityStatus(saved);
    } catch {
      // ignore
    }

    if (user?.profile_picture_url || user?.avatar) {
      setPhotoUrlInput(user.profile_picture_url || user.avatar || '');
    }

    const handleStatusChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ status: ActivityStatus }>;
      if (customEvent.detail?.status) {
        setActivityStatus(customEvent.detail.status);
      }
    };

    window.addEventListener('kam:activity_status_changed', handleStatusChange);
    return () => {
      window.removeEventListener('kam:activity_status_changed', handleStatusChange);
    };
  }, [user]);

  const handleSavePhotoUrl = async (urlToSave: string) => {
    setSavingPhoto(true);
    setPhotoSuccessMsg('');
    setPhotoErrorMsg('');
    try {
      await fetchAPI('/api/accounts/me/', {
        method: 'PATCH',
        body: JSON.stringify({
          avatar: urlToSave,
          profile_picture_url: urlToSave,
        }),
      });
      updateUser({
        avatar: urlToSave,
        profile_picture_url: urlToSave,
      });
      setPhotoSuccessMsg("Photo de profil mise à jour avec succès.");
      setTimeout(() => setPhotoSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error("Erreur mise à jour photo:", err);
      setPhotoErrorMsg("Impossible d'enregistrer la photo de profil.");
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleResetToDefault = () => {
    setPhotoUrlInput('');
    handleSavePhotoUrl('/avatars/default_avatar.svg');
  };

  const faqItems = [
    {
      question: "Quelles sont les règles de gouvernance du portefeuille KAM ?",
      answer: "Chaque Key Account Manager pilote un portefeuille restreint et qualifié de 15 à 30 comptes stratégiques (Grands Comptes et PME à fort potentiel). L'affectation est effectuée et orchestrée par le KAM Office. Le KAM est responsable du cycle complet : préparation 360°, audit MEDDIC, négociation d'offres sur-mesure et fidélisation.",
    },
    {
      question: "Comment préparer un entretien décisionnel avec la méthode MEDDIC ?",
      answer: "Avant chaque rendez-vous, consultez la fiche Briefing 360°. Identifiez impérativement l'Economic Buyer (décideur budgétaire), le Tech Buyer (DSI) et les points de blocage concurrentiels. Utilisez les angles de questionnement IA proposés pour auditer l'inadéquation du lien actuel avant d'aborder le volet tarifaire.",
    },
    {
      question: "Comment mettre à jour les contacts et décideurs découverts sur le terrain ?",
      answer: "Directement depuis la vue Briefing 360°, utilisez le bouton 'Modifier Fiche & Décideurs' situé en haut de la fiche ou dans la section Comité Décisionnel. Les modifications sont enregistrées en temps réel dans la base CRM et partagées avec la Direction KAM Office.",
    },
    {
      question: "Quels sont les barèmes de remises et conditions commerciales autorisés ?",
      answer: "Pour les contrats pluriannuels de 36 mois, une remise standard de 15% sur les redevances mensuelles est pré-approuvée. Le raccordement optique dédié et la bascule secours 4G/Satellite sont inclus sur les packs Grands Comptes. Tout barème dérogatoire supérieur à 20% requiert une validation hiérarchique.",
    },
    {
      question: "Comment fonctionne le statut d'activité en temps réel ?",
      answer: "Votre statut d'activité informe en temps réel l'équipe KAM Office et vos pairs de votre disponibilité opérationnelle ('Disponible', 'En clientèle / RDV', 'En réunion', 'Indisponible'). Vous pouvez l'ajuster en un clic depuis l'en-tête ou cette page, avec mémorisation instantanée de votre choix.",
    },
  ];

  const currentStatusConfig = ACTIVITY_STATUSES.find((s) => s.key === activityStatus) || ACTIVITY_STATUSES[0];

  return (
    <div className="flex-1 flex flex-col gap-6 p-8 overflow-y-auto select-none font-sans max-w-5xl">
      
      {/* Top Header */}
      <div className="pb-3  ">
        <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          Paramètres & Base de Connaissances
        </h2>
    
      </div>

      {/* 1. Profil Utilisateur & Avatar Actuel */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-2xs">
        <div className="flex items-center gap-5">
          <UserAvatar
            src={user?.profile_picture_url || user?.avatar}
            name={user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
            size="xl"
            showStatusDot
            status={activityStatus}
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border-none">
                Key Account Manager
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border-none">
                {currentStatusConfig.label}
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
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer shrink-0 border-none self-start sm:self-auto shadow-none"
          title="Se déconnecter de votre session KAM"
        >
          <Icons.LogOut size={15} />
          <span>Se déconnecter</span>
        </button>
      </div>

      {/* 2. Photo de Profil & Avatar */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-4 shadow-2xs">
        <ProfilePhotoUploader
          currentPhotoUrl={user?.profile_picture_url || user?.avatar}
          name={user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
          title="Photo de Profil Professionnelle"
          description="Téléversez votre photo officielle pour le compte KAM (JPG, PNG ou WebP, max 5 Mo)."
          allowSelfUpdate={true}
          onPhotoUploaded={(newUrl) => {
            setPhotoUrlInput(newUrl);
            updateUser({
              avatar: newUrl,
              profile_picture_url: newUrl,
            });
          }}
          onPhotoRemoved={() => {
            handleResetToDefault();
          }}
        />
      </div>

      {/* 3. Préférences d'Affichage & Thème Visuel */}
      <ThemeSettingCard />

      {/* 4. Base de Connaissances & FAQ Opérationnelle */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-2 border-b border-black/5 dark:border-white/5">
          <Icons.HelpCircle size={18} className="text-zinc-600 dark:text-zinc-400" />
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              FAQ Opérationnelle & Bonnes Pratiques KAM
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Consignes d’engagement client, gouvernance et processus de remontée.
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
            <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 mx-auto flex items-center justify-center">
              <Icons.LogOut size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Confirmer la déconnexion
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Êtes-vous sûr de vouloir fermer votre session KAM ?
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
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold transition-colors cursor-pointer border-none shadow-none"
              >
                <Icons.LogOut size={14} />
                <span>Confirmer</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
