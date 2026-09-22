export interface SegmentationStats {
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

export interface SegmentationConfigData {
  id: number;
  tpe_max_revenue: string;
  pme_max_revenue: string;
  backoffice_entity_label: string;
  kam_entity_label: string;
  updated_at: string;
  stats: SegmentationStats;
}

export interface ManagerUser {
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

export interface ConvertedAccount {
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

export interface EnterpriseItem {
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

export interface B2BOfferVariant {
  name: string;
  details: string[];
}

export interface B2BOfferItem {
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

export interface SalespersonItem {
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

export interface PlaqueItem {
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

export interface KamTeamMemberItem {
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

export type AdminTabId =
  | 'converted'
  | 'b2b_catalog'
  | 'crm_bank'
  | 'supervisors'
  | 'kam_managers'
  | 'field_sales'
  | 'kams_team'
  | 'segmentation'
  | 'scoring'
  | 'settings';
