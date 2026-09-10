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

const AdminPlaqueMapOnly = dynamic(
  () => import('@/components/admin/AdminPlaqueMapOnly'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] rounded-3xl bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
        <span className="text-xs font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Chargement de la carte des plaques...</span>
      </div>
    ),
  }
);

interface SegmentationStats {
  total_enterprises: number;
  tpe_count: number;
  pme_count: number;
  grand_compte_count: number;
  back_office_total: number;
  kam_office_total: number;
  converted_back_office: number;
  converted_kam_office: number;
  total_converted: number;
}

interface SegmentationConfigData {
  id: number;
  tpe_max_revenue: string;
  pme_max_revenue: string;
  backoffice_entity_label: string;
  kam_entity_label: string;
  updated_at: string;
  stats: SegmentationStats;
}

interface ManagerUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'SUPERVISOR' | 'KAM_MANAGER';
  role_display: string;
  phone: string;
  company_name: string;
  location: string;
  is_active: boolean;
  avatar?: string;
  date_joined: string;
}

interface ConvertedAccount {
  id: number;
  crm_id: string;
  name: string;
  sector: string;
  city: string;
  commune: string;
  address: string;
  rccm: string;
  id_nat: string;
  nif: string;
  annual_revenue: number;
  employee_count: number;
  segment: 'GRAND_COMPTE' | 'PME' | 'TPE_INFORMEL';
  segment_display: string;
  converted_by_entity: 'BACK_OFFICE' | 'KAM_OFFICE';
  converted_amount: number;
  converted_offer: string;
  converted_at: string;
  conversion_notes: string;
  contact_name: string;
  contact_role: string;
  contact_phone: string;
  contact_email: string;
  converted_by_user_name: string;
  current_operator: string;
  recommended_solution: string;
}

interface EnterpriseItem {
  id: number;
  crm_id: string;
  name: string;
  sector: string;
  city: string;
  commune: string;
  annual_revenue: number;
  employee_count: number;
  segment: string;
  segment_display: string;
  assigned_entity: string;
  assigned_entity_display: string;
  conversion_status: string;
  conversion_status_display: string;
  is_converted?: boolean;
  rccm: string;
  contact_name: string;
  contact_role?: string;
  contact_phone: string;
  current_operator: string;
  current_connectivity: string;
}

interface B2BOfferVariant {
  name: string;
  details: string[];
}

interface B2BOfferItem {
  service_id: string;
  name: string;
  category: string;
  description: string;
  allowed_benefits: string[];
  target_customers: string[];
  variants: B2BOfferVariant[];
  commercial_terms: string[];
  prerequisites: string[];
  exclusions: string[];
  source_url: string;
  source_status?: string;
  provider_name?: string;
  portfolio_scope?: string;
  portfolio_level?: string;
  rdc_availability: 'published_local' | 'to_confirm';
  availability_note?: string;
  match: {
    need_keywords: string[];
    sectors?: string[];
    excluded_sectors?: string[];
    required_profile_fields?: string[];
  };
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

interface KamTeamMemberItem {
  id: number;
  username: string;
  email: string;
  role: string;
  phone: string;
  company_name: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar: string;
  portfolio_count: number;
  converted_count: number;
  converted_amount: number;
  is_active: boolean;
}

interface AdminDirectiveItem {
  id: number;
  sender?: number;
  sender_name: string;
  sender_username?: string;
  sender_role?: string;
  sender_avatar?: string;
  recipient?: number;
  recipient_name: string;
  recipient_username: string;
  recipient_role: string;
  recipient_avatar: string;
  target_entity: 'KAM_OFFICE' | 'BACK_OFFICE';
  target_entity_display: string;
  title: string;
  instruction: string;
  priority: 'NORMAL' | 'HIGH' | 'CRITICAL';
  priority_display: string;
  status: 'SENT' | 'IN_PROGRESS' | 'COMPLETED';
  status_display: string;
  target_account_name: string;
  acknowledgement_note: string;
  created_at: string;
  updated_at: string;
}

export default function AdminCockpitPage() {
  const { user, logout, loading: authLoading, updateUser } = useAuth();

  // Navigation tabs (Hiérarchie optimisée : 1. Comptes Convertis, 2. Catalogue d'offres, 3. Entreprises CRM...)
  const [activeTab, setActiveTab] = useState<
    'converted' | 'b2b_catalog' | 'crm_bank' | 'supervisors' | 'kam_managers' | 'field_sales' | 'kams_team' | 'directives' | 'segmentation' | 'copilot' | 'settings'
  >('converted');

  // Retractable Sidebar State
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Universal search query
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Segmentation State
  const [config, setConfig] = useState<SegmentationConfigData | null>(null);
  const [tpeThreshold, setTpeThreshold] = useState<number>(2400);
  const [pmeThreshold, setPmeThreshold] = useState<number>(30000);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccessMsg, setConfigSuccessMsg] = useState('');

  // 2. Managers State
  const [managers, setManagers] = useState<ManagerUser[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [targetRoleToCreate, setTargetRoleToCreate] = useState<'SUPERVISOR' | 'KAM_MANAGER'>('SUPERVISOR');
  const [managerForm, setManagerForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    location: '',
    avatar: 'memoji_056.png',
  });
  const [managerCreateError, setManagerCreateError] = useState('');
  const [creatingManager, setCreatingManager] = useState(false);

