"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from '@/components/shared/Icons';
import { fetchAPI } from '@/lib/api';

interface CopilotAction {
  code: string;
  label: string;
  description: string;
}

interface AssistantProfile {
  assistant_id: string;
  name: string;
  role_scope: string;
  role_display: string;
  allowed_actions: CopilotAction[];
  avatar: string;
  system_prompt: string;
  user_id: number;
  user_name: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  action_type?: string | null;
  action_payload?: any;
  action_result?: any;
  action_status?: string;
  created_at: string;
}

interface CopilotChatViewProps {
  userRole?: string;
}

export default function CopilotChatView({ userRole }: CopilotChatViewProps) {
  const [profile, setProfile] = useState<AssistantProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedEmailText, setCopiedEmailText] = useState(false);

  // Assistant Name Renaming State
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  // 1. Charger le profil de l'assistant dédié
  const loadProfile = useCallback(async () => {
    try {
      const data = await fetchAPI('/api/accounts/copilot/profile/');
      setProfile(data);
      setNewName(data.name);
    } catch (err) {
      console.error("Erreur chargement profil Copilot:", err);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // 2. Charger les sessions existantes
  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchAPI('/api/accounts/copilot/conversations/');
      if (Array.isArray(data.conversations) && data.conversations.length > 0) {
        setConversations(data.conversations);
        if (!activeConversationId) {
          setActiveConversationId(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.error("Erreur chargement sessions:", err);
    }
  }, [activeConversationId]);

  // 3. Charger les messages d'une session
  const loadMessages = useCallback(async (convId: string) => {
    try {
      const data = await fetchAPI(`/api/accounts/copilot/conversations/${convId}/messages/`);
      if (Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Erreur chargement messages:", err);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadConversations();
  }, [loadProfile, loadConversations]);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    }
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Initialisation Reconnaissance Vocale (Web Speech API)
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'fr-FR';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!speechRecognitionRef.current) {
      alert("La reconnaissance vocale n'est pas prise en charge sur ce navigateur.");
      return;
    }
    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      speechRecognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Envoi de message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || sending) return;

    if (isListening && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    }

    // Message optimiste local
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setInputValue('');
    setSending(true);

    try {
      const res = await fetchAPI('/api/accounts/copilot/chat/', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          conversation_id: activeConversationId || undefined
        })
      });

      if (res.conversation_id && res.conversation_id !== activeConversationId) {
        setActiveConversationId(res.conversation_id);
      }

      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
      }
      loadConversations();
    } catch (err: any) {
      console.error("Erreur envoi message Copilot:", err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: "Désolé, une erreur réseau est survenue lors de l'exécution de la requête. Veuillez réessayer.",
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  // Démarrer une nouvelle session
  const handleStartNewSession = async () => {
    try {
      const res = await fetchAPI('/api/accounts/copilot/conversations/', {
        method: 'POST',
        body: JSON.stringify({ title: 'Nouvelle session' })
      });
      if (res.id) {
        setActiveConversationId(res.id);
        setMessages([]);
        loadConversations();
      }
    } catch (err) {
      console.error("Erreur création session:", err);
    }
  };

  // Sauvegarder le nouveau nom de l'assistant
  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || renaming) return;
    setRenaming(true);
    try {
      const res = await fetchAPI('/api/accounts/copilot/profile/', {
        method: 'PATCH',
        body: JSON.stringify({ name: newName.trim() })
      });
      if (profile) {
        setProfile({ ...profile, name: res.name });
      }
      setIsRenameModalOpen(false);
    } catch (err) {
      console.error("Erreur renommage assistant:", err);
      alert("Impossible de renommer l'assistant.");
    } finally {
      setRenaming(false);
    }
  };

  const copyAssistantId = () => {
    if (!profile) return;
    navigator.clipboard.writeText(profile.assistant_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Suggestions rapides contextualisées par rôle
  const getSuggestedPrompts = () => {
    const scope = profile?.role_scope || userRole || 'KAM';
    if (scope === 'KAM') {
      return [
        { label: "Analyse mon planning", query: "Analyse mon planning et donne-moi mes priorités du jour" },
        { label: "Brief compte stratégique", query: "Fais-moi un brief stratégique sur Rawbank" },
        { label: "Email de relance B2B", query: "Rédige un email de relance après premier contact" },
        { label: "Qualification BANT", query: "Comment qualifier le BANT de mes comptes à fort potentiel ?" }
      ];
    }
    if (scope === 'SUPERVISOR') {
      return [
        { label: "Rédiger une directive", query: "Rédige une directive pour les commerciaux de la plaque Gombe" },
        { label: "Dispatcher plaque Gombe", query: "Propose un dispatch automatique pour la plaque Gombe" },
        { label: "Audit couverture", query: "Analyse le taux de visite des entreprises de mes plaques" },
        { label: "Performance commerciaux", query: "Fais-moi le point sur les commerciaux les plus performants" }
      ];
    }
    if (scope === 'KAM_MANAGER') {
      return [
        { label: "Équilibrer les portefeuilles", query: "Analyse la charge des KAMs entre Grands Comptes et PME" },
        { label: "Directive équipe KAM", query: "Rédige une directive de closing pour les comptes à plus de 1M$" },
        { label: "Synthèse pipeline", query: "Fais une synthèse du pipeline et des contrats signés" }
      ];
    }
    return [
      { label: "Audit segmentation", query: "Audite les seuils de segmentation des 1000 comptes" },
      { label: "Directive générale", query: "Rédige une directive stratégique pour le Back-Office" },
      { label: "KPIs plateforme", query: "Donne-moi le bilan consolidé des performances" }
    ];
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] w-full overflow-hidden select-none bg-[#F6F5F2] dark:bg-[#242124] text-zinc-900 dark:text-white rounded-[32px] p-4 md:p-6 border border-black/5 dark:border-white/5">
      
      {/* 1. TOP HEADER DE L'ASSISTANT */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-4 border-b border-zinc-200 dark:border-zinc-800 gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#4F6CE8]/10 dark:bg-[#4F6CE8]/20 flex items-center justify-center text-[#4F6CE8]">
            <Icons.Bot size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                {profile?.name || "Copilote IA"}
              </h2>
              <button
                onClick={() => setIsRenameModalOpen(true)}
                title="Renommer votre assistant IA"
                className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <Icons.FileEdit size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                onClick={copyAssistantId}
                title="Copier l'identifiant unique de l'assistant (UUID)"
                className="text-[11px] font-mono text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
              >
                <span>ID: {profile?.assistant_id ? `${profile.assistant_id.slice(0, 13)}...` : 'Chargement...'}</span>
                {copiedId ? <Icons.Check size={12} className="text-emerald-500" /> : <Icons.Copy size={12} />}
              </button>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span className="text-[11px] font-semibold text-[#4F6CE8] bg-[#4F6CE8]/10 px-2 py-0.5 rounded-full">
                {profile?.role_display || profile?.role_scope || "Profil Métier"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions d'en-tête */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleStartNewSession}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-200/80 dark:bg-zinc-800/80 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
          >
            <Icons.Refresh size={14} />
            <span>Nouvelle session</span>
          </button>
        </div>
      </div>

      {/* 2. BANNIÈRE DES ACTIONS AUTORISÉES SELON LE RÔLE */}
      {profile && profile.allowed_actions && profile.allowed_actions.length > 0 && (
        <div className="mb-3 px-3 py-2 rounded-2xl bg-zinc-100 dark:bg-[#2D2A2D] border border-zinc-200/60 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider whitespace-nowrap">
            Autorisations Actives :
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {profile.allowed_actions.map((act) => (
              <span
                key={act.code}
                title={act.description}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60 whitespace-nowrap"
              >
                {act.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 3. FLUX DE CONVERSATION */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 rounded-2xl p-2">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-[#4F6CE8]/10 dark:bg-[#4F6CE8]/20 flex items-center justify-center text-[#4F6CE8] mb-4">
              <Icons.Bot size={32} />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
              Bienvenue sur votre {profile?.name || "Copilote IA"}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Posez une question, dictez vocalement ou demandez au Copilote d'automatiser vos tâches chronophages
              (analyse de planning, briefs d'entreprises, rédaction d'emails ou directives).
            </p>

            <div className="w-full space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Suggestions d'actions :</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {getSuggestedPrompts().map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(p.query)}
                    className="p-2.5 text-left rounded-xl bg-white dark:bg-[#2D2A2D] border border-zinc-200 dark:border-zinc-800 hover:border-[#4F6CE8] text-xs text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                  >
                    <span className="font-semibold block text-zinc-900 dark:text-white">{p.label}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">{p.query}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-[#4F6CE8] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Icons.Bot size={18} />
                </div>
              )}

              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-[#4F6CE8] text-white rounded-tr-none'
                    : 'bg-white dark:bg-[#2D2A2D] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-tl-none shadow-sm'
                }`}
              >
                {/* Contenu textuel */}
                <div className="whitespace-pre-wrap font-sans">
                  {m.content}
                </div>

                {/* CARTE STRUCTURÉE : FICHE BRIEF CLIENT (RESEARCH_BRIEF) */}
                {m.action_type === 'RESEARCH_BRIEF' && m.action_result && (
                  <div className="mt-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-200 dark:border-zinc-700">
                      <span className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <Icons.Building size={14} className="text-[#4F6CE8]" />
                        {m.action_result.name}
                      </span>
                      <span className="text-[10px] font-semibold text-zinc-500">
                        CRM: {m.action_result.crm_id}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-zinc-400 block text-[10px]">Chiffre d'Affaires</span>
                        <span className="font-semibold text-zinc-900 dark:text-white">{m.action_result.annual_revenue}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[10px]">Effectif</span>
                        <span className="font-semibold text-zinc-900 dark:text-white">{m.action_result.employee_count} pers.</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[10px]">Opérateur Actuel</span>
                        <span className="font-semibold text-zinc-900 dark:text-white">{m.action_result.current_operator}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[10px]">Solution Cible</span>
                        <span className="font-semibold text-[#4F6CE8]">{m.action_result.recommended_solution}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* CARTE STRUCTURÉE : EMAIL DE RELANCE (DRAFT_FOLLOWUP_EMAIL) */}
                {m.action_type === 'DRAFT_FOLLOWUP_EMAIL' && m.action_result && m.action_result.email_body && (
                  <div className="mt-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                        <Icons.Mail size={13} className="text-[#4F6CE8]" />
                        Brouillon d'email prêt à copier
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(m.action_result.email_body);
                          setCopiedEmailText(true);
                          setTimeout(() => setCopiedEmailText(false), 2000);
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#4F6CE8] hover:underline cursor-pointer"
                      >
                        {copiedEmailText ? <Icons.Check size={12} /> : <Icons.Copy size={12} />}
                        <span>{copiedEmailText ? 'Copié !' : 'Copier'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <span className={`text-[9px] block mt-2 text-right ${isUser ? 'text-blue-100' : 'text-zinc-400'}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#4F6CE8] text-white flex items-center justify-center shrink-0">
              <Icons.Bot size={18} />
            </div>
            <div className="rounded-2xl rounded-tl-none p-3.5 bg-white dark:bg-[#2D2A2D] border border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#4F6CE8] animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-[#4F6CE8] animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-[#4F6CE8] animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] text-zinc-400 ml-1">Le Copilote traite votre demande...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. CHIPS DE SUGGESTION RAPIDE */}
      <div className="py-2 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
        {getSuggestedPrompts().map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p.query)}
            disabled={sending}
            className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-white dark:bg-[#2D2A2D] border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-[#4F6CE8] hover:text-[#4F6CE8] whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 5. ZONE DE SAISIE & MICROPHONE VOCAL */}
      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Bouton Enregistrement Vocal */}
          <button
            type="button"
            onClick={toggleListening}
            title={isListening ? "Arrêter la dictée vocale" : "Parler au Copilote (Reconnaissance vocale)"}
            className={`p-3 rounded-2xl transition-all cursor-pointer ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            {isListening ? <Icons.MicOff size={18} /> : <Icons.Mic size={18} />}
          </button>

          {/* Champ Texte */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isListening ? "Écoute en cours... parlez naturellement" : "Demandez une action au Copilote (brief, planning, relance, directive)..."}
            disabled={sending}
            className="flex-1 bg-white dark:bg-[#2D2A2D] border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#4F6CE8]"
          />

          {/* Bouton Envoyer (Strictement sans dégradé et sans box-shadow) */}
          <button
            type="submit"
            disabled={!inputValue.trim() || sending}
            className="px-5 py-3 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D56B2] text-white text-xs font-semibold shadow-none transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
          >
            <span>Envoyer</span>
            <Icons.Send size={14} />
          </button>
        </form>
      </div>

      {/* 6. MODAL RENOMMER L'ASSISTANT */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl max-w-md w-full p-6 border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Personnaliser le nom de votre Assistant IA
              </h3>
              <button
                onClick={() => setIsRenameModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                <Icons.X size={18} />
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
              Donnez un nom propre à votre assistant (ex: <strong>Codex B2B</strong>, <strong>Atlas</strong>, <strong>Jarvis</strong>).
              Chaque utilisateur dispose de son instance d'assistant dédiée avec son UUID unique dans la base de données.
            </p>

            <form onSubmit={handleSaveRename}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Codex B2B"
                className="w-full bg-white dark:bg-[#242124] border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-[#4F6CE8] mb-4"
                autoFocus
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRenameModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={renaming || !newName.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#4F6CE8] hover:bg-[#3D56B2] text-white shadow-none transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {renaming ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
