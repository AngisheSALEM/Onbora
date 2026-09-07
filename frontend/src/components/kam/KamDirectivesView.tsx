"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';

export interface KamDirectiveItem {
  id: number;
  sender?: number;
  sender_name: string;
  sender_avatar?: string;
  recipient?: number;
  recipient_name: string;
  recipient_role?: string;
  recipient_avatar?: string;
  target_entity: 'KAM_OFFICE' | 'BACK_OFFICE';
  title: string;
  instruction: string;
  priority: 'NORMAL' | 'HIGH' | 'CRITICAL';
  priority_display?: string;
  status: 'SENT' | 'IN_PROGRESS' | 'COMPLETED';
  status_display?: string;
  target_account_name: string;
  acknowledgement_note: string;
  created_at: string;
  updated_at: string;
}

interface KamDirectivesViewProps {
  onDirectivesCountChange?: (count: number) => void;
}

export default function KamDirectivesView({ onDirectivesCountChange }: KamDirectivesViewProps) {
  const { user } = useAuth();
  const [directives, setDirectives] = useState<KamDirectiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SENT' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'NORMAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal response state
  const [selectedDirectiveToAck, setSelectedDirectiveToAck] = useState<KamDirectiveItem | null>(null);
  const [ackNote, setAckNote] = useState('');
  const [ackStatus, setAckStatus] = useState<'IN_PROGRESS' | 'COMPLETED'>('IN_PROGRESS');
  const [savingAck, setSavingAck] = useState(false);
  const [ackSuccessMsg, setAckSuccessMsg] = useState('');
  const [ackErrorMsg, setAckErrorMsg] = useState('');

  const loadDirectives = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Charger les directives assignées au KAM connecté ou ciblées vers KAM_OFFICE
      const data = await fetchAPI(`/api/sales/directives/?recipient_id=${user.id}`);
      let list: KamDirectiveItem[] = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data && Array.isArray(data.directives)) {
        list = data.directives;
      }
      
      // Si la liste spécifique par recipient_id est vide, charger aussi les directives KAM_OFFICE générales
      if (list.length === 0) {
        const generalData = await fetchAPI('/api/sales/directives/?target_entity=KAM_OFFICE');
        if (Array.isArray(generalData)) {
          list = generalData;
        } else if (generalData && Array.isArray(generalData.directives)) {
          list = generalData.directives;
        }
      }

      setDirectives(list);
      const pendingCount = list.filter(d => d.status === 'SENT').length;
      onDirectivesCountChange?.(pendingCount);
    } catch (err) {
      console.error("Erreur de chargement des directives KAM:", err);
    } finally {
      setLoading(false);
    }
  }, [user, onDirectivesCountChange]);

  useEffect(() => {
    loadDirectives();
  }, [loadDirectives]);

  const handleSaveAck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDirectiveToAck) return;
    setSavingAck(true);
    setAckSuccessMsg('');
    setAckErrorMsg('');

    try {
      const res = await fetchAPI(`/api/sales/directives/${selectedDirectiveToAck.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: ackStatus,
          acknowledgement_note: ackNote.trim(),
        }),
      });

      setDirectives((prev) =>
        prev.map((d) =>
          d.id === selectedDirectiveToAck.id
            ? { ...d, status: ackStatus, acknowledgement_note: ackNote.trim() }
            : d
        )
      );

      setAckSuccessMsg("Réponse et compte-rendu transmis avec succès.");
      setTimeout(() => {
        setSelectedDirectiveToAck(null);
        setAckSuccessMsg('');
      }, 1000);
    } catch (err) {
      console.error("Erreur lors de l'émargement de la directive:", err);
      setAckErrorMsg("Erreur lors de l'enregistrement de votre réponse.");
    } finally {
      setSavingAck(false);
    }
  };

  const filteredDirectives = useMemo(() => {
    return directives.filter((d) => {
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && d.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = d.title.toLowerCase().includes(q);
        const matchInstruction = d.instruction.toLowerCase().includes(q);
        const matchAccount = d.target_account_name?.toLowerCase().includes(q);
        const matchSender = d.sender_name?.toLowerCase().includes(q);
        if (!matchTitle && !matchInstruction && !matchAccount && !matchSender) return false;
      }
      return true;
    });
  }, [directives, statusFilter, priorityFilter, searchQuery]);

  return (
    <div className="flex-1 flex flex-col gap-6 p-8 overflow-y-auto select-none font-sans">
      
      {/* Top Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-black/5 dark:border-white/5">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Directives & Messages Stratégiques
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Consignes opérationnelles assignées par la Direction KAM Office et le Super Admin.
          </p>
        </div>

        <button
          onClick={loadDirectives}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F6F5F2] dark:bg-[#2D2A2D] hover:bg-white dark:hover:bg-[#363336] text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-black/5 dark:border-white/5 transition-all cursor-pointer shadow-xs active:scale-95"
          title="Actualiser la liste des directives"
        >
          <Icons.RefreshCw size={14} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Filter Bar (Backoffice style) */}
      <div className="p-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 flex-wrap shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA] mr-1">
            Statut :
          </span>
          {[
            { id: 'ALL', label: 'Toutes' },
            { id: 'SENT', label: 'Nouvelles' },
            { id: 'IN_PROGRESS', label: 'En cours' },
            { id: 'COMPLETED', label: 'Traitées' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-[#4F6CE8] text-white shadow-xs'
                  : 'bg-white dark:bg-[#363336] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-black/5 dark:border-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}

          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA] ml-3 mr-1">
            Priorité :
          </span>
          {[
            { id: 'ALL', label: 'Toutes' },
            { id: 'CRITICAL', label: 'Critique' },
            { id: 'HIGH', label: 'Haute' },
            { id: 'NORMAL', label: 'Normale' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setPriorityFilter(f.id as any)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                priorityFilter === f.id
                  ? 'bg-[#4F6CE8] text-white shadow-xs'
                  : 'bg-white dark:bg-[#363336] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-black/5 dark:border-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="text-xs font-bold text-[#4F6CE8] bg-[#4F6CE8]/10 px-3 py-1 rounded-xl">
          {filteredDirectives.length} directive(s)
        </span>
      </div>

      {/* Directives Cards Feed */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
          <span className="text-xs text-zinc-500 font-semibold">Chargement des directives assignées...</span>
        </div>
      ) : filteredDirectives.length === 0 ? (
        <div className="p-16 text-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#4F6CE8]/10 text-[#4F6CE8] flex items-center justify-center">
            <Icons.CheckCircle size={24} />
          </div>
          <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
            Aucune directive correspondante
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
            Toutes les instructions opérationnelles sont traitées ou aucun message n'est en attente de réponse.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredDirectives.map((directive) => {
            const isCompleted = directive.status === 'COMPLETED';
            const isInProgress = directive.status === 'IN_PROGRESS';

            return (
              <div
                key={directive.id}
                className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-3.5 shadow-2xs"
              >
                {/* En-tête de la carte avec Bitmojis Expéditeur & Destinataire */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Bitmoji de l'expéditeur (Super Admin / Manager) */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#4F6CE8]/10 flex items-center justify-center overflow-hidden shrink-0 border border-black/5 dark:border-white/5">
                        <img
                          src={`/memojis/${(directive.sender_avatar || 'memoji_056.png').replace('assets/memojis/', '')}`}
                          alt="Expéditeur"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-[#242124] dark:text-white">
                          Émis par {directive.sender_name || 'Direction KAM Office'}
                        </span>
                        <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                          {new Date(directive.created_at).toLocaleDateString('fr-FR')} à {new Date(directive.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Bitmoji du destinataire (Le KAM connecté) */}
                    <div className="flex items-center gap-2 sm:ml-4 sm:pl-4 sm:border-l border-black/10 dark:border-white/10">
                      <div className="w-7 h-7 rounded-full bg-[#4F6CE8]/10 flex items-center justify-center overflow-hidden shrink-0 border border-black/5 dark:border-white/5">
                        <img
                          src={`/memojis/${(user?.avatar || directive.recipient_avatar || 'memoji_044.png').replace('assets/memojis/', '')}`}
                          alt="Destinataire"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[11px] text-zinc-700 dark:text-zinc-300">
                          Assigné à : <strong className="font-bold">{directive.recipient_name || user?.username}</strong>
                        </span>
                        <span className="text-[9px] text-zinc-400">
                          Key Account Manager
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges de priorité et de statut */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        directive.priority === 'CRITICAL'
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                          : directive.priority === 'HIGH'
                          ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white'
                          : 'bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      {directive.priority === 'CRITICAL' ? 'Priorité Critique' : directive.priority === 'HIGH' ? 'Priorité Haute' : 'Priorité Normale'}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : isInProgress
                          ? 'bg-[#4F6CE8]/15 text-[#4F6CE8]'
                          : 'bg-black/5 dark:bg-white/10 text-zinc-500'
                      }`}
                    >
                      {isCompleted ? "Traitée" : isInProgress ? "En cours" : "Nouvelle directive"}
                    </span>
                  </div>
                </div>

                {/* Contenu et instruction de la directive */}
                <div className="flex flex-col gap-1.5">
                  <h4 className="font-extrabold text-sm text-[#242124] dark:text-white">
                    {directive.title}
                  </h4>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                    {directive.instruction}
                  </p>
                  {directive.target_account_name && (
                    <span className="text-[11px] text-[#4F6CE8] font-semibold mt-1">
                      Compte client concerné : {directive.target_account_name}
                    </span>
                  )}
                </div>

                {/* Compte-rendu d'exécution / Réponse du KAM */}
                {directive.acknowledgement_note && (
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 text-xs text-zinc-700 dark:text-zinc-300 mt-1 space-y-1">
                    <span className="font-bold text-[#4F6CE8] block">
                      Votre réponse / compte-rendu transmis à la Direction :
                    </span>
                    <p className="whitespace-pre-line leading-relaxed">
                      {directive.acknowledgement_note}
                    </p>
                  </div>
                )}

                {/* Bouton d'action Répondre / Traiter */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedDirectiveToAck(directive);
                      setAckNote(directive.acknowledgement_note || '');
                      setAckStatus(directive.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS');
                    }}
                    className="px-4 py-2 rounded-xl bg-[#4F6CE8] hover:bg-[#3E5AC8] active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-sm shadow-[#4F6CE8]/20 flex items-center gap-2"
                  >
                    <Icons.MessageSquare size={14} />
                    <span>{isCompleted ? "Mettre à jour mon compte-rendu" : "Prendre en charge / Répondre"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE : RÉPONDRE / ÉMARGER UNE DIRECTIVE ASSIGNÉE                         */}
      {/* ========================================================================= */}
      {selectedDirectiveToAck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-2xl border border-black/10 dark:border-white/10 flex flex-col gap-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Répondre à la Directive
                </h3>
                <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] truncate max-w-sm">
                  {selectedDirectiveToAck.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedDirectiveToAck(null)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 cursor-pointer"
              >
                <Icons.X size={16} />
              </button>
            </div>

            {ackSuccessMsg && (
              <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Icons.CheckCircle size={15} />
                <span>{ackSuccessMsg}</span>
              </div>
            )}

            {ackErrorMsg && (
              <div className="p-3 rounded-2xl bg-red-500/15 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                <Icons.AlertCircle size={15} />
                <span>{ackErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveAck} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Statut de traitement
                </label>
                <select
                  value={ackStatus}
                  onChange={(e) => setAckStatus(e.target.value as any)}
                  className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="IN_PROGRESS">En cours de traitement</option>
                  <option value="COMPLETED">Traité & Complété</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Votre compte-rendu / réponse pour la Direction
                </label>
                <textarea
                  required
                  rows={4}
                  value={ackNote}
                  onChange={(e) => setAckNote(e.target.value)}
                  placeholder="Détaillez les actions entreprises auprès du compte, le résultat de la visite ou les blocages rencontrés..."
                  className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl p-3 text-xs font-medium text-zinc-900 dark:text-white outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDirectiveToAck(null)}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-[#363336] text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/5 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingAck}
                  className="px-5 py-2 rounded-xl bg-[#4F6CE8] hover:bg-[#3E5AC8] text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50 shadow-sm shadow-[#4F6CE8]/20"
                >
                  {savingAck ? "Envoi en cours..." : "Transmettre ma réponse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
