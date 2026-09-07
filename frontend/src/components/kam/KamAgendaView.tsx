"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';
import { StrategicVisit } from './kamTypes';
import KamVocalVisitModal, { AppointmentData } from './KamVocalVisitModal';

interface KamAgendaViewProps {
  assignedAccounts: StrategicVisit[];
  onOpenVisitsHistory?: () => void;
}

export default function KamAgendaView({
  assignedAccounts,
  onOpenVisitsHistory,
}: KamAgendaViewProps) {
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'ALL' | 'TODAY' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [activeVocalAppointment, setActiveVocalAppointment] = useState<AppointmentData | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // New Appointment Form State
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [meetingType, setMeetingType] = useState<'PHYSICAL' | 'GOOGLE_MEET' | 'CALL'>('PHYSICAL');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [location, setLocation] = useState('');
  const [meetUrl, setMeetUrl] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [objective, setObjective] = useState('');
  const [savingAppointment, setSavingAppointment] = useState(false);

  // Set default scheduledAt to today + 1 hour formatted for datetime-local
  useEffect(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
    setScheduledAt(localISOTime);
  }, []);

  // When selected account changes, prefill contact and location
  useEffect(() => {
    if (selectedAccountId) {
      const acc = assignedAccounts.find(a => a.id === selectedAccountId || a.account_id === selectedAccountId);
      if (acc) {
        const stk = acc.briefing?.stakeholders_mapping?.[0];
        setContactName(stk?.full_name || '');
        setContactRole(stk?.job_title || 'Directeur Général');
        setLocation(acc.location || '');
        if (!title) {
          setTitle(`Revue Stratégique & Audit Connectivité — ${acc.account_name}`);
        }
      }
    }
  }, [selectedAccountId, assignedAccounts, title]);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAPI('/api/kam/appointments/');
      if (Array.isArray(data)) {
        setAppointments(data);
      } else {
        setAppointments([]);
      }
    } catch (err: any) {
      console.error("Erreur chargement rendez-vous agenda:", err);
      setError("Impossible de charger les rendez-vous. Veuillez vérifier votre connexion.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || !title || !scheduledAt) return;

    setSavingAppointment(true);
    try {
      const acc = assignedAccounts.find(a => a.id === selectedAccountId || a.account_id === selectedAccountId);
      const enterpriseNumericId = acc?.account_id || acc?.id?.replace('account-', '');

      const payload = {
        enterprise_id: enterpriseNumericId,
        title: title.trim(),
        meeting_type: meetingType,
        scheduled_at: scheduledAt,
        duration_minutes: durationMinutes,
        location: location.trim(),
        meet_url: meetUrl.trim(),
        contact_name: contactName.trim(),
        contact_role: contactRole.trim(),
        objective: objective.trim(),
      };

      const res = await fetchAPI('/api/kam/appointments/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res && res.id) {
        setAppointments(prev => [res, ...prev]);
        setIsNewAppointmentModalOpen(false);
        // Reset form
        setTitle('');
        setObjective('');
        setSuccessToast(`Rendez-vous planifié avec succès pour ${acc?.account_name || 'le client'}.`);
        setTimeout(() => setSuccessToast(null), 4000);
      }
    } catch (err: any) {
      console.error("Erreur création rendez-vous:", err);
      alert("Erreur lors de la planification du rendez-vous.");
    } finally {
      setSavingAppointment(false);
    }
  };

  const handleVisitCompleted = (report: any) => {
    setActiveVocalAppointment(null);
    loadAppointments();
    setSuccessToast("Rapport exécutif et email de relance générés par Core AI !");
    setTimeout(() => setSuccessToast(null), 5000);
  };

  // Filter appointments
  const filteredAppointments = appointments.filter((app) => {
    const appDate = new Date(app.scheduled_at);
    const today = new Date();
    const isToday = appDate.toDateString() === today.toDateString();

    if (filterTab === 'TODAY') return isToday;
    if (filterTab === 'UPCOMING') return app.status === 'SCHEDULED' && appDate >= today;
    if (filterTab === 'COMPLETED') return app.status === 'COMPLETED';
    return true;
  });

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-8 overflow-y-auto select-none">
      
      {/* 1. TOP HEADER TOOLBAR */}
      <div className="flex flex-col gap-4 pb-2 border-b border-zinc-200/80 dark:border-white/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Agenda & Planification des Rendez-vous
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Planifiez vos visites terrain, déclenchez vos briefs vocaux en direct et générez vos rapports Core AI.
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5">
            {onOpenVisitsHistory && (
              <button
                onClick={onOpenVisitsHistory}
                className="flex items-center gap-2 px-4 py-2 bg-[#F6F5F2] dark:bg-[#2D2A2D] hover:bg-white dark:hover:bg-[#363336] text-zinc-700 dark:text-zinc-200 rounded-full text-xs font-semibold transition-all cursor-pointer border border-black/5 dark:border-white/5 shadow-xs"
              >
                <Icons.FileText size={14} />
                <span>Voir l&apos;Historique des Visites</span>
              </button>
            )}

            <button
              onClick={() => setIsNewAppointmentModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2 bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 text-white rounded-full text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Icons.Plus size={15} />
              <span>Nouveau Rendez-vous</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'ALL', label: `Tous les RDV (${appointments.length})` },
            { id: 'TODAY', label: `Aujourd'hui (${appointments.filter(a => new Date(a.scheduled_at).toDateString() === new Date().toDateString()).length})` },
            { id: 'UPCOMING', label: `À venir (${appointments.filter(a => a.status === 'SCHEDULED').length})` },
            { id: 'COMPLETED', label: `Effectués / Rapports (${appointments.filter(a => a.status === 'COMPLETED').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                filterTab === tab.id
                  ? 'bg-[#4F6CE8] text-white shadow-sm font-extrabold'
                  : 'bg-[#F6F5F2] dark:bg-[#2D2A2D] text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-[#363336] border border-black/5 dark:border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-semibold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2.5">
            <Icons.CheckCircle size={18} className="text-emerald-500" />
            <span>{successToast}</span>
          </div>
          {onOpenVisitsHistory && (
            <button
              onClick={onOpenVisitsHistory}
              className="text-xs font-extrabold underline cursor-pointer hover:opacity-80"
            >
              Ouvrir l&apos;historique
            </button>
          )}
        </div>
      )}

      {/* 2. MAIN APPOINTMENTS LIST / EMPTY STATE */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <Icons.Sparkles size={30} className="animate-spin text-[#4F6CE8]" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Chargement de votre planning...
            </span>
          </div>
        </div>
      ) : error ? (
        <div className="p-8 max-w-md mx-auto text-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 space-y-3">
          <Icons.AlertCircle size={32} className="text-rose-500 mx-auto" />
          <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">Erreur de chargement</h3>
          <p className="text-xs text-zinc-500">{error}</p>
          <button
            onClick={loadAppointments}
            className="px-4 py-2 bg-[#4F6CE8] hover:bg-[#3D57C5] text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      ) : appointments.length === 0 ? (
        /* Real 0 Appointments Empty State */
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="p-12 max-w-md bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[32px] border border-black/5 dark:border-white/5 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#4F6CE8]/10 text-[#4F6CE8] mx-auto flex items-center justify-center">
              <Icons.Calendar size={30} />
            </div>
            <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">
              Aucun rendez-vous planifié
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Votre agenda est actuellement vide. Planifiez un rendez-vous physique ou une visioconférence avec l&apos;un de vos comptes assignés. Le jour du rendez-vous, vous pourrez activer l&apos;enregistrement vocal pour générer votre compte-rendu avec Core AI.
            </p>
            <button
              onClick={() => setIsNewAppointmentModalOpen(true)}
              className="px-5 py-2.5 bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 text-white rounded-full text-xs font-bold cursor-pointer transition-all inline-flex items-center gap-2 shadow-sm"
            >
              <Icons.Plus size={15} />
              <span>Planifier mon premier rendez-vous</span>
            </button>
          </div>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="p-12 text-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 space-y-2">
          <p className="text-xs font-bold text-zinc-500">Aucun rendez-vous ne correspond à ce filtre.</p>
        </div>
      ) : (
        /* Grid of Scheduled Appointments */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAppointments.map((app) => {
            const isCompleted = app.status === 'COMPLETED';

            return (
              <div
                key={app.id}
                className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[28px] p-6 border border-black/5 dark:border-white/5 shadow-xs flex flex-col justify-between gap-4 hover:border-[#4F6CE8]/30 transition-all group"
              >
                {/* Card Top Header */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-[#4F6CE8]/15 text-[#4F6CE8] flex items-center justify-center font-extrabold text-sm shrink-0">
                        {app.enterprise_name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-zinc-900 dark:text-white leading-tight">
                          {app.enterprise_name}
                        </h4>
                        <span className="text-[10px] text-zinc-400 font-mono block">
                          {app.sector} • {app.crm_id}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                        <Icons.CheckCircle size={11} />
                        <span>Rapport Généré</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#4F6CE8]/15 text-[#4F6CE8] border border-[#4F6CE8]/20 shrink-0">
                        <Icons.Clock size={11} />
                        <span>Planifié</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Objective */}
                  <div className="pt-1">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                      {app.title}
                    </span>
                    {app.objective && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                        {app.objective}
                      </p>
                    )}
                  </div>

                  {/* Date, Type & Interlocuteur Pills */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/5 dark:border-white/5 text-xs">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-zinc-400 block">Date & Heure</span>
                      <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {formatDate(app.scheduled_at)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-zinc-400 block">Décideur</span>
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate block">
                        {app.contact_name || 'Direction'} ({app.contact_role || 'C-Level'})
                      </span>
                    </div>
                  </div>

                  {/* Meeting Type & Location Link */}
                  <div className="flex items-center justify-between text-[11px] pt-1 text-zinc-500">
                    <span className="flex items-center gap-1">
                      {app.meeting_type === 'GOOGLE_MEET' ? (
                        <>
                          <Icons.Video size={13} className="text-[#4F6CE8]" />
                          <span>Visioconférence Google Meet</span>
                        </>
                      ) : app.meeting_type === 'CALL' ? (
                        <>
                          <Icons.Phone size={13} className="text-zinc-500" />
                          <span>Appel Téléphonique</span>
                        </>
                      ) : (
                        <>
                          <Icons.MapPin size={13} className="text-emerald-500" />
                          <span>Visite Terrain : {app.location || 'Siège'}</span>
                        </>
                      )}
                    </span>
                    <span className="font-mono">{app.duration_minutes} min</span>
                  </div>
                </div>

                {/* Card Bottom CTA : Lancer le Brief Vocal */}
                <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                  {isCompleted ? (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <Icons.Check size={13} />
                      <span>Visite clôturée avec Core AI</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-zinc-400 italic">
                      Activez le micro pendant l&apos;échange
                    </span>
                  )}

                  {/* Microphone Action Button */}
                  <button
                    onClick={() => setActiveVocalAppointment(app)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                      isCompleted
                        ? 'bg-[#E4E1DB] dark:bg-[#363336] text-zinc-800 dark:text-zinc-200 hover:bg-[#4F6CE8] hover:text-white'
                        : 'bg-[#4F6CE8] hover:bg-[#3D57C5] text-white shadow-md shadow-[#4F6CE8]/20'
                    }`}
                    title="Lancer le débrief vocal en direct"
                  >
                    <Icons.Mic size={15} />
                    <span>{isCompleted ? "Recommencer Vocal" : "Brief Vocal Live"}</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 3. MODAL NOUVEAU RENDEZ-VOUS */}
      {isNewAppointmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="bg-[#ECEAE5] dark:bg-[#242124] text-zinc-900 dark:text-white w-full max-w-lg rounded-[32px] border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-black/5 dark:border-white/5 bg-[#F6F5F2] dark:bg-[#2D2A2D] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#4F6CE8]/15 text-[#4F6CE8] flex items-center justify-center font-bold">
                  <Icons.Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-white tracking-tight">
                    Planifier un Rendez-vous Client
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Visite terrain, visio ou appel avec un compte assigné
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsNewAppointmentModalOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <Icons.X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateAppointment} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              {/* Account Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                  Compte Client Assigné *
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  required
                  className="w-full p-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] border border-black/5 dark:border-white/5 rounded-2xl text-xs text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#4F6CE8] transition-all cursor-pointer"
                >
                  <option value="">Sélectionner un compte de votre portefeuille...</option>
                  {assignedAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} ({acc.briefing?.industry || 'B2B'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title / Objective */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                  Objet du Rendez-vous *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Revue d'infrastructure et proposition Fibre Dédiée"
                  required
                  className="w-full p-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] border border-black/5 dark:border-white/5 rounded-2xl text-xs text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#4F6CE8] transition-all"
                />
              </div>

              {/* Meeting Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                  Format de Rencontre
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'PHYSICAL', label: 'Terrain (Physique)', icon: Icons.MapPin },
                    { id: 'GOOGLE_MEET', label: 'Google Meet', icon: Icons.Video },
                    { id: 'CALL', label: 'Appel', icon: Icons.Phone },
                  ].map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setMeetingType(type.id as any)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          meetingType === type.id
                            ? 'bg-[#4F6CE8] text-white border-[#4F6CE8] shadow-xs'
                            : 'bg-[#F6F5F2] dark:bg-[#2D2A2D] text-zinc-700 dark:text-zinc-300 border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-[#363336]'
                        }`}
                      >
                        <Icon size={16} />
                        <span className="text-[11px]">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Time and Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                    Date & Heure *
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    required
                    className="w-full p-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] border border-black/5 dark:border-white/5 rounded-2xl text-xs text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#4F6CE8] transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                    Durée (minutes)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={240}
                    step={15}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 45)}
                    className="w-full p-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] border border-black/5 dark:border-white/5 rounded-2xl text-xs text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#4F6CE8] transition-all font-mono"
                  />
                </div>
              </div>

              {/* Contact Name & Role */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                    Nom du Décideur
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Nom complet"
                    className="w-full p-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] border border-black/5 dark:border-white/5 rounded-2xl text-xs text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#4F6CE8] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                    Fonction / Rôle
                  </label>
                  <input
                    type="text"
                    value={contactRole}
                    onChange={(e) => setContactRole(e.target.value)}
                    placeholder="Ex: Directeur Général"
                    className="w-full p-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] border border-black/5 dark:border-white/5 rounded-2xl text-xs text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#4F6CE8] transition-all"
                  />
                </div>
              </div>

              {/* Location or Meet Link */}
              {meetingType === 'PHYSICAL' ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                    Lieu / Adresse
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Adresse de la rencontre"
                    className="w-full p-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] border border-black/5 dark:border-white/5 rounded-2xl text-xs text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#4F6CE8] transition-all"
                  />
                </div>
              ) : meetingType === 'GOOGLE_MEET' ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                    Lien Google Meet
                  </label>
                  <input
                    type="url"
                    value={meetUrl}
                    onChange={(e) => setMeetUrl(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full p-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] border border-black/5 dark:border-white/5 rounded-2xl text-xs text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#4F6CE8] transition-all font-mono"
                  />
                </div>
              ) : null}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewAppointmentModalOpen(false)}
                  disabled={savingAppointment}
                  className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={savingAppointment}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 text-white rounded-full text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {savingAppointment ? (
                    <>
                      <Icons.Sparkles size={14} className="animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Icons.Check size={14} />
                      <span>Valider & Planifier</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 4. IN-VISIT LIVE VOCAL BRIEFING MODAL */}
      <KamVocalVisitModal
        isOpen={!!activeVocalAppointment}
        appointment={activeVocalAppointment}
        onClose={() => setActiveVocalAppointment(null)}
        onVisitCompleted={handleVisitCompleted}
      />

    </div>
  );
}
