"use client";

import React, { useState, useEffect, useRef } from 'react';
import { StrategicVisit, MeetingDebrief } from './kamTypes';
import { Icons } from '@/components/shared/Icons';
import { fetchAPI } from '@/lib/api';

interface KamVoiceDebriefModalProps {
  visit: StrategicVisit | null;
  isOpen: boolean;
  onClose: () => void;
  onDebriefSaved?: (updatedVisit: StrategicVisit) => void;
}

export default function KamVoiceDebriefModal({
  visit,
  isOpen,
  onClose,
  onDebriefSaved
}: KamVoiceDebriefModalProps) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>('');
  const [conversionStatus, setConversionStatus] = useState<string>('IN_NEGOTIATION');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [debriefData, setDebriefData] = useState<MeetingDebrief | null>(null);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize SpeechRecognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
          setTranscript(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition notice:", event.error);
          if (event.error === 'not-allowed') {
            setErrorMessage("Accès microphone non autorisé par le navigateur.");
          }
        };

        recognitionRef.current = recognition;
      } else {
        setSpeechSupported(false);
      }
    }
  }, []);

  // Timer handling
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  // Load existing debrief when modal opens
  useEffect(() => {
    if (isOpen && visit) {
      setRecordingSeconds(0);
      setIsRecording(false);
      setDebriefData(null);
      setErrorMessage('');
      const accountId = visit.account_id || visit.id.replace('account-', '');
      setConversionStatus(visit.conversion_status || 'IN_NEGOTIATION');
      setTranscript(visit.conversion_notes || '');

      fetchAPI(`/api/kam/accounts/${accountId}/debrief/`)
        .then((res) => {
          if (res && res.debrief) {
            setDebriefData(res.debrief);
            if (res.debrief.transcript_text && !visit.conversion_notes) {
              setTranscript(res.debrief.transcript_text);
            }
          }
        })
        .catch((err) => {
          console.warn("Pré-chargement débriefing existant:", err);
        });
    }
  }, [isOpen, visit]);

  if (!isOpen || !visit) return null;

  const handleStartRecording = () => {
    setErrorMessage('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("Recognition already started or error:", err);
      }
    }
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn("Recognition stop error:", err);
      }
    }
    setIsRecording(false);
  };

  const handleAddContextChip = (text: string) => {
    setTranscript((prev) => {
      const separator = prev.trim().length > 0 ? '\n• ' : '• ';
      return prev + separator + text;
    });
  };

  const handleGenerateAI = async () => {
    if (isRecording) {
      handleStopRecording();
    }

    const effectiveTranscript = transcript.trim();
    if (!effectiveTranscript) {
      setErrorMessage("Veuillez enregistrer ou saisir vos notes de débriefing avant de lancer l'analyse.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage('');

    const accountId = visit.account_id || visit.id.replace('account-', '');

    try {
      const res = await fetchAPI(`/api/kam/accounts/${accountId}/debrief/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generate_ai: true,
          audio_duration_seconds: Math.max(recordingSeconds, 15),
          transcript: effectiveTranscript,
          conversion_status: conversionStatus,
        })
      });

      if (res && res.debrief) {
        setDebriefData(res.debrief);
        if (res.visit && onDebriefSaved) {
          onDebriefSaved(res.visit);
        }
      } else {
        setErrorMessage("Une erreur est survenue lors de la synthèse Core AI.");
      }
    } catch (err) {
      console.error("Erreur génération débrief Core AI:", err);
      setErrorMessage("Impossible de joindre le copilote Core AI. Vérifiez votre session.");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#ECEAE5] dark:bg-[#242124] text-zinc-900 dark:text-white rounded-[32px] border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-[#F6F5F2] dark:bg-[#2D2A2D] border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4F6CE8]/15 text-[#4F6CE8] flex items-center justify-center font-extrabold text-sm shadow-xs">
              <Icons.Mic size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  Dictaphone de Débriefing Post-Visite — {visit.account_name}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>RAG Catalogue B2B</span>
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Dictez vos impressions. Core AI extrait les besoins, engagements, email client et offres Orange correspondantes.
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
            
            {/* Waveform / Status visual */}
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

            <span className="text-xs uppercase font-extrabold text-zinc-400 tracking-wider">
              {isRecording ? "Enregistrement en direct via Web Speech API" : "Microphone en pause"}
            </span>

            <div className="text-4xl font-mono font-extrabold text-zinc-900 dark:text-white mt-1">
              {formatTimer(recordingSeconds)}
            </div>

            <div className="flex items-center gap-3 mt-4">
              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  className="px-6 py-2.5 bg-[#4F6CE8] hover:bg-[#3D57C5] active:scale-95 text-white text-xs font-semibold rounded-full shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <Icons.Mic size={16} />
                  <span>{recordingSeconds > 0 ? "Reprendre la dictée" : "Activer le Dictaphone Vocal"}</span>
                </button>
              ) : (
                <button
                  onClick={handleStopRecording}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-semibold rounded-full shadow-md transition-all cursor-pointer flex items-center gap-2 animate-pulse"
                >
                  <Icons.Square size={16} />
                  <span>Mettre en pause le micro</span>
                </button>
              )}

              <button
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-95 text-xs font-semibold rounded-full shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <Icons.Sparkles size={16} className={isGenerating ? 'animate-spin' : ''} />
                <span>{isGenerating ? "Génération IA en cours..." : "Générer Rapport & Offres RAG"}</span>
              </button>
            </div>

            {!speechSupported && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-3">
                Note : Votre navigateur ne supporte pas l&apos;API vocale native. Vous pouvez saisir vos notes textuellement ci-dessous.
              </p>
            )}
          </div>

          {/* Transcript / Notes Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <Icons.FileText size={14} className="text-[#4F6CE8]" />
                <span>Transcription brute / Notes du KAM</span>
              </label>
              <span className="text-[11px] text-zinc-400 font-mono">
                {transcript.split(/\s+/).filter(Boolean).length} mots
              </span>
            </div>

            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Parlez dans le micro ou saisissez vos notes ici : points abordés, objections exprimées, accord sur le budget, SLA demandés..."
              rows={4}
              className="w-full p-4 rounded-2xl bg-[#F6F5F2] dark:bg-[#2D2A2D] text-xs text-zinc-900 dark:text-white border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] transition-all resize-none shadow-inner leading-relaxed font-sans"
            />

            {/* Quick Context Injection Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mr-1">
                Puces Rapides :
              </span>
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

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs font-medium text-center">
              {errorMessage}
            </div>
          )}

          {/* AI Loader */}
          {isGenerating && (
            <div className="p-8 text-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl border border-black/5 dark:border-white/10 animate-pulse space-y-2">
              <Icons.Sparkles size={32} className="mx-auto text-[#4F6CE8] animate-spin" />
              <div className="font-extrabold text-sm text-zinc-900 dark:text-white">
                Synthèse IA en cours par Onbora Core AI...
              </div>
              <div className="text-xs text-zinc-500">
                Extraction des engagements, matching catalogue Orange B2B par RAG et rédaction de l&apos;email client.
              </div>
            </div>
          )}

          {/* Debrief Results */}
          {debriefData && !isGenerating && (
            <div className="space-y-6 animate-fade-in">
              
              {/* 1. Executive Summary & Transcript */}
              <div className="p-5 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl border border-black/5 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icons.FileText size={16} className="text-[#4F6CE8]" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Compte-Rendu Exécutif C-Level
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Risque Détecté : {debriefData.risk_level}
                  </span>
                </div>

                <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed">
                  {debriefData.executive_summary}
                </p>

                {debriefData.next_step_recommendation && (
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5 text-xs text-zinc-700 dark:text-zinc-300">
                    <strong className="text-[#4F6CE8]">Prochaine étape recommandée : </strong> {debriefData.next_step_recommendation}
                  </div>
                )}
              </div>

              {/* 2. RAG Recommended Orange B2B Packages */}
              {(debriefData as any).recommended_packages && (debriefData as any).recommended_packages.length > 0 && (
                <div className="p-5 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl border border-black/5 dark:border-white/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <Icons.Layers size={16} className="text-[#4F6CE8]" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Offres Orange B2B Matchées par RAG ({(debriefData as any).recommended_packages.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(debriefData as any).recommended_packages.map((pkg: any, idx: number) => (
                      <div key={pkg.id || idx} className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5 flex flex-col justify-between gap-2 text-xs">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                              {pkg.category || 'Orange B2B'}
                            </span>
                            {pkg.score !== undefined && (
                              <span className="text-[10px] font-mono text-zinc-400">
                                Score: {pkg.score > 1 ? `${pkg.score} pts` : `${(pkg.score * 100).toFixed(0)}%`}
                              </span>
                            )}
                          </div>
                          <h4 className="font-extrabold text-zinc-900 dark:text-white leading-tight">
                            {pkg.title}
                          </h4>
                          <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                            {pkg.summary}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px]">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">
                            {pkg.pricing || 'Sur devis'}
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {pkg.sla || 'SLA 99.9%'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Engagements & Actions Tracker */}
              <div className="p-5 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-2xl border border-black/5 dark:border-white/5 space-y-3">
                <div className="flex items-center gap-2">
                  <Icons.CheckCircle size={16} className="text-emerald-500" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Engagements Extraits ({debriefData.commitments_extracted.length})
                  </h3>
                </div>

                <div className="space-y-2">
                  {debriefData.commitments_extracted.map((c) => (
                    <div key={c.id} className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 text-xs">
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

              {/* 4. Follow-up Client Email */}
              <div className="p-5 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icons.Mail size={16} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                      Proposition d&apos;Email Commercial J+1
                    </h3>
                  </div>

                  <button
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
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F6F5F2] dark:bg-[#2D2A2D] border-t border-black/5 dark:border-white/10 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {debriefData ? "Débriefing prêt et persisté en mémoire de session." : "Enregistrez votre audio puis lancez la synthèse."}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-full transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
