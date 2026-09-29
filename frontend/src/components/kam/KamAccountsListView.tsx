"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { StrategicVisit } from './kamTypes';
import { useKamContext } from './KamContext';

interface KamAccountsListViewProps {
  visits: StrategicVisit[];
  searchQuery?: string;
  onSelectAccount: (visit: StrategicVisit) => void;
  onOpenBriefing: (visit: StrategicVisit) => void;
  onOpenDebrief: (visit: StrategicVisit) => void;
}

type PeriodFilter = '7d' | '30d' | '90d';

interface AccountRowData {
  id: string;
  name: string;
  priority: 'Critique' | 'Élevée' | 'Modérée';
  healthScore: number;
  trend: string;
  primarySignal: string;
  renewalTimeline: string;
  visitRef: StrategicVisit;
}

interface MilestoneData {
  label: string;
  healthy: number;
  surveillance: number;
  atRisk: number;
  retentionRate: number;
}

const MILESTONES: Record<PeriodFilter, MilestoneData[]> = {
  '7d': [
    { label: 'Il y a 7 jours', healthy: 43, surveillance: 14, atRisk: 6, retentionRate: 88 },
    { label: 'Il y a 5 jours', healthy: 42, surveillance: 15, atRisk: 7, retentionRate: 86 },
    { label: 'Il y a 3 jours', healthy: 42, surveillance: 15, atRisk: 7, retentionRate: 86 },
    { label: 'Aujourd’hui', healthy: 42, surveillance: 15, atRisk: 8, retentionRate: 84 },
  ],
  '30d': [
    { label: 'Il y a 30 jours', healthy: 45, surveillance: 12, atRisk: 5, retentionRate: 91 },
    { label: 'Il y a 20 jours', healthy: 44, surveillance: 13, atRisk: 6, retentionRate: 89 },
    { label: 'Il y a 10 jours', healthy: 43, surveillance: 14, atRisk: 7, retentionRate: 87 },
    { label: 'Aujourd’hui', healthy: 42, surveillance: 15, atRisk: 8, retentionRate: 84 },
  ],
  '90d': [
    { label: 'Il y a 90 jours', healthy: 48, surveillance: 10, atRisk: 4, retentionRate: 93 },
    { label: 'Il y a 60 jours', healthy: 46, surveillance: 12, atRisk: 5, retentionRate: 90 },
    { label: 'Il y a 30 jours', healthy: 44, surveillance: 14, atRisk: 6, retentionRate: 87 },
    { label: 'Aujourd’hui', healthy: 42, surveillance: 15, atRisk: 8, retentionRate: 84 },
  ],
};

