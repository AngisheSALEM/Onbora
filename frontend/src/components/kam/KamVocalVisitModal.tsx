"use client";

import React, { useState, useEffect, useRef } from 'react';
import { fetchAPI, uploadAudioAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';

export interface AppointmentData {
  id: number;
  enterprise_id: number;
  enterprise_name: string;
  crm_id: string;
  sector: string;
  title: string;
  meeting_type: 'PHYSICAL' | 'GOOGLE_MEET' | 'CALL';
  meeting_type_label: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string;
  meet_url: string;
  contact_name: string;
  contact_role: string;
  objective: string;
  status: string;
  status_label: string;
  has_report: boolean;
  report_id?: number | null;
}

interface KamVocalVisitModalProps {
  isOpen: boolean;
  appointment: AppointmentData | null;
  onClose: () => void;
  onVisitCompleted: (report: any) => void;
}

function getSupportedAudioMime(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return '';
  const mimes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
    'audio/wav'
  ];
  for (const m of mimes) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

export default function KamVocalVisitModal({
  isOpen,
  appointment,
  onClose,
  onVisitCompleted
}: KamVocalVisitModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [writtenNotes, setWrittenNotes] = useState('');
  const [conversionStatus, setConversionStatus] = useState('IN_NEGOTIATION');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isInsufficientAudio, setIsInsufficientAudio] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer actif uniquement lors de l'enregistrement audio réel
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Réinitialisation lors de l'ouverture / fermeture de la modale
  useEffect(() => {
    if (isOpen) {
      setRecordingSeconds(0);
      setVoiceTranscript('');
      setWrittenNotes('');
      setIsRecording(false);
      setIsTranscribing(false);
      setIsInsufficientAudio(false);
      setErrorMsg('');
      setSuccessMsg('');
    } else {
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }
  }, [isOpen]);

  const sendAudioToWhisper = async (audioBlob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('wav') ? 'wav' : 'webm';
      const formData = new FormData();
      formData.append('audio', audioBlob, `visit_recording.${extension}`);

      const data = await uploadAudioAPI('/api/kam/transcribe/', formData);

      if (data && data.transcript && data.transcript.trim()) {
        const text = data.transcript.trim();
        setVoiceTranscript((prev) => (prev.trim() ? `${prev.trim()}\n${text}` : text));
        setIsInsufficientAudio(Boolean(data.is_insufficient));
        setSuccessMsg("Transcription Whisper reçue avec succès !");
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setIsInsufficientAudio(true);
        setErrorMsg("Aucune voix distincte détectée dans l'audio. Vous pouvez compléter vos notes par écrit.");
      }
    } catch (err: any) {
      console.error("Erreur transcription Whisper:", err);
      setErrorMsg(`Erreur transcription : ${err.message || 'Impossible de joindre le serveur'}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsInsufficientAudio(false);
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg("Votre navigateur ne prend pas en charge l'enregistrement audio direct.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;

      const mimeType = getSupportedAudioMime();
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const actualType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualType });
        if (audioBlob.size > 100) {
          await sendAudioToWhisper(audioBlob, actualType);
        } else {
          setErrorMsg("Prise de son trop brève : aucun signal exploitable.");
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
    } catch (err: any) {
      console.error("Erreur accès micro:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg("Accès au microphone refusé. Veuillez autoriser l'accès au micro dans votre navigateur.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMsg("Aucun microphone détecté sur cet appareil.");
      } else {
        setErrorMsg(`Impossible d'activer le microphone : ${err.message || 'erreur'}`);
      }
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.requestData();
        }
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("Erreur arrêt MediaRecorder:", e);
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleAppendChip = (chipText: string) => {
    setWrittenNotes((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n• ${chipText}` : `• ${chipText}`;
    });
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCompleteMeetingWithAI = async () => {
    if (!appointment) return;
    if (isRecording) {
      stopRecording();
    }

    const vText = voiceTranscript.trim();
    const nText = writtenNotes.trim();

    if (!vText && !nText) {
      setErrorMsg("Veuillez enregistrer une note vocale ou saisir vos observations avant de finaliser.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetchAPI(`/api/kam/appointments/${appointment.id}/complete-vocal/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: vText,
          notes: nText,
          conversion_status: conversionStatus,
        })
      });

      if (res && res.report) {
        onVisitCompleted(res.report);
      } else {
        setErrorMsg("Une erreur est survenue lors de la génération Core AI.");
      }
    } catch (err: any) {
      console.error("Erreur clôture vocale RDV:", err);
      setErrorMsg(err.message || "Impossible de générer le rapport Core AI. Vérifiez votre session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !appointment) return null;

  const totalWords = `${voiceTranscript} ${writtenNotes}`.split(/\s+/).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#ECEAE5] dark:bg-[#242124] text-zinc-900 dark:text-white w-full max-w-3xl rounded-[32px] border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden animate-scale-up max-h-[92vh]">
        
        {/* Top Header */}
        <div className="p-5 border-b border-black/5 dark:border-white/5 bg-[#F6F5F2] dark:bg-[#2D2A2D] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4F6CE8]/15 text-[#4F6CE8] flex items-center justify-center font-extrabold text-sm">
              <Icons.Mic size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                  Clôture & Synthèse IA du Rendez-vous
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  OpenAI Whisper + Core AI
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {appointment.enterprise_name} • {appointment.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[72vh]">
          
          {/* Audio Visualizer & Recording Console */}
          <div className="p-6 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 flex flex-col items-center justify-center gap-3 text-center shadow-xs">
            
            {/* Waveform visual */}
            <div className="flex items-center gap-1.5 h-8">
              {[30, 60, 90, 45, 100, 75, 40, 85, 55, 95, 35, 70, 80].map((h, i) => (
                <div
                  key={i}
                  style={{ height: isRecording ? `${h}%` : '20%' }}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isRecording ? 'bg-[#4F6CE8] animate-pulse' : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={toggleRecording}
              disabled={isTranscribing || isSubmitting}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md disabled:opacity-50 ${
                isRecording
                  ? 'bg-rose-600 text-white ring-8 ring-rose-500/20 animate-pulse scale-105'
                  : 'bg-[#4F6CE8] hover:bg-[#3D57C5] text-white active:scale-95'
              }`}
              title={isRecording ? "Arrêter la dictée et transcrire" : "Démarrer l'enregistrement vocal"}
            >
              {isRecording ? <Icons.Square size={24} /> : <Icons.Mic size={26} />}
            </button>

            <div>
              <div className="text-2xl font-mono font-extrabold text-zinc-900 dark:text-white">
                {formatTimer(recordingSeconds)}
              </div>
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 block mt-1">
                {isRecording
                  ? "Enregistrement en cours... Cliquez sur le carré rouge pour transcrire via Whisper."
                  : isTranscribing
                  ? "Transcription audio OpenAI Whisper en cours..."
                  : recordingSeconds > 0
                  ? "Dictée terminée. Vous pouvez reprendre la parole ou finaliser."
                  : "Cliquez sur le micro pour dicter vos observations."}
              </span>
            </div>

            {isTranscribing && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4F6CE8]/10 text-[#4F6CE8] text-xs font-semibold animate-pulse border border-[#4F6CE8]/20">
                <Icons.Sparkles size={14} className="animate-spin" />
                <span>Traitement acoustique OpenAI Whisper...</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                <Icons.CheckCircle size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {isInsufficientAudio && !isRecording && !isTranscribing && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-medium text-left flex items-center gap-2">
                <Icons.AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Propos courts ou salutation simple : aucun besoin technique n&apos;a été inventé. Vos notes ci-dessous serviront à enrichir la qualification.</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs font-medium text-left flex items-center gap-2 w-full">
                <Icons.AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Section 1 : Transcription Vocale OpenAI Whisper */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                <Icons.Mic size={12} className="text-[#4F6CE8]" />
                <span>1. Transcription Vocale Reçue (OpenAI Whisper)</span>
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">
                {voiceTranscript.split(/\s+/).filter(Boolean).length} mots
              </span>
            </div>
            <textarea
              value={voiceTranscript}
              onChange={(e) => setVoiceTranscript(e.target.value)}
              placeholder="La transcription de vos dictées Whisper apparaîtra ici au fur et à mesure. Vous pouvez également ajuster le texte directement."
              rows={3}
              className="w-full p-3.5 rounded-2xl bg-[#F6F5F2] dark:bg-[#2D2A2D] border border-black/5 dark:border-white/5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-[#4F6CE8] transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Section 2 : Notes & Observations Complémentaires (Écrites) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                <Icons.FileText size={12} className="text-emerald-500" />
                <span>2. Notes & Précisions Écrites du KAM</span>
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">
                {writtenNotes.split(/\s+/).filter(Boolean).length} mots
              </span>
            </div>
            <textarea
              value={writtenNotes}
              onChange={(e) => setWrittenNotes(e.target.value)}
              placeholder="Saisissez vos observations manuelles, montants négociés, objections spécifiques ou points à ne pas oublier..."
              rows={3}
              className="w-full p-3.5 rounded-2xl bg-[#F6F5F2] dark:bg-[#2D2A2D] border border-black/5 dark:border-white/5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Quick Context Injection Chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
              Puces Rapides (Injectées dans vos notes écrites) :
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Besoin Fibre Optique Dédiée 50 Mbps",
                "Coupures et instabilité chez l'opérateur en place",
                "Budget mensuel télécoms validé",
                "Décisionnaire signataire présent",
                "Secours 4G avec basculement automatique demandé",
                "Étude d'éligibilité souhaitée sous 48h",
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAppendChip(chip)}
                  className="px-2.5 py-1 bg-[#E4E1DB] dark:bg-[#363336] hover:bg-white dark:hover:bg-[#403C40] text-zinc-700 dark:text-zinc-300 text-[11px] font-medium rounded-lg border border-black/5 dark:border-white/5 transition-all cursor-pointer"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Issue Commerciale de la Visite */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
              Issue Commerciale de la Visite
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { id: 'IN_NEGOTIATION', label: 'En négociation' },
                { id: 'CONVERTED', label: 'Contrat Signé' },
                { id: 'PROSPECT', label: 'Prospect' },
                { id: 'LOST', label: 'Non retenu' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setConversionStatus(st.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border text-center ${
                    conversionStatus === st.id
                      ? 'bg-[#4F6CE8] text-white border-[#4F6CE8] shadow-sm font-extrabold'
                      : 'bg-[#F6F5F2] dark:bg-[#2D2A2D] text-zinc-700 dark:text-zinc-300 border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-[#363336]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Total Verbatim Notice */}
          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-500/20 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icons.Sparkles size={14} className="text-[#4F6CE8] shrink-0" />
              <span>Core AI qualifiera l&apos;ensemble cumulé : <strong>{voiceTranscript ? 'Voix Whisper' : 'Pas de voix'}</strong> + <strong>{writtenNotes ? 'Notes écrites' : 'Pas de notes'}</strong></span>
            </div>
            <span className="font-mono font-bold text-xs">{totalWords} mots au total</span>
          </div>

        </div>

        {/* Action Footer */}
        <div className="p-5 border-t border-black/5 dark:border-white/5 bg-[#F6F5F2] dark:bg-[#2D2A2D] flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
          >
            Annuler
          </button>

          <button
            onClick={handleCompleteMeetingWithAI}
            disabled={isSubmitting || isTranscribing || totalWords === 0}
            className="px-6 py-2.5 rounded-full bg-[#4F6CE8] hover:bg-[#3D57C5] text-white text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Icons.Sparkles size={16} className="animate-spin" />
                <span>Génération Core AI...</span>
              </>
            ) : (
              <>
                <Icons.CheckCircle size={16} />
                <span>Finaliser & Générer Rapport ({totalWords} mots)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
