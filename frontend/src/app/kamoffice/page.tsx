"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/lib/api';
import Logo from '@/components/shared/Logo';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { Icons } from '@/components/shared/Icons';
import CopilotChatView from '@/components/shared/CopilotChatView';
import KamLeadScoringView from '@/components/kam/KamLeadScoringView';
import KamChurnRadarView from '@/components/kam/KamChurnRadarView';

export type KamOfficeView =
  | 'overview'
  | 'leadscoring'
  | 'churnradar'
  | 'kams'
  | 'grands_comptes'
  | 'pme'
  | 'directives'
  | 'copilot'
  | 'settings';

interface KamOfficeMetrics {
  total_accounts: number;
  grands_comptes_count: number;
  pme_count: number;
  assigned_count: number;
  unassigned_count: number;
  unassigned_grands_comptes: number;
  unassigned_pme: number;
  assignment_rate_percent: number;
  total_annual_revenue_usd: number;
  total_converted_count: number;
  total_signed_amount_usd: number;
  total_kams_count: number;
  gc_specialist_kams: number;
  pme_specialist_kams: number;
}

interface KamUser {
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
  kam_specialization: 'GRAND_COMPTE' | 'PME';
  kam_specialization_display: string;
  avatar?: string;
  assigned_total_count: number;
  assigned_grands_comptes_count: number;
  assigned_pme_count: number;
  total_portfolio_revenue_usd: number;
  converted_accounts_count: number;
  converted_amount_usd: number;
}

