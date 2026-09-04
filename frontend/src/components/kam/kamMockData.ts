import { StrategicVisit, MeetingDebrief } from './kamTypes';

export const mockStrategicVisits: StrategicVisit[] = [
  {
    id: 'visit-sgb-01',
    account_id: 'acc-sgb-ci',
    account_name: 'Société Générale de Banque (SGB)',
    meeting_title: 'Revue Stratégique C-Level — Direction Générale & DSI',
    meeting_time: '15:30',
    meeting_date: '2026-09-02',
    duration_minutes: 60,
    location: 'Siège SGB, Plateau — Salle Conseil 8e étage',
    dot_color: 'green',
    status_label: 'Briefing Validé & Prêt',
    is_prepared: true,
    preparation_time_minutes: 8,
    golden_rule: 'Ne pas aborder l\'offre SD-WAN avant d\'avoir rassuré sur l\'incident fibre Marcory résolu vendredi.',
    briefing: {
      account_id: 'acc-sgb-ci',
      account_name: 'Société Générale de Banque (SGB)',
      industry: 'Banque & Services Financiers',
      growth_stage: 'CONGLOMERATE',
      firmographics: {
        headcount: 3200,
        estimated_annual_revenue: '185 M€',
        locations_count: 54,
        countries: ['Côte d\'Ivoire', 'Sénégal', 'Burkina Faso', 'Ghana'],
        business_model_summary: 'Leader de la banque de détail et d\'affaires en Afrique de l\'Ouest, en pleine transition vers le cloud hybride et l\'agence bancaire 100% digitale.'
      },
      orange_relationship: {
        client_status: 'PARTIAL_CLIENT',
        wallet_share_percentage: 38,
        mrr_current: 42500,
        total_telecom_cloud_budget: 112000,
        active_contracts: [
          { service_name: 'Liaisons Louées Fibre MPLS Siège + 30 Agences', end_date: '2026-11-30', is_renewal_imminent: true, sla_status: 'WARNING', monthly_value: 28000 },
          { service_name: 'Flotte Mobile Postpayée 850 Lignes', end_date: '2027-04-15', is_renewal_imminent: false, sla_status: 'HEALTHY', monthly_value: 9500 },
          { service_name: 'Backup Faisceau Hertzien Datacenter', end_date: '2026-12-31', is_renewal_imminent: true, sla_status: 'HEALTHY', monthly_value: 5000 }
        ],
        recent_incidents_count_30d: 1,
        critical_incidents_summary: 'Coupure réseau de 42 min sur l\'agence Marcory le 28/08 (coupure génie civil tiers). Rétablissement automatique du backup sans perte de données transactionnelles.',
        last_interactions_summary: [
          '28/08: Point crise téléphonique suite à l\'incident Marcory avec M. Kouassi (DSI)',
          '15/08: Déjeuner d\'affaires avec Mme Bamba (Directrice de la Transformation)',
          '22/07: Comité de pilotage trimestriel SLA (Disponibilité globale: 99.82%)'
        ],
        open_commitments: [
          { id: 'com-1', action: 'Transmettre le rapport d\'analyse REX de l\'incident Marcory', owner: 'Salem (KAM)', due_date: '2026-09-02', status: 'DONE' },
          { id: 'com-2', action: 'Présenter la matrice d\'architecture SD-WAN Sovereign & chiffrement bancaire', owner: 'Ingénieur Avant-Vente Orange', due_date: '2026-09-05', status: 'IN_PROGRESS' },
          { id: 'com-3', action: 'Auditer l\'éligibilité fibre des 12 nouvelles agences régionales', owner: 'Équipe Déploiement Fibre', due_date: '2026-09-12', status: 'PENDING' }
        ]
      },
      stakeholders_mapping: [
        {
          id: 'stk-1',
          full_name: 'Jean-Marc Kouassi',
          job_title: 'Directeur des Systèmes d\'Information (DSI)',
          role_in_decision: 'CHAMPION',
          influence_level: 'HIGH',
          stance_towards_orange: 'POSITIVE',
          last_contacted_date: '2026-08-28',
          last_contacted_by: 'Salem (KAM)',
          key_notes: 'Favorable à Orange Business. Cherche à moderniser son WAN vers le SD-WAN et externaliser une partie du PRA dans un datacenter certifié Tier III.'
        },
        {
          id: 'stk-2',
          full_name: 'Aïssata Bamba',
          job_title: 'Directrice de la Transformation Digitale & Expérience Client',
          role_in_decision: 'INFLUENCER',
          influence_level: 'HIGH',
          stance_towards_orange: 'POSITIVE',
          last_contacted_date: '2026-08-15',
          last_contacted_by: 'Salem (KAM)',
          key_notes: 'Pilote le plan "Banque Mobile 2028". A besoin d\'une connectivité temps réel ultra-stable pour l\'app mobile et les guichets automatiques.'
        },
        {
          id: 'stk-3',
          full_name: 'Marc-André Dupont',
          job_title: 'Directeur Général Adjoint & DAF',
          role_in_decision: 'ECONOMIC_BUYER',
          influence_level: 'HIGH',
          stance_towards_orange: 'NEUTRAL',
          last_contacted_date: '2026-06-10',
          last_contacted_by: 'Salem (KAM)',
          key_notes: 'Sensible au TCO global sur 3 ans et aux pénalités SLA. Compare systématiquement Orange avec MTN Business.'
        },
        {
          id: 'stk-4',
          full_name: 'Yao N\'Guessan',
          job_title: 'Responsable Sécurité des SI (RSSI)',
          role_in_decision: 'TECHNICAL_BUYER',
          influence_level: 'HIGH',
          stance_towards_orange: 'NEUTRAL',
          last_contacted_date: '2026-07-22',
          last_contacted_by: 'Expert Cyber Orange',
          key_notes: 'Exige une stricte conformité réglementaire BCEAO et une étanchéité totale du trafic financier interbancaire.'
        }
      ],
      missing_stakeholders_alert: [
        '⚠️ Aucun contact formellement identifié à la Direction des Achats & Marchés.',
        '⚠️ Le Responsable des Infrastructures Télécoms n\'a pas participé aux 2 derniers comités.'
      ],
      trigger_signals: [
        {
          id: 'sig-1',
          category: 'EXPANSION',
          title: 'Ouverture de 12 nouvelles agences et 40 guichets d\'ici Q1 2027',
          description: 'Communiqué de presse officiel confirmant l\'expansion territoriale en zones semi-urbaines.',
          source: 'Rapport Financier Semestriel',
          date: '2026-08-20',
          is_urgent: true
        },
        {
          id: 'sig-2',
          category: 'HIRING_SPIKE',
          title: 'Offre d\'emploi: "Chef de Projet SD-WAN & Cloud Hybride"',
          description: 'Recrutement clé détecté sur LinkedIn confirmant l\'intention de migration d\'architecture réseau.',
          source: 'LinkedIn Talent Insights',
          date: '2026-08-25',
          is_urgent: true
        },
        {
          id: 'sig-3',
          category: 'REGULATORY',
          title: 'Nouvelle directive BCEAO sur la résilience opérationnelle numérique',
          description: 'Obligation de double adduction télécom indépendante et plan de reprise d\'activité testé trimestriellement.',
          source: 'Journal Officiel BCEAO',
          date: '2026-07-15'
        }
      ],
      technical_environment: {
        current_competitors: ['MTN Business (Connectivité backup sur 24 agences)', 'Cisco Systems (Matériel réseau existant)', 'Microsoft Azure (Cloud international)'],
        installed_cloud_telecom_stack: ['Orange MPLS Fibre', 'Cisco Catalyst Routers', 'Fortinet FortiGate Firewalls', 'VMware On-Premise'],
        known_constraints: ['Contraintes strictes de souveraineté des données financières (aucun transit hors UEMOA)', 'Fenêtre de maintenance limitée au dimanche 02h-05h'],
        cybersecurity_compliance_needs: ['Conformité BCEAO / PCI-DSS v4.0', 'Supervision SOC 24/7 avec escalade 15 min']
      },
      ai_hypotheses_and_playbook: {
        pain_hypotheses: [
          {
            hypothesis: 'Coût et rigidité élevés du réseau MPLS historique pour absorber les 12 nouvelles agences',
            trigger_evidence: 'Offre d\'emploi récente "Chef de projet SD-WAN" + 12 nouvelles agences programmées.',
            discovery_angle: '"Comment envisagez-vous l\'interconnexion sécurisée de vos 12 futures agences sans faire exploser le budget bande passante ?"'
          },
          {
            hypothesis: 'Risque de non-conformité avec la nouvelle directive BCEAO sur le double PRA télécom',
            trigger_evidence: 'Circulaire BCEAO de juillet 2026 imposant une redondance physique 100% étanche.',
            discovery_angle: '"Quelle est votre stratégie pour certifier votre plan de continuité d\'activité auprès des auditeurs de la commission bancaire ?"'
          }
        ],
        orange_opportunities: [
          {
            solution_category: 'SD-WAN Flexible & Cloud Connect Orange',
            value_proposition: 'Bascule progressive du MPLS vers un SD-WAN hybride souverain, sécurisé par Orange Cyberdefense, réduisant de 25% le coût au Mbit/s tout en doublant le débit des agences.',
            potential_mrr: 24000
          },
          {
            solution_category: 'Hébergement Datacenter Tier III & Cloud Souverain',
            value_proposition: 'Externalisation du second datacenter de secours dans le Datacenter Orange certifié Tier III d\'Abidjan Village.',
            potential_mrr: 15000
          }
        ]
      },
      visit_strategy: {
        primary_objective: 'Obtenir l\'accord de principe pour lancer un PoC (Proof of Concept) SD-WAN sur 3 agences pilotes et positionner Orange sur les 12 nouvelles agences.',
        ideal_outcome: 'Signature d\'une convention de test PoC pour octobre 2026 et fixation d\'une réunion de cadrage technique avec le RSSI et les Achats.',
        suggested_agenda: [
          '00-05 min : REX incident Marcory et remise du rapport d\'assurance qualité (Désamorçage)',
          '05-20 min : Vision stratégique SGB & Enjeux des 12 nouvelles agences (Écoute active)',
          '20-35 min : Présentation de l\'architecture SD-WAN Souverain & Réponse aux normes BCEAO',
          '35-45 min : Modalités du PoC 3 agences & Définition du calendrier de décision'
        ],
        traps_to_avoid: [
          'Ne pas commencer par pitcher les nouvelles offres avant d\'avoir remis le REX de l\'incident Marcory.',
          'Ne pas critiquer MTN Business qui a la faveur du DAF sur les prix : valoriser plutôt la sécurité et le SLA Orange.',
          'Ne pas oublier d\'aborder la question du sponsor aux Achats pour éviter le blocage administratif.'
        ]
      }
    }
  },
  {
    id: 'visit-ecobank-02',
    account_id: 'acc-ecobank-ci',
    account_name: 'Ecobank Côte d\'Ivoire',
    meeting_title: 'Comité Exécutif — Renouvellement Contrat Cadre Cloud & Cyber',
    meeting_time: '11:00',
    meeting_date: '2026-09-02',
    duration_minutes: 45,
    location: 'Immeuble Ecobank, Avenue Delafosse, Plateau',
    dot_color: 'blue',
    status_label: 'Rendez-vous Confirmé',
    is_prepared: true,
    preparation_time_minutes: 12,
    golden_rule: 'Mettre l\'accent sur le SOC Managé 24/7 et la souveraineté locale des données.',
    briefing: {
      account_id: 'acc-ecobank-ci',
      account_name: 'Ecobank Côte d\'Ivoire',
      industry: 'Banque & Fintech',
      growth_stage: 'MATURE',
      firmographics: {
        headcount: 2100,
        estimated_annual_revenue: '140 M€',
        locations_count: 42,
        countries: ['Côte d\'Ivoire', 'UEMOA'],
        business_model_summary: 'Groupe bancaire panafricain pionnier du paiement digital et de la monétique inter-pays.'
      },
      orange_relationship: {
        client_status: 'MULTI_PRODUCT_CLIENT',
        wallet_share_percentage: 62,
        mrr_current: 68000,
        total_telecom_cloud_budget: 110000,
        active_contracts: [
          { service_name: 'Interconnexion SD-WAN 42 Agences', end_date: '2027-08-30', is_renewal_imminent: false, sla_status: 'HEALTHY', monthly_value: 45000 },
          { service_name: 'Liaison Directe IP Transit Datacenter 10 Gbps', end_date: '2026-10-15', is_renewal_imminent: true, sla_status: 'HEALTHY', monthly_value: 23000 }
        ],
        recent_incidents_count_30d: 0,
        critical_incidents_summary: 'Aucun incident critique dans les 60 derniers jours. SLA respecté à 99.99%.',
        last_interactions_summary: [
          '18/08: Atelier cybersécurité avec le RSSI régional',
          '02/08: Point d\'étape facturation semestrielle'
        ],
        open_commitments: [
          { id: 'com-eco-1', action: 'Fournir la proposition commerciale d\'extension bande passante IP Transit', owner: 'Salem (KAM)', due_date: '2026-09-02', status: 'DONE' }
        ]
      },
      stakeholders_mapping: [
        {
          id: 'stk-eco-1',
          full_name: 'Koffi Emmanuel',
          job_title: 'Directeur Général Ecobank CI',
          role_in_decision: 'ECONOMIC_BUYER',
          influence_level: 'HIGH',
          stance_towards_orange: 'POSITIVE',
          last_contacted_date: '2026-06-15',
          last_contacted_by: 'Directeur B2B Orange',
          key_notes: 'Très satisfait de la qualité de service Orange. Cherche à accélérer sur les API bancaires ouvertes.'
        }
      ],
      missing_stakeholders_alert: [
        '⚠️ Le Responsable Cybersécurité n\'a pas encore validé l\'annexe technique du SOC.'
      ],
      trigger_signals: [
        {
          id: 'sig-eco-1',
          category: 'EXECUTIVE_MOVE',
          title: 'Nomination d\'un nouveau Directeur des Risques & Conformité',
          description: 'Arrivée de M. Touré (ex-Standard Chartered), réputé très strict sur la sécurité cloud.',
          source: 'Communiqué de Presse Groupe',
          date: '2026-08-10',
          is_urgent: false
        }
      ],
      technical_environment: {
        current_competitors: ['MainOne (IP Transit alternatif)', 'AWS (Cloud hébergement appli mobile)'],
        installed_cloud_telecom_stack: ['Orange SD-WAN', 'Orange Cyberdefense SIEM', 'Cisco Nexus Datacenter'],
        known_constraints: ['Trafic bancaire crypté de bout en bout'],
        cybersecurity_compliance_needs: ['SOC 2 Type II', 'ISO 27001']
      },
      ai_hypotheses_and_playbook: {
        pain_hypotheses: [
          {
            hypothesis: 'Besoin d\'un SOC 24/7 unifié face à la hausse des attaques phishing et ransomware ciblant les banques.',
            trigger_evidence: 'Nomination du nouveau Directeur des Risques + directive cyber UEMOA.',
            discovery_angle: '"Comment votre équipe gère-t-elle la détection des menaces le week-end et la nuit ?"'
          }
        ],
        orange_opportunities: [
          {
            solution_category: 'SOC Managé Orange Cyberdefense & MDR',
            value_proposition: 'Supervision 24/7 de l\'ensemble des postes et serveurs de la banque avec réponse à incident en moins de 15 minutes.',
            potential_mrr: 18500
          }
        ]
      },
      visit_strategy: {
        primary_objective: 'Faire signer l\'avenant de renouvellement IP Transit 10G et positionner l\'offre SOC Managé.',
        ideal_outcome: 'Accord de principe sur le contrat pluriannuel 3 ans.',
        suggested_agenda: [
          '00-10 min : Bilan de performance irréprochable (SLA 99.99%)',
          '10-25 min : Signature de l\'avenant IP Transit',
          '25-45 min : Démonstration du dashboard SOC Cyberdefense'
        ],
        traps_to_avoid: [
          'Ne pas laisser penser que le SOC remplace leur équipe interne mais qu\'il vient en renfort 24/7.'
        ]
      }
    }
  },
  {
    id: 'visit-ministere-03',
    account_id: 'acc-min-num',
    account_name: 'Ministère de la Transition Numérique & Digitalisation',
    meeting_title: 'Cadrage Projet Réseau National Haut Débit & e-Gouvernement',
    meeting_time: '17:00',
    meeting_date: '2026-09-02',
    duration_minutes: 60,
    location: 'Tour C, Cité Administrative, 19e étage',
    dot_color: 'orange',
    status_label: 'Opportunité Appel d\'Offres',
    is_prepared: true,
    preparation_time_minutes: 6,
    golden_rule: 'Positionner Orange comme le partenaire souverain de référence de l\'État.',
    briefing: {
      account_id: 'acc-min-num',
      account_name: 'Ministère de la Transition Numérique & Digitalisation',
      industry: 'Secteur Public & Gouvernement',
      growth_stage: 'MATURE',
      firmographics: {
        headcount: 15000,
        estimated_annual_revenue: 'Budget 45 M€',
        locations_count: 120,
        countries: ['Côte d\'Ivoire'],
        business_model_summary: 'Ministère en charge du déploiement des infrastructures numériques et de la numérisation des services publics pour les citoyens.'
      },
      orange_relationship: {
        client_status: 'PARTIAL_CLIENT',
        wallet_share_percentage: 45,
        mrr_current: 55000,
        total_telecom_cloud_budget: 125000,
        active_contracts: [
          { service_name: 'Réseau Interministériel Fibre (RNID)', end_date: '2027-01-31', is_renewal_imminent: false, sla_status: 'HEALTHY', monthly_value: 40000 },
          { service_name: 'Flotte Mobile Fonctionnaires', end_date: '2026-10-31', is_renewal_imminent: true, sla_status: 'WARNING', monthly_value: 15000 }
        ],
        recent_incidents_count_30d: 0,
        critical_incidents_summary: 'Service stable. Retard administratif de paiement factures de 45 jours (habituel secteur public).',
        last_interactions_summary: [
          '20/08: Participation au groupe de travail e-Santé',
          '10/08: Entretien protocolaire avec le Directeur de Cabinet'
        ],
        open_commitments: [
          { id: 'com-min-1', action: 'Transmettre le livre blanc Orange sur la souveraineté cloud des données publiques', owner: 'Salem (KAM)', due_date: '2026-09-02', status: 'DONE' }
        ]
      },
      stakeholders_mapping: [
        {
          id: 'stk-min-1',
          full_name: 'Dr. Amadou Sanogo',
          job_title: 'Directeur de Cabinet',
          role_in_decision: 'ECONOMIC_BUYER',
          influence_level: 'HIGH',
          stance_towards_orange: 'POSITIVE',
          last_contacted_date: '2026-08-10',
          last_contacted_by: 'Salem (KAM)',
          key_notes: 'Fervent défenseur de l\'hébergement souverain local des données biométriques et citoyennes.'
        }
      ],
      missing_stakeholders_alert: [
        '⚠️ Le Directeur des Marchés Publics doit être intégré à la prochaine séance.'
      ],
      trigger_signals: [
        {
          id: 'sig-min-1',
          category: 'RFP_TENDER',
          title: 'Publication imminente de l\'appel d\'offres "Cloud Souverain National"',
          description: 'Financement Banque Mondiale de 12 millions $ pour héberger les 32 ministères en local.',
          source: 'Bulletin Officiel des Marchés Publics',
          date: '2026-08-28',
          is_urgent: true
        }
      ],
      technical_environment: {
        current_competitors: ['Huawei (Fournisseur matériel existant)', 'Moov Africa (Concurrent connectivité)'],
        installed_cloud_telecom_stack: ['Fibre Orange', 'Serveurs Huawei', 'Microsoft 365 Gouvernement'],
        known_constraints: ['Délais d\'engagement budgétaire de l\'État', 'Exigence absolue de résidence des données en CI'],
        cybersecurity_compliance_needs: ['Certification Sécurité Nationale ANSSI / ARTCI']
      },
      ai_hypotheses_and_playbook: {
        pain_hypotheses: [
          {
            hypothesis: 'L\'État veut éviter la dépendance aux hyperscalers américains tout en ayant un niveau de service mondial.',
            trigger_evidence: 'Appel d\'offres Cloud Souverain financé par les bailleurs internationaux.',
            discovery_angle: '"Comment sécurisez-vous la conformité et la souveraineté des données citoyennes face aux exigences internationales ?"'
          }
        ],
        orange_opportunities: [
          {
            solution_category: 'Cloud Souverain Orange & Datacenter National',
            value_proposition: 'Infrastructure IaaS/PaaS hébergée dans les datacenters Orange en Côte d\'Ivoire avec gouvernance 100% ivoirienne.',
            potential_mrr: 45000
          }
        ]
      },
      visit_strategy: {
        primary_objective: 'Influencer la rédaction des critères techniques de l\'appel d\'offres pour valoriser les datacenters Tier III locaux Orange.',
        ideal_outcome: 'Intégration des standards Orange dans le cahier des charges officiel.',
        suggested_agenda: [
          '00-15 min : Présentation des retours d\'expérience Cloud Souverain dans les pays pairs',
          '15-40 min : Échange sur les critères de résilience et de souveraineté',
          '40-60 min : Proposition de visite officielle du Datacenter Orange pour la délégation ministérielle'
        ],
        traps_to_avoid: [
          'Éviter toute prise de position politique : rester strictement sur l\'expertise technologique et la conformité.'
        ]
      }
    }
  },
  {
    id: 'visit-sitarail-04',
    account_id: 'acc-sitarail',
    account_name: 'SITARAIL (Groupe Bolloré / MSC)',
    meeting_title: 'Revue Trimestrielle — IoT & Connectivité Lignes Ferroviaires',
    meeting_time: '09:30',
    meeting_date: '2026-09-03',
    duration_minutes: 45,
    location: 'Gare de Treichville, Direction Générale',
    dot_color: 'red',
    status_label: 'Incident & Risque Churn',
    is_prepared: false,
    preparation_time_minutes: 0,
    golden_rule: 'Régler impérativement le litige de coupure sur le tronçon Bouaké-Ferké avant toute autre discussion.',
    briefing: {
      account_id: 'acc-sitarail',
      account_name: 'SITARAIL (Groupe Bolloré / MSC)',
      industry: 'Transport & Logistique',
      growth_stage: 'MATURE',
      firmographics: {
        headcount: 1800,
        estimated_annual_revenue: '95 M€',
        locations_count: 28,
        countries: ['Côte d\'Ivoire', 'Burkina Faso'],
        business_model_summary: 'Concessionnaire exclusif de la ligne ferroviaire Abidjan-Ouagadougou (1260 km), artère vitale du fret ouest-africain.'
      },
      orange_relationship: {
        client_status: 'CHURN_RISK',
        wallet_share_percentage: 25,
        mrr_current: 21000,
        total_telecom_cloud_budget: 84000,
        active_contracts: [
          { service_name: 'Liaisons Satellite & Fibre Gares Principales', end_date: '2026-10-31', is_renewal_imminent: true, sla_status: 'BREACHED', monthly_value: 21000 }
        ],
        recent_incidents_count_30d: 3,
        critical_incidents_summary: '3 ruptures de liaison satellite/4G sur les postes d\'aiguillage nord dans les 30 derniers jours.',
        last_interactions_summary: [
          '26/08: Appel très tendu avec le Directeur d\'Exploitation Ferroviaire'
        ],
        open_commitments: [
          { id: 'com-sit-1', action: 'Déployer des routeurs 4G/5G durcis avec double SIM Orange/Starlink', owner: 'Responsable Technique Orange', due_date: '2026-09-03', status: 'OVERDUE' }
        ]
      },
      stakeholders_mapping: [
        {
          id: 'stk-sit-1',
          full_name: 'Gérard Vasseur',
          job_title: 'Directeur des Opérations & Sécurité Ferroviaire',
          role_in_decision: 'BLOCKER',
          influence_level: 'HIGH',
          stance_towards_orange: 'NEGATIVE',
          last_contacted_date: '2026-08-26',
          last_contacted_by: 'Salem (KAM)',
          key_notes: 'Excédé par les coupures de signalisation. Menace de migrer 100% de la flotte vers Starlink et MTN.'
        }
      ],
      missing_stakeholders_alert: [
        '⚠️ Rétablir d\'urgence le lien avec le DSI Groupe basé à Paris.'
      ],
      trigger_signals: [
        {
          id: 'sig-sit-1',
          category: 'REGULATORY',
          title: 'Audit de sécurité des transports après ralentissements techniques',
          description: 'L\'autorité de régulation impose un taux de disponibilité de télécommunication ferroviaire de 99.95%.',
          source: 'Autorité de Régulation du Rail',
          date: '2026-08-15',
          is_urgent: true
        }
      ],
      technical_environment: {
        current_competitors: ['Starlink Business (En test actif sur 5 gares)', 'MTN Business'],
        installed_cloud_telecom_stack: ['Liaisons VSAT Orange', 'Cisco Durci', 'Radio VHF privée'],
        known_constraints: ['Zones blanches sans couverture réseau terrestre sur 350 km'],
        cybersecurity_compliance_needs: ['Sécurité des systèmes industriels SCADA']
      },
      ai_hypotheses_and_playbook: {
        pain_hypotheses: [
          {
            hypothesis: 'L\'indisponibilité réseau bloque le départ des trains de fret et génère des pénalités financières lourdes.',
            trigger_evidence: '3 incidents majeurs récents + menace de passage à la concurrence.',
            discovery_angle: '"Quel est le coût financier direct d\'une heure de blocage d\'un train de fret sur l\'axe nord ?"'
          }
        ],
        orange_opportunities: [
          {
            solution_category: 'Solution Hybride Terre/Satellite Orange & Eutelsat/OneWeb',
            value_proposition: 'Réseau redondé automatique 4G/5G industrielle + Satellite LEO pour une disponibilité garantie de 99.98% sans coupure.',
            potential_mrr: 32000
          }
        ]
      },
      visit_strategy: {
        primary_objective: 'Désamorcer la crise opérationnelle, présenter le plan d\'urgence de stabilisation et éviter la résiliation.',
        ideal_outcome: 'Engagement mutuel sur un plan de progrès à 30 jours avec geste commercial compensatoire.',
        suggested_agenda: [
          '00-20 min : Écoute intégrale des griefs sans justification défensive',
          '20-35 min : Présentation des mesures correctives immédiates (Remplacement matériel durci sous 48h)',
          '35-45 min : Proposition d\'une liaison de secours offerte pendant la période de test'
        ],
        traps_to_avoid: [
          'Interdiction absolue de minimiser l\'impact opérationnel des coupures.',
          'Ne pas faire de promesse technique sans l\'aval écrit préalable de la direction des opérations réseau.'
        ]
      }
    }
  }
];