const DEFAULT_STRATEGIC_ACCOUNTS: AccountRowData[] = [
  {
    id: 'vodacom-1',
    name: 'Vodacom RDC',
    priority: 'Critique',
    healthScore: 32,
    trend: '-12',
    primarySignal: 'Baisse d’usage + tickets critiques',
    renewalTimeline: 'Dans 45 jours',
    visitRef: {
      id: '1204',
      account_id: '1204',
      account_name: 'Vodacom RDC',
      meeting_title: 'Revue Stratégique & Risque Réseau',
      meeting_time: '10:00',
      meeting_date: '2026-10-02',
      duration_minutes: 45,
      location: 'Siège Kinshasa / Visioconférence',
      dot_color: 'blue',
      status_label: 'Priorité Haute',
      is_prepared: true,
      preparation_time_minutes: 15,
      golden_rule: 'Sécuriser le renouvellement et auditer la stabilité du lien.',
      briefing: {
        account_id: '1204',
        account_name: 'Vodacom RDC',
        industry: 'Télécommunications & Data',
        growth_stage: 'CONGLOMERATE',
        firmographics: {
          headcount: 850,
          estimated_annual_revenue: '85.6M $ USD',
          locations_count: 14,
          countries: ['RDC'],
          business_model_summary: 'Opérateur télécoms et infrastructures numériques.'
        },
        orange_relationship: {
          client_status: 'CHURN_RISK',
          wallet_share_percentage: 35,
          mrr_current: 24500,
          total_telecom_cloud_budget: 350000,
          active_contracts: [
            {
              service_name: 'Interconnexion Fibre Dédiée',
              end_date: '15/11/2026',
              is_renewal_imminent: true,
              sla_status: 'WARNING',
              monthly_value: 18500
            }
          ],
          recent_incidents_count_30d: 4,
          critical_incidents_summary: '4 incidents de latence et coupures constatés.',
          last_interactions_summary: ['Réunion technique le 18/09/2026.'],
          open_commitments: []
        },
        stakeholders_mapping: [
          {
            id: 'stk-1',
            full_name: 'Directeur Général Adjoint',
            job_title: 'Directeur Exécutif',
            role_in_decision: 'ECONOMIC_BUYER',
            influence_level: 'HIGH',
            stance_towards_orange: 'NEUTRAL',
            last_contacted_date: '2026-09-18',
            last_contacted_by: 'KAM',
            key_notes: 'Exige un engagement ferme de continuité.'
          }
        ],
        missing_stakeholders_alert: [],
        trigger_signals: [
          {
            id: 'sig-1',
            category: 'REGULATORY',
            title: 'Baisse d’usage + tickets critiques',
            description: 'Incident de coupure de liaison optique et baisse du trafic.',
            source: 'Monitoring Réseau',
            date: '24/09/2026',
            is_urgent: true
          }
        ],
        technical_environment: {
          current_competitors: ['Liquid Telecom'],
          installed_cloud_telecom_stack: ['Fibre Dédiée', 'SD-WAN'],
          known_constraints: ['SLA 99.9%'],
          cybersecurity_compliance_needs: ['ISO 27001']
        },
        ai_hypotheses_and_playbook: {
          pain_hypotheses: [
            {
              hypothesis: 'Saturation du lien optique principal',
              trigger_evidence: 'Incidents récurrents lors des pics de charge',
              discovery_angle: 'Impact sur la facturation et les plateformes'
            }
          ],
          orange_opportunities: [
            {
              solution_category: 'Fibre Dédiée Sécurisée 1Gbps',
              value_proposition: 'Lien doublé avec redondance Satellite',
              potential_mrr: 12000
            }
          ]
        },
        visit_strategy: {
          primary_objective: 'Plan de rétablissement de la confiance et signature avenant',
          ideal_outcome: 'Renouvellement pour 24 mois avec engagement SLA',
          suggested_agenda: ['Revue des tickets', 'Présentation du lien secouru', 'Validation des dates'],
          traps_to_avoid: ['Minimiser les incidents récents']
        }
      }
    }
  },
  {
    id: 'rawbank-2',
    name: 'Rawbank RDC Siège',
    priority: 'Critique',
    healthScore: 38,
    trend: '-8',
    primarySignal: 'Insatisfaction exprimée en rendez-vous',
    renewalTimeline: 'Dans 60 jours',
    visitRef: {
      id: '1199',
      account_id: '1199',
      account_name: 'Rawbank RDC Siège',
      meeting_title: 'Comité de Pilotage Infrastructure',
      meeting_time: '14:30',
      meeting_date: '2026-10-05',
      duration_minutes: 60,
      location: 'Kinshasa Gombe',
      dot_color: 'blue',
      status_label: 'Audit en cours',
      is_prepared: true,
      preparation_time_minutes: 20,
      golden_rule: 'Présenter la gouvernance dédiée avant toute renégociation tarifaire.',
      briefing: {
        account_id: '1199',
        account_name: 'Rawbank RDC Siège',
        industry: 'Banque & Finance',
        growth_stage: 'CONGLOMERATE',
        firmographics: {
          headcount: 1400,
          estimated_annual_revenue: '81.6M $ USD',
          locations_count: 85,
          countries: ['RDC'],
          business_model_summary: 'Première banque commerciale de la République Démocratique du Congo.'
        },
        orange_relationship: {
          client_status: 'PARTIAL_CLIENT',
          wallet_share_percentage: 40,
          mrr_current: 31200,
          total_telecom_cloud_budget: 450000,
          active_contracts: [
            {
              service_name: 'Réseau d’interconnexion bancaire',
              end_date: '30/11/2026',
              is_renewal_imminent: true,
              sla_status: 'WARNING',
              monthly_value: 26000
            }
          ],
          recent_incidents_count_30d: 3,
          critical_incidents_summary: 'Plaintes sur la réactivité de l’assistance technique.',
          last_interactions_summary: ['Point d’étape trimestriel tenu le 15/09/2026.'],
          open_commitments: []
        },
        stakeholders_mapping: [
          {
            id: 'stk-rawbank-1',
            full_name: 'Directeur des Systèmes d’Information',
            job_title: 'DSI Groupe',
            role_in_decision: 'TECHNICAL_BUYER',
            influence_level: 'HIGH',
            stance_towards_orange: 'NEUTRAL',
            last_contacted_date: '2026-09-15',
            last_contacted_by: 'KAM',
            key_notes: 'Sensible au monitoring en temps réel des transactions.'
          }
        ],
        missing_stakeholders_alert: [],
        trigger_signals: [
          {
            id: 'sig-rawbank-1',
            category: 'REGULATORY',
            title: 'Insatisfaction exprimée en rendez-vous',
            description: 'Retards constatés sur la résolution des requêtes du guichet central.',
            source: 'Compte-rendu de réunion',
            date: '15/09/2026',
            is_urgent: true
          }
        ],
        technical_environment: {
          current_competitors: ['Airtel Business'],
          installed_cloud_telecom_stack: ['SD-WAN', 'Fibre Noire', 'Datacenter Hybride'],
          known_constraints: ['Haute disponibilité 99.99%'],
          cybersecurity_compliance_needs: ['PCI-DSS', 'BCC']
        },
        ai_hypotheses_and_playbook: {
          pain_hypotheses: [
            {
              hypothesis: 'Besoin d’un portail client de supervision dédié',
              trigger_evidence: 'Demande répétée de visibilité en temps réel',
              discovery_angle: 'Comment mesurez-vous les temps d’indisponibilité actuels ?'
            }
          ],
          orange_opportunities: [
            {
              solution_category: 'Fibre Dédiée Pro + SD-WAN Managé',
              value_proposition: 'Supervision proactive 24/7 et gestionnaire d’incident dédié',
              potential_mrr: 18000
            }
          ]
        },
        visit_strategy: {
          primary_objective: 'Validation du contrat de service renouvelé',
          ideal_outcome: 'Accord sur l’extension vers 25 agences provinciales',
          suggested_agenda: ['Revue de service', 'Architecture cible', 'Conditions financières'],
          traps_to_avoid: ['Omettre les agences du Katanga']
        }
      }
    }
  },
  {
    id: 'tenke-3',
    name: 'Tenke Fungurume Mining (TFM)',
    priority: 'Élevée',
    healthScore: 49,
    trend: '-5',
    primarySignal: 'Perte de contact avec le décideur clé',
    renewalTimeline: 'Dans 80 jours',
    visitRef: {
      id: '1204',
      account_id: '1204',
      account_name: 'Tenke Fungurume Mining (TFM)',
      meeting_title: 'Point d’étape Télécoms & Connectivité Site Minier',
      meeting_time: '11:00',
      meeting_date: '2026-10-08',
      duration_minutes: 45,
      location: 'Fungurume / Hybride',
      dot_color: 'blue',
      status_label: 'À contacter',
      is_prepared: true,
      preparation_time_minutes: 15,
      golden_rule: 'Recontacter le nouveau directeur des opérations.',
      briefing: {
        account_id: '1204',
        account_name: 'Tenke Fungurume Mining (TFM)',
        industry: 'Mines & Métallurgie',
        growth_stage: 'CONGLOMERATE',
        firmographics: {
          headcount: 3200,
          estimated_annual_revenue: '85.6M $ USD',
          locations_count: 6,
          countries: ['RDC'],
          business_model_summary: 'Exploitation minière industrielle de cuivre et cobalt.'
        },
        orange_relationship: {
          client_status: 'PARTIAL_CLIENT',
          wallet_share_percentage: 25,
          mrr_current: 19500,
          total_telecom_cloud_budget: 280000,
          active_contracts: [
            {
              service_name: 'Liaison Satellite & Faisceau Hertzien',
              end_date: '20/12/2026',
              is_renewal_imminent: true,
              sla_status: 'HEALTHY',
              monthly_value: 19500
            }
          ],
          recent_incidents_count_30d: 1,
          critical_incidents_summary: 'Liaison opérationnelle mais interlocuteur principal changé.',
          last_interactions_summary: ['Dernier échange le 04/08/2026.'],
          open_commitments: []
        },
        stakeholders_mapping: [
          {
            id: 'stk-tfm-1',
            full_name: 'Chef de Département Infrastructure',
            job_title: 'Responsable Télécoms Site',
            role_in_decision: 'TECHNICAL_BUYER',
            influence_level: 'HIGH',
            stance_towards_orange: 'NEUTRAL',
            last_contacted_date: '2026-08-04',
            last_contacted_by: 'KAM',
            key_notes: 'Nouveau en poste depuis août 2026.'
          }
        ],
        missing_stakeholders_alert: ['Nouveau Directeur Financier à identifier'],
        trigger_signals: [
          {
            id: 'sig-tfm-1',
            category: 'EXECUTIVE_MOVE',
            title: 'Changement de direction des opérations',
            description: 'Arrivée d’une nouvelle équipe de management sur le site de Kolwezi.',
            source: 'Actualité sectorielle',
            date: '01/09/2026',
            is_urgent: false
          }
        ],
        technical_environment: {
          current_competitors: ['Starlink Business'],
          installed_cloud_telecom_stack: ['Satellite VSAT', 'Radio UHF', 'Réseau privé'],
          known_constraints: ['Isolement géographique'],
          cybersecurity_compliance_needs: ['Protection industrielle OT']
        },
        ai_hypotheses_and_playbook: {
          pain_hypotheses: [
            {
              hypothesis: 'Débit satellite insuffisant pour la télémétrie des camions',
              trigger_evidence: 'Expansion de la fosse de production',
              discovery_angle: 'Quel est votre plan pour l’automatisation du parc minier ?'
            }
          ],
          orange_opportunities: [
            {
              solution_category: 'Fibre Optique Dédiée Sécurisée',
              value_proposition: 'Raccordement très haut débit et réseau LTE privé',
              potential_mrr: 22000
            }
          ]
        },
        visit_strategy: {
          primary_objective: 'Prise de contact physique et cartographie des décideurs',
          ideal_outcome: 'Planification d’un atelier technique sur site',
          suggested_agenda: ['Présentation de la nouvelle équipe Orange', 'Bilan connectivité', 'Projets 2027'],
          traps_to_avoid: ['Évoquer les tarifs avant la visite technique']
        }
      }
    }
  },
  {
    id: 'equity-4',
    name: 'EquityBCDC Direction Générale',
    priority: 'Élevée',
    healthScore: 56,
    trend: '+2',
    primarySignal: 'Projet d’expansion réseau en province',
    renewalTimeline: 'Dans 90 jours',
    visitRef: {
      id: '1200',
      account_id: '1200',
      account_name: 'EquityBCDC Direction Générale',
      meeting_title: 'Session Stratégique Expansion Agences',
      meeting_time: '15:00',
      meeting_date: '2026-10-12',
      duration_minutes: 50,
      location: 'Kinshasa Gombe',
      dot_color: 'blue',
      status_label: 'Opportunité active',
      is_prepared: true,
      preparation_time_minutes: 20,
      golden_rule: 'Présenter la couverture 4G/Fibre des 12 nouvelles villes cibles.',
      briefing: {
        account_id: '1200',
        account_name: 'EquityBCDC Direction Générale',
        industry: 'Banque & Services Financiers',
        growth_stage: 'CONGLOMERATE',
        firmographics: {
          headcount: 2100,
          estimated_annual_revenue: '85.5M $ USD',
          locations_count: 70,
          countries: ['RDC'],
          business_model_summary: 'Réseau bancaire national en forte expansion territoriale.'
        },
        orange_relationship: {
          client_status: 'PARTIAL_CLIENT',
          wallet_share_percentage: 45,
          mrr_current: 28000,
          total_telecom_cloud_budget: 380000,
          active_contracts: [
            {
              service_name: 'Fibre Siège & Liaisons Distantes',
              end_date: '31/12/2026',
              is_renewal_imminent: true,
              sla_status: 'HEALTHY',
              monthly_value: 28000
            }
          ],
          recent_incidents_count_30d: 0,
          critical_incidents_summary: 'Aucun incident majeur relevé.',
          last_interactions_summary: ['Revue mensuelle du 20/09/2026.'],
          open_commitments: []
        },
        stakeholders_mapping: [
          {
            id: 'stk-equity-1',
            full_name: 'Directeur des Opérations',
            job_title: 'COO',
            role_in_decision: 'ECONOMIC_BUYER',
            influence_level: 'HIGH',
            stance_towards_orange: 'POSITIVE',
            last_contacted_date: '2026-09-20',
            last_contacted_by: 'KAM',
            key_notes: 'Cherche un partenaire unique pour équiper les nouvelles agences.'
          }
        ],
        missing_stakeholders_alert: [],
        trigger_signals: [
          {
            id: 'sig-equity-1',
            category: 'EXPANSION',
            title: 'Ouverture de 15 agences régionales annoncée',
            description: 'Déploiement prévu au Grand Kasaï et Nord-Kivu.',
            source: 'Presse économique',
            date: '22/09/2026',
            is_urgent: false
          }
        ],
        technical_environment: {
          current_competitors: ['Vodacom Business'],
          installed_cloud_telecom_stack: ['SD-WAN', 'Liens MPLS', 'Téléphonie IP'],
          known_constraints: ['Déploiement sous 45 jours par site'],
          cybersecurity_compliance_needs: ['Chiffrement VPN']
        },
        ai_hypotheses_and_playbook: {
          pain_hypotheses: [
            {
              hypothesis: 'Difficulté à trouver une couverture homogène hors des grandes capitales',
              trigger_evidence: 'Zones enclavées dans le plan d’expansion',
              discovery_angle: 'Quel est votre calendrier d’ouverture pour les sites du Kasaï ?'
            }
          ],
          orange_opportunities: [
            {
              solution_category: 'Pack Agence Connectée Multi-Sites',
              value_proposition: 'Fibre + secours 4G automatique avec facturation mutualisée',
              potential_mrr: 15000
            }
          ]
        },
        visit_strategy: {
          primary_objective: 'Signature d’un protocole d’accord cadre pour les 15 agences',
          ideal_outcome: 'Exclusivité sur le lot télécoms 2026-2027',
          suggested_agenda: ['Carte de couverture Orange', 'Offre packagée par agence', 'Calendrier de raccordement'],
          traps_to_avoid: ['Engager des délais sur les zones sans pylône existant']
        }
      }
    }
  },
  {
    id: 'sofibanque-5',
    name: 'Sofibanque Siège',
    priority: 'Modérée',
    healthScore: 68,
    trend: '+4',
    primarySignal: 'Demande de redondance Datacenter',
    renewalTimeline: 'Dans 110 jours',
    visitRef: {
      id: '1202',
      account_id: '1202',
      account_name: 'Sofibanque Siège',
      meeting_title: 'Revue Trimestrielle & Audit Datacenter',
      meeting_time: '16:00',
      meeting_date: '2026-10-15',
      duration_minutes: 40,
      location: 'Kinshasa Gombe',
      dot_color: 'green',
      status_label: 'Compte Stable',
      is_prepared: true,
      preparation_time_minutes: 10,
      golden_rule: 'Valoriser les statistiques de disponibilité du trimestre écoulé.',
      briefing: {
        account_id: '1202',
        account_name: 'Sofibanque Siège',
        industry: 'Banque d’Affaires',
        growth_stage: 'SCALING',
        firmographics: {
          headcount: 520,
          estimated_annual_revenue: '43.1M $ USD',
          locations_count: 18,
          countries: ['RDC'],
          business_model_summary: 'Banque d’entreprises et institutionnels.'
        },
        orange_relationship: {
          client_status: 'MULTI_PRODUCT_CLIENT',
          wallet_share_percentage: 65,
          mrr_current: 16800,
          total_telecom_cloud_budget: 180000,
          active_contracts: [
            {
              service_name: 'Fibre Dédiée & Cloud Backup',
              end_date: '18/01/2027',
              is_renewal_imminent: false,
              sla_status: 'HEALTHY',
              monthly_value: 16800
            }
          ],
          recent_incidents_count_30d: 0,
          critical_incidents_summary: 'Disponibilité 100% sur le mois.',
          last_interactions_summary: ['Point technique mensuel le 25/09/2026.'],
          open_commitments: []
        },
        stakeholders_mapping: [
          {
            id: 'stk-sofi-1',
            full_name: 'Responsable Sécurité des Systèmes d’Information',
            job_title: 'RSSI',
            role_in_decision: 'TECHNICAL_BUYER',
            influence_level: 'HIGH',
            stance_towards_orange: 'POSITIVE',
            last_contacted_date: '2026-09-25',
            last_contacted_by: 'KAM',
            key_notes: 'Très satisfait de la réactivité opérationnelle.'
          }
        ],
        missing_stakeholders_alert: [],
        trigger_signals: [
          {
            id: 'sig-sofi-1',
            category: 'EXPANSION',
            title: 'Audit de conformité PRA / PCA bancaire',
            description: 'Nécessité de raccorder un site de repli distant sécurisé.',
            source: 'Comité d’audit',
            date: '12/09/2026',
            is_urgent: false
          }
        ],
        technical_environment: {
          current_competitors: [],
          installed_cloud_telecom_stack: ['Fibre Dédiée 500Mbps', 'Cloud Privé', 'Anti-DDoS'],
          known_constraints: ['RPO < 5 minutes', 'RTO < 15 minutes'],
          cybersecurity_compliance_needs: ['Conformité Banque Centrale']
        },
        ai_hypotheses_and_playbook: {
          pain_hypotheses: [
            {
              hypothesis: 'Lien direct vers le datacenter de secours non redondé géographiquement',
              trigger_evidence: 'Exigence nouvelle du régulateur bancaire',
              discovery_angle: 'Quel est votre niveau d’autonomie lors d’une coupure majeure ?'
            }
          ],
          orange_opportunities: [
            {
              solution_category: 'Liaison Fibre Noire Inter-Datacenters',
              value_proposition: 'Lien physique ultra-sécurisé sans passage par Internet public',
              potential_mrr: 9500
            }
          ]
        },
        visit_strategy: {
          primary_objective: 'Proposer l’offre d’interconnexion sécurisée de repli',
          ideal_outcome: 'Avenant contractuel avant la fin du trimestre',
          suggested_agenda: ['Bilan SLA', 'Architecture PRA', 'Chiffrage et calendrier'],
          traps_to_avoid: ['Retarder la proposition technique']
        }
      }
    }
  }
];

