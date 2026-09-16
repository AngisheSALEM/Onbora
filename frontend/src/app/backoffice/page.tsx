"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/lib/api';
import Logo from '@/components/shared/Logo';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { Icons } from '@/components/shared/Icons';
import BackofficePagination from '@/components/backoffice/BackofficePagination';
import DailyReportView from '@/components/backoffice/DailyReportView';
import EnterpriseActionsModal from '@/components/backoffice/EnterpriseActionsModal';
import ProfilePhotoUploader from '@/components/shared/ProfilePhotoUploader';
import ThemeSettingCard from '@/components/shared/ThemeSettingCard';
import UserAvatar from '@/components/kam/UserAvatar';

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
  | 'daily_report'
  | 'salespersons'
  | 'map'
  | 'plaques_list'
  | 'soho_directory'
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
  last_visited_by?: number;
  last_visited_by_name?: string;
}

interface VisitReportItem {
  id: number;
  salesperson_id?: number;
  salesperson_name?: string;
  enterprise_id?: number;
  enterprise_name?: string;
  plaque_code?: string;
  executive_summary: string;
  confirmed_needs: string[];
  objections_raised: string[];
  actions_todo: string[];
  follow_up_email_draft?: string;
  ai_feedback_rating?: number | null;
  ai_feedback_comments?: string;
  created_at: string;
}

interface VisitSubmissionItem {
  id: number;
  enterprise: number;
  enterprise_name: string;
  enterprise_sector?: string;
  enterprise_commune?: string;
  plaque_code?: string;
  salesperson?: number;
  salesperson_name?: string;
  target_offer_name: string;
  answers: { question_id?: string; question_text?: string; answer?: any }[];
  ai_summary: string;
  qualification_score: number;
  detected_needs: string[];
  objections_noted?: string;
  next_action?: string;
  status: string;
  created_at: string;
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
  profile_picture_url?: string;
  assigned_plaques: string[];
  reports_count: number;
  visits_count: number;
  form_submissions_count: number;
  conversions_count?: number;
  converted_amount?: number;
  incentive_points: number;
}