export const mockDebriefs: Record<string, MeetingDebrief> = {
  'visit-sgb-01': {
    visit_id: 'visit-sgb-01',
    account_name: 'Société Générale de Banque (SGB)',
    date: '2026-09-02 16:35',
    audio_duration_seconds: 145,
    transcript_text: '« Réunion très productive avec M. Kouassi et Mme Bamba. Le désamorçage sur Marcory a parfaitement fonctionné grâce au rapport d\'incident REX remis en ouverture. Ils sont extrêmement emballés par la démo SD-WAN hybride. Le DSI a validé le principe du PoC sur 3 agences dès le 15 octobre. M. Dupont le DAF était plus réservé sur les coûts de raccordement des 12 nouvelles agences régionales mais Mme Bamba a soutenu notre proposition en insistant sur la valeur client. Prochaine étape : nous devons leur transmettre la proposition financière chiffrée avec engagement SLA 99.95% d\'ici vendredi 17h, et caler un point avec le RSSI Yao N\'Guessan mardi prochain. »',
    executive_summary: 'Validation du PoC SD-WAN sur 3 agences cibles pour le 15/10/2026. Fort sponsoring interne du DSI (Champion) et de la Directrice de la Transformation. Accord pour cadrer les 12 futures agences régionales. Potentiel de capture de 35k€/mois de MRR additionnel.',
    client_followup_email: {
      subject: 'Synthèse de notre échange & Cadrage du PoC SD-WAN — Société Générale de Banque / Orange Business',
      body: `Bonjour M. Kouassi, Mme Bamba,\n\nJe vous remercie chaleureusement pour la qualité de nos échanges de ce jour au siège de la Société Générale de Banque.\n\nComme convenu lors de notre séance de travail :\n1. Nous confirmons le lancement du PoC (Proof of Concept) SD-WAN Souverain sur vos 3 agences pilotes (Plateau Central, Zone 4, et Cocody Vallon) à compter du 15 octobre 2026.\n2. Notre équipe Avant-Vente finalise le dossier d'éligibilité et le chiffrage optimisé TCO pour l'interconnexion de vos 12 futures agences régionales, que nous vous remettrons ce vendredi 5 septembre avant 17h00.\n3. Un atelier technique dédié à la conformité BCEAO & Chiffrement de bout en bout sera tenu avec M. Yao N'Guessan mardi 8 septembre à 10h00.\n\nRestant à votre entière disposition pour accélérer ce jalon stratégique,\n\nBien cordialement,\n\nSalem — Directeur des Comptes Stratégiques\nOrange Business`
    },
    commitments_extracted: [
      { id: 'deb-1', action: 'Transmettre la proposition commerciale et chiffrage TCO PoC SD-WAN', owner: 'Salem (KAM)', due_date: '2026-09-05', status: 'IN_PROGRESS' },
      { id: 'deb-2', action: 'Organiser l\'atelier technique de cadrage sécurité avec le RSSI', owner: 'Salem (KAM)', due_date: '2026-09-08', status: 'PENDING' },
      { id: 'deb-3', action: 'Valider les 3 sites pilotes avec l\'équipe logistique SGB', owner: 'Jean-Marc Kouassi (DSI SGB)', due_date: '2026-09-15', status: 'PENDING' }
    ],
    risk_level: 'LOW',
    next_step_recommendation: 'Envoyer l\'email de synthèse sous 2 heures et préparer le chiffrage avec l\'ingénieur avant-vente.'
  }
};
