"use client";

import React, { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import HelpDrawer from '@/components/shared/HelpDrawer';
import Logo from '@/components/shared/Logo';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { Icons } from '@/components/shared/Icons';
import BusinessTwinSlides from '@/components/shared/BusinessTwinSlides';
import Link from 'next/link';

interface Message {
  id: number;
  sender: 'USER' | 'AI';
  content: string;
  created_at: string;
  is_error?: boolean;
  retry_payload?: string;
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
  recommended_services: Service[];
}

const mapServiceNameToKey = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('fibre') || n.includes('sd-wan')) return 'fibre';
  if (n.includes('microsoft 365') || n.includes('m365') || n.includes('teams') || n.includes('voip') || n.includes('hébergement') || n.includes('hds')) return 'm365';
  if (n.includes('firewall') || n.includes('edr') || n.includes('antivirus')) return 'firewall';
  return n;
};

export default function ClientDiscoveryPage() {
  const { user, logout } = useAuth();
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [transmitting, setTransmitting] = useState(false);
  const [transmissionSuccess, setTransmissionSuccess] = useState(false);
  
  // Contract Modal and fields
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contactName, setContactName] = useState(user?.first_name ? `${user.first_name} ${user.last_name}` : '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [rccm, setRccm] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [rightTab, setRightTab] = useState<'twin' | 'orders'>('twin');
  const [dossierDetails, setDossierDetails] = useState<any>(null);
  
  // Gemini history & Accordion layout states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<string[]>(['diagnostic', 'twin']);
  const [expandedSlides, setExpandedSlides] = useState<string[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number | null>(null);
  
  // Real-time states returned by AI
  const [profile, setProfile] = useState({
    sector: '',
    company_size_estimate: '',
    current_problems: [] as string[],
    current_tools: [] as string[],
    locations_count: 1,
    crm: ''
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
  const micLevelRef = useRef(0);
  const [callTranscriptUser, setCallTranscriptUser] = useState('');
  const [callTranscriptAi, setCallTranscriptAi] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  // New layouts & mockups inspired by Gemini
  const [temporaryChatActive, setTemporaryChatActive] = useState(false);
  const [formationsExpanded, setFormationsExpanded] = useState(true);
  const [selectedModel, setSelectedModel] = useState("Onbora Hybrid (Gemini 1.5 Flash)");
  const [trainings, setTrainings] = useState([
    { id: 1, title: "Prise en main de Microsoft 365" },
    { id: 2, title: "Sécuriser ma connexion Fibre Pro" },
    { id: 3, title: "Guide de configuration VPN Orange" }
  ]);

  const recognitionRef = useRef<any>(null);
  const callRecognitionRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const callStateRef = useRef(callState);

  const startResizing = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (e: PointerEvent) => {
      const newWidth = Math.max(220, Math.min(480, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing]);

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
        micLevelRef.current = avg;
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
    micLevelRef.current = 0;
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
          amplitude = Math.max(4, (micLevelRef.current / 255) * 60);
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
  }, [isCallActive, callState]);

  const updateProfile = (rawProfile: any) => {
    if (!rawProfile) return;
    setProfile({
      sector: rawProfile.sector || '',
      company_size_estimate: rawProfile.company_size_estimate || '',
      current_problems: rawProfile.current_problems || [],
      current_tools: rawProfile.current_tools || [],
      locations_count: rawProfile.locations_count || 1,
      crm: rawProfile.crm || ''
    });
  };

  // Load conversation history list
  const loadHistory = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      const res = await fetch(`${API_URL}/api/discovery/conversations/`, { headers });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
        return data;
      }
    } catch (e) {
      console.error("Erreur de chargement de l'historique:", e);
    }
    return [];
  };

  // Load selected history conversation details
  const handleSelectHistoryConversation = async (id: number) => {
    try {
      setLoading(true);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setSidebarOpen(false);
      }
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      const res = await fetch(`${API_URL}/api/discovery/conversations/${id}/`, { headers });
      if (res.ok) {
        const data = await res.json();
        setConversationId(data.id);
        setMessages(data.messages || []);
        if (data.extracted_profile) {
          updateProfile(data.extracted_profile);
        } else {
          setProfile({
            sector: '',
            company_size_estimate: '',
            current_problems: [],
            current_tools: [],
            locations_count: 1,
            crm: ''
          });
        }
        
        setIsQualified(false);
        setRecommendations([]);
        setBusinessTwin(null);
        setTransmissionSuccess(false);
        setDossierDetails(null);
        setActiveSlideIndex(null);

        if (data.dossier_details) {
          setDossierDetails(data.dossier_details);
          if (data.dossier_details.status === 'IN_REVIEW' || data.dossier_details.status === 'ACCEPTED') {
            setTransmissionSuccess(true);
          }
          if (data.dossier_details.has_twin) {
            setIsQualified(true);
            const recRes = await fetch(`${API_URL}/api/discovery/conversations/${data.id}/recommendations/`, { headers });
            if (recRes.ok) {
              const recData = await recRes.json();
              setRecommendations(recData.recommendations || []);
              setBusinessTwin(recData.business_twin);
            }
          }
        }
      }
    } catch (e) {
      console.error("Erreur chargement conversation historique:", e);
    } finally {
      setLoading(false);
    }
  };

  // Start new profiling conversation
  const handleStartNewChat = async () => {
    try {
      setLoading(true);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setSidebarOpen(false);
      }
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      const res = await fetch(`${API_URL}/api/discovery/conversations/`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        const data = await res.json();
        setConversationId(data.id);
        setMessages(data.messages || []);
        setIsQualified(false);
        setRecommendations([]);
        setBusinessTwin(null);
        setTransmissionSuccess(false);
        setDossierDetails(null);
        setActiveSlideIndex(null);
        setProfile({
          sector: '',
          company_size_estimate: '',
          current_problems: [],
          current_tools: [],
          locations_count: 1,
          crm: ''
        });
        // Refresh history
        loadHistory();
      }
    } catch (e) {
      console.error("Erreur lors de la création d'une nouvelle conversation:", e);
    } finally {
      setLoading(false);
    }
  };

  // Initialize conversation session on mount
  useEffect(() => {
    async function initConversation() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const token = localStorage.getItem('token');
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Token ${token}`;
        }
        
        // Load history list first
        const hist = await loadHistory();
        
        if (hist && hist.length > 0) {
          // Resume the most recent conversation instead of creating a new one!
          await handleSelectHistoryConversation(hist[0].id);
        } else {
          // No history, start a brand new qualification conversation session
          const res = await fetch(`${API_URL}/api/discovery/conversations/`, {
            method: 'POST',
            headers
          });
          if (res.ok) {
            const data = await res.json();
            setConversationId(data.id);
            setMessages(data.messages || []);
            if (data.extracted_profile) {
              updateProfile(data.extracted_profile);
            }
            if (data.dossier_details) {
              setDossierDetails(data.dossier_details);
              if (data.dossier_details.status === 'IN_REVIEW' || data.dossier_details.status === 'ACCEPTED') {
                setTransmissionSuccess(true);
              }
              if (data.dossier_details.has_twin) {
                setIsQualified(true);
                const recRes = await fetch(`${API_URL}/api/discovery/conversations/${data.id}/recommendations/`, { headers });
                if (recRes.ok) {
                  const recData = await recRes.json();
                  setRecommendations(recData.recommendations || []);
                  setBusinessTwin(recData.business_twin);
                }
              }
            }
            // Refresh history again to include the new session
            loadHistory();
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

  const sendMessageAPI = async (userText: string) => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // 15 seconds timeout safeguard
      const response = await Promise.race([
        fetch(`${API_URL}/api/discovery/conversations/${conversationId}/messages/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: userText }),
        }),
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), 15000)
        )
      ]);

      if (response.ok) {
        const data = await response.json();
        
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
      } else {
        throw new Error("API_ERROR");
      }
    } catch (err: any) {
      console.error(err);
      
      // Add AI error fallback message to list
      const tempAiMsg: Message = {
        id: Date.now() + 1,
        sender: 'AI',
        content: "⚠️ **Le service de découverte d'Onbora est momentanément ralenti (Timeout).** Vos informations ont été sauvegardées localement. Veuillez cliquer sur le bouton ci-dessous pour renvoyer votre message.",
        created_at: new Date().toISOString(),
        is_error: true,
        retry_payload: userText
      };
      setMessages(prev => [...prev, tempAiMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !conversationId || loading) return;

    const userText = inputValue;
    setInputValue('');

    // Optimistically add user message to list
    const tempUserMsg: Message = {
      id: Date.now(),
      sender: 'USER',
      content: userText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    await sendMessageAPI(userText);
  };

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  const handleSaveProfileOnly = async () => {
    if (!conversationId || profileSaving) return;
    setProfileSaving(true);
    setProfileSaveSuccess(false);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      const res = await fetch(`${API_URL}/api/discovery/conversations/${conversationId}/transmit/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contact_name: contactName,
          phone: contactPhone,
          rccm: rccm,
          billing_address: billingAddress,
          only_save: true
        })
      });
      if (res.ok) {
        const data = await res.json();
        setProfileSaveSuccess(true);
        if (data.dossier_details) {
          setDossierDetails(data.dossier_details);
          if (data.dossier_details.status === 'IN_REVIEW' || data.dossier_details.status === 'ACCEPTED') {
            setTransmissionSuccess(true);
          }
        }
        setTimeout(() => setProfileSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du profil:", err);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleTransmit = async () => {
    if (!conversationId || transmitting) return;
    setTransmitting(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      const res = await fetch(`${API_URL}/api/discovery/conversations/${conversationId}/transmit/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contact_name: contactName,
          phone: contactPhone,
          rccm: rccm,
          billing_address: billingAddress
        })
      });
      if (res.ok) {
        setTransmissionSuccess(true);
        setContractModalOpen(false);
        // Reload conversation
        initConversationAfterTransmit();
      }
    } catch (err) {
      console.error("Erreur de transmission:", err);
    } finally {
      setTransmitting(false);
    }
  };

  const initConversationAfterTransmit = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }
      const res = await fetch(`${API_URL}/api/discovery/conversations/`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        const data = await res.json();
        if (data.dossier_details) {
          setDossierDetails(data.dossier_details);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle FAQ accordion sections
  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const getAllGlobalRecommendations = () => {
    const allRecs: any[] = [];
    const seenNames = new Set<string>();

    // Add recommendations from current active session if qualified
    if (isQualified && recommendations.length > 0) {
      recommendations.forEach(r => {
        allRecs.push({
          ...r,
          convId: conversationId,
          companyName: dossierDetails?.company_name || user?.company_name || 'Mon Entreprise',
          dossierStatus: dossierDetails?.status || 'NEW',
          isCurrent: true,
          provisioning: dossierDetails?.raw_qualification_data?.provisioning || {},
          transmissionSuccess: transmissionSuccess
        });
        seenNames.add(r.name.toLowerCase());
      });
    }

    // Add recommendations from other sessions in history
    history.forEach(conv => {
      if (conv.id !== conversationId && conv.dossier_details?.has_twin && conv.dossier_details?.recommendations) {
        const prov = conv.dossier_details?.raw_qualification_data?.provisioning || {};
        const isTransmitted = conv.dossier_details?.status === 'IN_REVIEW' || conv.dossier_details?.status === 'ACCEPTED';
        
        conv.dossier_details.recommendations.forEach((r: any) => {
          if (!seenNames.has(r.name.toLowerCase())) {
            allRecs.push({
              ...r,
              convId: conv.id,
              companyName: conv.dossier_details.company_name || user?.company_name || 'Mon Entreprise',
              dossierStatus: conv.dossier_details.status,
              isCurrent: false,
              provisioning: prov,
              transmissionSuccess: isTransmitted
            });
            seenNames.add(r.name.toLowerCase());
          }
        });
      }
    });

    return allRecs;
  };

  // Toggle Jumeau Numérique slide collapsible panels
  const toggleSlide = (slide: string) => {
    setExpandedSlides(prev => 
      prev.includes(slide) ? prev.filter(s => s !== slide) : [...prev, slide]
    );
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
      <div className="h-screen bg-white dark:bg-zinc-950 flex flex-col font-sans text-black dark:text-zinc-50 overflow-hidden">
        <header className="border-b border-zinc-200 dark:border-zinc-900 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md px-6 py-3 flex items-center justify-between shadow-sm z-10 shrink-0">
          {/* Left Corner: Static Logo and Title (No hamburger, no selector dropdown) */}
          <div className="flex items-center gap-3 select-none">
            <Logo size={28} showBg={true} />
            <div>
              <h1 className="text-xs font-black tracking-tight text-zinc-900 dark:text-zinc-55 uppercase leading-none">Onbora</h1>
              <p className="text-[9px] text-zinc-500 dark:text-zinc-400 font-medium">Copilote de Découverte B2B</p>
            </div>
          </div>

          {/* Right Corner: ThemeToggle, Voice Call button, and Espace Profil Link avatar */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* Voice call button (Always visible as it replaces stopwatch/discussions temporaires) */}
            <button
              onClick={startVoiceCall}
              className="flex px-3 py-1.5 rounded-lg border border-orange-500 bg-orange-500/10 hover:bg-orange-500 hover:text-white text-xs font-bold text-orange-500 transition-all cursor-pointer items-center gap-1.5 animate-pulse shadow-sm shadow-orange-500/10"
              title="Commencer un chat vocal direct avec Onbora"
            >
              <Icons.Phone size={14} />
              <span>Appel Vocal</span>
            </button>

            {/* User Profile Avatar Link to separate route /client/profile */}
            <Link 
              href="/client/profile"
              className="w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center font-extrabold text-xs border-2 border-white dark:border-zinc-955 cursor-pointer shadow-sm hover:scale-105 active:scale-98 transition-all select-none"
              title="Accéder à mon Espace Profil & Commandes"
            >
              {user?.first_name ? user.first_name[0].toUpperCase() : 'C'}
            </Link>
          </div>
        </header>

        {/* Main Work Area */}
        <div className="flex-1 flex flex-row overflow-hidden relative">
          {sidebarOpen && (
            <div 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-20 transition-opacity animate-fade-in"
            />
          )}

          {/* Left History Sidebar (Gemini-like) */}
          <div
            style={{ width: sidebarOpen ? `${sidebarWidth}px` : '0px' }}
            className={`bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-900 flex flex-col shrink-0 select-none overflow-hidden h-full z-30 max-w-[85vw] md:max-w-none absolute md:relative ${
              isResizing ? '' : 'transition-all duration-300'
            } ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            {/* Partie Supérieure (Logo + Titre + Pill-Button + Nav) */}
            <div className="p-4 flex flex-col gap-3.5 border-b border-zinc-200 dark:border-zinc-900 shrink-0">
              {/* Logo / Title */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Logo size={28} showBg={true} />
                  <div>
                    <h2 className="text-xs font-black tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">Onbora</h2>
                    <p className="text-[9px] text-zinc-500 font-medium leading-none">Copilote B2B</p>
                  </div>
                </div>
                {/* Close Button for Mobile Drawer */}
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900 cursor-pointer"
                  title="Fermer le tiroir"
                >
                  <Icons.Close size={14} />
                </button>
              </div>

              {/* Nouvelle Qualification Pill-Button */}
              <button
                onClick={handleStartNewChat}
                className="w-full py-2 px-4 rounded-full bg-brand-orange hover:bg-orange-600 text-white text-xs font-extrabold shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer border border-transparent"
              >
                <span className="text-sm font-light">+</span> Nouvelle qualification
              </button>


            </div>

            {/* Partie Centrale (Formations Accordion + Suivi Commandes + Historique Récent - Scrollable) */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
              
              {/* Section Formations (Gemini Notebooks Style) */}
              <div className="border border-zinc-200 dark:border-zinc-850 rounded-xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
                <div className="w-full px-3 py-2 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-100/50 dark:bg-zinc-900/50">
                  <button
                    onClick={() => setFormationsExpanded(!formationsExpanded)}
                    className="flex items-center gap-2 text-left font-bold text-[10px] uppercase tracking-wider text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    <Icons.Briefcase size={14} className="text-orange-500 shrink-0" />
                    <span>Formations</span>
                    <span className="text-zinc-400 font-normal flex items-center shrink-0 ml-1">
                      {formationsExpanded ? <Icons.ChevronLeft size={10} className="-rotate-90 transition-transform" /> : <Icons.ChevronLeft size={10} className="rotate-90 transition-transform" />}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      const title = prompt("Titre de la nouvelle session de formation :");
                      if (title) {
                        setTrainings(prev => [...prev, { id: Date.now(), title }]);
                      }
                    }}
                    className="p-1 rounded bg-zinc-200/80 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[9px] font-extrabold text-orange-500 cursor-pointer flex items-center justify-center transition-colors"
                    title="Ajouter une nouvelle session de formation"
                  >
                    + Nouveau
                  </button>
                </div>

                {formationsExpanded && (
                  <div className="p-2 flex flex-col gap-1 bg-zinc-50/30 dark:bg-zinc-950/20 max-h-[180px] overflow-y-auto">
                    {trainings.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => alert(`Lancement de la formation : "${t.title}" (Simulé)`)}
                        className="w-full text-left py-1.5 px-2 rounded-lg text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-150/40 dark:hover:bg-zinc-900/50 transition-all cursor-pointer truncate"
                        title={t.title}
                      >
                        🎓 {t.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Accordion: Suivi des Commandes (Visible ONLY if qualified) */}
              {isQualified && recommendations.length > 0 && (
                <div className="border border-zinc-200 dark:border-zinc-850 rounded-xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleSection('orders')}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-left font-bold text-[10px] uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-100/50 dark:bg-zinc-900/50 hover:bg-zinc-150/60 dark:hover:bg-zinc-850/50 transition-all cursor-pointer text-zinc-800 dark:text-zinc-200"
                  >
                    <span className="flex items-center gap-2">
                      <Icons.Folder size={14} className="text-orange-500 shrink-0" /> Suivi des Commandes
                    </span>
                    <span className="text-zinc-400 font-normal flex items-center shrink-0">
                      {expandedSections.includes('orders') ? <Icons.ChevronLeft size={12} className="-rotate-90 transition-transform" /> : <Icons.ChevronLeft size={12} className="rotate-90 transition-transform" />}
                    </span>
                  </button>

                  {expandedSections.includes('orders') && (
                    <div className="p-3 flex flex-col gap-2.5 bg-zinc-50/30 dark:bg-zinc-950/20 max-h-[280px] overflow-y-auto">
                      {recommendations.map((service, idx) => {
                        const provStatus = dossierDetails?.raw_qualification_data?.provisioning?.[mapServiceNameToKey(service.name)] || 
                                           (transmissionSuccess ? 'COMMANDÉ' : 'BROUILLON');
                        
                        let statusColor = 'bg-zinc-100 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800';
                        let statusLabel = 'Devis';
                        
                        if (provStatus === 'COMMANDÉ' || provStatus === 'PENDING') {
                          statusColor = 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
                          statusLabel = 'Commandé';
                        } else if (provStatus === 'PROVISIONING' || provStatus === 'IN_PROGRESS') {
                          statusColor = 'bg-orange-500/10 text-orange-500 border border-orange-500/20 animate-pulse';
                          statusLabel = 'Acquisition';
                        } else if (provStatus === 'COMPLETED' || provStatus === 'ACTIVE') {
                          statusColor = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
                          statusLabel = 'Activé / Livré';
                        }

                        return (
                          <div
                            key={idx}
                            onClick={async () => {
                              // Trigger chatbot explanation for this service
                              const query = `Donne-moi des détails techniques, le fonctionnement et l'utilité du service "${service.name}" que j'ai commandé chez Orange Business.`;
                              setInputValue('');
                              setLoading(true);
                              
                              setMessages(prev => [...prev, {
                                id: Date.now(),
                                sender: 'USER',
                                content: `[Information Produit] ${service.name}`,
                                created_at: new Date().toISOString()
                              }]);

                              try {
                                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                                const res = await fetch(`${API_URL}/api/discovery/conversations/${conversationId}/messages/`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({ content: query }),
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  setMessages(prev => [...prev, {
                                    id: Date.now() + 1,
                                    sender: 'AI',
                                    content: data.ai_message,
                                    created_at: new Date().toISOString()
                                  }]);
                                }
                              } catch (e) {
                                console.error(e);
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-orange-500/50 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col gap-1 group"
                          >
                            <div className="flex justify-between items-start gap-1">
                              <h4 className="text-[11px] font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-orange-500 transition-colors leading-tight">
                                {service.name}
                              </h4>
                              <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase shrink-0 scale-90 ${statusColor}`}>
                                {statusLabel}
                              </span>
                            </div>
                            <p className="text-[9px] text-zinc-500 dark:text-zinc-400 italic line-clamp-2">
                              {service.reasoning}
                            </p>
                          </div>
                        );
                      })}

                      {/* Exporter PDF and Transmission actions inside Left Sidebar Accordion */}
                      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2.5 flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/discovery/conversations/${conversationId}/export/`, '_blank')}
                          className="w-full py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 text-[10px] font-bold text-zinc-800 dark:text-zinc-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Icons.Download size={12} /> Exporter Twin (PDF)
                        </button>

                        {transmissionSuccess ? (
                          <div className="p-2 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-lg text-[9px] font-semibold text-center animate-fade-in flex flex-col leading-normal">
                            <span>✓ Dossier contractuel transmis !</span>
                            <span className="text-[8px] text-orange-400">
                              {dossierDetails?.is_complete ? "Dossier complet." : "Le KAM vous contactera par téléphone."}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setContractModalOpen(true)}
                            disabled={transmitting}
                            className="w-full py-2 orange-gradient-bg hover:opacity-90 text-white rounded-lg text-[10px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-orange-500/10"
                          >
                            {transmitting ? 'Envoi...' : 'Transmettre au KAM'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Conversations Récentes */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider px-2">Historique Récent</span>
                {history.length === 0 ? (
                  <span className="text-[11px] text-zinc-450 italic px-2">Aucune qualification récente</span>
                ) : (
                  history.map((conv) => {
                    const isActive = conv.id === conversationId;
                    const label = conv.dossier_details?.company_name || conv.extracted_profile?.sector || `Qualification #${conv.id}`;
                    const isTransmitted = conv.dossier_details?.status === 'IN_REVIEW' || conv.dossier_details?.status === 'ACCEPTED';
                    
                    return (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectHistoryConversation(conv.id)}
                        className={`w-full text-left py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-between group cursor-pointer ${
                          isActive
                            ? 'bg-orange-500/10 text-orange-500 font-bold border-l-2 border-orange-500 pl-2.5'
                            : 'text-zinc-655 hover:bg-zinc-150/50 dark:text-zinc-400 dark:hover:bg-zinc-900/50'
                        }`}
                      >
                        <span className="truncate pr-1 flex items-center gap-1.5">
                          <Icons.MessageSquare size={12} className="text-zinc-450 dark:text-zinc-500 shrink-0" /> {label}
                        </span>
                        {isTransmitted && (
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1 py-0.5 rounded-full uppercase shrink-0 font-extrabold scale-90">
                            Envoi
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

            </div>

            {/* Partie Inférieure (Footer Sidebar - Avatar + Nom + Engrenage Paramètres) */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-100/50 dark:bg-zinc-950/80 shrink-0 flex items-center justify-between gap-3 overflow-hidden select-none">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Photo d'avatar (Initials badge) */}
                <div className="w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold text-sm shrink-0 border border-white/20 shadow-sm">
                  {user?.first_name ? user.first_name[0].toUpperCase() : 'C'}
                </div>
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50 truncate">
                    {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username || 'Salem Balagizi'}
                  </span>
                  <span className="text-[9px] text-zinc-500 truncate">
                    {user?.company_name || 'Client Orange'}
                  </span>
                </div>
              </div>
              
              {/* Bouton Paramètres (icône Engrenage) */}
              <Link
                href="/client/profile"
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer transition-colors shrink-0"
                title="Mon Espace Profil & Paramètres"
              >
                <Icons.Settings size={15} />
              </Link>
            </div>
          </div>

          {/* Resize Handle (Desktop Only) */}
          {sidebarOpen && (
            <div
              onPointerDown={startResizing}
              className={`hidden md:block w-[3px] hover:w-[5px] bg-zinc-200 hover:bg-orange-500/40 active:bg-orange-500 dark:bg-zinc-900 dark:hover:bg-orange-500/30 transition-all cursor-col-resize h-full shrink-0 z-20 ${
                isResizing ? '!bg-orange-500 w-[5px]' : ''
              }`}
              title="Faites glisser pour redimensionner l'historique"
            />
          )}

          {/* Left panel: Chat discovery */}
          <div className="flex-1 flex flex-col bg-transparent overflow-hidden border-r border-zinc-200 dark:border-zinc-900 relative">
            
            {/* Business Twin Slide Overlay (Gemini-like) */}
            {activeSlideIndex !== null && businessTwin && (
              <div className="absolute inset-0 z-20 bg-zinc-950/70 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                <div className="w-full max-w-2xl relative p-5 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xl flex flex-col gap-4">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-150 dark:border-zinc-850">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                      <Icons.Sparkles size={14} className="text-orange-500 shrink-0 animate-pulse" /> Présentation du Jumeau Numérique B2B
                    </h3>
                    <button
                      onClick={() => setActiveSlideIndex(null)}
                      className="py-1 px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[10px] font-extrabold text-zinc-655 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-all border border-zinc-200 dark:border-zinc-700"
                    >
                      <Icons.Close size={10} className="shrink-0" /> Fermer
                    </button>
                  </div>
                  
                  <BusinessTwinSlides
                    twin={{
                      current_state: businessTwin.current_state || [],
                      proposed_state: businessTwin.proposed_state || [],
                      roadmap: businessTwin.roadmap || [],
                      recommended_services: recommendations || []
                    }}
                    companyName={user?.company_name || 'votre entreprise'}
                    initialSlide={activeSlideIndex}
                  />
                </div>
              </div>
            )}

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
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <button
                        type="button"
                        onClick={() => speakText(msg.content, msg.id)}
                        className={`px-2.5 py-1 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold ${
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

                      {msg.is_error && (
                        <button
                          type="button"
                          onClick={() => {
                            setMessages(prev => prev.filter(m => m.id !== msg.id));
                            if (msg.retry_payload) {
                              sendMessageAPI(msg.retry_payload);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-orange-500 text-white transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold shadow-sm"
                          title="Réessayer de renvoyer le message"
                        >
                          <Icons.Refresh size={11} /> Réessayer
                        </button>
                      )}
                    </div>
                  )}
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
                          setActiveSlideIndex(0);
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
                  disabled={loading}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    transmissionSuccess
                      ? "Dossier transmis au KAM. Posez une question au copilote..."
                      : isQualified
                      ? "Posez une question ou dites que vous voulez envoyer votre dossier au KAM..."
                      : "Répondez au copilote Onbora..."
                  }
                  className="w-full pl-4 pr-24 py-3 rounded-xl border border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950/40 text-sm focus:outline-none focus:border-orange-500 transition-all text-zinc-900 dark:text-zinc-50 disabled:opacity-60"
                />
                <div className="absolute right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={loading}
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
                    disabled={loading || !inputValue.trim()}
                    className="px-3 py-1.5 orange-gradient-bg hover:opacity-90 active:scale-98 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                  >
                    Envoyer
                  </button>
                </div>
              </div>
            </form>
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

      {/* Contract Signature Information Modal */}
      {contractModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl p-6 shadow-xl flex flex-col gap-4 animate-scale-in text-black dark:text-zinc-50">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Engagement Contractuel Orange Business</h3>
              <p className="text-[11px] text-zinc-505 dark:text-zinc-400 mt-1">
                Veuillez renseigner les informations réglementaires de signature de contrat pour finaliser votre dossier.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Nom Complet du Signataire</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ex: Jean Dupont"
                  className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Numéro de Téléphone Direct</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Ex: +33 6 12 34 56 78"
                  className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Numéro d'Immatriculation RCCM</label>
                <input
                  type="text"
                  value={rccm}
                  onChange={(e) => setRccm(e.target.value)}
                  placeholder="Ex: RCCM-BF-OUA-2023-B-1234"
                  className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Adresse de Facturation de l'Entreprise</label>
                <textarea
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Adresse postale complète, Code de facturation, Ville..."
                  rows={2}
                  className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => setContractModalOpen(false)}
                className="flex-1 py-2 rounded-lg border border-zinc-205 dark:border-zinc-850 bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleTransmit}
                disabled={transmitting || !contactName.trim() || !contactPhone.trim() || !rccm.trim() || !billingAddress.trim()}
                className="flex-1 py-2 orange-gradient-bg text-white text-xs font-bold rounded-lg hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-orange-500/10"
              >
                {transmitting ? 'Transmission...' : 'Valider & Transmettre'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </ProtectedRoute>
  );
}
