"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchAPI, uploadAudioAPI } from '@/lib/api';
import { Icons } from '@/components/shared/Icons';
import { evaluateVerbatimQuality } from '@/components/kam/KamVocalVisitModal';

interface AppointmentDetails {
  id: number;
  title: string;
  enterprise_id: number;
  enterprise_name: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_type: string;
  meeting_type_label: string;
  visit_purpose?: string;
  visit_purpose_label?: string;
  status: string;
  status_label: string;
  contact_name?: string;
  contact_role?: string;
}

interface VocalVisitDraft {
  appointmentId: string;
  recordingSeconds: number;
  voiceTranscript: string;
  writtenNotes: string;
  conversionStatus: string;
  wasRecording: boolean;
  lastSavedAt: number;
}

function getSupportedAudioMime(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return '';
  const mimes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
    'audio/wav',
  ];
  for (const m of mimes) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

function KamVocalVisitContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get('appointmentId') || searchParams.get('id');

  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [loadingAppt, setLoadingAppt] = useState(true);
  const [errorAppt, setErrorAppt] = useState<string | null>(null);

  // Core vocal state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [writtenNotes, setWrittenNotes] = useState('');
  const [conversionStatus, setConversionStatus] = useState('IN_NEGOTIATION');

  // Status flags
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Audio refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isHydratedRef = useRef(false);

  const storageKey = appointmentId ? `onbora_kam_vocal_visit_${appointmentId}` : '';

  // 1. Charger les métadonnées du rendez-vous
  useEffect(() => {
    if (!appointmentId) {
      setErrorAppt("Identifiant de rendez-vous non renseigné.");
      setLoadingAppt(false);
      return;
    }

    setLoadingAppt(true);
    fetchAPI(`/api/kam/appointments/${appointmentId}/`)
      .then((data) => {
        setAppointment(data);
        setErrorAppt(null);
      })
      .catch((err) => {
        console.error("Erreur chargement rendez-vous:", err);
        setErrorAppt("Rendez-vous introuvable ou accès non autorisé.");
      })
      .finally(() => setLoadingAppt(false));
  }, [appointmentId]);

  // 2. Hydratation depuis localStorage au montage
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const draft: VocalVisitDraft = JSON.parse(raw);
        if (draft) {
          if (draft.voiceTranscript) setVoiceTranscript(draft.voiceTranscript);
          if (draft.writtenNotes) setWrittenNotes(draft.writtenNotes);
          if (draft.recordingSeconds) setRecordingSeconds(draft.recordingSeconds);
          if (draft.conversionStatus) setConversionStatus(draft.conversionStatus);
          setRestoredFromStorage(true);
          if (draft.wasRecording) {
            setSuccessMsg("Session d'enregistrement restaurée. Le chrono et vos transcriptions ont été préservés.");
          }
        }
      }
    } catch (e) {
      console.warn("Impossible de relire le brouillon vocal:", e);
    } finally {
      isHydratedRef.current = true;
    }
  }, [storageKey]);

  // 3. Sauvegarde continue dans localStorage à chaque modification
  useEffect(() => {
    if (!isHydratedRef.current || !storageKey || typeof window === 'undefined') return;

    const draft: VocalVisitDraft = {
      appointmentId: String(appointmentId),
      recordingSeconds,
      voiceTranscript,
      writtenNotes,
      conversionStatus,
      wasRecording: isRecording,
      lastSavedAt: Date.now(),
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch (e) {
      console.warn("Échec d'écriture localStorage:", e);
    }
  }, [storageKey, appointmentId, recordingSeconds, voiceTranscript, writtenNotes, conversionStatus, isRecording]);

  // 4. Chronomètre lié à l'état isRecording
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

  // 5. Arrêt propre des flux audio
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Erreur arrêt recognition:", e);
      }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("Erreur arrêt MediaRecorder:", e);
      }
    }

    setIsRecording(false);
  }, []);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [stopRecording]);

  // 6. Envoi audio vers Whisper IA
  const sendAudioToWhisper = async (audioBlob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setErrorMsg('');

    try {
      const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('wav') ? 'wav' : 'webm';
      const formData = new FormData();
      formData.append('audio', audioBlob, `visit_recording.${extension}`);

      const data = await uploadAudioAPI('/api/kam/transcribe/', formData);

      if (data && data.transcript && data.transcript.trim()) {
        const text = data.transcript.trim();
        setVoiceTranscript((prev) => {
          const current = prev.trim();
          if (!current) return text;
          if (current.toLowerCase().includes(text.toLowerCase())) return current;
          if (text.toLowerCase().includes(current.toLowerCase())) return text;
          return `${current}\n${text}`;
        });
        setSuccessMsg("Transcription vocale Whisper synchronisée avec succès !");
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        if (!voiceTranscript.trim()) {
          setErrorMsg("Aucune voix distincte détectée dans l'audio. Vous pouvez compléter vos notes par écrit.");
        }
      }
    } catch (err: any) {
      console.error("Erreur transcription Whisper:", err);
      if (!voiceTranscript.trim()) {
        setErrorMsg(`Erreur transcription : ${err.message || 'Impossible de joindre le serveur'}`);
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  // 7. Démarrer l'enregistrement
  const startRecording = async () => {
    setErrorMsg('');
    setSuccessMsg('');
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
        },
      });
      streamRef.current = stream;

      // Reconnaissance vocale en temps réel (SpeechRecognition si dispo)
      if (typeof window !== 'undefined') {
        const SpeechRecClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecClass) {
          try {
            const rec = new SpeechRecClass();
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = 'fr-FR';

            rec.onresult = (event: any) => {
              let liveText = '';
              for (let i = 0; i < event.results.length; ++i) {
                liveText += event.results[i][0].transcript + ' ';
              }
              if (liveText.trim()) {
                setVoiceTranscript((prev) => {
                  const cleaned = liveText.trim();
                  return cleaned;
                });
              }
            };

            rec.onerror = (e: any) => {
              if (e.error !== 'no-speech') {
                console.warn("Speech recognition warning:", e);
              }
            };

            rec.start();
            recognitionRef.current = rec;
          } catch (e) {
            console.warn("Speech recognition indisponible:", e);
          }
        }
      }

      // MediaRecorder pour capture audio Whisper
      const mimeType = getSupportedAudioMime();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (finalBlob.size > 2000) {
          sendAudioToWhisper(finalBlob, recorder.mimeType || 'audio/webm');
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err: any) {
      console.error("Erreur accès micro:", err);
      setErrorMsg("Impossible d'accéder au microphone. Veuillez autoriser l'accès audio.");
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // 8. Réinitialiser le brouillon
  const handleResetDraft = () => {
    stopRecording();
    setRecordingSeconds(0);
    setVoiceTranscript('');
    setWrittenNotes('');
    setConversionStatus('IN_NEGOTIATION');
    setErrorMsg('');
    setSuccessMsg('');
    setShowResetConfirm(false);
    if (storageKey && typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  };

  // 9. Clôture & Synthèse IA du Rendez-vous
  const handleCompleteVisit = async () => {
    const quality = evaluateVerbatimQuality(voiceTranscript, writtenNotes);
    if (!quality.isSufficient) {
      setErrorMsg("Contenu insuffisant pour générer la synthèse IA. Veuillez dicter ou écrire vos notes d'échange.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    stopRecording();

    try {
      const res = await fetchAPI(`/api/kam/appointments/${appointmentId}/complete-vocal/`, {
        method: 'POST',
        body: JSON.stringify({
          voice_transcript: voiceTranscript.trim(),
          written_notes: writtenNotes.trim(),
          conversion_status: conversionStatus,
        }),
      });

      // Nettoyer le localStorage
      if (storageKey && typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
      }

      const reportId = res?.report?.id || res?.report_id;
      if (reportId) {
        router.push(`/kam/report?reportId=${reportId}`);
      } else {
        router.push('/kam/visits');
      }
    } catch (err: any) {
      console.error("Erreur clôture réunion:", err);
      setErrorMsg(err?.message || "Impossible de finaliser le compte-rendu de visite.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const verbatimQuality = evaluateVerbatimQuality(voiceTranscript, writtenNotes);

  if (loadingAppt) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Icons.Sparkles size={32} className="animate-spin text-[#4F6CE8]" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Chargement de la session vocale...
          </span>
        </div>
      </div>
    );
  }

  if (errorAppt || !appointment) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="p-8 max-w-md bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 text-center space-y-4">
          <Icons.AlertTriangle size={32} className="text-rose-500 mx-auto" />
          <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">Rendez-vous introuvable</h3>
          <p className="text-xs text-zinc-500">{errorAppt || "Impossible d'accéder au rendez-vous."}</p>
          <button
            onClick={() => router.push('/kam/agenda')}
            className="px-4 py-2 bg-[#4F6CE8] text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Retour à l&apos;agenda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-8 py-6 select-none bg-[#ECEAE5] dark:bg-[#242124] text-zinc-900 dark:text-white font-sans">
      
      {/* 1. TOP HEADER BAR (Minimaliste, identique à KamPreCallView) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-black/5 dark:border-white/5">
        
        {/* Left: Back button + Appointment Info */}
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.back()}
            title="Retour à la page précédente"
            className="p-2.5 rounded-2xl bg-white dark:bg-[#2D2A2D] hover:bg-zinc-100 dark:hover:bg-[#383438] text-zinc-600 dark:text-zinc-300 border border-black/5 dark:border-white/5 transition-all cursor-pointer shadow-xs shrink-0 mt-0.5"
          >
            <Icons.ArrowLeft size={16} />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#4F6CE8]/15 text-[#4F6CE8] flex items-center justify-center font-black text-lg shrink-0">
              {appointment.enterprise_name.charAt(0).toUpperCase()}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                  {appointment.enterprise_name}
                </h1>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#4F6CE8]/15 text-[#4F6CE8] border border-[#4F6CE8]/20">
                  <Icons.Target size={12} />
                  <span>{appointment.visit_purpose_label || 'Rendez-vous'}</span>
                </span>

                {isRecording ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    <span>Enregistrement actif</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400">
                    <Icons.Clock size={12} />
                    <span>Chrono {formatTimer(recordingSeconds)}</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Session live de captation d&apos;entretien & de notes · Persistance continue
              </p>
            </div>
          </div>
        </div>

        {/* Right: Actions (Préparer RDV, Réinitialiser) */}
        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
          <button
            onClick={() => router.push(`/kam/prepare-visit?appointmentId=${appointmentId}`)}
            title="Consulter la fiche de préparation"
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#2D2A2D] hover:bg-zinc-100 dark:hover:bg-[#383438] text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/5 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Icons.Compass size={14} />
            <span>Fiche Préparation</span>
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            title="Effacer le brouillon en cours"
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#2D2A2D] hover:bg-rose-500/10 text-zinc-600 dark:text-zinc-300 hover:text-rose-600 border border-black/5 dark:border-white/5 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Icons.RotateCcw size={14} />
            <span>Réinitialiser</span>
          </button>
        </div>
      </div>

      {/* Notifications banners */}
      {restoredFromStorage && (
        <div className="mt-4 p-3 rounded-2xl bg-[#4F6CE8]/10 border border-[#4F6CE8]/20 text-[#4F6CE8] dark:text-[#7B92F2] text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icons.CheckCircle size={15} />
            <span>État de visite restauré depuis le stockage local (notes et transcription préservées).</span>
          </div>
          <button
            onClick={() => setRestoredFromStorage(false)}
            className="p-1 hover:opacity-75 cursor-pointer"
          >
            <Icons.X size={13} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
          <Icons.AlertTriangle size={15} className="shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <Icons.Check size={15} className="shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. BODY CONTENT (Cartes minimalistes 2 colonnes + Barre Micro) */}
      <div className="py-6 space-y-6 max-w-6xl">
        
        {/* Micro & Audio Control Bar */}
        <section className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Left: Timer & Wave animation */}
          <div className="flex items-center gap-5">
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">
                Temps d&apos;échange écoulé
              </span>
              <span className="font-mono text-3xl md:text-4xl font-black text-zinc-900 dark:text-white mt-1">
                {formatTimer(recordingSeconds)}
              </span>
            </div>

            {isRecording && (
              <div className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-rose-500/10 text-rose-600">
                <span className="w-1.5 h-4 bg-rose-500 rounded-full animate-pulse" />
                <span className="w-1.5 h-6 bg-rose-500 rounded-full animate-pulse delay-75" />
                <span className="w-1.5 h-3 bg-rose-500 rounded-full animate-pulse delay-150" />
                <span className="w-1.5 h-5 bg-rose-500 rounded-full animate-pulse delay-100" />
                <span className="text-[11px] font-bold ml-1.5">Micro ouvert</span>
              </div>
            )}
          </div>

          {/* Right: Record Button & Whisper status */}
          <div className="flex items-center gap-3">
            {isTranscribing && (
              <div className="flex items-center gap-2 text-xs font-semibold text-[#4F6CE8]">
                <Icons.RefreshCw size={14} className="animate-spin" />
                <span>Whisper IA transcrit...</span>
              </div>
            )}

            <button
              onClick={toggleRecording}
              className={`px-6 py-3 rounded-2xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-2.5 ${
                isRecording
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                  : 'bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 text-white'
              }`}
            >
              <Icons.Mic size={16} />
              <span>{isRecording ? "Mettre en pause le micro" : "Démarrer l'enregistrement"}</span>
            </button>
          </div>
        </section>

        {/* 2-Columns Grid : Transcription vs Notes Écrites */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Column 1: Live Voice Transcript */}
          <section className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <Icons.Mic size={17} className="text-[#4F6CE8]" />
                  <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-tight">
                    Transcription vocale en direct
                  </h3>
                </div>
                <span className="text-[10px] font-semibold text-zinc-400">
                  Éditable
                </span>
              </div>

              <textarea
                value={voiceTranscript}
                onChange={(e) => setVoiceTranscript(e.target.value)}
                placeholder="Votre dictée vocale s'affichera ici en continu. Vous pouvez également corriger ou saisir directement vos propos..."
                rows={10}
                className="w-full p-4 rounded-2xl bg-white dark:bg-[#242124] border border-black/5 dark:border-white/5 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-[#4F6CE8] resize-none leading-relaxed transition-all placeholder-zinc-400"
              />
            </div>
            
            <p className="mt-2 text-[10px] text-zinc-400">
              Chaque mot transcrit ou corrigé est sauvegardé instantanément en local.
            </p>
          </section>

          {/* Column 2: Manual Written Notes */}
          <section className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <Icons.Edit size={17} className="text-[#4F6CE8]" />
                  <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-tight">
                    Notes manuelles & observations
                  </h3>
                </div>
                <span className="text-[10px] font-semibold text-zinc-400">
                  Clavier
                </span>
              </div>

              <textarea
                value={writtenNotes}
                onChange={(e) => setWrittenNotes(e.target.value)}
                placeholder="Ex : Objections formulées sur le délai de raccordement fibre, budget mensuel estimé à 1 500$, décision attendue d'ici fin de mois..."
                rows={10}
                className="w-full p-4 rounded-2xl bg-white dark:bg-[#242124] border border-black/5 dark:border-white/5 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-[#4F6CE8] resize-none leading-relaxed transition-all placeholder-zinc-400"
              />
            </div>

            <p className="mt-2 text-[10px] text-zinc-400">
              Complétez librement vos puces d&apos;observations pendant ou juste après l&apos;échange.
            </p>
          </section>

        </div>

        {/* Verbatim Quality Indicator */}
        <section className="p-4 rounded-2xl bg-white dark:bg-[#2D2A2D] border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${verbatimQuality.isSufficient ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
              {verbatimQuality.isSufficient ? <Icons.CheckCircle size={18} /> : <Icons.AlertCircle size={18} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  {verbatimQuality.label}
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  ({verbatimQuality.totalWords} mots)
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {verbatimQuality.guidance}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
              verbatimQuality.isSufficient
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            }`}>
              {verbatimQuality.isSufficient ? 'Prêt pour l\'IA' : 'Brouillon en cours'}
            </span>
          </div>
        </section>

        {/* Outcome Selector & Clôture */}
        <section className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Issue commerciale & Clôture du rendez-vous
            </h3>
            <p className="text-xs text-zinc-500">
              Indiquez l&apos;état d&apos;avancement à l&apos;issue de l&apos;entretien avant de lancer la synthèse automatique.
            </p>
          </div>

          {/* Outcome Radio Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'IN_NEGOTIATION', label: 'En négociation', icon: Icons.Clock },
              { id: 'SIGNED', label: 'Accord / Signature', icon: Icons.CheckCircle },
              { id: 'STANDBY', label: 'En attente / Stand-by', icon: Icons.Clock },
              { id: 'LOST', label: 'Opportunité écartée', icon: Icons.X },
            ].map((st) => {
              const isSelected = conversionStatus === st.id;
              const Icon = st.icon;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setConversionStatus(st.id)}
                  className={`p-3.5 rounded-2xl border text-xs font-semibold transition-all cursor-pointer flex flex-col items-center gap-2 ${
                    isSelected
                      ? 'bg-[#4F6CE8] text-white border-[#4F6CE8] shadow-xs'
                      : 'bg-white dark:bg-[#242124] text-zinc-700 dark:text-zinc-300 border-black/5 dark:border-white/5 hover:border-[#4F6CE8]/30'
                  }`}
                >
                  <Icon size={18} className={isSelected ? 'text-white' : 'text-zinc-400'} />
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-zinc-500">
              Core AI analysera la transcription pour identifier les besoins qualifiés, objections réelles et rédiger le projet d&apos;email de relance.
            </p>

            <button
              onClick={handleCompleteVisit}
              disabled={isSubmitting || !verbatimQuality.isSufficient}
              className="px-6 py-3 bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer flex items-center gap-2 shrink-0"
            >
              {isSubmitting ? (
                <>
                  <Icons.RefreshCw size={15} className="animate-spin" />
                  <span>Synthèse Core AI en cours...</span>
                </>
              ) : (
                <>
                  <Icons.CheckCircle size={15} />
                  <span>Clôturer & Générer la Synthèse IA</span>
                </>
              )}
            </button>
          </div>
        </section>

      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 max-w-sm w-full border border-black/10 dark:border-white/10 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Icons.AlertTriangle size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                Réinitialiser la session vocale ?
              </h3>
              <p className="text-xs text-zinc-500">
                Cette action effacera les notes actuelles et la transcription sauvegardée en local pour ce rendez-vous.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs cursor-pointer hover:bg-zinc-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleResetDraft}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs cursor-pointer transition-colors"
              >
                Confirmer l&apos;effacement
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function KamVocalVisitPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <Icons.Sparkles size={28} className="animate-spin text-[#4F6CE8]" />
            <span className="text-xs font-semibold text-zinc-500">Chargement du brief vocal...</span>
          </div>
        </div>
      }
    >
      <KamVocalVisitContent />
    </Suspense>
  );
}
