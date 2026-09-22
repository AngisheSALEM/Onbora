"use client";

import React, { useState } from 'react';
import { Icons } from '@/components/shared/Icons';
import UserAvatar from '@/components/kam/UserAvatar';
import ProfilePhotoUploader from '@/components/shared/ProfilePhotoUploader';
import ThemeSettingCard from '@/components/shared/ThemeSettingCard';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/lib/api';

export default function AdminSettingsView() {
  const { user, logout, updateUser } = useAuth();
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(0);
  const [avatarSuccessMsg, setAvatarSuccessMsg] = useState<string | null>(null);
  const [avatarErrorMsg, setAvatarErrorMsg] = useState<string | null>(null);

  const handleSaveProfilePicture = async (newUrl: string) => {
    try {
      await fetchAPI('/api/accounts/me/', {
        method: 'PATCH',
        body: JSON.stringify({ avatar: newUrl, profile_picture_url: newUrl }),
      });
      if (updateUser) {
        updateUser({ avatar: newUrl, profile_picture_url: newUrl } as any);
      }
      setAvatarSuccessMsg("Photo de profil mise à jour !");
      setTimeout(() => setAvatarSuccessMsg(null), 4000);
    } catch (err: any) {
      setAvatarErrorMsg(err?.message || "Erreur lors de la mise à jour de la photo.");
      setTimeout(() => setAvatarErrorMsg(null), 4000);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#242124] dark:text-white mt-1">Paramètres</h2>
        </div>

        {avatarSuccessMsg && (
          <div className="px-4 py-2 bg-[#4F6CE8]/10 text-[#4F6CE8] rounded-2xl text-xs font-medium flex items-center gap-2 animate-fade-in shrink-0">
            <Icons.CheckCircle size={15} />
            <span>{avatarSuccessMsg}</span>
          </div>
        )}
        {avatarErrorMsg && (
          <div className="px-4 py-2 bg-red-500/10 text-red-500 rounded-2xl text-xs font-medium flex items-center gap-2 animate-fade-in shrink-0">
            <Icons.AlertCircle size={15} />
            <span>{avatarErrorMsg}</span>
          </div>
        )}
      </div>

      {/* 1. Profile Card & Photo */}
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-4">
            <UserAvatar
              src={user?.profile_picture_url || user?.avatar}
              name={user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || 'Admin'}
              size="xl"
              className="border-2 border-[#4F6CE8] shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[#242124] dark:text-white">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || 'Admin Onbora'}
                </h3>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#4F6CE8]/15 text-[#4F6CE8]">
                  {user?.role === 'ADMIN' ? 'Super Administrateur' : user?.role || 'Admin'}
                </span>
              </div>
              <span className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] block mt-0.5">
                Identifiant : @{user?.username} • {user?.email || 'admin@onbora.cd'}
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer shrink-0 border border-rose-500/20 self-start sm:self-auto shadow-none"
            title="Se déconnecter du portail Administrateur"
          >
            <Icons.LogOut size={16} />
            <span>Se déconnecter</span>
          </button>
        </div>

        {/* Profile photo uploader */}
        <ProfilePhotoUploader
          currentPhotoUrl={user?.profile_picture_url || user?.avatar}
          name={user?.username}
          title="Photo de profil de l'administrateur"
          description="Téléversez votre photo officielle (JPG, PNG ou WebP, max 5 Mo) ou glissez-déposez un fichier."
          allowSelfUpdate={true}
          onPhotoUploaded={(newUrl) => {
            handleSaveProfilePicture(newUrl);
          }}
          onPhotoRemoved={() => {
            handleSaveProfilePicture('/avatars/default_avatar.svg');
          }}
        />
      </div>

      {/* 2. Theme Preferences */}
      <ThemeSettingCard />

      {/* 3. FAQ & Knowledge Base */}
      <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div>
            <h3 className="text-base font-semibold text-[#242124] dark:text-white">
              Foire Aux Questions (FAQ) & Règles Métier RDC
            </h3>
            <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
              Toutes les explications opérationnelles, économiques et techniques pour l'administration d'Onbora.
            </p>
          </div>
          <span className="text-[10px] font-medium px-3 py-1 bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA] rounded-full">
            6 Sujets Clés
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {[
            {
              q: "1. Comment fonctionne la segmentation financière des 1 000 entreprises en RDC ?",
              a: (
                <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                  <p>
                    La segmentation financière d'Onbora est calibrée sur les réalités économiques du marché congolais en trois strates distinctes :
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong className="text-[#242124] dark:text-white">Très petites entreprises (Commerce informel / Proximité) :</strong> Chiffre d'affaires inférieur à <strong>200 $ / mois</strong> (soit &lt; 2 400 $ / an). Boutiques, kiosques, artisans et commerces de proximité.
                    </li>
                    <li>
                      <strong className="text-[#242124] dark:text-white">PME (Petites et Moyennes Entreprises) :</strong> Chiffre d'affaires compris entre <strong>200 $ et 2 500 $ / mois</strong> (soit 2 400 $ à 30 000 $ / an). Cliniques privées, cabinets comptables, écoles, distributeurs.
                    </li>
                    <li>
                      <strong className="text-[#242124] dark:text-white">Grands Comptes :</strong> Chiffre d'affaires supérieur à <strong>2 500 $ / mois</strong> (soit &gt; 30 000 $ / an). Banques, compagnies minières, multinationales et institutions.
                    </li>
                  </ul>
                </div>
              ),
            },
            {
              q: "2. Pourquoi le découpage par Plaques cartographiques est-il réservé aux très petites entreprises ?",
              a: (
                <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                  <p>
                    La prospection des très petites entreprises s'effectue exclusivement par des <strong>commerciaux terrain du Back-Office</strong> selon une méthode de quadrillage pédestre (porte-à-porte). Ce mode opératoire exige une très forte densité géographique continue :
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Les <strong>plaques cartographiques</strong> délimitent précisément les avenues, marchés et quartiers (Gombe, Limete, Lingwala, etc.) pour éviter tout chevauchement entre agents terrain.</li>
                    <li>À l'inverse, un Grand Compte ou une PME nécessite des rendez-vous ciblés et des processus décisionnels C-Level.</li>
                  </ul>
                </div>
              ),
            },
            {
              q: "3. Pourquoi et comment les PME et Grands Comptes sont-ils routés vers le KAM Office ?",
              a: (
                <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                  <p>
                    Dès qu'une entreprise franchit le seuil de 200 $ / mois, elle quitte automatiquement le périmètre des plaques terrain pour être prise en charge par la <strong>Direction KAM Office</strong> :
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Chaque compte est affecté à un <strong>Key Account Manager (KAM)</strong> dédié selon sa spécialisation (Grands Comptes ou PME).</li>
                    <li>Le KAM gère un portefeuille relationnel sur la durée, effectue des audits d'infrastructure, soumet des offres managées (Fibre, SD-WAN, Cloud, Cyberdéfense).</li>
                  </ul>
                </div>
              ),
            },
            {
              q: "4. Comment le Catalogue d'offres alimente-t-il les recommandations du Core AI ?",
              a: (
                <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                  <p>
                    Le catalogue d'offres constitue la base de vérité commerciale du système :
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Chaque offre possède des mots-clés de matching, des segments cibles et un statut de disponibilité en RDC.</li>
                    <li>Lorsqu'un commercial terrain ou un KAM saisit un besoin client, le moteur d'inférence Core AI associe algorithmiquement la solution la plus pertinente sans risque de promesse hors catalogue.</li>
                  </ul>
                </div>
              ),
            },
            {
              q: "5. Quel est le format d'importation JSON pour mettre à jour le catalogue ?",
              a: (
                <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                  <p>
                    L'importation accepte le schéma standard du Core AI avec les champs essentiels pour chaque service (service_id, name, category, description, allowed_benefits, target_customers, rdc_availability, match).
                  </p>
                </div>
              ),
            },
            {
              q: "6. Quelle est la différence entre les rôles Administrateur, Superviseur et Gérant KAM ?",
              a: (
                <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong className="text-[#242124] dark:text-white">Super Administrateur :</strong> Pilote la segmentation, gère les offres B2B, audite les comptes et attribue les accès de haut niveau.</li>
                    <li><strong className="text-[#242124] dark:text-white">Superviseur Back-Office :</strong> Supervise les commerciaux terrain pédestres, trace les tournées et contrôle les découpages de plaques cartographiques.</li>
                    <li><strong className="text-[#242124] dark:text-white">Gérant KAM Office :</strong> Coordonne l'équipe des Key Account Managers, répartit les comptes PME et Grands Comptes et pilote le volume de CA signé.</li>
                  </ul>
                </div>
              ),
            },
          ].map((item, index) => {
            const isOpen = faqOpenIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl bg-[#F6F5F2] dark:bg-[#242124] border border-black/5 dark:border-white/5 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setFaqOpenIndex(isOpen ? null : index)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <span className="text-xs font-medium text-[#242124] dark:text-white">{item.q}</span>
                  <span
                    className={`p-1.5 rounded-xl bg-white dark:bg-[#2D2A2D] text-[#6E6C67] dark:text-[#A1A1AA] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-90' : ''
                    }`}
                  >
                    <Icons.ChevronRight size={14} />
                  </span>
                </button>
                {isOpen && (
                  <div className="p-4 pt-1 border-t border-black/5 dark:border-white/5">{item.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
