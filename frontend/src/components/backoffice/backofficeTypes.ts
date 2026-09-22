export type BackofficeView =
  | 'soho_managed'
  | 'daily_report'
  | 'salespersons'
  | 'map'
  | 'plaques_list'
  | 'soho_directory'
  | 'settings';

export interface EnterpriseItem {
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

export interface VisitReportItem {
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

export interface VisitSubmissionItem {
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
  profile_picture_url?: string;
  assigned_plaques: string[];
  reports_count: number;
  visits_count: number;
  form_submissions_count: number;
  conversions_count?: number;
  converted_amount?: number;
  incentive_points: number;
}