export default function BackofficeCommandCenterPage() {
  const { user, logout, loading: authLoading, updateUser } = useAuth();

  // Navigation State
  const [activeView, setActiveView] = useState<BackofficeView>('soho_managed');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Settings & Profile Picture State
  const [profilePictureInput, setProfilePictureInput] = useState('');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarSuccessMsg, setAvatarSuccessMsg] = useState('');
  const [avatarErrorMsg, setAvatarErrorMsg] = useState('');
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

  // Initialize profile picture input from user
  useEffect(() => {
    if (user) {
      setProfilePictureInput((user as any).profile_picture_url || user.avatar || '');
    }
  }, [user]);

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
  const [salespersonDetailTab, setSalespersonDetailTab] = useState<'enterprises' | 'reports'>('enterprises');
  const [salespersonDetailFilter, setSalespersonDetailFilter] = useState<'ALL' | 'VISITED' | 'UNVISITED'>('ALL');
  const [salespersonDetailSearch, setSalespersonDetailSearch] = useState('');
  const [salespersonDetailReportsFilter, setSalespersonDetailReportsFilter] = useState<'ALL' | 'FORMS' | 'AI_REPORTS'>('ALL');
  const [salespersonReports, setSalespersonReports] = useState<VisitReportItem[]>([]);
  const [salespersonSubmissions, setSalespersonSubmissions] = useState<VisitSubmissionItem[]>([]);
  const [loadingSalespersonReports, setLoadingSalespersonReports] = useState(false);
  const [selectedReportToInspect, setSelectedReportToInspect] = useState<any | null>(null);
  const [selectedEnterpriseForActions, setSelectedEnterpriseForActions] = useState<EnterpriseItem | null>(null);

  // Data State
  const [loading, setLoading] = useState(true);
  const [plaques, setPlaques] = useState<PlaqueItem[]>([]);
  const [enterprises, setEnterprises] = useState<EnterpriseItem[]>([]);
  const [salespersons, setSalespersons] = useState<SalespersonItem[]>([]);
  const [recentReportsFeed, setRecentReportsFeed] = useState<VisitReportItem[]>([]);
  const [recentFormSubmissions, setRecentFormSubmissions] = useState<VisitSubmissionItem[]>([]);

  // Auto-Dispatch State
  const [dispatchingPlaqueId, setDispatchingPlaqueId] = useState<number | null>(null);
  const [dispatchNotification, setDispatchNotification] = useState<{
    plaqueCode: string;
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Filters State for de très petites entreprises / TPE Accounts
  const [sohoVisitFilter, setSohoVisitFilter] = useState<'ALL' | 'VISITED' | 'UNVISITED'>('ALL');
  const [sohoAssignmentFilter, setSohoAssignmentFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [sohoPlaqueFilter, setSohoPlaqueFilter] = useState<string>('ALL');
  const [sohoCommercialFilter, setSohoCommercialFilter] = useState<string>('ALL');
  const [sohoStatusFilter, setSohoStatusFilter] = useState<
    'ALL' | 'ASSIGNED_UNVISITED' | 'ASSIGNED_UNCONVERTED' | 'VISITED' | 'UNVISITED' | 'CONVERTED' | 'UNASSIGNED'
  >('ALL');

  // Pagination states for each view table
  const [sohoPage, setSohoPage] = useState<number>(1);
  const [sohoPageSize, setSohoPageSize] = useState<number>(10);
  const [salespersonsPage, setSalespersonsPage] = useState<number>(1);
  const [salespersonsPageSize, setSalespersonsPageSize] = useState<number>(10);
  const [plaquesPage, setPlaquesPage] = useState<number>(1);
  const [plaquesPageSize, setPlaquesPageSize] = useState<number>(10);
  const [plaqueDetailPage, setPlaqueDetailPage] = useState<number>(1);
  const [plaqueDetailPageSize, setPlaqueDetailPageSize] = useState<number>(10);
  const [salespersonDetailPage, setSalespersonDetailPage] = useState<number>(1);
  const [salespersonDetailPageSize, setSalespersonDetailPageSize] = useState<number>(10);
  const [directoryPage, setDirectoryPage] = useState<number>(1);
  const [directoryPageSize, setDirectoryPageSize] = useState<number>(10);

  // List filter states for each view
  const [salespersonFilter, setSalespersonFilter] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE' | 'WITH_PLAQUES' | 'NO_PLAQUES'>('ALL');
  const [plaquesListFilter, setPlaquesListFilter] = useState<'ALL' | 'WITH_SALESPERSONS' | 'NO_SALESPERSONS' | 'COVERED' | 'TO_PROSPECT'>('ALL');
  const [plaqueCityFilter, setPlaqueCityFilter] = useState<string>('ALL');
  const [directoryVisitFilter, setDirectoryVisitFilter] = useState<'ALL' | 'VISITED' | 'UNVISITED'>('ALL');
  const [directoryStatusFilter, setDirectoryStatusFilter] = useState<'ALL' | 'CONVERTED' | 'PROSPECT'>('ALL');

  const [selectedAccountForDetail, setSelectedAccountForDetail] = useState<EnterpriseItem | null>(null);

  // Salesperson Modal State
  const [isAddSalespersonOpen, setIsAddSalespersonOpen] = useState(false);
  const [creatingSalesperson, setCreatingSalesperson] = useState(false);
  const [salespersonCreateError, setSalespersonCreateError] = useState('');
  const [salespersonForm, setSalespersonForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    location: 'Kinshasa',
    avatar: '/avatars/default_avatar.svg',
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

  // Load Dashboard Data (includes all reports and submissions)
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashData, repData, subData] = await Promise.all([
        fetchAPI('/api/sales/supervisor-dashboard/'),
        fetchAPI('/api/sales/visit-reports/').catch(() => []),
        fetchAPI('/api/sales/visit-form/submissions/').catch(() => []),
      ]);
      setPlaques(Array.isArray(dashData?.plaques) ? dashData.plaques : []);
      setEnterprises(Array.isArray(dashData?.enterprises) ? dashData.enterprises : []);
      setSalespersons(Array.isArray(dashData?.salespersons) ? dashData.salespersons : []);

      // Combine feed from dashboard with all visit reports and form submissions (deduplicated)
      const combinedReports = [
        ...(Array.isArray(dashData?.recent_reports_feed) ? dashData.recent_reports_feed : []),
        ...(Array.isArray(repData) ? repData : []),
      ];
      const seenRep = new Set<number>();
      const uniqueReports: VisitReportItem[] = [];
      combinedReports.forEach((r: any) => {
        if (r?.id && !seenRep.has(r.id)) {
          seenRep.add(r.id);
          uniqueReports.push(r);
        }
      });
      setRecentReportsFeed(uniqueReports);

      const combinedSubs = [
        ...(Array.isArray(dashData?.recent_form_submissions) ? dashData.recent_form_submissions : []),
        ...(Array.isArray(subData) ? subData : []),
      ];
      const seenSub = new Set<number>();
      const uniqueSubs: VisitSubmissionItem[] = [];
      combinedSubs.forEach((s: any) => {
        if (s?.id && !seenSub.has(s.id)) {
          seenSub.add(s.id);
          uniqueSubs.push(s);
        }
      });
      setRecentFormSubmissions(uniqueSubs);
    } catch (err: any) {
      console.error("Erreur lors du chargement du cockpit superviseur:", err);
    } finally {
      setLoading(false);
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

  // Charger en direct l'historique complet des rapports et formulaires de visite du commercial sélectionné
  useEffect(() => {
    if (!selectedSalespersonDetail) {
      setSalespersonReports([]);
      setSalespersonSubmissions([]);
      return;
    }
    let isMounted = true;
    const fetchReports = async () => {
      setLoadingSalespersonReports(true);
      try {
        const [repData, subData] = await Promise.all([
          fetchAPI(`/api/sales/visit-reports/?salesperson_id=${selectedSalespersonDetail.id}`),
          fetchAPI(`/api/sales/visit-form/submissions/?salesperson_id=${selectedSalespersonDetail.id}`),
        ]);
        if (isMounted) {
          setSalespersonReports(Array.isArray(repData) ? repData : []);
          setSalespersonSubmissions(Array.isArray(subData) ? subData : []);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des comptes-rendus du commercial:", err);
      } finally {
        if (isMounted) setLoadingSalespersonReports(false);
      }
    };
    fetchReports();
    return () => {
      isMounted = false;
    };
  }, [selectedSalespersonDetail?.id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Sélection & Sauvegarde de la Photo de Profil / Avatar
  const handleSaveProfilePicture = async (newUrlOrAvatar: string) => {
    setSavingAvatar(true);
    setAvatarErrorMsg('');
    try {
      await fetchAPI('/api/accounts/me/', {
        method: 'PATCH',
        body: JSON.stringify({ avatar: newUrlOrAvatar, profile_picture_url: newUrlOrAvatar }),
      });
      if (updateUser) {
        updateUser({ avatar: newUrlOrAvatar, profile_picture_url: newUrlOrAvatar } as any);
      }
      setAvatarSuccessMsg("Photo de profil mise à jour avec succès !");
      setTimeout(() => setAvatarSuccessMsg(''), 3500);
    } catch (err: any) {
      console.error(err);
      setAvatarErrorMsg(err.message || "Erreur lors de la mise à jour de la photo de profil.");
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
        message: res.message || `${res.assigned_count || 0} comptes de très petites entreprises affectés avec succès.`,
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
        avatar: '',
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

  // Aggregated visit info per enterprise (exact count, latest date, salesperson, and report)
  const enterpriseVisitsMap = useMemo(() => {
    const map = new Map<number, { count: number; lastVisitDate?: string; lastSalesperson?: string; lastReport?: any }>();

    // Process recentReportsFeed
    (recentReportsFeed || []).forEach((r) => {
      if (!r.enterprise_id) return;
      const prev = map.get(r.enterprise_id) || { count: 0 };
      map.set(r.enterprise_id, {
        count: prev.count + 1,
        lastVisitDate: prev.lastVisitDate || r.created_at,
        lastSalesperson: prev.lastSalesperson || r.salesperson_name,
        lastReport: prev.lastReport || { ...r, type: 'REPORT' },
      });
    });

    // Process recentFormSubmissions
    (recentFormSubmissions || []).forEach((s) => {
      const eid = typeof s.enterprise === 'object' ? (s.enterprise as any).id : s.enterprise;
      const entId = eid || (s as any).enterprise_id;
      if (!entId) return;
      const prev = map.get(entId) || { count: 0 };
      map.set(entId, {
        count: prev.count + 1,
        lastVisitDate: prev.lastVisitDate || s.created_at,
        lastSalesperson: prev.lastSalesperson || s.salesperson_name,
        lastReport: prev.lastReport || { ...s, type: 'SUBMISSION' },
      });
    });

    return map;
  }, [recentReportsFeed, recentFormSubmissions]);

  const getEnterpriseVisitInfo = useCallback((ent: EnterpriseItem) => {
    const info = enterpriseVisitsMap.get(ent.id);
    const count = info?.count || (ent.is_visited ? 1 : 0);
    const isVisited = ent.is_visited || count > 0;
    const label = !isVisited || count === 0 ? "Non visité" : count === 1 ? "1 visite" : `${count} visites`;
    return {
      count,
      isVisited,
      label,
      lastVisitDate: info?.lastVisitDate || ent.last_visited_at,
      lastSalesperson: info?.lastSalesperson || ent.last_visited_by_name || ent.assigned_salesperson_name,
      lastReport: info?.lastReport,
    };
  }, [enterpriseVisitsMap]);

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

  // Filtered de très petites entreprises Managed Accounts (multi-critères avec recherche globale)
  const filteredSohoAccounts = useMemo(() => {
    const list = Array.isArray(enterprises) ? enterprises : [];
    return list.filter((ent) => {
      const vInfo = getEnterpriseVisitInfo(ent);
      const isConverted = ent.is_converted || ent.conversion_status === 'CONVERTED';

      // 1. Statut combiné & suivi entreprise
      if (sohoStatusFilter === 'ASSIGNED_UNVISITED') {
        if (!ent.assigned_salesperson || vInfo.isVisited) return false;
      } else if (sohoStatusFilter === 'ASSIGNED_UNCONVERTED') {
        if (!ent.assigned_salesperson || isConverted) return false;
      } else if (sohoStatusFilter === 'VISITED') {
        if (!vInfo.isVisited) return false;
      } else if (sohoStatusFilter === 'UNVISITED') {
        if (vInfo.isVisited) return false;
      } else if (sohoStatusFilter === 'CONVERTED') {
        if (!isConverted) return false;
      } else if (sohoStatusFilter === 'UNASSIGNED') {
        if (ent.assigned_salesperson) return false;
      }

      // 2. Plaque
      if (sohoPlaqueFilter !== 'ALL') {
        const matchesPlaque =
          ent.plaque_code === sohoPlaqueFilter ||
          ent.plaque === sohoPlaqueFilter ||
          String((ent as any).plaque_rel) === sohoPlaqueFilter;
        if (!matchesPlaque) return false;
      }

      // 3. Commercial
      if (sohoCommercialFilter !== 'ALL') {
        if (String(ent.assigned_salesperson) !== sohoCommercialFilter) return false;
      }

      // 4. Recherche globale
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
  }, [enterprises, getEnterpriseVisitInfo, sohoStatusFilter, sohoPlaqueFilter, sohoCommercialFilter, searchQuery]);

  // Paginated de très petites entreprises / TPE accounts
  const paginatedSohoAccounts = useMemo(() => {
    const start = (sohoPage - 1) * sohoPageSize;
    return filteredSohoAccounts.slice(start, start + sohoPageSize);
  }, [filteredSohoAccounts, sohoPage, sohoPageSize]);

  // Paginated Salespersons
  const paginatedSalespersons = useMemo(() => {
    const start = (salespersonsPage - 1) * salespersonsPageSize;
    return sortedSalespersons.slice(start, start + salespersonsPageSize);
  }, [sortedSalespersons, salespersonsPage, salespersonsPageSize]);

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

  // Paginated Plaques
  const paginatedPlaques = useMemo(() => {
    const start = (plaquesPage - 1) * plaquesPageSize;
    return filteredPlaques.slice(start, start + plaquesPageSize);
  }, [filteredPlaques, plaquesPage, plaquesPageSize]);

  // de très petites entreprises Directory Accounts (avec filtres statut/visite et recherche)
  const filteredDirectoryAccounts = useMemo(() => {
    const list = Array.isArray(enterprises) ? enterprises : [];
    return list.filter((ent) => {
      const vInfo = getEnterpriseVisitInfo(ent);
      if (directoryVisitFilter === 'VISITED' && !vInfo.isVisited) return false;
      if (directoryVisitFilter === 'UNVISITED' && vInfo.isVisited) return false;

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
  }, [enterprises, getEnterpriseVisitInfo, directoryVisitFilter, directoryStatusFilter, searchQuery]);

  // Paginated Directory Accounts
  const paginatedDirectoryAccounts = useMemo(() => {
    const start = (directoryPage - 1) * directoryPageSize;
    return filteredDirectoryAccounts.slice(start, start + directoryPageSize);
  }, [filteredDirectoryAccounts, directoryPage, directoryPageSize]);

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

  // Paginated Plaque Detail Accounts
  const paginatedPlaqueDetailAccounts = useMemo(() => {
    const start = (plaqueDetailPage - 1) * plaqueDetailPageSize;
    return filteredPlaqueDetailAccounts.slice(start, start + plaqueDetailPageSize);
  }, [filteredPlaqueDetailAccounts, plaqueDetailPage, plaqueDetailPageSize]);

  // Dedicated Salesperson Detail: all enterprises assigned to this salesperson or in their plaques or visited by them
  const salespersonAssignedEnterprisesAll = useMemo(() => {
    if (!selectedSalespersonDetail) return [];
    const list = Array.isArray(enterprises) ? enterprises : [];
    const assignedPlaqueCodes = new Set(selectedSalespersonDetail.assigned_plaques || []);
    
    // Set of enterprise IDs that have reports or submissions by this salesperson
    const visitedEntIds = new Set<number>();
    salespersonReports.forEach((r) => { if (r.enterprise_id) visitedEntIds.add(r.enterprise_id); });
    salespersonSubmissions.forEach((s) => {
      const eid = typeof s.enterprise === 'object' ? (s.enterprise as any).id : s.enterprise;
      if (eid) visitedEntIds.add(eid);
      if ((s as any).enterprise_id) visitedEntIds.add((s as any).enterprise_id);
    });
    recentReportsFeed.forEach((r) => {
      if (r.salesperson_id === selectedSalespersonDetail.id && r.enterprise_id) {
        visitedEntIds.add(r.enterprise_id);
      }
    });

    return list.filter((e) => {
      if (e.assigned_salesperson === selectedSalespersonDetail.id) return true;
      if (e.last_visited_by === selectedSalespersonDetail.id) return true;
      if (visitedEntIds.has(e.id)) return true;
      if (e.plaque_code && assignedPlaqueCodes.has(e.plaque_code)) return true;
      return false;
    });
  }, [enterprises, selectedSalespersonDetail, salespersonReports, salespersonSubmissions, recentReportsFeed]);

  const salespersonDetailKpis = useMemo(() => {
    const total = salespersonAssignedEnterprisesAll.length;
    const visitedSet = new Set<number>();
    salespersonAssignedEnterprisesAll.forEach((e) => {
      if (e.is_visited) visitedSet.add(e.id);
    });
    salespersonReports.forEach((r) => { if (r.enterprise_id) visitedSet.add(r.enterprise_id); });
    salespersonSubmissions.forEach((s) => {
      const eid = typeof s.enterprise === 'object' ? (s.enterprise as any).id : s.enterprise;
      if (eid) visitedSet.add(eid);
    });
    const totalVisitsFromBackend = selectedSalespersonDetail?.visits_count || 0;
    const visited = Math.max(visitedSet.size, totalVisitsFromBackend, salespersonReports.length);
    const unvisited = Math.max(0, total - visited);
    const rate = total > 0 ? Math.min(100, Math.round((visited / total) * 100)) : 0;
    return { total, visited, unvisited, rate };
  }, [salespersonAssignedEnterprisesAll, salespersonReports, salespersonSubmissions, selectedSalespersonDetail]);

  const filteredSalespersonDetailAccounts = useMemo(() => {
    return salespersonAssignedEnterprisesAll.filter((ent) => {
      const vInfo = getEnterpriseVisitInfo(ent);
      if (salespersonDetailFilter === 'VISITED' && !vInfo.isVisited) return false;
      if (salespersonDetailFilter === 'UNVISITED' && vInfo.isVisited) return false;

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
  }, [salespersonAssignedEnterprisesAll, getEnterpriseVisitInfo, salespersonDetailFilter, salespersonDetailSearch]);

  // Paginated Salesperson Detail Accounts
  const paginatedSalespersonDetailAccounts = useMemo(() => {
    const start = (salespersonDetailPage - 1) * salespersonDetailPageSize;
    return filteredSalespersonDetailAccounts.slice(start, start + salespersonDetailPageSize);
  }, [filteredSalespersonDetailAccounts, salespersonDetailPage, salespersonDetailPageSize]);

  const navItems = [
    {
      id: 'soho_managed' as BackofficeView,
      label: 'Comptes',
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
      id: 'daily_report' as BackofficeView,
      label: 'Rapport de la journée',
      icon: Icons.FileText,
      badge: null,
    },

    {
      id: 'plaques_list' as BackofficeView,
      label: 'Plaques',
      icon: Icons.Layers,
      badge: `${plaques.length}`,
    },
    {
      id: 'map' as BackofficeView,
      label: 'Carte Territoire',
      icon: Icons.Map,
      badge: null,
    },
    {
      id: 'soho_directory' as BackofficeView,
      label: 'Annuaire ',
      icon: Icons.FileText,
      badge: null,
    },
    {
      id: 'settings' as BackofficeView,
      label: 'Paramètres',
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
                      src={user?.profile_picture_url || user?.avatar || '/avatars/default_avatar.svg'}
                      alt={user?.username || 'Superviseur'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/avatars/default_avatar.svg';
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
                    src={user?.profile_picture_url || user?.avatar || '/avatars/default_avatar.svg'}
                    alt="avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/avatars/default_avatar.svg';
                    }}
                  />
                </div>
              )}

             
            </div>
          </div>
        </aside>

        {/* 2. MAIN WORKSPACE CONTENT AREA */}
        <main className="flex-1 flex flex-col h-full overflow-hidden p-4 pl-4">
          
          {/* Top Header Bar */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5 shrink-0 mb-4">
            <div className="flex flex-col">
              <h2 className="text-xl font-550 text-[#242124] dark:text-white tracking-tight">
                {activeView === 'soho_managed' && "Portefeuille Comptes TPE"}
                {activeView === 'daily_report' && "Rapport d'Activité de la Journée"}
                {activeView === 'salespersons' && (selectedSalespersonDetail ? `Fiche Commercial – ${selectedSalespersonDetail.full_name}` : "Commerciaux Terrain & Effectif")}
                {activeView === 'map' && "Carte Territoire & Découpage des Plaques"}
                {activeView === 'plaques_list' && (selectedPlaqueDetail ? `Détail & Répartition – Plaque ${selectedPlaqueDetail.code}` : "Gestion des Plaques & Auto dispatch")}
                {activeView === 'soho_directory' && "Annuaire Exhaustif TPE"}
                {activeView === 'settings' && "Paramètres & Base de Connaissances"}
              </h2>
            </div>

            {/* Actions d'En-Tête : Recherche pilule avec croix, Actualiser, Theme */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-2 bg-white dark:bg-[#2D2A2D] px-3.5 py-2 rounded-2xl border border-black/5 dark:border-white/5 shadow-2xs">
                <Icons.Search size={14} className="text-[#6E6C67] dark:text-[#A1A1AA]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeView === 'soho_managed' || activeView === 'soho_directory'
                      ? "Filtrer compte TPE, CRM, commune..."
                      : activeView === 'salespersons'
                      ? "Rechercher commercial, plaque..."
                      : activeView === 'plaques_list'
                      ? "Rechercher plaque, code..."
                      : activeView === 'daily_report'
                      ? "Rechercher dans les rapports..."
                      : "Recherche rapide..."
                  }
                  className="bg-transparent text-xs font-550 focus:outline-none w-48 sm:w-64 text-[#242124] dark:text-white border-0 placeholder-[#6E6C67] dark:placeholder-[#A1A1AA]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer"
                  >
                    <Icons.X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  loadDashboardData();
                }}
                disabled={loading}
                title="Actualiser les données"
                className="p-2.5 rounded-2xl bg-white dark:bg-[#2D2A2D] hover:bg-black/5 dark:hover:bg-white/10 text-[#6E6C67] dark:text-white transition-all cursor-pointer border border-black/5 dark:border-white/5 disabled:opacity-50 shadow-2xs"
              >
                <Icons.Refresh size={15} className={loading ? "animate-spin" : ""} />
              </button>

               
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

            {/* VIEW 1: de très petites entreprises MANAGED ACCOUNTS */}
            {activeView === 'soho_managed' && (
              <div className="flex flex-col gap-4">
                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-4 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Total Comptes TPE</span>
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
                        onChange={(e) => {
                          setSohoStatusFilter(e.target.value as any);
                          setSohoPage(1);
                        }}
                        className="bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#242124] dark:text-white outline-none cursor-pointer"
                      >
                        <option value="ALL">Tous les statuts</option>
                        <option value="ASSIGNED_UNVISITED">Assignés non visités (urgent)</option>
                        <option value="ASSIGNED_UNCONVERTED">Assignés non convertis (en cours)</option>
                        <option value="VISITED">Visités sur le terrain</option>
                        <option value="UNVISITED">Pas encore visités</option>
                        <option value="CONVERTED">Signés / Convertis</option>
                        <option value="UNASSIGNED">Non affectés</option>
                      </select>
                    </div>

                    {/* Plaque Filter */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Plaque :</span>
                      <select
                        value={sohoPlaqueFilter}
                        onChange={(e) => {
                          setSohoPlaqueFilter(e.target.value);
                          setSohoPage(1);
                        }}
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
                    {filteredSohoAccounts.length} compte(s) TPE
                  </span>
                </div>

                {/* de très petites entreprises Accounts Table */}
                <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden flex flex-col gap-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[850px]">
                      <thead>
                        <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                          <th className="py-3 px-3.5 min-w-[180px]">Entreprise TPE</th>
                          <th className="py-3 px-3.5">Secteur & Ville</th>
                          <th className="py-3 px-3.5">Plaque</th>
                          <th className="py-3 px-3.5">Commercial Assigné</th>
                          <th className="py-3 px-3.5">Statut Visite</th>
                          <th className="py-3 px-3.5">Statut Client</th>
                          <th className="py-3 px-3.5 text-right">Actions & Suivi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {paginatedSohoAccounts.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                              Aucun compte TPE ne correspond aux filtres actuels.
                            </td>
                          </tr>
                        ) : (
                          paginatedSohoAccounts.map((account) => {
                            const isConverted = account.is_converted || account.conversion_status === 'CONVERTED';
                            const vInfo = getEnterpriseVisitInfo(account);

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
                                    <span className="text-[#242124] dark:text-white font-550">{account.sector || 'TPE / Commerce'}</span>
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
                                  {vInfo.count > 0 ? (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1 w-fit">
                                        <Icons.CheckCircle size={10} /> {vInfo.label}
                                      </span>
                                      {vInfo.lastReport && (
                                        <button
                                          onClick={() => setSelectedReportToInspect(vInfo.lastReport)}
                                          className="text-[9px] font-bold text-[#4F6CE8] hover:underline text-left cursor-pointer"
                                        >
                                          Voir dernier CR
                                        </button>
                                      )}
                                    </div>
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
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      onClick={() => setSelectedEnterpriseForActions(account)}
                                      className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#4F6CE8] transition-colors cursor-pointer"
                                      title="Consulter actions, notes et comptes-rendus"
                                    >
                                      <Icons.FileText size={13} />
                                    </button>
                                    <button
                                      onClick={() => setSelectedAccountForDetail(account)}
                                      className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white transition-colors cursor-pointer"
                                      title="Voir fiche complète"
                                    >
                                      <Icons.ExternalLink size={13} />
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

                  {/* Explicit Numbered Pagination */}
                  <BackofficePagination
                    currentPage={sohoPage}
                    totalPages={Math.ceil(filteredSohoAccounts.length / sohoPageSize) || 1}
                    totalItems={filteredSohoAccounts.length}
                    pageSize={sohoPageSize}
                    onPageChange={setSohoPage}
                    onPageSizeChange={(sz) => {
                      setSohoPageSize(sz);
                      setSohoPage(1);
                    }}
                    itemName="comptes TPE"
                  />
                </div>
              </div>
            )}

            {/* VIEW: RAPPORT DE LA JOURNÉE */}
            {activeView === 'daily_report' && (
              <DailyReportView
                reports={recentReportsFeed}
                submissions={recentFormSubmissions}
                salespersons={salespersons}
                enterprises={enterprises}
                plaques={plaques}
                onOpenReportDetail={(report) => setSelectedReportToInspect(report)}
                onRefresh={loadDashboardData}
                loading={loading}
              />
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
                      {/* Actions toolbar */}
                    </div>
                  </div>

                  {/* Commercial Profile Header Card */}
                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#363336] p-1 border border-black/5 dark:border-white/5 shrink-0 overflow-hidden shadow-xs">
                        <img
                          src={selectedSalespersonDetail.profile_picture_url || selectedSalespersonDetail.avatar || '/avatars/default_avatar.svg'}
                          alt={selectedSalespersonDetail.full_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/avatars/default_avatar.svg';
                          }}
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
                  <div className="flex items-center gap-2 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-2 rounded-2xl border border-black/5 dark:border-white/5 flex-wrap">
                    <button
                      onClick={() => setSalespersonDetailTab('enterprises')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                        salespersonDetailTab === 'enterprises'
                          ? 'bg-[#4F6CE8] text-white shadow-xs'
                          : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                      }`}
                    >
                      <Icons.Building size={14} />
                      <span>Portefeuille & Comptes ({salespersonDetailKpis.total})</span>
                    </button>
                    <button
                      onClick={() => setSalespersonDetailTab('reports')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                        salespersonDetailTab === 'reports'
                          ? 'bg-[#4F6CE8] text-white shadow-xs'
                          : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                      }`}
                    >
                      <Icons.FileText size={14} />
                      <span>Rapports de Visite ({salespersonReports.length + salespersonSubmissions.length})</span>
                    </button>
                  </div>

                  {/* SUB-TAB 1: COMPTES ASSIGNÉS & VISITES */}
                  {salespersonDetailTab === 'enterprises' && (
                    <div className="flex flex-col gap-4">
                      {/* Filter Toolbar & Search */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3 rounded-2xl border border-black/5 dark:border-white/5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => {
                              setSalespersonDetailFilter('ALL');
                              setSalespersonDetailPage(1);
                            }}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              salespersonDetailFilter === 'ALL'
                                ? 'bg-[#4F6CE8] text-white shadow-xs'
                                : 'bg-white dark:bg-[#363336] text-[#6E6C67] dark:text-[#A1A1AA] border border-black/5 dark:border-white/5'
                            }`}
                          >
                            Tous ({salespersonDetailKpis.total})
                          </button>
                          <button
                            onClick={() => {
                              setSalespersonDetailFilter('VISITED');
                              setSalespersonDetailPage(1);
                            }}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              salespersonDetailFilter === 'VISITED'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white dark:bg-[#363336] text-emerald-600 dark:text-emerald-400 border border-black/5 dark:border-white/5'
                            }`}
                          >
                            Visités sur le terrain ({salespersonDetailKpis.visited})
                          </button>
                          <button
                            onClick={() => {
                              setSalespersonDetailFilter('UNVISITED');
                              setSalespersonDetailPage(1);
                            }}
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
                            onChange={(e) => {
                              setSalespersonDetailSearch(e.target.value);
                              setSalespersonDetailPage(1);
                            }}
                            placeholder="Rechercher un compte..."
                            className="w-full bg-white dark:bg-[#363336] pl-8 pr-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5 text-xs text-[#242124] dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#4F6CE8]"
                          />
                        </div>
                      </div>

                      {/* Accounts Table */}
                      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden flex flex-col gap-4">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs min-w-[800px]">
                            <thead>
                              <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                                <th className="py-3 px-3.5 min-w-[180px]">Entreprise</th>
                                <th className="py-3 px-3.5">Plaque & Commune</th>
                                <th className="py-3 px-3.5">Contact Référent</th>
                                <th className="py-3 px-3.5">Statut Visite</th>
                                <th className="py-3 px-3.5">Statut SOHO</th>
                                <th className="py-3 px-3.5 text-right">Réaffectation</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                              {paginatedSalespersonDetailAccounts.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                                    Aucun compte assigné ne correspond aux critères sélectionnés.
                                  </td>
                                </tr>
                              ) : (
                                paginatedSalespersonDetailAccounts.map((ent) => (
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
                                          <button
                                            onClick={() => setSalespersonDetailTab('reports')}
                                            className="text-[9px] font-bold text-[#4F6CE8] hover:underline mt-0.5 pl-1 text-left flex items-center gap-1 cursor-pointer"
                                          >
                                            <span>Consulter le rapport</span>
                                            <Icons.ArrowRight size={10} />
                                          </button>
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

                        {/* Explicit Numbered Pagination */}
                        <BackofficePagination
                          currentPage={salespersonDetailPage}
                          totalPages={Math.ceil(filteredSalespersonDetailAccounts.length / salespersonDetailPageSize) || 1}
                          totalItems={filteredSalespersonDetailAccounts.length}
                          pageSize={salespersonDetailPageSize}
                          onPageChange={setSalespersonDetailPage}
                          onPageSizeChange={(sz) => {
                            setSalespersonDetailPageSize(sz);
                            setSalespersonDetailPage(1);
                          }}
                          itemName="comptes"
                        />
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB: COMPTES-RENDUS & FORMULAIRES DE VISITE */}
                  {salespersonDetailTab === 'reports' && (
                    <div className="flex flex-col gap-4">
                      {/* Sub-Filters & Counter Toolbar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F5F2] dark:bg-[#2D2A2D] p-3 rounded-2xl border border-black/5 dark:border-white/5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => setSalespersonDetailReportsFilter('ALL')}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              salespersonDetailReportsFilter === 'ALL'
                                ? 'bg-[#4F6CE8] text-white shadow-xs'
                                : 'bg-white dark:bg-[#363336] text-[#6E6C67] dark:text-[#A1A1AA] border border-black/5 dark:border-white/5'
                            }`}
                          >
                            Tous les comptes-rendus ({salespersonReports.length + salespersonSubmissions.length})
                          </button>
                          <button
                            onClick={() => setSalespersonDetailReportsFilter('FORMS')}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              salespersonDetailReportsFilter === 'FORMS'
                                ? 'bg-[#4F6CE8] text-white shadow-xs'
                                : 'bg-white dark:bg-[#363336] text-[#6E6C67] dark:text-[#A1A1AA] border border-black/5 dark:border-white/5'
                            }`}
                          >
                            Formulaires Guidés ({salespersonSubmissions.length})
                          </button>
                          <button
                            onClick={() => setSalespersonDetailReportsFilter('AI_REPORTS')}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              salespersonDetailReportsFilter === 'AI_REPORTS'
                                ? 'bg-[#4F6CE8] text-white shadow-xs'
                                : 'bg-white dark:bg-[#363336] text-[#6E6C67] dark:text-[#A1A1AA] border border-black/5 dark:border-white/5'
                            }`}
                          >
                            Synthèses Dictaphone / IA ({salespersonReports.length})
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                            Visites transmises depuis l'application mobile
                          </span>
                        </div>
                      </div>

                      {/* Reports Feed Cards */}
                      {loadingSalespersonReports ? (
                        <div className="p-8 text-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 flex flex-col items-center justify-center gap-3">
                          <div className="w-6 h-6 border-2 border-[#4F6CE8] border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">Chargement des comptes-rendus de visite...</span>
                        </div>
                      ) : (salespersonReports.length === 0 && salespersonSubmissions.length === 0) ? (
                        <div className="p-12 text-center bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl border border-black/5 dark:border-white/5 flex flex-col items-center justify-center gap-2">
                          <Icons.FileText size={32} className="text-zinc-400 mb-1" />
                          <span className="text-sm font-bold text-[#242124] dark:text-white">Aucun compte-rendu de visite enregistré</span>
                          <span className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] max-w-md">
                            Ce commercial n'a pas encore finalisé de visite guidée ou de compte-rendu dictaphone sur son terminal mobile.
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {/* 1. Form Submissions */}
                          {(salespersonDetailReportsFilter === 'ALL' || salespersonDetailReportsFilter === 'FORMS') &&
                            salespersonSubmissions.map((sub) => (
                              <div
                                key={`sub-${sub.id}`}
                                className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-3 shadow-xs hover:border-black/10 dark:hover:border-white/10 transition-all"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-3">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="text-sm font-extrabold text-[#242124] dark:text-white">
                                        {sub.enterprise_name}
                                      </h4>
                                      <span className="px-2 py-0.5 rounded-full bg-[#4F6CE8]/10 text-[#4F6CE8] text-[10px] font-semibold">
                                        Formulaire Guidé
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                                        <Icons.CheckCircle size={10} /> Score : {sub.qualification_score}/100
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5 flex-wrap">
                                      {sub.plaque_code && <span className="font-semibold text-[#4F6CE8]">{sub.plaque_code}</span>}
                                      {sub.enterprise_commune && <span>• {sub.enterprise_commune}</span>}
                                      {sub.enterprise_sector && <span>• {sub.enterprise_sector}</span>}
                                      <span>• Visité le {new Date(sub.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      onClick={() => setSelectedReportToInspect({ ...sub, type: 'SUBMISSION' })}
                                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#363336] text-[#242124] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold border border-black/5 dark:border-white/5 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                    >
                                      <Icons.FileText size={13} />
                                      <span>Voir les réponses ({sub.answers?.length || 0})</span>
                                    </button>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Offre ciblée :</span>
                                    <span className="text-xs font-bold text-[#242124] dark:text-white">{sub.target_offer_name}</span>
                                  </div>

                                  {sub.ai_summary && (
                                    <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 text-xs text-[#242124] dark:text-white whitespace-pre-line leading-relaxed shadow-xs">
                                      {sub.ai_summary}
                                    </div>
                                  )}

                                  {sub.detected_needs && sub.detected_needs.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                      <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Besoins détectés :</span>
                                      {sub.detected_needs.map((need, idx) => (
                                        <span key={idx} className="px-2 py-0.5 rounded-md bg-[#4F6CE8]/10 text-[#4F6CE8] text-[10px] font-semibold">
                                          {need}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {sub.objections_noted && (
                                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                      <span className="text-[10px] font-semibold">Points d'attention / Objections :</span>
                                      <span>{sub.objections_noted}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}

                          {/* 2. Dictaphone & AI Visit Reports */}
                          {(salespersonDetailReportsFilter === 'ALL' || salespersonDetailReportsFilter === 'AI_REPORTS') &&
                            salespersonReports.map((rep) => (
                              <div
                                key={`rep-${rep.id}`}
                                className="bg-[#F6F5F2] dark:bg-[#2D2A2D] p-5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-3 shadow-xs hover:border-black/10 dark:hover:border-white/10 transition-all"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-3">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="text-sm font-extrabold text-[#242124] dark:text-white">
                                        {rep.enterprise_name}
                                      </h4>
                                      <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-semibold">
                                        Compte-Rendu Dictaphone / IA
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5 flex-wrap">
                                      {rep.plaque_code && <span className="font-semibold text-[#4F6CE8]">{rep.plaque_code}</span>}
                                      <span>• Visite enregistrée le {new Date(rep.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      onClick={() => setSelectedReportToInspect({ ...rep, type: 'REPORT' })}
                                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#363336] text-[#242124] dark:text-white hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold border border-black/5 dark:border-white/5 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                    >
                                      <Icons.FileText size={13} />
                                      <span>Détails & Plan d'actions</span>
                                    </button>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                  {rep.executive_summary && (
                                    <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 text-xs text-[#242124] dark:text-white whitespace-pre-line leading-relaxed shadow-xs">
                                      {rep.executive_summary}
                                    </div>
                                  )}

                                  {rep.confirmed_needs && rep.confirmed_needs.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                      <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Besoins confirmés :</span>
                                      {rep.confirmed_needs.map((need, idx) => (
                                        <span key={idx} className="px-2 py-0.5 rounded-md bg-[#4F6CE8]/10 text-[#4F6CE8] text-[10px] font-semibold">
                                          {need}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {rep.actions_todo && rep.actions_todo.length > 0 && (
                                    <div className="flex flex-col gap-1 mt-1">
                                      <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Actions à mener :</span>
                                      <ul className="list-disc list-inside text-xs text-[#242124] dark:text-white space-y-0.5">
                                        {rep.actions_todo.map((act, idx) => (
                                          <li key={idx}>{act}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
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
                      <button
                        onClick={() => setIsAddSalespersonOpen(true)}
                        className="px-3.5 py-1.5 rounded-2xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                      >
                        <Icons.UserPlus size={14} />
                        <span>Ajouter un Commercial</span>
                      </button>
                    </div>
                  </div>

                  {/* Salespersons Table */}
                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden flex flex-col gap-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[850px]">
                        <thead>
                          <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                            <th className="py-3 px-3.5 min-w-[180px]">Commercial</th>
                            <th className="py-3 px-3.5">Plaques Affectées</th>
                            <th className="py-3 px-3.5">Points Cumulés</th>
                            <th className="py-3 px-3.5">Signatures SOHO</th>
                            <th className="py-3 px-3.5">Visites Réalisées</th>
                            <th className="py-3 px-3.5">Statut</th>
                            <th className="py-3 px-3.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                          {paginatedSalespersons.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                                Aucun commercial terrain répertorié.
                              </td>
                            </tr>
                          ) : (
                            paginatedSalespersons.map((sp) => (
                              <tr
                                key={sp.id}
                                onClick={() => setSelectedSalespersonDetail(sp)}
                                className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                              >
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-2xl bg-white dark:bg-[#363336] p-0.5 border border-black/5 dark:border-white/5 overflow-hidden shrink-0">
                                      <img
                                        src={sp.profile_picture_url || sp.avatar || '/avatars/default_avatar.svg'}
                                        alt={sp.full_name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).src = '/avatars/default_avatar.svg';
                                        }}
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

                    {/* Explicit Numbered Pagination */}
                    <BackofficePagination
                      currentPage={salespersonsPage}
                      totalPages={Math.ceil(sortedSalespersons.length / salespersonsPageSize) || 1}
                      totalItems={sortedSalespersons.length}
                      pageSize={salespersonsPageSize}
                      onPageChange={setSalespersonsPage}
                      onPageSizeChange={(sz) => {
                        setSalespersonsPageSize(sz);
                        setSalespersonsPage(1);
                      }}
                      itemName="commerciaux"
                    />
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
                        <span>{dispatchingPlaqueId === selectedPlaqueDetail.id ? 'Calcul...' : 'Auto dispatch'}</span>
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
                      className="text-xs text-[#4F6CE8] font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>Modifier l'équipe de la plaque</span>
                      <Icons.ArrowRight size={12} />
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
                        onClick={() => {
                          setPlaqueDetailFilter('ALL');
                          setPlaqueDetailPage(1);
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          plaqueDetailFilter === 'ALL'
                            ? 'bg-[#4F6CE8] text-white shadow-xs'
                            : 'bg-white dark:bg-[#363336] text-[#6E6C67] dark:text-[#A1A1AA] border border-black/5 dark:border-white/5'
                        }`}
                      >
                        Toutes ({plaqueDetailKpis.total})
                      </button>
                      <button
                        onClick={() => {
                          setPlaqueDetailFilter('VISITED');
                          setPlaqueDetailPage(1);
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          plaqueDetailFilter === 'VISITED'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-[#363336] text-emerald-600 dark:text-emerald-400 border border-black/5 dark:border-white/5'
                        }`}
                      >
                        Visités sur le terrain ({plaqueDetailKpis.visited})
                      </button>
                      <button
                        onClick={() => {
                          setPlaqueDetailFilter('UNVISITED');
                          setPlaqueDetailPage(1);
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          plaqueDetailFilter === 'UNVISITED'
                            ? 'bg-[#4F6CE8]/10 text-white shadow-xs'
                            : 'bg-white dark:bg-[#363336] text-[#4F6CE8] border border-black/5 dark:border-white/5'
                        }`}
                      >
                        Pas encore visités ({plaqueDetailKpis.unvisited})
                      </button>
                      <button
                        onClick={() => {
                          setPlaqueDetailFilter('UNASSIGNED');
                          setPlaqueDetailPage(1);
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          plaqueDetailFilter === 'UNASSIGNED'
                            ? 'bg-zinc-800 text-white shadow-xs'
                            : 'bg-white dark:bg-[#363336] text-zinc-600 dark:text-zinc-300 border border-black/5 dark:border-white/5'
                        }`}
                      >
                        Non assignés ({plaqueDetailKpis.unassigned})
                      </button>
                      <button
                        onClick={() => {
                          setPlaqueDetailFilter('ASSIGNED');
                          setPlaqueDetailPage(1);
                        }}
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
                        onChange={(e) => {
                          setPlaqueDetailSearch(e.target.value);
                          setPlaqueDetailPage(1);
                        }}
                        placeholder="Rechercher entreprise..."
                        className="w-full bg-white dark:bg-[#363336] pl-8 pr-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5 text-xs text-[#242124] dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#4F6CE8]"
                      />
                    </div>
                  </div>

                  {/* Enterprises Table in this plaque */}
                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden flex flex-col gap-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[750px]">
                        <thead>
                          <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                            <th className="py-3 px-3.5 min-w-[180px]">Entreprise</th>
                            <th className="py-3 px-3.5">Contact Référent</th>
                            <th className="py-3 px-3.5">Statut Visite</th>
                            <th className="py-3 px-3.5">Statut SOHO</th>
                            <th className="py-3 px-3.5 text-right">Commercial Affecté</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                          {paginatedPlaqueDetailAccounts.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                                Aucune entreprise ne correspond aux filtres sélectionnés pour cette plaque.
                              </td>
                            </tr>
                          ) : (
                            paginatedPlaqueDetailAccounts.map((ent) => (
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
                                            {s.full_name} {isAssignedPlaque ? '(Assigné Plaque)' : ''}
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

                    {/* Explicit Numbered Pagination */}
                    <BackofficePagination
                      currentPage={plaqueDetailPage}
                      totalPages={Math.ceil(filteredPlaqueDetailAccounts.length / plaqueDetailPageSize) || 1}
                      totalItems={filteredPlaqueDetailAccounts.length}
                      pageSize={plaqueDetailPageSize}
                      onPageChange={setPlaqueDetailPage}
                      onPageSizeChange={(sz) => {
                        setPlaqueDetailPageSize(sz);
                        setPlaqueDetailPage(1);
                      }}
                      itemName="entreprises"
                    />
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
                          onClick={() => {
                            setPlaquesListFilter(f.id as any);
                            setPlaquesPage(1);
                          }}
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
                        onChange={(e) => {
                          setPlaqueCityFilter(e.target.value);
                          setPlaquesPage(1);
                        }}
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
                  <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-5 border border-black/5 dark:border-white/5 overflow-hidden flex flex-col gap-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[850px]">
                        <thead>
                          <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                            <th className="py-3 px-3.5">Code Plaque</th>
                            <th className="py-3 px-3.5 min-w-[180px]">Nom & Ville</th>
                            <th className="py-3 px-3.5">Commerciaux Affectés</th>
                            <th className="py-3 px-3.5">Comptes SOHO</th>
                            <th className="py-3 px-3.5">Visités vs Non visités</th>
                            <th className="py-3 px-3.5 text-right">Actions & Répartition</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                          {paginatedPlaques.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                                Aucune plaque ne correspond aux filtres sélectionnés.
                              </td>
                            </tr>
                          ) : (
                            paginatedPlaques.map((plaque) => {
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
                                        <span>{isDispatching ? "Calcul..." : "Auto dispatch"}</span>
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

                    {/* Explicit Numbered Pagination */}
                    <BackofficePagination
                      currentPage={plaquesPage}
                      totalPages={Math.ceil(filteredPlaques.length / plaquesPageSize) || 1}
                      totalItems={filteredPlaques.length}
                      pageSize={plaquesPageSize}
                      onPageChange={setPlaquesPage}
                      onPageSizeChange={(sz) => {
                        setPlaquesPageSize(sz);
                        setPlaquesPage(1);
                      }}
                      itemName="plaques"
                    />
                  </div>
                </div>
              )
            )}

            {/* VIEW 5: de très petites entreprises DIRECTORY */}
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
                    <h3 className="text-sm font-extrabold text-[#242124] dark:text-white">Annuaire Exhaustif de très petites entreprises</h3>
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
                    <table className="w-full text-left text-xs min-w-[900px]">
                      <thead>
                        <tr className="border-b border-black/10 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 bg-black/[0.03] dark:bg-white/[0.03]">
                          <th className="py-3 px-3.5 min-w-[180px]">Entreprise</th>
                          <th className="py-3 px-3.5">RCCM & Commune</th>
                          <th className="py-3 px-3.5">Contact Principal</th>
                          <th className="py-3 px-3.5">Commercial Affecté</th>
                          <th className="py-3 px-3.5">Opérateur Actuel</th>
                          <th className="py-3 px-3.5">Solution Recommandée</th>
                          <th className="py-3 px-3.5 text-right">Fiche</th>
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
                                {account.recommended_solution || 'Pack Fibre TPE'}
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
                      Gérez votre photo de profil officielle, consultez les règles métier terrain et administrez votre session.
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

                {/* 1. Profile Card & Photo de Profil */}
                <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-3xl bg-black/5 dark:bg-white/5 border-2 border-[#4F6CE8] flex items-center justify-center overflow-hidden shadow-xs shrink-0">
                        <img
                          src={profilePictureInput || user?.profile_picture_url || '/avatars/default_avatar.svg'}
                          alt="Photo de profil"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/avatars/default_avatar.svg';
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
                      </div>
                    </div>

                    <button
                      onClick={() => logout()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer shrink-0 border border-rose-500/20 self-start sm:self-auto shadow-none"
                      title="Se déconnecter du Back-Office"
                    >
                      <Icons.LogOut size={16} />
                      <span>Se déconnecter</span>
                    </button>
                  </div>

                  {/* Téléversement de la Photo de Profil Superviseur */}
                  <ProfilePhotoUploader
                    currentPhotoUrl={user?.profile_picture_url || user?.avatar}
                    name={user?.username}
                    title="Photo de profil Superviseur Back-Office"
                    description="Téléversez votre photo officielle pour le Back-Office (JPG, PNG ou WebP, max 5 Mo) ou glissez-déposez un fichier."
                    allowSelfUpdate={true}
                    onPhotoUploaded={(newUrl) => {
                      setProfilePictureInput(newUrl);
                      if (updateUser) {
                        updateUser({ avatar: newUrl, profile_picture_url: newUrl } as any);
                      }
                    }}
                    onPhotoRemoved={() => {
                      setProfilePictureInput('');
                      handleSaveProfilePicture('/avatars/default_avatar.svg');
                    }}
                  />
                </div>

                {/* 2. Préférences d'Affichage & Thème Visuel */}
                <ThemeSettingCard />

                {/* 3. FAQ INTERACTIVE SUPERVISEUR */}
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
                        q: "1. Comment fonctionne l'Auto-Dispatch et la prévention des collisions de portefeuille ?",
                        a: (
                          <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                            <p>
                              L'algorithme d'Auto-Dispatch d'Onbora analyse en continu la proximité géographique des comptes TPE au sein de chaque plaque. Il évalue la charge de travail actuelle des commerciaux affectés (nombre de comptes déjà assignés et visites planifiées) et distribue les entreprises équitablement.
                            </p>
                            <p>
                              Un mécanisme strict anti-collision garantit qu'un compte TPE ne peut jamais être attribué à deux commerciaux simultanément.
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
                              <strong className="text-[#242124] dark:text-white">Dispatcher les comptes :</strong> Distribue individuellement chaque entreprise de très petites entreprises de la plaque à un commercial précis. Le commercial voit alors ces comptes apparaître instantanément dans sa liste de prospection sur son mobile.
                            </p>
                          </div>
                        ),
                      },
                      {
                        q: "4. Comment fonctionne le calcul des points d'activité des commerciaux ?",
                        a: (
                          <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                            <p>
                              Chaque action terrain d'un commercial rapporte des points d'activité automatiquement calculés :
                            </p>
                            <ul className="list-disc pl-5 space-y-1">
                              <li><strong className="text-[#242124] dark:text-white">100 points :</strong> Pour chaque contrat client converti et signé.</li>
                              <li><strong className="text-[#242124] dark:text-white">20 points :</strong> Pour chaque formulaire d'audit ou de qualification terrain validé.</li>
                              <li><strong className="text-[#242124] dark:text-white">10 points :</strong> Pour chaque visite physique effectuée et confirmée par géolocalisation.</li>
                            </ul>
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
                        q: "6. Que faire lorsqu'une entreprise TPE n'est pas encore géolocalisée sur la carte ?",
                        a: (
                          <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                            <p>
                              Les entreprises qui n'ont pas encore de coordonnées GPS précises restent parfaitement accessibles dans l'onglet <strong className="text-[#242124] dark:text-white">Annuaire TPE</strong> et dans le dispatch manuel de leur plaque.
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
                  <span className="font-semibold text-[#4F6CE8]">{selectedAccountForDetail.recommended_solution || 'Pack Fibre TPE'}</span>
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
                          <UserAvatar src={sp.avatar} name={sp.full_name} size="sm" />
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

        {/* INSPECTION MODAL: COMPTE-RENDU DE VISITE DÉTAILLÉ */}
        {selectedReportToInspect && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl max-w-2xl w-full p-6 border border-black/10 dark:border-white/10 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#4F6CE8]">
                    {selectedReportToInspect.type === 'SUBMISSION' ? 'Formulaire de Qualification Guidé' : 'Compte-Rendu Dictaphone / IA'}
                  </span>
                  <h3 className="text-base font-extrabold text-[#242124] dark:text-white">
                    {selectedReportToInspect.enterprise_name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedReportToInspect(null)}
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <Icons.X size={18} />
                </button>
              </div>

              {/* Metadata Chips */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                {selectedReportToInspect.plaque_code && (
                  <span className="px-2.5 py-1 rounded-xl bg-[#4F6CE8]/10 text-[#4F6CE8] font-bold">
                    Plaque : {selectedReportToInspect.plaque_code}
                  </span>
                )}
                {selectedReportToInspect.qualification_score !== undefined && (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                    Score : {selectedReportToInspect.qualification_score}/100
                  </span>
                )}
                {selectedReportToInspect.target_offer_name && (
                  <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#363336] text-[#242124] dark:text-white font-semibold border border-black/5 dark:border-white/5">
                    {selectedReportToInspect.target_offer_name}
                  </span>
                )}
                <span>
                  {new Date(selectedReportToInspect.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>

              {/* Executive Summary */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-[#242124] dark:text-white">Synthèse de la Visite</span>
                <div className="bg-white dark:bg-[#363336] p-4 rounded-2xl text-xs text-[#242124] dark:text-white leading-relaxed whitespace-pre-line border border-black/5 dark:border-white/5 shadow-xs">
                  {selectedReportToInspect.ai_summary || selectedReportToInspect.executive_summary || 'Aucune synthèse disponible.'}
                </div>
              </div>

              {/* Form Answers if available */}
              {selectedReportToInspect.answers && selectedReportToInspect.answers.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-[#242124] dark:text-white">
                    Réponses au Questionnaire Guidé ({selectedReportToInspect.answers.length})
                  </span>
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                    {selectedReportToInspect.answers.map((ans: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-2xl bg-white dark:bg-[#363336] border border-black/5 dark:border-white/5 text-xs flex flex-col gap-1">
                        <span className="font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">
                          Q{idx + 1}: {ans.question_text || ans.question_id || 'Question'}
                        </span>
                        <span className="font-bold text-[#242124] dark:text-white">
                          {Array.isArray(ans.answer) ? ans.answer.join(', ') : String(ans.answer ?? 'Non renseigné')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Needs & Objections */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {((selectedReportToInspect.detected_needs?.length || 0) > 0 || (selectedReportToInspect.confirmed_needs?.length || 0) > 0) && (
                  <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA]">Besoins Détectés</span>
                    <div className="flex flex-wrap gap-1">
                      {(selectedReportToInspect.detected_needs || selectedReportToInspect.confirmed_needs || []).map((need: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-[#4F6CE8]/10 text-[#4F6CE8] text-[10px] font-semibold">
                          {need}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedReportToInspect.objections_noted || (selectedReportToInspect.objections_raised?.length || 0) > 0) && (
                  <div className="bg-white dark:bg-[#363336] p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Objections / Contraintes</span>
                    <p className="text-xs text-[#242124] dark:text-white">
                      {selectedReportToInspect.objections_noted || (selectedReportToInspect.objections_raised || []).join(', ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Next Action */}
              {selectedReportToInspect.next_action && (
                <div className="p-3 rounded-2xl bg-[#4F6CE8]/10 text-xs flex items-center justify-between text-[#4F6CE8]">
                  <span className="font-semibold">Prochaine action :</span>
                  <span className="font-bold">{selectedReportToInspect.next_action}</span>
                </div>
              )}

              {/* Close action */}
              <div className="flex justify-end mt-2 pt-3 border-t border-black/5 dark:border-white/5">
                <button
                  onClick={() => setSelectedReportToInspect(null)}
                  className="px-4 py-2 rounded-2xl bg-[#242124] dark:bg-white text-white dark:text-[#242124] text-xs font-semibold cursor-pointer"
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
