"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Icons } from '../shared/Icons';

interface EscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockedStepTitle: string;
}

export default function EscalationModal({
  isOpen,
  onClose,
  blockedStepTitle
}: EscalationModalProps) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate sending MSP ticket
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 2000);
  };

  const handleSimulateScreenshot = () => {
    setScreenshot('error_popup_sample.png');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-900 overflow-hidden z-10 animate-fade-in flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between bg-zinc-55/10 dark:bg-zinc-950/20">
          <div className="flex items-center gap-2 text-red-500">
            <Icons.AlertTriangle size={18} />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Besoin d'aide ? Escalader au Support MSP
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 border-none bg-transparent cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Form */}
        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-900 flex flex-col gap-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
              <div className="flex justify-between">
                <span className="font-bold text-zinc-450 uppercase">Contexte Utilisateur :</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">{user?.username || 'Client B2B'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-zinc-450 uppercase">Entreprise :</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">{user?.company_name || 'Onbora Client'}</span>
              </div>
              <div className="flex justify-between items-start gap-3">
                <span className="font-bold text-zinc-450 uppercase shrink-0">Étape bloquante :</span>
                <span className="font-semibold text-red-500 dark:text-red-400 text-right">{blockedStepTitle}</span>
              </div>
              <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2 text-[10px] text-zinc-400 italic">
                Ces métadonnées et logs de navigation seront envoyés automatiquement pour faciliter la résolution de votre problème.
              </div>
            </div>

            {/* Error Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Décrivez votre problème en une phrase
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Le QR Code ne s'affiche pas à l'écran, ou l'application mobile dit 'Code invalide'..."
                required
                rows={3}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-orange-500 transition-colors placeholder:text-zinc-450 font-medium"
              />
            </div>

            {/* Screenshot simulator */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Capture d'écran (optionnel)
              </label>
              
              {!screenshot ? (
                <div 
                  onClick={handleSimulateScreenshot}
                  className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-orange-500 hover:bg-orange-500/5 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Icons.FileText className="text-zinc-400" size={20} />
                  <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                    Déposez une image ou cliquez pour simuler
                  </span>
                  <span className="text-[8px] text-zinc-400">Format PNG ou JPG</span>
                </div>
              ) : (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-850 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icons.FileText className="text-green-500" size={16} />
                    <span className="text-[10px] font-mono text-zinc-700 dark:text-zinc-350">{screenshot}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setScreenshot(null)}
                    className="text-red-500 hover:text-red-600 font-bold border-none bg-transparent cursor-pointer text-xs"
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-650 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-md shadow-red-500/10 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed border-none"
            >
              {isSubmitting ? (
                <>
                  <Icons.Loader size={14} className="animate-spin text-white" />
                  Création du ticket en cours...
                </>
              ) : (
                <>
                  <Icons.Send size={14} className="text-white" />
                  Envoyer un ticket au Support MSP
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 flex items-center justify-center shadow-lg shadow-green-500/10">
              <Icons.Check size={26} />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Ticket transmis avec succès !
              </h4>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 max-w-xs leading-relaxed font-medium">
                Votre technicien MSP a reçu l'historique d'adoption complet et la capture d'erreur. Vous serez recontacté d'ici quelques minutes.
              </p>
            </div>

            <button
              onClick={() => {
                setIsSubmitted(false);
                setDescription('');
                setScreenshot(null);
                onClose();
              }}
              className="mt-2 py-2 px-6 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 text-xs font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all border-none cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
