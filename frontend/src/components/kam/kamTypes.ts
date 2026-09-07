export type GrowthStage = 'STARTUP' | 'SCALING' | 'MATURE' | 'RESTRUCTURING' | 'CONGLOMERATE';
export type ClientStatus = 'NON_CLIENT' | 'PARTIAL_CLIENT' | 'MULTI_PRODUCT_CLIENT' | 'CHURN_RISK';
export type SlaStatus = 'HEALTHY' | 'WARNING' | 'BREACHED';
export type CommitmentStatus = 'PENDING' | 'IN_PROGRESS' | 'OVERDUE' | 'DONE';
export type DecisionRole = 'ECONOMIC_BUYER' | 'CHAMPION' | 'TECHNICAL_BUYER' | 'USER' | 'INFLUENCER' | 'GATEKEEPER' | 'BLOCKER';
export type InfluenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type StanceTowardsOrange = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'UNKNOWN';
export type SignalCategory = 'EXECUTIVE_MOVE' | 'EXPANSION' | 'FUNDING_M_AND_A' | 'RFP_TENDER' | 'HIRING_SPIKE' | 'REGULATORY';

export interface ActiveContract {
  service_name: string;
  end_date: string;
  is_renewal_imminent: boolean;
  sla_status: SlaStatus;
  monthly_value?: number;
}

export interface OpenCommitment {
  id: string;
  action: string;
  owner: string;
  due_date: string;
  status: CommitmentStatus;
}

export interface Stakeholder {
  id: string;
  full_name: string;
  job_title: string;
  role_in_decision: DecisionRole;
  influence_level: InfluenceLevel;
  stance_towards_orange: StanceTowardsOrange;
  last_contacted_date: string | null;
  last_contacted_by: string | null;
  key_notes: string;
  avatar_url?: string;
}

export interface TriggerSignal {
  id: string;
  category: SignalCategory;
  title: string;
  description: string;
  source: string;
  date: string;
  is_urgent?: boolean;
}

export interface PainHypothesis {
  hypothesis: string;
  trigger_evidence: string;
  discovery_angle: string;
}

export interface OrangeOpportunity {
  solution_category: string;
  value_proposition: string;
  potential_mrr: number;
}

export interface VisitStrategy {
  primary_objective: string;
  ideal_outcome: string;
  suggested_agenda: string[];
  traps_to_avoid: string[];
}

export interface KamVisitBriefingData {
  account_id: string;
  account_name: string;
  industry: string;
  growth_stage: GrowthStage;
  firmographics: {
    headcount: number;
    estimated_annual_revenue: string;
    locations_count: number;
    countries: string[];
    business_model_summary: string;
  };
  orange_relationship: {
    client_status: ClientStatus;
    wallet_share_percentage: number;
    mrr_current: number;
    total_telecom_cloud_budget: number;
    active_contracts: ActiveContract[];
    recent_incidents_count_30d: number;
    critical_incidents_summary: string;
    last_interactions_summary: string[];
    open_commitments: OpenCommitment[];
  };
  stakeholders_mapping: Stakeholder[];
  missing_stakeholders_alert: string[];
  trigger_signals: TriggerSignal[];
  technical_environment: {
    current_competitors: string[];
    installed_cloud_telecom_stack: string[];
    known_constraints: string[];
    cybersecurity_compliance_needs: string[];
  };
  ai_hypotheses_and_playbook: {
    pain_hypotheses: PainHypothesis[];
    orange_opportunities: OrangeOpportunity[];
  };
  visit_strategy: VisitStrategy;
}

export interface StrategicVisit {
  id: string;
  account_id: string;
  account_name: string;
  meeting_title: string;
  meeting_time: string;
  meeting_date: string; // YYYY-MM-DD
  duration_minutes: number;
  location: string;
  dot_color: 'blue' | 'green' | 'orange' | 'red';
  status_label: string;
  is_prepared: boolean;
  preparation_time_minutes: number;
  golden_rule: string;
  briefing: KamVisitBriefingData;
  debrief_completed?: boolean;
  crm_id?: string;
  conversion_status?: 'PROSPECT' | 'IN_NEGOTIATION' | 'CONVERTED' | 'LOST';
  converted_amount?: number;
  converted_offer?: string;
  conversion_notes?: string;
}

export interface MeetingDebrief {
  visit_id: string;
  account_name: string;
  date: string;
  audio_duration_seconds: number;
  transcript_text: string;
  executive_summary: string;
  client_followup_email: {
    subject: string;
    body: string;
  };
  commitments_extracted: OpenCommitment[];
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  next_step_recommendation: string;
}
