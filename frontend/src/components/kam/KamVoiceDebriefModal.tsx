"use client";

import React, { useState, useEffect } from 'react';
import { StrategicVisit, MeetingDebrief } from './kamTypes';
import { mockDebriefs } from './kamMockData';
import { Icons } from '@/components/shared/Icons';

interface KamVoiceDebriefModalProps {
  visit: StrategicVisit | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function KamVoiceDebriefModal({
  visit,
  isOpen,
  onClose
}: KamVoiceDebriefModalProps) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [debriefData, setDebriefData] = useState<MeetingDebrief | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (isOpen && visit) {
      const existing = mockDebriefs[visit.id];
      if (existing) {
        setDebriefData(existing);
      } else {
        setDebriefData(null);
      }
    }
  }, [isOpen, visit]);

  if (!isOpen || !visit) return null;

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
  };

  const handleStopAndGenerate = () => {
    setIsRecording(false);
    setIsGenerating(true);

    setTimeout(() => {
      setIsGenerating(false);
      // Generate synthetic debrief
      const newDebrief: MeetingDebrief = mockDebriefs['visit-sgb-01'] || {
        visit_id: visit.id,
        account_name: visit.account_name,
        date: new Date().toLocaleString('fr-FR'),
        audio_duration_seconds: recordingSeconds,
        transcript_text: '« Rendez-vous de travail très constructif avec les décideurs. Accord pour avancer sur l\'audit technique et remise de proposition sous 5 jours. »',
        executive_summary: 'Réunion positive. Forte réceptivité aux offres souveraines Orange. Priorisation d\'un PoC pilote.',
        client_followup_email: {
          subject: `Remerciements & Synthèse — ${visit.account_name} / Orange Business`,
          body: `Bonjour,\n\nJe vous remercie pour le temps accordé ce jour...\n\nBien cordialement,\nSalem`
        },
        commitments_extracted: [
          { id: 'deb-gen-1', action: 'Transmettre la proposition technique détaillée', owner: 'Salem (KAM)', due_date: '2026-09-08', status: 'IN_PROGRESS' }
        ],
        risk_level: 'LOW',
        next_step_recommendation: 'Valider le devis avec l\'équipe avant-vente.'
      };
      setDebriefData(newDebrief);
    }, 1800);
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyEmail = () => {
    if (!debriefData) return;
    navigator.clipboard.writeText(`${debriefData.client_followup_email.subject}\n\n${debriefData.client_followup_email.body}`);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-white dark:bg-[#121215] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-zinc-50 dark:bg-[#1C1C1E] border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md">
              <Icons.Mic size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-white">
                Dictaphone de Débriefing Post-Visite — {visit.account_name}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Dictez vos impressions en sortant de réunion. L&apos;IA structure le CR, l&apos;email client et les engagements.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <Icons.Close size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          
          {/* Recording Control Console */}
          <div className="p-6 bg-gradient-to-br from-zinc-900 to-black text-white rounded-3xl border border-white/10 flex flex-col items-center justify-center text-center shadow-lg">
            
            {/* Waveform / Status visual */}
            <div className="flex items-center gap-1.5 h-10 mb-3">
              {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95, 30, 65, 85].map((h, i) => (
                <div
                  key={i}
                  style={{ height: isRecording ? `${h}%` : '20%' }}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isRecording ? 'bg-red-500 animate-pulse' : 'bg-zinc-700'
                  }`}
                />
              ))}
            </div>

            {/* Timer */}
            <div className="text-2xl md:text-3xl font-mono font-black mb-4">
              {formatTimer(recordingSeconds)}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-black rounded-full shadow-lg transition-all"
                >
                  <Icons.Mic size={16} />
                  <span>Démarrer l&apos;enregistrement vocal</span>
                </button>
              ) : (
                <button
                  onClick={handleStopAndGenerate}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-zinc-200 active:scale-95 text-xs font-black rounded-full shadow-lg transition-all"
                >
                  <Icons.Square size={16} className="text-red-600" />
                  <span>Arrêter et Synthétiser par l&apos;IA</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 mt-3">
              {isRecording ? (
                <>
                  <Icons.Mic size={13} className="text-rose-500 animate-pulse" />
                  <span>Enregistrement en cours... Parlez naturellement de vos impressions et engagements.</span>
                </>
              ) : (
                <>
                  <Icons.Sparkles size={13} className="text-[#4F6CE8]" />
                  <span>Astuce : Mentionnez les noms des décideurs présents et les dates limites clés.</span>
                </>
              )}
            </div>
          </div>

          {/* AI Loader */}
          {isGenerating && (
            <div className="p-8 text-center bg-zinc-50 dark:bg-[#1C1C1E] rounded-2xl border border-black/5 dark:border-white/10 animate-pulse">
              <Icons.Sparkles size={32} className="mx-auto text-blue-500 mb-2 animate-spin" />
              <div className="font-bold text-sm text-zinc-900 dark:text-white">
                Synthèse IA en cours par Onbora Intel Engine...
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                Extraction des engagements, calcul du risque et rédaction de l&apos;email client.
              </div>
            </div>
          )}

          {/* Debrief Results */}
          {debriefData && !isGenerating && (
            <div className="space-y-6 animate-fade-in">
              
              {/* 1. Executive Summary & Transcript */}
              <div className="p-5 bg-zinc-50 dark:bg-[#1C1C1E] rounded-2xl border border-black/5 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icons.FileText size={16} className="text-blue-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Compte-Rendu Exécutif C-Level
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Risque Détecté : {debriefData.risk_level}
                  </span>
                </div>

                <p className="text-xs text-zinc-800 dark:text-zinc-200 font-semibold leading-relaxed">
                  {debriefData.executive_summary}
                </p>

                <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5 text-[11px] text-zinc-500 italic">
                  <strong>Transcription brute : </strong> {debriefData.transcript_text}
                </div>
              </div>

              {/* 2. Engagements & Actions Tracker */}
              <div className="p-5 bg-zinc-50 dark:bg-[#1C1C1E] rounded-2xl border border-black/5 dark:border-white/10 space-y-3">
                <div className="flex items-center gap-2">
                  <Icons.CheckCircle size={16} className="text-emerald-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Engagements Extraits ({debriefData.commitments_extracted.length})
                  </h3>
                </div>

                <div className="space-y-2">
                  {debriefData.commitments_extracted.map((c) => (
                    <div key={c.id} className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        <span className="font-bold text-zinc-900 dark:text-white">{c.action}</span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] shrink-0">
                        <span className="text-zinc-500 font-medium">Resp : <strong className="text-zinc-800 dark:text-zinc-200">{c.owner}</strong></span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                          Pour le {c.due_date}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Follow-up Client Email */}
              <div className="p-5 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icons.Mail size={16} className="text-blue-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Email de Suivi Client (Prêt à Envoyer)
                    </h3>
                  </div>

                  <button
                    onClick={handleCopyEmail}
                    className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[11px] font-bold rounded-lg transition-all shadow-sm"
                  >
                    <Icons.FileEdit size={13} />
                    <span>{copiedEmail ? 'Copié !' : 'Copier l\'Email'}</span>
                  </button>
                </div>

                <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5 text-xs text-zinc-800 dark:text-zinc-200 font-sans whitespace-pre-line leading-relaxed shadow-sm">
                  <strong className="block text-zinc-900 dark:text-white mb-2 pb-2 border-b border-black/5 dark:border-white/5">
                    Objet : {debriefData.client_followup_email.subject}
                  </strong>
                  {debriefData.client_followup_email.body}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
