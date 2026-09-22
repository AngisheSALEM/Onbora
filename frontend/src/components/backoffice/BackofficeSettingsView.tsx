"use client";

import React, { useState, useEffect } from 'react';
import { Icons } from '@/components/shared/Icons';
import ProfilePhotoUploader from '@/components/shared/ProfilePhotoUploader';
import ThemeSettingCard from '@/components/shared/ThemeSettingCard';
import { useAuth } from '@/context/AuthContext';
import { useBackofficeContext } from './BackofficeContext';
import { fetchAPI } from '@/lib/api';

export default function BackofficeSettingsView() {
  const { user, logout, updateUser } = useAuth();
  const { setHeaderTitle, setSearchPlaceholder } = useBackofficeContext();

  const [profilePictureInput, setProfilePictureInput] = useState('');
  const [avatarSuccessMsg, setAvatarSuccessMsg] = useState('');
  const [avatarErrorMsg, setAvatarErrorMsg] = useState('');
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    setHeaderTitle("Paramètres du Profil & Support");
    setSearchPlaceholder("Rechercher dans les paramètres...");
  }, [setHeaderTitle, setSearchPlaceholder]);

  useEffect(() => {
    if (user) {
      setProfilePictureInput((user as any).profile_picture_url || user.avatar || '');
    }
  }, [user]);

  const handleSaveProfilePicture = async (newUrlOrAvatar: string) => {
    setAvatarErrorMsg('');
    try {
      await fetchAPI('/api/accounts/me/', {
        method: 'PATCH',
        body: JSON.stringify({ avatar: newUrlOrAvatar, profile_picture_url: newUrlOrAvatar }),
      });
      if (updateUser) {
        updateUser({ avatar: newUrlOrAvatar, profile_picture_url: newUrlOrAvatar } as any);
      }
      setAvatarSuccessMsg("Photo de profil mise à jour avec succès !");
      setTimeout(() => setAvatarSuccessMsg(''), 3500);
    } catch (err: any) {
      console.error(err);
      setAvatarErrorMsg(err.message || "Erreur lors de la mise à jour de la photo de profil.");
    }
  };

  const faqItems = [
    {
      q: "1. Comment fonctionne l'Auto-Dispatch et la prévention des collisions de portefeuille ?",
      a: (
        <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
          <p>
            L'algorithme d'Auto-Dispatch d'Onbora analyse en continu la proximité géographique des comptes TPE au sein de chaque plaque. Il évalue la charge de travail actuelle des commerciaux affectés (nombre de comptes déjà assignés et visites planifiées) et distribue les entreprises équitablement.
          </p>
          <p>
            Un mécanisme strict anti-collision garantit qu'un compte TPE ne peut jamais être attribué à deux commerciaux simultanément.
          </p>
        </div>
      ),
    },
    {
      q: "2. Comment délimiter une plaque géographique au crayon sur la carte ?",
      a: (
        <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
          <p>
            Rendez-vous dans l'onglet <strong className="text-[#242124] dark:text-white">Carte Territoire</strong>. En haut à droite de la carte, cliquez sur l'outil Crayon pour activer le mode dessin.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Cliquez sur la carte pour poser chaque sommet de votre polygone.</li>
            <li>Vous pouvez annuler le dernier point à tout moment avec le bouton Annuler.</li>
            <li>Une fois la zone délimitée (au moins 3 sommets), cliquez sur &quot;Valider & Créer la Plaque&quot;, donnez-lui un code (ex: PLQ-GOMBE-02) et enregistrez. Le fichier KML est généré automatiquement.</li>
          </ul>
        </div>
      ),
    },
    {
      q: "3. Quelle est la différence entre affecter un commercial à une plaque et dispatcher des comptes ?",
      a: (
        <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
          <p>
            <strong className="text-[#242124] dark:text-white">Affecter un commercial à une plaque :</strong> Définit le groupe de commerciaux autorisés et prioritaires sur cette zone géographique. Vous pouvez le faire directement depuis la page des plaques ou depuis la carte.
          </p>
          <p>
            <strong className="text-[#242124] dark:text-white">Dispatcher les comptes :</strong> Distribue individuellement chaque entreprise de très petites entreprises de la plaque à un commercial précis. Le commercial voit alors ces comptes apparaître instantanément dans sa liste de prospection sur son mobile.
          </p>
        </div>
      ),
    },
    {
      q: "4. Comment fonctionne le calcul des points d'activité des commerciaux ?",
      a: (
        <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
          <p>
            Chaque action terrain d'un commercial rapporte des points d'activité automatiquement calculés :
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-[#242124] dark:text-white">100 points :</strong> Pour chaque contrat client converti et signé.</li>
            <li><strong className="text-[#242124] dark:text-white">20 points :</strong> Pour chaque formulaire d&apos;audit ou de qualification terrain validé.</li>
            <li><strong className="text-[#242124] dark:text-white">10 points :</strong> Pour chaque visite physique effectuée et confirmée par géolocalisation.</li>
          </ul>
        </div>
      ),
    },
    {
      q: "5. Comment émettre une directive prioritaire vers un commercial de terrain ?",
      a: (
        <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
          <p>
            Depuis la fiche détaillée d&apos;un commercial ou la vue équipe, vous pouvez consulter ses indicateurs de visite et formuler des directives prioritaires.
          </p>
          <p>
            Le commercial reçoit une notification instantanée sur son application mobile lors de la mise à jour de ses comptes.
          </p>
        </div>
      ),
    },
    {
      q: "6. Que faire lorsqu'une entreprise TPE n'est pas encore géolocalisée sur la carte ?",
      a: (
        <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
          <p>
            Les entreprises qui n&apos;ont pas encore de coordonnées GPS précises restent parfaitement accessibles dans l&apos;onglet <strong className="text-[#242124] dark:text-white">Annuaire TPE</strong> et dans le dispatch manuel de leur plaque.
          </p>
          <p>
            Dès qu&apos;un commercial effectue sa première visite physique sur place, l&apos;application mobile capture les coordonnées GPS réelles et les enregistre automatiquement dans la base Onbora.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header Banner */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-[#242124] dark:text-white">
            Paramètres du Profil & Base de Connaissances
          </h3>
          <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
            Gérez votre photo de profil officielle, consultez les règles métier terrain et administrez votre session.
          </p>
        </div>
        {avatarSuccessMsg && (
          <div className="px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-semibold flex items-center gap-2 shrink-0">
            <Icons.CheckCircle size={15} />
            <span>{avatarSuccessMsg}</span>
          </div>
        )}
        {avatarErrorMsg && (
          <div className="px-4 py-2 bg-red-500/10 text-red-500 rounded-2xl text-xs font-semibold flex items-center gap-2 shrink-0">
            <Icons.AlertCircle size={15} />
            <span>{avatarErrorMsg}</span>
          </div>
        )}
      </div>

      {/* 1. Profile Card & Photo de Profil */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-black/5 dark:bg-white/5 border-2 border-[#4F6CE8] flex items-center justify-center overflow-hidden shadow-xs shrink-0">
              <img
                src={profilePictureInput || user?.profile_picture_url || '/avatars/default_avatar.svg'}
                alt="Photo de profil"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/avatars/default_avatar.svg';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-[#242124] dark:text-white">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || 'Superviseur Onbora'}
                </h3>
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#4F6CE8]/15 text-[#4F6CE8]">
                  Superviseur Back-Office Terrain
                </span>
              </div>
              <span className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] block mt-0.5">
                Identifiant : @{user?.username} • {user?.email || 'superviseur@onbora.cd'}
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer shrink-0 border border-rose-500/20 self-start sm:self-auto shadow-none"
            title="Se déconnecter du Back-Office"
          >
            <Icons.LogOut size={16} />
            <span>Se déconnecter</span>
          </button>
        </div>

        {/* Téléversement de la Photo de Profil Superviseur */}
        <ProfilePhotoUploader
          currentPhotoUrl={user?.profile_picture_url || user?.avatar}
          name={user?.username}
          title="Photo de profil Superviseur Back-Office"
          description="Téléversez votre photo officielle pour le Back-Office (JPG, PNG ou WebP, max 5 Mo) ou glissez-déposez un fichier."
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

      {/* 2. Préférences d'Affichage & Thème Visuel */}
      <ThemeSettingCard />

      {/* 3. FAQ INTERACTIVE SUPERVISEUR */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div>
            <h3 className="text-base font-extrabold text-[#242124] dark:text-white">
              Foire Aux Questions (FAQ) & Règles Métier
            </h3>
            <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
              Toutes les explications opérationnelles pour la gestion des plaques, l&apos;auto-dispatch et le suivi terrain.
            </p>
          </div>
          <span className="text-[10px] font-semibold px-3 py-1 bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA] rounded-full">
            6 Sujets Clés
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {faqItems.map((item, index) => {
            const isOpen = faqOpenIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl bg-white dark:bg-[#242124] border border-black/5 dark:border-white/5 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setFaqOpenIndex(isOpen ? null : index)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <span className="text-xs font-extrabold text-[#242124] dark:text-white">
                    {item.q}
                  </span>
                  <span className={`p-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                    <Icons.ChevronRight size={14} />
                  </span>
                </button>
                {isOpen && (
                  <div className="p-4 pt-1 border-t border-black/5 dark:border-white/5">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. DANGER ZONE : DÉCONNEXION */}
      <div className="bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-sm font-extrabold text-red-600 dark:text-red-400">
            Déconnexion de votre compte
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Fermer votre session en toute sécurité et retourner à l&apos;écran d&apos;authentification Onbora.
          </span>
        </div>
        <button
          type="button"
          onClick={logout}
          className="px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all cursor-pointer inline-flex items-center justify-center gap-2 shadow-sm shrink-0"
        >
          <Icons.LogOut size={16} />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
}
