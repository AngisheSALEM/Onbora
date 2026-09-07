"use client";

import React, { useState, useEffect } from 'react';
import { StrategicVisit, MeetingDebrief } from './kamTypes';
import { mockDebriefs } from './kamMockData';
import { Icons } from '@/components/shared/Icons';
import { fetchAPI } from '@/lib/api';

interface KamDebriefViewProps {
  visits: StrategicVisit[];
  selectedVisitId: string;
  onSelectVisitId: (id: string) => void;
  onDebriefSaved?: (updatedVisit: StrategicVisit) => void;
}

export default function KamDebriefView({
  visits,
  selectedVisitId,
  onSelectVisitId,
  onDebriefSaved
}: KamDebriefViewProps) {
  const selectedVisit = visits.find((v) => v.id === selectedVisitId) || visits[0];
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [debriefData, setDebriefData] = useState<MeetingDebrief | null>(
    mockDebriefs[selectedVisit?.id] || mockDebriefs['visit-sgb-01']
  );

  // Données de retour métier exigées par la Direction KAM Office
  const [conversionStatus, setConversionStatus] = useState<string>(
    (selectedVisit as any)?.conversion_status || 'PROSPECT'
  );
  const [convertedAmount, setConvertedAmount] = useState<number>(
    (selectedVisit as any)?.converted_amount || 0
  );
  const [convertedOffer, setConvertedOffer] = useState<string>(
    (selectedVisit as any)?.converted_offer || (selectedVisit?.briefing?.ai_hypotheses_and_playbook?.orange_opportunities?.[0]?.solution_category || 'Fibre Dédiée Pro + SD-WAN')
  );
  const [conversionNotes, setConversionNotes] = useState<string>(
    (selectedVisit as any)?.conversion_notes || ''
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successFeedback, setSuccessFeedback] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Synchronisation lors du changement de compte sélectionné
  useEffect(() => {
    if (selectedVisit) {
      setConversionStatus((selectedVisit as any).conversion_status || 'PROSPECT');
      setConvertedAmount((selectedVisit as any).converted_amount || 0);
      setConvertedOffer((selectedVisit as any).converted_offer || (selectedVisit.briefing?.ai_hypotheses_and_playbook?.orange_opportunities?.[0]?.solution_category || 'Fibre Dédiée Pro + SD-WAN'));
      setConversionNotes((selectedVisit as any).conversion_notes || '');
      setSuccessFeedback('');
      setErrorMessage('');
      setDebriefData(mockDebriefs[selectedVisit.id] || mockDebriefs['visit-sgb-01']);
    }
  }, [selectedVisitId, selectedVisit]);

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
  };

  const handleStopAndGenerate = () => {
    setIsRecording(false);
    setIsGenerating(true);

    setTimeout(() => {
      setIsGenerating(false);
      const generated = mockDebriefs[selectedVisit?.id] || mockDebriefs['visit-sgb-01'];
      setDebriefData(generated);
      if (!conversionNotes && generated) {
        setConversionNotes(generated.executive_summary);
      }
    }, 1500);
  };

  const handleSubmitDebriefToKamOffice = async () => {
    if (!selectedVisit) return;
    setIsSubmitting(true);
    setSuccessFeedback('');
    setErrorMessage('');

    const accountId = selectedVisit.account_id || selectedVisit.id.replace('account-', '');

    try {
      const payload = {
        conversion_status: conversionStatus,
        converted_amount: Number(convertedAmount) || 0,
        converted_offer: convertedOffer,
        conversion_notes: conversionNotes || (debriefData ? debriefData.executive_summary : '')
      };

      const res = await fetchAPI(`/api/kam/accounts/${accountId}/debrief/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res && res.visit) {
        setSuccessFeedback(`Données enregistrées en base ! Le compte ${selectedVisit.account_name} est synchronisé avec la Direction KAM Office.`);
        if (onDebriefSaved) {
          onDebriefSaved(res.visit);
        }
      } else {
        setSuccessFeedback(`Débriefing transmis avec succès au KAM Office !`);
      }
    } catch (err: any) {
      console.error("Erreur lors de la transmission du débriefing:", err);
      setErrorMessage("Impossible de transmettre le débriefing au KAM Office. Vérifiez votre connexion.");
    } finally {
      setIsSubmitting(false);
    }
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
          <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Débriefing Post-Visite & Transmission KAM Office
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Dictez ou saisissez vos conclusions de négociation. L&apos;IA structure le compte-rendu et met à jour en direct le tableau de bord Direction.
          </p>
        </div>

        {/* Account Selector */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
          {visits.map((v) => {
            const isSelected = v.id === selectedVisit?.id;
            return (
              <button
                key={v.id}
                onClick={() => {
                  onSelectVisitId(v.id);
                  setDebriefData(mockDebriefs[v.id] || mockDebriefs['visit-sgb-01']);
                }}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md font-extrabold'
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
          <span className="text-xs uppercase font-semibold text-zinc-500 dark:text-zinc-400 block">
            Débriefing pour {selectedVisit?.account_name}
          </span>
          <div className="text-3xl font-mono font-extrabold text-zinc-900 dark:text-white mt-1">
            {formatTimer(recordingSeconds)}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold rounded-full shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Icons.Mic size={16} />
              <span>Démarrer l&apos;enregistrement vocal</span>
            </button>
          ) : (
            <button
              onClick={handleStopAndGenerate}
              className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 text-xs font-extrabold rounded-full shadow-md transition-all cursor-pointer flex items-center gap-2"
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
          <div className="font-semibold text-sm text-zinc-900 dark:text-white">
            Synthèse IA en cours par Onbora Intel Engine...
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Extraction des engagements, calcul du risque et rédaction de l&apos;email client.
          </div>
        </div>
      )}

      {/* Section Maîtresse : Validation Métier & Transmission au KAM Office */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[32px] p-6 md:p-8 shadow-sm border border-black/5 dark:border-white/5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200/80 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-semibold">
              <Icons.Send size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">
                Transmission Directe à la Direction KAM Office
              </h3>
              <p className="text-xs text-zinc-500">
                Données requises pour le reporting de conversion, le pipeline financier et le suivi du portefeuille.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-semibold px-3 py-1 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 self-start sm:self-auto">
            ID: {selectedVisit?.crm_id || selectedVisit?.account_id}
          </span>
        </div>

        {/* Feedback alerts */}
        {successFeedback && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Icons.CheckCircle size={16} className="shrink-0 text-emerald-500" />
            <span>{successFeedback}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <Icons.AlertCircle size={16} className="shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Statut de Négociation / Conversion */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold uppercase text-zinc-500 tracking-wider block">
            1. Statut Commercial & Cycle de Décision
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[
              { id: 'PROSPECT', label: 'Prospect non converti', icon: Icons.Clock, color: 'text-zinc-500' },
              { id: 'IN_NEGOTIATION', label: 'En cours de négociation', icon: Icons.Layers, color: 'text-blue-500' },
              { id: 'CONVERTED', label: 'Converti / Contrat Signé', icon: Icons.CheckCircle, color: 'text-emerald-500' },
              { id: 'LOST', label: 'Perdu / Non retenu', icon: Icons.AlertCircle, color: 'text-rose-500' },
            ].map((st) => {
              const Icon = st.icon;
              const isActive = conversionStatus === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setConversionStatus(st.id)}
                  className={`p-3.5 rounded-2xl border text-xs font-semibold text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    isActive
                      ? 'bg-white dark:bg-[#363336] border-blue-600 shadow-md ring-2 ring-blue-500/20'
                      : 'bg-[#ECEAE5] dark:bg-[#191816] border-transparent text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-[#363336]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon size={16} className={st.color} />
                    {isActive && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                  </div>
                  <span className={`text-xs ${isActive ? 'text-zinc-900 dark:text-white font-extrabold' : ''}`}>
                    {st.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Paramètres Financiers & Offre Souscrite */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold uppercase text-zinc-500 tracking-wider block">
              2. Montant Contractuel Annuel (USD / an)
            </label>
            <div className="relative">
              <input
                type="number"
                value={convertedAmount || ''}
                onChange={(e) => setConvertedAmount(Number(e.target.value))}
                placeholder="Ex: 48000"
                className="w-full px-4 py-3 bg-[#ECEAE5] dark:bg-[#191816] rounded-2xl text-zinc-900 dark:text-white font-mono font-semibold text-sm outline-none focus:ring-2 focus:ring-blue-600 border border-black/5 dark:border-white/5"
              />
              <span className="absolute right-4 top-3.5 text-xs font-semibold text-zinc-400">
                USD
              </span>
            </div>
            <span className="text-[10px] text-zinc-400">
              Inclus dans le total signé répercuté au KAM Office.
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold uppercase text-zinc-500 tracking-wider block">
              3. Offre Commerciale Retenue
            </label>
            <input
              type="text"
              value={convertedOffer}
              onChange={(e) => setConvertedOffer(e.target.value)}
              placeholder="Ex: Fibre Dédiée 1 Gbps + SD-WAN Managé"
              className="w-full px-4 py-3 bg-[#ECEAE5] dark:bg-[#191816] rounded-2xl text-zinc-900 dark:text-white font-semibold text-sm outline-none focus:ring-2 focus:ring-blue-600 border border-black/5 dark:border-white/5"
            />
            <span className="text-[10px] text-zinc-400">
              Solution contractée ou proposition clé remise au client.
            </span>
          </div>
        </div>

        {/* Notes et Compte-Rendu de Débriefing */}
        <div className="space-y-1.5">
          <label className="text-xs font-extrabold uppercase text-zinc-500 tracking-wider block">
            4. Notes de Synthèse & Engagements Pris
          </label>
          <textarea
            rows={3}
            value={conversionNotes}
            onChange={(e) => setConversionNotes(e.target.value)}
            placeholder="Synthétisez les accords conclus, les conditions suspensives et les prochaines étapes convenues avec le client..."
            className="w-full p-4 bg-[#ECEAE5] dark:bg-[#191816] rounded-2xl text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-blue-600 border border-black/5 dark:border-white/5 leading-relaxed resize-none"
          />
        </div>

        {/* Bouton de Soumission au KAM Office */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmitDebriefToKamOffice}
            className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white text-xs font-extrabold rounded-full shadow-md transition-all cursor-pointer flex items-center gap-2.5"
          >
            {isSubmitting ? (
              <>
                <Icons.Sparkles size={16} className="animate-spin" />
                <span>Enregistrement en base...</span>
              </>
            ) : (
              <>
                <Icons.CheckCircle size={16} />
                <span>Enregistrer & Synchroniser avec le KAM Office</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Debrief AI Deliverables */}
      {debriefData && !isGenerating && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Deliverable 1 : Executive Summary & Commitments */}
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 flex flex-col gap-5 shadow-sm border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icons.FileText size={16} className="text-blue-600" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Compte-Rendu Stratégique C-Level
                </h4>
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200/50 dark:border-emerald-500/20">
                Risque : {debriefData.risk_level}
              </span>
            </div>

            <p className="text-xs text-zinc-800 dark:text-zinc-200 font-550 leading-relaxed">
              {debriefData.executive_summary}
            </p>

            <div className="p-3.5 bg-[#E4E1DB] dark:bg-[#363336] rounded-2xl text-[11px] text-zinc-600 dark:text-zinc-400 italic">
              <strong>Transcription : </strong> {debriefData.transcript_text}
            </div>

            {/* Commitments */}
            <div className="pt-4 border-t border-zinc-200/60 dark:border-white/5 space-y-3">
              <span className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider block">
                Engagements & Échéances ({debriefData.commitments_extracted.length}) :
              </span>
              <div className="space-y-2">
                {debriefData.commitments_extracted.map((c) => (
                  <div key={c.id} className="p-3 bg-[#E4E1DB] dark:bg-[#363336] rounded-2xl flex items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-white">{c.action}</span>
                    <span className="text-blue-600 dark:text-blue-400 font-mono text-[11px] shrink-0 font-semibold">{c.due_date}</span>
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
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Email de Suivi Client (Prêt à l&apos;Envoi)
                  </h4>
                </div>

                <button
                  onClick={handleCopyEmail}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
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

