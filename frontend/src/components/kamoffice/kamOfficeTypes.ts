export type KamOfficeView =
  | 'overview'
  | 'leadscoring'
  | 'churnradar'
  | 'kams'
  | 'grands_comptes'
  | 'pme'
  | 'reports'
  | 'settings';

export interface KamOfficeMetrics {
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

export interface KamUser {
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

export interface KamAccount {
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

export interface KamVisitRecord {
  id: number;
  appointment_id: number | null;
  enterprise_id: number;
  enterprise_name: string;
  enterprise_sector: string;
  crm_id: string;
  meeting_type: 'PHYSICAL' | 'GOOGLE_MEET' | 'CALL';
  meeting_type_label?: string;
  contact_name: string;
  contact_role: string;
  raw_transcript: string;
  executive_summary: string;
  confirmed_needs: string[];
  objections_raised: string[];
  actions_todo: string[];
  follow_up_email_draft: string;
  bant_scores?: {
    budget?: number;
    authority?: number;
    need?: number;
    timeline?: number;
    total?: number;
    status?: string;
  };
  conversion_status: string;
  created_at: string;
}