  // Settings & Memojis State
  const [memojisCatalog, setMemojisCatalog] = useState<{ id: number; filename: string; gender?: string; ethnicity?: string }[]>([]);
  const [memojiGenderFilter, setMemojiGenderFilter] = useState<'all' | 'homme' | 'femme'>('all');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarSuccessMsg, setAvatarSuccessMsg] = useState('');
  const [avatarErrorMsg, setAvatarErrorMsg] = useState('');
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(0);

  // 3. Converted Accounts State
  const [convertedAccounts, setConvertedAccounts] = useState<ConvertedAccount[]>([]);
  const [convertedSummary, setConvertedSummary] = useState({
    total_count: 0,
    back_office_count: 0,
    kam_office_count: 0,
    total_signed_amount_usd: 0,
    back_office_signed_amount_usd: 0,
    kam_office_signed_amount_usd: 0,
  });
  const [convertedFilterEntity, setConvertedFilterEntity] = useState<'ALL' | 'BACK_OFFICE' | 'KAM_OFFICE'>('ALL');
  const [loadingConverted, setLoadingConverted] = useState(false);
  const [selectedAccountDetail, setSelectedAccountDetail] = useState<ConvertedAccount | null>(null);

  // 4. CRM Bank State (1 000 Enterprises)
  const [enterprises, setEnterprises] = useState<EnterpriseItem[]>([]);
  const [crmTotalCount, setCrmTotalCount] = useState(1000);
  const [loadingCRM, setLoadingCRM] = useState(false);
  const [crmSegmentFilter, setCrmSegmentFilter] = useState<string>('ALL');
  const [crmEntityFilter, setCrmEntityFilter] = useState<string>('ALL');

  // 5. B2B Offers State (Core AI Catalog)
  const [b2bOffers, setB2bOffers] = useState<B2BOfferItem[]>([]);
  const [b2bTotalCount, setB2bTotalCount] = useState(41);
  const [b2bCategories, setB2bCategories] = useState<string[]>([]);
  const [loadingB2bOffers, setLoadingB2bOffers] = useState(false);
  const [b2bCategoryFilter, setB2bCategoryFilter] = useState<string>('ALL');
  const [b2bRdcFilter, setB2bRdcFilter] = useState<string>('ALL');
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isOfferEditMode, setIsOfferEditMode] = useState(false);
  const [isImportOffersModalOpen, setIsImportOffersModalOpen] = useState(false);
  const [savingOffer, setSavingOffer] = useState(false);
  const [offerActionError, setOfferActionError] = useState('');
  const [offerSuccessMsg, setOfferSuccessMsg] = useState('');
  const [rawImportJson, setRawImportJson] = useState('');
  const [importingJson, setImportingJson] = useState(false);

  const [offerForm, setOfferForm] = useState({
    service_id: '',
    name: '',
    category: 'Mobile et flotte',
    description: '',
    allowed_benefits: '',
    target_customers: '',
    commercial_terms: '',
    prerequisites: '',
    exclusions: '',
    need_keywords: '',
    rdc_availability: 'published_local',
    availability_note: '',
    source_url: 'https://www.orange-business.com/en/products',
  });

  // 6. Field Sales (Commerciaux Terrain & Plaques)
  const [salespersons, setSalespersons] = useState<SalespersonItem[]>([]);
  const [loadingSalespersons, setLoadingSalespersons] = useState(false);
  const [plaques, setPlaques] = useState<PlaqueItem[]>([]);
  const [loadingPlaques, setLoadingPlaques] = useState(false);
  const [fieldSubTab, setFieldSubTab] = useState<'commerciaux' | 'plaques'>('commerciaux');
  const [plaqueViewMode, setPlaqueViewMode] = useState<'list' | 'map'>('list');
  const [selectedSalespersonForPlaques, setSelectedSalespersonForPlaques] = useState<SalespersonItem | null>(null);
  const [showSalespersonPodium, setShowSalespersonPodium] = useState(false);
  const [showKamPodium, setShowKamPodium] = useState(false);

  // 7. KAMs Team (Key Account Managers Effectif & Portefeuilles)
  const [kamsTeam, setKamsTeam] = useState<KamTeamMemberItem[]>([]);
  const [loadingKamsTeam, setLoadingKamsTeam] = useState(false);
  const [selectedKamForPortfolio, setSelectedKamForPortfolio] = useState<KamTeamMemberItem | null>(null);
  const [kamPortfolioAccounts, setKamPortfolioAccounts] = useState<EnterpriseItem[]>([]);
  const [loadingKamPortfolio, setLoadingKamPortfolio] = useState(false);
  const [kamPortfolioSearch, setKamPortfolioSearch] = useState('');

  // 8. Directives & Instructions Super Admin (Traçabilité Multi-Admins & Animation)
  const [directives, setDirectives] = useState<AdminDirectiveItem[]>([]);
  const [loadingDirectives, setLoadingDirectives] = useState(false);
  const [directiveFilterEntity, setDirectiveFilterEntity] = useState<'ALL' | 'KAM_OFFICE' | 'BACK_OFFICE'>('ALL');
  const [directiveFilterStatus, setDirectiveFilterStatus] = useState<'ALL' | 'SENT' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [directiveFilterOrigin, setDirectiveFilterOrigin] = useState<'ALL' | 'MINE' | 'OTHERS'>('ALL');
  const [isDirectiveModalOpen, setIsDirectiveModalOpen] = useState(false);
  const [sendingDirective, setSendingDirective] = useState(false);
  const [directiveSuccessMsg, setDirectiveSuccessMsg] = useState('');
  const [directiveErrorMsg, setDirectiveErrorMsg] = useState('');
  const [isEnvelopeFlying, setIsEnvelopeFlying] = useState(false);
  const [lastSentDirective, setLastSentDirective] = useState<{
    title: string;
    recipientName: string;
    timestamp: string;
  } | null>(null);
  const [directiveForm, setDirectiveForm] = useState({
    target_entity: 'KAM_OFFICE' as 'KAM_OFFICE' | 'BACK_OFFICE',
    recipient_id: '',
    title: '',
    instruction: '',
    priority: 'NORMAL' as 'NORMAL' | 'HIGH' | 'CRITICAL',
    target_account_name: '',
  });

  // Load Field Sales (Commerciaux & Plaques)
  const loadFieldSales = async () => {
    setLoadingSalespersons(true);
    setLoadingPlaques(true);
    try {
      const [salesData, plaquesData] = await Promise.all([
        fetchAPI('/api/sales/salespersons/'),
        fetchAPI('/api/sales/plaques/'),
      ]);
      setSalespersons(Array.isArray(salesData) ? salesData : []);
      setPlaques(Array.isArray(plaquesData) ? plaquesData : []);
    } catch (err) {
      console.error("Erreur chargement commerciaux et plaques:", err);
    } finally {
      setLoadingSalespersons(false);
      setLoadingPlaques(false);
    }
  };

  // Load KAMs Team
  const loadKamsTeam = async () => {
    setLoadingKamsTeam(true);
    try {
      const data = await fetchAPI('/api/accounts/kams/');
      setKamsTeam(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur chargement effectif KAMs:", err);
    } finally {
      setLoadingKamsTeam(false);
    }
  };

  // Open KAM Portfolio Modal & load accounts
  const handleOpenKamPortfolio = async (kam: KamTeamMemberItem) => {
    setSelectedKamForPortfolio(kam);
    setLoadingKamPortfolio(true);
    setKamPortfolioAccounts([]);
    setKamPortfolioSearch('');
    try {
      const data = await fetchAPI(`/api/sales/enterprises/?assigned_kam=${kam.id}&limit=1000`);
      setKamPortfolioAccounts(data?.enterprises || []);
    } catch (err) {
      console.error("Erreur chargement portefeuille du KAM:", err);
    } finally {
      setLoadingKamPortfolio(false);
    }
  };

  // Load Directives with Multi-Admin Traceability
  const loadDirectives = async () => {
    setLoadingDirectives(true);
    try {
      let url = `/api/sales/directives/?target_entity=${directiveFilterEntity}&status=${directiveFilterStatus}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (directiveFilterOrigin === 'MINE' && user?.id) {
        url += `&sender_id=${user.id}`;
      }
      const data = await fetchAPI(url);
      setDirectives(Array.isArray(data) ? data : (data?.directives || []));
    } catch (err) {
      console.error("Erreur chargement directives:", err);
    } finally {
      setLoadingDirectives(false);
    }
  };

  // Toggle Salesperson Active Status
  const handleToggleSalespersonActive = async (id: number, currentActive: boolean) => {
    try {
      await fetchAPI(`/api/sales/salespersons/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_available: !currentActive })
      });
      loadFieldSales();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour du statut du commercial.");
    }
  };

  // Open Directive Modal pre-filled
  const handleOpenDirectiveToRecipient = (
    target_entity: 'KAM_OFFICE' | 'BACK_OFFICE',
    recipient_id: number,
    account_name?: string
  ) => {
    setDirectiveForm({
      target_entity,
      recipient_id: String(recipient_id),
      title: account_name ? `Directive prioritaire sur le compte ${account_name}` : '',
      instruction: '',
      priority: 'NORMAL',
      target_account_name: account_name || '',
    });
    setDirectiveErrorMsg('');
    setIsDirectiveModalOpen(true);
  };

  // Submit Directive with Flying Envelope Animation
  const handleSendDirectiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directiveForm.recipient_id || !directiveForm.title.trim() || !directiveForm.instruction.trim()) {
      setDirectiveErrorMsg("Veuillez sélectionner un destinataire, un titre et une instruction.");
      return;
    }
    setSendingDirective(true);
    setDirectiveErrorMsg('');
    try {
      await fetchAPI('/api/sales/directives/', {
        method: 'POST',
        body: JSON.stringify({
          target_entity: directiveForm.target_entity,
          recipient_id: Number(directiveForm.recipient_id),
          title: directiveForm.title.trim(),
          instruction: directiveForm.instruction.trim(),
          priority: directiveForm.priority,
          target_account_name: directiveForm.target_account_name.trim(),
        })
      });

      // Find recipient name for the envelope flight animation
      let targetRecipientName = 'Collaborateur';
      if (directiveForm.target_entity === 'KAM_OFFICE') {
        const found = kamsTeam.find(k => String(k.id) === String(directiveForm.recipient_id)) ||
                      kamManagersList.find(m => String(m.id) === String(directiveForm.recipient_id));
        if (found) targetRecipientName = found.full_name;
      } else {
        const found = supervisorsList.find(s => String(s.id) === String(directiveForm.recipient_id)) ||
                      salespersons.find(sp => String(sp.id) === String(directiveForm.recipient_id));
        if (found) targetRecipientName = found.full_name;
      }

      const now = new Date();
      setLastSentDirective({
        title: directiveForm.title.trim(),
        recipientName: targetRecipientName,
        timestamp: `${now.toLocaleDateString()} à ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
      });

      setIsDirectiveModalOpen(false);
      setIsEnvelopeFlying(true);
      loadDirectives();

      setTimeout(() => {
        setIsEnvelopeFlying(false);
      }, 3400);

    } catch (err: any) {
      console.error(err);
      setDirectiveErrorMsg(err.message || "Erreur lors de l'envoi de la directive.");
    } finally {
      setSendingDirective(false);
    }
  };

  // Update Directive Status
  const handleUpdateDirectiveStatus = async (id: number, newStatus: 'SENT' | 'IN_PROGRESS' | 'COMPLETED') => {
    try {
      await fetchAPI(`/api/sales/directives/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      loadDirectives();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour de la directive.");
    }
  };

  // Dynamic Search Placeholder based on active view
  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'converted':
        return "Rechercher un compte converti, offre signée, RCCM, décideur...";
      case 'b2b_catalog':
        return "Rechercher une offre B2B, mot-clé IA, catégorie...";
      case 'crm_bank':
        return "Rechercher une entreprise CRM, commune, secteur d'activité...";
      case 'supervisors':
        return "Rechercher un superviseur back-office...";
      case 'kam_managers':
        return "Rechercher un gérant KAM Office...";
      case 'field_sales':
        return fieldSubTab === 'commerciaux' ? "Rechercher un commercial terrain, plaque..." : "Rechercher une plaque cartographique...";
      case 'kams_team':
        return "Rechercher un Key Account Manager...";
      case 'directives':
        return "Rechercher une directive, destinataire, compte cible...";
      default:
        return "Rechercher dans la console centrale...";
    }
  };

  // Load Segmentation Config
  const loadSegmentationConfig = async () => {
    try {
      const data = await fetchAPI('/api/sales/segmentation-config/');
      setConfig(data);
      setTpeThreshold(Number(data.tpe_max_revenue));
      setPmeThreshold(Number(data.pme_max_revenue));
    } catch (err) {
      console.error("Erreur chargement configuration segmentation:", err);
    }
  };

  // Load Managers
  const loadManagers = async () => {
    setLoadingManagers(true);
    try {
      const data = await fetchAPI('/api/accounts/managers/');
      setManagers(data);
    } catch (err) {
      console.error("Erreur chargement gestionnaires:", err);
    } finally {
      setLoadingManagers(false);
    }
  };

  // Load Converted Accounts
  const loadConvertedAccounts = async () => {
    setLoadingConverted(true);
    try {
      const data = await fetchAPI(`/api/sales/converted-accounts/?entity=${convertedFilterEntity}&search=${encodeURIComponent(searchQuery)}`);
      setConvertedAccounts(data.accounts || []);
      setConvertedSummary(data.summary || {
        total_count: 0,
        back_office_count: 0,
        kam_office_count: 0,
        total_signed_amount_usd: 0,
        back_office_signed_amount_usd: 0,
        kam_office_signed_amount_usd: 0,
      });
    } catch (err) {
      console.error("Erreur chargement comptes convertis:", err);
    } finally {
      setLoadingConverted(false);
    }
  };

  // Load CRM Bank (1 000 Enterprises)
  const loadEnterprises = async () => {
    setLoadingCRM(true);
    try {
      let url = `/api/sales/enterprises/?limit=1000`;
      if (crmSegmentFilter !== 'ALL') url += `&segment=${crmSegmentFilter}`;
      if (crmEntityFilter !== 'ALL') url += `&assigned_entity=${crmEntityFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      
      const data = await fetchAPI(url);
      setEnterprises(data.enterprises || []);
      setCrmTotalCount(data.total || 1000);
    } catch (err) {
      console.error("Erreur chargement CRM:", err);
    } finally {
      setLoadingCRM(false);
    }
  };

  // Load B2B Offers from Core AI
  const loadB2bOffers = async () => {
    setLoadingB2bOffers(true);
    try {
      let url = `/api/sales/b2b-offers/?category=${b2bCategoryFilter}&rdc_availability=${b2bRdcFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const data = await fetchAPI(url);
      setB2bOffers(data.services || []);
      setB2bTotalCount(data.total_services || 41);
      setB2bCategories(data.categories || []);
    } catch (err) {
      console.error("Erreur chargement offres B2B:", err);
    } finally {
      setLoadingB2bOffers(false);
    }
  };

  useEffect(() => {
    loadSegmentationConfig();
    loadManagers();
    loadConvertedAccounts();
    loadEnterprises();
    loadB2bOffers();
    loadFieldSales();
    loadKamsTeam();
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
  }, []);

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
      setAvatarSuccessMsg("Memoji mis à jour avec succès dans tout le système !");
      setTimeout(() => setAvatarSuccessMsg(''), 3500);
    } catch (err: any) {
      console.error(err);
      setAvatarErrorMsg(err.message || "Erreur lors de la mise à jour du Memoji.");
    } finally {
      setSavingAvatar(false);
    }
  };

  // Execute Search Callback
  const executeSearch = useCallback(() => {
    if (activeTab === 'converted') {
      loadConvertedAccounts();
    } else if (activeTab === 'crm_bank') {
      loadEnterprises();
    } else if (activeTab === 'b2b_catalog') {
      loadB2bOffers();
    } else if (activeTab === 'supervisors' || activeTab === 'kam_managers') {
      loadManagers();
    } else if (activeTab === 'field_sales') {
      loadFieldSales();
    } else if (activeTab === 'kams_team') {
      loadKamsTeam();
    } else if (activeTab === 'directives') {
      loadDirectives();
    }
  }, [
    activeTab,
    convertedFilterEntity,
    crmSegmentFilter,
    crmEntityFilter,
    b2bCategoryFilter,
    b2bRdcFilter,
    directiveFilterEntity,
    directiveFilterStatus,
    directiveFilterOrigin,
    searchQuery
  ]);

  // Exécution automatique à la saisie avec debouncing 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, executeSearch]);

  // Exécution immédiate au changement d'onglet ou de filtre
  useEffect(() => {
    executeSearch();
  }, [
    activeTab,
    convertedFilterEntity,
    crmSegmentFilter,
    crmEntityFilter,
    b2bCategoryFilter,
    b2bRdcFilter,
    directiveFilterEntity,
    directiveFilterStatus,
    directiveFilterOrigin
  ]);

  // Handle Save Segmentation Config
  const handleSaveSegmentation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tpeThreshold >= pmeThreshold) {
      alert("Le seuil TPE / Informel doit être strictement inférieur au seuil PME.");
      return;
    }

    setSavingConfig(true);
    setConfigSuccessMsg('');
    try {
      const res = await fetchAPI('/api/sales/segmentation-config/', {
        method: 'PUT',
        body: JSON.stringify({
          tpe_max_revenue: tpeThreshold,
          pme_max_revenue: pmeThreshold,
        })
      });
      setConfig(res.config);
      setConfigSuccessMsg(res.message || "Segmentation mise à jour et ré-appliquée aux 1 000 comptes !");
      loadConvertedAccounts();
      loadEnterprises();
      setTimeout(() => setConfigSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erreur lors de la mise à jour des seuils.");
    } finally {
      setSavingConfig(false);
    }
  };

  // Handle Create Manager
  const handleOpenCreateManager = (role: 'SUPERVISOR' | 'KAM_MANAGER') => {
    setTargetRoleToCreate(role);
    setManagerForm({
      first_name: '',
      last_name: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      location: role === 'SUPERVISOR' ? 'Direction Régionale Kinshasa' : 'Kinshasa & Portefeuille National',
      avatar: role === 'SUPERVISOR' ? 'memoji_031.png' : 'memoji_019.png',
    });
    setManagerCreateError('');
    setIsManagerModalOpen(true);
  };

  const handleSaveManager = async (e: React.FormEvent) => {
    e.preventDefault();
    setManagerCreateError('');
    setCreatingManager(true);
    try {
      await fetchAPI('/api/accounts/managers/', {
        method: 'POST',
        body: JSON.stringify({
          ...managerForm,
          role: targetRoleToCreate,
        })
      });
      setIsManagerModalOpen(false);
      loadManagers();
    } catch (err: any) {
      console.error(err);
      setManagerCreateError(err.message || "Impossible de créer le compte gestionnaire.");
    } finally {
      setCreatingManager(false);
    }
  };

  // Toggle Manager Active
  const handleToggleManagerActive = async (id: number) => {
    try {
      await fetchAPI(`/api/accounts/managers/${id}/toggle-active/`, {
        method: 'PATCH'
      });
      loadManagers();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour du statut.");
    }
  };

  // Open Create B2B Offer Modal
  const handleOpenCreateOffer = () => {
    setIsOfferEditMode(false);
    setOfferForm({
      service_id: '',
      name: '',
      category: b2bCategories[0] || 'Mobile et flotte',
      description: '',
      allowed_benefits: 'Centraliser la gestion\nRéduire les coûts de connectivité',
      target_customers: 'PME et Grands Comptes en RDC',
      commercial_terms: 'Facturation mensuelle en USD\nEngagement annuel recommandé',
      prerequisites: 'Raccordement fibre ou couverture 4G Orange Business',
      exclusions: 'Hors frais de génie civil spécifiques',
      need_keywords: 'fibre, internet entreprise, télécoms rdc, connectivité pro',
      rdc_availability: 'published_local',
      availability_note: '',
      source_url: 'https://www.orange-business.com/en/products',
    });
    setOfferActionError('');
    setIsOfferModalOpen(true);
  };

  // Open Edit B2B Offer Modal
  const handleOpenEditOffer = (offer: B2BOfferItem) => {
    setIsOfferEditMode(true);
    setOfferForm({
      service_id: offer.service_id,
      name: offer.name,
      category: offer.category,
      description: offer.description,
      allowed_benefits: (offer.allowed_benefits || []).join('\n'),
      target_customers: (offer.target_customers || []).join('\n'),
      commercial_terms: (offer.commercial_terms || []).join('\n'),
      prerequisites: (offer.prerequisites || []).join('\n'),
      exclusions: (offer.exclusions || []).join('\n'),
      need_keywords: (offer.match?.need_keywords || []).join(', '),
      rdc_availability: offer.rdc_availability || 'published_local',
      availability_note: offer.availability_note || '',
      source_url: offer.source_url || 'https://www.orange-business.com/en/products',
    });
    setOfferActionError('');
    setIsOfferModalOpen(true);
  };

  // Save B2B Offer (Create or Update)
  const handleSaveOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOffer(true);
    setOfferActionError('');

    try {
      const payload = {
        service_id: offerForm.service_id.trim().toLowerCase(),
        name: offerForm.name.trim(),
        category: offerForm.category.trim(),
        description: offerForm.description.trim(),
        allowed_benefits: offerForm.allowed_benefits.split('\n').map(s => s.trim()).filter(Boolean),
        target_customers: offerForm.target_customers.split('\n').map(s => s.trim()).filter(Boolean),
        commercial_terms: offerForm.commercial_terms.split('\n').map(s => s.trim()).filter(Boolean),
        prerequisites: offerForm.prerequisites.split('\n').map(s => s.trim()).filter(Boolean),
        exclusions: offerForm.exclusions.split('\n').map(s => s.trim()).filter(Boolean),
        source_url: offerForm.source_url.trim(),
        rdc_availability: offerForm.rdc_availability,
        availability_note: offerForm.availability_note.trim(),
        match: {
          need_keywords: offerForm.need_keywords.split(',').map(s => s.trim()).filter(Boolean),
        }
      };

      if (isOfferEditMode) {
        await fetchAPI(`/api/sales/b2b-offers/${offerForm.service_id}/`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setOfferSuccessMsg(`Offre B2B "${offerForm.name}" mise à jour avec succès dans le Core AI.`);
      } else {
        await fetchAPI('/api/sales/b2b-offers/', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setOfferSuccessMsg(`Nouvelle offre B2B "${offerForm.name}" ajoutée au Core AI.`);
      }

      setIsOfferModalOpen(false);
      loadB2bOffers();
      setTimeout(() => setOfferSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setOfferActionError(err.message || "Erreur lors de l'enregistrement de l'offre B2B.");
    } finally {
      setSavingOffer(false);
    }
  };

  // Delete B2B Offer
  const handleDeleteOffer = async (serviceId: string, offerName: string) => {
    if (!window.confirm(`Confirmez-vous la suppression de l'offre "${offerName}" (${serviceId}) du catalogue Core AI ?`)) {
      return;
    }

    try {
      await fetchAPI(`/api/sales/b2b-offers/${serviceId}/`, {
        method: 'DELETE'
      });
      loadB2bOffers();
      setOfferSuccessMsg(`L'offre "${offerName}" a été supprimée.`);
      setTimeout(() => setOfferSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erreur lors de la suppression de l'offre.");
    }
  };

  // Import JSON Catalog
  const handleOpenImportModal = () => {
    setRawImportJson('');
    setOfferActionError('');
    setIsImportOffersModalOpen(true);
  };

  const handleImportJsonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportingJson(true);
    setOfferActionError('');

    try {
      let parsed;
      try {
        parsed = JSON.parse(rawImportJson);
      } catch (err) {
        throw new Error("Le contenu collé n'est pas un JSON valide.");
      }

      await fetchAPI('/api/sales/b2b-offers/import/', {
        method: 'POST',
        body: JSON.stringify(parsed)
      });

      setIsImportOffersModalOpen(false);
      loadB2bOffers();
      setOfferSuccessMsg("Catalogue B2B importé et synchronisé avec succès avec le Core AI !");
      setTimeout(() => setOfferSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setOfferActionError(err.message || "Erreur lors de l'importation du catalogue JSON.");
    } finally {
      setImportingJson(false);
    }
  };

  // Filtered managers by role
  const supervisorsList = useMemo(() => managers.filter(m => m.role === 'SUPERVISOR').sort((a, b) => new Date(b.date_joined).getTime() - new Date(a.date_joined).getTime()), [managers]);
  const kamManagersList = useMemo(() => managers.filter(m => m.role === 'KAM_MANAGER').sort((a, b) => new Date(b.date_joined).getTime() - new Date(a.date_joined).getTime()), [managers]);

  // Filtered Memojis catalog
  const filteredMemojis = useMemo(() => {
    if (memojiGenderFilter === 'all') return memojisCatalog;
    return memojisCatalog.filter((m) => m.gender === memojiGenderFilter);
  }, [memojisCatalog, memojiGenderFilter]);

  // Filtered Converted Accounts
  const filteredConvertedAccounts = useMemo(() => {
    if (!searchQuery) return convertedAccounts;
    const q = searchQuery.toLowerCase();
    return convertedAccounts.filter(acc =>
      acc.name.toLowerCase().includes(q) ||
      acc.crm_id.toLowerCase().includes(q) ||
      (acc.contact_name && acc.contact_name.toLowerCase().includes(q)) ||
      (acc.converted_offer && acc.converted_offer.toLowerCase().includes(q)) ||
      (acc.city && acc.city.toLowerCase().includes(q)) ||
      (acc.rccm && acc.rccm.toLowerCase().includes(q))
    );
  }, [convertedAccounts, searchQuery]);

  // Filtered supervisors
  const filteredSupervisors = useMemo(() => {
    return supervisorsList.filter(s => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.full_name.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.location && s.location.toLowerCase().includes(q))
      );
    });
  }, [supervisorsList, searchQuery]);

  // Filtered KAM managers
  const filteredKamManagers = useMemo(() => {
    return kamManagersList.filter(k => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        k.full_name.toLowerCase().includes(q) ||
        k.username.toLowerCase().includes(q) ||
        (k.email && k.email.toLowerCase().includes(q)) ||
        (k.location && k.location.toLowerCase().includes(q))
      );
    });
  }, [kamManagersList, searchQuery]);

  // Filtered salespersons (triés par points de performance décroissants, jamais par ordre alphabétique)
  const filteredSalespersons = useMemo(() => {
    return salespersons
      .filter(sp => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          sp.full_name.toLowerCase().includes(q) ||
          sp.username.toLowerCase().includes(q) ||
          (sp.location && sp.location.toLowerCase().includes(q)) ||
          (sp.assigned_plaques && sp.assigned_plaques.some(p => p.toLowerCase().includes(q)))
        );
      })
      .sort((a, b) => {
        const ptsA = a.incentive_points || ((a.conversions_count || 0) * 100 + (a.form_submissions_count || 0) * 20 + (a.visits_count || 0) * 10);
        const ptsB = b.incentive_points || ((b.conversions_count || 0) * 100 + (b.form_submissions_count || 0) * 20 + (b.visits_count || 0) * 10);
        return ptsB - ptsA;
      });
  }, [salespersons, searchQuery]);

  // Filtered plaques
  const filteredPlaques = useMemo(() => {
    return plaques.filter(p => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q)
      );
    });
  }, [plaques, searchQuery]);

  // Filtered Enterprises for CRM Bank
  const filteredEnterprises = useMemo(() => {
    if (!searchQuery) return enterprises;
    const q = searchQuery.toLowerCase();
    return enterprises.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.crm_id.toLowerCase().includes(q) ||
      (e.rccm && e.rccm.toLowerCase().includes(q)) ||
      (e.sector && e.sector.toLowerCase().includes(q)) ||
      (e.city && e.city.toLowerCase().includes(q)) ||
      (e.contact_name && e.contact_name.toLowerCase().includes(q))
    );
  }, [enterprises, searchQuery]);

  // Filtered B2B Offers
  const filteredB2bOffers = useMemo(() => {
    if (!searchQuery) return b2bOffers;
    const q = searchQuery.toLowerCase();
    return b2bOffers.filter(o =>
      o.name.toLowerCase().includes(q) ||
      o.service_id.toLowerCase().includes(q) ||
      o.category.toLowerCase().includes(q) ||
      o.description.toLowerCase().includes(q) ||
      (o.match?.need_keywords && o.match.need_keywords.some(k => k.toLowerCase().includes(q)))
    );
  }, [b2bOffers, searchQuery]);

  // Filtered KAMs team (triés par chiffre d'affaires et conversions décroissants, jamais par ordre alphabétique)
  const filteredKamsTeam = useMemo(() => {
    return kamsTeam
      .filter(k => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          k.full_name.toLowerCase().includes(q) ||
          k.username.toLowerCase().includes(q) ||
          (k.company_name && k.company_name.toLowerCase().includes(q)) ||
          (k.email && k.email.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if ((b.converted_amount || 0) !== (a.converted_amount || 0)) {
          return (b.converted_amount || 0) - (a.converted_amount || 0);
        }
        if ((b.converted_count || 0) !== (a.converted_count || 0)) {
          return (b.converted_count || 0) - (a.converted_count || 0);
        }
        return (b.portfolio_count || 0) - (a.portfolio_count || 0);
      });
  }, [kamsTeam, searchQuery]);

  // Top 3 KAMs Podium (Ranked by CA signé desc, conversions desc, portfolio desc)
  const top3Kams = useMemo(() => {
    return [...kamsTeam]
      .sort((a, b) => {
        if ((b.converted_amount || 0) !== (a.converted_amount || 0)) {
          return (b.converted_amount || 0) - (a.converted_amount || 0);
        }
        if ((b.converted_count || 0) !== (a.converted_count || 0)) {
          return (b.converted_count || 0) - (a.converted_count || 0);
        }
        return (b.portfolio_count || 0) - (a.portfolio_count || 0);
      })
      .slice(0, 3);
  }, [kamsTeam]);

  // Top 3 Salespersons Podium (Ranked by points desc, conversions desc, visits desc)
  const top3Salespersons = useMemo(() => {
    return [...salespersons]
      .sort((a, b) => {
        const ptsA = a.incentive_points || ((a.conversions_count || 0) * 100 + (a.form_submissions_count || 0) * 20 + (a.visits_count || 0) * 10);
        const ptsB = b.incentive_points || ((b.conversions_count || 0) * 100 + (b.form_submissions_count || 0) * 20 + (b.visits_count || 0) * 10);
        return ptsB - ptsA;
      })
      .slice(0, 3);
  }, [salespersons]);

  // Filtered KAM portfolio accounts for modal
  const filteredKamPortfolioAccounts = useMemo(() => {
    if (!kamPortfolioSearch) return kamPortfolioAccounts;
    const q = kamPortfolioSearch.toLowerCase();
    return kamPortfolioAccounts.filter(acc =>
      acc.name.toLowerCase().includes(q) ||
      acc.crm_id.toLowerCase().includes(q) ||
      (acc.sector && acc.sector.toLowerCase().includes(q)) ||
      (acc.city && acc.city.toLowerCase().includes(q))
    );
  }, [kamPortfolioAccounts, kamPortfolioSearch]);

  // Filtered Directives (Multi-Admins Traceability & Origin)
  const filteredDirectives = useMemo(() => {
    const list = Array.isArray(directives) ? directives : [];
    return list.filter(d => {
      // Origin filter
      if (directiveFilterOrigin === 'MINE' && user) {
        if (d.sender_username !== user.username && d.sender !== user.id) return false;
      } else if (directiveFilterOrigin === 'OTHERS' && user) {
        if (d.sender_username === user.username || d.sender === user.id) return false;
      }
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        d.instruction.toLowerCase().includes(q) ||
        d.recipient_name.toLowerCase().includes(q) ||
        d.recipient_username.toLowerCase().includes(q) ||
        (d.sender_name && d.sender_name.toLowerCase().includes(q)) ||
        (d.sender_username && d.sender_username.toLowerCase().includes(q)) ||
        (d.target_account_name && d.target_account_name.toLowerCase().includes(q))
      );
    });
  }, [directives, searchQuery, directiveFilterOrigin, user]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F6F5F2] dark:bg-[#242124]">
        <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      {/* Container: 60% Dominant Background (#F6F5F2 en light, #18181B en dark) */}
      <div className="h-screen w-full flex bg-[#F6F5F2] dark:bg-[#242124] font-sans text-[#242124] dark:text-[#FFFFFF] antialiased selection:bg-[#4F6CE8]/20 selection:text-[#4F6CE8] p-3 md:p-4 gap-4 overflow-hidden">
        
        {/* ========================================================================= */}
        {/* 1. SIDEBAR FLOTTANTE GIVRÉE RÉRACTABLE (30% Surface Structure)             */}
        {/* ========================================================================= */}
        <aside className={`${isCollapsed ? 'w-20 p-3' : 'w-72 p-5'} h-full bg-white/80 dark:bg-[#2D2A2D]/90 backdrop-blur-2xl rounded-3xl flex flex-col justify-between shadow-sm border border-black/5 dark:border-white/5 shrink-0 transition-all duration-300`}>
          
          <div className="flex flex-col gap-5 overflow-hidden">
            {/* Logo Onbora & Bouton de Rétractation */}
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-1 pt-1`}>
              <div className="flex items-center gap-3">
                <Logo size={36} />
                {!isCollapsed && (
                  <div>
                    <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-widest block">
                      Console Centrale
                    </span>
                    <span className="text-xs font-medium text-[#242124] dark:text-white block tracking-tight">
                      Super Administration
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white transition-colors cursor-pointer"
                title={isCollapsed ? "Développer le menu" : "Réduire le menu"}
              >
                <Icons.Sidebar size={18} />
              </button>
            </div>

            {/* Navigation Tabs (Hiérarchie Optimale Sans Titres de Section) */}
            <nav className="flex flex-col gap-1.5 overflow-y-auto pr-0.5">
              {[
                {
                  id: 'converted',
                  label: 'Comptes Convertis',
                  icon: <Icons.CheckCircle size={16} />,
                  count: config?.stats?.total_converted ?? convertedSummary.total_count,
                },
                {
                  id: 'b2b_catalog',
                  label: "Catalogue d'offres",
                  icon: <Icons.Server size={16} />,
                  count: b2bTotalCount,
                },
                {
                  id: 'crm_bank',
                  label: 'Entreprises CRM',
                  icon: <Icons.Layers size={16} />,
                  count: crmTotalCount,
                },
                {
                  id: 'supervisors',
                  label: 'Superviseurs Back-Office',
                  icon: <Icons.Map size={16} />,
                  count: supervisorsList.length,
                },
                {
                  id: 'kam_managers',
                  label: 'Gérants KAM Office',
                  icon: <Icons.Briefcase size={16} />,
                  count: kamManagersList.length,
                },
                {
                  id: 'field_sales',
                  label: 'Commerciaux & Plaques',
                  icon: <Icons.Users size={16} />,
                  count: salespersons.length,
                },
                {
                  id: 'kams_team',
                  label: 'Effectif des KAMs',
                  icon: <Icons.Award size={16} />,
                  count: kamsTeam.length,
                },
                {
                  id: 'directives',
                  label: 'Directives & Messages',
                  icon: <Icons.Send size={16} />,
                  count: (Array.isArray(directives) ? directives : []).filter(d => d.status !== 'COMPLETED').length,
                },
                {
                  id: 'segmentation',
                  label: 'Règles de Segmentation',
                  icon: <Icons.Sliders size={16} />,
                },
                {
                  id: 'copilot',
                  label: 'Copilote IA',
                  icon: <Icons.Bot size={16} />,
                  count: 'AI',
                },
                {
                  id: 'settings',
                  label: 'Paramètres & FAQ',
                  icon: <Icons.Settings size={16} />,
                },
              ].map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    title={item.label}
                    className={`w-full ${isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'} rounded-2xl text-xs font-medium transition-all flex items-center cursor-pointer ${
                      isActive
                        ? 'bg-[#4F6CE8] text-white shadow-sm'
                        : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#242124] dark:hover:text-white'
                    }`}
                  >
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                      {item.icon}
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!isCollapsed && item.count !== undefined && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-[#6E6C67] dark:text-[#A1A1AA]'
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Profil Administrateur avec Memoji & Déconnexion */}
          <div className="flex flex-col gap-3 pt-4 border-t border-black/5 dark:border-white/5">
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-1`}>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} text-left cursor-pointer group`}
                title={isCollapsed ? "Mon Profil & Memoji" : "Accéder aux paramètres et changer mon Memoji"}
              >
                <div className="w-9 h-9 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center font-medium text-xs shadow-sm overflow-hidden group-hover:ring-2 group-hover:ring-[#4F6CE8] transition-all shrink-0">
                  <img
                    src={`/memojis/${(user?.avatar || 'memoji_056.png').replace('assets/memojis/', '')}`}
                    alt="Memoji"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col truncate max-w-[130px]">
                    <span className="text-xs font-medium leading-tight text-[#242124] dark:text-white truncate group-hover:text-[#4F6CE8] transition-colors">
                      {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || 'Admin Onbora'}
                    </span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] truncate">
                      Administrateur Suprême
                    </span>
                  </div>
                )}
              </button>
              {!isCollapsed && (
                <button
                  onClick={logout}
                  title="Se déconnecter"
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#6E6C67] dark:text-[#A1A1AA] hover:text-red-500 transition-colors cursor-pointer"
                >
                  <Icons.LogOut size={15} />
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* 2. ZONE DE CONTENU PRINCIPALE                                             */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden gap-4">
          
          {/* Top Bar Universelle & Feedback (STRICTEMENT FIXE) */}
          <header className="bg-white/80 dark:bg-[#2D2A2D]/90 backdrop-blur-2xl rounded-3xl px-6 py-3.5 flex items-center justify-between shadow-sm border border-black/5 dark:border-white/5 shrink-0 z-10">
            {/* Recherche universelle alignée à gauche avec exécution automatique & Entrée */}
            <div className="flex-1 max-w-lg relative flex items-center">
              <Icons.Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E6C67] dark:text-[#A1A1AA] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    executeSearch();
                  }
                }}
                placeholder={getSearchPlaceholder()}
                className="w-full pl-10 pr-20 py-2 bg-black/5 dark:bg-white/5 rounded-2xl text-xs font-semibold text-[#242124] dark:text-white placeholder-[#6E6C67] dark:placeholder-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#4F6CE8]/50 transition-all border-0"
              />
              <div className="absolute right-2.5 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setTimeout(() => executeSearch(), 50);
                    }}
                    className="p-1 rounded-full text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer text-[10px]"
                    title="Effacer la recherche"
                  >
                    <Icons.X size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => executeSearch()}
                  className="px-2 py-0.5 rounded-lg bg-[#4F6CE8]/10 hover:bg-[#4F6CE8] text-[#4F6CE8] hover:text-white font-mono text-[10px] font-medium transition-all cursor-pointer"
                  title="Valider la recherche (Entrée)"
                >
                  ↵
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {(directiveSuccessMsg || offerSuccessMsg) && (
                <div className="px-3.5 py-1.5 bg-[#4F6CE8]/10 text-[#4F6CE8] rounded-full text-[11px] font-semibold flex items-center gap-1.5 animate-fade-in">
                  <Icons.CheckCircle size={13} />
                  <span>{directiveSuccessMsg || offerSuccessMsg}</span>
                </div>
              )}

              {/* Raccourci Émettre une Directive */}
              <button
                onClick={() => {
                  setDirectiveForm({
                    target_entity: 'KAM_OFFICE',
                    recipient_id: '',
                    title: '',
                    instruction: '',
                    priority: 'NORMAL',
                    target_account_name: '',
                  });
                  setDirectiveErrorMsg('');
                  setIsDirectiveModalOpen(true);
                }}
                className="px-3.5 py-2 bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white rounded-2xl text-xs font-medium shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Icons.Send size={13} />
                <span className="hidden sm:inline">Émettre une Directive</span>
              </button>

              {/* Theme Toggle */}
              <ThemeToggle />
            </div>
          </header>

          {/* Corps défilable */}
          <main className="flex-1 overflow-y-auto pr-1 pb-4 flex flex-col gap-5">

          {/* ======================================================================= */}
          {/* VUE 1 : COMPTES CONVERTIS (SIGNATURES CONSOLIDÉES - VUE PAR DÉFAUT)     */}
          {/* ======================================================================= */}
          {activeTab === 'converted' && (
            <div className="flex flex-col gap-5">
              <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-[#4F6CE8]">Traçabilité des Signatures</span>
                  <h2 className="text-xl font-semibold text-[#242124] dark:text-white mt-1">Comptes Clients Convertis & Chiffre d'Affaires Signé</h2>
                  <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                    Historique consolidé de toutes les signatures obtenues par le Back-Office Terrain et par la Direction KAM Office.
                  </p>
                </div>

                {/* Filtre par Entité (Menu Déroulant Sleek) */}
                <div className="flex items-center gap-2 bg-[#F6F5F2] dark:bg-[#2D2A2D] px-3 py-1.5 rounded-2xl shrink-0 border border-black/5 dark:border-white/5">
                  <Icons.Filter size={13} className="text-[#6E6C67] dark:text-[#A1A1AA]" />
                  <select
                    value={convertedFilterEntity}
                    onChange={(e) => setConvertedFilterEntity(e.target.value as any)}
                    className="bg-transparent text-xs font-medium text-[#242124] dark:text-white outline-none cursor-pointer pr-2"
                  >
                    <option value="ALL" className="bg-white dark:bg-[#2D2A2D] text-[#242124] dark:text-white">Tous les bureaux ({convertedSummary.total_count})</option>
                    <option value="BACK_OFFICE" className="bg-white dark:bg-[#2D2A2D] text-[#242124] dark:text-white">Back-Office Terrain ({convertedSummary.back_office_count})</option>
                    <option value="KAM_OFFICE" className="bg-white dark:bg-[#2D2A2D] text-[#242124] dark:text-white">KAM Office ({convertedSummary.kam_office_count})</option>
                  </select>
                </div>
              </div>

              {/* Résumé Chiffre d'Affaires Signé */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">Total Chiffre d'Affaires Signé</span>
                  <span className="text-2xl font-extrabold text-[#242124] dark:text-white mt-1">
                    {convertedSummary.total_signed_amount_usd.toLocaleString()} $
                  </span>
                  <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">Valeur cumulée des signatures enregistrées</span>
                </div>

                <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">Signé par le Back-Office Terrain</span>
                  <span className="text-2xl font-extrabold text-[#242124] dark:text-white mt-1">
                    {convertedSummary.back_office_signed_amount_usd.toLocaleString()} $
                  </span>
                  <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">{convertedSummary.back_office_count} SOHO & commerces de proximité</span>
                </div>

                <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">Signé par le KAM Office</span>
                  <span className="text-2xl font-extrabold text-[#4F6CE8] mt-1">
                    {convertedSummary.kam_office_signed_amount_usd.toLocaleString()} $
                  </span>
                  <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">{convertedSummary.kam_office_count} Grands Comptes & PME structurées</span>
                </div>
              </div>

              {/* Table / Liste des Comptes Convertis */}
              <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#242124] dark:text-white">
                    Liste des Comptes Convertis ({filteredConvertedAccounts.length})
                  </h3>
                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Cliquez sur un dossier pour afficher sa fiche complète</span>
                </div>

                {loadingConverted ? (
                  <div className="py-12 flex justify-center">
                    <div className="w-6 h-6 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
                  </div>
                ) : filteredConvertedAccounts.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                    Aucun compte converti ne correspond aux critères sélectionnés.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredConvertedAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="bg-[#F6F5F2] dark:bg-[#242124] hover:bg-black/5 dark:hover:bg-white/5 p-4 rounded-2xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        onClick={() => setSelectedAccountDetail(acc)}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-medium text-xs shrink-0 ${
                            acc.converted_by_entity === 'BACK_OFFICE'
                              ? 'bg-black/5 dark:bg-white/10 text-[#242124] dark:text-white'
                              : 'bg-[#4F6CE8]/15 text-[#4F6CE8]'
                          }`}>
                            {acc.converted_by_entity === 'BACK_OFFICE' ? 'BO' : 'KAM'}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-[#242124] dark:text-white group-hover:text-[#4F6CE8] transition-colors">{acc.name}</span>
                              <span className="text-[9px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase">({acc.crm_id})</span>
                            </div>
                            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                              {acc.city} ({acc.commune}) • RCCM : {acc.rccm || "En cours"} • Contact : {acc.contact_name} ({acc.contact_role})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 self-end sm:self-auto">
                          <div className="text-right">
                            <span className="text-xs font-medium text-[#242124] dark:text-white block">
                              +{Number(acc.converted_amount).toLocaleString()} $
                            </span>
                            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] line-clamp-1 max-w-xs">
                              {acc.converted_offer || "Pack Fibre Managée"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDirectiveToRecipient(
                                acc.converted_by_entity || 'KAM_OFFICE',
                                0,
                                acc.name
                              );
                            }}
                            className="p-2 rounded-xl bg-white dark:bg-[#2D2A2D] hover:bg-[#4F6CE8] text-[#6E6C67] hover:text-white transition-all shadow-sm cursor-pointer"
                            title="Émettre une directive sur ce compte converti"
                          >
                            <Icons.Send size={12} />
                          </button>
                          <Icons.ChevronRight size={14} className="text-[#6E6C67] dark:text-[#A1A1AA]" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* VUE 2 : CATALOGUE D'OFFRES B2B (MOTEUR CORE AI)                         */}
          {/* ======================================================================= */}
          {activeTab === 'b2b_catalog' && (
            <div className="flex flex-col gap-5">
              <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-[#4F6CE8]">Moteur Core AI</span>
                  <h2 className="text-xl font-semibold text-[#242124] dark:text-white mt-1">Catalogue d'offres</h2>
                  <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                    Solutions et services B2B exploitées par le moteur Core AI pour les recommandations.
                  </p>
                </div>

                {/* Actions Offres B2B */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={handleOpenImportModal}
                    className="px-4 py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#242124] dark:text-white rounded-2xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Icons.Download size={14} />
                    <span>Importer / Sync JSON</span>
                  </button>
                  <button
                    onClick={handleOpenCreateOffer}
                    className="px-4 py-2.5 bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white rounded-2xl text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Icons.Plus size={14} />
                    <span>Nouvelle Offre B2B</span>
                  </button>
                </div>
              </div>

              {/* Métriques Clés du Catalogue */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">Total Offres B2B Actives</span>
                  <span className="text-2xl font-extrabold text-[#242124] dark:text-white mt-1">{b2bTotalCount}</span>
                  <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">Solutions intégrées dans le moteur IA</span>
                </div>

                <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">Catégories Métier</span>
                  <span className="text-2xl font-extrabold text-[#4F6CE8] mt-1">{b2bCategories.length}</span>
                  <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">Connectivité, Cloud, Cybersécurité, Mobile...</span>
                </div>

                <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">Disponibilité RDC Directe</span>
                  <span className="text-2xl font-extrabold text-[#242124] dark:text-white mt-1">
                    {b2bOffers.filter(o => o.rdc_availability === 'published_local').length}
                  </span>
                  <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">Offres publiées et souscriptibles localement</span>
                </div>
              </div>

              {/* Filtres Catégorie & Scope */}
              <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-[#242124] dark:text-white">
                    Liste des Solutions B2B ({b2bOffers.length} affichées)
                  </h3>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={b2bCategoryFilter}
                      onChange={(e) => setB2bCategoryFilter(e.target.value)}
                      className="px-3 py-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl text-xs font-medium text-[#242124] dark:text-white focus:outline-none border-0 cursor-pointer"
                    >
                      <option value="ALL">Toutes les Catégories</option>
                      {b2bCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select
                      value={b2bRdcFilter}
                      onChange={(e) => setB2bRdcFilter(e.target.value)}
                      className="px-3 py-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl text-xs font-medium text-[#242124] dark:text-white focus:outline-none border-0 cursor-pointer"
                    >
                      <option value="ALL">Tous les Scopes</option>
                      <option value="published_local">Publié Local RDC</option>
                      <option value="to_confirm">International / À confirmer</option>
                    </select>
                  </div>
                </div>

                {loadingB2bOffers ? (
                  <div className="py-16 flex justify-center">
                    <div className="w-7 h-7 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
                  </div>
                ) : b2bOffers.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                    Aucune offre B2B trouvée avec ces critères.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {b2bOffers.map((offer) => (
                      <div
                        key={offer.service_id}
                        className="bg-[#F6F5F2] dark:bg-[#242124] p-5 rounded-2xl flex flex-col justify-between gap-4 text-xs"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-[#242124] dark:text-white">{offer.name}</h4>
                                <span className="text-[9px] font-mono px-2 py-0.5 bg-black/5 dark:bg-white/10 rounded-md text-[#6E6C67] dark:text-[#A1A1AA]">
                                  {offer.service_id}
                                </span>
                              </div>
                              <span className="text-[10px] text-[#4F6CE8] font-medium block mt-0.5">
                                {offer.category}
                              </span>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold shrink-0 bg-black/5 dark:bg-white/10 text-[#242124] dark:text-white">
                              {offer.rdc_availability === 'published_local' ? 'RDC Local' : 'À Confirmer'}
                            </span>
                          </div>

                          <p className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA] leading-relaxed line-clamp-3">
                            {offer.description}
                          </p>

                          {/* Avantages Clés */}
                          {offer.allowed_benefits && offer.allowed_benefits.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {offer.allowed_benefits.slice(0, 3).map((b, idx) => (
                                <span key={idx} className="text-[10px] px-2 py-0.5 bg-white dark:bg-[#2D2A2D] text-[#242124] dark:text-white rounded-md border border-black/5 dark:border-white/5">
                                  {b}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Mots-clés matching IA */}
                          {offer.match?.need_keywords && offer.match.need_keywords.length > 0 && (
                            <div className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] pt-1">
                              <span className="font-medium">Mots-clés IA :</span> {offer.match.need_keywords.slice(0, 5).join(', ')}
                            </div>
                          )}
                        </div>

                        {/* Actions Éditer / Supprimer */}
                        <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5">
                          <a
                            href={offer.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-[#6E6C67] hover:text-[#4F6CE8] transition-colors truncate max-w-[180px]"
                          >
                            Documentation officielle ↗
                          </a>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEditOffer(offer)}
                              className="px-3 py-1.5 bg-white dark:bg-[#2D2A2D] hover:bg-black/5 text-[#242124] dark:text-white rounded-xl text-xs font-medium border border-black/5 dark:border-white/5 transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Icons.Edit size={12} />
                              <span>Éditer</span>
                            </button>
                            <button
                              onClick={() => handleDeleteOffer(offer.service_id, offer.name)}
                              className="p-1.5 hover:bg-red-500/10 text-[#6E6C67] hover:text-red-500 rounded-xl transition-colors cursor-pointer"
                              title="Supprimer l'offre"
                            >
                              <Icons.Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* VUE 3 : ENTREPRISES PROVENANT DU CRM (BASE DE DONNÉES)                  */}
          {/* ======================================================================= */}
          {activeTab === 'crm_bank' && (
            <div className="flex flex-col gap-5">
              <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-[#4F6CE8]">Source Unique de Vérité CRM</span>
                  <h2 className="text-xl font-semibold text-[#242124] dark:text-white mt-1">Entreprises CRM</h2>
                  <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                    Consultation de l'ensemble des entreprises enregistrées dans le CRM avec chiffre d'affaires, géolocalisation et segmentation.
                  </p>
                </div>

                {/* Filtres Combinés */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={crmSegmentFilter}
                    onChange={(e) => setCrmSegmentFilter(e.target.value)}
                    className="px-3 py-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl text-xs font-medium text-[#242124] dark:text-white focus:outline-none border-0 cursor-pointer"
                  >
                    <option value="ALL">Tous les Segments</option>
                    <option value="GRAND_COMPTE">Grands Comptes (Top C-Level)</option>
                    <option value="PME">PME (Moyennes structures)</option>
                    <option value="TPE_INFORMEL">SOHO (Commerces, Artisans, Proximité)</option>
                  </select>

                  <select
                    value={crmEntityFilter}
                    onChange={(e) => setCrmEntityFilter(e.target.value)}
                    className="px-3 py-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl text-xs font-medium text-[#242124] dark:text-white focus:outline-none border-0 cursor-pointer"
                  >
                    <option value="ALL">Toutes les Entités</option>
                    <option value="BACK_OFFICE">Back-Office Terrain (Commerciaux)</option>
                    <option value="KAM_OFFICE">KAM Office (Desk KAM)</option>
                  </select>
                </div>
              </div>

              {/* Table / Liste des Entreprises CRM */}
              <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#242124] dark:text-white">
                    Résultats ({enterprises.length} entreprises affichées sur {crmTotalCount})
                  </h3>
                </div>

                {loadingCRM ? (
                  <div className="py-16 flex justify-center">
                    <div className="w-7 h-7 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
                    {enterprises.map((ent) => (
                      <div
                        key={ent.id}
                        className="bg-[#F6F5F2] dark:bg-[#242124] p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-medium text-[10px] shrink-0 ${
                            ent.segment === 'GRAND_COMPTE'
                              ? 'bg-black/5 dark:bg-white/10 text-[#242124] dark:text-white font-medium'
                              : ent.segment === 'PME'
                              ? 'bg-[#4F6CE8]/15 text-[#4F6CE8] font-medium'
                              : 'bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA] font-medium'
                          }`}>
                            {ent.segment === 'GRAND_COMPTE' ? 'GC' : ent.segment === 'PME' ? 'PME' : 'SOHO'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#242124] dark:text-white">{ent.name}</span>
                              <span className="text-[9px] font-medium text-[#6E6C67] dark:text-[#A1A1AA]">({ent.crm_id})</span>
                            </div>
                            <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                              {ent.sector} • {ent.city} ({ent.commune}) • Opérateur : {ent.current_operator} ({ent.current_connectivity})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <div className="text-right">
                            <span className="font-medium text-[#242124] dark:text-white block">
                              {Number(ent.annual_revenue).toLocaleString()} $ / an
                            </span>
                            <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full inline-block ${
                              ent.assigned_entity === 'BACK_OFFICE'
                                ? 'bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA]'
                                : 'bg-[#4F6CE8]/15 text-[#4F6CE8]'
                            }`}>
                              {ent.assigned_entity === 'BACK_OFFICE' ? 'Back-Office Terrain' : 'KAM Office'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenDirectiveToRecipient(
                              ent.assigned_entity as any || 'KAM_OFFICE',
                              0,
                              ent.name
                            )}
                            className="p-2 rounded-xl bg-white dark:bg-[#2D2A2D] hover:bg-[#4F6CE8] text-[#6E6C67] hover:text-white transition-all shadow-sm cursor-pointer"
                            title="Émettre une directive sur cette entreprise"
                          >
                            <Icons.Send size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* VUE 4 : SUPERVISEURS BACK-OFFICE (LISTE DENSE & ACTIONS MANcontext)     */}
          {/* ======================================================================= */}
          {activeTab === 'supervisors' && (
            <div className="flex flex-col gap-5">
              <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-[#4F6CE8]">Encadrement Terrain</span>
                  <h2 className="text-xl font-semibold text-[#242124] dark:text-white mt-1">Superviseurs Back-Office ({filteredSupervisors.length})</h2>
                  <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                    Pilotage cartographique des commerciaux et supervision des plaques territoriales SOHO.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenCreateManager('SUPERVISOR')}
                  className="px-4 py-2.5 bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white rounded-2xl text-xs font-medium shadow-sm transition-all cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <Icons.UserPlus size={14} />
                  <span>Nouveau Superviseur</span>
                </button>
              </div>

              {/* Table dense des Superviseurs */}
              <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-black/5 dark:border-white/5 text-[10px] font-medium uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                        <th className="pb-3 px-3">Superviseur</th>
                        <th className="pb-3 px-3">Plaque / Territoire</th>
                        <th className="pb-3 px-3">Contact</th>
                        <th className="pb-3 px-3">Statut</th>
                        <th className="pb-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {filteredSupervisors.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-[#6E6C67] dark:text-[#A1A1AA]">
                            Aucun superviseur ne correspond à votre recherche.
                          </td>
                        </tr>
                      ) : (
                        filteredSupervisors.map((sup) => (
                          <tr key={sup.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center font-medium text-xs overflow-hidden shrink-0">
                                  <img
                                    src={`/memojis/${(sup.avatar || 'memoji_031.png').replace('assets/memojis/', '')}`}
                                    alt={sup.full_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                                <div>
                                  <span className="font-medium text-[#242124] dark:text-white block">{sup.full_name}</span>
                                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">@{sup.username}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-semibold text-[#242124] dark:text-white">
                              {sup.location || "Kinshasa Centre"}
                            </td>
                            <td className="py-3 px-3 text-[#6E6C67] dark:text-[#A1A1AA]">
                              <div>{sup.email || "Non renseigné"}</div>
                              <div className="text-[10px]">{sup.phone || ""}</div>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                sup.is_active
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA]'
                              }`}>
                                {sup.is_active ? 'Actif' : 'Désactivé'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenDirectiveToRecipient('BACK_OFFICE', sup.id)}
                                  className="px-2.5 py-1.5 bg-[#4F6CE8]/10 hover:bg-[#4F6CE8] text-[#4F6CE8] hover:text-white rounded-xl text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5"
                                  title="Transmettre une directive opérationnelle"
                                >
                                  <Icons.Send size={11} />
                                  <span>Directive</span>
                                </button>
                                <button
                                  onClick={() => handleToggleManagerActive(sup.id)}
                                  className="px-2.5 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white rounded-xl text-[11px] font-medium transition-all cursor-pointer"
                                >
                                  {sup.is_active ? "Désactiver" : "Réactiver"}
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
          )}

          {/* ======================================================================= */}
          {/* VUE 5 : GÉRANTS KAM OFFICE (LISTE DENSE & ACTIONS DIRECTIVES)            */}
          {/* ======================================================================= */}
          {activeTab === 'kam_managers' && (
            <div className="flex flex-col gap-5">
              <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-[#4F6CE8]">Direction Stratégique</span>
                  <h2 className="text-xl font-semibold text-[#242124] dark:text-white mt-1">Gérants KAM Office ({filteredKamManagers.length})</h2>
                  <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                    Supervision des Key Account Managers et pilotage des portefeuilles PME & Grands Comptes.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenCreateManager('KAM_MANAGER')}
                  className="px-4 py-2.5 bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white rounded-2xl text-xs font-medium shadow-sm transition-all cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <Icons.UserPlus size={14} />
                  <span>Nouveau Gérant KAM</span>
                </button>
              </div>

              {/* Table dense des Gérants KAM */}
              <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-black/5 dark:border-white/5 text-[10px] font-medium uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                        <th className="pb-3 px-3">Gérant KAM</th>
                        <th className="pb-3 px-3">Direction / Pôle</th>
                        <th className="pb-3 px-3">Contact</th>
                        <th className="pb-3 px-3">Statut</th>
                        <th className="pb-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {filteredKamManagers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-[#6E6C67] dark:text-[#A1A1AA]">
                            Aucun gérant KAM ne correspond à votre recherche.
                          </td>
                        </tr>
                      ) : (
                        filteredKamManagers.map((km) => (
                          <tr key={km.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-2xl bg-[#4F6CE8]/10 border border-[#4F6CE8]/20 flex items-center justify-center font-medium text-xs overflow-hidden shrink-0">
                                  <img
                                    src={`/memojis/${(km.avatar || 'memoji_019.png').replace('assets/memojis/', '')}`}
                                    alt={km.full_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                                <div>
                                  <span className="font-medium text-[#242124] dark:text-white block">{km.full_name}</span>
                                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">@{km.username}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-semibold text-[#242124] dark:text-white">
                              {km.location || "Direction Grands Comptes"}
                            </td>
                            <td className="py-3 px-3 text-[#6E6C67] dark:text-[#A1A1AA]">
                              <div>{km.email || "Non renseigné"}</div>
                              <div className="text-[10px]">{km.phone || ""}</div>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                km.is_active
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA]'
                              }`}>
                                {km.is_active ? 'Actif' : 'Désactivé'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenDirectiveToRecipient('KAM_OFFICE', km.id)}
                                  className="px-2.5 py-1.5 bg-[#4F6CE8]/10 hover:bg-[#4F6CE8] text-[#4F6CE8] hover:text-white rounded-xl text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5"
                                  title="Transmettre une directive opérationnelle"
                                >
                                  <Icons.Send size={11} />
                                  <span>Directive</span>
                                </button>
                                <button
                                  onClick={() => handleToggleManagerActive(km.id)}
                                  className="px-2.5 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white rounded-xl text-[11px] font-medium transition-all cursor-pointer"
                                >
                                  {km.is_active ? "Désactiver" : "Réactiver"}
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
          )}

          {/* ======================================================================= */}
          {/* VUE 6 : COMMERCIAUX & PLAQUES CARTOGRAPHIQUES TERRAIN                   */}
          {/* ======================================================================= */}
          {activeTab === 'field_sales' && (
            <div className="flex flex-col gap-5">
              <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-[#4F6CE8]">Force de Vente Terrain</span>
                  <h2 className="text-xl font-semibold text-[#242124] dark:text-white mt-1">Commerciaux & Plaques Cartographiques</h2>
                  <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                    Suivi des visites, formulaires d'audit, points incentive et découpage géographique des plaques SOHO.
                  </p>
                </div>

                {/* Switcher Sous-Onglets */}
                <div className="flex items-center gap-1.5 bg-[#F6F5F2] dark:bg-[#242124] p-1.5 rounded-2xl shrink-0">
                  <button
                    onClick={() => setFieldSubTab('commerciaux')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      fieldSubTab === 'commerciaux'
                        ? 'bg-[#4F6CE8] text-white shadow-sm'
                        : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                    }`}
                  >
                    Commerciaux ({filteredSalespersons.length})
                  </button>
                  <button
                    onClick={() => setFieldSubTab('plaques')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      fieldSubTab === 'plaques'
                        ? 'bg-[#4F6CE8] text-white shadow-sm'
                        : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                    }`}
                  >
                    Plaques ({filteredPlaques.length})
                  </button>
                </div>
              </div>

              {/* Vue Commerciaux */}
              {fieldSubTab === 'commerciaux' && (
                <div className="flex flex-col gap-5">
                  {/* Barre d'action supérieure avec option discrète Podium Top 3 */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#6E6C67] dark:text-[#A1A1AA]">
                        {filteredSalespersons.length} commerciaux répertoriés
                      </span>
                    </div>

                    {top3Salespersons.length > 0 && (
                      <button
                        onClick={() => setShowSalespersonPodium(!showSalespersonPodium)}
                        className={`px-3.5 py-1.5 rounded-2xl text-xs font-medium transition-all cursor-pointer flex items-center gap-2 border ${
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
                  </div>

                  {/* Podium Discret et Compact des Commerciaux Terrain */}
                  {showSalespersonPodium && top3Salespersons.length > 0 && (
                    <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-4 border border-black/5 dark:border-white/5 flex flex-col gap-3 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icons.Trophy size={14} className="text-[#4F6CE8]" />
                          <span className="text-xs font-medium text-[#242124] dark:text-white">Top 3 Commerciaux Terrain • Incentive Méritocratique</span>
                        </div>
                        <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">100 pts / signature • 20 pts / fiche • 10 pts / visite</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {top3Salespersons.map((sp, idx) => (
                          <div
                            key={sp.id}
                            className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
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
                              <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-semibold text-white ${
                                idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : 'bg-amber-700'
                              }`}>
                                {idx + 1}
                              </div>
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs font-medium text-[#242124] dark:text-white truncate">{sp.full_name}</span>
                              <div className="flex items-center gap-2 text-[10px] mt-0.5">
                                <span className="font-medium text-[#4F6CE8]">{sp.incentive_points || 0} pts</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{sp.conversions_count || 0} sign.</span>
                                <span className="text-[#6E6C67] dark:text-[#A1A1AA]">{sp.visits_count || 0} vis.</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Table des Commerciaux */}
                  <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-black/5 dark:border-white/5 text-[10px] font-medium uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                            <th className="pb-3 px-3">Commercial</th>
                            <th className="pb-3 px-3">Plaques Affectées</th>
                            <th className="pb-3 px-3">Signatures</th>
                            <th className="pb-3 px-3">Visites</th>
                            <th className="pb-3 px-3">Formulaires</th>
                            <th className="pb-3 px-3">Incentive</th>
                            <th className="pb-3 px-3">Statut</th>
                            <th className="pb-3 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                          {loadingSalespersons ? (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-[#6E6C67] dark:text-[#A1A1AA]">
                                <div className="w-6 h-6 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin mx-auto" />
                              </td>
                            </tr>
                          ) : filteredSalespersons.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-[#6E6C67] dark:text-[#A1A1AA]">
                                Aucun commercial trouvé.
                              </td>
                            </tr>
                          ) : (
                            filteredSalespersons.map((sp) => (
                              <tr key={sp.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center font-medium text-xs overflow-hidden shrink-0">
                                      <img
                                        src={`/memojis/${(sp.avatar || 'memoji_056.png').replace('assets/memojis/', '')}`}
                                        alt={sp.full_name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <span className="font-medium text-[#242124] dark:text-white block">{sp.full_name}</span>
                                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">@{sp.username} • {sp.location || 'Kinshasa'}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex flex-wrap gap-1">
                                    {sp.assigned_plaques && sp.assigned_plaques.length > 0 ? (
                                      sp.assigned_plaques.map((p, idx) => (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() => setSelectedSalespersonForPlaques(sp)}
                                          className="px-2 py-0.5 rounded-md bg-[#4F6CE8]/10 hover:bg-[#4F6CE8] text-[#4F6CE8] hover:text-white font-medium text-[10px] transition-all cursor-pointer"
                                          title="Cliquer pour inspecter les détails de cette plaque"
                                        >
                                          {p}
                                        </button>
                                      ))
                                    ) : (
                                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Aucune</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3 font-medium text-emerald-600 dark:text-emerald-400">
                                  {sp.conversions_count || 0} signés
                                </td>
                                <td className="py-3 px-3 font-medium text-[#242124] dark:text-white">
                                  {sp.visits_count || 0}
                                </td>
                                <td className="py-3 px-3 font-medium text-[#242124] dark:text-white">
                                  {sp.form_submissions_count || 0}
                                </td>
                                <td className="py-3 px-3">
                                  <span className="px-2.5 py-0.5 rounded-full bg-[#4F6CE8]/15 text-[#4F6CE8] font-semibold text-[10px]">
                                    {sp.incentive_points || 0} pts
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    sp.is_available
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA]'
                                  }`}>
                                    {sp.is_available ? 'Disponible' : 'Occupé'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => setSelectedSalespersonForPlaques(sp)}
                                      className="px-2 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white rounded-xl text-[10px] font-medium transition-all cursor-pointer flex items-center gap-1"
                                      title="Voir les plaques associées"
                                    >
                                      <Icons.Map size={11} />
                                      <span>Plaques</span>
                                    </button>
                                    <button
                                      onClick={() => handleOpenDirectiveToRecipient('BACK_OFFICE', sp.id)}
                                      className="px-2.5 py-1.5 bg-[#4F6CE8]/10 hover:bg-[#4F6CE8] text-[#4F6CE8] hover:text-white rounded-xl text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5"
                                      title="Envoyer une directive au commercial"
                                    >
                                      <Icons.Send size={11} />
                                      <span>Directive</span>
                                    </button>
                                    <button
                                      onClick={() => handleToggleSalespersonActive(sp.id, sp.is_available)}
                                      className="px-2 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white rounded-xl text-[10px] font-medium transition-all cursor-pointer"
                                    >
                                      {sp.is_available ? "Inactif" : "Dispo"}
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
              )}

              {/* Vue Plaques */}
              {fieldSubTab === 'plaques' && (
                <div className="flex flex-col gap-4">
                  {/* Switcher Tableau vs Carte */}
                  <div className="flex items-center justify-between bg-white dark:bg-[#2D2A2D] p-4 rounded-3xl shadow-sm border border-black/5 dark:border-white/5">
                    <div>
                      <h3 className="text-sm font-semibold text-[#242124] dark:text-white">
                        Découpage Territorial des Plaques SOHO
                      </h3>
                      <p className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
                        Périmètres cartographiques délimités pour la prospection pédestre terrain.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPlaqueViewMode(plaqueViewMode === 'list' ? 'map' : 'list')}
                        className={`px-4 py-2 rounded-2xl text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
                          plaqueViewMode === 'map'
                            ? 'bg-[#4F6CE8] text-white shadow-sm'
                            : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#242124] dark:text-white'
                        }`}
                      >
                        <Icons.Map size={14} />
                        <span>{plaqueViewMode === 'map' ? "Afficher le Tableau des Plaques" : "Voir la Carte des Plaques"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Mode Carte Pure Admin */}
                  {plaqueViewMode === 'map' ? (
                    <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-5 shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
                      <AdminPlaqueMapOnly
                        plaques={plaques as any}
                      />
                    </div>
                  ) : (
                    /* Mode Tableau des Plaques */
                    <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-black/5 dark:border-white/5 text-[10px] font-medium uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                              <th className="pb-3 px-3">Code Plaque</th>
                              <th className="pb-3 px-3">Nom du Secteur</th>
                              <th className="pb-3 px-3">Ville</th>
                              <th className="pb-3 px-3">Comptes SOHO Rattachés</th>
                              <th className="pb-3 px-3">Statut</th>
                              <th className="pb-3 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {loadingPlaques ? (
                              <tr>
                                <td colSpan={6} className="py-12 text-center text-[#6E6C67] dark:text-[#A1A1AA]">
                                  <div className="w-6 h-6 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin mx-auto" />
                                </td>
                              </tr>
                            ) : filteredPlaques.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-12 text-center text-[#6E6C67] dark:text-[#A1A1AA]">
                                  Aucune plaque cartographique trouvée.
                                </td>
                              </tr>
                            ) : (
                              filteredPlaques.map((p) => (
                                <tr key={p.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                  <td className="py-3 px-3">
                                    <span className="font-mono font-medium px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[#242124] dark:text-white">
                                      {p.code}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 font-medium text-[#242124] dark:text-white">
                                    {p.name}
                                  </td>
                                  <td className="py-3 px-3 text-[#6E6C67] dark:text-[#A1A1AA]">
                                    {p.city}
                                  </td>
                                  <td className="py-3 px-3 font-medium text-[#4F6CE8]">
                                    {p.enterprises_count || 0} entreprises
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                      Active
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-right">
                                    <button
                                      onClick={() => setPlaqueViewMode('map')}
                                      className="px-2.5 py-1 bg-[#4F6CE8]/10 hover:bg-[#4F6CE8] text-[#4F6CE8] hover:text-white rounded-xl text-[10px] font-medium transition-all cursor-pointer flex items-center gap-1 inline-flex"
                                    >
                                      <Icons.Map size={10} />
                                      <span>Localiser</span>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======================================================================= */}
          {/* VUE 7 : EFFECTIF DES KEY ACCOUNT MANAGERS (KAMS)                        */}
          {/* ======================================================================= */}
          {activeTab === 'kams_team' && (
            <div className="flex flex-col gap-5">
              <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-[#4F6CE8]">Desk KAM & Grands Comptes</span>
                  <h2 className="text-xl font-semibold text-[#242124] dark:text-white mt-1">Effectif des Key Account Managers ({filteredKamsTeam.length})</h2>
                  <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                    Suivi des portefeuilles stratégiques, signatures enregistrées et chiffre d'affaires cumulé par KAM.
                  </p>
                </div>
              </div>

              {/* Barre d'action supérieure avec option discrète Podium Top 3 KAM */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#6E6C67] dark:text-[#A1A1AA]">
                    {filteredKamsTeam.length} Key Account Managers répertoriés
                  </span>
                </div>

                {top3Kams.length > 0 && (
                  <button
                    onClick={() => setShowKamPodium(!showKamPodium)}
                    className={`px-3.5 py-1.5 rounded-2xl text-xs font-medium transition-all cursor-pointer flex items-center gap-2 border ${
                      showKamPodium
                        ? 'bg-[#4F6CE8] text-white border-[#4F6CE8]'
                        : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 text-[#242124] dark:text-white hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                  >
                    <Icons.Trophy size={14} />
                    <span>Podium Top 3 Performance</span>
                    <Icons.ChevronDown size={13} className={`transition-transform duration-200 ${showKamPodium ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Podium Discret et Compact des KAMs */}
              {showKamPodium && top3Kams.length > 0 && (
                <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-3xl p-4 border border-black/5 dark:border-white/5 flex flex-col gap-3 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icons.Trophy size={14} className="text-[#4F6CE8]" />
                      <span className="text-xs font-medium text-[#242124] dark:text-white">Top 3 Key Account Managers • Performance Portefeuille</span>
                    </div>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Classés par CA signé cumulé ($) et conversions</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {top3Kams.map((k, idx) => (
                      <div
                        key={k.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                          idx === 0
                            ? 'bg-white dark:bg-[#363336] border-[#4F6CE8]/30 shadow-xs'
                            : 'bg-white dark:bg-[#363336] border-black/5 dark:border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative shrink-0">
                            <img
                              src={`/memojis/${(k.avatar || 'memoji_019.png').replace('assets/memojis/', '')}`}
                              alt={k.full_name}
                              className="w-10 h-10 rounded-xl object-cover"
                            />
                            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-semibold text-white ${
                              idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : 'bg-amber-700'
                            }`}>
                              {idx + 1}
                            </div>
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-medium text-[#242124] dark:text-white truncate">{k.full_name}</span>
                            <div className="flex items-center gap-2 text-[10px] mt-0.5">
                              <span className="font-medium text-[#4F6CE8]">+{Number(k.converted_amount || 0).toLocaleString()} $</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{k.converted_count || 0} conv.</span>
                              <span className="text-[#6E6C67] dark:text-[#A1A1AA]">{k.portfolio_count || 0} comptes</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenKamPortfolio(k)}
                          className="p-1.5 rounded-xl bg-[#4F6CE8]/10 hover:bg-[#4F6CE8] text-[#4F6CE8] hover:text-white transition-colors cursor-pointer shrink-0"
                          title="Inspecter le portefeuille"
                        >
                          <Icons.Briefcase size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Table dense des KAMs */}
              <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-black/5 dark:border-white/5 text-[10px] font-medium uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                        <th className="pb-3 px-3">Key Account Manager</th>
                        <th className="pb-3 px-3">Pôle / Spécialisation</th>
                        <th className="pb-3 px-3">Portefeuille</th>
                        <th className="pb-3 px-3">Signatures</th>
                        <th className="pb-3 px-3">CA Signé ($)</th>
                        <th className="pb-3 px-3">Contact</th>
                        <th className="pb-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {loadingKamsTeam ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-[#6E6C67] dark:text-[#A1A1AA]">
                            <div className="w-6 h-6 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin mx-auto" />
                          </td>
                        </tr>
                      ) : filteredKamsTeam.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-[#6E6C67] dark:text-[#A1A1AA]">
                            Aucun Key Account Manager trouvé.
                          </td>
                        </tr>
                      ) : (
                        filteredKamsTeam.map((k) => (
                          <tr key={k.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-2xl bg-[#4F6CE8]/10 border border-[#4F6CE8]/20 flex items-center justify-center font-medium text-xs overflow-hidden shrink-0">
                                  <img
                                    src={`/memojis/${(k.avatar || 'memoji_019.png').replace('assets/memojis/', '')}`}
                                    alt={k.full_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                                <div>
                                  <span className="font-medium text-[#242124] dark:text-white block">{k.full_name}</span>
                                  <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">@{k.username}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-semibold text-[#242124] dark:text-white">
                              {k.company_name || "Direction Grands Comptes"}
                            </td>
                            <td className="py-3 px-3 font-medium text-[#242124] dark:text-white">
                              <button
                                onClick={() => handleOpenKamPortfolio(k)}
                                className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-[#4F6CE8]/15 hover:text-[#4F6CE8] transition-colors cursor-pointer font-medium inline-flex items-center gap-1"
                                title="Inspecter les comptes gérés"
                              >
                                <span>{k.portfolio_count || 0} comptes</span>
                                <Icons.ChevronRight size={10} />
                              </button>
                            </td>
                            <td className="py-3 px-3 font-medium text-[#4F6CE8]">
                              {k.converted_count || 0} convertis
                            </td>
                            <td className="py-3 px-3 font-medium text-[#242124] dark:text-white">
                              +{(k.converted_amount || 0).toLocaleString()} $
                            </td>
                            <td className="py-3 px-3 text-[#6E6C67] dark:text-[#A1A1AA]">
                              <div>{k.email}</div>
                              <div className="text-[10px]">{k.phone || ""}</div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenKamPortfolio(k)}
                                  className="px-2.5 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#242124] dark:text-white rounded-xl text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 inline-flex"
                                  title="Consulter les comptes gérés par ce KAM"
                                >
                                  <Icons.Briefcase size={11} />
                                  <span>Portefeuille</span>
                                </button>
                                <button
                                  onClick={() => handleOpenDirectiveToRecipient('KAM_OFFICE', k.id)}
                                  className="px-2.5 py-1.5 bg-[#4F6CE8]/10 hover:bg-[#4F6CE8] text-[#4F6CE8] hover:text-white rounded-xl text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 inline-flex"
                                  title="Transmettre une consigne ou directive"
                                >
                                  <Icons.Send size={11} />
                                  <span>Directive</span>
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
          )}

          {/* ======================================================================= */}
          {/* VUE 8 : DIRECTIVES & MESSAGES SUPER ADMIN                               */}
          {/* ======================================================================= */}
          {activeTab === 'directives' && (
            <div className="flex flex-col gap-5">
              <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-[#4F6CE8]">Ligne Managériale Directe</span>
                  <h2 className="text-xl font-semibold text-[#242124] dark:text-white mt-1">Directives & Instructions Super Admin</h2>
                  <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                    Consignes opérationnelles ciblées transmises aux KAMs ou au Back-Office avec accusé de traitement.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => {
                      setDirectiveForm({
                        target_entity: 'KAM_OFFICE',
                        recipient_id: '',
                        title: '',
                        instruction: '',
                        priority: 'NORMAL',
                        target_account_name: '',
                      });
                      setDirectiveErrorMsg('');
                      setIsDirectiveModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white rounded-2xl text-xs font-medium shadow-sm transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Icons.Plus size={14} />
                    <span>Émettre une Directive</span>
                  </button>
                </div>
              </div>

              {/* Filtres Combinés Directives */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#2D2A2D] p-4 rounded-3xl shadow-sm border border-black/5 dark:border-white/5">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Filtre Origine / Multi-Admin */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Origine :</span>
                    <div className="flex items-center gap-1 bg-[#F6F5F2] dark:bg-[#242124] p-1 rounded-xl">
                      {(['ALL', 'MINE', 'OTHERS'] as const).map((orig) => (
                        <button
                          key={orig}
                          onClick={() => setDirectiveFilterOrigin(orig)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            directiveFilterOrigin === orig
                              ? 'bg-[#4F6CE8] text-white'
                              : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                          }`}
                        >
                          {orig === 'ALL' ? 'Toutes' : orig === 'MINE' ? 'Mes Directives' : 'Autres Admins'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filtre Entité */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Entité :</span>
                    <div className="flex items-center gap-1 bg-[#F6F5F2] dark:bg-[#242124] p-1 rounded-xl">
                      {(['ALL', 'KAM_OFFICE', 'BACK_OFFICE'] as const).map((ent) => (
                        <button
                          key={ent}
                          onClick={() => setDirectiveFilterEntity(ent)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            directiveFilterEntity === ent
                              ? 'bg-[#4F6CE8] text-white'
                              : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                          }`}
                        >
                          {ent === 'ALL' ? 'Toutes' : ent === 'KAM_OFFICE' ? 'KAM Office' : 'Back-Office'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Statut :</span>
                  <div className="flex items-center gap-1 bg-[#F6F5F2] dark:bg-[#242124] p-1 rounded-xl">
                    {(['ALL', 'SENT', 'IN_PROGRESS', 'COMPLETED'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setDirectiveFilterStatus(st)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          directiveFilterStatus === st
                            ? 'bg-[#4F6CE8] text-white'
                            : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                        }`}
                      >
                        {st === 'ALL' ? 'Tous' : st === 'SENT' ? 'Envoyée' : st === 'IN_PROGRESS' ? 'En cours' : 'Traitée'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Liste des Directives */}
              <div className="flex flex-col gap-3">
                {loadingDirectives ? (
                  <div className="py-12 flex justify-center bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5">
                    <div className="w-6 h-6 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
                  </div>
                ) : filteredDirectives.length === 0 ? (
                  <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-12 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA] shadow-sm border border-black/5 dark:border-white/5">
                    Aucune directive trouvée pour les filtres sélectionnés.
                  </div>
                ) : (
                  filteredDirectives.map((d) => (
                    <div
                      key={d.id}
                      className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4 text-xs"
                    >
                      {/* En-tête avec Traçabilité Multi-Admin (Émetteur -> Destinataire) */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/5">
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Émetteur (Super Admin) */}
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-medium text-xs overflow-hidden shrink-0">
                              <img
                                src={`/memojis/${(d.sender_avatar || 'memoji_056.png').replace('assets/memojis/', '')}`}
                                alt={d.sender_name || 'Admin'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-xs text-[#242124] dark:text-white">
                                  {d.sender_name || (d.sender_username ? `@${d.sender_username}` : 'Super Admin')}
                                </span>
                                <span className="px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium text-[9px] uppercase">
                                  Émetteur
                                </span>
                              </div>
                              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                                {d.sender_username ? `@${d.sender_username}` : 'admin'}
                              </span>
                            </div>
                          </div>

                          {/* Flèche directionnelle */}
                          <div className="text-[#4F6CE8] font-medium text-sm px-1">
                            →
                          </div>

                          {/* Destinataire */}
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center font-medium text-xs overflow-hidden shrink-0">
                              <img
                                src={`/memojis/${(d.recipient_avatar || 'memoji_019.png').replace('assets/memojis/', '')}`}
                                alt={d.recipient_name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-xs text-[#242124] dark:text-white">{d.recipient_name}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${
                                  d.target_entity === 'KAM_OFFICE'
                                    ? 'bg-[#4F6CE8]/15 text-[#4F6CE8]'
                                    : 'bg-black/5 dark:bg-white/10 text-[#242124] dark:text-white'
                                }`}>
                                  {d.target_entity === 'KAM_OFFICE' ? 'KAM Office' : 'Back-Office'}
                                </span>
                              </div>
                              <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                                @{d.recipient_username}
                              </span>
                            </div>
                          </div>

                          {/* Horodatage précis avec secondes */}
                          <div className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] bg-[#F6F5F2] dark:bg-[#242124] px-2.5 py-1 rounded-xl font-medium">
                            Émise le {new Date(d.created_at).toLocaleDateString()} à {new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end lg:self-auto">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            d.priority === 'CRITICAL'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : d.priority === 'HIGH'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-black/5 dark:bg-white/10 text-[#6E6C67] dark:text-[#A1A1AA]'
                          }`}>
                            {d.priority === 'CRITICAL' ? '● Priorité Critique' : d.priority === 'HIGH' ? '▲ Haute' : 'Normale'}
                          </span>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            d.status === 'COMPLETED'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : d.status === 'IN_PROGRESS'
                              ? 'bg-[#4F6CE8]/15 text-[#4F6CE8]'
                              : 'bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA]'
                          }`}>
                            {d.status === 'COMPLETED' ? 'Traitée' : d.status === 'IN_PROGRESS' ? 'En cours' : 'Envoyée'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-[#242124] dark:text-white">{d.title}</h4>
                          {d.target_account_name && (
                            <span className="px-2 py-0.5 rounded-md bg-[#4F6CE8]/10 text-[#4F6CE8] font-medium text-[10px]">
                              Compte : {d.target_account_name}
                            </span>
                          )}
                        </div>
                        <p className="p-3 bg-[#F6F5F2] dark:bg-[#242124] rounded-2xl text-xs text-[#242124] dark:text-white/90 leading-relaxed font-medium">
                          {d.instruction}
                        </p>
                      </div>

                      {d.acknowledgement_note && (
                        <div className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 text-xs">
                          <span className="font-medium text-emerald-600 dark:text-emerald-400 block mb-0.5">Accusé / Note de réalisation :</span>
                          <span className="text-[#6E6C67] dark:text-[#A1A1AA]">{d.acknowledgement_note}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                        <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                          Dernière actualisation : {new Date(d.updated_at).toLocaleDateString()}
                        </span>

                        <div className="flex items-center gap-2">
                          {d.status === 'SENT' && (
                            <button
                              onClick={() => handleUpdateDirectiveStatus(d.id, 'IN_PROGRESS')}
                              className="px-3 py-1.5 bg-[#4F6CE8]/10 hover:bg-[#4F6CE8] text-[#4F6CE8] hover:text-white rounded-xl text-xs font-medium transition-all cursor-pointer"
                            >
                              Passer en cours
                            </button>
                          )}
                          {d.status !== 'COMPLETED' ? (
                            <button
                              onClick={() => handleUpdateDirectiveStatus(d.id, 'COMPLETED')}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Icons.CheckCircle size={12} />
                              <span>Marquer Traitée</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateDirectiveStatus(d.id, 'IN_PROGRESS')}
                              className="px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#6E6C67] dark:text-[#A1A1AA] rounded-xl text-xs font-medium transition-all cursor-pointer"
                            >
                              Rouvrir la directive
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* VUE 9 : RÈGLES & SEUILS DE SEGMENTATION FINANCIÈRE                      */}
          {/* ======================================================================= */}
          {activeTab === 'segmentation' && (
            <div className="flex flex-col gap-5">
              
              {/* Carte Titre Épurée */}
              <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-5 shadow-sm border border-black/5 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#242124] dark:text-white">Règles & Seuils de Segmentation</h2>
                  <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">Routage financier automatique des entreprises CRM</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[11px] font-semibold text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Icons.HelpCircle size={13} />
                  <span>Consulter la FAQ</span>
                </button>
              </div>

              {/* Formulaire de Réglage des Seuils */}
              <form onSubmit={handleSaveSegmentation} className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Seuil 1 : SOHO vs PME */}
                  <div className="flex flex-col gap-2 bg-[#F6F5F2] dark:bg-[#242124] p-4 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#242124] dark:text-white">Seuil Plafond SOHO</span>
                      <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">&lt; 200 $/mois</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-medium text-[#6E6C67] dark:text-[#A1A1AA]">$</span>
                      <input
                        type="number"
                        step="100"
                        value={tpeThreshold}
                        onChange={(e) => setTpeThreshold(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-white dark:bg-[#2D2A2D] rounded-xl text-sm font-medium text-[#242124] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                      />
                      <span className="text-xs font-medium text-[#6E6C67] dark:text-[#A1A1AA] shrink-0">USD / an</span>
                    </div>
                  </div>

                  {/* Seuil 2 : PME vs Grand Compte */}
                  <div className="flex flex-col gap-2 bg-[#F6F5F2] dark:bg-[#242124] p-4 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#242124] dark:text-white">Seuil Entrée Grand Compte</span>
                      <span className="text-[10px] font-medium text-[#4F6CE8] uppercase tracking-wider">&gt; 2 500 $/mois</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-medium text-[#6E6C67] dark:text-[#A1A1AA]">$</span>
                      <input
                        type="number"
                        step="500"
                        value={pmeThreshold}
                        onChange={(e) => setPmeThreshold(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-white dark:bg-[#2D2A2D] rounded-xl text-sm font-medium text-[#242124] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                      />
                      <span className="text-xs font-medium text-[#6E6C67] dark:text-[#A1A1AA] shrink-0">USD / an</span>
                    </div>
                  </div>
                </div>

                {/* Les 2 Entités Destinataires (Données & Actions Uniquement) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Entité 1 : Back-Office Terrain */}
                  <div className="p-4 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-black/5 dark:bg-white/10 text-[#242124] dark:text-white rounded-xl">
                        <Icons.Map size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-[#242124] dark:text-white">Back-Office Terrain</h4>
                        <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] font-medium">Plaques Cartographiques SOHO</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-[#242124] dark:text-white block">{config?.stats?.tpe_count || 0}</span>
                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">comptes routés</span>
                    </div>
                  </div>

                  {/* Entité 2 : Direction KAM Office */}
                  <div className="p-4 rounded-2xl bg-[#F6F5F2] dark:bg-[#242124] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-[#4F6CE8]/15 text-[#4F6CE8] rounded-xl">
                        <Icons.Briefcase size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-[#242124] dark:text-white">Direction KAM Office</h4>
                        <span className="text-[10px] text-[#4F6CE8] font-medium">Portefeuilles PME & Grands Comptes</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-[#4F6CE8] block">{(config?.stats?.pme_count || 0) + (config?.stats?.grand_compte_count || 0)}</span>
                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">comptes routés</span>
                    </div>
                  </div>
                </div>

                {/* Bouton de Soumission & Recalcul */}
                <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                  <div className="text-xs font-medium text-[#4F6CE8]">
                    {configSuccessMsg}
                  </div>
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="px-6 py-3 bg-[#4F6CE8] hover:bg-[#3D5BD9] active:scale-98 text-white rounded-2xl text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Icons.Refresh size={14} className={savingConfig ? "animate-spin" : ""} />
                    <span>{savingConfig ? "Recalcul de la segmentation..." : "Enregistrer & Ré-appliquer"}</span>
                  </button>
                </div>
              </form>

              {/* Répartition Actuelle (Design 60-30-10) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">SOHO (&lt; {tpeThreshold.toLocaleString()} $)</span>
                  <span className="text-2xl font-extrabold text-[#242124] dark:text-white mt-1">{config?.stats?.tpe_count || 0}</span>
                  <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">Routés vers le Back-Office Terrain (Plaques)</span>
                </div>

                <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">PME ({tpeThreshold.toLocaleString()} $ - {pmeThreshold.toLocaleString()} $)</span>
                  <span className="text-2xl font-extrabold text-[#4F6CE8] mt-1">{config?.stats?.pme_count || 0}</span>
                  <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">Routés vers le KAM Office</span>
                </div>

                <div className="bg-white dark:bg-[#2D2A2D] p-5 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase tracking-wider">Grands Comptes (&ge; {pmeThreshold.toLocaleString()} $)</span>
                  <span className="text-2xl font-extrabold text-[#242124] dark:text-white mt-1">{config?.stats?.grand_compte_count || 0}</span>
                  <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">Routés vers le KAM Office (Top C-Level)</span>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* VUE 7 : PARAMÈTRES DU COMPTE & FAQ CONSOLIDÉE                           */}
          {/* ======================================================================= */}
          {activeTab === 'settings' && (
            <div className="flex flex-col gap-5">
              
              {/* En-tête Paramètres */}
              <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-[#4F6CE8]">Configuration & FAQ</span>
                  <h2 className="text-xl font-semibold text-[#242124] dark:text-white mt-1">Paramètres & Base de Connaissances</h2>
                  <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                    Personnalisez votre avatar Memoji Apple 3D et consultez les règles métier du système Onbora.
                  </p>
                </div>
                
                {avatarSuccessMsg && (
                  <div className="px-4 py-2 bg-[#4F6CE8]/10 text-[#4F6CE8] rounded-2xl text-xs font-medium flex items-center gap-2 animate-fade-in shrink-0">
                    <Icons.CheckCircle size={15} />
                    <span>{avatarSuccessMsg}</span>
                  </div>
                )}
                {avatarErrorMsg && (
                  <div className="px-4 py-2 bg-red-500/10 text-red-500 rounded-2xl text-xs font-medium flex items-center gap-2 animate-fade-in shrink-0">
                    <Icons.AlertCircle size={15} />
                    <span>{avatarErrorMsg}</span>
                  </div>
                )}
              </div>

              {/* 1. Carte de Profil & Sélecteur Memoji Universel */}
              <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-6">
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
                        <h3 className="text-base font-semibold text-[#242124] dark:text-white">
                          {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || 'Admin Onbora'}
                        </h3>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#4F6CE8]/15 text-[#4F6CE8]">
                          {user?.role === 'ADMIN' ? 'Super Administrateur' : user?.role || 'Admin'}
                        </span>
                      </div>
                      <span className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] block mt-0.5">
                        Identifiant : @{user?.username} • {user?.email || 'admin@onbora.cd'}
                      </span>
                      <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block mt-0.5 font-medium">
                        Memoji actuel : <span className="font-mono font-medium text-[#242124] dark:text-white">{(user?.avatar || 'memoji_056.png').replace('assets/memojis/', '')}</span>
                      </span>
                    </div>
                  </div>

                  {/* Filtres de Genre pour Memojis */}
                  <div className="flex items-center gap-1.5 bg-[#F6F5F2] dark:bg-[#242124] p-1.5 rounded-2xl self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setMemojiGenderFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        memojiGenderFilter === 'homme'
                          ? 'bg-[#4F6CE8] text-white shadow-sm'
                          : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                      }`}
                    >
                      Hommes ({memojisCatalog.filter(m => m.gender === 'homme').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemojiGenderFilter('femme')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        memojiGenderFilter === 'femme'
                          ? 'bg-[#4F6CE8] text-white shadow-sm'
                          : 'text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                      }`}
                    >
                      Femmes ({memojisCatalog.filter(m => m.gender === 'femme').length})
                    </button>
                  </div>
                </div>

                {/* Galerie de sélection des 102 Memojis 3D */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#242124] dark:text-white">
                      Galerie des 102 Avatars Memoji (App Mobile & Web)
                    </span>
                    <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                      Cliquez sur un avatar pour le synchroniser immédiatement avec votre compte
                    </span>
                  </div>

                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3 max-h-72 overflow-y-auto p-3 bg-[#F6F5F2] dark:bg-[#242124] rounded-2xl border border-black/5 dark:border-white/5">
                    {filteredMemojis.map((memoji) => {
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
                              ? 'bg-white dark:bg-[#2D2A2D] ring-3 ring-[#4F6CE8] shadow-md scale-105'
                              : 'bg-white/60 dark:bg-[#2D2A2D]/60 hover:bg-white dark:hover:bg-[#27272A] hover:scale-105 border border-black/5 dark:border-white/5'
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

              {/* 2. FAQ INTERACTIVE & BASE DE CONNAISSANCES */}
              <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl p-6 shadow-sm border border-black/5 dark:border-white/5 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                  <div>
                    <h3 className="text-base font-semibold text-[#242124] dark:text-white">
                      Foire Aux Questions (FAQ) & Règles Métier RDC
                    </h3>
                    <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                      Toutes les explications opérationnelles, économiques et techniques pour l'administration d'Onbora.
                    </p>
                  </div>
                  <span className="text-[10px] font-medium px-3 py-1 bg-black/5 dark:bg-white/5 text-[#6E6C67] dark:text-[#A1A1AA] rounded-full">
                    6 Sujets Clés
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {[
                    {
                      q: "1. Comment fonctionne la segmentation financière des 1 000 entreprises en RDC ?",
                      a: (
                        <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                          <p>
                            La segmentation financière d'Onbora est calibrée sur les réalités économiques du marché congolais en trois strates distinctes :
                          </p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>
                              <strong className="text-[#242124] dark:text-white">SOHO (Très Petites Entreprises / Commerce informel) :</strong> Chiffre d'affaires inférieur à <strong>200 $ / mois</strong> (soit &lt; 2 400 $ / an). Il s'agit des boutiques de quartier, kiosques, cabines télécom, artisans et petits commerces de proximité.
                            </li>
                            <li>
                              <strong className="text-[#242124] dark:text-white">PME (Petites et Moyennes Entreprises) :</strong> Chiffre d'affaires compris entre <strong>200 $ et 2 500 $ / mois</strong> (soit 2 400 $ à 30 000 $ / an). Exemples : cliniques privées, cabinets comptables, écoles, distributeurs, bureaux d'études.
                            </li>
                            <li>
                              <strong className="text-[#242124] dark:text-white">Grands Comptes :</strong> Chiffre d'affaires supérieur à <strong>2 500 $ / mois</strong> (soit &gt; 30 000 $ / an). Exemples : institutions bancaires, concessions minières au Katanga, opérateurs logistiques, ministères et multinationales.
                            </li>
                          </ul>
                        </div>
                      )
                    },
                    {
                      q: "2. Pourquoi le découpage par Plaques cartographiques est-il réservé aux SOHO ?",
                      a: (
                        <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                          <p>
                            La prospection des SOHO s'effectue exclusivement par des <strong>commerciaux terrain du Back-Office</strong> selon une méthode de quadrillage pédestre (porte-à-porte). Ce mode opératoire exige une très forte densité géographique continue :
                          </p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Les <strong>plaques cartographiques</strong> délimitent précisément les avenues, marchés et quartiers (Gombe, Limete, Lingwala, etc.) pour éviter tout chevauchement entre agents terrain.</li>
                            <li>À l'inverse, un Grand Compte ou une PME ne se prospecte jamais au hasard dans la rue : ils ont des processus de décision C-Level et nécessitent des rendez-vous ciblés.</li>
                          </ul>
                        </div>
                      )
                    },
                    {
                      q: "3. Pourquoi et comment les PME et Grands Comptes sont-ils routés vers le KAM Office ?",
                      a: (
                        <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                          <p>
                            Dès qu'une entreprise franchit le seuil de 200 $ / mois, elle quitte automatiquement le périmètre des plaques terrain pour être prise en charge par la <strong>Direction KAM Office</strong> :
                          </p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Chaque compte est affecté à un <strong>Key Account Manager (KAM)</strong> dédié selon sa spécialisation (Grands Comptes ou PME).</li>
                            <li>Le KAM gère un portefeuille relationnel sur la durée, effectue des audits d'infrastructure, soumet des offres managées (Fibre optique, SD-WAN, Cloud, Cyberdéfense) et rencontre les Directeurs Généraux et DSI.</li>
                          </ul>
                        </div>
                      )
                    },
                    {
                      q: "4. Comment le Catalogue d'offres alimente-t-il les recommandations du Core AI ?",
                      a: (
                        <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                          <p>
                            Le catalogue d'offres constitue la base de vérité commerciale du système :
                          </p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>Chaque offre possède des mots-clés de matching (<code className="font-mono text-[#4F6CE8]">match.need_keywords</code>), des segments cibles et un statut de disponibilité en RDC (<code className="font-mono">published_local</code> ou <code className="font-mono">to_confirm</code>).</li>
                            <li>Lorsqu'un commercial terrain ou un KAM saisit un besoin client (ex: "débit garanti", "flotte mobile", "interconnexion sites"), le moteur d'inférence Core AI associe algorithmiquement la solution la plus pertinente sans risque de promesse hors catalogue.</li>
                          </ul>
                        </div>
                      )
                    },
                    {
                      q: "5. Quel est le format d'importation JSON pour mettre à jour le catalogue ?",
                      a: (
                        <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                          <p>
                            L'importation ou la synchronisation JSON accepte le schéma standard du Core AI avec les champs suivants pour chaque service :
                          </p>
                          <pre className="p-3 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-mono text-[10px] overflow-x-auto text-[#242124] dark:text-white">
{`{
  "service_id": "nom_unique_du_service",
  "name": "Nom Commercial",
  "category": "Internet fixe / Mobile / Cloud...",
  "description": "Description détaillée de la prestation",
  "allowed_benefits": ["Avantage 1", "Avantage 2"],
  "target_customers": ["PME", "Grands comptes"],
  "rdc_availability": "published_local",
  "source_url": "https://www.orange-business.com/...",
  "match": {
    "need_keywords": ["mot1", "mot2"]
  }
}`}
                          </pre>
                        </div>
                      )
                    },
                    {
                      q: "6. Quelle est la différence entre les rôles Administrateur, Superviseur et Gérant KAM ?",
                      a: (
                        <div className="flex flex-col gap-2 text-xs leading-relaxed text-[#6E6C67] dark:text-[#A1A1AA]">
                          <ul className="list-disc pl-5 space-y-1">
                            <li><strong className="text-[#242124] dark:text-white">Super Administrateur :</strong> Pilote la segmentation, gère les offres B2B, audite les 1 000 comptes et attribue les accès de haut niveau.</li>
                            <li><strong className="text-[#242124] dark:text-white">Superviseur Back-Office :</strong> Supervise les commerciaux terrain pédestres, trace les tournées et contrôle les découpages de plaques cartographiques.</li>
                            <li><strong className="text-[#242124] dark:text-white">Gérant KAM Office :</strong> Coordonne l'équipe des Key Account Managers, répartit les comptes PME et Grands Comptes et pilote le volume de chiffre d'affaires signé.</li>
                          </ul>
                        </div>
                      )
                    }
                  ].map((item, index) => {
                    const isOpen = faqOpenIndex === index;
                    return (
                      <div
                        key={index}
                        className="rounded-2xl bg-[#F6F5F2] dark:bg-[#242124] border border-black/5 dark:border-white/5 overflow-hidden transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => setFaqOpenIndex(isOpen ? null : index)}
                          className="w-full p-4 text-left flex items-center justify-between gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                          <span className="text-xs font-medium text-[#242124] dark:text-white">
                            {item.q}
                          </span>
                          <span className={`p-1.5 rounded-xl bg-white dark:bg-[#2D2A2D] text-[#6E6C67] dark:text-[#A1A1AA] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
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

            </div>
          )}

          {/* VUE COPILOTE IA CONVERSATIONNEL DÉDIÉ SUPER ADMIN */}
          {activeTab === 'copilot' && (
            <CopilotChatView userRole="ADMIN" />
          )}

          </main>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALE : CRÉATION / ÉDITION D'UNE OFFRE B2B                               */}
      {/* ========================================================================= */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl w-full max-w-2xl p-6 shadow-2xl flex flex-col gap-5 animate-scale-in text-[#242124] dark:text-white border border-black/5 dark:border-white/5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-black/5 dark:border-white/5">
              <div>
                <h3 className="text-base font-semibold">
                  {isOfferEditMode ? `Modifier l'offre B2B : ${offerForm.name}` : 'Créer une Nouvelle Offre B2B'}
                </h3>
                <p className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                  Les modifications sont validées par le contrat de données et injectées directement dans le Core AI.
                </p>
              </div>
              <button
                onClick={() => setIsOfferModalOpen(false)}
                className="p-1 rounded-full text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer"
              >
                <Icons.X size={16} />
              </button>
            </div>

            {offerActionError && (
              <div className="p-3 rounded-2xl bg-red-500/10 text-red-500 text-xs font-medium">
                {offerActionError}
              </div>
            )}

            <form onSubmit={handleSaveOfferSubmit} className="flex flex-col gap-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">
                    Identifiant Unique (service_id)
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isOfferEditMode}
                    value={offerForm.service_id}
                    onChange={(e) => setOfferForm({ ...offerForm, service_id: e.target.value.toLowerCase().trim() })}
                    placeholder="Ex: fibre_pro_kinshasa"
                    className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0 disabled:opacity-50"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">
                    Nom Commercial de l'Offre
                  </label>
                  <input
                    type="text"
                    required
                    value={offerForm.name}
                    onChange={(e) => setOfferForm({ ...offerForm, name: e.target.value })}
                    placeholder="Ex: Fibre Entreprise Dédiée 100 Mbps"
                    className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Catégorie</label>
                  <input
                    type="text"
                    required
                    value={offerForm.category}
                    onChange={(e) => setOfferForm({ ...offerForm, category: e.target.value })}
                    placeholder="Ex: Internet fixe et réseaux"
                    className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Disponibilité RDC</label>
                  <select
                    value={offerForm.rdc_availability}
                    onChange={(e) => setOfferForm({ ...offerForm, rdc_availability: e.target.value as any })}
                    className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0 cursor-pointer"
                  >
                    <option value="published_local">Publié Local RDC (published_local)</option>
                    <option value="to_confirm">À confirmer (to_confirm)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Description Complète</label>
                <textarea
                  rows={3}
                  required
                  value={offerForm.description}
                  onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                  placeholder="Présentation détaillée de la solution, débits, technologies..."
                  className="px-3.5 py-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-normal focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Avantages Permis (1 par ligne)</label>
                  <textarea
                    rows={3}
                    value={offerForm.allowed_benefits}
                    onChange={(e) => setOfferForm({ ...offerForm, allowed_benefits: e.target.value })}
                    placeholder="Débit garanti 1:1&#10;GTR 4h en RDC&#10;IP fixe incluse"
                    className="px-3.5 py-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Clients Cibles (1 par ligne)</label>
                  <textarea
                    rows={3}
                    value={offerForm.target_customers}
                    onChange={(e) => setOfferForm({ ...offerForm, target_customers: e.target.value })}
                    placeholder="Grands comptes miniers&#10;PME du secteur bancaire"
                    className="px-3.5 py-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Conditions Commerciales & Tarifs</label>
                  <textarea
                    rows={2}
                    value={offerForm.commercial_terms}
                    onChange={(e) => setOfferForm({ ...offerForm, commercial_terms: e.target.value })}
                    placeholder="Sur devis personnalisé selon éligibilité fibre"
                    className="px-3.5 py-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Mots-clés de Matching Core AI (séparés par virgules)</label>
                  <textarea
                    rows={2}
                    value={offerForm.need_keywords}
                    onChange={(e) => setOfferForm({ ...offerForm, need_keywords: e.target.value })}
                    placeholder="fibre, débit garanti, gtr 4h, internet haut débit"
                    className="px-3.5 py-2 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">URL Source / Documentation Publique</label>
                <input
                  type="url"
                  value={offerForm.source_url}
                  onChange={(e) => setOfferForm({ ...offerForm, source_url: e.target.value })}
                  placeholder="https://business.orange.cd/fr/catalogs/..."
                  className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsOfferModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 font-medium hover:bg-black/10 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingOffer}
                  className="px-5 py-2.5 bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white rounded-xl font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Icons.CheckCircle size={14} />
                  <span>{savingOffer ? "Enregistrement Core AI..." : "Enregistrer dans le Core AI"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE : IMPORTATION / SYNCHRONISATION DU CATALOGUE JSON                   */}
      {/* ========================================================================= */}
      {isImportOffersModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl w-full max-w-2xl p-6 shadow-2xl flex flex-col gap-5 animate-scale-in text-[#242124] dark:text-white border border-black/5 dark:border-white/5">
            <div className="flex justify-between items-center pb-2 border-b border-black/5 dark:border-white/5">
              <div>
                <h3 className="text-base font-semibold">Importer / Synchroniser un Catalogue JSON</h3>
                <p className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                  Collez le JSON complet du catalogue ou des offres B2B pour le synchroniser instantanément avec le Core AI.
                </p>
              </div>
              <button
                onClick={() => setIsImportOffersModalOpen(false)}
                className="p-1 rounded-full text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer"
              >
                <Icons.X size={16} />
              </button>
            </div>

            {offerActionError && (
              <div className="p-3 rounded-2xl bg-red-500/10 text-red-500 text-xs font-medium">
                {offerActionError}
              </div>
            )}

            <form onSubmit={handleImportJsonSubmit} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Payload JSON du Catalogue</label>
                <textarea
                  rows={12}
                  required
                  value={rawImportJson}
                  onChange={(e) => setRawImportJson(e.target.value)}
                  placeholder={`{\n  "schema_version": "1.0",\n  "catalog_version": "custom-catalog-2026",\n  "status": "approved",\n  "services": [\n    {\n      "service_id": "fibre_pro",\n      "name": "Fibre Pro",\n      "category": "Internet fixe et réseaux",\n      ...\n    }\n  ]\n}`}
                  className="px-3.5 py-3 bg-[#F6F5F2] dark:bg-[#242124] rounded-2xl font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsImportOffersModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 font-medium hover:bg-black/10 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={importingJson}
                  className="px-5 py-2.5 bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white rounded-xl font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Icons.CheckCircle size={14} />
                  <span>{importingJson ? "Validation & Injection..." : "Valider & Synchroniser"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE : CRÉATION D'UN COMPTE GESTIONNAIRE                                */}
      {/* ========================================================================= */}
      {isManagerModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-5 animate-scale-in text-[#242124] dark:text-white border border-black/5 dark:border-white/5">
            <div className="flex justify-between items-center pb-2 border-b border-black/5 dark:border-white/5">
              <div>
                <h3 className="text-base font-semibold">
                  {targetRoleToCreate === 'SUPERVISOR' ? 'Nouveau Superviseur Back-Office Terrain' : 'Nouveau Gérant KAM Office'}
                </h3>
                <p className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                  {targetRoleToCreate === 'SUPERVISOR'
                    ? 'Gestionnaire des commerciaux terrain et des découpages de plaques cartographiques.'
                    : 'Responsable du pool de Key Account Managers et du portefeuille Grands Comptes.'}
                </p>
              </div>
              <button
                onClick={() => setIsManagerModalOpen(false)}
                className="p-1 rounded-full text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer"
              >
                <Icons.X size={16} />
              </button>
            </div>

            {managerCreateError && (
              <div className="p-3 rounded-2xl bg-red-500/10 text-red-500 text-xs font-medium">
                {managerCreateError}
              </div>
            )}

            <form onSubmit={handleSaveManager} className="flex flex-col gap-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Prénom</label>
                  <input
                    type="text"
                    required
                    value={managerForm.first_name}
                    onChange={(e) => setManagerForm({ ...managerForm, first_name: e.target.value })}
                    placeholder="Ex: Alain"
                    className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Nom</label>
                  <input
                    type="text"
                    required
                    value={managerForm.last_name}
                    onChange={(e) => setManagerForm({ ...managerForm, last_name: e.target.value })}
                    placeholder="Ex: Mabiala"
                    className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Identifiant (Login)</label>
                  <input
                    type="text"
                    required
                    value={managerForm.username}
                    onChange={(e) => setManagerForm({ ...managerForm, username: e.target.value.toLowerCase().trim() })}
                    placeholder="Ex: sup_kinshasa"
                    className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Mot de Passe</label>
                  <input
                    type="password"
                    required
                    value={managerForm.password}
                    onChange={(e) => setManagerForm({ ...managerForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Email professionnel</label>
                  <input
                    type="email"
                    required
                    value={managerForm.email}
                    onChange={(e) => setManagerForm({ ...managerForm, email: e.target.value })}
                    placeholder="alain@onbora.cg"
                    className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Téléphone mobile</label>
                  <input
                    type="tel"
                    value={managerForm.phone}
                    onChange={(e) => setManagerForm({ ...managerForm, phone: e.target.value })}
                    placeholder="+243810000000"
                    className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">
                  {targetRoleToCreate === 'SUPERVISOR' ? 'Direction Régionale / Ville de Supervision' : 'Portefeuille de spécialisation'}
                </label>
                <input
                  type="text"
                  value={managerForm.location}
                  onChange={(e) => setManagerForm({ ...managerForm, location: e.target.value })}
                  placeholder={targetRoleToCreate === 'SUPERVISOR' ? 'Ex: Direction Régionale Kinshasa' : 'Ex: Banques & Groupes Miniers Katanga'}
                  className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">
                  Avatar Memoji attribué
                </label>
                <div className="flex items-center gap-3 bg-[#F6F5F2] dark:bg-[#242124] p-2.5 rounded-2xl">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#2D2A2D] border-2 border-[#4F6CE8] flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                    <img
                      src={`/memojis/${managerForm.avatar}`}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 flex items-center gap-2 overflow-x-auto py-1">
                    {memojisCatalog.slice(0, 18).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setManagerForm({ ...managerForm, avatar: m.filename })}
                        className={`w-9 h-9 rounded-xl p-0.5 shrink-0 transition-all cursor-pointer ${
                          managerForm.avatar === m.filename
                            ? 'ring-2 ring-[#4F6CE8] scale-105 bg-white dark:bg-[#2D2A2D]'
                            : 'opacity-60 hover:opacity-100 hover:scale-105'
                        }`}
                      >
                        <img src={`/memojis/${m.filename}`} alt={m.filename} className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsManagerModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 font-medium hover:bg-black/10 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creatingManager}
                  className="px-5 py-2.5 bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white rounded-xl font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Icons.CheckCircle size={14} />
                  <span>{creatingManager ? "Création en cours..." : "Créer le Compte"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE : FICHE DÉTAILLÉE D'UN COMPTE CONVERTI                             */}
      {/* ========================================================================= */}
      {selectedAccountDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl w-full max-w-xl p-6 shadow-2xl flex flex-col gap-5 animate-scale-in text-[#242124] dark:text-white border border-black/5 dark:border-white/5">
            <div className="flex justify-between items-start pb-3 border-b border-black/5 dark:border-white/5">
              <div>
                <span className={`text-[9px] font-medium uppercase px-2 py-0.5 rounded-full ${
                  selectedAccountDetail.converted_by_entity === 'BACK_OFFICE'
                    ? 'bg-black/5 dark:bg-white/10 text-[#242124] dark:text-white'
                    : 'bg-[#4F6CE8]/15 text-[#4F6CE8]'
                }`}>
                  {selectedAccountDetail.converted_by_entity === 'BACK_OFFICE' ? 'Converti par le Back-Office Terrain' : 'Converti par le KAM Office'}
                </span>
                <h3 className="text-lg font-semibold mt-1">{selectedAccountDetail.name}</h3>
                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">Identifiant CRM : {selectedAccountDetail.crm_id}</span>
              </div>
              <button
                onClick={() => setSelectedAccountDetail(null)}
                className="p-1 rounded-full text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer"
              >
                <Icons.X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-[#F6F5F2] dark:bg-[#242124] p-4 rounded-2xl">
              <div>
                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">Montant Souscrit :</span>
                <span className="text-sm font-medium text-[#242124] dark:text-white">
                  +{Number(selectedAccountDetail.converted_amount).toLocaleString()} $ / an
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">Offre Commerciale :</span>
                <span className="text-xs font-medium text-[#4F6CE8]">
                  {selectedAccountDetail.converted_offer || "Fibre Entreprise Dédiée"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">Localisation :</span>
                <span className="font-semibold">{selectedAccountDetail.city} ({selectedAccountDetail.commune})</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">Numéro RCCM :</span>
                <span className="font-semibold">{selectedAccountDetail.rccm || "CD/KNG/RCCM/22-B-0142"}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">Interlocuteur Décideur :</span>
                <span className="font-semibold">{selectedAccountDetail.contact_name} ({selectedAccountDetail.contact_role})</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">Téléphone de Contact :</span>
                <span className="font-semibold">{selectedAccountDetail.contact_phone || "+243..."}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">Notes de Signature & Raccordement :</span>
              <p className="p-3 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl text-[#6E6C67] dark:text-[#A1A1AA] leading-relaxed">
                {selectedAccountDetail.conversion_notes || "Dossier KYC et bon de commande validés par le décideur. Étude de tirage fibre lancée."}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAccountDetail(null)}
                className="px-5 py-2 bg-[#4F6CE8] text-white rounded-xl text-xs font-medium cursor-pointer hover:bg-[#3D5BD9] transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE : ÉMISSION D'UNE DIRECTIVE SUPER ADMIN                              */}
      {/* ========================================================================= */}
      {isDirectiveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl w-full max-w-xl p-6 shadow-2xl flex flex-col gap-5 animate-scale-in text-[#242124] dark:text-white border border-black/5 dark:border-white/5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-3 border-b border-black/5 dark:border-white/5">
              <div>
                <span className="text-[9px] font-medium uppercase px-2 py-0.5 rounded-full bg-[#4F6CE8]/15 text-[#4F6CE8]">
                  Consigne Managériale
                </span>
                <h3 className="text-base font-semibold mt-1">Émettre une Directive Super Admin</h3>
                <p className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                  Transmettez une consigne opérationnelle prioritaire avec accusé de traitement et suivi en temps réel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDirectiveModalOpen(false)}
                className="p-1 rounded-full text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer"
              >
                <Icons.X size={16} />
              </button>
            </div>

            {directiveErrorMsg && (
              <div className="p-3 rounded-2xl bg-red-500/10 text-red-500 text-xs font-medium flex items-center gap-2">
                <Icons.AlertCircle size={15} />
                <span>{directiveErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSendDirectiveSubmit} className="flex flex-col gap-3.5 text-xs">
              {/* Entité Cible */}
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Entité Cible</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirectiveForm({ ...directiveForm, target_entity: 'KAM_OFFICE', recipient_id: '' })}
                    className={`py-2.5 px-3 rounded-xl font-medium flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      directiveForm.target_entity === 'KAM_OFFICE'
                        ? 'bg-[#4F6CE8] text-white shadow-sm'
                        : 'bg-[#F6F5F2] dark:bg-[#242124] text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                    }`}
                  >
                    <Icons.Briefcase size={14} />
                    <span>KAM Office (PME / Grands C.)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectiveForm({ ...directiveForm, target_entity: 'BACK_OFFICE', recipient_id: '' })}
                    className={`py-2.5 px-3 rounded-xl font-medium flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      directiveForm.target_entity === 'BACK_OFFICE'
                        ? 'bg-[#4F6CE8] text-white shadow-sm'
                        : 'bg-[#F6F5F2] dark:bg-[#242124] text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                    }`}
                  >
                    <Icons.Map size={14} />
                    <span>Back-Office Terrain (SOHO)</span>
                  </button>
                </div>
              </div>

              {/* Destinataire */}
              <div className="flex flex-col gap-1">
                <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">
                  Destinataire Précis *
                </label>
                <select
                  required
                  value={directiveForm.recipient_id}
                  onChange={(e) => setDirectiveForm({ ...directiveForm, recipient_id: e.target.value })}
                  className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0 cursor-pointer"
                >
                  <option value="">Sélectionner un collaborateur...</option>
                  {directiveForm.target_entity === 'KAM_OFFICE' ? (
                    <>
                      <optgroup label="Key Account Managers (KAMs)">
                        {kamsTeam.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.full_name} (@{k.username}) - {k.company_name || 'KAM'}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Gérants KAM Office">
                        {kamManagersList.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.full_name} (@{m.username}) - Gérant KAM
                          </option>
                        ))}
                      </optgroup>
                    </>
                  ) : (
                    <>
                      <optgroup label="Superviseurs Back-Office">
                        {supervisorsList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.full_name} (@{s.username}) - {s.location || 'Superviseur'}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Commerciaux Terrain">
                        {salespersons.map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.full_name} (@{sp.username}) - {sp.location || 'Kinshasa'}
                          </option>
                        ))}
                      </optgroup>
                    </>
                  )}
                </select>
              </div>

              {/* Titre & Compte */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Titre de la Directive *</label>
                  <input
                    type="text"
                    required
                    value={directiveForm.title}
                    onChange={(e) => setDirectiveForm({ ...directiveForm, title: e.target.value })}
                    placeholder="Ex: Réactivation compte inactif"
                    className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Compte Ciblé (Optionnel)</label>
                  <input
                    type="text"
                    value={directiveForm.target_account_name}
                    onChange={(e) => setDirectiveForm({ ...directiveForm, target_account_name: e.target.value })}
                    placeholder="Ex: Rawbank Kinshasa"
                    className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0"
                  />
                </div>
              </div>

              {/* Priorité */}
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Niveau de Priorité</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['NORMAL', 'HIGH', 'CRITICAL'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDirectiveForm({ ...directiveForm, priority: p })}
                      className={`py-2 px-3 rounded-xl font-medium text-xs transition-all cursor-pointer ${
                        directiveForm.priority === p
                          ? p === 'CRITICAL'
                            ? 'bg-rose-500 text-white shadow-sm'
                            : p === 'HIGH'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-[#4F6CE8] text-white shadow-sm'
                          : 'bg-[#F6F5F2] dark:bg-[#242124] text-[#6E6C67] dark:text-[#A1A1AA] hover:text-[#242124] dark:hover:text-white'
                      }`}
                    >
                      {p === 'CRITICAL' ? '● Critique' : p === 'HIGH' ? '▲ Haute' : 'Normale'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="flex flex-col gap-1">
                <label className="font-medium text-[#6E6C67] dark:text-[#A1A1AA]">Instruction / Consigne Managériale *</label>
                <textarea
                  rows={4}
                  required
                  value={directiveForm.instruction}
                  onChange={(e) => setDirectiveForm({ ...directiveForm, instruction: e.target.value })}
                  placeholder="Décrivez précisément l'action à mener, les vérifications à effectuer ou la modification demandée..."
                  className="px-3.5 py-2.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F6CE8] border-0 leading-relaxed font-normal"
                />
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsDirectiveModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 font-medium hover:bg-black/10 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={sendingDirective}
                  className="px-5 py-2.5 bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white rounded-xl font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Icons.Send size={13} className={sendingDirective ? "animate-spin" : ""} />
                  <span>{sendingDirective ? "Envoi en cours..." : "Transmettre la Directive"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE : PORTEFEUILLE DU KEY ACCOUNT MANAGER                              */}
      {/* ========================================================================= */}
      {selectedKamForPortfolio && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl w-full max-w-4xl p-6 shadow-2xl flex flex-col gap-5 animate-scale-in text-[#242124] dark:text-white border border-black/5 dark:border-white/5 max-h-[90vh] overflow-hidden">
            
            {/* Header du Portefeuille */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-[#4F6CE8]/10 border-2 border-[#4F6CE8]/30 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                  <img
                    src={`/memojis/${(selectedKamForPortfolio.avatar || 'memoji_019.png').replace('assets/memojis/', '')}`}
                    alt={selectedKamForPortfolio.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-[#242124] dark:text-white">
                      Portefeuille de {selectedKamForPortfolio.full_name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-[#4F6CE8]/15 text-[#4F6CE8] font-semibold text-[10px]">
                      KAM Office
                    </span>
                  </div>
                  <span className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                    @{selectedKamForPortfolio.username} • {selectedKamForPortfolio.company_name || "Direction Grands Comptes & PME"} • {selectedKamForPortfolio.email}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenDirectiveToRecipient('KAM_OFFICE', selectedKamForPortfolio.id);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#4F6CE8] hover:bg-[#3D5BD9] text-white text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Icons.Send size={12} />
                  <span>Directive au KAM</span>
                </button>
                <button
                  onClick={() => setSelectedKamForPortfolio(null)}
                  className="p-2 rounded-full text-[#6E6C67] hover:text-[#242124] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  title="Fermer la modale"
                >
                  <Icons.X size={16} />
                </button>
              </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              <div className="p-3 bg-[#F6F5F2] dark:bg-[#242124] rounded-2xl flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Comptes Rattachés</span>
                <span className="text-base font-medium text-[#242124] dark:text-white">{kamPortfolioAccounts.length}</span>
              </div>
              <div className="p-3 bg-[#F6F5F2] dark:bg-[#242124] rounded-2xl flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase">Comptes Convertis</span>
                <span className="text-base font-medium text-emerald-600 dark:text-emerald-400">
                  {kamPortfolioAccounts.filter(a => a.is_converted || a.conversion_status === 'CONVERTED').length}
                </span>
              </div>
              <div className="p-3 bg-[#F6F5F2] dark:bg-[#242124] rounded-2xl flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-[#4F6CE8] uppercase">CA Signé Portefeuille</span>
                <span className="text-base font-medium text-[#4F6CE8]">
                  +{(selectedKamForPortfolio.converted_amount || 0).toLocaleString()} $
                </span>
              </div>
              <div className="p-3 bg-[#F6F5F2] dark:bg-[#242124] rounded-2xl flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-[#6E6C67] dark:text-[#A1A1AA] uppercase">Taux de Conversion</span>
                <span className="text-base font-medium text-[#242124] dark:text-white">
                  {kamPortfolioAccounts.length > 0 
                    ? Math.round((kamPortfolioAccounts.filter(a => a.is_converted || a.conversion_status === 'CONVERTED').length / kamPortfolioAccounts.length) * 100) 
                    : 0}%
                </span>
              </div>
            </div>

            {/* Barre de Recherche dans le Portefeuille */}
            <div className="flex items-center gap-2 bg-[#F6F5F2] dark:bg-[#242124] px-3.5 py-2 rounded-2xl shrink-0">
              <Icons.Search size={14} className="text-[#6E6C67] dark:text-[#A1A1AA] shrink-0" />
              <input
                type="text"
                value={kamPortfolioSearch}
                onChange={(e) => setKamPortfolioSearch(e.target.value)}
                placeholder="Filtrer parmi les comptes du portefeuille (nom, CRM ID, ville, secteur)..."
                className="w-full bg-transparent text-xs font-medium text-[#242124] dark:text-white placeholder-[#6E6C67] dark:placeholder-[#A1A1AA] border-0 focus:outline-none"
              />
              {kamPortfolioSearch && (
                <button
                  type="button"
                  onClick={() => setKamPortfolioSearch('')}
                  className="text-xs text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer px-1"
                >
                  <Icons.X size={16} />
                </button>
              )}
            </div>

            {/* Liste scrollable des comptes */}
            <div className="flex-1 overflow-y-auto min-h-64 border border-black/5 dark:border-white/5 rounded-2xl">
              {loadingKamPortfolio ? (
                <div className="py-20 flex justify-center items-center">
                  <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-[#4F6CE8] rounded-full animate-spin" />
                </div>
              ) : filteredKamPortfolioAccounts.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                  {kamPortfolioSearch ? "Aucun compte ne correspond à votre recherche dans ce portefeuille." : "Aucune entreprise assignée à ce KAM pour le moment."}
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#F6F5F2] dark:bg-[#242124] border-b border-black/5 dark:border-white/5 text-[10px] font-medium uppercase tracking-wider text-[#6E6C67] dark:text-[#A1A1AA]">
                    <tr>
                      <th className="py-2.5 px-3">Entreprise & CRM ID</th>
                      <th className="py-2.5 px-3">Segment</th>
                      <th className="py-2.5 px-3">CA Annuel</th>
                      <th className="py-2.5 px-3">Statut</th>
                      <th className="py-2.5 px-3">Localisation</th>
                      <th className="py-2.5 px-3">Interlocuteur Décideur</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {filteredKamPortfolioAccounts.map((acc) => {
                      const isConverted = Boolean(acc.is_converted || acc.conversion_status === 'CONVERTED');
                      return (
                      <tr key={acc.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-[#242124] dark:text-white block">{acc.name}</span>
                          <span className="font-mono text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">{acc.crm_id}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                            acc.segment === 'GRAND_COMPTE'
                              ? 'bg-[#4F6CE8]/15 text-[#4F6CE8]'
                              : acc.segment === 'PME'
                              ? 'bg-[#4F6CE8]/15 text-[#4F6CE8]'
                              : 'bg-black/5 dark:bg-white/10 text-[#6E6C67] dark:text-[#A1A1AA]'
                          }`}>
                            {acc.segment === 'GRAND_COMPTE' ? 'Grand Compte' : acc.segment}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#242124] dark:text-white">
                          {Number(acc.annual_revenue || 0).toLocaleString()} $
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isConverted
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}>
                            {isConverted ? 'Converti' : 'En prospection'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#6E6C67] dark:text-[#A1A1AA]">
                          {acc.city} {acc.commune ? `(${acc.commune})` : ''}
                        </td>
                        <td className="py-2.5 px-3 text-[#6E6C67] dark:text-[#A1A1AA]">
                          <span className="font-medium text-[#242124] dark:text-white block">{acc.contact_name || "Non renseigné"}</span>
                          <span className="text-[10px]">{acc.contact_role || acc.contact_phone || ""}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedKamForPortfolio(null);
                              handleOpenDirectiveToRecipient('KAM_OFFICE', selectedKamForPortfolio.id, acc.name);
                            }}
                            className="px-2.5 py-1 bg-[#4F6CE8]/10 hover:bg-[#4F6CE8] text-[#4F6CE8] hover:text-white rounded-xl text-[10px] font-medium transition-all cursor-pointer flex items-center gap-1 inline-flex"
                            title="Envoyer une directive au KAM sur ce compte"
                          >
                            <Icons.Send size={10} />
                            <span>Directive</span>
                          </button>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center pt-2 shrink-0">
              <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
                Affichage de {filteredKamPortfolioAccounts.length} compte(s) sur {kamPortfolioAccounts.length}
              </span>
              <button
                onClick={() => setSelectedKamForPortfolio(null)}
                className="px-5 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#242124] dark:text-white rounded-xl text-xs font-medium cursor-pointer transition-all"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE : DÉTAIL DES PLAQUES ASSIGNÉES AU COMMERCIAL                       */}
      {/* ========================================================================= */}
      {selectedSalespersonForPlaques && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#2D2A2D] rounded-3xl w-full max-w-xl p-6 shadow-2xl flex flex-col gap-5 animate-scale-in text-[#242124] dark:text-white border border-black/5 dark:border-white/5">
            <div className="flex justify-between items-start pb-3 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={`/memojis/${(selectedSalespersonForPlaques.avatar || 'memoji_056.png').replace('assets/memojis/', '')}`}
                    alt={selectedSalespersonForPlaques.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{selectedSalespersonForPlaques.full_name}</h3>
                  <span className="text-[11px] text-[#6E6C67] dark:text-[#A1A1AA]">
                    @{selectedSalespersonForPlaques.username} • {selectedSalespersonForPlaques.location || 'Kinshasa'} • {selectedSalespersonForPlaques.incentive_points || 0} pts incentive
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSalespersonForPlaques(null)}
                className="p-1 rounded-full text-[#6E6C67] hover:text-[#242124] dark:hover:text-white cursor-pointer"
              >
                <Icons.X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-[#4F6CE8]">
                Plaques Cartographiques Attribuées ({selectedSalespersonForPlaques.assigned_plaques?.length || 0})
              </span>
              <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                Périmètres territoriaux d'affectation pour les opérations de prospection pédestre SOHO.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 max-h-64 overflow-y-auto">
                {selectedSalespersonForPlaques.assigned_plaques && selectedSalespersonForPlaques.assigned_plaques.length > 0 ? (
                  selectedSalespersonForPlaques.assigned_plaques.map((code, idx) => {
                    const matchPlaque = plaques.find(p => p.code.toLowerCase() === code.toLowerCase() || p.name.toLowerCase().includes(code.toLowerCase()));
                    return (
                      <div key={idx} className="p-3.5 bg-[#F6F5F2] dark:bg-[#242124] rounded-2xl flex flex-col gap-2 border border-black/5 dark:border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded-md bg-[#4F6CE8]/15 text-[#4F6CE8]">
                            {code}
                          </span>
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            Active
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-xs text-[#242124] dark:text-white">
                            {matchPlaque?.name || `Secteur ${code}`}
                          </h4>
                          <span className="text-[10px] text-[#6E6C67] dark:text-[#A1A1AA] block">
                            Ville : {matchPlaque?.city || selectedSalespersonForPlaques.location || 'Kinshasa'}
                          </span>
                          {matchPlaque?.enterprises_count !== undefined && (
                            <span className="text-[10px] text-[#4F6CE8] font-medium block mt-0.5">
                              {matchPlaque.enterprises_count} comptes SOHO rattachés
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSalespersonForPlaques(null);
                            setFieldSubTab('plaques');
                            setPlaqueViewMode('map');
                          }}
                          className="w-full mt-1 py-1.5 px-2.5 rounded-xl bg-white dark:bg-[#2D2A2D] hover:bg-[#4F6CE8] hover:text-white text-[11px] font-medium text-[#242124] dark:text-white transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <Icons.Map size={11} />
                          <span>Localiser sur la Carte</span>
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-2 py-8 text-center text-xs text-[#6E6C67] dark:text-[#A1A1AA]">
                    Aucune plaque assignée pour ce commercial actuellement.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => {
                  const spId = selectedSalespersonForPlaques.id;
                  setSelectedSalespersonForPlaques(null);
                  handleOpenDirectiveToRecipient('BACK_OFFICE', spId);
                }}
                className="px-4 py-2 bg-[#4F6CE8]/10 hover:bg-[#4F6CE8] text-[#4F6CE8] hover:text-white rounded-xl text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Icons.Send size={12} />
                <span>Envoyer Directive</span>
              </button>

              <button
                onClick={() => setSelectedSalespersonForPlaques(null)}
                className="px-5 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[#242124] dark:text-white rounded-xl text-xs font-medium cursor-pointer transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ANIMATION GIVRÉE : ENVELOPPE VOLANTE & DIRECTIVE TRANSMISE                */}
      {/* ========================================================================= */}
      {isEnvelopeFlying && lastSentDirective && (
        <div className="fixed inset-0 z-60 pointer-events-none flex items-center justify-center">
          <div className="animate-flying-envelope flex flex-col items-center">
            <div className="w-80 p-5 rounded-3xl bg-white/95 dark:bg-[#2D2A2D]/95 backdrop-blur-2xl shadow-2xl border-2 border-[#4F6CE8]/40 flex flex-col gap-3.5 relative overflow-hidden pointer-events-auto">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4F6CE8] via-emerald-400 to-[#4F6CE8]" />

              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[#4F6CE8]/15 text-[#4F6CE8] flex items-center justify-center text-xl shadow-xs">
                  
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] uppercase">
                  Directive Transmise
                </span>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-[#242124] dark:text-white line-clamp-1">
                  {lastSentDirective.title}
                </h4>
                <p className="text-xs text-[#6E6C67] dark:text-[#A1A1AA] mt-0.5">
                  Vers <span className="font-medium text-[#242124] dark:text-white">{lastSentDirective.recipientName}</span>
                </p>
              </div>

              <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] text-[#6E6C67] dark:text-[#A1A1AA]">
                <span>{lastSentDirective.timestamp}</span>
                <span className="font-medium text-[#4F6CE8]">En vol vers la console</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </ProtectedRoute>
  );
}
