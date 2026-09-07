"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/lib/api';
import Logo from '@/components/shared/Logo';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { Icons } from '@/components/shared/Icons';
import CopilotChatView from '@/components/shared/CopilotChatView';

const SupervisorTerritoryMap = dynamic(
  () => import('@/components/supervisor/SupervisorTerritoryMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] rounded-3xl flex flex-col items-center justify-center gap-3 bg-black/5 dark:bg-white/5 text-xs text-[#6E6C67] dark:text-[#A1A1AA] font-semibold">
        <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
        <span>Chargement de la carte interactive & moteur de plaques...</span>
      </div>
    ),
  }
);

export type BackofficeView =
  | 'soho_managed'
  | 'salespersons'
  | 'map'
  | 'plaques_list'
  | 'soho_directory'
  | 'directives'
  | 'copilot'
  | 'settings';

interface EnterpriseItem {
  id: number;
  crm_id: string;
  name: string;
  sector: string;
  city: string;
  commune: string;
  address?: string;
  annual_revenue: number;
  employee_count: number;
  segment: string;
  assigned_entity: string;
  conversion_status: string;
  is_converted?: boolean;
  rccm: string;
  contact_name: string;
  contact_role?: string;
  contact_phone: string;
  contact_email?: string;
  current_operator: string;
  current_connectivity: string;
  recommended_solution?: string;
  plaque?: string | number;
  plaque_rel?: number;
  plaque_code?: string;
  assigned_salesperson?: number;
  assigned_salesperson_name?: string;
  is_visited?: boolean;
  last_visited_at?: string;
}

interface PlaqueItem {
  id: number;
  code: string;
  name: string;
  city: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  enterprises_count: number;
  total_enterprises?: number;
  ready_count?: number;
  assigned_salespersons_count?: number;
  assigned_salespersons?: number[];
  assigned_salespersons_names?: string[];
  is_active: boolean;
}

interface SalespersonItem {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  location: string;
  is_available: boolean;
  is_active: boolean;
  avatar: string;
  assigned_plaques: string[];
  reports_count: number;
  visits_count: number;
  form_submissions_count: number;
  conversions_count?: number;
  converted_amount?: number;
  incentive_points: number;
}

interface DirectiveItem {
  id: number;
  sender?: number;
  sender_name: string;
  sender_avatar?: string;
  recipient?: number;
  recipient_name: string;
  recipient_role?: string;
  recipient_avatar?: string;
  target_entity: 'KAM_OFFICE' | 'BACK_OFFICE';
  title: string;
  instruction: string;
  priority: 'NORMAL' | 'HIGH' | 'CRITICAL';
  priority_display?: string;
  status: 'SENT' | 'IN_PROGRESS' | 'COMPLETED';
  status_display?: string;
  target_account_name: string;
  acknowledgement_note: string;
  created_at: string;
  updated_at: string;
}

