"use client";

import React, { useState, useEffect, useRef } from 'react';
import { fetchAPI } from '@/lib/api';
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

export default function KamVocalVisitModal({
  isOpen,
  appointment,
  onClose,
  onVisitCompleted
}: KamVocalVisitModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [conversionStatus, setConversionStatus] = useState('IN_NEGOTIATION');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize SpeechRecognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'fr-FR';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }
          setTranscript(currentTranscript.trim());
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition notice:", event.error);
        };

        recognition.onend = () => {
          if (isRecording) {
            try {
              recognition.start();
            } catch {
              // Ignore restart error
            }
          }
        };

        recognitionRef.current = recognition;
      } else {
        setSpeechSupported(false);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Timer for duration of meeting
  useEffect(() => {
    if (isOpen) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsedSeconds(0);
      setTranscript('');
      setIsRecording(false);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setIsRecording(!isRecording);
      return;
    }

    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Impossible de lancer la reconnaissance vocale:", e);
        setIsRecording(true);
      }
    }
  };

  const handleAppendChip = (chipText: string) => {
    setTranscript((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}. ${chipText}` : chipText;
    });
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCompleteMeetingWithAI = async () => {
    if (!appointment) return;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetchAPI(`/api/kam/appointments/${appointment.id}/complete-vocal/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript.trim() || `Entretien commercial avec ${appointment.contact_name} chez ${appointment.enterprise_name}. Qualification des besoins réseau et présentation des solutions Onbora.`,
          conversion_status: conversionStatus,
        })
      });

      if (res && res.report) {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {
            // ignore
          }
        }
        setIsRecording(false);
        onVisitCompleted(res.report);
      } else {
        setErrorMsg("Une erreur est survenue lors de la génération Core AI.");
      }
    } catch (err: any) {
      console.error("Erreur clôture vocale RDV:", err);
      setErrorMsg("Impossible de générer le rapport Core AI. Vérifiez votre session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#ECEAE5] dark:bg-[#242124] text-zinc-900 dark:text-white w-full max-w-2xl rounded-[32px] border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden animate-scale-up">
        
        {/* Top Header */}
        <div className="p-6 border-b border-black/5 dark:border-white/5 bg-[#F6F5F2] dark:bg-[#2D2A2D] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4F6CE8]/15 text-[#4F6CE8] flex items-center justify-center font-extrabold text-sm">
              <Icons.Mic size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  Enregistrement & Brief Vocal en Direct
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 font-bold text-zinc-600 dark:text-zinc-300">
                  {formatTimer(elapsedSeconds)}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {appointment.enterprise_name} • Interlocuteur : <strong className="text-zinc-800 dark:text-zinc-200">{appointment.contact_name}</strong> ({appointment.contact_role})
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
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          
          {/* Audio Visualizer / Micro Centerpiece */}
          <div className="p-6 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 flex flex-col items-center justify-center gap-4 text-center">
            <button
              onClick={toggleRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                isRecording
                  ? 'bg-[#4F6CE8] text-white ring-8 ring-[#4F6CE8]/20 animate-pulse scale-105'
                  : 'bg-[#E4E1DB] dark:bg-[#363336] text-zinc-700 dark:text-zinc-200 hover:bg-[#4F6CE8] hover:text-white'
              }`}
              title={isRecording ? "Mettre en pause la dictée vocale" : "Démarrer l'écoute vocale"}
            >
              <Icons.Mic size={32} />
            </button>

            <div>
              <span className="text-xs font-extrabold text-zinc-900 dark:text-white block">
                {isRecording ? "Écoute active en cours... Parlez normalement" : "Microphone en attente"}
              </span>
              <span className="text-[11px] text-zinc-500 block mt-0.5">
                {speechSupported
                  ? "Votre voix est transcrite en direct et sera analysée par Core AI."
                  : "Saisie texte directe : dictez ou tapez les points clés de l'échange ci-dessous."}
              </span>
            </div>
          </div>

          {/* Live Transcript / Notes Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                Transcription de l&apos;Échange & Notes en Direct
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">
                {transcript.split(/\s+/).filter(Boolean).length} mots
              </span>
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="La transcription de vos échanges s'affiche ici au fur et à mesure... Vous pouvez également saisir des compléments ou corriger le texte à tout moment."
              rows={4}
              className="w-full p-4 rounded-2xl bg-[#F6F5F2] dark:bg-[#2D2A2D] border border-black/5 dark:border-white/5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-[#4F6CE8] transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Quick Context Injection Chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
              Marqueurs Rapides & Contexte Métier
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Besoin Fibre Optique Dédiée 50 Mbps",
                "Problème coupures et instabilité opérateur actuel",
                "Budget mensuel télécoms validé",
                "Décisionnaire C-Level signataire présent",
                "Demande de redondance 4G avec bascule automatique",
                "Souhait d'étude d'éligibilité technique sous 48h",
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAppendChip(chip)}
                  className="px-2.5 py-1 bg-[#E4E1DB] dark:bg-[#363336] hover:bg-white dark:hover:bg-[#403C40] text-zinc-700 dark:text-zinc-300 text-[11px] font-medium rounded-lg border border-black/5 dark:border-white/5 transition-all cursor-pointer"
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

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs font-medium text-center">
              {errorMsg}
            </div>
          )}

        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 px-6 border-t border-black/5 dark:border-white/5 bg-[#F6F5F2] dark:bg-[#2D2A2D] flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Annuler
          </button>

          <button
            onClick={handleCompleteMeetingWithAI}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 text-white rounded-full text-xs font-extrabold transition-all cursor-pointer shadow-md shadow-[#4F6CE8]/20 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Icons.Sparkles size={15} className="animate-spin" />
                <span>Génération du Rapport Core AI...</span>
              </>
            ) : (
              <>
                <Icons.Sparkles size={15} />
                <span>Clôturer & Générer Rapport Core AI</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
