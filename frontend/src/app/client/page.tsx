"use client";

import React, { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import HelpDrawer from '@/components/shared/HelpDrawer';
import Logo from '@/components/shared/Logo';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { Icons } from '@/components/shared/Icons';
import GoogleSlidesTwin from '@/components/shared/GoogleSlidesTwin';

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

  // Audio and Speech variables
  const [isListening, setIsListening] = useState(false);
  const [currentlyPlayingMsgId, setCurrentlyPlayingMsgId] = useState<number | null>(null);
  
  // Voice call states
  const [isCallActive, setIsCallActive] = useState(false);
  const [callState, setCallState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [micLevel, setMicLevel] = useState(0);
  const [callTranscriptUser, setCallTranscriptUser] = useState('');
  const [callTranscriptAi, setCallTranscriptAi] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  const recognitionRef = useRef<any>(null);
  const callRecognitionRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const callStateRef = useRef(callState);

  // Sync ref with state for event listeners
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Speech Recognition hook for main chat dictee
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'fr-FR';
      
      rec.onstart = () => {
        setIsListening(true);
      };
      
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => (prev ? prev + ' ' + transcript : transcript));
      };
      
      rec.onend = () => {
        setIsListening(false);
      };
      
      rec.onerror = (err: any) => {
        console.error("Erreur reconnaissance vocale:", err);
        setIsListening(false);
      };
      
      recognitionRef.current = rec;
    }
  }, []);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // TTS playback method
  const speakText = (text: string, msgId: number) => {
    if (typeof window === 'undefined') return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (currentlyPlayingMsgId === msgId) {
        setCurrentlyPlayingMsgId(null);
        return;
      }
    }

    if (!text) return;

    // Clean markdown before speaking
    const cleanText = text.replace(/[*#_~`\-+]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'fr-FR';
    
    setCurrentlyPlayingMsgId(msgId);
    
    utterance.onend = () => {
      setCurrentlyPlayingMsgId(null);
    };
    utterance.onerror = () => {
      setCurrentlyPlayingMsgId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeechToText = () => {
    if (!recognitionRef.current) {
      alert("La reconnaissance vocale n'est pas supportée ou activée sur votre navigateur.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Voice Call Loop implementation
  const startMicMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setMicLevel(avg);
        if (micStreamRef.current) {
          requestAnimationFrame(updateVolume);
        }
      };
      updateVolume();
    } catch (err) {
      console.error("Erreur d'accès au micro pour le visualiseur:", err);
    }
  };

  const startCallSpeechRecognition = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'fr-FR';

    rec.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript) {
        setCallTranscriptUser(finalTranscript);
        processCallInput(finalTranscript);
      } else {
        setCallTranscriptUser(interimTranscript);
      }
    };

    rec.onend = () => {
      if (callStateRef.current === 'listening') {
        try {
          callRecognitionRef.current.start();
        } catch (e) {}
      }
    };

    rec.onerror = (err: any) => {
      console.error("Erreur reconnaissance vocale appel:", err);
    };

    callRecognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {}
  };

  const processCallInput = async (text: string) => {
    if (!text.trim() || !conversationId) return;
    
    try {
      callRecognitionRef.current?.stop();
    } catch (e) {}
    
    setCallState('thinking');
    
    // Add user message to conversation list
    const tempUserMsg: Message = {
      id: Date.now(),
      sender: 'USER',
      content: text,
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
        body: JSON.stringify({ content: text }),
      });

      if (res.ok) {
        const data = await res.json();
        
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

        setCallTranscriptAi(data.ai_message);
        speakCallResponse(data.ai_message);
      } else {
        setCallState('listening');
        startCallSpeechRecognition();
      }
    } catch (err) {
      console.error("Erreur call:", err);
      setCallState('listening');
      startCallSpeechRecognition();
    }
  };

  const speakCallResponse = (text: string) => {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    
    setCallState('speaking');
    
    const cleanText = text.replace(/[*#_~`\-+]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'fr-FR';
    
    utterance.onend = () => {
      setCallState('listening');
      try {
        callRecognitionRef.current?.start();
      } catch (e) {}
    };
    
    utterance.onerror = () => {
      setCallState('listening');
      try {
        callRecognitionRef.current?.start();
      } catch (e) {}
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const startVoiceCall = async () => {
    setIsMuted(false);
    setIsCallActive(true);
    setCallState('speaking');
    setCallTranscriptUser('');
    setCallTranscriptAi("Bonjour, je suis le copilote Onbora. Je vous écoute.");
    
    speakCallResponse("Bonjour, je suis le copilote Onbora. Je vous écoute. Parlez-moi de votre entreprise, de votre secteur d'activité ou de vos besoins d'infrastructure.");

    await startMicMonitoring();
    startCallSpeechRecognition();
  };

  const endVoiceCall = () => {
    setIsCallActive(false);
    setCallState('idle');
    
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }
    
    try {
      callRecognitionRef.current?.stop();
    } catch (e) {}
    callRecognitionRef.current = null;
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setMicLevel(0);
  };

  const toggleMute = () => {
    if (micStreamRef.current) {
      const audioTracks = micStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !audioTracks[0].enabled;
        setIsMuted(!audioTracks[0].enabled);
      }
    }
  };

  // Canvas visualizer rendering effect for Gemini Live style wave
  useEffect(() => {
    if (!isCallActive || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      phase += 0.05;

      // Glowing bg behind waves
      const glowGrad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, 80);
      glowGrad.addColorStop(0, 'rgba(249, 115, 22, 0.08)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      if (callState === 'thinking') {
        // Orbiting style
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = 35 + Math.sin(phase * 1.5) * 5;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 2;
        ctx.stroke();

        const colors = ['#f97316', '#a855f7', '#3b82f6', '#10b981'];
        for (let i = 0; i < 4; i++) {
          const angle = phase * 1.2 + (i * Math.PI) / 2;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          
          ctx.beginPath();
          ctx.arc(x, y, 6 + Math.sin(phase + i) * 2, 0, Math.PI * 2);
          ctx.fillStyle = colors[i];
          
          ctx.shadowBlur = 15;
          ctx.shadowColor = colors[i];
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      } else {
        // Fluid waves style
        let amplitude = 4;
        if (callState === 'listening') {
          amplitude = Math.max(4, (micLevel / 255) * 60);
        } else if (callState === 'speaking') {
          amplitude = 15 + Math.sin(phase * 3.5) * 12;
        }

        const wavesCount = 3;
        const colors = [
          'rgba(249, 115, 22, 0.85)',
          'rgba(168, 85, 247, 0.55)',
          'rgba(59, 130, 246, 0.35)'
        ];

        for (let w = 0; w < wavesCount; w++) {
          ctx.beginPath();
          const wavePhase = phase * 1.5 + w * (Math.PI / 1.5);
          const currentAmp = amplitude * (1 - w * 0.25);
          const frequency = 0.015 + w * 0.005;

          for (let x = 0; x < width; x++) {
            const envelope = Math.sin((x / width) * Math.PI);
            const y = height / 2 + Math.sin(x * frequency - wavePhase) * currentAmp * envelope;
            
            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          
          ctx.strokeStyle = colors[w];
          ctx.lineWidth = w === 0 ? 5 : 3;
          ctx.shadowBlur = w === 0 ? 8 : 0;
          ctx.shadowColor = colors[w];
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isCallActive, callState, micLevel]);

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
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col font-sans text-black dark:text-zinc-50">
        {/* Header */}
        <header className="border-b border-zinc-200 dark:border-zinc-900 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <Logo size={32} showBg={true} />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Onbora</h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Copilote de Découverte B2B</p>
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
            <button
              onClick={startVoiceCall}
              className="px-3 py-1.5 rounded-lg border border-orange-500/30 hover:border-orange-500 bg-orange-500/10 hover:bg-orange-500 hover:text-white text-xs font-bold text-orange-500 transition-all cursor-pointer flex items-center gap-1.5 animate-pulse"
              title="Commencer un chat vocal direct avec Onbora"
            >
              <Icons.Phone size={14} /> Appel Vocal
            </button>
            <ThemeToggle />
             <button
              onClick={() => setHelpOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-250 dark:border-zinc-850 dark:hover:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Icons.HelpCircle size={14} /> FAQ & Guide
            </button>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-transparent text-zinc-700 hover:text-zinc-950 dark:border-zinc-800 dark:hover:border-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-100 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Icons.LogOut size={14} /> Déconnexion
            </button>
          </div>
        </header>

        {/* Main Work Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          {/* Left panel: Chat discovery */}
          <div className="flex-1 flex flex-col bg-transparent overflow-hidden border-r border-zinc-200 dark:border-zinc-900">
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
                        : 'glass-card text-zinc-800 dark:text-zinc-100 rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {/* Speaker (TTS) Button for AI messages */}
                  {msg.sender === 'AI' && (
                    <button
                      type="button"
                      onClick={() => speakText(msg.content, msg.id)}
                      className={`mt-1.5 px-2.5 py-1 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold ${
                        currentlyPlayingMsgId === msg.id ? 'text-orange-500 bg-orange-500/10' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                      }`}
                      title={currentlyPlayingMsgId === msg.id ? "Arrêter la lecture" : "Écouter le message (TTS)"}
                    >
                      {currentlyPlayingMsgId === msg.id ? (
                        <>
                          <Icons.VolumeX size={11} /> Arrêter
                        </>
                      ) : (
                        <>
                          <Icons.Volume2 size={11} /> Écouter
                        </>
                      )}
                    </button>
                  )}
                  {/* Si c'est le dernier message de l'IA et que la conversation est qualifiée, on affiche l'aperçu du slide deck comme sur Gemini */}
                  {msg.sender === 'AI' && index === messages.length - 1 && isQualified && businessTwin && (
                    <div className="mt-3 w-full animate-fade-in">
                      <GoogleSlidesTwin
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
              <div className="px-6 py-2.5 bg-zinc-100/30 dark:bg-zinc-950/20 border-t border-zinc-200 dark:border-zinc-900/60 flex flex-col gap-1.5 shrink-0">
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
            <form onSubmit={handleSendMessage} className="p-4 bg-white/80 dark:bg-zinc-950/50 border-t border-zinc-200 dark:border-zinc-900 shrink-0 glass-form">
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
                  className="w-full pl-4 pr-24 py-3 rounded-xl border border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950/40 text-sm focus:outline-none focus:border-orange-500 transition-all text-zinc-900 dark:text-zinc-50 disabled:opacity-60"
                />
                <div className="absolute right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isQualified || loading}
                    onClick={toggleSpeechToText}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                      isListening 
                        ? 'bg-orange-500 text-white animate-pulse' 
                        : 'text-zinc-400 hover:text-zinc-200 bg-transparent hover:bg-zinc-800/40'
                    }`}
                    title={isListening ? "Arrêter l'écoute" : "Dicter (Speech-to-Text)"}
                  >
                    <Icons.Mic size={16} />
                  </button>
                  <button
                    type="submit"
                    disabled={isQualified || loading || !inputValue.trim()}
                    className="px-3 py-1.5 orange-gradient-bg hover:opacity-90 active:scale-98 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                  >
                    Envoyer
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Right panel: Extracted profile & Recommendations */}
          <div className="w-full md:w-[450px] flex flex-col bg-white/50 dark:bg-zinc-950/20 backdrop-blur-md overflow-y-auto border-l border-zinc-200 dark:border-zinc-900 shrink-0">
            {!isQualified ? (
              // Qualification Status Screen
              <div className="p-6 flex flex-col gap-6 animate-fade-in">
                <div>
                  <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Qualification en cours</h2>
                  <p className="text-xs text-zinc-400 mt-1">L'IA analyse vos messages pour qualifier vos besoins d'infrastructure.</p>
                </div>

                {/* Progress bar */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-zinc-400">Taux de complétion</span>
                    <span className="text-orange-500">{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
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
                    <div className="flex justify-between items-center text-xs border-b border-zinc-100 dark:border-zinc-800/60 pb-2.5 transition-all duration-300 hover:translate-x-0.5">
                      <span className="text-zinc-500">Secteur</span>
                      {profile.sector ? (
                        <span className="flex items-center text-zinc-900 dark:text-zinc-100 font-semibold animate-fade-in">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 shadow-sm shadow-emerald-500/50" />
                          {profile.sector}
                        </span>
                      ) : (
                        <span className="flex items-center text-zinc-400 dark:text-zinc-500 italic">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-2" />
                          En attente
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-xs border-b border-zinc-100 dark:border-zinc-800/60 pb-2.5 transition-all duration-300 hover:translate-x-0.5">
                      <span className="text-zinc-500">Taille de l'entreprise</span>
                      {profile.company_size_estimate ? (
                        <span className="flex items-center text-zinc-900 dark:text-zinc-100 font-semibold animate-fade-in">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 shadow-sm shadow-emerald-500/50" />
                          {profile.company_size_estimate}
                        </span>
                      ) : (
                        <span className="flex items-center text-zinc-400 dark:text-zinc-500 italic">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-2" />
                          En attente
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-xs border-b border-zinc-100 dark:border-zinc-800/60 pb-2.5 transition-all duration-300 hover:translate-x-0.5">
                      <span className="text-zinc-500">Sites géographiques</span>
                      <span className="flex items-center text-zinc-900 dark:text-zinc-100 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 shadow-sm shadow-emerald-500/50" />
                        {profile.locations_count} site{profile.locations_count > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs transition-all duration-300 hover:translate-x-0.5">
                      <span className="text-zinc-500 flex items-center">
                        Problèmes relevés
                      </span>
                      {(!profile.current_problems || profile.current_problems.length === 0) ? (
                        <span className="flex items-center text-zinc-400 dark:text-zinc-500 italic text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mr-2" />
                          Aucun problème mentionné pour l'instant
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 mt-1 animate-fade-in">
                          {(profile.current_problems || []).map((prob, idx) => (
                            <span key={idx} className="px-2 py-1 rounded bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 text-[10px] font-medium border border-zinc-200 dark:border-zinc-700/50 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-orange-500" />
                              {prob}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs pt-1.5 transition-all duration-300 hover:translate-x-0.5">
                      <span className="text-zinc-500 flex items-center">
                        Outils actuels
                      </span>
                      {(!profile.current_tools || profile.current_tools.length === 0) ? (
                        <span className="flex items-center text-zinc-400 dark:text-zinc-500 italic text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mr-2" />
                          Aucun outil mentionné
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 mt-1 animate-fade-in">
                          {(profile.current_tools || []).map((tool, idx) => (
                            <span key={idx} className="px-2 py-1 rounded bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 text-[10px] font-medium border border-zinc-200 dark:border-zinc-700/50 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-orange-500" />
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
                    <GoogleSlidesTwin
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
                <div className="p-6 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/40 shrink-0 flex flex-col gap-3">
                  <button
                    onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/discovery/conversations/${conversationId}/export/`, '_blank')}
                    className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-xs font-bold text-zinc-800 dark:text-zinc-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
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

      {/* Voice Call Overlay */}
      {isCallActive && (
        <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-xl flex flex-col justify-between p-6 animate-fade-in text-white font-sans">
          {/* Header */}
          <div className="flex justify-between items-center max-w-4xl w-full mx-auto">
            <div className="flex items-center gap-2">
              <Logo size={24} showBg={true} />
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400">Onbora Copilot</span>
                <h3 className="text-xs font-bold text-white">Appel Vocal Direct</h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${
                callState === 'listening' ? 'bg-green-500 animate-pulse' : 
                callState === 'thinking' ? 'bg-orange-500 animate-spin' : 
                'bg-blue-500 animate-pulse'
              }`} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {callState === 'listening' ? 'À l\'écoute' : 
                 callState === 'thinking' ? 'Réflexion...' : 
                 callState === 'speaking' ? 'Onbora parle' : 'En ligne'}
              </span>
            </div>
          </div>

          {/* Central Waveform & Pulse Animation */}
          <div className="flex-1 flex flex-col justify-center items-center gap-8 max-w-md w-full mx-auto">
            <div className="relative flex justify-center items-center w-full h-48">
              {/* Outer glowing pulsing orb */}
              <div className={`absolute w-48 h-48 rounded-full border border-orange-500/10 transition-all duration-1000 ${
                callState === 'listening' ? 'scale-110 bg-orange-500/[0.02] animate-pulse' : 
                callState === 'thinking' ? 'scale-90 bg-purple-500/[0.02]' : 
                'scale-105 bg-blue-500/[0.03] animate-pulse'
              }`} />
              
              <canvas 
                ref={canvasRef} 
                width={400} 
                height={160} 
                className="w-full max-w-lg z-10"
              />
            </div>

            {/* Transcript text */}
            <div className="text-center space-y-4 px-4 w-full">
              <div className="min-h-8">
                {callTranscriptUser ? (
                  <p className="text-sm text-zinc-300 italic">
                    " {callTranscriptUser} "
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500 italic">
                    Parlez naturellement... Onbora vous répondra directement
                  </p>
                )}
              </div>
              
              {callTranscriptAi && (
                <div className="p-4 rounded-2xl bg-zinc-900/65 border border-zinc-800/80 max-h-40 overflow-y-auto text-left shadow-lg">
                  <p className="text-[10px] font-bold text-orange-400 mb-1">Onbora :</p>
                  <p className="text-xs text-zinc-200 leading-relaxed">
                    {callTranscriptAi}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Controls Footer */}
          <div className="max-w-md w-full mx-auto flex justify-center items-center gap-6 pb-6">
            {/* Mute button */}
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full border transition-all cursor-pointer ${
                isMuted 
                  ? 'bg-red-500/20 border-red-500 text-red-500' 
                  : 'bg-zinc-900 border-zinc-850 hover:border-zinc-700 text-zinc-300'
              }`}
              title={isMuted ? "Réactiver le micro" : "Couper le micro"}
            >
              <Icons.Mic size={20} className={isMuted ? 'opacity-100' : 'opacity-80'} />
            </button>

            {/* Hangup button */}
            <button
              onClick={endVoiceCall}
              className="p-5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-transparent"
              title="Raccrocher"
            >
              <Icons.PhoneOff size={24} />
            </button>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