export default function KamAccountsListView({
  visits,
  onSelectAccount,
}: KamAccountsListViewProps) {
  const router = useRouter();
  const { searchQuery } = useKamContext();
  const [activePeriod, setActivePeriod] = useState<PeriodFilter>('90d');
  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState<number>(3);

  const [summaryData, setSummaryData] = useState<{
    highRiskCount: number;
    highRiskDelta: string;
    healthyCount: number;
    surveillanceCount: number;
    renewalsCount: number;
    renewalsSubtitle: string;
    upsellCount: number;
    upsellSubtitle: string;
    noActionCount: number;
    noActionSubtitle: string;
  }>({
    highRiskCount: 8,
    highRiskDelta: '+2 cette semaine',
    healthyCount: 42,
    surveillanceCount: 15,
    renewalsCount: 5,
    renewalsSubtitle: 'Dans les 90 prochains jours',
    upsellCount: 12,
    upsellSubtitle: 'Potentiel estimé : 48 M FCFA',
    noActionCount: 7,
    noActionSubtitle: 'Depuis plus de 14 jours',
  });
  const [milestonesState, setMilestonesState] = useState<Record<PeriodFilter, MilestoneData[]>>(MILESTONES);

  useEffect(() => {
    let isMounted = true;
    fetchAPI('/api/kam/portfolio-summary/')
      .then((data) => {
        if (!isMounted || !data) return;
        if (data.summary_cards) {
          const sc = data.summary_cards;
          setSummaryData({
            highRiskCount: sc.high_risk?.count ?? 8,
            highRiskDelta: sc.high_risk?.delta_text ?? '+2 cette semaine',
            healthyCount: sc.high_risk?.healthy_count ?? 42,
            surveillanceCount: sc.high_risk?.surveillance_count ?? 15,
            renewalsCount: sc.renewals?.count ?? 5,
            renewalsSubtitle: sc.renewals?.subtitle ?? 'Dans les 90 prochains jours',
            upsellCount: sc.upsell?.count ?? 12,
            upsellSubtitle: sc.upsell?.subtitle ?? 'Potentiel estimé : 48 M FCFA',
            noActionCount: sc.no_action?.count ?? 7,
            noActionSubtitle: sc.no_action?.subtitle ?? 'Depuis plus de 14 jours',
          });
        }
        if (data.milestones) {
          setMilestonesState(data.milestones);
        }
      })
      .catch((err) => {
        console.warn('Portfolio summary fallback to defaults:', err?.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const accountsData: AccountRowData[] = useMemo(() => {
    if (visits && visits.length > 0) {
      return visits.map((v, index) => {
        const incidents = v.briefing?.orange_relationship?.recent_incidents_count_30d ?? 0;
        const contracts = v.briefing?.orange_relationship?.active_contracts ?? [];
        const isRenewalImminent = contracts.some((c) => c.is_renewal_imminent);

        let priority: 'Critique' | 'Élevée' | 'Modérée' = 'Modérée';
        let healthScore = 75;
        let trend = '0';

        if (incidents >= 3 || v.briefing?.orange_relationship?.client_status === 'CHURN_RISK') {
          priority = 'Critique';
          healthScore = Math.max(22, 40 - incidents * 4);
          trend = `-${Math.min(18, 6 + incidents * 3)}`;
        } else if (incidents > 0 || isRenewalImminent) {
          priority = 'Élevée';
          healthScore = 52;
          trend = '-4';
        } else if (v.conversion_status === 'CONVERTED') {
          priority = 'Modérée';
          healthScore = 86;
          trend = '+5';
        }

        const primarySignal =
          v.briefing?.trigger_signals?.[0]?.title ||
          (incidents > 0 ? 'Baisse d’usage + tickets critiques' : 'Comité de pilotage contractuel');

        const renewalTimeline = isRenewalImminent ? 'Dans 45 jours' : 'Dans 90 jours';

        return {
          id: v.id || `acc-${index}`,
          name: v.account_name,
          priority,
          healthScore,
          trend,
          primarySignal,
          renewalTimeline,
          visitRef: v,
        };
      });
    }

    return DEFAULT_STRATEGIC_ACCOUNTS;
  }, [visits]);

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return accountsData;
    const q = searchQuery.toLowerCase();
    return accountsData.filter(
      (acc) =>
        acc.name.toLowerCase().includes(q) ||
        acc.primarySignal.toLowerCase().includes(q) ||
        acc.priority.toLowerCase().includes(q)
    );
  }, [accountsData, searchQuery]);

  const currentMilestones = milestonesState[activePeriod] || MILESTONES[activePeriod];
  const activeMilestone = currentMilestones[selectedMilestoneIndex] || currentMilestones[currentMilestones.length - 1] || currentMilestones[0];

  const chartSeries = useMemo(() => {
    if (activePeriod === '7d') {
      return {
        healthy: 'M 20 50 Q 150 45 300 48 T 580 42 T 780 40',
        surveillance: 'M 20 100 Q 160 105 320 98 T 580 102 T 780 96',
        atRisk: 'M 20 155 Q 160 150 320 152 T 580 148 T 780 144',
      };
    }
    if (activePeriod === '30d') {
      return {
        healthy: 'M 20 60 Q 180 50 360 55 T 600 45 T 780 38',
        surveillance: 'M 20 110 Q 180 115 360 105 T 600 112 T 780 100',
        atRisk: 'M 20 162 Q 180 158 360 160 T 600 152 T 780 148',
      };
    }
    return {
      healthy: 'M 20 70 Q 200 55 400 62 T 620 48 T 780 35',
      surveillance: 'M 20 120 Q 200 128 400 114 T 620 122 T 780 108',
      atRisk: 'M 20 170 Q 200 165 400 168 T 620 156 T 780 150',
    };
  }, [activePeriod]);

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 md:p-8 overflow-y-auto select-none bg-[#ECEAE5] dark:bg-[#242124]">
      {/* 1. Header Sobre et Épuré (barre de recherche unique déléguée au Header supérieur) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5 dark:border-white/5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            Portefeuille
          </h1>
        
        </div>
      </div>

      {/* 2. Disposition Asymétrique des Cartes Cliquables (redirection vers pages détails dédiées) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Grande Carte Principale à Gauche : Cliquable vers /kam/accounts/risk */}
        <div
          onClick={() => router.push('/kam/accounts/risk')}
          className="lg:col-span-7 bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5 flex flex-col justify-between cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
          title="Consulter le détail des comptes à risque élevé"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Comptes à risque élevé
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Voir les {summaryData.highRiskCount} comptes &rarr;
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-5xl font-black text-zinc-900 dark:text-white tracking-tight">
                {summaryData.highRiskCount}
              </span>
              <div className="w-36 h-10">
                <svg viewBox="0 0 140 40" className="w-full h-full text-zinc-900 dark:text-white" fill="none">
                  <path
                    d="M 2 30 Q 25 22 45 28 T 85 18 T 115 12 T 138 6"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <circle cx="138" cy="6" r="3" fill="currentColor" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
              {summaryData.highRiskDelta}
            </p>
          </div>

          <div className="mt-6 pt-5 border-t border-black/5 dark:border-white/5 grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                Comptes sains
              </span>
              <span className="text-2xl font-bold text-zinc-900 dark:text-white mt-1 block">
                {summaryData.healthyCount}
              </span>
            </div>
            <div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                Sous surveillance
              </span>
              <span className="text-2xl font-bold text-zinc-900 dark:text-white mt-1 block">
                {summaryData.surveillanceCount}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Cartes Empilées Verticalement à Droite : Cliquables vers pages détails */}
        <div className="lg:col-span-5 flex flex-col gap-3 justify-between">
          {/* Carte 1 -> /kam/accounts/renewals */}
          <div
            onClick={() => router.push('/kam/accounts/renewals')}
            className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[20px] p-4 border border-black/5 dark:border-white/5 flex flex-col justify-between h-full cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
            title="Consulter le détail des renouvellements à surveiller"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Renouvellements à surveiller
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {summaryData.renewalsSubtitle}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                {summaryData.renewalsCount}
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Voir &rarr;
              </span>
            </div>
          </div>

          {/* Carte 2 -> /kam/accounts/upsell */}
          <div
            onClick={() => router.push('/kam/accounts/upsell')}
            className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[20px] p-4 border border-black/5 dark:border-white/5 flex flex-col justify-between h-full cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
            title="Consulter le détail des opportunités d’upsell"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Opportunités d’upsell
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {summaryData.upsellSubtitle}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                {summaryData.upsellCount}
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Voir &rarr;
              </span>
            </div>
          </div>

          {/* Carte 3 -> /kam/accounts/no-action */}
          <div
            onClick={() => router.push('/kam/accounts/no-action')}
            className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[20px] p-4 border border-black/5 dark:border-white/5 flex flex-col justify-between h-full cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
            title="Consulter le détail des comptes sans prochaine action"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Sans prochaine action
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {summaryData.noActionSubtitle}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                {summaryData.noActionCount}
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Voir &rarr;
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Graphique Principal : Évolution de la santé du portefeuille (ZÉRO DÉGRADÉ & Consultation Réelle) */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
              Évolution de la santé du portefeuille
            </h2>
            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-[2px] bg-zinc-900 dark:bg-white inline-block" />
                <span>Sains</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-[2px] border-b-2 border-dashed border-zinc-500 dark:border-zinc-400 inline-block" />
                <span>Sous surveillance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-[2px] border-b-2 border-dotted border-zinc-400 dark:border-zinc-500 inline-block" />
                <span>À risque</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-full self-start sm:self-auto border-none">
            {(['7d', '30d', '90d'] as PeriodFilter[]).map((period) => (
              <button
                key={period}
                onClick={() => {
                  setActivePeriod(period);
                  setSelectedMilestoneIndex(3);
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border-none ${
                  activePeriod === period
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {period.replace('d', 'j')}
              </button>
            ))}
          </div>
        </div>

        {/* Tracé SVG Épuré et Net — Aucun Gradient */}
        <div className="w-full h-44 mt-2">
          <svg viewBox="0 0 800 200" className="w-full h-full overflow-visible" fill="none">
            {/* Lignes de repère horizontales discrètes */}
            <line x1="20" y1="40" x2="780" y2="40" stroke="currentColor" strokeDasharray="3 3" className="text-black/5 dark:text-white/5" />
            <line x1="20" y1="100" x2="780" y2="100" stroke="currentColor" strokeDasharray="3 3" className="text-black/5 dark:text-white/5" />
            <line x1="20" y1="160" x2="780" y2="160" stroke="currentColor" strokeDasharray="3 3" className="text-black/5 dark:text-white/5" />

            {/* Ligne 1 : Sains (Trait Continu) */}
            <path
              d={chartSeries.healthy}
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-900 dark:text-white"
            />

            {/* Ligne 2 : Sous surveillance (Trait Tireté) */}
            <path
              d={chartSeries.surveillance}
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="6 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-500 dark:text-zinc-400"
            />

            {/* Ligne 3 : À risque (Trait Pointillé) */}
            <path
              d={chartSeries.atRisk}
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="3 3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-400 dark:text-zinc-500"
            />
          </svg>
        </div>

        {/* Repères Temporels Cliquables pour Consulter les Vraies Données */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 px-1">
          {currentMilestones.map((m, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedMilestoneIndex(idx)}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer border-none ${
                selectedMilestoneIndex === idx
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold'
                  : 'hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Panneau de Consultation Réelle du Jalon Sélectionné */}
        <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-zinc-400 dark:text-zinc-500 block text-[10px]">Point de mesure</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{activeMilestone.label}</span>
            </div>
            <div>
              <span className="text-zinc-400 dark:text-zinc-500 block text-[10px]">Comptes Sains</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-white">{activeMilestone.healthy}</span>
            </div>
            <div>
              <span className="text-zinc-400 dark:text-zinc-500 block text-[10px]">Sous surveillance</span>
              <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{activeMilestone.surveillance}</span>
            </div>
            <div>
              <span className="text-zinc-400 dark:text-zinc-500 block text-[10px]">À risque élevé</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-white">{activeMilestone.atRisk}</span>
            </div>
            <div>
              <span className="text-zinc-400 dark:text-zinc-500 block text-[10px]">Taux de rétention</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-white">{activeMilestone.retentionRate}%</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 max-w-sm">
            Ce graphique retrace la trajectoire de santé de vos comptes pour anticiper le churn avant l’échéance contractuelle.
          </p>
        </div>
      </div>
      {/* 4. Tableau Compact des Comptes Nécessitant une Attention */}
      <div className="bg-[#F6F5F2] dark:bg-[#2D2A2D] rounded-[24px] p-6 border border-black/5 dark:border-white/5">
       
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                <th className="pb-3 font-semibold">Compte</th>
                <th className="pb-3 font-semibold">Priorité</th>
                <th className="pb-3 font-semibold">Santé</th>
                <th className="pb-3 font-semibold">Tendance</th>
                <th className="pb-3 font-semibold">Signal principal</th>
                <th className="pb-3 font-semibold">Renouvellement</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((acc) => (
                <tr
                  key={acc.id}
                  onClick={() => onSelectAccount(acc.visitRef)}
                  className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <td className="py-3.5 text-xs font-semibold text-zinc-900 dark:text-white pr-4">
                    {acc.name}
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium border-0 bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
                      {acc.priority}
                    </span>
                  </td>
                  <td className="py-3.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium pr-4">
                    {acc.healthScore}/100
                  </td>
                  <td className="py-3.5 text-xs text-zinc-700 dark:text-zinc-300 font-mono pr-4">
                    {acc.trend}
                  </td>
                  <td className="py-3.5 text-xs text-zinc-600 dark:text-zinc-400 pr-4">
                    {acc.primarySignal}
                  </td>
                  <td className="py-3.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {acc.renewalTimeline}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
