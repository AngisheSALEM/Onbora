"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StrategicVisit, MeetingDebrief } from './kamTypes';
import { Icons } from '@/components/shared/Icons';
import { fetchAPI, uploadAudioAPI } from '@/lib/api';
import { evaluateVerbatimQuality } from './KamVocalVisitModal';

interface KamVoiceDebriefModalProps {
  visit: StrategicVisit | null;
  isOpen: boolean;
  onClose: () => void;
  onDebriefSaved?: (updatedVisit: StrategicVisit) => void;
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

export default function KamVoiceDebriefModal({
  visit,
  isOpen,
  onClose,
  onDebriefSaved
}: KamVoiceDebriefModalProps) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [writtenNotes, setWrittenNotes] = useState<string>('');
  const [conversionStatus, setConversionStatus] = useState<string>('IN_NEGOTIATION');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isInsufficientAudio, setIsInsufficientAudio] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [debriefData, setDebriefData] = useState<MeetingDebrief | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const stopRecording = useCallback(() => {
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
  }, []);

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

  // Load existing debrief when modal opens
  useEffect(() => {
    if (isOpen && visit) {
      setRecordingSeconds(0);
      setIsRecording(false);
      setIsTranscribing(false);
      setIsInsufficientAudio(false);
      setDebriefData(null);
      setErrorMessage('');
      setSuccessMessage('');
      const accountId = visit.account_id || visit.id.replace('account-', '');
      setConversionStatus(visit.conversion_status || 'IN_NEGOTIATION');
      setWrittenNotes(visit.conversion_notes || '');
      setVoiceTranscript('');

      fetchAPI(`/api/kam/accounts/${accountId}/debrief/`)
        .then((res) => {
          if (res && res.debrief) {
            setDebriefData(res.debrief);
            if (res.debrief.transcript_text && !visit.conversion_notes) {
              setVoiceTranscript(res.debrief.transcript_text);
            }
          }
        })
        .catch((err) => {
          console.warn("Pré-chargement débriefing existant:", err);
        });
    } else {
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }
  }, [isOpen, visit, stopRecording]);

  const sendAudioToWhisper = async (audioBlob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('wav') ? 'wav' : 'webm';
      const formData = new FormData();
      formData.append('audio', audioBlob, `debrief_recording.${extension}`);

      const data = await uploadAudioAPI('/api/kam/transcribe/', formData);

      if (data && data.transcript && data.transcript.trim()) {
        const text = data.transcript.trim();
        setVoiceTranscript((prev) => (prev.trim() ? `${prev.trim()}\n${text}` : text));
        setIsInsufficientAudio(Boolean(data.is_insufficient));
        setSuccessMessage("Transcription Whisper reçue et ajoutée avec succès !");
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setIsInsufficientAudio(true);
        setErrorMessage("Aucune voix distincte détectée dans l'enregistrement. Vous pouvez compléter vos notes par écrit.");
      }
    } catch (err: any) {
      console.error("Erreur transcription Whisper:", err);
      setErrorMessage(`Erreur transcription : ${err.message || 'Serveur indisponible'}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  if (!isOpen || !visit) return null;

  const handleStartRecording = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsInsufficientAudio(false);
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage("Votre navigateur ne prend pas en charge l'enregistrement audio direct.");
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
          setErrorMessage("Prise de son trop brève : aucun signal exploitable.");
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
    } catch (err: any) {
      console.error("Erreur accès micro:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage("Accès au microphone refusé. Veuillez autoriser le micro dans les paramètres du navigateur.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage("Aucun microphone détecté sur cet appareil.");
      } else {
        setErrorMessage(`Impossible d'activer le microphone : ${err.message || 'erreur'}`);
      }
      setIsRecording(false);
    }
  };

  const handleAddContextChip = (text: string) => {
    setWrittenNotes((prev) => {
      const separator = prev.trim().length > 0 ? '\n• ' : '• ';
      return prev + separator + text;
    });
  };

  const handleGenerateAI = async () => {
    if (isRecording) {
      stopRecording();
    }

    const vText = voiceTranscript.trim();
    const nText = writtenNotes.trim();

    if (!vText && !nText) {
      setErrorMessage("Veuillez enregistrer une dictée vocale ou saisir vos notes de débriefing avant de lancer l'analyse.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage('');
    setSuccessMessage('');

    const accountId = visit.account_id || visit.id.replace('account-', '');

    try {
      const res = await fetchAPI(`/api/kam/accounts/${accountId}/debrief/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generate_ai: true,
          audio_duration_seconds: Math.max(recordingSeconds, 15),
          transcript: vText,
          notes: nText,
          conversion_status: conversionStatus,
        })
      });

      if (res && res.debrief) {
        setDebriefData(res.debrief);
        if (res.visit && onDebriefSaved) {
          onDebriefSaved(res.visit);
        }
        setSuccessMessage("Rapport exécutif et analyse générés avec succès !");
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setErrorMessage("Une erreur est survenue lors de la synthèse Core AI.");
      }
    } catch (err: any) {
      console.error("Erreur génération débrief Core AI:", err);
      setErrorMessage(err.message || "Impossible de joindre le copilote Core AI. Vérifiez votre session.");
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyEmail = () => {
    if (!debriefData || !debriefData.client_followup_email) return;
    navigator.clipboard.writeText(`${debriefData.client_followup_email.subject}\n\n${debriefData.client_followup_email.body}`);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const quality = evaluateVerbatimQuality(voiceTranscript, writtenNotes);
  const totalWords = quality.totalWords;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto select-none">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#ECEAE5] dark:bg-[#242124] text-zinc-900 dark:text-white rounded-[32px] border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-[#F6F5F2] dark:bg-[#2D2A2D] border-b border-black/5 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4F6CE8]/15 text-[#4F6CE8] flex items-center justify-center font-extrabold text-sm shadow-xs">
              <Icons.Mic size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  Dictaphone de Débriefing Post-Visite — {visit.account_name}
                </h2>
               
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Dictez vos impressions ou notez vos observations. Core AI combinera les deux pour extraire besoins, engagements et email.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
          >
            <Icons.Close size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[72vh]">
          
          {/* Recording Control Console */}
          <div className="p-6 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 flex flex-col items-center justify-center text-center shadow-sm">
            
            {/* Waveform visual */}
            <div className="flex items-center gap-1.5 h-10 mb-3">
              {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95, 30, 65, 85].map((h, i) => (
                <div
                  key={i}
                  style={{ height: isRecording ? `${h}%` : '20%' }}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isRecording ? 'bg-[#4F6CE8] animate-pulse' : 'bg-zinc-400 dark:bg-zinc-600'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-extrabold text-zinc-500 dark:text-zinc-400 tracking-wider">
                {isRecording 
                  ? "Enregistrement en cours... Parlez normalement" 
                  : isTranscribing 
                  ? "Transcription OpenAI Whisper en cours..." 
                  : recordingSeconds > 0
                  ? "Dictée terminée. Vous pouvez reprendre ou générer."
                  : "Microphone en pause"}
              </span>
              {isTranscribing && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#4F6CE8]/10 text-[#4F6CE8] text-[10px] font-bold border border-[#4F6CE8]/20 animate-pulse">
                  <Icons.Sparkles size={10} className="animate-spin" />
                  <span>Whisper ASR</span>
                </span>
              )}
            </div>

            <div className="text-4xl font-mono font-extrabold text-zinc-900 dark:text-white mt-1">
              {formatTimer(recordingSeconds)}
            </div>

            <div className="flex items-center gap-3 mt-4">
              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  disabled={isTranscribing || isGenerating}
                  className="px-6 py-2.5 bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 text-white text-xs font-semibold rounded-full shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <Icons.Mic size={16} />
                  <span>{recordingSeconds > 0 ? "Reprendre la dictée vocale" : "Activer le Dictaphone Vocal"}</span>
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-semibold rounded-full shadow-md transition-all cursor-pointer flex items-center gap-2 animate-pulse"
                >
                  <Icons.Square size={16} />
                  <span>Arrêter & Transcrire via Whisper</span>
                </button>
              )}

              <button
                onClick={handleGenerateAI}
                disabled={isGenerating || isTranscribing || totalWords === 0}
                className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-95 text-xs font-semibold rounded-full shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icons.Sparkles size={16} className={isGenerating ? 'animate-spin' : ''} />
                <span>{isGenerating ? "Génération IA en cours..." : `Générer Rapport & Offres (${totalWords} mots)`}</span>
              </button>
            </div>

            {successMessage && (
              <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                <Icons.CheckCircle size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Jauge d'évaluation de la qualité du verbatim en temps réel */}
            {!isRecording && !isTranscribing && quality.status === 'SUFFICIENT' && (
              <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-medium text-left flex items-start gap-2.5 w-full">
                <Icons.CheckCircle size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <span>{quality.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono">
                      {quality.substantiveCount} mot(s) métier
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/90">{quality.guidance}</p>
                </div>
              </div>
            )}

            {!isRecording && !isTranscribing && quality.status === 'INSUFFICIENT' && (
              <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 rounded-2xl text-xs font-medium text-left flex items-start gap-2.5 w-full">
                <Icons.AlertTriangle size={16} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <span>{quality.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono">
                      {quality.substantiveCount}/2 mots métier
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90">{quality.guidance}</p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs flex items-center gap-2">
                <Icons.AlertCircle size={14} className="shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Dual Textareas: 1. Voice Transcript, 2. Manual Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Section 1 : Transcription Vocale OpenAI Whisper */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <Icons.Mic size={14} className="text-[#4F6CE8]" />
                  <span>1. Transcription Vocale (Whisper)</span>
                </label>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {voiceTranscript.split(/\s+/).filter(Boolean).length} mots
                </span>
              </div>

              <textarea
                value={voiceTranscript}
                onChange={(e) => setVoiceTranscript(e.target.value)}
                placeholder="Parlez au micro : vos propos transcrits par OpenAI Whisper apparaîtront ici..."
                rows={4}
                className="w-full p-4 rounded-2xl bg-[#F6F5F2] dark:bg-[#2D2A2D] text-xs text-zinc-900 dark:text-white border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] transition-all resize-none shadow-inner leading-relaxed font-sans"
              />
            </div>

            {/* Section 2 : Notes & Observations écrites du KAM */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <Icons.FileText size={14} className="text-emerald-500" />
                  <span>2. Notes & Précisions Écrites</span>
                </label>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {writtenNotes.split(/\s+/).filter(Boolean).length} mots
                </span>
              </div>

              <textarea
                value={writtenNotes}
                onChange={(e) => setWrittenNotes(e.target.value)}
                placeholder="Ajoutez des précisions écrites : budget, interlocuteurs, contraintes d'infrastructure, SLA demandés..."
                rows={4}
                className="w-full p-4 rounded-2xl bg-[#F6F5F2] dark:bg-[#2D2A2D] text-xs text-zinc-900 dark:text-white border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none shadow-inner leading-relaxed font-sans"
              />
            </div>
          </div>

          {/* Quick Context Injection Chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Puces Rapides (Injectées dans vos notes écrites) :
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                "Besoin Fibre Optique Dédiée 100 Mbps",
                "Coupures fréquentes chez l'opérateur en place",
                "Demande d'interconnexion multi-sites SD-WAN",
                "Secours 4G avec basculement automatique",
                "Contrat concurrent expire dans 2 mois",
                "Validation DSI acquise, accord DAF attendu",
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddContextChip(chip)}
                  className="px-2.5 py-1 rounded-lg bg-[#F6F5F2] dark:bg-[#2D2A2D] hover:bg-black/5 dark:hover:bg-white/5 border border-black/5 dark:border-white/5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Decision / Status Selector */}
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

          {/* AI Loader */}
          {isGenerating && (
            <div className="p-8 text-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl border border-black/5 dark:border-white/10 animate-pulse space-y-2">
              <Icons.Sparkles size={32} className="mx-auto text-[#4F6CE8] animate-spin" />
              <div className="font-extrabold text-sm text-zinc-900 dark:text-white">
                Synthèse IA en cours par Onbora Core AI...
              </div>
              <div className="text-xs text-zinc-500">
                Extraction des engagements, matching catalogue Orange B2B et rédaction de l&apos;email client.
              </div>
            </div>
          )}

          {/* Debrief Results */}
          {debriefData && !isGenerating && (
            <div className="space-y-6 animate-fade-in">
              
              {/* 1. Executive Summary */}
              <div className="p-5 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl border border-black/5 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icons.FileText size={16} className="text-[#4F6CE8]" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Synthèse Exécutive Core AI
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-400 font-mono">
                    {debriefData.date}
                  </span>
                </div>

                <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans">
                  {debriefData.executive_summary}
                </p>

                {/* Confirmed Needs & Objections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1.5">
                      <Icons.CheckCircle size={12} />
                      <span>Besoins Clients Identifiés ({(debriefData.confirmed_needs || []).length})</span>
                    </span>
                    {(debriefData.confirmed_needs || []).length > 0 ? (
                      <ul className="text-xs text-zinc-700 dark:text-zinc-300 space-y-1 list-disc list-inside">
                        {(debriefData.confirmed_needs || []).map((need, idx) => (
                          <li key={idx}>{need}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-zinc-400 italic">Aucun besoin spécifique formulé.</p>
                    )}
                  </div>

                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1.5">
                      <Icons.AlertTriangle size={12} />
                      <span>Objections & Points d&apos;Attention ({(debriefData.objections_raised || []).length})</span>
                    </span>
                    {(debriefData.objections_raised || []).length > 0 ? (
                      <ul className="text-xs text-zinc-700 dark:text-zinc-300 space-y-1 list-disc list-inside">
                        {(debriefData.objections_raised || []).map((obj, idx) => (
                          <li key={idx}>{obj}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-zinc-400 italic">Aucune objection majeure exprimée.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. RAG Recommended Packages */}
              {debriefData.recommended_packages && debriefData.recommended_packages.length > 0 && (
                <div className="p-5 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl border border-black/5 dark:border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Icons.TrendingUp size={16} className="text-[#4F6CE8]" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Offres B2B Recommandées  ({debriefData.recommended_packages.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {debriefData.recommended_packages.map((pkg, idx) => (
                      <div key={pkg.id || idx} className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-zinc-900 dark:text-white">{pkg.title}</span>
                          <span className="text-xs font-mono font-bold text-[#4F6CE8]">{pkg.price_range}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 leading-snug">{pkg.description}</p>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Pertinence : {pkg.match_reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Commitments & Actions Tracker */}
              {debriefData.commitments_extracted && debriefData.commitments_extracted.length > 0 && (
                <div className="p-5 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl border border-black/5 dark:border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Icons.CheckCircle size={16} className="text-emerald-500" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Engagements Extraits ({debriefData.commitments_extracted.length})
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {debriefData.commitments_extracted.map((c, idx) => (
                      <div key={c.id ? `commitment-${c.id}-${idx}` : `commitment-${idx}`} className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#4F6CE8] shrink-0" />
                          <span className="font-semibold text-zinc-900 dark:text-white">{c.action}</span>
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
              )}

              {/* 4. Follow-up Client Email */}
              {debriefData.client_followup_email && (
                <div className="p-5 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icons.Mail size={16} className="text-blue-600 dark:text-blue-400" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                        Proposition d&apos;Email Commercial J+1
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="px-3 py-1 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedEmail ? (
                        <>
                          <Icons.Check size={14} className="text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Copié !</span>
                        </>
                      ) : (
                        <>
                          <Icons.Copy size={14} />
                          <span>Copier l&apos;email</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5 space-y-2 text-xs font-mono">
                    <div className="text-zinc-500 dark:text-zinc-400 font-semibold">
                      <span className="text-zinc-400">Objet : </span>
                      {debriefData.client_followup_email.subject}
                    </div>
                    <hr className="border-black/5 dark:border-white/5" />
                    <div className="text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed font-sans text-xs">
                      {debriefData.client_followup_email.body}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F6F5F2] dark:bg-[#2D2A2D] border-t border-black/5 dark:border-white/10 flex items-center justify-between shrink-0">
          <span className="text-xs text-zinc-500">
            {debriefData ? "Débriefing persisté en mémoire de session." : `Verbatim total prêt : ${totalWords} mots.`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
