"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icons } from '@/components/shared/Icons';
import { SkeletonBox } from '@/components/shared/SkeletonLoader';
import { B2BNewsItem } from './kamTypes';

interface KamNewLeadCardProps {
  item: B2BNewsItem;
  publishedLabel: string;
  converting: boolean;
  onOpen: () => void;
  onSave: (event: React.MouseEvent) => void;
  onConvert: (event: React.MouseEvent) => void;
}

function websiteUrl(value: string) {
  if (!value.trim()) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return ['http:', 'https:'].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

export default function KamNewLeadCard({ item, publishedLabel, converting, onOpen, onSave, onConvert }: KamNewLeadCardProps) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const name = item.discovered_company_name || item.enterprise_name || 'Entreprise';
  const website = websiteUrl(item.discovered_website || '');
  const headline = (item.title || '').replace(/^\[.*?\]\s*/, '').trim();
  const photo = item.company_photo_url;

  return (
    <article className="rounded-xl bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 sm:p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-[192px_minmax(0,1fr)] gap-6 sm:gap-8 items-start">
        <div className="relative aspect-square w-full max-w-48 overflow-hidden rounded-lg bg-[#E4E1DB] dark:bg-[#363336]">
          {photo && failedPhoto !== photo ? (
            <Image src={photo} alt={`Photo de ${name}`} fill sizes="192px" unoptimized className="object-cover" onError={() => setFailedPhoto(photo)} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-500 dark:text-zinc-400" role="img" aria-label={`Photo de ${name} non disponible`}>
              <Icons.Building size={40} />
              <span className="text-[13px] leading-[21px]">Photo non disponible</span>
            </div>
          )}
        </div>

        <dl className="min-w-0 space-y-3">
          <div>
            <dt className="text-[11px] leading-4 font-medium text-zinc-500 dark:text-zinc-400">Nom de l’entreprise</dt>
            <dd className="text-[21px] leading-[27px] font-semibold text-zinc-900 dark:text-white break-words">{name}</dd>
          </div>
          <div>
            <dt className="text-[11px] leading-4 font-medium text-zinc-500 dark:text-zinc-400">Localisation</dt>
            <dd className="text-[14px] leading-[22px] text-zinc-700 dark:text-zinc-200 break-words">{item.discovered_location || item.enterprise_location || 'Non renseignée'}</dd>
          </div>
          <div>
            <dt className="text-[11px] leading-4 font-medium text-zinc-500 dark:text-zinc-400">Contact</dt>
            <dd className="text-[14px] leading-[22px] text-zinc-700 dark:text-zinc-200 break-words">
              {website ? (
                <a href={website.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline underline-offset-4 hover:text-[#4F6CE8] focus-visible:outline-2 focus-visible:outline-[#4F6CE8]">
                  {website.hostname.replace(/^www\./, '')}<Icons.ExternalLink size={13} />
                </a>
              ) : 'Non renseigné'}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] leading-4 font-medium text-zinc-500 dark:text-zinc-400">Secteur d’activité</dt>
            <dd className="text-[14px] leading-[22px] text-zinc-700 dark:text-zinc-200 break-words">{item.discovered_sector || item.enterprise_sector || 'Non renseigné'}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] leading-[21px] text-zinc-500 dark:text-zinc-400">
          <span>{item.is_profile_entry ? 'Fiche entreprise' : 'Actualité de l’entreprise'}</span>
          <time dateTime={item.published_at}>{publishedLabel}</time>
        </div>
        <h2 className="text-[21px] leading-[27px] font-semibold text-zinc-900 dark:text-white break-words">
          <button type="button" onClick={onOpen} className="text-left cursor-pointer hover:text-[#4F6CE8] focus-visible:outline-2 focus-visible:outline-[#4F6CE8]">{headline}</button>
        </h2>
        <p className="text-[16px] leading-[26px] text-zinc-600 dark:text-zinc-300 break-words">{item.summary}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {item.is_converted_to_portfolio ? (
            <>
              <span className="inline-flex items-center gap-2 text-[13px] leading-[21px] text-zinc-600 dark:text-zinc-300"><Icons.CheckCircle size={16} />Ajouté au portefeuille</span>
              {item.enterprise && <Link href={`/kam/briefing?id=account-${item.enterprise}&tab=compare`} className="text-[14px] leading-[22px] font-semibold text-[#4F6CE8]">Comparer</Link>}
            </>
          ) : (
            <button type="button" onClick={onConvert} disabled={converting} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#4F6CE8] px-4 py-2 text-[14px] leading-[22px] font-semibold text-white hover:bg-[#3E5AC8] disabled:opacity-70 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F6CE8]">
              {converting ? <SkeletonBox width={16} height={16} rounded="rounded-md" /> : <Icons.UserPlus size={16} />}
              {converting ? 'Ajout en cours' : 'Ajouter au portefeuille'}
            </button>
          )}
          <button type="button" onClick={onOpen} className="min-h-11 text-[14px] leading-[22px] font-medium text-zinc-600 dark:text-zinc-300 hover:text-[#4F6CE8] cursor-pointer">Action commerciale</button>
        </div>
        <div className="flex items-center gap-3">
          {item.source_url && <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-[13px] leading-[21px] text-zinc-500 dark:text-zinc-400 hover:text-[#4F6CE8]">Source<Icons.ExternalLink size={13} /></a>}
          <button type="button" onClick={onSave} aria-pressed={item.is_saved} aria-label={item.is_saved ? `Retirer ${name} des favoris` : `Enregistrer ${name} en favori`} className="flex size-11 items-center justify-center rounded-lg text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#4F6CE8]">
            <Icons.Bookmark size={18} className={item.is_saved ? 'fill-[#4F6CE8] text-[#4F6CE8]' : ''} />
          </button>
        </div>
      </div>
    </article>
  );
}

export function KamNewLeadCardSkeleton() {
  return (
    <div role="status" aria-label="Chargement des nouveaux leads" className="space-y-4">
      {[0, 1, 2].map((index) => (
        <div key={index} className="rounded-xl bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-[192px_minmax(0,1fr)] gap-6 sm:gap-8">
            <SkeletonBox className="aspect-square w-full max-w-48" rounded="rounded-lg" />
            <div className="space-y-4">{[80, 55, 65, 45].map((width) => <SkeletonBox key={width} width={`${width}%`} height={32} />)}</div>
          </div>
          <SkeletonBox width="75%" height={24} />
          <SkeletonBox height={64} />
          <SkeletonBox width={192} height={44} rounded="rounded-lg" />
        </div>
      ))}
    </div>
  );
}
