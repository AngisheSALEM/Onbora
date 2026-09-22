export type KamVisitPurpose = 'DISCOVERY' | 'QUALIFICATION' | 'FOLLOW_UP' | 'GROWTH';

export const VISIT_PURPOSE_LABELS: Record<KamVisitPurpose, string> = {
  DISCOVERY: 'Prospection / Découverte',
  QUALIFICATION: 'Qualification / Proposition',
  FOLLOW_UP: 'Suivi / Revue client',
  GROWTH: 'Renouvellement / Développement',
};

export const VISIT_PURPOSE_TITLES: Record<KamVisitPurpose, string> = {
  DISCOVERY: 'Découverte des besoins',
  QUALIFICATION: 'Qualification du projet',
  FOLLOW_UP: 'Revue de la relation client',
  GROWTH: 'Renouvellement et projets à venir',
};

export interface PurposeSuggestion {
  suggested_purpose: KamVisitPurpose;
  suggested_purpose_label: string;
  reason: string;
  needs_confirmation: boolean;
  completed_kam_visits: number;
  prior_contact_recorded: boolean;
  relationship_label: string;
}
