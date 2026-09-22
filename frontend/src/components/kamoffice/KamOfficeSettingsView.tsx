"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';
import UserAvatar from '@/components/kam/UserAvatar';
import ProfilePhotoUploader from '@/components/shared/ProfilePhotoUploader';
import ThemeSettingCard from '@/components/shared/ThemeSettingCard';
import { useKamOfficeContext } from './KamOfficeContext';

export default function KamOfficeSettingsView() {
  const { user, logout, updateUser } = useAuth();
  const { setHeaderTitle, setSearchPlaceholder } = useKamOfficeContext();

  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);
  const [profilePictureInput, setProfilePictureInput] = useState('');
  const [savingProfilePicture, setSavingProfilePicture] = useState(false);
  const [avatarSuccessMsg, setAvatarSuccessMsg] = useState('');
  const [avatarErrorMsg, setAvatarErrorMsg] = useState('');

  useEffect(() => {
    setHeaderTitle("Paramètres & Base de Connaissances");
    setSearchPlaceholder("");
  }, [setHeaderTitle, setSearchPlaceholder]);

  const handleSaveProfilePicture = async (url: string) => {
    setSavingProfilePicture(true);
    setAvatarErrorMsg('');
    setAvatarSuccessMsg('');
    try {
      await fetchAPI('/api/accounts/me/', {
        method: 'PATCH',
        body: JSON.stringify({ profile_picture_url: url.trim(), avatar: url.trim() }),
      });
      if (updateUser) {
        updateUser({ profile_picture_url: url.trim(), avatar: url.trim() } as any);
      }
      setAvatarSuccessMsg("Photo de profil mise à jour avec succès.");
      setTimeout(() => setAvatarSuccessMsg(''), 4000);
    } catch (err: any) {
      setAvatarErrorMsg(err.message || "Erreur lors de la mise à jour de la photo de profil.");
      setTimeout(() => setAvatarErrorMsg(''), 5000);
    } finally {
      setSavingProfilePicture(false);
    }
  };

  const faqItems = [
    {
      q: "Quelle est la règle de segmentation entre Grands Comptes et PME Stratégiques ?",
      a: "Un compte est classifié en Grand Compte (GRAND_COMPTE) lorsque son chiffre d'affaires annuel dépasse 1 000 000 USD ou lorsqu'il possède un caractère multisites hautement stratégique. En dessous de ce seuil et jusqu'à 100 000 USD, il s'agit d'une PME Stratégique (PME). Le KAM Office concentre exclusivement ses efforts sur ces deux segments à haute valeur ajoutée.",
    },
    {
      q: "Comment fonctionne l'attribution des comptes clés à un KAM individuel ?",
      a: "Le gérant du KAM Office affecte nominativement chaque entreprise à un KAM depuis les onglets Portefeuille, Grands Comptes ou PME. Une fois affecté, le compte apparaît immédiatement dans l'interface de travail du KAM concerné. Par mesure de sécurité et de confidentialité, les autres KAMs n'ont pas accès à ce dossier.",
    },
    {
      q: "Que faire lorsqu'un compte stratégique n'est pas encore attribué ?",
      a: "Les comptes sans KAM restent dans le vivier 'Non affectés'. Vous pouvez les filtrer en un clic grâce au filtre d'affectation puis cliquer sur 'Affecter KAM' pour désigner le profil le plus adapté en fonction de sa spécialité (Grands Comptes vs PME) et de sa charge de travail actuelle.",
    },
    {
      q: "Comment sont consultés les Rapports de Visite et Comptes-Rendus des KAMs ?",
      a: "Tous les comptes-rendus de rendez-vous physiques, visioconférences Google Meet et appels téléphoniques rédigés par les KAMs sont centralisés dans l'onglet 'Rapports de Visite'. Vous pouvez y analyser les synthèses d'entretiens, les scores BANT, les besoins qualifiés et les projets d'e-mails de suivi.",
    },
    {
      q: "Un KAM peut-il modifier lui-même son périmètre d'entreprises ?",
      a: "Non. Le cloisonnement strict du système Onbora réserve la gouvernance des portefeuilles exclusivement au gérant du KAM Office et à l'Administrateur général. Les KAMs disposent uniquement d'un droit de consultation et d'exécution sur les comptes qui leur sont explicitement délégués.",
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* 1. Profil & Photo de profil */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-4">
            <UserAvatar
              src={profilePictureInput || user?.profile_picture_url || user?.avatar}
              alt="Avatar"
              size="lg"
            />
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
              </h3>
              <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                Gérant de la Direction KAM Office • {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer shrink-0 border border-rose-500/20 self-start sm:self-auto shadow-none"
            title="Se déconnecter du portail KAM Office"
          >
            <Icons.LogOut size={16} />
            <span>Se déconnecter</span>
          </button>
        </div>

        {avatarSuccessMsg && (
          <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            {avatarSuccessMsg}
          </div>
        )}

        {avatarErrorMsg && (
          <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            {avatarErrorMsg}
          </div>
        )}

        {/* Téléversement Photo de profil Manager KAM Office */}
        <div className="pt-2 border-t border-black/5 dark:border-white/5">
          <ProfilePhotoUploader
            currentPhotoUrl={user?.profile_picture_url || user?.avatar}
            name={user?.username}
            title="Photo de profil Manager KAM Office"
            description="Téléversez votre photo officielle pour le portail KAM Office (JPG, PNG ou WebP, max 5 Mo) ou glissez-déposez un fichier."
            allowSelfUpdate={true}
            onPhotoUploaded={(newUrl) => {
              setProfilePictureInput(newUrl);
              if (updateUser) {
                updateUser({ avatar: newUrl, profile_picture_url: newUrl } as any);
              }
            }}
            onPhotoRemoved={() => {
              setProfilePictureInput('');
              handleSaveProfilePicture('/avatars/default_avatar.svg');
            }}
          />
        </div>
      </div>

      {/* 2. Préférences d'Affichage & Thème Visuel */}
      <ThemeSettingCard />

      {/* 3. FAQ & Règles de Gestion KAM Office */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Icons.HelpCircle size={18} className="text-[#4F6CE8]" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
            Foire Aux Questions & Règles de Gestion KAM Office
          </h3>
        </div>

        {/* Accordion List (Zero Emojis, Clean Vector Chevrons) */}
        <div className="flex flex-col gap-2">
          {faqItems.map((item, idx) => {
            const isOpen = faqOpenIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setFaqOpenIndex(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-zinc-900 dark:text-white cursor-pointer hover:bg-black/2 dark:hover:bg-white/2"
                >
                  <span>{item.q}</span>
                  {isOpen ? <Icons.ChevronUp size={16} /> : <Icons.ChevronDown size={16} />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-[#6E6C67] dark:text-[#A1A1AA] leading-relaxed border-t border-black/5 dark:border-white/5 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
