"use client";

import React, { useEffect, useState } from 'react';
import { Icons } from '../shared/Icons';

interface StepMediaViewerProps {
  mediaType: 'mfa' | 'vpn' | 'sharepoint' | 'phone';
  currentStep: number;
}

export default function StepMediaViewer({ mediaType, currentStep }: StepMediaViewerProps) {
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const renderVisual = () => {
    switch (mediaType) {
      case 'mfa':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-zinc-950 rounded-2xl relative overflow-hidden border border-zinc-900">
            {/* Phone Body */}
            <div className="w-[140px] h-[220px] rounded-2xl border-4 border-zinc-800 bg-zinc-900 shadow-2xl relative flex flex-col items-center overflow-hidden">
              {/* Notch */}
              <div className="w-16 h-4 bg-zinc-800 rounded-b-xl absolute top-0 z-10 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-950"></span>
              </div>
              
              {/* Screen Content */}
              <div className="flex-1 w-full pt-6 px-2 flex flex-col items-center text-center justify-between pb-3">
                <div className="flex flex-col items-center gap-1.5 mt-2">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Icons.Shield className="text-blue-500" size={18} />
                  </div>
                  <span className="text-[9px] font-bold text-zinc-200">Authenticator</span>
                </div>

                {currentStep === 1 && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
                    <div className="px-3 py-1.5 rounded bg-blue-650 text-[8px] font-bold text-white uppercase tracking-wider animate-bounce">
                      Télécharger App
                    </div>
                    <span className="text-[7px] text-zinc-500">App Store / Play Store</span>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <div className="w-14 h-14 bg-white p-1 rounded-sm border border-zinc-700 flex flex-wrap justify-between content-between">
                      {/* Simulated QR Code */}
                      <div className="w-5 h-5 bg-zinc-950"></div>
                      <div className="w-5 h-5 bg-zinc-950"></div>
                      <div className="w-5 h-5 bg-zinc-950"></div>
                      <div className="w-5 h-5 bg-zinc-950"></div>
                      <div className="w-3 h-3 bg-zinc-950"></div>
                      <div className="w-4 h-4 bg-zinc-950"></div>
                      <div className="w-2 h-2 bg-zinc-950"></div>
                      <div className="w-5 h-5 bg-zinc-950"></div>
                    </div>
                    <span className="text-[7px] text-zinc-400">Scanner le QR Code</span>
                  </div>
                )}

                {currentStep >= 3 && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 w-full px-1">
                    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-1.5 w-full flex flex-col gap-1">
                      <span className="text-[7px] font-bold text-zinc-300">Connexion professionnelle</span>
                      <span className="text-[9px] font-black text-orange-500 tracking-widest animate-pulse">48</span>
                      <span className="text-[6px] text-zinc-500">Entrez ce nombre pour valider</span>
                    </div>
                    
                    <div className="flex gap-1.5 w-full justify-center">
                      <span className="px-2 py-0.5 rounded bg-zinc-700 text-[7px] font-bold text-zinc-400">Refuser</span>
                      <span className={`px-2 py-0.5 rounded bg-green-500 text-[7px] font-bold text-white ${pulse ? 'ring-2 ring-green-400' : ''}`}>Approuver</span>
                    </div>
                  </div>
                )}

                <div className="w-12 h-1 bg-zinc-700 rounded-full mt-1"></div>
              </div>
            </div>
          </div>
        );

      case 'vpn':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-zinc-900 rounded-2xl relative overflow-hidden border border-zinc-800">
            {/* VPN Window */}
            <div className="w-[180px] bg-zinc-950 rounded-lg border border-zinc-800 shadow-2xl overflow-hidden flex flex-col text-left">
              {/* Window Header */}
              <div className="bg-zinc-900 px-2.5 py-1.5 flex items-center justify-between border-b border-zinc-800">
                <span className="text-[8px] font-bold text-zinc-400 flex items-center gap-1.5">
                  <Icons.Network size={10} className="text-orange-500" />
                  Cisco Secure Client
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
              </div>
              
              {/* Window Body */}
              <div className="p-3 flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[7px] text-zinc-500 uppercase font-bold tracking-wider">Serveur VPN</span>
                  <div className="h-6 px-2 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-between">
                    <span className="text-[8px] font-mono text-zinc-300">
                      {currentStep >= 2 ? 'vpn.onbora-entreprise.fr' : ''}
                    </span>
                    {currentStep === 1 && (
                      <span className="w-0.5 h-3 bg-orange-500 animate-pulse"></span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <span className="text-[7px] text-zinc-500 font-bold flex items-center gap-1">
                    Status: 
                    {currentStep >= 4 ? (
                      <span className="text-green-500 font-bold flex items-center gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-green-500 animate-ping"></span>
                        Connecté
                      </span>
                    ) : (
                      <span className="text-zinc-650">Déconnecté</span>
                    )}
                  </span>
                  
                  <button className={`px-3 py-1 rounded text-[8px] font-bold text-white transition-all shadow-sm ${
                    currentStep >= 4 
                      ? 'bg-zinc-800 border border-zinc-750 text-zinc-400' 
                      : currentStep >= 2
                        ? 'bg-orange-500 shadow-orange-500/20 active:scale-95'
                        : 'bg-zinc-800 border border-zinc-850 text-zinc-600'
                  }`}>
                    {currentStep >= 4 ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Visual connector status */}
            {currentStep >= 4 && (
              <div className="absolute top-2 right-2 p-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 animate-pulse">
                <Icons.CheckCircle size={14} />
              </div>
            )}
          </div>
        );

      case 'sharepoint':
        return (
          <div className="w-full h-full flex flex-col justify-between p-3.5 bg-zinc-900 rounded-2xl border border-zinc-800 text-left text-[8px]">
            {/* SharePoint/Teams Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
              <span className="font-bold text-zinc-350 flex items-center gap-1">
                <Icons.Folder size={10} className="text-blue-500" />
                Explorateur &gt; SharePoint
              </span>
              {currentStep === 2 && (
                <span className="px-2 py-0.5 rounded bg-blue-600 font-bold text-white animate-pulse flex items-center gap-1 cursor-pointer">
                  <Icons.Refresh size={8} /> Synchroniser
                </span>
              )}
            </div>

            {/* Folder list */}
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex items-center justify-between p-1.5 bg-zinc-950/40 rounded border border-zinc-850/50">
                <div className="flex items-center gap-2">
                  <Icons.Folder className="text-yellow-600 shrink-0" size={12} />
                  <span className="text-zinc-300 font-bold">Dossier Direction Générale</span>
                </div>
                {currentStep >= 2 ? (
                  <Icons.Cloud size={10} className="text-blue-500 animate-pulse" />
                ) : (
                  <span className="text-zinc-600">Local</span>
                )}
              </div>

              <div className="flex items-center justify-between p-1.5 bg-zinc-950/40 rounded border border-zinc-850/50">
                <div className="flex items-center gap-2">
                  <Icons.FileText className="text-zinc-400 shrink-0" size={12} />
                  <span className="text-zinc-300 font-bold">Budget_Projets_2026.xlsx</span>
                </div>
                {currentStep >= 2 ? (
                  <Icons.Cloud size={10} className="text-blue-500" />
                ) : (
                  <span className="text-zinc-600">Local</span>
                )}
              </div>

              <div className="flex items-center justify-between p-1.5 bg-zinc-950/40 rounded border border-zinc-850/50">
                <div className="flex items-center gap-2">
                  <Icons.FileText className="text-orange-500 shrink-0" size={12} />
                  <span className="text-zinc-300 font-bold">Roadmap_Onboarding_Client.pdf</span>
                </div>
                {currentStep >= 3 ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7px] text-green-500 font-semibold">Lien partagé</span>
                    <Icons.CheckCircle size={10} className="text-green-500" />
                  </div>
                ) : (
                  <Icons.Cloud size={10} className="text-blue-500" />
                )}
              </div>
            </div>
          </div>
        );

      case 'phone':
        return (
          <div className="w-full h-full flex flex-col justify-between p-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-left text-[8px]">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
              <span className="font-bold text-zinc-300 flex items-center gap-1">
                <Icons.Phone size={10} className="text-orange-500" />
                Teams Phone - Paramètres
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-2 justify-center">
              <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-850 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-zinc-200">Règles de répondeur</span>
                  <span className="text-[7px] text-zinc-500">Renvoyer immédiatement les appels entrants</span>
                </div>
                
                {/* Switch button */}
                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${
                  currentStep >= 2 ? 'bg-orange-500' : 'bg-zinc-700'
                }`}>
                  <div className={`w-3 h-3 rounded-full bg-white transition-transform ${
                    currentStep >= 2 ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </div>
              </div>

              {currentStep >= 2 && (
                <div className="p-2.5 bg-zinc-950/60 rounded-lg border border-zinc-850/50 flex flex-col gap-1.5 animate-fade-in">
                  <span className="text-[7px] uppercase font-bold text-zinc-500">Destination du renvoi</span>
                  <div className="flex gap-1.5">
                    <span className="px-2 py-1 rounded bg-zinc-800 border border-zinc-750 text-zinc-350 font-bold">
                      Messagerie vocale
                    </span>
                    <span className="px-2 py-1 rounded bg-zinc-900 border border-zinc-850 text-zinc-600">
                      Collaborateur
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full aspect-[4/3] bg-zinc-50 dark:bg-zinc-900/30 rounded-xl p-3.5 flex items-center justify-center shrink-0 border border-zinc-200/50 dark:border-zinc-900">
      {renderVisual()}
    </div>
  );
}
