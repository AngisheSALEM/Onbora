"use client";

import React from 'react';

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'CLIENT_B2B' | 'SALESPERSON' | 'KAM';
}

export default function HelpDrawer({ isOpen, onClose, role }: HelpDrawerProps) {
  if (!isOpen) return null;

  const renderContent = () => {
    switch (role) {
      case 'CLIENT_B2B':
        return (
          <div className="flex flex-col gap-5">
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Onboarding Client</h4>
              <p className="text-xs text-zinc-500 mt-1">FAQ & Guide d'utilisation pour le parcours de découverte.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="p-3.5 glass-card rounded-xl flex flex-col gap-1">
                <span className="text-xs font-bold text-zinc-100">🤖 Comment fonctionne le copilote Onbora ?</span>
                <p className="text-xs text-zinc-400 leading-normal">
                  Le copilote Onbora est un assistant conversationnel conçu pour comprendre vos problématiques réseau, cloud et collaboration au fil de l'eau. Il extrait les détails de votre profil en temps réel.
                </p>
              </div>

              <div className="p-3.5 glass-card rounded-xl flex flex-col gap-1">
                <span className="text-xs font-bold text-zinc-100">📊 Qu'est-ce que le Business Twin (Jumeau Numérique) ?</span>
                <p className="text-xs text-zinc-400 leading-normal">
                  C'est un comparateur d'infrastructures. Il met en regard votre situation actuelle ("Avant") avec ses dysfonctionnements, et l'infrastructure recommandée ("Après") accompagnée d'une roadmap de transition par étapes.
                </p>
              </div>

              <div className="p-3.5 glass-card rounded-xl flex flex-col gap-1">
                <span className="text-xs font-bold text-zinc-100">✉️ Que se passe-t-il après la transmission de mon dossier ?</span>
                <p className="text-xs text-zinc-400 leading-normal">
                  Une fois transmis, votre dossier est verrouillé et envoyé dans la file d'attente d'un Key Account Manager (KAM) d'Orange Business. Il analysera votre Business Twin et vous recontactera sous 24h.
                </p>
              </div>
            </div>
          </div>
        );
      case 'SALESPERSON':
        return (
          <div className="flex flex-col gap-5">
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Guide Commercial terrain</h4>
              <p className="text-xs text-zinc-500 mt-1">Apprenez à utiliser le copilote en prospection physique.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full orange-gradient-bg text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-100">Ciblage & Recherche</span>
                  <p className="text-xs text-zinc-400 leading-normal mt-0.5">
                    Saisissez le nom d'un prospect. Le système simule un scraping de son site web et consulte le CRM existant.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full orange-gradient-bg text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-100">Brief pré-visite</span>
                  <p className="text-xs text-zinc-400 leading-normal mt-0.5">
                    Consultez l'objectif de visite suggéré, les hypothèses techniques, et les questions clés d'accroche générées par l'IA.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full orange-gradient-bg text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-100">Dictaphone Whisper & Notes</span>
                  <p className="text-xs text-zinc-400 leading-normal mt-0.5">
                    Pendant la visite, activez le micro pour enregistrer l'échange ou saisissez vos notes au clavier. L'IA en extrait les besoins et objections.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full orange-gradient-bg text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-100">Brouillon d'email & Envoi</span>
                  <p className="text-xs text-zinc-400 leading-normal mt-0.5">
                    Modifiez le projet d'email pré-rédigé, exportez le rapport en PDF, puis transmettez le dossier qualifié au KAM.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'KAM':
        return (
          <div className="flex flex-col gap-5">
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Guide de gestion KAM</h4>
              <p className="text-xs text-zinc-500 mt-1">Optimisez le suivi et la validation de votre portefeuille de prospects.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="p-3.5 glass-card rounded-xl flex flex-col gap-1">
                <span className="text-xs font-bold text-zinc-100">📋 Traiter la file d'attente</span>
                <p className="text-xs text-zinc-400 leading-normal">
                  Filtrez les prospects par "Nouveau" pour repérer les opportunités inbound qualifiées en ligne et les visites transmises par les commerciaux terrain.
                </p>
              </div>

              <div className="p-3.5 glass-card rounded-xl flex flex-col gap-1">
                <span className="text-xs font-bold text-zinc-100">✍️ Annotations et assignation</span>
                <p className="text-xs text-zinc-400 leading-normal">
                  Assignez-vous le dossier. Rédigez vos notes de suivi interne (appels téléphoniques, rendez-vous planifiés) et mettez à jour le statut en direct.
                </p>
              </div>

              <div className="p-3.5 glass-card rounded-xl flex flex-col gap-1">
                <span className="text-xs font-bold text-zinc-100">🖨️ Préparation du Pitch Client</span>
                <p className="text-xs text-zinc-400 leading-normal">
                  Consultez le Business Twin interactif et la chronologie de déploiement estimée. Utilisez le bouton "Exporter le Dossier" pour l'imprimer avant votre rendez-vous de négociation.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Overlay backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-zinc-950/90 backdrop-blur-md h-full shadow-2xl flex flex-col z-10 animate-fade-in border-l border-zinc-900">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/40 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center font-black text-xs shadow-sm shadow-orange-500/20">?</span>
            <h3 className="text-sm font-bold text-zinc-50">Centre d'Adoption Onbora</h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-zinc-200 font-medium cursor-pointer border-none bg-transparent"
          >
            Fermer ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-900 bg-zinc-950/40 shrink-0 text-center">
          <p className="text-[10px] text-zinc-500 font-medium">Orange Business Services © 2026</p>
        </div>

      </div>
    </div>
  );
}
