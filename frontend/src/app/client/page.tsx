"use client";

import React, { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import HelpDrawer from '@/components/shared/HelpDrawer';
import Logo from '@/components/shared/Logo';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { Icons } from '@/components/shared/Icons';
import BusinessTwinSlides from '@/components/shared/BusinessTwinSlides';

interface Message {
  id: number;
  sender: 'USER' | 'AI';
  content: string;
  created_at: string;
}

interface Service {
  service_id: number;
  name: string;
  category: string;
  priority: string;
  reasoning: string;
}

interface Twin {
  current_state: string[];
  proposed_state: string[];
  roadmap: string[];
}

export default function ClientDiscoveryPage() {
  const { user, logout } = useAuth();
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [transmitting, setTransmitting] = useState(false);
  const [transmissionSuccess, setTransmissionSuccess] = useState(false);
  
  // Real-time states returned by AI
  const [profile, setProfile] = useState({
    sector: '',
    company_size_estimate: '',
    current_problems: [] as string[],
    current_tools: [] as string[],
    locations_count: 1
  });
  const [isQualified, setIsQualified] = useState(false);
  const [recommendations, setRecommendations] = useState<Service[]>([]);
  const [businessTwin, setBusinessTwin] = useState<Twin | null>(null);
  const [activeTab, setActiveTab] = useState<'services' | 'roadmap'>('services');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const updateProfile = (rawProfile: any) => {
    if (!rawProfile) return;
    setProfile({
      sector: rawProfile.sector || '',
      company_size_estimate: rawProfile.company_size_estimate || '',
      current_problems: rawProfile.current_problems || [],
      current_tools: rawProfile.current_tools || [],
      locations_count: rawProfile.locations_count || 1
    });
  };

  // Initialize conversation session on mount
  useEffect(() => {
    async function initConversation() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${API_URL}/api/discovery/conversations/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        if (res.ok) {
          const data = await res.json();
          setConversationId(data.id);
          setMessages(data.messages || []);
          if (data.extracted_profile) {
            updateProfile(data.extracted_profile);
          }
        }
      } catch (err) {
        console.error("Erreur d'initialisation de la conversation:", err);
      }
    }
    initConversation();
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !conversationId || loading) return;

    const userText = inputValue;
    setInputValue('');
    setLoading(true);

    // Optimistically add user message to list
    const tempUserMsg: Message = {
      id: Date.now(),
      sender: 'USER',
      content: userText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/discovery/conversations/${conversationId}/messages/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: userText }),
      });

      if (res.ok) {
        const data = await res.json();
        
        // Add AI message to list
        const tempAiMsg: Message = {
          id: Date.now() + 1,
          sender: 'AI',
          content: data.ai_message,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempAiMsg]);
        updateProfile(data.extracted_profile);
        setIsQualified(data.is_qualified);
        
        if (data.is_qualified) {
          setRecommendations(data.recommendations || []);
          setBusinessTwin(data.business_twin);
        }
      }
    } catch (err) {
      console.error("Erreur lors de l'envoi du message:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTransmit = async () => {
    if (!conversationId || transmitting) return;
    setTransmitting(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/discovery/conversations/${conversationId}/transmit/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (res.ok) {
        setTransmissionSuccess(true);
      }
    } catch (err) {
      console.error("Erreur de transmission:", err);
    } finally {
      setTransmitting(false);
    }
  };

  // Calculate progression percentage based on filled fields
  const calculateProgress = () => {
    let score = 0;
    if (profile.sector) score += 25;
    if (profile.company_size_estimate) score += 25;
    if (profile.current_problems && profile.current_problems.length > 0) score += 25;
    if (profile.current_tools && profile.current_tools.length > 0) score += 25;
    return score;
  };

  const progress = calculateProgress();
  const userMessageCount = messages.filter(msg => msg.sender === 'USER').length;

  return (
    <ProtectedRoute allowedRoles={['CLIENT_B2B', 'ADMIN']}>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col font-sans">
        {/* Header */}
        <header className="border-b border-zinc-200 dark:border-zinc-900 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <Logo size={32} showBg={true} />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-zinc-50">Onbora</h1>
              <p className="text-[10px] text-zinc-400 font-medium">Copilote de Découverte B2B</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
              </p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                {user?.company_name || 'Client B2B'}
              </p>
            </div>
            <ThemeToggle />
             <button
              onClick={() => setHelpOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-300 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Icons.HelpCircle size={14} /> FAQ & Guide
            </button>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-transparent text-xs font-semibold text-zinc-300 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Icons.LogOut size={14} /> Déconnexion
            </button>
          </div>
        </header>

        {/* Main Work Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          {/* Left panel: Chat discovery */}
          <div className="flex-1 flex flex-col bg-transparent overflow-hidden border-r border-zinc-900">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === 'USER' ? 'ml-auto items-end animate-fade-in' : 'mr-auto items-start animate-fade-in'
                  }`}
                >
                  <span className="text-[10px] font-bold text-zinc-500 mb-1">
                    {msg.sender === 'USER' ? 'Vous' : 'Onbora Copilot'}
                  </span>
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.sender === 'USER'
                        ? 'orange-gradient-bg text-white rounded-tr-none'
                        : 'glass-card text-zinc-100 rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {/* Si c'est le dernier message de l'IA et que la conversation est qualifiée, on affiche l'aperçu du slide deck comme sur Gemini */}
                  {msg.sender === 'AI' && index === messages.length - 1 && isQualified && businessTwin && (
                    <div className="mt-3 w-full animate-fade-in">
                      <BusinessTwinSlides
                        twin={{
                          current_state: businessTwin.current_state || [],
                          proposed_state: businessTwin.proposed_state || [],
                          roadmap: businessTwin.roadmap || [],
                          recommended_services: recommendations || []
                        }}
                        companyName={user?.company_name || 'votre entreprise'}
                        isMiniPreview={true}
                        onOpenFull={() => {
                          const rightPanel = document.getElementById('right-presentation-panel');
                          rightPanel?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="mr-auto items-start flex flex-col max-w-[85%]">
                  <span className="text-[10px] font-bold text-zinc-500 mb-1">Onbora Copilot</span>
                  <div className="px-4 py-3 rounded-2xl glass-card rounded-tl-none flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions de démo guidée */}
            {!isQualified && (
              <div className="px-6 py-2.5 bg-zinc-950/20 border-t border-zinc-900/60 flex flex-col gap-1.5 shrink-0">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                  Parcours de démo guidée (3 questions) :
                </span>
                <div className="flex flex-wrap gap-2">
                  {userMessageCount === 0 && (
                    <button
                      type="button"
                      onClick={() => setInputValue("Nous sommes une clinique médicale de 50 collaborateurs.")}
                      className="px-3 py-1.5 rounded-lg border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 text-orange-500 text-xs font-semibold cursor-pointer transition-all animate-pulse"
                    >
                      Étape 1 : Décrire mon Activité (Clinique Médicale) ➜
                    </button>
                  )}
                  {userMessageCount === 1 && (
                    <button
                      type="button"
                      onClick={() => setInputValue("Notre connexion ADSL coupe souvent et le Wi-Fi ne couvre pas nos salles.")}
                      className="px-3 py-1.5 rounded-lg border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 text-orange-500 text-xs font-semibold cursor-pointer transition-all animate-pulse"
                    >
                      Étape 2 : Signaler les Problèmes (ADSL lent & Wi-Fi instable) ➜
                    </button>
                  )}
                  {userMessageCount === 2 && (
                    <button
                      type="button"
                      onClick={() => setInputValue("Nous utilisons Outlook, Excel et un serveur de fichiers local physique sans protection.")}
                      className="px-3 py-1.5 rounded-lg border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 text-orange-500 text-xs font-semibold cursor-pointer transition-all animate-pulse"
                    >
                      Étape 3 : Spécifier nos Outils (Outlook, Excel, Serveur Local) ➜
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-4 bg-zinc-950/50 border-t border-zinc-900 shrink-0">
              <div className="relative flex items-center">
                <input
                  type="text"
                  disabled={isQualified || loading}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    isQualified
                      ? "La qualification est terminée. Consultez vos recommandations à droite."
                      : "Répondez au copilote Onbora..."
                  }
                  className="w-full pl-4 pr-12 py-3 rounded-xl border border-zinc-900 bg-zinc-950/40 text-sm focus:outline-none focus:border-orange-500 transition-all text-zinc-50 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={isQualified || loading || !inputValue.trim()}
                  className="absolute right-2 px-3 py-1.5 orange-gradient-bg hover:opacity-90 active:scale-98 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                >
                  Envoyer
                </button>
              </div>
            </form>
          </div>

          {/* Right panel: Extracted profile & Recommendations */}
          <div className="w-full md:w-[450px] flex flex-col bg-zinc-950/20 backdrop-blur-md overflow-y-auto border-l border-zinc-900 shrink-0">
            {!isQualified ? (
              // Qualification Status Screen
              <div className="p-6 flex flex-col gap-6 animate-fade-in">
                <div>
                  <h2 className="text-base font-bold tracking-tight text-zinc-50">Qualification en cours</h2>
                  <p className="text-xs text-zinc-400 mt-1">L'IA analyse vos messages pour qualifier vos besoins d'infrastructure.</p>
                </div>

                {/* Progress bar */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-zinc-400">Taux de complétion</span>
                    <span className="text-orange-500">{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full orange-gradient-bg transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Real-time Extracted Data */}
                <div className="glass-card rounded-xl p-4 flex flex-col gap-4">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Données extraites
                  </h3>

                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs border-b border-zinc-100 dark:border-zinc-800/60 pb-2">
                      <span className="text-zinc-500">Secteur</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {profile.sector || <span className="text-zinc-300 dark:text-zinc-700 italic">En attente</span>}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs border-b border-zinc-100 dark:border-zinc-800/60 pb-2">
                      <span className="text-zinc-500">Taille de l'entreprise</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {profile.company_size_estimate || <span className="text-zinc-300 dark:text-zinc-700 italic">En attente</span>}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs border-b border-zinc-100 dark:border-zinc-800/60 pb-2">
                      <span className="text-zinc-500">Sites géographiques</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {profile.locations_count} site{profile.locations_count > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs">
                      <span className="text-zinc-500">Problèmes relevés</span>
                      {(!profile.current_problems || profile.current_problems.length === 0) ? (
                        <span className="text-zinc-300 dark:text-zinc-700 italic text-[11px]">Aucun problème mentionné pour l'instant</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(profile.current_problems || []).map((prob, idx) => (
                            <span key={idx} className="px-2 py-1 rounded bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 text-[10px] font-medium">
                              {prob}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs pt-1.5">
                      <span className="text-zinc-500">Outils actuels</span>
                      {(!profile.current_tools || profile.current_tools.length === 0) ? (
                        <span className="text-zinc-300 dark:text-zinc-700 italic text-[11px]">Aucun outil mentionné</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(profile.current_tools || []).map((tool, idx) => (
                            <span key={idx} className="px-2 py-1 rounded bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 text-[10px] font-medium">
                              {tool}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Recommendations & Business Twin Screen (Qualified)
              <div className="flex flex-col h-full animate-fade-in overflow-hidden">
                <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6" id="right-presentation-panel">
                  {businessTwin && (
                    <BusinessTwinSlides
                      twin={{
                        current_state: businessTwin.current_state || [],
                        proposed_state: businessTwin.proposed_state || [],
                        roadmap: businessTwin.roadmap || [],
                        recommended_services: recommendations || []
                      }}
                      companyName={user?.company_name || 'votre entreprise'}
                    />
                  )}
                </div>

                {/* Transmission to KAM */}
                <div className="p-6 border-t border-zinc-900 bg-zinc-950/40 shrink-0 flex flex-col gap-3">
                  <button
                    onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/discovery/conversations/${conversationId}/export/`, '_blank')}
                    className="w-full py-2.5 rounded-xl border border-zinc-850 hover:border-zinc-700 bg-zinc-900 text-xs font-bold text-zinc-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Icons.Download size={14} /> Exporter mon Business Twin (PDF)
                  </button>

                  {transmissionSuccess ? (
                    <div className="p-4 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-xl text-xs font-bold text-center animate-fade-in">
                      Dossier transmis ! Un Key Account Manager (KAM) va étudier votre dossier et vous recontacter sous 24h.
                    </div>
                  ) : (
                    <button
                      onClick={handleTransmit}
                      disabled={transmitting}
                      className="w-full py-3 orange-gradient-bg hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-orange-500/10"
                    >
                      {transmitting ? 'Transmission en cours...' : 'Transmettre mon dossier à un conseiller (KAM)'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
      <HelpDrawer isOpen={helpOpen} onClose={() => setHelpOpen(false)} role="CLIENT_B2B" />
    </ProtectedRoute>
  );
}