export default function BackofficeCommandCenterPage() {
  const { user, logout, loading: authLoading, updateUser } = useAuth();

  // Navigation State
  const [activeView, setActiveView] = useState<BackofficeView>('soho_managed');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Settings & Memojis State
  const [memojisCatalog, setMemojisCatalog] = useState<{ id: number; filename: string; gender?: string }[]>([]);
  const [memojiGenderFilter, setMemojiGenderFilter] = useState<'all' | 'homme' | 'femme'>('all');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarSuccessMsg, setAvatarSuccessMsg] = useState('');
  const [avatarErrorMsg, setAvatarErrorMsg] = useState('');
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

  // Direct Plaque Assignment State (Accessible from Plaque Detail)
  const [selectedPlaqueForAssign, setSelectedPlaqueForAssign] = useState<PlaqueItem | null>(null);
  const [assignedSalespersonIds, setAssignedSalespersonIds] = useState<number[]>([]);
  const [savingPlaqueAssign, setSavingPlaqueAssign] = useState(false);
  const [plaqueAssignSuccessMsg, setPlaqueAssignSuccessMsg] = useState('');
  const [plaqueAssignErrorMsg, setPlaqueAssignErrorMsg] = useState('');

  // Dedicated Plaque Detail & Dispatch Interface State
  const [selectedPlaqueDetail, setSelectedPlaqueDetail] = useState<PlaqueItem | null>(null);
  const [plaqueDetailFilter, setPlaqueDetailFilter] = useState<'ALL' | 'VISITED' | 'UNVISITED' | 'UNASSIGNED' | 'ASSIGNED'>('ALL');
  const [plaqueDetailSearch, setPlaqueDetailSearch] = useState('');
  const [bulkDispatchSalespersonId, setBulkDispatchSalespersonId] = useState('');
  const [isBulkDispatching, setIsBulkDispatching] = useState(false);
  const [assigningEnterpriseId, setAssigningEnterpriseId] = useState<number | null>(null);
  const [plaqueDetailSuccessMsg, setPlaqueDetailSuccessMsg] = useState('');

  // Dedicated Salesperson Detail Interface State
  const [selectedSalespersonDetail, setSelectedSalespersonDetail] = useState<SalespersonItem | null>(null);
  const [salespersonDetailTab, setSalespersonDetailTab] = useState<'enterprises' | 'directives'>('enterprises');
  const [salespersonDetailFilter, setSalespersonDetailFilter] = useState<'ALL' | 'VISITED' | 'UNVISITED'>('ALL');
  const [salespersonDetailSearch, setSalespersonDetailSearch] = useState('');

  // Data State
  const [loading, setLoading] = useState(true);
  const [plaques, setPlaques] = useState<PlaqueItem[]>([]);
  const [enterprises, setEnterprises] = useState<EnterpriseItem[]>([]);
  const [salespersons, setSalespersons] = useState<SalespersonItem[]>([]);
  const [recentReportsFeed, setRecentReportsFeed] = useState<any[]>([]);

  // Directives State
  const [directives, setDirectives] = useState<DirectiveItem[]>([]);
  const [loadingDirectives, setLoadingDirectives] = useState(false);
  const [directiveTab, setDirectiveTab] = useState<'received' | 'sent'>('received');
  const [isDirectiveModalOpen, setIsDirectiveModalOpen] = useState(false);
  const [selectedDirectiveToAck, setSelectedDirectiveToAck] = useState<DirectiveItem | null>(null);
  const [ackNote, setAckNote] = useState('');
  const [ackStatus, setAckStatus] = useState<'IN_PROGRESS' | 'COMPLETED'>('IN_PROGRESS');
  const [savingAck, setSavingAck] = useState(false);

  // New Directive Form (Supervisor -> Salesperson)
  const [newDirectiveForm, setNewDirectiveForm] = useState({
    recipient_id: '',
    title: '',
    instruction: '',
    target_account_name: '',
    priority: 'NORMAL' as 'NORMAL' | 'HIGH' | 'CRITICAL',
  });
  const [sendingDirective, setSendingDirective] = useState(false);
  const [directiveSuccessMsg, setDirectiveSuccessMsg] = useState('');
  const [directiveErrorMsg, setDirectiveErrorMsg] = useState('');

  // Auto-Dispatch State
  const [dispatchingPlaqueId, setDispatchingPlaqueId] = useState<number | null>(null);
  const [dispatchNotification, setDispatchNotification] = useState<{
    plaqueCode: string;
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Filters State
  const [sohoVisitFilter, setSohoVisitFilter] = useState<'ALL' | 'VISITED' | 'UNVISITED'>('ALL');
  const [sohoAssignmentFilter, setSohoAssignmentFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [sohoPlaqueFilter, setSohoPlaqueFilter] = useState<string>('ALL');
  const [sohoCommercialFilter, setSohoCommercialFilter] = useState<string>('ALL');
  const [sohoStatusFilter, setSohoStatusFilter] = useState<'ALL' | 'CONVERTED' | 'IN_PROGRESS' | 'VISITED'>('ALL');

  // List filter states for each view
  const [salespersonFilter, setSalespersonFilter] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE' | 'WITH_PLAQUES' | 'NO_PLAQUES'>('ALL');
  const [plaquesListFilter, setPlaquesListFilter] = useState<'ALL' | 'WITH_SALESPERSONS' | 'NO_SALESPERSONS' | 'COVERED' | 'TO_PROSPECT'>('ALL');
  const [plaqueCityFilter, setPlaqueCityFilter] = useState<string>('ALL');
  const [directoryVisitFilter, setDirectoryVisitFilter] = useState<'ALL' | 'VISITED' | 'UNVISITED'>('ALL');
  const [directoryStatusFilter, setDirectoryStatusFilter] = useState<'ALL' | 'CONVERTED' | 'PROSPECT'>('ALL');
  const [directiveFilterStatus, setDirectiveFilterStatus] = useState<'ALL' | 'SENT' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [directiveFilterPriority, setDirectiveFilterPriority] = useState<'ALL' | 'NORMAL' | 'HIGH' | 'CRITICAL'>('ALL');

  const [selectedAccountForDetail, setSelectedAccountForDetail] = useState<EnterpriseItem | null>(null);

  // Salesperson Modal State
  const [isAddSalespersonOpen, setIsAddSalespersonOpen] = useState(false);
  const [creatingSalesperson, setCreatingSalesperson] = useState(false);
  const [salespersonCreateError, setSalespersonCreateError] = useState('');
  const [showSalespersonPodium, setShowSalespersonPodium] = useState(false);
  const [salespersonForm, setSalespersonForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    location: 'Kinshasa',
    avatar: 'memoji_056.png',
  });

  // Plaque Modal State
  const [isAddPlaqueOpen, setIsAddPlaqueOpen] = useState(false);
  const [creatingPlaque, setCreatingPlaque] = useState(false);
  const [plaqueCreateError, setPlaqueCreateError] = useState('');
  const [plaqueForm, setPlaqueForm] = useState({
    code: '',
    name: '',
    city: 'Kinshasa',
    latitude: -4.3276,
    longitude: 15.3136,
    radius_km: 1.5,
  });

  // Load Dashboard Data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAPI('/api/sales/supervisor-dashboard/');
      setPlaques(Array.isArray(data?.plaques) ? data.plaques : []);
      setEnterprises(Array.isArray(data?.enterprises) ? data.enterprises : []);
      setSalespersons(Array.isArray(data?.salespersons) ? data.salespersons : []);
      setRecentReportsFeed(Array.isArray(data?.recent_reports_feed) ? data.recent_reports_feed : []);
    } catch (err: any) {
      console.error("Erreur lors du chargement du cockpit superviseur:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Directives
  const loadDirectives = useCallback(async () => {
    setLoadingDirectives(true);
    try {
      const data = await fetchAPI('/api/sales/directives/?target_entity=ALL');
      const list = Array.isArray(data) ? data : (data?.directives || []);
      setDirectives(list);
    } catch (err) {
      console.error("Erreur lors du chargement des directives back-office:", err);
      setDirectives([]);
    } finally {
      setLoadingDirectives(false);
    }
  }, []);

  // Synchroniser la plaque sélectionnée lors du rafraîchissement des données
  useEffect(() => {
    if (selectedPlaqueDetail && plaques.length > 0) {
      const refreshed = plaques.find((p) => p.id === selectedPlaqueDetail.id);
      if (refreshed) setSelectedPlaqueDetail(refreshed);
    }
  }, [plaques]);

  // Synchroniser le commercial sélectionné lors du rafraîchissement des données
  useEffect(() => {
    if (selectedSalespersonDetail && salespersons.length > 0) {
      const refreshed = salespersons.find((s) => s.id === selectedSalespersonDetail.id);
      if (refreshed) setSelectedSalespersonDetail(refreshed);
    }
  }, [salespersons]);

  useEffect(() => {
    loadDashboardData();
    loadDirectives();

    // Charger les Memojis depuis le catalogue public
    fetch('/memojis/memojis_catalog.json')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setMemojisCatalog(data);
        } else {
          throw new Error('Catalogue vide');
        }
      })
      .catch(() => {
        const fallback = Array.from({ length: 102 }, (_, i) => {
          const num = String(i + 1).padStart(3, '0');
          return {
            id: i + 1,
            filename: `memoji_${num}.png`,
            gender: i % 2 === 0 ? 'homme' : 'femme',
          };
        });
        setMemojisCatalog(fallback);
      });
  }, [loadDashboardData, loadDirectives]);

  // Sélection & Sauvegarde instantanée de Memoji
  const handleSelectAvatar = async (filename: string) => {
    setSavingAvatar(true);
    setAvatarErrorMsg('');
    try {
      await fetchAPI('/api/accounts/me/', {
        method: 'PATCH',
        body: JSON.stringify({ avatar: filename })
      });
      if (updateUser) {
        updateUser({ avatar: filename });
      }
      setAvatarSuccessMsg("Avatar Memoji synchronisé avec succès sur votre profil !");
      setTimeout(() => setAvatarSuccessMsg(''), 3500);
    } catch (err: any) {
      console.error(err);
      setAvatarErrorMsg(err.message || "Erreur lors de la mise à jour de l'avatar.");
    } finally {
      setSavingAvatar(false);
    }
  };

  // Handlers Affectation Directe de Commerciaux à une Plaque
  const openPlaqueAssignModal = (plaque: PlaqueItem) => {
    setSelectedPlaqueForAssign(plaque);
    setAssignedSalespersonIds(plaque.assigned_salespersons || []);
    setPlaqueAssignSuccessMsg('');
    setPlaqueAssignErrorMsg('');
  };

  const handleToggleSalespersonInPlaque = (spId: number) => {
    setAssignedSalespersonIds((prev) =>
      prev.includes(spId) ? prev.filter((id) => id !== spId) : [...prev, spId]
    );
  };

  const handleSavePlaqueAssignment = async () => {
    if (!selectedPlaqueForAssign) return;
    setSavingPlaqueAssign(true);
    setPlaqueAssignErrorMsg('');
    try {
      await fetchAPI(`/api/sales/plaques/${selectedPlaqueForAssign.id}/assign/`, {
        method: 'POST',
        body: JSON.stringify({ salesperson_ids: assignedSalespersonIds }),
      });
      setPlaqueAssignSuccessMsg("Affectation des commerciaux enregistrée avec succès !");
      await loadDashboardData();
      setTimeout(() => {
        setSelectedPlaqueForAssign(null);
        setPlaqueAssignSuccessMsg('');
      }, 1200);
    } catch (err: any) {
      console.error("Erreur affectation commerciaux plaque:", err);
      setPlaqueAssignErrorMsg(err.message || "Erreur lors de l'enregistrement de l'affectation.");
    } finally {
      setSavingPlaqueAssign(false);
    }
  };

  // Handlers Dispatch & Répartition des Entreprises (avec affectation automatique à la plaque)
  const handleAssignEnterpriseSalesperson = async (enterpriseId: number, salespersonId: number | null) => {
    setAssigningEnterpriseId(enterpriseId);
    try {
      const res = await fetchAPI(`/api/sales/enterprises/${enterpriseId}/assign-salesperson/`, {
        method: 'POST',
        body: JSON.stringify({ salesperson_id: salespersonId }),
      });
      const targetSp = salespersons.find((s) => s.id === salespersonId);

      // 1. Mettre à jour l'entreprise
      setEnterprises((prev) =>
        prev.map((e) => {
          if (e.id === enterpriseId) {
            return {
              ...e,
              assigned_salesperson: salespersonId || undefined,
              assigned_salesperson_name: targetSp ? targetSp.full_name : undefined,
            };
          }
          return e;
        })
      );

      // 2. Synchroniser dans la modale de détail si ouverte
      setSelectedAccountForDetail((prev) =>
        prev && prev.id === enterpriseId
          ? {
              ...prev,
              assigned_salesperson: salespersonId || undefined,
              assigned_salesperson_name: targetSp ? targetSp.full_name : undefined,
            }
          : prev
      );

      // 3. Logique métier automatique : Si l'entreprise appartient à une plaque,
      // le commercial est automatiquement assigné à la plaque !
      if (res.plaque_id && salespersonId && targetSp) {
        setPlaques((prev) =>
          prev.map((p) => {
            if (p.id === res.plaque_id) {
              const curAssigned = p.assigned_salespersons || [];
              const curNames = p.assigned_salespersons_names || [];
              const nextAssigned = curAssigned.includes(salespersonId) ? curAssigned : [...curAssigned, salespersonId];
              const nextNames = curNames.includes(targetSp.full_name) ? curNames : [...curNames, targetSp.full_name];
              return {
                ...p,
                assigned_salespersons: nextAssigned,
                assigned_salespersons_names: nextNames,
              };
            }
            return p;
          })
        );

        setSelectedPlaqueDetail((prev) => {
          if (!prev || prev.id !== res.plaque_id) return prev;
          const curAssigned = prev.assigned_salespersons || [];
          const curNames = prev.assigned_salespersons_names || [];
          const nextAssigned = curAssigned.includes(salespersonId) ? curAssigned : [...curAssigned, salespersonId];
          const nextNames = curNames.includes(targetSp.full_name) ? curNames : [...curNames, targetSp.full_name];
          return {
            ...prev,
            assigned_salespersons: nextAssigned,
            assigned_salespersons_names: nextNames,
          };
        });

        if (res.plaque_code) {
          setSalespersons((prev) =>
            prev.map((sp) => {
              if (sp.id === salespersonId) {
                const curPlaques = sp.assigned_plaques || [];
                const nextPlaques = curPlaques.includes(res.plaque_code) ? curPlaques : [...curPlaques, res.plaque_code];
                return { ...sp, assigned_plaques: nextPlaques };
              }
              return sp;
            })
          );
        }
      }

      setPlaqueDetailSuccessMsg(res.message || "Compte réaffecté avec succès.");
      setTimeout(() => setPlaqueDetailSuccessMsg(''), 3000);
      loadDashboardData();
    } catch (err: any) {
      console.error("Erreur assignation commercial entreprise:", err);
    } finally {
      setAssigningEnterpriseId(null);
    }
  };

  const handleBulkDispatchUnassigned = async () => {
    if (!selectedPlaqueDetail || !bulkDispatchSalespersonId) return;
    const spId = Number(bulkDispatchSalespersonId);
    if (isNaN(spId)) return;

    setIsBulkDispatching(true);
    try {
      const unassignedInPlaque = enterprises.filter((e) => {
        const isMatch =
          e.plaque_code === selectedPlaqueDetail.code ||
          e.plaque === selectedPlaqueDetail.name ||
          (e as any).plaque_rel === selectedPlaqueDetail.id;
        return isMatch && !e.assigned_salesperson;
      });

      for (const ent of unassignedInPlaque) {
        await fetchAPI(`/api/sales/enterprises/${ent.id}/assign-salesperson/`, {
          method: 'POST',
          body: JSON.stringify({ salesperson_id: spId }),
        });
      }

      const targetSp = salespersons.find((s) => s.id === spId);
      setEnterprises((prev) =>
        prev.map((e) => {
          const isMatch =
            e.plaque_code === selectedPlaqueDetail.code ||
            e.plaque === selectedPlaqueDetail.name ||
            (e as any).plaque_rel === selectedPlaqueDetail.id;
          if (isMatch && !e.assigned_salesperson) {
            return {
              ...e,
              assigned_salesperson: spId,
              assigned_salesperson_name: targetSp ? targetSp.full_name : undefined,
            };
          }
          return e;
        })
      );
      setPlaqueDetailSuccessMsg(`${unassignedInPlaque.length} comptes affectés en masse avec succès.`);
      setTimeout(() => setPlaqueDetailSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error("Erreur bulk dispatch:", err);
    } finally {
      setIsBulkDispatching(false);
    }
  };

  // Handle Smart Auto-Dispatch
  const handleAutoDispatch = async (plaque: PlaqueItem) => {
    setDispatchingPlaqueId(plaque.id);
    setDispatchNotification(null);
    try {
      const res = await fetchAPI(`/api/sales/plaques/${plaque.id}/auto-dispatch/`, {
        method: 'POST',
      });
      setDispatchNotification({
        plaqueCode: plaque.code,
        message: res.message || `${res.assigned_count || 0} comptes SOHO affectés avec succès.`,
        type: 'success',
      });
      await loadDashboardData();
    } catch (err: any) {
      console.error("Erreur auto-dispatch:", err);
      setDispatchNotification({
        plaqueCode: plaque.code,
        message: err.message || "Erreur lors de l'affectation automatique de la plaque.",
        type: 'error',
      });
    } finally {
      setDispatchingPlaqueId(null);
    }
  };

  // Handle Create Salesperson
  const handleCreateSalesperson = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalespersonCreateError('');
    setCreatingSalesperson(true);
    try {
      await fetchAPI('/api/sales/salespersons/', {
        method: 'POST',
        body: JSON.stringify(salespersonForm),
      });
      setIsAddSalespersonOpen(false);
      setSalespersonForm({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        location: 'Kinshasa',
        avatar: 'memoji_056.png',
      });
      await loadDashboardData();
    } catch (err: any) {
      setSalespersonCreateError(err.message || "Impossible de créer le commercial.");
    } finally {
      setCreatingSalesperson(false);
    }
  };

  // Handle Create Plaque
  const handleCreatePlaque = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlaqueCreateError('');
    setCreatingPlaque(true);
    try {
      await fetchAPI('/api/sales/plaques/', {
        method: 'POST',
        body: JSON.stringify(plaqueForm),
      });
      setIsAddPlaqueOpen(false);
      setPlaqueForm({
        code: '',
        name: '',
        city: 'Kinshasa',
        latitude: -4.3276,
        longitude: 15.3136,
        radius_km: 1.5,
      });
      await loadDashboardData();
    } catch (err: any) {
      setPlaqueCreateError(err.message || "Impossible de créer la plaque.");
    } finally {
      setCreatingPlaque(false);
    }
  };

  // Handle Acknowledge Directive
  const handleSaveAcknowledgement = async () => {
    if (!selectedDirectiveToAck) return;
    setSavingAck(true);
    try {
      await fetchAPI(`/api/sales/directives/${selectedDirectiveToAck.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: ackStatus,
          acknowledgement_note: ackNote,
        }),
      });
      setIsDirectiveModalOpen(false);
      setSelectedDirectiveToAck(null);
      setAckNote('');
      await loadDirectives();
    } catch (err: any) {
      console.error("Erreur acknowledgement:", err);
    } finally {
      setSavingAck(false);
    }
  };

  // Handle Send Directive to Salesperson
  const handleSendDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirectiveErrorMsg('');
    setDirectiveSuccessMsg('');
    setSendingDirective(true);
    try {
      await fetchAPI('/api/sales/directives/', {
        method: 'POST',
        body: JSON.stringify({
          recipient_id: newDirectiveForm.recipient_id,
          target_entity: 'BACK_OFFICE',
          title: newDirectiveForm.title,
          instruction: newDirectiveForm.instruction,
          target_account_name: newDirectiveForm.target_account_name,
          priority: newDirectiveForm.priority,
        }),
      });
      setDirectiveSuccessMsg("Directive transmise avec succès au commercial terrain.");
      setNewDirectiveForm({
        recipient_id: '',
        title: '',
        instruction: '',
        target_account_name: '',
        priority: 'NORMAL',
      });
      await loadDirectives();
    } catch (err: any) {
      setDirectiveErrorMsg(err.message || "Erreur lors de l'émission de la directive.");
    } finally {
      setSendingDirective(false);
    }
  };

  // Filtered & Sorted Salespersons (Ranked by points desc, conversions desc, visits desc, NEVER alphabetically)
  const sortedSalespersons = useMemo(() => {
    const list = Array.isArray(salespersons) ? salespersons : [];
    return [...list]
      .filter((sp) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          Boolean(sp.full_name && sp.full_name.toLowerCase().includes(q)) ||
          Boolean(sp.username && sp.username.toLowerCase().includes(q)) ||
          Boolean(sp.location && sp.location.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const ptsA = a.incentive_points || ((a.conversions_count || 0) * 100 + (a.form_submissions_count || 0) * 20 + (a.visits_count || 0) * 10);
        const ptsB = b.incentive_points || ((b.conversions_count || 0) * 100 + (b.form_submissions_count || 0) * 20 + (b.visits_count || 0) * 10);
        return ptsB - ptsA;
      });
  }, [salespersons, searchQuery]);

  // Top 3 Salespersons for the discreet podium
  const top3Salespersons = useMemo(() => {
    return sortedSalespersons.slice(0, 3);
  }, [sortedSalespersons]);

  // Filtered SOHO Managed Accounts (multi-critères avec recherche globale)
  const filteredSohoAccounts = useMemo(() => {
    const list = Array.isArray(enterprises) ? enterprises : [];
    return list.filter((ent) => {
      // 1. Visite
      if (sohoVisitFilter === 'VISITED' && !ent.is_visited) return false;
      if (sohoVisitFilter === 'UNVISITED' && ent.is_visited) return false;

      // 2. Affectation
      if (sohoAssignmentFilter === 'ASSIGNED' && !ent.assigned_salesperson) return false;
      if (sohoAssignmentFilter === 'UNASSIGNED' && ent.assigned_salesperson) return false;

      // 3. Plaque
      if (sohoPlaqueFilter !== 'ALL') {
        const matchesPlaque =
          ent.plaque_code === sohoPlaqueFilter ||
          ent.plaque === sohoPlaqueFilter ||
          String((ent as any).plaque_rel) === sohoPlaqueFilter;
        if (!matchesPlaque) return false;
      }

      // 4. Commercial
      if (sohoCommercialFilter !== 'ALL') {
        if (String(ent.assigned_salesperson) !== sohoCommercialFilter) return false;
      }

      // 5. Recherche globale
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        Boolean(ent.name && ent.name.toLowerCase().includes(q)) ||
        Boolean(ent.crm_id && ent.crm_id.toLowerCase().includes(q)) ||
        Boolean(ent.rccm && ent.rccm.toLowerCase().includes(q)) ||
        Boolean(ent.sector && ent.sector.toLowerCase().includes(q)) ||
        Boolean(ent.commune && ent.commune.toLowerCase().includes(q)) ||
        Boolean(ent.contact_name && ent.contact_name.toLowerCase().includes(q)) ||
        Boolean(ent.assigned_salesperson_name && ent.assigned_salesperson_name.toLowerCase().includes(q)) ||
        Boolean(ent.plaque_code && ent.plaque_code.toLowerCase().includes(q))
      );
    });
  }, [enterprises, sohoVisitFilter, sohoAssignmentFilter, sohoPlaqueFilter, sohoCommercialFilter, searchQuery]);

  // Filtered Plaques (Filtre couverture, affectation, ville et recherche)
  const filteredPlaques = useMemo(() => {
    const list = Array.isArray(plaques) ? plaques : [];
    return list.filter((p) => {
      const hasSalespersons = p.assigned_salespersons_names && p.assigned_salespersons_names.length > 0;
      if (plaquesListFilter === 'WITH_SALESPERSONS' && !hasSalespersons) return false;
      if (plaquesListFilter === 'NO_SALESPERSONS' && hasSalespersons) return false;

      const pEnts = (Array.isArray(enterprises) ? enterprises : []).filter(
        (e) => e.plaque_code === p.code || e.plaque === p.name || (e as any).plaque_rel === p.id
      );
      const isCovered = pEnts.length > 0 && pEnts.every((e) => e.is_visited);
      if (plaquesListFilter === 'COVERED' && !isCovered) return false;
      if (plaquesListFilter === 'TO_PROSPECT' && isCovered) return false;

      if (plaqueCityFilter !== 'ALL' && p.city !== plaqueCityFilter) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        Boolean(p.name && p.name.toLowerCase().includes(q)) ||
        Boolean(p.code && p.code.toLowerCase().includes(q)) ||
        Boolean(p.city && p.city.toLowerCase().includes(q)) ||
        Boolean(p.assigned_salespersons_names && p.assigned_salespersons_names.some((n) => n.toLowerCase().includes(q)))
      );
    });
  }, [plaques, enterprises, plaquesListFilter, plaqueCityFilter, searchQuery]);

  // SOHO Directory Accounts (avec filtres statut/visite et recherche)
  const filteredDirectoryAccounts = useMemo(() => {
    const list = Array.isArray(enterprises) ? enterprises : [];
    return list.filter((ent) => {
      if (directoryVisitFilter === 'VISITED' && !ent.is_visited) return false;
      if (directoryVisitFilter === 'UNVISITED' && ent.is_visited) return false;

      const isConv = ent.is_converted || ent.conversion_status === 'CONVERTED';
      if (directoryStatusFilter === 'CONVERTED' && !isConv) return false;
      if (directoryStatusFilter === 'PROSPECT' && isConv) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        Boolean(ent.name && ent.name.toLowerCase().includes(q)) ||
        Boolean(ent.crm_id && ent.crm_id.toLowerCase().includes(q)) ||
        Boolean(ent.rccm && ent.rccm.toLowerCase().includes(q)) ||
        Boolean(ent.sector && ent.sector.toLowerCase().includes(q)) ||
        Boolean(ent.commune && ent.commune.toLowerCase().includes(q)) ||
        Boolean(ent.contact_name && ent.contact_name.toLowerCase().includes(q)) ||
        Boolean(ent.assigned_salesperson_name && ent.assigned_salesperson_name.toLowerCase().includes(q))
      );
    });
  }, [enterprises, directoryVisitFilter, directoryStatusFilter, searchQuery]);

  // Filtered Directives
  const filteredDirectives = useMemo(() => {
    const list = Array.isArray(directives) ? directives : [];
    return list.filter((d) => {
      if (directiveFilterStatus !== 'ALL' && d.status !== directiveFilterStatus) return false;
      if (directiveFilterPriority !== 'ALL' && d.priority !== directiveFilterPriority) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        Boolean(d.title && d.title.toLowerCase().includes(q)) ||
        Boolean(d.instruction && d.instruction.toLowerCase().includes(q)) ||
        Boolean(d.recipient_name && d.recipient_name.toLowerCase().includes(q)) ||
        Boolean(d.target_account_name && d.target_account_name.toLowerCase().includes(q))
      );
    });
  }, [directives, directiveFilterStatus, directiveFilterPriority, searchQuery]);

  const kpis = useMemo(() => {
    const list = Array.isArray(enterprises) ? enterprises : [];
    const total = list.length;
    const converted = list.filter((e) => e.is_converted || e.conversion_status === 'CONVERTED').length;
    const visited = list.filter((e) => e.is_visited).length;
    const assigned = list.filter((e) => e.assigned_salesperson).length;
    const totalRevenue = list.reduce((sum, e) => sum + Number(e.annual_revenue || 0), 0);
    return { total, converted, visited, assigned, totalRevenue };
  }, [enterprises]);

  // Dedicated Plaque Detail: all enterprises in the selected plaque
  const plaqueEnterprisesAll = useMemo(() => {
    if (!selectedPlaqueDetail) return [];
    const list = Array.isArray(enterprises) ? enterprises : [];
    return list.filter((e) =>
      e.plaque_code === selectedPlaqueDetail.code ||
      e.plaque === selectedPlaqueDetail.name ||
      (e as any).plaque_rel === selectedPlaqueDetail.id
    );
  }, [enterprises, selectedPlaqueDetail]);

  const plaqueDetailKpis = useMemo(() => {
    const total = plaqueEnterprisesAll.length;
    const visited = plaqueEnterprisesAll.filter((e) => e.is_visited).length;
    const unvisited = total - visited;
    const assigned = plaqueEnterprisesAll.filter((e) => Boolean(e.assigned_salesperson)).length;
    const unassigned = total - assigned;
    return { total, visited, unvisited, assigned, unassigned };
  }, [plaqueEnterprisesAll]);

  const filteredPlaqueDetailAccounts = useMemo(() => {
    return plaqueEnterprisesAll.filter((ent) => {
      if (plaqueDetailFilter === 'VISITED' && !ent.is_visited) return false;
      if (plaqueDetailFilter === 'UNVISITED' && ent.is_visited) return false;
      if (plaqueDetailFilter === 'ASSIGNED' && !ent.assigned_salesperson) return false;
      if (plaqueDetailFilter === 'UNASSIGNED' && ent.assigned_salesperson) return false;

      if (!plaqueDetailSearch) return true;
      const q = plaqueDetailSearch.toLowerCase();
      return (
        Boolean(ent.name && ent.name.toLowerCase().includes(q)) ||
        Boolean(ent.crm_id && ent.crm_id.toLowerCase().includes(q)) ||
        Boolean(ent.commune && ent.commune.toLowerCase().includes(q)) ||
        Boolean(ent.contact_name && ent.contact_name.toLowerCase().includes(q)) ||
        Boolean(ent.assigned_salesperson_name && ent.assigned_salesperson_name.toLowerCase().includes(q))
      );
    });
  }, [plaqueEnterprisesAll, plaqueDetailFilter, plaqueDetailSearch]);

  // Dedicated Salesperson Detail: all enterprises assigned to this salesperson
  const salespersonAssignedEnterprisesAll = useMemo(() => {
    if (!selectedSalespersonDetail) return [];
    const list = Array.isArray(enterprises) ? enterprises : [];
    return list.filter((e) => e.assigned_salesperson === selectedSalespersonDetail.id);
  }, [enterprises, selectedSalespersonDetail]);

  const salespersonDetailKpis = useMemo(() => {
    const total = salespersonAssignedEnterprisesAll.length;
    const visited = salespersonAssignedEnterprisesAll.filter((e) => e.is_visited).length;
    const unvisited = total - visited;
    const rate = total > 0 ? Math.round((visited / total) * 100) : 0;
    return { total, visited, unvisited, rate };
  }, [salespersonAssignedEnterprisesAll]);

  const filteredSalespersonDetailAccounts = useMemo(() => {
    return salespersonAssignedEnterprisesAll.filter((ent) => {
      if (salespersonDetailFilter === 'VISITED' && !ent.is_visited) return false;
      if (salespersonDetailFilter === 'UNVISITED' && ent.is_visited) return false;

      if (!salespersonDetailSearch) return true;
      const q = salespersonDetailSearch.toLowerCase();
      return (
        Boolean(ent.name && ent.name.toLowerCase().includes(q)) ||
        Boolean(ent.crm_id && ent.crm_id.toLowerCase().includes(q)) ||
        Boolean(ent.commune && ent.commune.toLowerCase().includes(q)) ||
        Boolean(ent.plaque_code && ent.plaque_code.toLowerCase().includes(q)) ||
        Boolean(ent.contact_name && ent.contact_name.toLowerCase().includes(q))
      );
    });
  }, [salespersonAssignedEnterprisesAll, salespersonDetailFilter, salespersonDetailSearch]);

  const salespersonDirectives = useMemo(() => {
    if (!selectedSalespersonDetail) return [];
    const list = Array.isArray(directives) ? directives : [];
    return list.filter((d) =>
      d.recipient === selectedSalespersonDetail.id ||
      d.recipient_name === selectedSalespersonDetail.full_name ||
      (d as any).recipient_username === selectedSalespersonDetail.username
    );
  }, [directives, selectedSalespersonDetail]);

  const navItems = [
    {
      id: 'soho_managed' as BackofficeView,
      label: 'Comptes SOHO',
      icon: Icons.Building,
      badge: `${enterprises.length}`,
    },
    {
      id: 'salespersons' as BackofficeView,
      label: 'Commerciaux Terrain',
      icon: Icons.Users,
      badge: `${salespersons.length}`,
    },
    {
      id: 'map' as BackofficeView,
      label: 'Carte Territoire',
      icon: Icons.Map,
      badge: null,
    },
    {
      id: 'plaques_list' as BackofficeView,
      label: 'Plaques & Auto-Dispatch',
      icon: Icons.Layers,
      badge: `${plaques.length}`,
    },
    {
      id: 'soho_directory' as BackofficeView,
      label: 'Annuaire SOHO',
      icon: Icons.FileText,
      badge: null,
    },
    {
      id: 'directives' as BackofficeView,
      label: 'Directives & Messages',
      icon: Icons.MessageSquare,
      badge: (Array.isArray(directives) ? directives : []).filter((d) => d.status === 'SENT').length > 0 ? `${(Array.isArray(directives) ? directives : []).filter((d) => d.status === 'SENT').length}` : null,
    },
    {
      id: 'copilot' as BackofficeView,
      label: 'Copilote IA',
      icon: Icons.Bot,
      badge: 'AI',
    },
    {
      id: 'settings' as BackofficeView,
      label: 'Paramètres & FAQ',
      icon: Icons.Settings,
      badge: null,
    },
  ];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#ECEAE5] dark:bg-[#242124]">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-[#4F6CE8] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['SUPERVISOR', 'ADMIN']}>
      <div className="flex h-screen w-full bg-[#ECEAE5] dark:bg-[#242124] text-zinc-900 dark:text-white font-sans antialiased overflow-hidden select-none transition-colors duration-300">

        {/* 1. FLOATING RETRACTABLE SIDEBAR (Identical pattern to KamSidebar) */}
        <aside
          className={`m-4 mr-0 rounded-[32px] bg-[#F6F5F2]/90 dark:bg-[#2D2A2D]/90 backdrop-blur-3xl shadow-xl dark:shadow-2xl flex flex-col justify-between shrink-0 h-[calc(100vh-2rem)] sticky top-4 select-none transition-all duration-300 ${
            isSidebarCollapsed ? 'w-20 p-3' : 'w-72 p-5'
          }`}
        >
          {/* Top Brand Header & Sidebar Toggle */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between px-1 py-1">
              {!isSidebarCollapsed && (
                <div className="flex items-center gap-3">
                  <Logo size={36} />
                    <h1 className="text-base font-semibold text-zinc-900 dark:text-white tracking-tight">
                      ONBORA
                    </h1>
                </div>
              )}

              {isSidebarCollapsed && (
                <div className="mx-auto">
                  <Logo size={32} />
                </div>
              )}

              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                title={isSidebarCollapsed ? "Déplier la barre latérale" : "Replier la barre latérale"}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-[#E4E1DB] dark:hover:bg-[#363336] transition-colors cursor-pointer"
              >
                <Icons.Sidebar size={18} />
              </button>
            </div>

            {/* Navigation List (6 strictly defined menus, zero useless section headers) */}
            <nav className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const isActive = activeView === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      setSelectedPlaqueDetail(null);
                      setSelectedSalespersonDetail(null);
                    }}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`group flex items-center ${isSidebarCollapsed ? 'justify-center p-3.5' : 'justify-between p-3.5'} rounded-2xl transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-[#4F6CE8] text-white shadow-sm'
                        : 'text-zinc-600 dark:text-[#A1A1AA] hover:bg-[#E4E1DB]/60 dark:hover:bg-[#363336]/60 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <Icon size={18} className={isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white'} />
                      {!isSidebarCollapsed && (
                        <span className="text-xs font-semibold tracking-tight">
                          {item.label}
                        </span>
                      )}
                    </div>

                    {!isSidebarCollapsed && item.badge && (
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Profile Section */}
          <div className="flex flex-col gap-3 pt-4 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between px-1">
              {!isSidebarCollapsed ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#4F6CE8] text-white flex items-center justify-center font-extrabold text-xs shrink-0 overflow-hidden">
                    <img
                      src={`/memojis/${(user?.avatar || 'memoji_056.png').replace('assets/memojis/', '')}`}
                      alt={user?.username || 'Superviseur'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback text if memoji fails
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold leading-tight text-zinc-900 dark:text-white truncate">
                      {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
                    </span>
                    <span className="text-[10px] text-[#4F6CE8] font-550">
                      Responsable Commercial
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mx-auto w-8 h-8 rounded-full bg-[#4F6CE8] text-white flex items-center justify-center font-extrabold text-xs overflow-hidden">
                  <img
                    src={`/memojis/${(user?.avatar || 'memoji_056.png').replace('assets/memojis/', '')}`}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {!isSidebarCollapsed && (
                <button
                  onClick={logout}
                  title="Se déconnecter"
                  className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Icons.LogOut size={16} />
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* 2. MAIN WORKSPACE CONTENT AREA */}
        <main className="flex-1 flex flex-col h-full overflow-hidden p-4 pl-4">
          
          {/* Top Header Bar (Découplé & Élégant façon KAM) */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5 shrink-0 mb-4">
            <div className="flex flex-col">
              <h2 className="text-xl font-550 text-[#242124] dark:text-white tracking-tight">
                {activeView === 'soho_managed' && "Portefeuille Comptes SOHO"}
                {activeView === 'salespersons' && (selectedSalespersonDetail ? `Fiche Commercial – ${selectedSalespersonDetail.full_name}` : "Commerciaux Terrain & Effectif")}
                {activeView === 'map' && "Carte Territoire & Découpage des Plaques"}
                {activeView === 'plaques_list' && (selectedPlaqueDetail ? `Détail & Répartition – Plaque ${selectedPlaqueDetail.code}` : "Gestion des Plaques & Smart Auto-Dispatch")}
                {activeView === 'soho_directory' && "Annuaire Exhaustif SOHO"}
                {activeView === 'directives' && "Directives Administratives & Terrain"}
                {activeView === 'settings' && "Paramètres & Base de Connaissances"}
              </h2>
            </div>

            {/* Actions d'En-Tête : Recherche pilule avec croix, Actualiser, Theme (ZÉRO bouton redondant) */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-2 bg-white dark:bg-[#2D2A2D] px-3.5 py-2 rounded-2xl border border-black/5 dark:border-white/5 shadow-2xs">
                <Icons.Search size={14} className="text-[#6E6C67] dark:text-[#A1A1AA]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeView === 'soho_managed' || activeView === 'soho_directory'
                      ? "Filtrer compte, CRM, commune..."
                      : activeView === 'salespersons'
                      ? "Rechercher commercial, plaque..."
                      : activeView === 'plaques_list'
                      ? "Rechercher plaque, code..."
                      : "Recherche rapide..."
                  }
                  className="bg-transparent text-xs font-550 focus:outline-none w-48 sm:w-64 text-[#242124] dark:text-white border-0 placeholder-[#6E6C67] dark:placeholder-[#A1A1AA]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  loadDashboardData();
                  loadDirectives();
                }}
                disabled={loading}
                title="Actualiser les données"
                className="p-2.5 rounded-2xl bg-white dark:bg-[#2D2A2D] hover:bg-black/5 dark:hover:bg-white/10 text-[#6E6C67] dark:text-white transition-all cursor-pointer border border-black/5 dark:border-white/5 disabled:opacity-50 shadow-2xs"
              >
                <Icons.Refresh size={15} className={loading ? "animate-spin" : ""} />
              </button>

              <ThemeToggle />
            </div>
          </header>

          {/* Dispatch Notification Banner */}
          {dispatchNotification && (
            <div
              className={`mb-4 p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
                dispatchNotification.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icons.CheckCircle size={16} />
                <span>[Plaque {dispatchNotification.plaqueCode}] {dispatchNotification.message}</span>
              </div>
              <button
                onClick={() => setDispatchNotification(null)}
                className="p-1 hover:opacity-75 cursor-pointer"
              >
                <Icons.X size={14} />
              </button>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto pr-1">

            {/* VIEW 1: SOHO MANAGED ACCOUNTS */}
            {activeView === 'soho_managed' && (
              <div className="flex flex-col gap-4">
                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Total Comptes SOHO</span>
                    <span className="text-xl font-extrabold text-[#242124] dark:text-white">{kpis.total}</span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{kpis.assigned} affectés à un commercial</span>
                  </div>
                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Signatures & Convertis</span>
                    <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{kpis.converted}</span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Taux de transfo : {kpis.total > 0 ? Math.round((kpis.converted / kpis.total) * 100) : 0}%</span>
                  </div>
                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Visités sur le Terrain</span>
                    <span className="text-xl font-extrabold text-[#4F6CE8]">{kpis.visited}</span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{kpis.total - kpis.visited} restants à prospecter</span>
                  </div>
                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Plaques Déployées</span>
                    <span className="text-xl font-extrabold text-[#242124] dark:text-white">{plaques.length}</span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{salespersons.length} commerciaux actifs</span>
                  </div>
                </div>

                {/* Filters Toolbar */}
                <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {/* Statut Filter */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Statut :</span>
                      <select
                        value={sohoStatusFilter}
                        onChange={(e) => setSohoStatusFilter(e.target.value as any)}
                        className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
                      >
                        <option value="ALL">Tous les statuts</option>
                        <option value="CONVERTED">Signés / Convertis</option>
                        <option value="IN_PROGRESS">En cours de prospection</option>
                        <option value="VISITED">Visités sur terrain</option>
                      </select>
                    </div>

                    {/* Plaque Filter */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Plaque :</span>
                      <select
                        value={sohoPlaqueFilter}
                        onChange={(e) => setSohoPlaqueFilter(e.target.value)}
                        className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
                      >
                        <option value="ALL">Toutes les plaques</option>
                        {plaques.map((p) => (
                          <option key={p.id} value={p.code}>
                            {p.code} - {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
                    {filteredSohoAccounts.length} comptes affichés
                  </span>
                </div>

                {/* SOHO Accounts Table */}
                <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-black/5 dark:border-white/5 text-[10px] font-semibold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                          <th className="pb-3 px-3">Entreprise SOHO</th>
                          <th className="pb-3 px-3">Secteur & Ville</th>
                          <th className="pb-3 px-3">Plaque</th>
                          <th className="pb-3 px-3">Commercial Assigné</th>
                          <th className="pb-3 px-3">Visite</th>
                          <th className="pb-3 px-3">Statut</th>
                          <th className="pb-3 px-3 text-right">Détails</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {filteredSohoAccounts.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                              Aucun compte SOHO ne correspond aux filtres actuels.
                            </td>
                          </tr>
                        ) : (
                          filteredSohoAccounts.map((account) => {
                            const isConverted = account.is_converted || account.conversion_status === 'CONVERTED';

                            return (
                              <tr key={account.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <td className="py-3 px-3">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-[#242124] dark:text-white">{account.name}</span>
                                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] font-mono">{account.crm_id}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex flex-col">
                                    <span className="text-[#242124] dark:text-white font-550">{account.sector || 'SOHO / Commerce'}</span>
                                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{account.commune || account.city}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  {account.plaque_code ? (
                                    <span className="px-2.5 py-1 rounded-lg bg-[#4F6CE8]/10 text-[#4F6CE8] font-semibold text-[10px]">
                                      {account.plaque_code}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-zinc-400">Non rattachée</span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  {account.assigned_salesperson_name ? (
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-5 h-5 rounded-full bg-[#4F6CE8] text-white flex items-center justify-center text-[9px] font-semibold">
                                        {account.assigned_salesperson_name[0]}
                                      </div>
                                      <span className="font-semibold text-[#242124] dark:text-white">
                                        {account.assigned_salesperson_name}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-550 text-[#4F6CE8]">
                                      Non affecté
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  {account.is_visited ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1 w-fit">
                                      <Icons.Check size={10} /> Visité
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold w-fit">
                                      Non visité
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  {isConverted ? (
                                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                                      Converti
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-full bg-[#4F6CE8]/10 text-[#4F6CE8] font-semibold text-[10px]">
                                      En prospection
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    onClick={() => setSelectedAccountForDetail(account)}
                                    className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#4F6CE8] transition-colors cursor-pointer"
                                    title="Voir fiche complète"
                                  >
                                    <Icons.ExternalLink size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: FIELD SALESPERSONS */}
            {activeView === 'salespersons' && (
              selectedSalespersonDetail ? (
                /* DEDICATED SALESPERSON DETAIL & FIELD ACTIVITY INTERFACE */
                <div className="flex flex-col gap-4">
                  {/* Top Header Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedSalespersonDetail(null)}
                        className="p-2 rounded-2xl bg-white dark:bg-[#363336] hover:bg-black/5 dark:hover:bg-white/10 text-[#242124] dark:text-white transition-all cursor-pointer inline-flex items-center justify-center border border-black/5 dark:border-white/5 shadow-xs"
                        title="Retour"
                      >
                        <Icons.ArrowLeft size={16} />
                      </button>
                      <span className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] font-semibold">
                        Fiche Commercial Terrain & Visites
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setNewDirectiveForm({
                            recipient_id: String(selectedSalespersonDetail.id),
                            title: '',
                            instruction: '',
                            target_account_name: '',
                            priority: 'NORMAL',
                          });
                          setSalespersonDetailTab('directives');
                        }}
                        className="px-3.5 py-1.5 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                      >
                        <Icons.Send size={14} />
                        <span>Émettre une Directive</span>
                      </button>
                    </div>
                  </div>

                  {/* Commercial Profile Header Card */}
                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#363336] p-1 border border-black/5 dark:border-white/5 shrink-0 overflow-hidden shadow-xs">
                        <img
                          src={`/memojis/${(selectedSalespersonDetail.avatar || 'memoji_056.png').replace('assets/memojis/', '')}`}
                          alt={selectedSalespersonDetail.full_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-extrabold text-[#242124] dark:text-white">
                            {selectedSalespersonDetail.full_name}
                          </h3>
                          {selectedSalespersonDetail.is_available ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                              <Icons.CheckCircle size={10} /> En tournée
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold">
                              En pause
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#6E6C67] dark:text-[#A1A1AA] flex-wrap">
                          <span>@{selectedSalespersonDetail.username}</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Icons.Phone size={12} />
                            {selectedSalespersonDetail.phone || 'Non renseigné'}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Icons.Mail size={12} />
                            {selectedSalespersonDetail.email}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Icons.MapPin size={12} />
                            {selectedSalespersonDetail.location || 'Kinshasa'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Plaques attribuées :</span>
                          {selectedSalespersonDetail.assigned_plaques && selectedSalespersonDetail.assigned_plaques.length > 0 ? (
                            selectedSalespersonDetail.assigned_plaques.map((code) => (
                              <span key={code} className="px-2 py-0.5 rounded-md bg-[#4F6CE8]/10 text-[#4F6CE8] font-semibold text-[10px]">
                                {code}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-zinc-400">Aucune plaque attribuée</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Performance KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
                      <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                        <span className="text-[10px] uppercase font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Points Cumulés</span>
                        <span className="text-base font-extrabold text-[#4F6CE8]">{selectedSalespersonDetail.incentive_points || 0} pts</span>
                      </div>
                      <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                        <span className="text-[10px] uppercase font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Signatures SOHO</span>
                        <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{selectedSalespersonDetail.conversions_count || 0}</span>
                      </div>
                      <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                        <span className="text-[10px] uppercase font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Visites Réalisées</span>
                        <span className="text-base font-extrabold text-[#242124] dark:text-white">{salespersonDetailKpis.visited} / {salespersonDetailKpis.total}</span>
                      </div>
                      <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                        <span className="text-[10px] uppercase font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Taux Visites</span>
                        <span className="text-base font-extrabold text-[#242124] dark:text-white">{salespersonDetailKpis.rate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Sub-Tabs Selector */}
                  <div className="flex items-center gap-2 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-2 rounded-2xl border border-black/5 dark:border-white/5">
                    <button
                      onClick={() => setSalespersonDetailTab('enterprises')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                        salespersonDetailTab === 'enterprises'
                          ? 'bg-[#4F6CE8] text-white shadow-xs'
                          : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                      }`}
                    >
                      <Icons.Building size={14} />
                      <span>Comptes Assignés & Visites ({salespersonDetailKpis.total})</span>
                    </button>
                    <button
                      onClick={() => setSalespersonDetailTab('directives')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                        salespersonDetailTab === 'directives'
                          ? 'bg-[#4F6CE8] text-white shadow-xs'
                          : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                      }`}
                    >
                      <Icons.Send size={14} />
                      <span>Directives & Instructions ({salespersonDirectives.length})</span>
                    </button>
                  </div>

                  {/* SUB-TAB 1: COMPTES ASSIGNÉS & VISITES */}
                  {salespersonDetailTab === 'enterprises' && (
                    <div className="flex flex-col gap-4">
                      {/* Filter Toolbar & Search */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3 rounded-2xl border border-black/5 dark:border-white/5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => setSalespersonDetailFilter('ALL')}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              salespersonDetailFilter === 'ALL'
                                ? 'bg-[#4F6CE8] text-white shadow-xs'
                                : 'bg-white dark:bg-[#363336] text-[#6E6C67] dark:text-[#A1A1AA] border border-black/5 dark:border-white/5'
                            }`}
                          >
                            Tous ({salespersonDetailKpis.total})
                          </button>
                          <button
                            onClick={() => setSalespersonDetailFilter('VISITED')}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              salespersonDetailFilter === 'VISITED'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white dark:bg-[#363336] text-emerald-600 dark:text-emerald-400 border border-black/5 dark:border-white/5'
                            }`}
                          >
                            Visités sur le terrain ({salespersonDetailKpis.visited})
                          </button>
                          <button
                            onClick={() => setSalespersonDetailFilter('UNVISITED')}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              salespersonDetailFilter === 'UNVISITED'
                                ? 'bg-[#4F6CE8]/10 text-white shadow-xs'
                                : 'bg-white dark:bg-[#363336] text-[#4F6CE8] border border-black/5 dark:border-white/5'
                            }`}
                          >
                            Pas encore visités ({salespersonDetailKpis.unvisited})
                          </button>
                        </div>

                        <div className="relative w-full sm:w-64">
                          <Icons.Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input
                            type="text"
                            value={salespersonDetailSearch}
                            onChange={(e) => setSalespersonDetailSearch(e.target.value)}
                            placeholder="Rechercher un compte..."
                            className="w-full bg-white dark:bg-[#363336] pl-8 pr-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5 text-xs text-[#242124] dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#4F6CE8]"
                          />
                        </div>
                      </div>

                      {/* Accounts Table */}
                      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-black/5 dark:border-white/5 text-[10px] font-semibold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                                <th className="pb-3 px-3">Entreprise</th>
                                <th className="pb-3 px-3">Plaque & Commune</th>
                                <th className="pb-3 px-3">Contact Référent</th>
                                <th className="pb-3 px-3">Statut Visite</th>
                                <th className="pb-3 px-3">Statut SOHO</th>
                                <th className="pb-3 px-3 text-right">Réaffectation</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                              {filteredSalespersonDetailAccounts.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                                    Aucun compte assigné ne correspond aux critères sélectionnés.
                                  </td>
                                </tr>
                              ) : (
                                filteredSalespersonDetailAccounts.map((ent) => (
                                  <tr key={ent.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    <td className="py-3 px-3">
                                      <div className="flex flex-col">
                                        <span className="font-semibold text-[#242124] dark:text-white">{ent.name}</span>
                                        <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                                          {ent.crm_id} • {ent.sector}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-3">
                                      <div className="flex flex-col">
                                        <span className="font-semibold text-xs text-[#4F6CE8]">{ent.plaque_code || ent.plaque || '—'}</span>
                                        <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{ent.commune || ent.city || 'Kinshasa'}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-3">
                                      <div className="flex flex-col">
                                        <span className="font-550 text-[#242124] dark:text-white">{ent.contact_name || 'Non renseigné'}</span>
                                        <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{ent.contact_phone || '—'}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-3">
                                      {ent.is_visited ? (
                                        <div className="flex flex-col">
                                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1 w-fit">
                                            <Icons.CheckCircle size={10} /> Visité sur le terrain
                                          </span>
                                          {ent.last_visited_at && (
                                            <span className="text-[9px] text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5 pl-1">
                                              le {new Date(ent.last_visited_at).toLocaleDateString()}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 text-[10px] font-semibold flex items-center gap-1 w-fit">
                                          <Icons.Clock size={10} /> Pas encore visité
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                        ent.conversion_status === 'CONVERTED' || ent.is_converted
                                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                          : 'bg-[#4F6CE8]/10 text-[#4F6CE8]'
                                      }`}>
                                        {ent.conversion_status || 'PROSPECT'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                      <select
                                        value={ent.assigned_salesperson || ''}
                                        onChange={(e) => handleAssignEnterpriseSalesperson(ent.id, e.target.value ? Number(e.target.value) : null)}
                                        disabled={assigningEnterpriseId === ent.id}
                                        className="bg-white dark:bg-[#363336] text-[11px] font-semibold py-1 px-2 rounded-xl border border-black/5 dark:border-white/5 text-[#242124] dark:text-white cursor-pointer focus:outline-none"
                                      >
                                        <option value="">Désassigner</option>
                                        {salespersons.map((s) => (
                                          <option key={s.id} value={s.id}>
                                            {s.full_name}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 2: DIRECTIVES & INSTRUCTIONS */}
                  {salespersonDetailTab === 'directives' && (
                    <div className="flex flex-col gap-4">
                      {/* Send Directive Form */}
                      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icons.Send size={15} className="text-[#4F6CE8]" />
                            <h4 className="text-xs font-extrabold text-[#242124] dark:text-white">
                              Transmettre une directive ou consigne à {selectedSalespersonDetail.full_name}
                            </h4>
                          </div>
                          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                            Notification instantanée envoyée sur son terminal mobile
                          </span>
                        </div>

                        <form onSubmit={handleSendDirective} className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-1">
                          <div className="sm:col-span-5 flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Objet de la directive</label>
                            <input
                              type="text"
                              required
                              value={newDirectiveForm.title}
                              onChange={(e) => setNewDirectiveForm({ ...newDirectiveForm, title: e.target.value })}
                              placeholder="ex: Relance urgente offre fibre"
                              className="bg-white dark:bg-[#363336] px-3 py-2 rounded-xl border border-black/5 dark:border-white/5 text-xs text-[#242124] dark:text-white focus:outline-none focus:border-[#4F6CE8]"
                            />
                          </div>

                          <div className="sm:col-span-4 flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Compte SOHO Cible (optionnel)</label>
                            <input
                              type="text"
                              value={newDirectiveForm.target_account_name}
                              onChange={(e) => setNewDirectiveForm({ ...newDirectiveForm, target_account_name: e.target.value })}
                              placeholder="ex: Polyclinique Centrale"
                              className="bg-white dark:bg-[#363336] px-3 py-2 rounded-xl border border-black/5 dark:border-white/5 text-xs text-[#242124] dark:text-white focus:outline-none focus:border-[#4F6CE8]"
                            />
                          </div>

                          <div className="sm:col-span-3 flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Niveau de Priorité</label>
                            <select
                              value={newDirectiveForm.priority}
                              onChange={(e: any) => setNewDirectiveForm({ ...newDirectiveForm, priority: e.target.value })}
                              className="bg-white dark:bg-[#363336] px-3 py-2 rounded-xl border border-black/5 dark:border-white/5 text-xs text-[#242124] dark:text-white focus:outline-none focus:border-[#4F6CE8]"
                            >
                              <option value="NORMAL">Normale</option>
                              <option value="HIGH">Haute</option>
                              <option value="CRITICAL">Urgente / Critique</option>
                            </select>
                          </div>

                          <div className="sm:col-span-10 flex flex-col gap-1">
                            <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Consignes & Démarche attendue</label>
                            <textarea
                              required
                              rows={2}
                              value={newDirectiveForm.instruction}
                              onChange={(e) => setNewDirectiveForm({ ...newDirectiveForm, instruction: e.target.value })}
                              placeholder="Détaillez la démarche attendue, l'offre à pousser ou la situation client..."
                              className="bg-white dark:bg-[#363336] px-3 py-2 rounded-xl border border-black/5 dark:border-white/5 text-xs text-[#242124] dark:text-white focus:outline-none focus:border-[#4F6CE8] resize-none"
                            />
                          </div>

                          <div className="sm:col-span-2 flex items-end">
                            <button
                              type="submit"
                              disabled={sendingDirective}
                              className="w-full py-2.5 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                            >
                              <Icons.Send size={13} />
                              <span>{sendingDirective ? 'Envoi...' : 'Transmettre'}</span>
                            </button>
                          </div>
                        </form>

                        {directiveSuccessMsg && (
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                            <Icons.CheckCircle size={13} />
                            <span>{directiveSuccessMsg}</span>
                          </div>
                        )}
                      </div>

                      {/* Directives List */}
                      <div className="flex flex-col gap-3">
                        {salespersonDirectives.length === 0 ? (
                          <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-12 rounded-3xl border border-black/5 dark:border-white/5 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                            Aucune directive émise pour {selectedSalespersonDetail.full_name} pour le moment.
                          </div>
                        ) : (
                          salespersonDirectives.map((d) => (
                            <div
                              key={d.id}
                              className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/5 dark:border-white/5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                    d.priority === 'CRITICAL'
                                      ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                                      : d.priority === 'HIGH'
                                      ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                                      : 'bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300'
                                  }`}>
                                    Priorité {d.priority}
                                  </span>
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                    d.status === 'COMPLETED'
                                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                      : d.status === 'IN_PROGRESS'
                                      ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                                      : 'bg-[#4F6CE8]/15 text-[#4F6CE8]'
                                  }`}>
                                    {d.status === 'COMPLETED' ? 'Terminée' : d.status === 'IN_PROGRESS' ? 'En cours' : 'Transmise'}
                                  </span>
                                  {d.target_account_name && (
                                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#363336] text-[10px] font-semibold text-[#242124] dark:text-white border border-black/5 dark:border-white/5">
                                      Compte: {d.target_account_name}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                                  Émise le {new Date(d.created_at).toLocaleDateString()} par {d.sender_name || 'Superviseur'}
                                </span>
                              </div>

                              <div>
                                <h4 className="text-xs font-extrabold text-[#242124] dark:text-white">{d.title}</h4>
                                <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-1 leading-relaxed">{d.instruction}</p>
                              </div>

                              {d.acknowledgement_note && (
                                <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    Compte-rendu du commercial ({selectedSalespersonDetail.full_name}) :
                                  </span>
                                  <p className="text-xs text-[#242124] dark:text-white italic">
                                    "{d.acknowledgement_note}"
                                  </p>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* MAIN SALESPERSONS TABLE & OVERVIEW */
                <div className="flex flex-col gap-4">
                  {/* Header Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
                        {sortedSalespersons.length} commerciaux terrain actifs • Cliquez sur un commercial pour voir ses comptes et visites
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {top3Salespersons.length > 0 && (
                        <button
                          onClick={() => setShowSalespersonPodium(!showSalespersonPodium)}
                          className={`px-3.5 py-1.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 border ${
                            showSalespersonPodium
                              ? 'bg-[#4F6CE8] text-white border-[#4F6CE8]'
                              : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 text-[#242124] dark:text-white hover:bg-black/10 dark:hover:bg-white/10'
                          }`}
                        >
                          <Icons.Trophy size={14} />
                          <span>Podium Top 3 Performance</span>
                          <Icons.ChevronDown size={13} className={`transition-transform duration-200 ${showSalespersonPodium ? 'rotate-180' : ''}`} />
                        </button>
                      )}

                      <button
                        onClick={() => setIsAddSalespersonOpen(true)}
                        className="px-3.5 py-1.5 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                      >
                        <Icons.UserPlus size={14} />
                        <span>Ajouter un Commercial</span>
                      </button>
                    </div>
                  </div>

                  {/* Discreet Top 3 Podium */}
                  {showSalespersonPodium && top3Salespersons.length > 0 && (
                    <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-4 border border-black/5 dark:border-white/5 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icons.Trophy size={14} className="text-[#4F6CE8]" />
                          <span className="text-xs font-extrabold text-[#242124] dark:text-white">Top 3 Commerciaux Terrain • Classement Points</span>
                        </div>
                        <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">100 pts / signature • 20 pts / fiche • 10 pts / visite</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {top3Salespersons.map((sp, idx) => (
                          <div
                            key={sp.id}
                            onClick={() => setSelectedSalespersonDetail(sp)}
                            className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer hover:border-[#4F6CE8]/50 transition-all ${
                              idx === 0
                                ? 'bg-white dark:bg-[#363336] border-[#4F6CE8]/30 shadow-xs'
                                : 'bg-white dark:bg-[#363336] border-black/5 dark:border-white/5'
                            }`}
                          >
                            <div className="relative shrink-0">
                              <img
                                src={`/memojis/${(sp.avatar || 'memoji_056.png').replace('assets/memojis/', '')}`}
                                alt={sp.full_name}
                                className="w-10 h-10 rounded-xl object-cover"
                              />
                              <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white ${
                                idx === 0 ? 'bg-[#4F6CE8]/10' : idx === 1 ? 'bg-slate-400' : 'bg-[#4F6CE8]/10'
                              }`}>
                                {idx + 1}
                              </div>
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs font-extrabold text-[#242124] dark:text-white truncate hover:text-[#4F6CE8] transition-colors">{sp.full_name}</span>
                              <div className="flex items-center gap-2 text-[10px] mt-0.5">
                                <span className="font-semibold text-[#4F6CE8]">{sp.incentive_points || 0} pts</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-550">{sp.conversions_count || 0} sign.</span>
                                <span className="text-[#6E6C67] dark:text-[#A1A1AA]">{sp.visits_count || 0} vis.</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Salespersons Table */}
                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-black/5 dark:border-white/5 text-[10px] font-semibold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                            <th className="pb-3 px-3">Commercial</th>
                            <th className="pb-3 px-3">Plaques Affectées</th>
                            <th className="pb-3 px-3">Points Cumulés</th>
                            <th className="pb-3 px-3">Signatures SOHO</th>
                            <th className="pb-3 px-3">Visites Réalisées</th>
                            <th className="pb-3 px-3">Statut</th>
                            <th className="pb-3 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                          {sortedSalespersons.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                                Aucun commercial terrain répertorié.
                              </td>
                            </tr>
                          ) : (
                            sortedSalespersons.map((sp) => (
                              <tr
                                key={sp.id}
                                onClick={() => setSelectedSalespersonDetail(sp)}
                                className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                              >
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-2xl bg-white dark:bg-[#363336] p-0.5 border border-black/5 dark:border-white/5 overflow-hidden shrink-0">
                                      <img
                                        src={`/memojis/${(sp.avatar || 'memoji_056.png').replace('assets/memojis/', '')}`}
                                        alt={sp.full_name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-extrabold text-[#242124] dark:text-white hover:text-[#4F6CE8] transition-colors">{sp.full_name}</span>
                                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">@{sp.username} • {sp.phone || 'Non renseigné'}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex flex-wrap gap-1">
                                    {sp.assigned_plaques && sp.assigned_plaques.length > 0 ? (
                                      sp.assigned_plaques.map((plCode) => (
                                        <span key={plCode} className="px-2 py-0.5 rounded-md bg-[#4F6CE8]/10 text-[#4F6CE8] font-semibold text-[10px]">
                                          {plCode}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-[10px] text-zinc-400">Aucune plaque</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="font-extrabold text-xs text-[#4F6CE8]">
                                    {sp.incentive_points || 0} pts
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                                    {sp.conversions_count || 0}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="font-semibold text-[#242124] dark:text-white text-xs">
                                    {sp.visits_count || 0} visites
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  {sp.is_available ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1 w-fit">
                                      <Icons.CheckCircle size={10} /> En tournée
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold w-fit">
                                      En pause
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => setSelectedSalespersonDetail(sp)}
                                      className="px-2.5 py-1 rounded-xl bg-[#4F6CE8]/10 hover:bg-[#4F6CE8]/20 text-[#4F6CE8] font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-1 border border-[#4F6CE8]/20"
                                      title="Ouvrir la fiche détaillée du commercial"
                                    >
                                      <Icons.Eye size={12} />
                                      <span>Fiche & Visites</span>
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (confirm(`Confirmez-vous la révocation du compte ${sp.full_name} ?`)) {
                                          await fetchAPI(`/api/sales/salespersons/${sp.id}/`, { method: 'DELETE' });
                                          await loadDashboardData();
                                        }
                                      }}
                                      className="p-1.5 rounded-xl hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                                      title="Révoquer le compte"
                                    >
                                      <Icons.Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* VIEW 3: MAP VIEW (Territoire pur sans aucun filtre superficiel) */}
            {activeView === 'map' && (
              <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-4 border border-black/5 dark:border-white/5 overflow-hidden">
                <SupervisorTerritoryMap
                  plaques={plaques as any}
                  enterprises={enterprises as any}
                  salespersons={salespersons as any}
                  recentReports={recentReportsFeed as any}
                  onPlaqueCreated={loadDashboardData}
                  onSalespersonAssigned={loadDashboardData}
                  onSalespersonChanged={loadDashboardData}
                  onOpenPlaqueDetail={(plaque) => {
                    setSelectedPlaqueDetail(plaque as any);
                    setActiveView('plaques_list');
                  }}
                />
              </div>
            )}

{/* VIEW 4: PLAQUES & AUTO-DISPATCH */}
            {activeView === 'plaques_list' && (
              selectedPlaqueDetail ? (
                /* DEDICATED PLAQUE DETAIL & DISPATCH INTERFACE */
                <div className="flex flex-col gap-4">
                  {/* Top Header Toolbar with Back Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedPlaqueDetail(null)}
                        className="p-2 rounded-2xl bg-white dark:bg-[#363336] hover:bg-black/5 dark:hover:bg-white/10 text-[#242124] dark:text-white transition-all cursor-pointer inline-flex items-center justify-center border border-black/5 dark:border-white/5 shadow-xs"
                        title="Retour"
                      >
                        <Icons.ArrowLeft size={16} />
                      </button>

                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-xl bg-[#4F6CE8]/10 text-[#4F6CE8] font-extrabold text-xs">
                          {selectedPlaqueDetail.code}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-xs text-[#242124] dark:text-white">
                            {selectedPlaqueDetail.name}
                          </span>
                          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                            Zone {selectedPlaqueDetail.city}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => openPlaqueAssignModal(selectedPlaqueDetail)}
                        className="px-3.5 py-1.5 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#242124] dark:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-black/5 dark:border-white/5 transition-all"
                        title="Affecter ou modifier les commerciaux assignés à cette plaque"
                      >
                        <Icons.Users size={14} />
                        <span>Gérer les Commerciaux de la Plaque</span>
                      </button>

                      <button
                        onClick={() => handleAutoDispatch(selectedPlaqueDetail)}
                        disabled={dispatchingPlaqueId === selectedPlaqueDetail.id}
                        className="px-3.5 py-1.5 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all disabled:opacity-50"
                      >
                        <Icons.Zap size={14} className={dispatchingPlaqueId === selectedPlaqueDetail.id ? 'animate-spin' : ''} />
                        <span>{dispatchingPlaqueId === selectedPlaqueDetail.id ? 'Calcul...' : 'Auto-Dispatch IA'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Assigned Commercials Banner for this Plaque */}
                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
                        Commerciaux affectés à cette plaque :
                      </span>
                      {selectedPlaqueDetail.assigned_salespersons_names && selectedPlaqueDetail.assigned_salespersons_names.length > 0 ? (
                        selectedPlaqueDetail.assigned_salespersons_names.map((name) => (
                          <span key={name} className="px-2.5 py-0.5 rounded-lg bg-white dark:bg-[#363336] text-[#242124] dark:text-white font-semibold text-xs border border-black/5 dark:border-white/5 shadow-xs">
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[#4F6CE8] font-550">
                          Aucun commercial affecté à cette zone cartographique
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => openPlaqueAssignModal(selectedPlaqueDetail)}
                      className="text-xs text-[#4F6CE8] font-semibold hover:underline cursor-pointer"
                    >
                      Modifier l'équipe de la plaque →
                    </button>
                  </div>

                  {/* Plaque KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                      <span className="text-[10px] uppercase font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Total Entreprises</span>
                      <span className="text-lg font-extrabold text-[#242124] dark:text-white mt-1">{plaqueDetailKpis.total}</span>
                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">dans la plaque</span>
                    </div>
                    <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                      <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Visités sur le terrain</span>
                      <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{plaqueDetailKpis.visited}</span>
                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                        {plaqueDetailKpis.total > 0 ? Math.round((plaqueDetailKpis.visited / plaqueDetailKpis.total) * 100) : 0}% de couverture
                      </span>
                    </div>
                    <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                      <span className="text-[10px] uppercase font-semibold text-[#4F6CE8]">Pas encore visités</span>
                      <span className="text-lg font-extrabold text-[#4F6CE8] mt-1">{plaqueDetailKpis.unvisited}</span>
                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">à prospecter</span>
                    </div>
                    <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                      <span className="text-[10px] uppercase font-semibold text-[#4F6CE8]">Assignés</span>
                      <span className="text-lg font-extrabold text-[#4F6CE8] mt-1">{plaqueDetailKpis.assigned}</span>
                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">avec commercial</span>
                    </div>
                    <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                      <span className="text-[10px] uppercase font-semibold text-zinc-500 dark:text-zinc-400">Non assignés</span>
                      <span className={`text-lg font-extrabold mt-1 ${plaqueDetailKpis.unassigned > 0 ? 'text-[#4F6CE8]' : 'text-[#242124] dark:text-white'}`}>
                        {plaqueDetailKpis.unassigned}
                      </span>
                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">en attente</span>
                    </div>
                  </div>

                  {/* Success Banner */}
                  {plaqueDetailSuccessMsg && (
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                      <Icons.CheckCircle size={14} />
                      <span>{plaqueDetailSuccessMsg}</span>
                    </div>
                  )}

                  {/* Bulk Dispatch Unassigned Bar (If unassigned accounts exist) */}
                  {plaqueDetailKpis.unassigned > 0 && (
                    <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-extrabold text-[#242124] dark:text-white">
                          Affectation groupée des {plaqueDetailKpis.unassigned} comptes non assignés
                        </span>
                        <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                          Attribuez rapidement l'ensemble des comptes disponibles à l'un des commerciaux de la plaque
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={bulkDispatchSalespersonId}
                          onChange={(e) => setBulkDispatchSalespersonId(e.target.value)}
                          className="bg-white dark:bg-[#363336] text-xs font-semibold py-2 px-3 rounded-xl border border-black/5 dark:border-white/5 text-[#242124] dark:text-white focus:outline-none"
                        >
                          <option value="">Sélectionner un commercial...</option>
                          {salespersons.map((sp) => {
                            const isAssignedToPlaque = selectedPlaqueDetail.assigned_salespersons?.includes(sp.id);
                            return (
                              <option key={sp.id} value={sp.id}>
                                {sp.full_name} {isAssignedToPlaque ? '(Sur cette plaque)' : ''}
                              </option>
                            );
                          })}
                        </select>

                        <button
                          onClick={handleBulkDispatchUnassigned}
                          disabled={!bulkDispatchSalespersonId || isBulkDispatching}
                          className="px-4 py-2 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all disabled:opacity-50 shrink-0"
                        >
                          <Icons.UserPlus size={13} />
                          <span>{isBulkDispatching ? 'Affectation...' : 'Affecter en masse'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Filters Toolbar & Search */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3 rounded-2xl border border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setPlaqueDetailFilter('ALL')}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          plaqueDetailFilter === 'ALL'
                            ? 'bg-[#4F6CE8] text-white shadow-xs'
                            : 'bg-white dark:bg-[#363336] text-[#6E6C67] dark:text-[#A1A1AA] border border-black/5 dark:border-white/5'
                        }`}
                      >
                        Toutes ({plaqueDetailKpis.total})
                      </button>
                      <button
                        onClick={() => setPlaqueDetailFilter('VISITED')}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          plaqueDetailFilter === 'VISITED'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-[#363336] text-emerald-600 dark:text-emerald-400 border border-black/5 dark:border-white/5'
                        }`}
                      >
                        Visités sur le terrain ({plaqueDetailKpis.visited})
                      </button>
                      <button
                        onClick={() => setPlaqueDetailFilter('UNVISITED')}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          plaqueDetailFilter === 'UNVISITED'
                            ? 'bg-[#4F6CE8]/10 text-white shadow-xs'
                            : 'bg-white dark:bg-[#363336] text-[#4F6CE8] border border-black/5 dark:border-white/5'
                        }`}
                      >
                        Pas encore visités ({plaqueDetailKpis.unvisited})
                      </button>
                      <button
                        onClick={() => setPlaqueDetailFilter('UNASSIGNED')}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          plaqueDetailFilter === 'UNASSIGNED'
                            ? 'bg-zinc-800 text-white shadow-xs'
                            : 'bg-white dark:bg-[#363336] text-zinc-600 dark:text-zinc-300 border border-black/5 dark:border-white/5'
                        }`}
                      >
                        Non assignés ({plaqueDetailKpis.unassigned})
                      </button>
                      <button
                        onClick={() => setPlaqueDetailFilter('ASSIGNED')}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          plaqueDetailFilter === 'ASSIGNED'
                            ? 'bg-[#4F6CE8] text-white shadow-xs'
                            : 'bg-white dark:bg-[#363336] text-[#4F6CE8] border border-black/5 dark:border-white/5'
                        }`}
                      >
                        Assignés ({plaqueDetailKpis.assigned})
                      </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Icons.Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        value={plaqueDetailSearch}
                        onChange={(e) => setPlaqueDetailSearch(e.target.value)}
                        placeholder="Rechercher entreprise..."
                        className="w-full bg-white dark:bg-[#363336] pl-8 pr-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5 text-xs text-[#242124] dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#4F6CE8]"
                      />
                    </div>
                  </div>

                  {/* Enterprises Table in this plaque */}
                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-black/5 dark:border-white/5 text-[10px] font-semibold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                            <th className="pb-3 px-3">Entreprise</th>
                            <th className="pb-3 px-3">Contact Référent</th>
                            <th className="pb-3 px-3">Statut Visite</th>
                            <th className="pb-3 px-3">Statut SOHO</th>
                            <th className="pb-3 px-3 text-right">Commercial Affecté</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                          {filteredPlaqueDetailAccounts.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                                Aucune entreprise ne correspond aux filtres sélectionnés pour cette plaque.
                              </td>
                            </tr>
                          ) : (
                            filteredPlaqueDetailAccounts.map((ent) => (
                              <tr key={ent.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <td className="py-3 px-3">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-[#242124] dark:text-white">{ent.name}</span>
                                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                                      {ent.crm_id} • {ent.commune || ent.city || 'Kinshasa'} • {ent.sector}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex flex-col">
                                    <span className="font-550 text-[#242124] dark:text-white">{ent.contact_name || 'Non renseigné'}</span>
                                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{ent.contact_phone || '—'}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  {ent.is_visited ? (
                                    <div className="flex flex-col">
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1 w-fit">
                                        <Icons.CheckCircle size={10} /> Visité sur le terrain
                                      </span>
                                      {ent.last_visited_at && (
                                        <span className="text-[9px] text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5 pl-1">
                                          le {new Date(ent.last_visited_at).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 text-[10px] font-semibold flex items-center gap-1 w-fit">
                                      <Icons.Clock size={10} /> Pas encore visité
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    ent.conversion_status === 'CONVERTED' || ent.is_converted
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-[#4F6CE8]/10 text-[#4F6CE8]'
                                  }`}>
                                    {ent.conversion_status || 'PROSPECT'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="inline-flex items-center gap-1.5 justify-end">
                                    {assigningEnterpriseId === ent.id && (
                                      <div className="w-3.5 h-3.5 border-2 border-[#4F6CE8] border-t-transparent rounded-full animate-spin" />
                                    )}
                                    <select
                                      value={ent.assigned_salesperson || ''}
                                      onChange={(e) => handleAssignEnterpriseSalesperson(ent.id, e.target.value ? Number(e.target.value) : null)}
                                      disabled={assigningEnterpriseId === ent.id}
                                      className="bg-white dark:bg-[#363336] text-[11px] font-semibold py-1 px-2 rounded-xl border border-black/5 dark:border-white/5 text-[#242124] dark:text-white cursor-pointer focus:outline-none"
                                    >
                                      <option value="">Non assigné</option>
                                      {salespersons.map((s) => {
                                        const isAssignedPlaque = selectedPlaqueDetail.assigned_salespersons?.includes(s.id);
                                        return (
                                          <option key={s.id} value={s.id}>
                                            {s.full_name} {isAssignedPlaque ? '★ (Plaque)' : ''}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                /* MAIN PLAQUES TABLE & OVERVIEW */
                <div className="flex flex-col gap-4">
                  {/* Sticky Filter Bar */}
                  <div className="sticky top-0 z-20 backdrop-blur-2xl bg-white/85 dark:bg-[#1E1C1E]/85 p-3 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 flex-wrap shadow-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-550 uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA] mr-1">
                        Filtre Plaques :
                      </span>
                      {[
                        { id: 'ALL', label: 'Toutes' },
                        { id: 'WITH_SALESPERSONS', label: 'Avec Commerciaux' },
                        { id: 'NO_SALESPERSONS', label: 'Sans Commercial' },
                        { id: 'COVERED', label: '100% Visitées' },
                        { id: 'TO_PROSPECT', label: 'À prospecter' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setPlaquesListFilter(f.id as any)}
                          className={`px-3 py-1 rounded-xl text-xs font-550 transition-all cursor-pointer ${
                            plaquesListFilter === f.id
                              ? 'bg-[#4F6CE8] text-white shadow-xs'
                              : 'bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={plaqueCityFilter}
                        onChange={(e) => setPlaqueCityFilter(e.target.value)}
                        className="bg-white dark:bg-[#363336] text-xs font-550 text-[#242124] dark:text-white px-2.5 py-1 rounded-xl border border-black/10 dark:border-white/10 focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">Toutes les villes</option>
                        {Array.from(new Set(plaques.map((p) => p.city).filter(Boolean))).map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>

                      <span className="text-xs font-550 text-[#4F6CE8] bg-[#4F6CE8]/10 px-2.5 py-1 rounded-xl">
                        {filteredPlaques.length} plaque(s)
                      </span>

                      <button
                        onClick={() => setIsAddPlaqueOpen(true)}
                        className="px-3.5 py-1 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-550 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ml-1"
                      >
                        <Icons.Plus size={13} />
                        <span>Créer</span>
                      </button>
                    </div>
                  </div>

                  {/* Header Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5">
                    <div>
                      <h3 className="text-sm font-550 text-[#242124] dark:text-white">Plaques Cartographiques & Dispatching Intelligent</h3>
                      <p className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
                        Cliquez sur une plaque pour accéder à sa fiche détaillée et gérer la répartition manuelle des entreprises.
                      </p>
                    </div>
                  </div>

                  {/* Plaques Table */}
                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-black/5 dark:border-white/5 text-[10px] font-semibold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                            <th className="pb-3 px-3">Code Plaque</th>
                            <th className="pb-3 px-3">Nom & Ville</th>
                            <th className="pb-3 px-3">Commerciaux Affectés</th>
                            <th className="pb-3 px-3">Comptes SOHO</th>
                            <th className="pb-3 px-3">Visités vs Non visités</th>
                            <th className="pb-3 px-3 text-right">Actions & Répartition</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                          {filteredPlaques.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                                Aucune plaque ne correspond aux filtres sélectionnés.
                              </td>
                            </tr>
                          ) : (
                            filteredPlaques.map((plaque) => {
                              const plaqueEnterprises = enterprises.filter(
                                (e) => e.plaque_code === plaque.code || e.plaque === plaque.name || (e as any).plaque_rel === plaque.id
                              );
                              const visitedCount = plaqueEnterprises.filter((e) => e.is_visited).length;
                              const unvisitedCount = plaqueEnterprises.length - visitedCount;
                              const isDispatching = dispatchingPlaqueId === plaque.id;

                              return (
                                <tr
                                  key={plaque.id}
                                  onClick={() => setSelectedPlaqueDetail(plaque)}
                                  className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                  <td className="py-3 px-3">
                                    <span className="px-2.5 py-1 rounded-xl bg-[#4F6CE8]/10 text-[#4F6CE8] font-extrabold text-xs">
                                      {plaque.code}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-[#242124] dark:text-white hover:text-[#4F6CE8] transition-colors">{plaque.name}</span>
                                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{plaque.city}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="flex flex-wrap gap-1">
                                      {plaque.assigned_salespersons_names && plaque.assigned_salespersons_names.length > 0 ? (
                                        plaque.assigned_salespersons_names.map((name) => (
                                          <span key={name} className="px-2 py-0.5 rounded-md bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 text-xs font-550 text-[#242124] dark:text-white">
                                            {name}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-[10px] text-[#4F6CE8] font-550">
                                          Aucun commercial affecté
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className="font-extrabold text-xs text-[#242124] dark:text-white">
                                      {plaqueEnterprises.length} comptes
                                    </span>
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="flex items-center gap-2 text-[10px]">
                                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{visitedCount} visités</span>
                                      <span className="text-zinc-400">•</span>
                                      <span className="text-[#6E6C67] dark:text-[#A1A1AA]">{unvisitedCount} restants</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => setSelectedPlaqueDetail(plaque)}
                                        className="px-2.5 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#242124] dark:text-white border border-black/10 dark:border-white/10 font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                                        title="Ouvrir la fiche de détail et la répartition manuelle des entreprises de cette plaque"
                                      >
                                        <Icons.Eye size={12} />
                                        <span>Détail & Dispatch</span>
                                      </button>
                                      <button
                                        onClick={() => handleAutoDispatch(plaque)}
                                        disabled={isDispatching}
                                        className="px-2.5 py-1.5 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                        title="Déclencher l'algorithme d'affectation automatique avec anti-collision"
                                      >
                                        <Icons.Zap size={12} className={isDispatching ? "animate-spin" : ""} />
                                        <span>{isDispatching ? "Calcul..." : "Auto-Dispatch"}</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* VIEW 5: SOHO DIRECTORY */}
            {activeView === 'soho_directory' && (
              <div className="flex flex-col gap-4">
                {/* Sticky Filter Bar */}
                <div className="sticky top-0 z-20 backdrop-blur-2xl bg-white/85 dark:bg-[#1E1C1E]/85 p-3 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 flex-wrap shadow-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-550 uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA] mr-1">
                      Filtre Annuaire :
                    </span>
                    <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                      {[
                        { id: 'ALL', label: 'Toutes' },
                        { id: 'VISITED', label: 'Déjà visitées' },
                        { id: 'UNVISITED', label: 'À visiter' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setDirectoryVisitFilter(f.id as any)}
                          className={`px-3 py-1 rounded-lg text-xs font-550 transition-all cursor-pointer ${
                            directoryVisitFilter === f.id
                              ? 'bg-[#4F6CE8] text-white shadow-xs'
                              : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                      {[
                        { id: 'ALL', label: 'Tous statuts' },
                        { id: 'CONVERTED', label: 'Convertis' },
                        { id: 'PROSPECT', label: 'En prospection' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setDirectoryStatusFilter(f.id as any)}
                          className={`px-3 py-1 rounded-lg text-xs font-550 transition-all cursor-pointer ${
                            directoryStatusFilter === f.id
                              ? 'bg-[#4F6CE8] text-white shadow-xs'
                              : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <span className="text-xs font-550 text-[#4F6CE8] bg-[#4F6CE8]/10 px-2.5 py-1 rounded-xl">
                    {filteredDirectoryAccounts.length} entreprise(s)
                  </span>
                </div>

                <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#242124] dark:text-white">Annuaire Exhaustif SOHO & TPE</h3>
                    <p className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
                      Coordonnées, RCCM, fiches contacts et offres recommandées pour le terrain.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
                    {filteredDirectoryAccounts.length} entreprises répertoriées
                  </span>
                </div>

                <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-black/5 dark:border-white/5 text-[10px] font-semibold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                          <th className="pb-3 px-3">Entreprise</th>
                          <th className="pb-3 px-3">RCCM & Commune</th>
                          <th className="pb-3 px-3">Contact Principal</th>
                          <th className="pb-3 px-3">Commercial Affecté</th>
                          <th className="pb-3 px-3">Opérateur Actuel</th>
                          <th className="pb-3 px-3">Solution Recommandée</th>
                          <th className="pb-3 px-3 text-right">Fiche</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {filteredDirectoryAccounts.map((account) => (
                          <tr key={account.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <td className="py-3 px-3">
                              <span className="font-semibold text-[#242124] dark:text-white block">{account.name}</span>
                              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] font-mono">{account.crm_id}</span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col">
                                <span className="font-mono text-[10px] text-[#242124] dark:text-white">{account.rccm || 'RCCM en cours'}</span>
                                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{account.commune || account.city}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col">
                                <span className="font-550 text-[#242124] dark:text-white">{account.contact_name || 'Direction'}</span>
                                <span className="text-[10px] text-[#4F6CE8] font-semibold">{account.contact_phone || 'Non renseigné'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                                {account.current_operator || 'Opérateur inconnu'}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-[#4F6CE8]/10 text-[#4F6CE8] font-semibold text-[10px]">
                                {account.recommended_solution || 'Pack Fibre SOHO'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => setSelectedAccountForDetail(account)}
                                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#4F6CE8] transition-colors cursor-pointer"
                              >
                                <Icons.ExternalLink size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 6: DIRECTIVES */}
            {activeView === 'directives' && (
              <div className="flex flex-col gap-4">
                {/* Directives Sub-Navigation */}
                <div className="flex items-center justify-between bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3 rounded-3xl border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDirectiveTab('received')}
                      className={`px-3.5 py-1.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                        directiveTab === 'received'
                          ? 'bg-[#4F6CE8] text-white shadow-sm'
                          : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                      }`}
                    >
                      Directives Reçues du Super Admin ({(Array.isArray(directives) ? directives : []).filter((d) => d.target_entity === 'BACK_OFFICE').length})
                    </button>
                    <button
                      onClick={() => setDirectiveTab('sent')}
                      className={`px-3.5 py-1.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                        directiveTab === 'sent'
                          ? 'bg-[#4F6CE8] text-white shadow-sm'
                          : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                      }`}
                    >
                      Émettre une Directive aux Commerciaux
                    </button>
                  </div>
                </div>

                {/* Sub-Tab 1: Directives Received from Super Admin */}
                {directiveTab === 'received' && (
                  <div className="flex flex-col gap-3">
                    {/* Sticky Filter Bar */}
                    <div className="sticky top-0 z-20 backdrop-blur-2xl bg-white/85 dark:bg-[#1E1C1E]/85 p-3 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 flex-wrap shadow-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-550 uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA] mr-1">
                          Statut :
                        </span>
                        {[
                          { id: 'ALL', label: 'Toutes' },
                          { id: 'SENT', label: 'Nouvelles' },
                          { id: 'IN_PROGRESS', label: 'En cours' },
                          { id: 'COMPLETED', label: 'Traitées' },
                        ].map((f) => (
                          <button
                            key={f.id}
                            onClick={() => setDirectiveFilterStatus(f.id as any)}
                            className={`px-3 py-1 rounded-xl text-xs font-550 transition-all cursor-pointer ${
                              directiveFilterStatus === f.id
                                ? 'bg-[#4F6CE8] text-white shadow-xs'
                                : 'bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}

                        <span className="text-[10px] font-550 uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA] ml-2 mr-1">
                          Priorité :
                        </span>
                        {[
                          { id: 'ALL', label: 'Toutes' },
                          { id: 'CRITICAL', label: 'Critique' },
                          { id: 'HIGH', label: 'Haute' },
                          { id: 'NORMAL', label: 'Normale' },
                        ].map((f) => (
                          <button
                            key={f.id}
                            onClick={() => setDirectiveFilterPriority(f.id as any)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-550 transition-all cursor-pointer ${
                              directiveFilterPriority === f.id
                                ? 'bg-[#4F6CE8] text-white shadow-xs'
                                : 'bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      <span className="text-xs font-550 text-[#4F6CE8] bg-[#4F6CE8]/10 px-2.5 py-1 rounded-xl">
                        {filteredDirectives.length} directive(s)
                      </span>
                    </div>

                    {loadingDirectives ? (
                      <div className="py-12 flex justify-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5">
                        <div className="w-6 h-6 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
                      </div>
                    ) : filteredDirectives.length === 0 ? (
                      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA] border border-black/5 dark:border-white/5">
                        Aucune directive ne correspond aux critères sélectionnés.
                      </div>
                    ) : (
                      filteredDirectives.map((directive) => {
                        const isCompleted = directive.status === 'COMPLETED';
                        const isInProgress = directive.status === 'IN_PROGRESS';

                        return (
                          <div
                            key={directive.id}
                            className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/5 dark:border-white/5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#4F6CE8]/10 text-[#4F6CE8] flex items-center justify-center font-extrabold text-xs overflow-hidden shrink-0">
                                  <img
                                    src={`/memojis/${(directive.sender_avatar || 'memoji_056.png').replace('assets/memojis/', '')}`}
                                    alt="Admin"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-xs text-[#242124] dark:text-white">
                                    Émis par {directive.sender_name || 'Super Admin'}
                                  </span>
                                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                                    {new Date(directive.created_at).toLocaleDateString()} à {new Date(directive.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                  directive.priority === 'CRITICAL'
                                    ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                                    : directive.priority === 'HIGH'
                                    ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                                    : 'bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300'
                                }`}>
                                  Priorité {directive.priority}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                  isCompleted
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : isInProgress
                                    ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                                    : 'bg-[#4F6CE8]/15 text-[#4F6CE8]'
                                }`}>
                                  {isCompleted ? "Traitée" : isInProgress ? "En cours" : "Nouvelle"}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <h4 className="font-extrabold text-sm text-[#242124] dark:text-white">{directive.title}</h4>
                              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                                {directive.instruction}
                              </p>
                              {directive.target_account_name && (
                                <span className="text-[11px] text-[#4F6CE8] font-550 mt-1">
                                  Compte cible : {directive.target_account_name}
                                </span>
                              )}
                            </div>

                            {directive.acknowledgement_note && (
                              <div className="p-3 rounded-2xl bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 text-xs text-zinc-700 dark:text-zinc-300 mt-1">
                                <span className="font-semibold text-[#4F6CE8] block mb-1">Votre réponse / compte-rendu :</span>
                                {directive.acknowledgement_note}
                              </div>
                            )}

                            <div className="pt-2 flex justify-end">
                              <button
                                onClick={() => {
                                  setSelectedDirectiveToAck(directive);
                                  setAckNote(directive.acknowledgement_note || '');
                                  setAckStatus(directive.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS');
                                  setIsDirectiveModalOpen(true);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                              >
                                <Icons.MessageSquare size={13} />
                                <span>{isCompleted ? "Mettre à jour la note" : "Prendre en compte / Répondre"}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Sub-Tab 2: Send Directive Form */}
                {directiveTab === 'sent' && (
                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-4 max-w-2xl">
                    <h3 className="text-base font-extrabold text-[#242124] dark:text-white">
                      Émettre une Directive Opérationnelle à un Commercial Terrain
                    </h3>

                    {directiveSuccessMsg && (
                      <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                        <Icons.CheckCircle size={15} />
                        <span>{directiveSuccessMsg}</span>
                      </div>
                    )}

                    {directiveErrorMsg && (
                      <div className="p-3 rounded-2xl bg-red-500/15 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                        <Icons.AlertCircle size={15} />
                        <span>{directiveErrorMsg}</span>
                      </div>
                    )}

                    <form onSubmit={handleSendDirective} className="flex flex-col gap-4">
                      <div>
                        <label className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">
                          Commercial Destinataire *
                        </label>
                        <select
                          required
                          value={newDirectiveForm.recipient_id}
                          onChange={(e) => setNewDirectiveForm({ ...newDirectiveForm, recipient_id: e.target.value })}
                          className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3.5 py-2 text-xs font-550 text-[#242124] dark:text-white outline-none cursor-pointer"
                        >
                          <option value="">Sélectionner un commercial terrain...</option>
                          {salespersons.map((sp) => (
                            <option key={sp.id} value={sp.id}>
                              {sp.full_name} (@{sp.username})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">
                          Objet / Titre de la directive *
                        </label>
                        <input
                          required
                          type="text"
                          value={newDirectiveForm.title}
                          onChange={(e) => setNewDirectiveForm({ ...newDirectiveForm, title: e.target.value })}
                          placeholder="Ex: Priorité prospection Cybercafés Plaque Gombe..."
                          className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3.5 py-2 text-xs text-[#242124] dark:text-white outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">
                            Compte cible (optionnel)
                          </label>
                          <input
                            type="text"
                            value={newDirectiveForm.target_account_name}
                            onChange={(e) => setNewDirectiveForm({ ...newDirectiveForm, target_account_name: e.target.value })}
                            placeholder="Nom du client..."
                            className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3.5 py-2 text-xs text-[#242124] dark:text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">
                            Niveau de priorité *
                          </label>
                          <select
                            value={newDirectiveForm.priority}
                            onChange={(e) => setNewDirectiveForm({ ...newDirectiveForm, priority: e.target.value as any })}
                            className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3.5 py-2 text-xs font-550 text-[#242124] dark:text-white outline-none cursor-pointer"
                          >
                            <option value="NORMAL">Normale</option>
                            <option value="HIGH">Haute</option>
                            <option value="CRITICAL">Critique / Immédiate</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">
                          Instructions détaillées *
                        </label>
                        <textarea
                          required
                          rows={4}
                          value={newDirectiveForm.instruction}
                          onChange={(e) => setNewDirectiveForm({ ...newDirectiveForm, instruction: e.target.value })}
                          placeholder="Détaillez les actions attendues du commercial sur le terrain..."
                          className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl p-3 text-xs text-[#242124] dark:text-white outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={sendingDirective}
                        className="py-2.5 px-4 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold cursor-pointer transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Icons.Send size={14} className={sendingDirective ? "animate-spin" : ""} />
                        <span>{sendingDirective ? "Transmission en cours..." : "Transmettre la Directive"}</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 7: SETTINGS & FAQ */}
            {activeView === 'settings' && (
              <div className="flex flex-col gap-6 pb-8">
                {/* Header Banner */}
                <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-extrabold text-[#242124] dark:text-white">
                      Paramètres du Profil & Base de Connaissances
                    </h3>
                    <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                      Personnalisez votre avatar Memoji Apple 3D, consultez les règles métier terrain et gérez votre session.
                    </p>
                  </div>
                  {avatarSuccessMsg && (
                    <div className="px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-semibold flex items-center gap-2 shrink-0">
                      <Icons.CheckCircle size={15} />
                      <span>{avatarSuccessMsg}</span>
                    </div>
                  )}
                  {avatarErrorMsg && (
                    <div className="px-4 py-2 bg-red-500/10 text-red-500 rounded-2xl text-xs font-semibold flex items-center gap-2 shrink-0">
                      <Icons.AlertCircle size={15} />
                      <span>{avatarErrorMsg}</span>
                    </div>
                  )}
                </div>

                {/* 1. Profile Card & Memoji Selector */}
                <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-3xl bg-black/5 dark:bg-white/5 border-2 border-[#4F6CE8] flex items-center justify-center overflow-hidden shadow-lg shrink-0">
                        <img
                          src={`/memojis/${(user?.avatar || 'memoji_056.png').replace('assets/memojis/', '')}`}
                          alt="Memoji Actif"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-[#242124] dark:text-white">
                            {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || 'Superviseur Onbora'}
                          </h3>
                          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#4F6CE8]/15 text-[#4F6CE8]">
                            Superviseur Back-Office Terrain
                          </span>
                        </div>
                        <span className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] block mt-0.5">
                          Identifiant : @{user?.username} • {user?.email || 'superviseur@onbora.cd'}
                        </span>
                        <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block mt-0.5 font-medium">
                          Memoji actuel : <span className="font-mono font-semibold text-[#242124] dark:text-white">{(user?.avatar || 'memoji_056.png').replace('assets/memojis/', '')}</span>
                        </span>
                      </div>
                    </div>

                    {/* Filtres de Genre pour Memojis */}
                    <div className="flex items-center gap-1.5 bg-white dark:bg-[#242124] p-1.5 rounded-2xl self-start sm:self-auto shrink-0 border border-black/5 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => setMemojiGenderFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          memojiGenderFilter === 'all'
                            ? 'bg-[#4F6CE8] text-white shadow-sm'
                            : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                        }`}
                      >
                        Tous ({memojisCatalog.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemojiGenderFilter('homme')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          memojiGenderFilter === 'homme'
                            ? 'bg-[#4F6CE8] text-white shadow-sm'
                            : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                        }`}
                      >
                        Hommes ({memojisCatalog.filter((m) => m.gender === 'homme').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemojiGenderFilter('femme')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          memojiGenderFilter === 'femme'
                            ? 'bg-[#4F6CE8] text-white shadow-sm'
                            : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                        }`}
                      >
                        Femmes ({memojisCatalog.filter((m) => m.gender === 'femme').length})
                      </button>
                    </div>
                  </div>

                  {/* Galerie de sélection des Memojis 3D */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#242124] dark:text-white">
                        Galerie des Avatars Memoji 3D
                      </span>
                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                        Cliquez sur un avatar pour le synchroniser immédiatement avec votre compte superviseur
                      </span>
                    </div>

                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3 max-h-72 overflow-y-auto p-3 bg-white dark:bg-[#242124] rounded-2xl border border-black/5 dark:border-white/5">
                      {memojisCatalog
                        .filter((m) => memojiGenderFilter === 'all' || m.gender === memojiGenderFilter)
                        .map((memoji) => {
                          const isSelected = (user?.avatar || 'memoji_056.png').replace('assets/memojis/', '') === memoji.filename;
                          return (
                            <button
                              key={memoji.id}
                              type="button"
                              disabled={savingAvatar}
                              onClick={() => handleSelectAvatar(memoji.filename)}
                              title={`${memoji.filename} (${memoji.gender || 'avatar'})`}
                              className={`relative aspect-square rounded-2xl p-1 transition-all cursor-pointer flex items-center justify-center ${
                                isSelected
                                  ? 'bg-[#4F6CE8]/10 dark:bg-[#4F6CE8]/20 ring-2 ring-[#4F6CE8] shadow-md scale-105'
                                  : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 hover:scale-105 border border-black/5 dark:border-white/5'
                              }`}
                            >
                              <img
                                src={`/memojis/${memoji.filename}`}
                                alt={`Memoji ${memoji.id}`}
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                              {isSelected && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#4F6CE8] text-white rounded-full flex items-center justify-center shadow-xs">
                                  <Icons.Check size={10} />
                                </span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* 2. FAQ INTERACTIVE SUPERVISEUR */}
                <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                    <div>
                      <h3 className="text-base font-extrabold text-[#242124] dark:text-white">
                        Foire Aux Questions (FAQ) & Règles Métier
                      </h3>
                      <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                        Toutes les explications opérationnelles pour la gestion des plaques, l'auto-dispatch et le suivi terrain.
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold px-3 py-1 bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA] rounded-full">
                      6 Sujets Clés
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {[
                      {
                        q: "1. Comment fonctionne l'Auto-Dispatch IA et la prévention des collisions de portefeuille ?",
                        a: (
                          <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                            <p>
                              L'algorithme d'Auto-Dispatch IA d'Onbora analyse en continu la proximité géographique des comptes SOHO au sein de chaque plaque. Il évalue la charge de travail actuelle des commerciaux affectés (nombre de comptes déjà assignés et visites planifiées) et distribue les entreprises équitablement.
                            </p>
                            <p>
                              Un mécanisme strict anti-collision garantit qu'un compte SOHO ne peut jamais être attribué à deux commerciaux simultanément.
                            </p>
                          </div>
                        ),
                      },
                      {
                        q: "2. Comment délimiter une plaque géographique au crayon sur la carte ?",
                        a: (
                          <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                            <p>
                              Rendez-vous dans l'onglet <strong className="text-[#242124] dark:text-white">Carte Territoire</strong>. En haut à droite de la carte, cliquez sur l'outil Crayon pour activer le mode dessin.
                            </p>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>Cliquez sur la carte pour poser chaque sommet de votre polygone.</li>
                              <li>Vous pouvez annuler le dernier point à tout moment avec le bouton Annuler.</li>
                              <li>Une fois la zone délimitée (au moins 3 sommets), cliquez sur "Valider & Créer la Plaque", donnez-lui un code (ex: PLQ-GOMBE-02) et enregistrez. Le fichier KML est généré automatiquement.</li>
                            </ul>
                          </div>
                        ),
                      },
                      {
                        q: "3. Quelle est la différence entre affecter un commercial à une plaque et dispatcher des comptes ?",
                        a: (
                          <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                            <p>
                              <strong className="text-[#242124] dark:text-white">Affecter un commercial à une plaque :</strong> Définit le groupe de commerciaux autorisés et prioritaires sur cette zone géographique. Vous pouvez le faire directement depuis la page des plaques ou depuis la carte.
                            </p>
                            <p>
                              <strong className="text-[#242124] dark:text-white">Dispatcher les comptes :</strong> Distribue individuellement chaque entreprise SOHO de la plaque à un commercial précis. Le commercial voit alors ces comptes apparaître instantanément dans sa liste de prospection sur son mobile.
                            </p>
                          </div>
                        ),
                      },
                      {
                        q: "4. Comment fonctionne le calcul des points de motivation et le podium des commerciaux ?",
                        a: (
                          <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                            <p>
                              Chaque action terrain d'un commercial rapporte des points d'incentive automatiquement calculés :
                            </p>
                            <ul className="list-disc pl-5 space-y-1">
                              <li><strong className="text-[#242124] dark:text-white">100 points :</strong> Pour chaque contrat client converti et signé.</li>
                              <li><strong className="text-[#242124] dark:text-white">20 points :</strong> Pour chaque formulaire d'audit ou de qualification terrain validé.</li>
                              <li><strong className="text-[#242124] dark:text-white">10 points :</strong> Pour chaque visite physique effectuée et confirmée par géolocalisation.</li>
                            </ul>
                            <p>
                              Le podium discret met en avant le Top 3 des commerciaux les plus performants en haut de la liste des commerciaux terrain.
                            </p>
                          </div>
                        ),
                      },
                      {
                        q: "5. Comment émettre une directive prioritaire vers un commercial de terrain ?",
                        a: (
                          <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                            <p>
                              Depuis l'onglet <strong className="text-[#242124] dark:text-white">Directives & Messages</strong>, passez sur le sous-onglet "Émettre une Directive". Sélectionnez le commercial destinataire, indiquez l'objet, le niveau d'urgence (Normale, Haute, Critique) et vos instructions.
                            </p>
                            <p>
                              Le commercial reçoit une notification push instantanée sur son application mobile et doit obligatoirement rédiger une note d'acquittement pour clôturer la directive.
                            </p>
                          </div>
                        ),
                      },
                      {
                        q: "6. Que faire lorsqu'une entreprise SOHO n'est pas encore géolocalisée sur la carte ?",
                        a: (
                          <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                            <p>
                              Les entreprises qui n'ont pas encore de coordonnées GPS précises restent parfaitement accessibles dans l'onglet <strong className="text-[#242124] dark:text-white">Annuaire SOHO</strong> et dans le dispatch manuel de leur plaque.
                            </p>
                            <p>
                              Dès qu'un commercial effectue sa première visite physique sur place, l'application mobile capture les coordonnées GPS réelles et les enregistre automatiquement dans la base Onbora.
                            </p>
                          </div>
                        ),
                      },
                    ].map((item, index) => {
                      const isOpen = faqOpenIndex === index;
                      return (
                        <div
                          key={index}
                          className="rounded-2xl bg-white dark:bg-[#242124] border border-black/5 dark:border-white/5 overflow-hidden transition-all"
                        >
                          <button
                            type="button"
                            onClick={() => setFaqOpenIndex(isOpen ? null : index)}
                            className="w-full p-4 text-left flex items-center justify-between gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                          >
                            <span className="text-xs font-extrabold text-[#242124] dark:text-white">
                              {item.q}
                            </span>
                            <span className={`p-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                              <Icons.ChevronRight size={14} />
                            </span>
                          </button>
                          {isOpen && (
                            <div className="p-4 pt-1 border-t border-black/5 dark:border-white/5">
                              {item.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. DANGER ZONE : DÉCONNEXION À VOTRE COMPTE */}
                <div className="bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-extrabold text-red-600 dark:text-red-400">
                      Déconnexion à votre compte
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Fermer votre session en toute sécurité et retourner à l'écran d'authentification Onbora.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all cursor-pointer inline-flex items-center justify-center gap-2 shadow-sm shrink-0"
                  >
                    <Icons.LogOut size={16} />
                    <span>Déconnexion à votre compte</span>
                  </button>
                </div>
              </div>
            )}

            {/* 7. COPILOTE IA CONVERSATIONNEL DÉDIÉ */}
            {activeView === 'copilot' && (
              <CopilotChatView userRole="SUPERVISOR" />
            )}

          </div>
        </main>

        {/* MODAL: ADD FIELD SALESPERSON */}
        {isAddSalespersonOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 w-full max-w-md border border-black/5 dark:border-white/5 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  <Icons.UserPlus size={18} className="text-[#4F6CE8]" />
                  <h3 className="font-extrabold text-sm text-[#242124] dark:text-white">Nouveau Commercial Terrain</h3>
                </div>
                <button
                  onClick={() => setIsAddSalespersonOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <Icons.X size={16} />
                </button>
              </div>

              {salespersonCreateError && (
                <div className="p-3 rounded-2xl bg-red-500/15 text-red-700 dark:text-red-300 text-xs font-semibold">
                  {salespersonCreateError}
                </div>
              )}

              <form onSubmit={handleCreateSalesperson} className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Prénom *</label>
                    <input
                      required
                      type="text"
                      value={salespersonForm.first_name}
                      onChange={(e) => setSalespersonForm({ ...salespersonForm, first_name: e.target.value })}
                      placeholder="Jean"
                      className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Nom *</label>
                    <input
                      required
                      type="text"
                      value={salespersonForm.last_name}
                      onChange={(e) => setSalespersonForm({ ...salespersonForm, last_name: e.target.value })}
                      placeholder="Mukendi"
                      className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Identifiant (username) *</label>
                  <input
                    required
                    type="text"
                    value={salespersonForm.username}
                    onChange={(e) => setSalespersonForm({ ...salespersonForm, username: e.target.value })}
                    placeholder="jean.mukendi"
                    className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Email *</label>
                  <input
                    required
                    type="email"
                    value={salespersonForm.email}
                    onChange={(e) => setSalespersonForm({ ...salespersonForm, email: e.target.value })}
                    placeholder="jean@orange.cd"
                    className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Téléphone</label>
                    <input
                      type="text"
                      value={salespersonForm.phone}
                      onChange={(e) => setSalespersonForm({ ...salespersonForm, phone: e.target.value })}
                      placeholder="+243..."
                      className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Mot de passe *</label>
                    <input
                      required
                      type="password"
                      value={salespersonForm.password}
                      onChange={(e) => setSalespersonForm({ ...salespersonForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddSalespersonOpen(false)}
                    className="px-4 py-2 rounded-2xl bg-black/5 dark:bg-white/5 text-xs font-semibold text-[#242124] dark:text-white cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creatingSalesperson}
                    className="px-4 py-2 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                  >
                    {creatingSalesperson ? "Création..." : "Enregistrer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD PLAQUE */}
        {isAddPlaqueOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 w-full max-w-md border border-black/5 dark:border-white/5 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  <Icons.Layers size={18} className="text-[#4F6CE8]" />
                  <h3 className="font-extrabold text-sm text-[#242124] dark:text-white">Créer une Plaque Cartographique</h3>
                </div>
                <button
                  onClick={() => setIsAddPlaqueOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <Icons.X size={16} />
                </button>
              </div>

              {plaqueCreateError && (
                <div className="p-3 rounded-2xl bg-red-500/15 text-red-700 dark:text-red-300 text-xs font-semibold">
                  {plaqueCreateError}
                </div>
              )}

              <form onSubmit={handleCreatePlaque} className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Code Plaque *</label>
                    <input
                      required
                      type="text"
                      value={plaqueForm.code}
                      onChange={(e) => setPlaqueForm({ ...plaqueForm, code: e.target.value })}
                      placeholder="Ex: PLQ-GOMBE-01"
                      className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Ville *</label>
                    <input
                      required
                      type="text"
                      value={plaqueForm.city}
                      onChange={(e) => setPlaqueForm({ ...plaqueForm, city: e.target.value })}
                      placeholder="Kinshasa"
                      className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Nom du Secteur *</label>
                  <input
                    required
                    type="text"
                    value={plaqueForm.name}
                    onChange={(e) => setPlaqueForm({ ...plaqueForm, name: e.target.value })}
                    placeholder="Ex: Zone Commerciale Huileries"
                    className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3 py-2 text-xs text-[#242124] dark:text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={plaqueForm.latitude}
                      onChange={(e) => setPlaqueForm({ ...plaqueForm, latitude: parseFloat(e.target.value) })}
                      className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-2 py-2 text-xs text-[#242124] dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={plaqueForm.longitude}
                      onChange={(e) => setPlaqueForm({ ...plaqueForm, longitude: parseFloat(e.target.value) })}
                      className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-2 py-2 text-xs text-[#242124] dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">Rayon (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={plaqueForm.radius_km}
                      onChange={(e) => setPlaqueForm({ ...plaqueForm, radius_km: parseFloat(e.target.value) })}
                      className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-2 py-2 text-xs text-[#242124] dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddPlaqueOpen(false)}
                    className="px-4 py-2 rounded-2xl bg-black/5 dark:bg-white/5 text-xs font-semibold text-[#242124] dark:text-white cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creatingPlaque}
                    className="px-4 py-2 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                  >
                    {creatingPlaque ? "Création..." : "Enregistrer la Plaque"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: DIRECTIVE ACKNOWLEDGEMENT */}
        {isDirectiveModalOpen && selectedDirectiveToAck && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 w-full max-w-lg border border-black/5 dark:border-white/5 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  <Icons.MessageSquare size={18} className="text-[#4F6CE8]" />
                  <h3 className="font-extrabold text-sm text-[#242124] dark:text-white">Traiter la Directive Admin</h3>
                </div>
                <button
                  onClick={() => setIsDirectiveModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <Icons.X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5">
                <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Directive reçue :</span>
                <span className="font-extrabold text-xs text-[#242124] dark:text-white">{selectedDirectiveToAck.title}</span>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">{selectedDirectiveToAck.instruction}</p>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">
                    Nouveau statut de la directive
                  </label>
                  <select
                    value={ackStatus}
                    onChange={(e) => setAckStatus(e.target.value as any)}
                    className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl px-3.5 py-2 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
                  >
                    <option value="IN_PROGRESS">En cours d'exécution terrain</option>
                    <option value="COMPLETED">Traitée & Clôturée</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA] block mb-1">
                    Compte-rendu / Note de prise en compte
                  </label>
                  <textarea
                    rows={4}
                    value={ackNote}
                    onChange={(e) => setAckNote(e.target.value)}
                    placeholder="Indiquez les actions prises, le retour du commercial ou les résultats constatés..."
                    className="w-full bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-2xl p-3 text-xs text-[#242124] dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDirectiveModalOpen(false)}
                  className="px-4 py-2 rounded-2xl bg-black/5 dark:bg-white/5 text-xs font-semibold text-[#242124] dark:text-white cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={handleSaveAcknowledgement}
                  disabled={savingAck}
                  className="px-4 py-2 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                >
                  {savingAck ? "Enregistrement..." : "Enregistrer la Réponse"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ACCOUNT DETAIL */}
        {selectedAccountForDetail && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 w-full max-w-lg border border-black/5 dark:border-white/5 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                <div>
                  <h3 className="font-extrabold text-sm text-[#242124] dark:text-white">{selectedAccountForDetail.name}</h3>
                  <span className="font-mono text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{selectedAccountForDetail.crm_id}</span>
                </div>
                <button
                  onClick={() => setSelectedAccountForDetail(null)}
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <Icons.X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Secteur & Ville</span>
                  <span className="font-semibold text-[#242124] dark:text-white">{selectedAccountForDetail.sector || 'SOHO'} • {selectedAccountForDetail.city}</span>
                </div>
                <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">RCCM</span>
                  <span className="font-mono font-semibold text-[#242124] dark:text-white">{selectedAccountForDetail.rccm || 'Non renseigné'}</span>
                </div>
                <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Contact Principal</span>
                  <span className="font-semibold text-[#242124] dark:text-white">{selectedAccountForDetail.contact_name || 'Direction'}</span>
                  <span className="text-[10px] text-[#4F6CE8]">{selectedAccountForDetail.contact_phone || 'Aucun numéro'}</span>
                </div>
                <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Commercial Affecté</span>
                  <span className="font-semibold text-[#242124] dark:text-white">
                    {selectedAccountForDetail.assigned_salesperson_name || 'Non affecté'}
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-1 text-xs">
                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Solution Proposée & Concurrence</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-semibold text-[#4F6CE8]">{selectedAccountForDetail.recommended_solution || 'Pack Fibre SOHO'}</span>
                  <span className="text-[10px] text-zinc-500 font-medium">Actuel : {selectedAccountForDetail.current_operator || 'Inconnu'}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedAccountForDetail(null)}
                  className="px-4 py-2 rounded-2xl bg-[#4F6CE8] text-white text-xs font-semibold cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: DIRECT SALESPERSON ASSIGNMENT TO PLAQUE */}
        {selectedPlaqueForAssign && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 w-full max-w-lg border border-black/5 dark:border-white/5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#4F6CE8]/10 text-[#4F6CE8] flex items-center justify-center">
                    <Icons.UserPlus size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#242124] dark:text-white">
                      Affecter des Commerciaux à la Plaque {selectedPlaqueForAssign.code}
                    </h3>
                    <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
                      {selectedPlaqueForAssign.name} ({selectedPlaqueForAssign.city})
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlaqueForAssign(null)}
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <Icons.X size={16} />
                </button>
              </div>

              {plaqueAssignSuccessMsg && (
                <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 shrink-0">
                  <Icons.CheckCircle size={15} />
                  <span>{plaqueAssignSuccessMsg}</span>
                </div>
              )}

              {plaqueAssignErrorMsg && (
                <div className="p-3 rounded-2xl bg-red-500/15 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2 shrink-0">
                  <Icons.AlertCircle size={15} />
                  <span>{plaqueAssignErrorMsg}</span>
                </div>
              )}

              <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] shrink-0">
                Cochez les commerciaux autorisés et prioritaires pour prospecter ce secteur territorial :
              </p>

              {/* Salespersons Checklist */}
              <div className="flex-1 overflow-y-auto divide-y divide-black/5 dark:divide-white/5 rounded-2xl border border-black/5 dark:border-white/5 bg-white dark:bg-[#363336] p-1">
                {salespersons.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                    Aucun commercial terrain disponible.
                  </div>
                ) : (
                  salespersons.map((sp) => {
                    const isChecked = assignedSalespersonIds.includes(sp.id);
                    return (
                      <label
                        key={sp.id}
                        className="flex items-center justify-between p-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#4F6CE8]/15 overflow-hidden flex items-center justify-center shrink-0">
                            <img
                              src={`/memojis/${(sp.avatar || 'memoji_056.png').replace('assets/memojis/', '')}`}
                              alt={sp.full_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-[#242124] dark:text-white">
                              {sp.full_name}
                            </span>
                            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                              @{sp.username} • {sp.location || 'Kinshasa'} • {sp.visits_count || 0} visites
                            </span>
                          </div>
                        </div>

                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSalespersonInPlaque(sp.id)}
                          className="w-4 h-4 rounded text-[#4F6CE8] focus:ring-[#4F6CE8] border-zinc-300 dark:border-zinc-600 cursor-pointer"
                        />
                      </label>
                    );
                  })
                )}
              </div>

              <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
                <span className="text-[11px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
                  {assignedSalespersonIds.length} commercial(aux) sélectionné(s)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPlaqueForAssign(null)}
                    className="px-4 py-2 rounded-2xl bg-black/5 dark:bg-white/5 text-xs font-semibold text-[#242124] dark:text-white cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePlaqueAssignment}
                    disabled={savingPlaqueAssign}
                    className="px-4 py-2 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold cursor-pointer transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Icons.Check size={14} className={savingPlaqueAssign ? "animate-spin" : ""} />
                    <span>{savingPlaqueAssign ? "Enregistrement..." : "Valider l'Affectation"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
