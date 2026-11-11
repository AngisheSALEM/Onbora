"use client";

import React, { useEffect, useRef } from 'react';
import { StrategicVisit } from './kamTypes';
import { Icons } from '@/components/shared/Icons';
import KamMeetingReportForm from './KamMeetingReportForm';

export default function KamMeetingReportModal({ visit, onClose, onSaved }: {
  visit: StrategicVisit | null;
  onClose: () => void;
  onSaved: (reportId: number) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (visit && !dialog.current?.open) dialog.current?.showModal();
    else if (!visit) dialog.current?.close();
  }, [visit]);
  return <dialog ref={dialog} aria-labelledby="meeting-report-title" onCancel={onClose} onClose={onClose} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl rounded-3xl p-6 sm:p-8 bg-[#F6F5F2] dark:bg-[#242124] text-[#242124] dark:text-white backdrop:bg-black/40">
    {visit && <>
      <header className="flex items-start justify-between gap-4 mb-8">
        <div><p className="text-[13px] leading-[21px] text-zinc-500">{visit.account_name}</p><h2 id="meeting-report-title" className="text-[26px] leading-[32px] font-semibold mt-1">Compte rendu</h2><p className="text-[13px] leading-[21px] text-zinc-500 mt-2">Reprenez les informations de votre rencontre.</p></div>
        <button type="button" aria-label="Fermer le compte rendu" onClick={onClose} className="min-h-11 min-w-11 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5"><Icons.X size={18} /></button>
      </header>
      <KamMeetingReportForm key={visit.id} accountId={visit.account_id || visit.id.replace('account-', '')} onSaved={onSaved} />
    </>}
  </dialog>;
}
