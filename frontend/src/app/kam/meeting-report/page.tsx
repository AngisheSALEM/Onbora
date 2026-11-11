"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';
import { SkeletonDebriefLoader } from '@/components/shared/SkeletonLoader';
import KamMeetingReportForm from '@/components/kam/KamMeetingReportForm';

interface Appointment { enterprise_name: string; title: string; scheduled_at: string; report_id?: number; status: string }

function MeetingReportContent() {
  const router = useRouter();
  const params = useSearchParams();
  const appointmentId = params.get('appointmentId') || params.get('id');
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    if (!appointmentId) return;
    fetchAPI(`/api/kam/appointments/${appointmentId}/`).then(result => {
      if (!cancelled) setAppointment(result);
    }).catch(() => { if (!cancelled) setError('Ce rendez-vous est inaccessible. Revenez à l’agenda pour le sélectionner à nouveau.'); });
    return () => { cancelled = true; };
  }, [appointmentId]);
  return <main className="flex-1 overflow-y-auto bg-[#F6F5F2] dark:bg-[#242124] p-4 sm:p-6 lg:p-8">
    <div className="max-w-5xl mx-auto space-y-6">
      <button type="button" onClick={() => router.push('/kam/agenda')} className="min-h-11 inline-flex items-center gap-2 text-[13px] text-zinc-600 dark:text-zinc-400"><Icons.ArrowLeft size={16} />Retour à l’agenda</button>
      {error || !appointmentId ? <p role="alert" className="text-[14px]">{error || 'Choisissez un rendez-vous dans votre agenda.'}</p> : !appointment ? <SkeletonDebriefLoader /> : <>
        <header>
          <p className="text-[13px] leading-[21px] text-zinc-500 dark:text-zinc-400">{appointment.enterprise_name} · {new Date(appointment.scheduled_at).toLocaleDateString('fr-FR')}</p>
          <h1 className="mt-2 text-[34px] leading-[40px] font-semibold tracking-tight text-[#242124] dark:text-white">Compte rendu</h1>
          <p className="mt-3 text-[13px] leading-[21px] text-zinc-500 dark:text-zinc-400">Reprenez vos notes, un échange ou un document pour préparer le suivi.</p>
        </header>
        {appointment.report_id ? <button onClick={() => router.push(`/kam/report?reportId=${appointment.report_id}&from=agenda`)} className="rounded-full min-h-11 px-5 bg-[#4F6CE8] text-white text-[14px]">Consulter le compte rendu</button> : appointment.status === 'CANCELLED' ? <p className="text-[14px]">Ce rendez-vous est annulé.</p> : <KamMeetingReportForm key={appointmentId} appointmentId={appointmentId!} onSaved={id => router.push(`/kam/report?reportId=${id}&from=agenda`)} />}
      </>}
    </div>
  </main>;
}

export default function MeetingReportPage() {
  return <Suspense fallback={<SkeletonDebriefLoader />}><MeetingReportContent /></Suspense>;
}
