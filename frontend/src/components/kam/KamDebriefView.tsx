"use client";

import React, { useState } from 'react';
import { StrategicVisit, MeetingDebrief } from './kamTypes';
import { mockDebriefs } from './kamMockData';
import { Icons } from '@/components/shared/Icons';

interface KamDebriefViewProps {
  visits: StrategicVisit[];
  selectedVisitId: string;
  onSelectVisitId: (id: string) => void;
}

export default function KamDebriefView({
  visits,
  selectedVisitId,
  onSelectVisitId
}: KamDebriefViewProps) {
  const selectedVisit = visits.find((v) => v.id === selectedVisitId) || visits[0];
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [debriefData, setDebriefData] = useState<MeetingDebrief | null>(
    mockDebriefs[selectedVisit.id] || mockDebriefs['visit-sgb-01']
  );

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
  };

  const handleStopAndGenerate = () => {
    setIsRecording(false);
    setIsGenerating(true);

    setTimeout(() => {
      setIsGenerating(false);
      setDebriefData(mockDebriefs['visit-sgb-01']);
    }, 1500);
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
    <div className="flex-1 flex flex-col gap-6 p-8 overflow-y-auto select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-white/5">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Débriefing Vocal Post-Visite & Assistant IA
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Dictez vos notes après le rendez-vous. L&apos;IA génère le compte-rendu, l&apos;email client et les engagements.
          </p>
        </div>

        {/* Account Selector */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
          {visits.map((v) => {
            const isSelected = v.id === selectedVisit.id;
            return (
              <button
                key={v.id}
                onClick={() => {
                  onSelectVisitId(v.id);
                  setDebriefData(mockDebriefs[v.id] || mockDebriefs['visit-sgb-01']);
                }}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md font-black'
                    : 'bg-[#F6F5F2] dark:bg-[#2D2A2D] text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-[#363336] shadow-sm'
                }`}
              >
                {v.account_name.split(' (')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Voice Recording Console (Cobalt Blue Focus) */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[32px] p-8 flex flex-col items-center justify-center text-center shadow-sm border border-black/5 dark:border-white/5 space-y-4">
        <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 shadow-inner">
          <Icons.Mic size={28} className={isRecording ? 'animate-pulse text-blue-600' : ''} />
        </div>

        <div>
          <span className="text-xs uppercase font-bold text-zinc-500 dark:text-zinc-400 block">
            Débriefing pour {selectedVisit.account_name}
          </span>
          <div className="text-3xl font-mono font-black text-zinc-900 dark:text-white mt-1">
            {formatTimer(recordingSeconds)}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black rounded-full shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Icons.Mic size={16} />
              <span>Démarrer l&apos;enregistrement vocal</span>
            </button>
          ) : (
            <button
              onClick={handleStopAndGenerate}
              className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 text-xs font-black rounded-full shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Icons.Square size={16} className="text-blue-600" />
              <span>Arrêter et Générer les Livrables IA</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 max-w-md">
          {isRecording ? (
            <>
              <Icons.Mic size={14} className="text-rose-500 shrink-0 animate-pulse" />
              <span>Enregistrement en cours... Parlez librement des points clés et des accords obtenus.</span>
            </>
          ) : (
            <>
              <Icons.Sparkles size={14} className="text-[#4F6CE8] shrink-0" />
              <span>Parlez pendant 2 minutes. Onbora structure automatiquement le compte-rendu interne et le brouillon d&apos;email client.</span>
            </>
          )}
        </div>
      </div>

      {/* AI Loader */}
      {isGenerating && (
        <div className="p-8 text-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl animate-pulse space-y-2 shadow-sm">
          <Icons.Sparkles size={32} className="mx-auto text-[#4F6CE8] animate-spin" />
          <div className="font-bold text-sm text-zinc-900 dark:text-white">
            Synthèse IA en cours par Onbora Intel Engine...
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Extraction des engagements, calcul du risque et rédaction de l&apos;email client.
          </div>
        </div>
      )}

      {/* Debrief AI Deliverables */}
      {debriefData && !isGenerating && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Deliverable 1 : Executive Summary & Commitments */}
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 flex flex-col gap-5 shadow-sm border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icons.FileText size={16} className="text-blue-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Compte-Rendu Stratégique C-Level
                </h4>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200/50 dark:border-emerald-500/20">
                Risque : {debriefData.risk_level}
              </span>
            </div>

            <p className="text-xs text-zinc-800 dark:text-zinc-200 font-semibold leading-relaxed">
              {debriefData.executive_summary}
            </p>

            <div className="p-3.5 bg-[#E4E1DB] dark:bg-[#363336] rounded-2xl text-[11px] text-zinc-600 dark:text-zinc-400 italic">
              <strong>Transcription : </strong> {debriefData.transcript_text}
            </div>

            {/* Commitments */}
            <div className="pt-4 border-t border-zinc-200/60 dark:border-white/5 space-y-3">
              <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider block">
                Engagements & Échéances ({debriefData.commitments_extracted.length}) :
              </span>
              <div className="space-y-2">
                {debriefData.commitments_extracted.map((c) => (
                  <div key={c.id} className="p-3 bg-[#E4E1DB] dark:bg-[#363336] rounded-2xl flex items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-zinc-900 dark:text-white">{c.action}</span>
                    <span className="text-blue-600 dark:text-blue-400 font-mono text-[11px] shrink-0 font-bold">{c.due_date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Deliverable 2 : Client Followup Email Ready to Send */}
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 flex flex-col justify-between shadow-sm border border-black/5 dark:border-white/5 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.Mail size={16} className="text-blue-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Email de Suivi Client (Prêt à l&apos;Envoi)
                  </h4>
                </div>

                <button
                  onClick={handleCopyEmail}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Icons.FileEdit size={13} />
                  <span>{copiedEmail ? 'Copié !' : 'Copier l\'Email'}</span>
                </button>
              </div>

              <div className="p-4 bg-[#E4E1DB] dark:bg-[#363336] rounded-2xl text-xs text-zinc-700 dark:text-zinc-300 font-sans whitespace-pre-line leading-relaxed">
                <strong className="block text-zinc-900 dark:text-white mb-2 pb-2 border-b border-zinc-300/60 dark:border-white/5">
                  Objet : {debriefData.client_followup_email.subject}
                </strong>
                {debriefData.client_followup_email.body}
              </div>
            </div>

            <div className="p-3 bg-[#E4E1DB] dark:bg-[#363336] rounded-2xl text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
              <span>Prochaine action recommandée :</span>
              <strong className="text-zinc-900 dark:text-white">{debriefData.next_step_recommendation}</strong>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