interface KamAccount {
  id: number;
  crm_id: string;
  name: string;
  sector: string;
  city: string;
  commune: string;
  address: string;
  annual_revenue: number;
  employee_count: number;
  site_count: number;
  segment: 'GRAND_COMPTE' | 'PME' | string;
  segment_display: string;
  assigned_entity: string;
  conversion_status: string;
  conversion_status_display: string;
  converted_amount: number;
  current_operator: string;
  current_connectivity: string;
  contact_name: string;
  contact_role: string;
  contact_phone: string;
  contact_email?: string;
  recommended_solution?: string;
  rccm: string;
  assigned_kam: {
    id: number;
    username: string;
    full_name: string;
    email: string;
    phone: string;
    kam_specialization: 'GRAND_COMPTE' | 'PME';
    location: string;
    avatar?: string;
  } | null;
  assigned_at: string | null;
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

export default function KamOfficePage() {
  const { user, logout, loading: authLoading, updateUser } = useAuth();

  // Navigation State
  const [activeView, setActiveView] = useState<KamOfficeView>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Data State
  const [loadingData, setLoadingData] = useState(true);
  const [metrics, setMetrics] = useState<KamOfficeMetrics | null>(null);
  const [kamsList, setKamsList] = useState<KamUser[]>([]);
  const [accountsList, setAccountsList] = useState<KamAccount[]>([]);
  const [directives, setDirectives] = useState<DirectiveItem[]>([]);
  const [loadingDirectives, setLoadingDirectives] = useState(false);

  // Detail Drill-down State for Menu 2 (KAM)
  const [selectedKamDetail, setSelectedKamDetail] = useState<KamUser | null>(null);

  // Filters: Overview View
  const [overviewSegmentFilter, setOverviewSegmentFilter] = useState<'ALL' | 'GRAND_COMPTE' | 'PME'>('ALL');
  const [overviewAssignmentFilter, setOverviewAssignmentFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [overviewKamFilter, setOverviewKamFilter] = useState<string>('ALL');

  // Filters: Grands Comptes View
  const [gcAssignmentFilter, setGcAssignmentFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [gcKamFilter, setGcKamFilter] = useState<string>('ALL');
  const [gcCityFilter, setGcCityFilter] = useState<string>('ALL');

  // Filters: PME View
  const [pmeAssignmentFilter, setPmeAssignmentFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [pmeKamFilter, setPmeKamFilter] = useState<string>('ALL');
  const [pmeCityFilter, setPmeCityFilter] = useState<string>('ALL');

  // Filters: KAMs View
  const [kamSpecializationFilter, setKamSpecializationFilter] = useState<'ALL' | 'GRAND_COMPTE' | 'PME'>('ALL');
  const [kamAvailabilityFilter, setKamAvailabilityFilter] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE'>('ALL');

  // Filters: Directives View
  const [directiveTab, setDirectiveTab] = useState<'received' | 'sent'>('received');
  const [directiveStatusFilter, setDirectiveStatusFilter] = useState<'ALL' | 'SENT' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [directivePriorityFilter, setDirectivePriorityFilter] = useState<'ALL' | 'NORMAL' | 'HIGH' | 'CRITICAL'>('ALL');

  // Notification Banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Assignment Modal
  const [selectedAccountToAssign, setSelectedAccountToAssign] = useState<KamAccount | null>(null);
  const [targetKamIdToAssign, setTargetKamIdToAssign] = useState<number | null>(null);
  const [assigningAccount, setAssigningAccount] = useState(false);

  // Create KAM Modal
  const [isCreateKamModalOpen, setIsCreateKamModalOpen] = useState(false);
  const [newKamForm, setNewKamForm] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    location: 'Kinshasa',
    kam_specialization: 'GRAND_COMPTE' as 'GRAND_COMPTE' | 'PME',
  });
  const [creatingKam, setCreatingKam] = useState(false);
  const [createKamError, setCreateKamError] = useState('');

  // Directives Modal (Create & Acknowledge)
  const [isDirectiveModalOpen, setIsDirectiveModalOpen] = useState(false);
  const [newDirectiveRecipientId, setNewDirectiveRecipientId] = useState<string>('');
  const [newDirectiveTitle, setNewDirectiveTitle] = useState('');
  const [newDirectiveInstruction, setNewDirectiveInstruction] = useState('');
  const [newDirectivePriority, setNewDirectivePriority] = useState<'NORMAL' | 'HIGH' | 'CRITICAL'>('NORMAL');
  const [newDirectiveTargetAccount, setNewDirectiveTargetAccount] = useState('');
  const [creatingDirective, setCreatingDirective] = useState(false);
  const [selectedAccountForDetail, setSelectedAccountForDetail] = useState<KamAccount | null>(null);

  const [selectedDirectiveToAck, setSelectedDirectiveToAck] = useState<DirectiveItem | null>(null);
  const [ackNote, setAckNote] = useState('');
  const [ackStatus, setAckStatus] = useState<'IN_PROGRESS' | 'COMPLETED'>('IN_PROGRESS');
  const [savingAck, setSavingAck] = useState(false);

  // Settings & Memojis
  const [memojisCatalog, setMemojisCatalog] = useState<{ id: number; filename: string; gender?: string }[]>([]);
  const [memojiGenderFilter, setMemojiGenderFilter] = useState<'all' | 'homme' | 'femme'>('all');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarSuccessMsg, setAvatarSuccessMsg] = useState('');
  const [avatarErrorMsg, setAvatarErrorMsg] = useState('');
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

  // Fetch Dashboard Data
  const loadKamOfficeData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [overviewData, kamsData, accountsData] = await Promise.all([
        fetchAPI('/api/kam-office/overview/'),
        fetchAPI('/api/kam-office/kams/'),
        fetchAPI('/api/kam-office/accounts/?limit=600'),
      ]);

      if (overviewData && overviewData.metrics) {
        setMetrics(overviewData.metrics);
      }
      if (kamsData && kamsData.kams) {
        setKamsList(kamsData.kams);
      }
      if (accountsData && accountsData.accounts) {
        setAccountsList(accountsData.accounts);
      }
    } catch (err) {
      console.error("Erreur de chargement des données KAM Office:", err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Fetch Directives
  const loadDirectives = useCallback(async () => {
    setLoadingDirectives(true);
    try {
      const data = await fetchAPI('/api/sales/directives/?target_entity=KAM_OFFICE');
      if (data && Array.isArray(data.directives)) {
        setDirectives(data.directives);
      }
    } catch (err) {
      console.error("Erreur de chargement des directives:", err);
    } finally {
      setLoadingDirectives(false);
    }
  }, []);

  useEffect(() => {
    loadKamOfficeData();
    loadDirectives();
  }, [loadKamOfficeData, loadDirectives]);

  // Load Memojis for settings
  useEffect(() => {
    fetch('/memojis/memojis_catalog.json')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setMemojisCatalog(data);
        } else {
          const fallback = Array.from({ length: 64 }, (_, i) => {
            const num = String(i + 1).padStart(3, '0');
            return {
              id: i + 1,
              filename: `memoji_${num}.png`,
              gender: i % 2 === 0 ? 'homme' : 'femme',
            };
          });
          setMemojisCatalog(fallback);
        }
      })
      .catch(() => {
        const fallback = Array.from({ length: 64 }, (_, i) => {
          const num = String(i + 1).padStart(3, '0');
          return {
            id: i + 1,
            filename: `memoji_${num}.png`,
            gender: i % 2 === 0 ? 'homme' : 'femme',
          };
        });
        setMemojisCatalog(fallback);
      });
  }, []);

  // Save Avatar
  const handleSelectAvatar = async (filename: string) => {
    setSavingAvatar(true);
    setAvatarErrorMsg('');
    try {
      await fetchAPI('/api/accounts/me/', {
        method: 'PATCH',
        body: JSON.stringify({ avatar: filename }),
      });
      if (updateUser) {
        updateUser({ avatar: filename });
      }
      setAvatarSuccessMsg("Avatar Memoji synchronisé avec succès sur votre profil !");
      setTimeout(() => setAvatarSuccessMsg(''), 3500);
    } catch (err: any) {
      setAvatarErrorMsg(err.message || "Erreur lors de la mise à jour de l'avatar.");
    } finally {
      setSavingAvatar(false);
    }
  };

  // Assignment Handlers
  const handleOpenAssignModal = (acc: KamAccount) => {
    setSelectedAccountToAssign(acc);
    setTargetKamIdToAssign(acc.assigned_kam ? acc.assigned_kam.id : null);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedAccountToAssign) return;
    setAssigningAccount(true);

    try {
      const res = await fetchAPI('/api/kam-office/assign/', {
        method: 'POST',
        body: JSON.stringify({
          enterprise_id: selectedAccountToAssign.id,
          kam_id: targetKamIdToAssign,
        }),
      });

      setNotification({
        type: 'success',
        message: res.message || "Affectation enregistrée avec succès.",
      });
      setTimeout(() => setNotification(null), 4500);

      setSelectedAccountToAssign(null);
      await loadKamOfficeData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || "Erreur lors de l'affectation du compte.",
      });
      setTimeout(() => setNotification(null), 4500);
    } finally {
      setAssigningAccount(false);
    }
  };

  // Direct Unassign Handler
  const handleUnassignAccount = async (enterpriseId: number) => {
    try {
      const res = await fetchAPI('/api/kam-office/assign/', {
        method: 'POST',
        body: JSON.stringify({
          enterprise_id: enterpriseId,
          kam_id: null,
        }),
      });

      setNotification({
        type: 'success',
        message: res.message || "Compte remis dans le vivier non affecté.",
      });
      setTimeout(() => setNotification(null), 4000);
      await loadKamOfficeData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || "Erreur lors de la désaffectation.",
      });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Create KAM Handler
  const handleCreateKamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKamForm.username || !newKamForm.password || !newKamForm.first_name || !newKamForm.last_name) {
      setCreateKamError("Veuillez renseigner tous les champs obligatoires.");
      return;
    }

    setCreatingKam(true);
    setCreateKamError('');

    try {
      await fetchAPI('/api/kam-office/kams/', {
        method: 'POST',
        body: JSON.stringify(newKamForm),
      });

      setIsCreateKamModalOpen(false);
      setNewKamForm({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        location: 'Kinshasa',
        kam_specialization: 'GRAND_COMPTE',
      });
      setNotification({
        type: 'success',
        message: "Nouveau Key Account Manager créé avec succès.",
      });
      setTimeout(() => setNotification(null), 4000);
      await loadKamOfficeData();
    } catch (err: any) {
      setCreateKamError(err.message || "Erreur lors de la création du compte KAM.");
    } finally {
      setCreatingKam(false);
    }
  };

  // Create Directive Handler
  const handleCreateDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDirectiveRecipientId || !newDirectiveTitle.trim() || !newDirectiveInstruction.trim()) return;

    setCreatingDirective(true);
    try {
      await fetchAPI('/api/sales/directives/', {
        method: 'POST',
        body: JSON.stringify({
          recipient_id: Number(newDirectiveRecipientId),
          title: newDirectiveTitle.trim(),
          instruction: newDirectiveInstruction.trim(),
          priority: newDirectivePriority,
          target_account_name: newDirectiveTargetAccount.trim(),
          target_entity: 'KAM_OFFICE',
        }),
      });

      setIsDirectiveModalOpen(false);
      setNewDirectiveRecipientId('');
      setNewDirectiveTitle('');
      setNewDirectiveInstruction('');
      setNewDirectiveTargetAccount('');
      setNewDirectivePriority('NORMAL');

      setNotification({
        type: 'success',
        message: "Directive transmise au Key Account Manager avec succès.",
      });
      setTimeout(() => setNotification(null), 4000);
      await loadDirectives();
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: 'error',
        message: err.message || "Erreur lors de l'émission de la directive.",
      });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setCreatingDirective(false);
    }
  };

  // Acknowledge Directive Handler
  const handleSaveAck = async () => {
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

      setSelectedDirectiveToAck(null);
      setAckNote('');
      setNotification({
        type: 'success',
        message: "Statut de la directive mis à jour avec succès.",
      });
      setTimeout(() => setNotification(null), 4000);
      await loadDirectives();
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: 'error',
        message: err.message || "Erreur lors de la mise à jour.",
      });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setSavingAck(false);
    }
  };

  // Toggle KAM Specialization or Availability
  const handleUpdateKam = async (kamId: number, fields: Partial<KamUser>) => {
    try {
      await fetchAPI(`/api/kam-office/kams/${kamId}/`, {
        method: 'PATCH',
        body: JSON.stringify(fields),
      });
      setKamsList((prev) => prev.map((k) => (k.id === kamId ? { ...k, ...fields } : k)));
      if (selectedKamDetail && selectedKamDetail.id === kamId) {
        setSelectedKamDetail((prev) => (prev ? { ...prev, ...fields } : null));
      }
      setNotification({
        type: 'success',
        message: "Fiche KAM mise à jour avec succès.",
      });
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || "Erreur lors de la modification du KAM.",
      });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Unique cities list for filters
  const citiesList = useMemo(() => {
    const set = new Set<string>();
    accountsList.forEach((acc) => {
      if (acc.city) set.add(acc.city);
    });
    return Array.from(set).sort();
  }, [accountsList]);

  // Filtered Accounts: Overview View
  const filteredOverviewAccounts = useMemo(() => {
    return accountsList.filter((acc) => {
      if (overviewSegmentFilter !== 'ALL' && acc.segment !== overviewSegmentFilter) return false;
      if (overviewAssignmentFilter === 'ASSIGNED' && !acc.assigned_kam) return false;
      if (overviewAssignmentFilter === 'UNASSIGNED' && acc.assigned_kam) return false;
      if (overviewKamFilter !== 'ALL' && acc.assigned_kam?.id.toString() !== overviewKamFilter) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        Boolean(acc.name && acc.name.toLowerCase().includes(q)) ||
        Boolean(acc.crm_id && acc.crm_id.toLowerCase().includes(q)) ||
        Boolean(acc.rccm && acc.rccm.toLowerCase().includes(q)) ||
        Boolean(acc.sector && acc.sector.toLowerCase().includes(q)) ||
        Boolean(acc.city && acc.city.toLowerCase().includes(q)) ||
        Boolean(acc.commune && acc.commune.toLowerCase().includes(q)) ||
        Boolean(acc.contact_name && acc.contact_name.toLowerCase().includes(q)) ||
        Boolean(acc.assigned_kam?.full_name && acc.assigned_kam.full_name.toLowerCase().includes(q))
      );
    });
  }, [accountsList, overviewSegmentFilter, overviewAssignmentFilter, overviewKamFilter, searchQuery]);

  // Filtered Accounts: Grands Comptes View
  const filteredGrandsComptesAccounts = useMemo(() => {
    return accountsList
      .filter((acc) => acc.segment === 'GRAND_COMPTE')
      .filter((acc) => {
        if (gcAssignmentFilter === 'ASSIGNED' && !acc.assigned_kam) return false;
        if (gcAssignmentFilter === 'UNASSIGNED' && acc.assigned_kam) return false;
        if (gcKamFilter !== 'ALL' && acc.assigned_kam?.id.toString() !== gcKamFilter) return false;
        if (gcCityFilter !== 'ALL' && acc.city !== gcCityFilter) return false;

        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          Boolean(acc.name && acc.name.toLowerCase().includes(q)) ||
          Boolean(acc.crm_id && acc.crm_id.toLowerCase().includes(q)) ||
          Boolean(acc.rccm && acc.rccm.toLowerCase().includes(q)) ||
          Boolean(acc.sector && acc.sector.toLowerCase().includes(q)) ||
          Boolean(acc.city && acc.city.toLowerCase().includes(q)) ||
          Boolean(acc.commune && acc.commune.toLowerCase().includes(q)) ||
          Boolean(acc.contact_name && acc.contact_name.toLowerCase().includes(q)) ||
          Boolean(acc.assigned_kam?.full_name && acc.assigned_kam.full_name.toLowerCase().includes(q))
        );
      });
  }, [accountsList, gcAssignmentFilter, gcKamFilter, gcCityFilter, searchQuery]);

  // Filtered Accounts: PME View
  const filteredPmeAccounts = useMemo(() => {
    return accountsList
      .filter((acc) => acc.segment === 'PME')
      .filter((acc) => {
        if (pmeAssignmentFilter === 'ASSIGNED' && !acc.assigned_kam) return false;
        if (pmeAssignmentFilter === 'UNASSIGNED' && acc.assigned_kam) return false;
        if (pmeKamFilter !== 'ALL' && acc.assigned_kam?.id.toString() !== pmeKamFilter) return false;
        if (pmeCityFilter !== 'ALL' && acc.city !== pmeCityFilter) return false;

        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          Boolean(acc.name && acc.name.toLowerCase().includes(q)) ||
          Boolean(acc.crm_id && acc.crm_id.toLowerCase().includes(q)) ||
          Boolean(acc.rccm && acc.rccm.toLowerCase().includes(q)) ||
          Boolean(acc.sector && acc.sector.toLowerCase().includes(q)) ||
          Boolean(acc.city && acc.city.toLowerCase().includes(q)) ||
          Boolean(acc.commune && acc.commune.toLowerCase().includes(q)) ||
          Boolean(acc.contact_name && acc.contact_name.toLowerCase().includes(q)) ||
          Boolean(acc.assigned_kam?.full_name && acc.assigned_kam.full_name.toLowerCase().includes(q))
        );
      });
  }, [accountsList, pmeAssignmentFilter, pmeKamFilter, pmeCityFilter, searchQuery]);

  // Filtered KAMs List
  const filteredKamsList = useMemo(() => {
    return kamsList.filter((k) => {
      if (kamSpecializationFilter !== 'ALL' && k.kam_specialization !== kamSpecializationFilter) return false;
      if (kamAvailabilityFilter === 'AVAILABLE' && !k.is_available) return false;
      if (kamAvailabilityFilter === 'UNAVAILABLE' && k.is_available) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        Boolean(k.full_name && k.full_name.toLowerCase().includes(q)) ||
        Boolean(k.username && k.username.toLowerCase().includes(q)) ||
        Boolean(k.location && k.location.toLowerCase().includes(q)) ||
        Boolean(k.email && k.email.toLowerCase().includes(q))
      );
    });
  }, [kamsList, kamSpecializationFilter, kamAvailabilityFilter, searchQuery]);

  // Accounts of the Selected KAM Detail
  const selectedKamAccounts = useMemo(() => {
    if (!selectedKamDetail) return [];
    return accountsList.filter((acc) => acc.assigned_kam?.id === selectedKamDetail.id);
  }, [accountsList, selectedKamDetail]);

  // Filtered Directives
  const filteredDirectives = useMemo(() => {
    const currentUserId = user?.id;
    return directives
      .filter((d) => {
        if (directiveTab === 'received') {
          return d.target_entity === 'KAM_OFFICE' || d.recipient === currentUserId;
        } else {
          return d.sender === currentUserId;
        }
      })
      .filter((d) => {
        if (directiveStatusFilter !== 'ALL' && d.status !== directiveStatusFilter) return false;
        if (directivePriorityFilter !== 'ALL' && d.priority !== directivePriorityFilter) return false;

        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          Boolean(d.title && d.title.toLowerCase().includes(q)) ||
          Boolean(d.instruction && d.instruction.toLowerCase().includes(q)) ||
          Boolean(d.recipient_name && d.recipient_name.toLowerCase().includes(q)) ||
          Boolean(d.sender_name && d.sender_name.toLowerCase().includes(q)) ||
          Boolean(d.target_account_name && d.target_account_name.toLowerCase().includes(q))
        );
      });
  }, [directives, directiveTab, directiveStatusFilter, directivePriorityFilter, searchQuery, user]);

  // Dynamic Nav Items matching Backoffice Pattern
  const navItems = [
    {
      id: 'overview' as KamOfficeView,
      label: "Portefeuille & KPIs",
      icon: Icons.Sliders,
      badge: metrics ? metrics.total_accounts : undefined,
    },
    {
      id: 'leadscoring' as KamOfficeView,
      label: "Pipeline & Scoring B2B",
      icon: Icons.Award,
      badge: "Priorités",
    },
    {
      id: 'churnradar' as KamOfficeView,
      label: "Radar Churn & Alertes",
      icon: Icons.AlertTriangle,
      badge: undefined,
    },
    {
      id: 'kams' as KamOfficeView,
      label: "Équipe KAM & Effectifs",
      icon: Icons.Users,
      badge: kamsList.length > 0 ? kamsList.length : undefined,
    },
    {
      id: 'grands_comptes' as KamOfficeView,
      label: "Grands Comptes",
      icon: Icons.Building,
      badge: metrics ? metrics.grands_comptes_count : undefined,
    },
    {
      id: 'pme' as KamOfficeView,
      label: "PME Stratégiques",
      icon: Icons.Briefcase,
      badge: metrics ? metrics.pme_count : undefined,
    },
    {
      id: 'directives' as KamOfficeView,
      label: "Directives",
      icon: Icons.FileText,
      badge: directives.filter((d) => d.status !== 'COMPLETED').length || undefined,
    },
    {
      id: 'copilot' as KamOfficeView,
      label: "Copilote IA",
      icon: Icons.Bot,
      badge: 'AI',
    },
    {
      id: 'settings' as KamOfficeView,
      label: "Paramètres & FAQ",
      icon: Icons.Settings,
    },
  ];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F6F5F2] dark:bg-[#242124]">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-[#4F6CE8] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['KAM_MANAGER']}>
      <div className="flex h-screen w-full bg-[#ECEAE5] dark:bg-[#242124] text-zinc-900 dark:text-white font-sans antialiased overflow-hidden select-none transition-colors duration-300">
        
        {/* ========================================================================= */}
        {/* 1. SIDEBAR RÉTRACTABLE FLOTTANTE (Même forme & structure que Backoffice)  */}
        {/* ========================================================================= */}
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
                  <div>
                    <h1 className="text-base font-semibold text-zinc-900 dark:text-white tracking-tight">
                      ONBORA
                    </h1>
                    <p className="text-[10px] text-[#4F6CE8] font-semibold tracking-wider uppercase">
                      Direction KAM Office
                    </p>
                  </div>
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

            {/* Navigation Menus (6 strictly defined, no useless subheadings) */}
            <nav className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const isActive = activeView === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      setSelectedKamDetail(null);
                    }}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`group flex items-center ${isSidebarCollapsed ? 'justify-center p-3.5' : 'justify-between p-3.5'} rounded-2xl transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-[#4F6CE8] text-white shadow-sm'
                        : 'text-zinc-600 dark:text-[#A1A1AA] hover:bg-[#E4E1DB]/60 dark:hover:bg-[#363336]/60 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <Icon
                        size={18}
                        className={isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white'}
                      />
                      {!isSidebarCollapsed && (
                        <span className="text-xs font-semibold tracking-tight">
                          {item.label}
                        </span>
                      )}
                    </div>

                    {!isSidebarCollapsed && item.badge !== undefined && (
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
                      alt={user?.username || 'KAM Office'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold leading-tight text-zinc-900 dark:text-white truncate">
                      {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
                    </span>
                    <span className="text-[10px] text-[#4F6CE8] font-550">
                      Gérant KAM Office
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

        {/* ========================================================================= */}
        {/* 2. ESPACE DE TRAVAIL PRINCIPAL (Header, Recherche & Contenu)              */}
        {/* ========================================================================= */}
        <main className="flex-1 flex flex-col h-full overflow-hidden p-4 pl-4">
          
          {/* Top Header Bar (Même disposition que le Backoffice) */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5 shrink-0 mb-4">
            <div className="flex flex-col">
              <h2 className="text-xl font-550 text-[#242124] dark:text-white tracking-tight">
                {activeView === 'overview' && "Portefeuille Stratégique & KPIs"}
                {activeView === 'leadscoring' && "Scoring B2B & Priorisation IA"}
                {activeView === 'churnradar' && "Radar Churn & Opportunités d'Upsell"}
                {activeView === 'kams' && (selectedKamDetail ? `Fiche KAM — ${selectedKamDetail.full_name}` : "Équipe Key Account Managers & Pôles")}
                {activeView === 'grands_comptes' && "Répertoire Grands Comptes (> 1M$)"}
                {activeView === 'pme' && "Répertoire PME Stratégiques (100k$ - 1M$)"}
                {activeView === 'directives' && "Directives Stratégiques & Assignations"}
                {activeView === 'settings' && "Paramètres & Base de Connaissances"}
                {activeView === 'copilot' && "Copilote Stratégique IA"}
              </h2>
            </div>

            {/* Actions d'En-Tête : Recherche pilule avec croix, Actualiser, ThemeToggle */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-2 bg-white dark:bg-[#2D2A2D] px-3.5 py-2 rounded-2xl border border-black/5 dark:border-white/5 shadow-2xs">
                <Icons.Search size={14} className="text-[#6E6C67] dark:text-[#A1A1AA]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeView === 'overview'
                      ? "Filtrer compte, CRM, commune, KAM..."
                      : activeView === 'kams'
                      ? "Rechercher KAM, ville..."
                      : activeView === 'grands_comptes'
                      ? "Rechercher Grand Compte..."
                      : activeView === 'pme'
                      ? "Rechercher PME..."
                      : activeView === 'directives'
                      ? "Rechercher directive, compte..."
                      : "Recherche..."
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
                  loadKamOfficeData();
                  loadDirectives();
                }}
                disabled={loadingData}
                title="Actualiser les données"
                className="p-2.5 rounded-2xl bg-white dark:bg-[#2D2A2D] hover:bg-black/5 dark:hover:bg-white/10 text-[#6E6C67] dark:text-white transition-all cursor-pointer border border-black/5 dark:border-white/5 disabled:opacity-50 shadow-2xs"
              >
                <Icons.Refresh size={15} className={loadingData ? "animate-spin" : ""} />
              </button>

              <ThemeToggle />
            </div>
          </header>

          {/* Notification Banner */}
          {notification && (
            <div
              className={`mb-4 p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
                notification.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icons.CheckCircle size={16} />
                <span>{notification.message}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="p-1 hover:opacity-75 cursor-pointer"
              >
                <Icons.X size={14} />
              </button>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto pr-1">

            {/* ========================================================================= */}
            {/* VUE 1 : PORTEFEUILLE & KPIS (Overview)                                    */}
            {/* ========================================================================= */}
            {activeView === 'overview' && (
              <div className="flex flex-col gap-4">
                {/* 5 KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Total Comptes Clés</span>
                    <span className="text-xl font-extrabold text-[#242124] dark:text-white">{metrics?.total_accounts || 0}</span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                      {metrics?.assigned_count || 0} affectés à un KAM
                    </span>
                  </div>

                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Grands Comptes (&gt; 1M$)</span>
                    <span className="text-xl font-extrabold text-[#4F6CE8]">{metrics?.grands_comptes_count || 0}</span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                      {metrics?.unassigned_grands_comptes || 0} en attente de KAM
                    </span>
                  </div>

                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">PME Stratégiques</span>
                    <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">{metrics?.pme_count || 0}</span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                      {metrics?.unassigned_pme || 0} en attente de KAM
                    </span>
                  </div>

                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Taux d'Affectation</span>
                    <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {metrics?.assignment_rate_percent || 0}%
                    </span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                      {metrics?.unassigned_count || 0} comptes non affectés
                    </span>
                  </div>

                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">CA Sous Gestion</span>
                    <span className="text-xl font-extrabold text-[#242124] dark:text-white">
                      {((metrics?.total_annual_revenue_usd || 0) / 1_000_000).toFixed(1)}M$
                    </span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                      {metrics?.total_converted_count || 0} dossiers signés
                    </span>
                  </div>
                </div>

                {/* Filters Toolbar */}
                <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {/* Segment Filter */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Segment :</span>
                      <select
                        value={overviewSegmentFilter}
                        onChange={(e) => setOverviewSegmentFilter(e.target.value as any)}
                        className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
                      >
                        <option value="ALL">Tous les segments</option>
                        <option value="GRAND_COMPTE">Grands Comptes (&gt; 1M$)</option>
                        <option value="PME">PME Stratégiques (100k$ - 1M$)</option>
                      </select>
                    </div>

                    {/* Assignment Filter */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Affectation :</span>
                      <select
                        value={overviewAssignmentFilter}
                        onChange={(e) => setOverviewAssignmentFilter(e.target.value as any)}
                        className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
                      >
                        <option value="ALL">Tous les statuts</option>
                        <option value="UNASSIGNED">Non affectés (En attente)</option>
                        <option value="ASSIGNED">Affectés à un KAM</option>
                      </select>
                    </div>

                    {/* KAM Filter */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">KAM :</span>
                      <select
                        value={overviewKamFilter}
                        onChange={(e) => setOverviewKamFilter(e.target.value)}
                        className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
                      >
                        <option value="ALL">Tous les KAMs</option>
                        {kamsList.map((k) => (
                          <option key={k.id} value={k.id.toString()}>
                            {k.full_name} ({k.kam_specialization === 'GRAND_COMPTE' ? 'GC' : 'PME'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
                    {filteredOverviewAccounts.length} comptes affichés
                  </span>
                </div>

                {/* Accounts Table */}
                <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-black/5 dark:border-white/5 text-[10px] font-semibold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                          <th className="pb-3 px-3">Compte & Entreprise</th>
                          <th className="pb-3 px-3">Segment</th>
                          <th className="pb-3 px-3">CA Annuel</th>
                          <th className="pb-3 px-3">Localisation</th>
                          <th className="pb-3 px-3">Opérateur Actuel</th>
                          <th className="pb-3 px-3">Contact Décideur</th>
                          <th className="pb-3 px-3">KAM Assigné</th>
                          <th className="pb-3 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {filteredOverviewAccounts.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                              Aucun compte ne correspond aux filtres actuels.
                            </td>
                          </tr>
                        ) : (
                          filteredOverviewAccounts.map((acc) => (
                            <tr key={acc.id} className="hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                              <td className="py-3.5 px-3">
                                <div className="flex flex-col">
                                  <button
                                    onClick={() => setSelectedAccountForDetail(acc)}
                                    className="font-semibold text-zinc-900 dark:text-white hover:text-[#4F6CE8] dark:hover:text-[#4F6CE8] text-left transition-colors cursor-pointer flex items-center gap-1.5 group"
                                    title="Voir la fiche détaillée du compte"
                                  >
                                    <span className="group-hover:underline">{acc.name}</span>
                                    <Icons.ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-[#4F6CE8] transition-opacity" />
                                  </button>
                                  <span className="text-[10px] font-mono text-[#6E6C67] dark:text-[#A1A1AA]">
                                    {acc.crm_id} • {acc.rccm || 'RCCM n/a'}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3.5 px-3">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                    acc.segment === 'GRAND_COMPTE'
                                      ? 'bg-[#4F6CE8]/10 text-[#4F6CE8]'
                                      : 'bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300'
                                  }`}
                                >
                                  {acc.segment === 'GRAND_COMPTE' ? 'Grand Compte' : 'PME'}
                                </span>
                              </td>

                              <td className="py-3.5 px-3 font-semibold text-zinc-900 dark:text-white">
                                {Number(acc.annual_revenue || 0).toLocaleString()} $
                              </td>

                              <td className="py-3.5 px-3 text-zinc-600 dark:text-[#A1A1AA]">
                                {acc.city} {acc.commune ? `(${acc.commune})` : ''}
                              </td>

                              <td className="py-3.5 px-3">
                                <div className="flex flex-col">
                                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                    {acc.current_operator || 'Non renseigné'}
                                  </span>
                                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                                    {acc.current_connectivity || 'Fibre / Faisceau'}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3.5 px-3">
                                <div className="flex flex-col">
                                  <span className="font-medium text-zinc-900 dark:text-white">
                                    {acc.contact_name || 'Contact non renseigné'}
                                  </span>
                                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                                    {acc.contact_phone || 'Tél n/a'}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3.5 px-3">
                                {acc.assigned_kam ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-[#4F6CE8]/20 flex items-center justify-center text-[10px] font-bold text-[#4F6CE8] overflow-hidden shrink-0">
                                      <img
                                        src={`/memojis/${(acc.assigned_kam.avatar || 'memoji_056.png').replace('assets/memojis/', '')}`}
                                        alt={acc.assigned_kam.full_name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                    </div>
                                    <span className="font-semibold text-zinc-900 dark:text-white">
                                      {acc.assigned_kam.full_name}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/5 dark:bg-white/10 text-zinc-500">
                                    Non affecté
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 px-3 text-right">
                                <button
                                  onClick={() => handleOpenAssignModal(acc)}
                                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#363336] hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold text-[#4F6CE8] border border-black/5 dark:border-white/5 transition-all cursor-pointer"
                                >
                                  {acc.assigned_kam ? "Réaffecter" : "Affecter KAM"}
                                </button>
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

            {/* ========================================================================= */}
            {/* VUE 1.1 : SCORING B2B & PRIORISATION IA                                  */}
            {/* ========================================================================= */}
            {activeView === 'leadscoring' && (
              <KamLeadScoringView />
            )}

            {/* ========================================================================= */}
            {/* VUE 1.2 : RADAR CHURN & OPPORTUNITÉS UPSELL                               */}
            {/* ========================================================================= */}
            {activeView === 'churnradar' && (
              <KamChurnRadarView />
            )}

            {/* ========================================================================= */}
            {/* VUE 2 : ÉQUIPE KAM & EFFECTIFS (Liste & Fiche Détail Drill-down)          */}
            {/* ========================================================================= */}
            {activeView === 'kams' && (
              <div>
                {selectedKamDetail ? (
                  /* --- FICHE DÉTAILLÉE DU KAM SÉLECTIONNÉ --- */
                  <div className="flex flex-col gap-4">
                    {/* Header avec Bouton Retour */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setSelectedKamDetail(null)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F6F5F2] dark:bg-[#2D2A2D] hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-200 border border-black/5 dark:border-white/5 transition-all cursor-pointer"
                      >
                        <Icons.ArrowLeft size={14} />
                        <span>Retour à l'équipe KAM</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateKam(selectedKamDetail.id, { is_available: !selectedKamDetail.is_available })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-black/5 dark:border-white/5 ${
                            selectedKamDetail.is_available
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-black/5 dark:bg-white/10 text-zinc-500'
                          }`}
                        >
                          {selectedKamDetail.is_available ? "Disponible en mission" : "Indisponible / Congés"}
                        </button>

                        <select
                          value={selectedKamDetail.kam_specialization}
                          onChange={(e) => handleUpdateKam(selectedKamDetail.id, { kam_specialization: e.target.value as any })}
                          className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
                        >
                          <option value="GRAND_COMPTE">Pôle Grands Comptes (&gt; 1M$)</option>
                          <option value="PME">Pôle PME Stratégiques (100k$ - 1M$)</option>
                        </select>
                      </div>
                    </div>

                    {/* Profile Header Card */}
                    <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-20 h-20 rounded-3xl bg-[#4F6CE8]/15 border border-[#4F6CE8]/30 flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src={`/memojis/${(selectedKamDetail.avatar || 'memoji_056.png').replace('assets/memojis/', '')}`}
                          alt={selectedKamDetail.full_name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                            {selectedKamDetail.full_name}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#4F6CE8]/10 text-[#4F6CE8]">
                            {selectedKamDetail.kam_specialization === 'GRAND_COMPTE' ? 'Spécialiste Grands Comptes' : 'Spécialiste PME'}
                          </span>
                        </div>

                        <div className="flex items-center justify-center sm:justify-start gap-4 mt-2 text-xs text-[#6E6C67] dark:text-[#A1A1AA] flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Icons.Mail size={13} />
                            <span>{selectedKamDetail.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Icons.Phone size={13} />
                            <span>{selectedKamDetail.phone || 'Non renseigné'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Icons.MapPin size={13} />
                            <span>{selectedKamDetail.location || 'Kinshasa'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Performance KPIs for this KAM */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Comptes Assignés</span>
                        <span className="text-xl font-extrabold text-zinc-900 dark:text-white">
                          {selectedKamAccounts.length}
                        </span>
                        <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                          {selectedKamAccounts.filter((a) => a.segment === 'GRAND_COMPTE').length} GC • {selectedKamAccounts.filter((a) => a.segment === 'PME').length} PME
                        </span>
                      </div>

                      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">CA Portefeuille</span>
                        <span className="text-xl font-extrabold text-[#4F6CE8]">
                          {(selectedKamAccounts.reduce((sum, a) => sum + Number(a.annual_revenue || 0), 0) / 1_000_000).toFixed(1)}M$
                        </span>
                        <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Volume sous gestion</span>
                      </div>

                      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Dossiers Convertis</span>
                        <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                          {selectedKamAccounts.filter((a) => a.conversion_status === 'CONVERTED').length}
                        </span>
                        <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Contrats signés actifs</span>
                      </div>

                      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Statut Opérationnel</span>
                        <span className={`text-sm font-extrabold ${selectedKamDetail.is_available ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'}`}>
                          {selectedKamDetail.is_available ? "Actif & Disponible" : "Indisponible"}
                        </span>
                        <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Affectations autorisées</span>
                      </div>
                    </div>

                    {/* Table of Accounts Assigned to this KAM */}
                    <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                          Portefeuille de comptes attribués à {selectedKamDetail.full_name} ({selectedKamAccounts.length})
                        </h4>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-black/5 dark:border-white/5 text-[10px] font-semibold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                              <th className="pb-3 px-3">Compte</th>
                              <th className="pb-3 px-3">Segment</th>
                              <th className="pb-3 px-3">CA Annuel</th>
                              <th className="pb-3 px-3">Localisation</th>
                              <th className="pb-3 px-3">Contact</th>
                              <th className="pb-3 px-3">Statut</th>
                              <th className="pb-3 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {selectedKamAccounts.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                                  Aucun compte n'est actuellement affecté à ce KAM.
                                </td>
                              </tr>
                            ) : (
                              selectedKamAccounts.map((acc) => (
                                <tr key={acc.id} className="hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                                  <td className="py-3 px-3">
                                    <button
                                      onClick={() => setSelectedAccountForDetail(acc)}
                                      className="font-semibold text-zinc-900 dark:text-white hover:text-[#4F6CE8] dark:hover:text-[#4F6CE8] text-left transition-colors cursor-pointer flex items-center gap-1.5 group"
                                      title="Voir la fiche détaillée du compte"
                                    >
                                      <span className="group-hover:underline">{acc.name}</span>
                                      <Icons.ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-[#4F6CE8] transition-opacity" />
                                    </button>
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
                                      {acc.segment === 'GRAND_COMPTE' ? 'Grand Compte' : 'PME'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 font-semibold">
                                    {Number(acc.annual_revenue || 0).toLocaleString()} $
                                  </td>
                                  <td className="py-3 px-3 text-zinc-600 dark:text-[#A1A1AA]">
                                    {acc.city}
                                  </td>
                                  <td className="py-3 px-3 text-zinc-600 dark:text-[#A1A1AA]">
                                    {acc.contact_name} ({acc.contact_phone || 'tél n/a'})
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
                                      {acc.conversion_status_display || acc.conversion_status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-right">
                                    <button
                                      onClick={() => handleUnassignAccount(acc.id)}
                                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                    >
                                      Désaffecter
                                    </button>
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
                  /* --- GRILLE / LISTE DES KAMS --- */
                  <div className="flex flex-col gap-4">
                    {/* Filters Toolbar & Bouton Nouveau KAM */}
                    <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Pôle Spécialité :</span>
                          <select
                            value={kamSpecializationFilter}
                            onChange={(e) => setKamSpecializationFilter(e.target.value as any)}
                            className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
                          >
                            <option value="ALL">Tous les pôles</option>
                            <option value="GRAND_COMPTE">Grands Comptes (&gt; 1M$)</option>
                            <option value="PME">PME Stratégiques (100k$ - 1M$)</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Disponibilité :</span>
                          <select
                            value={kamAvailabilityFilter}
                            onChange={(e) => setKamAvailabilityFilter(e.target.value as any)}
                            className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
                          >
                            <option value="ALL">Tous les états</option>
                            <option value="AVAILABLE">Disponibles</option>
                            <option value="UNAVAILABLE">Indisponibles</option>
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={() => setIsCreateKamModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Icons.UserPlus size={14} />
                        <span>Nouveau KAM</span>
                      </button>
                    </div>

                    {/* Cards Grid of KAMs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredKamsList.map((kam) => (
                        <div
                          key={kam.id}
                          onClick={() => setSelectedKamDetail(kam)}
                          className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col justify-between gap-4 hover:border-[#4F6CE8]/40 transition-all cursor-pointer group shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-[#4F6CE8]/15 border border-[#4F6CE8]/30 flex items-center justify-center overflow-hidden shrink-0">
                                <img
                                  src={`/memojis/${(kam.avatar || 'memoji_056.png').replace('assets/memojis/', '')}`}
                                  alt={kam.full_name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-[#4F6CE8] transition-colors">
                                  {kam.full_name}
                                </span>
                                <span className="text-[10px] font-mono text-[#6E6C67] dark:text-[#A1A1AA]">
                                  @{kam.username} • {kam.location || 'Kinshasa'}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                kam.is_available
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-black/5 dark:bg-white/10 text-zinc-500'
                              }`}
                            >
                              {kam.is_available ? "Disponible" : "Occupé"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Portefeuille</span>
                              <span className="font-extrabold text-xs text-zinc-900 dark:text-white">
                                {kam.assigned_total_count} comptes
                              </span>
                            </div>

                            <div className="flex flex-col">
                              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Volume Sous Gestion</span>
                              <span className="font-extrabold text-xs text-[#4F6CE8]">
                                {(kam.total_portfolio_revenue_usd / 1_000_000).toFixed(1)}M$
                              </span>
                            </div>

                            <div className="flex flex-col">
                              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Spécialisation</span>
                              <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                                {kam.kam_specialization === 'GRAND_COMPTE' ? 'Grands Comptes' : 'PME'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                              {kam.converted_accounts_count} contrats signés ({((kam.converted_amount_usd || 0) / 1_000).toFixed(0)}k$)
                            </span>
                            <span className="text-xs font-semibold text-[#4F6CE8] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                              <span>Fiche détaillée</span>
                              <Icons.ChevronRight size={14} />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* VUE 3 : GRANDS COMPTES (> 1M$)                                            */}
            {/* ========================================================================= */}
            {activeView === 'grands_comptes' && (
              <div className="flex flex-col gap-4">
                {/* 4 Mini KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Total Grands Comptes</span>
                    <span className="text-xl font-extrabold text-[#4F6CE8]">
                      {accountsList.filter((a) => a.segment === 'GRAND_COMPTE').length}
                    </span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Chiffre d'affaires supérieur à 1M$</span>
                  </div>

                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">GC Affectés</span>
                    <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {accountsList.filter((a) => a.segment === 'GRAND_COMPTE' && a.assigned_kam).length}
                    </span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Pris en charge par l'équipe</span>
                  </div>

                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">GC Non Affectés</span>
                    <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                      {accountsList.filter((a) => a.segment === 'GRAND_COMPTE' && !a.assigned_kam).length}
                    </span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">À attribuer en priorité</span>
                  </div>

                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Volume d'Affaires GC</span>
                    <span className="text-xl font-extrabold text-[#242124] dark:text-white">
                      {(accountsList.filter((a) => a.segment === 'GRAND_COMPTE').reduce((sum, a) => sum + Number(a.annual_revenue || 0), 0) / 1_000_000).toFixed(1)}M$
                    </span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Pipeline annuel global</span>
                  </div>
                </div>

                {/* Filters Toolbar */}
                <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Affectation :</span>
                      <select
                        value={gcAssignmentFilter}
                        onChange={(e) => setGcAssignmentFilter(e.target.value as any)}
                        className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
                      >
                        <option value="ALL">Tous les comptes GC</option>
                        <option value="UNASSIGNED">Non affectés (En attente)</option>
                        <option value="ASSIGNED">Affectés à un KAM</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">KAM :</span>
                      <select
                        value={gcKamFilter}
                        onChange={(e) => setGcKamFilter(e.target.value)}
                        className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
                      >
                        <option value="ALL">Tous les KAMs</option>
                        {kamsList.map((k) => (
                          <option key={k.id} value={k.id.toString()}>
                            {k.full_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Ville :</span>
                      <select
                        value={gcCityFilter}
                        onChange={(e) => setGcCityFilter(e.target.value)}
                        className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
                      >
                        <option value="ALL">Toutes les villes</option>
                        {citiesList.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
                    {filteredGrandsComptesAccounts.length} Grands Comptes
                  </span>
                </div>

                {/* Table */}
                <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-black/5 dark:border-white/5 text-[10px] font-semibold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                          <th className="pb-3 px-3">Grand Compte</th>
                          <th className="pb-3 px-3">CA Annuel</th>
                          <th className="pb-3 px-3">Localisation</th>
                          <th className="pb-3 px-3">Opérateur Actuel</th>
                          <th className="pb-3 px-3">Contact Décideur</th>
                          <th className="pb-3 px-3">KAM Référent</th>
                          <th className="pb-3 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {filteredGrandsComptesAccounts.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                              Aucun Grand Compte ne correspond aux filtres.
                            </td>
                          </tr>
                        ) : (
                          filteredGrandsComptesAccounts.map((acc) => (
                            <tr key={acc.id} className="hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                              <td className="py-3.5 px-3">
                                <div className="flex flex-col">
                                  <button
                                    onClick={() => setSelectedAccountForDetail(acc)}
                                    className="font-semibold text-zinc-900 dark:text-white hover:text-[#4F6CE8] dark:hover:text-[#4F6CE8] text-left transition-colors cursor-pointer flex items-center gap-1.5 group"
                                    title="Voir la fiche détaillée du compte"
                                  >
                                    <span className="group-hover:underline">{acc.name}</span>
                                    <Icons.ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-[#4F6CE8] transition-opacity" />
                                  </button>
                                  <span className="text-[10px] font-mono text-[#6E6C67] dark:text-[#A1A1AA]">
                                    {acc.crm_id} • {acc.sector}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3.5 px-3 font-semibold text-zinc-900 dark:text-white">
                                {Number(acc.annual_revenue || 0).toLocaleString()} $
                              </td>

                              <td className="py-3.5 px-3 text-zinc-600 dark:text-[#A1A1AA]">
                                {acc.city} {acc.commune ? `(${acc.commune})` : ''}
                              </td>

                              <td className="py-3.5 px-3">
                                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                  {acc.current_operator || 'Opérateur non renseigné'}
                                </span>
                              </td>

                              <td className="py-3.5 px-3">
                                <div className="flex flex-col">
                                  <span className="font-medium text-zinc-900 dark:text-white">
                                    {acc.contact_name}
                                  </span>
                                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                                    {acc.contact_phone}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3.5 px-3">
                                {acc.assigned_kam ? (
                                  <span className="font-semibold text-[#4F6CE8]">
                                    {acc.assigned_kam.full_name}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/5 dark:bg-white/10 text-zinc-500">
                                    Non affecté
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 px-3 text-right">
                                <button
                                  onClick={() => handleOpenAssignModal(acc)}
                                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#363336] hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold text-[#4F6CE8] border border-black/5 dark:border-white/5 transition-all cursor-pointer"
                                >
                                  {acc.assigned_kam ? "Réaffecter" : "Affecter un KAM"}
                                </button>
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

            {/* ========================================================================= */}
            {/* VUE 4 : PME STRATÉGIQUES (100k$ - 1M$)                                    */}
            {/* ========================================================================= */}
            {activeView === 'pme' && (
              <div className="flex flex-col gap-4">
                {/* 4 Mini KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Total PME Stratégiques</span>
                    <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                      {accountsList.filter((a) => a.segment === 'PME').length}
                    </span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Chiffre d'affaires entre 100k$ et 1M$</span>
                  </div>

                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">PME Affectées</span>
                    <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {accountsList.filter((a) => a.segment === 'PME' && a.assigned_kam).length}
                    </span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Suivies par un KAM</span>
                  </div>

                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">PME Non Affectées</span>
                    <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                      {accountsList.filter((a) => a.segment === 'PME' && !a.assigned_kam).length}
                    </span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Vivier disponible</span>
                  </div>

                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Volume d'Affaires PME</span>
                    <span className="text-xl font-extrabold text-[#242124] dark:text-white">
                      {(accountsList.filter((a) => a.segment === 'PME').reduce((sum, a) => sum + Number(a.annual_revenue || 0), 0) / 1_000_000).toFixed(1)}M$
                    </span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Pipeline PME annuel</span>
                  </div>
                </div>

                {/* Filters Toolbar */}
                <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Affectation :</span>
                      <select
                        value={pmeAssignmentFilter}
                        onChange={(e) => setPmeAssignmentFilter(e.target.value as any)}
                        className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
                      >
                        <option value="ALL">Toutes les PME</option>
                        <option value="UNASSIGNED">Non affectées (En attente)</option>
                        <option value="ASSIGNED">Affectées à un KAM</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">KAM :</span>
                      <select
                        value={pmeKamFilter}
                        onChange={(e) => setPmeKamFilter(e.target.value)}
                        className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
                      >
                        <option value="ALL">Tous les KAMs</option>
                        {kamsList.map((k) => (
                          <option key={k.id} value={k.id.toString()}>
                            {k.full_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Ville :</span>
                      <select
                        value={pmeCityFilter}
                        onChange={(e) => setPmeCityFilter(e.target.value)}
                        className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
                      >
                        <option value="ALL">Toutes les villes</option>
                        {citiesList.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
                    {filteredPmeAccounts.length} PME Stratégiques
                  </span>
                </div>

                {/* Table */}
                <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-black/5 dark:border-white/5 text-[10px] font-semibold uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                          <th className="pb-3 px-3">PME Stratégique</th>
                          <th className="pb-3 px-3">CA Annuel</th>
                          <th className="pb-3 px-3">Localisation</th>
                          <th className="pb-3 px-3">Opérateur Actuel</th>
                          <th className="pb-3 px-3">Contact Décideur</th>
                          <th className="pb-3 px-3">KAM Référent</th>
                          <th className="pb-3 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {filteredPmeAccounts.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                              Aucune PME ne correspond aux filtres.
                            </td>
                          </tr>
                        ) : (
                          filteredPmeAccounts.map((acc) => (
                            <tr key={acc.id} className="hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                              <td className="py-3.5 px-3">
                                <div className="flex flex-col">
                                  <button
                                    onClick={() => setSelectedAccountForDetail(acc)}
                                    className="font-semibold text-zinc-900 dark:text-white hover:text-[#4F6CE8] dark:hover:text-[#4F6CE8] text-left transition-colors cursor-pointer flex items-center gap-1.5 group"
                                    title="Voir la fiche détaillée du compte"
                                  >
                                    <span className="group-hover:underline">{acc.name}</span>
                                    <Icons.ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-[#4F6CE8] transition-opacity" />
                                  </button>
                                  <span className="text-[10px] font-mono text-[#6E6C67] dark:text-[#A1A1AA]">
                                    {acc.crm_id} • {acc.sector}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3.5 px-3 font-semibold text-zinc-900 dark:text-white">
                                {Number(acc.annual_revenue || 0).toLocaleString()} $
                              </td>

                              <td className="py-3.5 px-3 text-zinc-600 dark:text-[#A1A1AA]">
                                {acc.city} {acc.commune ? `(${acc.commune})` : ''}
                              </td>

                              <td className="py-3.5 px-3">
                                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                  {acc.current_operator || 'Non renseigné'}
                                </span>
                              </td>

                              <td className="py-3.5 px-3">
                                <div className="flex flex-col">
                                  <span className="font-medium text-zinc-900 dark:text-white">
                                    {acc.contact_name}
                                  </span>
                                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                                    {acc.contact_phone}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3.5 px-3">
                                {acc.assigned_kam ? (
                                  <span className="font-semibold text-zinc-900 dark:text-white">
                                    {acc.assigned_kam.full_name}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/5 dark:bg-white/10 text-zinc-500">
                                    Non affecté
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 px-3 text-right">
                                <button
                                  onClick={() => handleOpenAssignModal(acc)}
                                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#363336] hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold text-[#4F6CE8] border border-black/5 dark:border-white/5 transition-all cursor-pointer"
                                >
                                  {acc.assigned_kam ? "Réaffecter" : "Affecter un KAM"}
                                </button>
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

            {/* ========================================================================= */}
            {/* VUE 5 : DIRECTIVES STRATÉGIQUES (Reçues & Émises)                          */}
            {/* ========================================================================= */}
            {activeView === 'directives' && (
              <div className="flex flex-col gap-4">
                {/* Header Toolbar avec Sous-Onglets et Bouton d'Émission */}
                <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Tabs: Reçues vs Émises */}
                  <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5">
                    <button
                      onClick={() => setDirectiveTab('received')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        directiveTab === 'received'
                          ? 'bg-[#4F6CE8] text-white shadow-xs'
                          : 'text-zinc-600 dark:text-[#A1A1AA] hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      Directives Reçues
                    </button>
                    <button
                      onClick={() => setDirectiveTab('sent')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        directiveTab === 'sent'
                          ? 'bg-[#4F6CE8] text-white shadow-xs'
                          : 'text-zinc-600 dark:text-[#A1A1AA] hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      Directives Émises aux KAMs
                    </button>
                  </div>

                  {/* Bouton Créer une Directive vers un KAM */}
                  <button
                    onClick={() => setIsDirectiveModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Icons.Send size={14} />
                    <span>Émettre une Directive KAM</span>
                  </button>
                </div>

                {/* Directives Cards List */}
                <div className="flex flex-col gap-3">
                  {filteredDirectives.length === 0 ? (
                    <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-12 rounded-3xl border border-black/5 dark:border-white/5 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                      Aucune directive trouvée dans cette section.
                    </div>
                  ) : (
                    filteredDirectives.map((d) => (
                      <div
                        key={d.id}
                        className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-3 shadow-2xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/5 dark:border-white/5">
                          <div className="flex items-center gap-3 flex-wrap">
                            {/* Sender Bitmoji */}
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#4F6CE8]/10 text-[#4F6CE8] flex items-center justify-center font-extrabold text-xs overflow-hidden shrink-0">
                                <img
                                  src={`/memojis/${(d.sender_avatar || 'memoji_056.png').replace('assets/memojis/', '')}`}
                                  alt="Expéditeur"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-xs text-[#242124] dark:text-white">
                                  Émis par {d.sender_name || 'Super Admin'}
                                </span>
                                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                                  {new Date(d.created_at).toLocaleDateString('fr-FR')} à {new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            {/* Recipient Bitmoji if available */}
                            {d.recipient_name && (
                              <div className="flex items-center gap-2 sm:ml-4 sm:pl-4 sm:border-l border-black/10 dark:border-white/10">
                                <div className="w-7 h-7 rounded-full bg-[#4F6CE8]/10 flex items-center justify-center overflow-hidden shrink-0">
                                  <img
                                    src={`/memojis/${(d.recipient_avatar || (kamsList.find(k => k.id === d.recipient)?.avatar) || 'memoji_044.png').replace('assets/memojis/', '')}`}
                                    alt="Destinataire"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium text-[11px] text-zinc-700 dark:text-zinc-300">
                                    Destinataire : <strong className="font-semibold">{d.recipient_name}</strong>
                                  </span>
                                  <span className="text-[9px] text-zinc-400">
                                    {d.recipient_role || 'Key Account Manager'}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                d.priority === 'CRITICAL'
                                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                  : d.priority === 'HIGH'
                                  ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white'
                                  : 'bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300'
                              }`}
                            >
                              {d.priority === 'CRITICAL' ? 'Priorité Critique' : d.priority === 'HIGH' ? 'Priorité Haute' : 'Priorité Normale'}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                d.status === 'COMPLETED'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                  : d.status === 'IN_PROGRESS'
                                  ? 'bg-[#4F6CE8]/15 text-[#4F6CE8]'
                                  : 'bg-black/5 dark:bg-white/10 text-zinc-500'
                              }`}
                            >
                              {d.status === 'COMPLETED' ? 'Traitée' : d.status === 'IN_PROGRESS' ? 'En cours' : 'Nouvelle'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <h4 className="font-extrabold text-sm text-[#242124] dark:text-white">
                            {d.title}
                          </h4>
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                            {d.instruction}
                          </p>
                          {d.target_account_name && (
                            <span className="text-[11px] text-[#4F6CE8] font-semibold mt-1">
                              Compte cible : {d.target_account_name}
                            </span>
                          )}
                        </div>

                        {d.acknowledgement_note && (
                          <div className="p-3 rounded-2xl bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 text-xs text-zinc-700 dark:text-zinc-300 mt-1">
                            <span className="font-semibold text-[#4F6CE8] block mb-1">Compte-rendu d'exécution / Réponse :</span>
                            {d.acknowledgement_note}
                          </div>
                        )}

                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => {
                              setSelectedDirectiveToAck(d);
                              setAckNote(d.acknowledgement_note || '');
                              setAckStatus(d.status === 'SENT' ? 'IN_PROGRESS' : d.status);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                          >
                            <Icons.MessageSquare size={13} />
                            <span>{d.status === 'COMPLETED' ? "Mettre à jour la note" : "Prendre en compte / Répondre"}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* VUE 6 : PARAMÈTRES & FAQ (Knowledge Base)                                 */}
            {/* ========================================================================= */}
            {activeView === 'settings' && (
              <div className="flex flex-col gap-6 max-w-4xl">
                {/* 1. Profil & Sélection d'Avatar Memoji */}
                <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-5">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-[#4F6CE8]/15 border border-[#4F6CE8]/30 flex items-center justify-center overflow-hidden shrink-0">
                      <img
                        src={`/memojis/${(user?.avatar || 'memoji_056.png').replace('assets/memojis/', '')}`}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                        {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
                      </h3>
                      <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                        Gérant de la Direction KAM Office • {user?.email}
                      </p>
                    </div>
                  </div>

                  {avatarSuccessMsg && (
                    <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                      {avatarSuccessMsg}
                    </div>
                  )}

                  {avatarErrorMsg && (
                    <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                      {avatarErrorMsg}
                    </div>
                  )}

                  {/* Filtres de Genre */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Filtrer les avatars :</span>
                    <button
                      type="button"
                      onClick={() => setMemojiGenderFilter('all')}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        memojiGenderFilter === 'all'
                          ? 'bg-[#4F6CE8] text-white'
                          : 'bg-white dark:bg-[#363336] text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      Tous ({memojisCatalog.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemojiGenderFilter('homme')}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        memojiGenderFilter === 'homme'
                          ? 'bg-[#4F6CE8] text-white'
                          : 'bg-white dark:bg-[#363336] text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      Hommes ({memojisCatalog.filter((m) => m.gender === 'homme').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemojiGenderFilter('femme')}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        memojiGenderFilter === 'femme'
                          ? 'bg-[#4F6CE8] text-white'
                          : 'bg-white dark:bg-[#363336] text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      Femmes ({memojisCatalog.filter((m) => m.gender === 'femme').length})
                    </button>
                  </div>

                  {/* Galerie Memojis */}
                  <div className="grid grid-cols-6 sm:grid-cols-10 gap-2.5 max-h-56 overflow-y-auto p-2 rounded-2xl bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5">
                    {memojisCatalog
                      .filter((m) => memojiGenderFilter === 'all' || m.gender === memojiGenderFilter)
                      .map((m) => {
                        const isSelected = (user?.avatar || 'memoji_056.png').replace('assets/memojis/', '') === m.filename;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleSelectAvatar(m.filename)}
                            disabled={savingAvatar}
                            className={`w-12 h-12 rounded-2xl overflow-hidden border-2 transition-all p-0.5 cursor-pointer ${
                              isSelected
                                ? 'border-[#4F6CE8] scale-105 shadow-md shadow-[#4F6CE8]/20'
                                : 'border-transparent hover:border-black/20 dark:hover:border-white/20'
                            }`}
                          >
                            <img
                              src={`/memojis/${m.filename}`}
                              alt={`Memoji ${m.id}`}
                              className="w-full h-full object-cover rounded-xl"
                            />
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* 2. FAQ & Règles de Gestion KAM Office */}
                <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-6 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Icons.HelpCircle size={18} className="text-[#4F6CE8]" />
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                      Foire Aux Questions & Règles de Gestion KAM Office
                    </h3>
                  </div>

                  {/* Accordion List (Zero Emojis, Clean Vector Chevrons) */}
                  <div className="flex flex-col gap-2">
                    {[
                      {
                        q: "Quelle est la règle de segmentation entre Grands Comptes et PME Stratégiques ?",
                        a: "Un compte est classifié en Grand Compte (GRAND_COMPTE) lorsque son chiffre d'affaires annuel dépasse 1 000 000 USD ou lorsqu'il possède un caractère multisites hautement stratégique. En dessous de ce seuil et jusqu'à 100 000 USD, il s'agit d'une PME Stratégique (PME). Le KAM Office concentre exclusivement ses efforts sur ces deux segments à haute valeur ajoutée.",
                      },
                      {
                        q: "Comment fonctionne l'attribution des comptes clés à un KAM individuel ?",
                        a: "Le gérant du KAM Office affecte nominativement chaque entreprise à un KAM depuis les onglets Portefeuille, Grands Comptes ou PME. Une fois affecté, le compte apparaît immédiatement dans l'interface de travail du KAM concerné. Par mesure de sécurité et de confidentialité, les autres KAMs n'ont pas accès à ce dossier.",
                      },
                      {
                        q: "Que faire lorsqu'un compte stratégique n'est pas encore attribué ?",
                        a: "Les comptes sans KAM restent dans le vivier 'Non affectés'. Vous pouvez les filtrer en un clic grâce au filtre d'affectation puis cliquer sur 'Affecter KAM' pour désigner le profil le plus adapté en fonction de sa spécialité (Grands Comptes vs PME) et de sa charge de travail actuelle.",
                      },
                      {
                        q: "Comment sont traitées les Directives Administratives émises par le Super Admin ?",
                        a: "Les directives envoyées par la direction générale arrivent dans l'onglet Directives (sous-onglet Reçues). Vous pouvez accuser réception et consigner un compte-rendu d'exécution avec note de traitement. Vous pouvez également relayer des directives ciblées vers un KAM précis pour lui assigner une mission prioritaire.",
                      },
                      {
                        q: "Un KAM peut-il modifier lui-même son périmètre d'entreprises ?",
                        a: "Non. Le cloisonnement strict du système Onbora réserve la gouvernance des portefeuilles exclusivement au gérant du KAM Office et à l'Administrateur général. Les KAMs disposent uniquement d'un droit de consultation et d'exécution sur les comptes qui leur sont explicitement délégués.",
                      },
                    ].map((item, idx) => {
                      const isOpen = faqOpenIndex === idx;
                      return (
                        <div
                          key={idx}
                          className="rounded-2xl bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 overflow-hidden transition-all"
                        >
                          <button
                            onClick={() => setFaqOpenIndex(isOpen ? null : idx)}
                            className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-zinc-900 dark:text-white cursor-pointer hover:bg-black/2 dark:hover:bg-white/2"
                          >
                            <span>{item.q}</span>
                            {isOpen ? <Icons.ChevronUp size={16} /> : <Icons.ChevronDown size={16} />}
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-4 text-xs text-[#6E6C67] dark:text-[#A1A1AA] leading-relaxed border-t border-black/5 dark:border-white/5 pt-3">
                              {item.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 7. COPILOTE IA CONVERSATIONNEL DÉDIÉ */}
            {activeView === 'copilot' && (
              <CopilotChatView userRole="KAM_MANAGER" />
            )}

          </div>
        </main>

        {/* ========================================================================= */}
        {/* MODALE : AFFECTATION D'UN COMPTE À UN KAM                                 */}
        {/* ========================================================================= */}
        {selectedAccountToAssign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-lg bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-2xl border border-black/10 dark:border-white/10 flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Affectation du Compte Clé
                  </h3>
                  <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                    {selectedAccountToAssign.name} ({selectedAccountToAssign.segment === 'GRAND_COMPTE' ? 'Grand Compte' : 'PME Stratégique'})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAccountToAssign(null)}
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 cursor-pointer"
                >
                  <Icons.X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Sélectionnez le Key Account Manager responsable :
                </label>

                <select
                  value={targetKamIdToAssign || ''}
                  onChange={(e) => setTargetKamIdToAssign(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-2xl p-3 text-xs font-semibold text-zinc-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="">-- Vivier Non Affecté (Désaffecter) --</option>
                  {kamsList.map((kam) => (
                    <option key={kam.id} value={kam.id}>
                      {kam.full_name} ({kam.kam_specialization === 'GRAND_COMPTE' ? 'Pôle Grands Comptes' : 'Pôle PME'}) • {kam.assigned_total_count} comptes en cours
                    </option>
                  ))}
                </select>

                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-[11px] text-[#6E6C67] dark:text-[#A1A1AA] leading-relaxed">
                  L'affectation délègue l'accès complet au dossier client, au brief pré-visite et à la cartographie d'architecture cible dans l'espace de ce KAM.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAccountToAssign(null)}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-[#363336] text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/5 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAssignment}
                  disabled={assigningAccount}
                  className="px-5 py-2 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {assigningAccount && <Icons.Loader size={14} className="animate-spin" />}
                  <span>Confirmer l'affectation</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODALE : CRÉATION D'UN NOUVEAU KEY ACCOUNT MANAGER                        */}
        {/* ========================================================================= */}
        {isCreateKamModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-lg bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-2xl border border-black/10 dark:border-white/10 flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Créer un Nouveau Compte KAM
                  </h3>
                  <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                    Ajouter un gestionnaire de portefeuille à l'équipe
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateKamModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 cursor-pointer"
                >
                  <Icons.X size={16} />
                </button>
              </div>

              {createKamError && (
                <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  {createKamError}
                </div>
              )}

              <form onSubmit={handleCreateKamSubmit} className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Prénom</label>
                    <input
                      type="text"
                      required
                      value={newKamForm.first_name}
                      onChange={(e) => setNewKamForm({ ...newKamForm, first_name: e.target.value })}
                      placeholder="Chantal"
                      className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Nom</label>
                    <input
                      type="text"
                      required
                      value={newKamForm.last_name}
                      onChange={(e) => setNewKamForm({ ...newKamForm, last_name: e.target.value })}
                      placeholder="Kanyinda"
                      className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Identifiant Unique</label>
                    <input
                      type="text"
                      required
                      value={newKamForm.username}
                      onChange={(e) => setNewKamForm({ ...newKamForm, username: e.target.value })}
                      placeholder="kam_nom"
                      className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Mot de Passe</label>
                    <input
                      type="password"
                      required
                      value={newKamForm.password}
                      onChange={(e) => setNewKamForm({ ...newKamForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Email Professionnel</label>
                    <input
                      type="email"
                      value={newKamForm.email}
                      onChange={(e) => setNewKamForm({ ...newKamForm, email: e.target.value })}
                      placeholder="kam@onbora.cg"
                      className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Téléphone</label>
                    <input
                      type="text"
                      value={newKamForm.phone}
                      onChange={(e) => setNewKamForm({ ...newKamForm, phone: e.target.value })}
                      placeholder="+243..."
                      className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Pôle de Spécialisation</label>
                  <select
                    value={newKamForm.kam_specialization}
                    onChange={(e) => setNewKamForm({ ...newKamForm, kam_specialization: e.target.value as any })}
                    className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="GRAND_COMPTE">Pôle Grands Comptes (&gt; 1M$)</option>
                    <option value="PME">Pôle PME Stratégiques (100k$ - 1M$)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateKamModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white dark:bg-[#363336] text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/5 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creatingKam}
                    className="px-5 py-2 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-50"
                  >
                    {creatingKam ? "Création en cours..." : "Créer le compte"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODALE : ÉMISSION D'UNE DIRECTIVE STRATÉGIQUE VERS UN KAM                  */}
        {/* ========================================================================= */}
        {isDirectiveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-lg bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-2xl border border-black/10 dark:border-white/10 flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Émettre une Directive Stratégique
                  </h3>
                  <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                    Assigner un ordre opérationnel ou une priorité à un KAM
                  </p>
                </div>
                <button
                  onClick={() => setIsDirectiveModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 cursor-pointer"
                >
                  <Icons.X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateDirective} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">KAM Destinataire</label>
                  <select
                    required
                    value={newDirectiveRecipientId}
                    onChange={(e) => setNewDirectiveRecipientId(e.target.value)}
                    className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="">-- Choisir le KAM --</option>
                    {kamsList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.full_name} ({k.kam_specialization === 'GRAND_COMPTE' ? 'GC' : 'PME'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Objet de la Directive</label>
                  <input
                    type="text"
                    required
                    value={newDirectiveTitle}
                    onChange={(e) => setNewDirectiveTitle(e.target.value)}
                    placeholder="ex: Priorité de raccordement et rendez-vous DSI"
                    className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Priorité</label>
                    <select
                      value={newDirectivePriority}
                      onChange={(e) => setNewDirectivePriority(e.target.value as any)}
                      className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none cursor-pointer"
                    >
                      <option value="NORMAL">Normale</option>
                      <option value="HIGH">Haute</option>
                      <option value="CRITICAL">Critique</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Compte Clé Cible (optionnel)</label>
                    <input
                      type="text"
                      value={newDirectiveTargetAccount}
                      onChange={(e) => setNewDirectiveTargetAccount(e.target.value)}
                      placeholder="ex: Société Minière de Bisunzu"
                      className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Consigne & Instruction Détaillée</label>
                  <textarea
                    required
                    rows={3}
                    value={newDirectiveInstruction}
                    onChange={(e) => setNewDirectiveInstruction(e.target.value)}
                    placeholder="Détaillez les actions attendues du KAM..."
                    className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl p-3 text-xs font-medium text-zinc-900 dark:text-white outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsDirectiveModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white dark:bg-[#363336] text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/5 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creatingDirective}
                    className="px-5 py-2 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-50"
                  >
                    {creatingDirective ? "Envoi en cours..." : "Transmettre la Directive"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODALE : ACCUSÉ DE RÉCEPTION D'UNE DIRECTIVE REÇUE                         */}
        {/* ========================================================================= */}
        {selectedDirectiveToAck && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-md bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-2xl border border-black/10 dark:border-white/10 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Accusé de Traitement
                  </h3>
                  <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                    {selectedDirectiveToAck.title}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDirectiveToAck(null)}
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 cursor-pointer"
                >
                  <Icons.X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Statut de réalisation</label>
                  <select
                    value={ackStatus}
                    onChange={(e) => setAckStatus(e.target.value as any)}
                    className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="IN_PROGRESS">En cours d'exécution</option>
                    <option value="COMPLETED">Traité & Complété</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Compte-rendu / Note de suivi</label>
                  <textarea
                    rows={3}
                    value={ackNote}
                    onChange={(e) => setAckNote(e.target.value)}
                    placeholder="Précisez les mesures prises ou le résultat obtenu..."
                    className="bg-white dark:bg-[#363336] border border-black/10 dark:border-white/10 rounded-xl p-3 text-xs font-medium text-zinc-900 dark:text-white outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDirectiveToAck(null)}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-[#363336] text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/5 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveAck}
                  disabled={savingAck}
                  className="px-5 py-2 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingAck ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODALE : FICHE DÉTAILLÉE DU COMPTE ENTREPRISE                              */}
        {/* ========================================================================= */}
        {selectedAccountForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-xl bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-2xl border border-black/10 dark:border-white/10 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
              
              {/* En-tête */}
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-900 dark:bg-black text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                    {selectedAccountForDetail.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-sm text-[#242124] dark:text-white">
                        {selectedAccountForDetail.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedAccountForDetail.segment === 'GRAND_COMPTE'
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                          : 'bg-[#4F6CE8]/15 text-[#4F6CE8]'
                      }`}>
                        {selectedAccountForDetail.segment === 'GRAND_COMPTE' ? 'Grand Compte (> 1M$)' : 'PME Stratégique'}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                      {selectedAccountForDetail.crm_id || `CRM-${selectedAccountForDetail.id}`} • {selectedAccountForDetail.city}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAccountForDetail(null)}
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <Icons.X size={16} />
                </button>
              </div>

              {/* Grille d'Informations */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Secteur & Localisation</span>
                  <span className="font-semibold text-[#242124] dark:text-white mt-0.5">
                    {selectedAccountForDetail.sector || 'Secteur Tertiaire'}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {selectedAccountForDetail.commune ? `${selectedAccountForDetail.commune}, ` : ''}{selectedAccountForDetail.city}
                  </span>
                </div>

                <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Identifiants Légaux</span>
                  <span className="font-mono font-semibold text-[#242124] dark:text-white mt-0.5">
                    RCCM : {selectedAccountForDetail.rccm || 'Non renseigné'}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">
                    ID.NAT / NIF : Valide RDC
                  </span>
                </div>

                <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Chiffre d'Affaires & Effectif</span>
                  <span className="font-bold text-[#4F6CE8] mt-0.5">
                    {Number(selectedAccountForDetail.annual_revenue).toLocaleString('fr-FR')} $ / an
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {selectedAccountForDetail.employee_count || 50} collaborateurs
                  </span>
                </div>

                <div className="bg-white dark:bg-[#363336] p-3 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col">
                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Contact Décisionnaire Enregistré</span>
                  <span className="font-semibold text-[#242124] dark:text-white mt-0.5">
                    {selectedAccountForDetail.contact_name || 'Direction Générale'}
                  </span>
                  <span className="text-[10px] text-[#4F6CE8] font-mono">
                    {selectedAccountForDetail.contact_phone || 'Aucun numéro renseigné'}
                  </span>
                  {selectedAccountForDetail.contact_email && (
                    <span className="text-[10px] text-zinc-500 truncate">
                      {selectedAccountForDetail.contact_email}
                    </span>
                  )}
                </div>
              </div>

              {/* Solution Donnée / Proposée & Concurrence */}
              <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
                    Solution Donnée & Architecture Cible
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Opérateur en place : <strong className="text-zinc-700 dark:text-zinc-300">{selectedAccountForDetail.current_operator || 'Vodacom'}</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-black/5 dark:border-white/5">
                  <span className="font-bold text-[#4F6CE8]">
                    {selectedAccountForDetail.recommended_solution || (selectedAccountForDetail.segment === 'GRAND_COMPTE' ? 'Liaison Fibre Dédiée Symétrique 1 Gbps + SD-WAN Managé & Double Adduction' : 'Pack Entreprise Fibre Pro 200 Mbps + Téléphonie IP')}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                    99.99% SLA
                  </span>
                </div>
              </div>

              {/* Remises & Conditions Accordées */}
              <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-2 text-xs">
                <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">
                  Remises & Barèmes Accordés
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-black/3 dark:bg-white/3 flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Remise Engagement Pluriannuel :</span>
                    <strong className="text-[#4F6CE8] font-mono">-15% (36 mois)</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-black/3 dark:bg-white/3 flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Frais de Raccordement Optique :</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Offerts</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-black/3 dark:bg-white/3 flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Bascule Secours 4G/Satellite :</span>
                    <strong className="text-zinc-900 dark:text-white font-semibold">Incluse</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-black/3 dark:bg-white/3 flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Modalité de Facturation :</span>
                    <strong className="text-zinc-900 dark:text-white font-semibold">Terme échu (Net 30)</strong>
                  </div>
                </div>
              </div>

              {/* KAM Affecté */}
              <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center font-extrabold text-xs overflow-hidden shrink-0">
                    {selectedAccountForDetail.assigned_kam ? (
                      <img
                        src={`/memojis/${(selectedAccountForDetail.assigned_kam.avatar || 'memoji_044.png').replace('assets/memojis/', '')}`}
                        alt="KAM"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icons.User size={16} className="text-zinc-400" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">Key Account Manager Dédié</span>
                    <span className="font-bold text-[#242124] dark:text-white">
                      {selectedAccountForDetail.assigned_kam?.full_name || 'Aucun KAM assigné'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const acc = selectedAccountForDetail;
                    setSelectedAccountForDetail(null);
                    handleOpenAssignModal(acc);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Icons.UserPlus size={13} />
                  <span>{selectedAccountForDetail.assigned_kam ? "Changer d'affectation" : "Affecter un KAM"}</span>
                </button>
              </div>

              {/* Footer */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedAccountForDetail(null)}
                  className="px-5 py-2 rounded-2xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-900 dark:text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
