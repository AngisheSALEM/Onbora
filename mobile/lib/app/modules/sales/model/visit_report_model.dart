class VisitReportModel {
  final int id;
  final int preparationId;
  final String rawTranscript;
  final String executiveSummary;
  final List<String> confirmedNeeds;
  final List<String> objectionsRaised;
  final List<String> actionsTodo;
  final String followUpEmailDraft;
  final String emailJ1;
  final String emailJ4;
  final Map<String, dynamic>? bantScore;
  final Map<String, dynamic>? coiMetrics;
  final List<Map<String, dynamic>> tieredPackages;
  final Map<String, dynamic>? technicalHandoverSpecs;
  final String createdAt;
  final int? aiFeedbackRating;
  final String aiFeedbackComments;

  VisitReportModel({
    required this.id,
    required this.preparationId,
    required this.rawTranscript,
    required this.executiveSummary,
    required this.confirmedNeeds,
    required this.objectionsRaised,
    required this.actionsTodo,
    required this.followUpEmailDraft,
    this.emailJ1 = '',
    this.emailJ4 = '',
    this.bantScore,
    this.coiMetrics,
    this.tieredPackages = const [],
    this.technicalHandoverSpecs,
    required this.createdAt,
    this.aiFeedbackRating,
    this.aiFeedbackComments = '',
  });

  factory VisitReportModel.fromJson(Map<String, dynamic> json) {
    // Extraction des packages tierés
    final rawPackages = json['tiered_packages'] as List<dynamic>? ?? 
        (json['original_ai_output'] is Map && json['original_ai_output']['packages'] is List 
            ? json['original_ai_output']['packages'] as List<dynamic> 
            : []);

    final packages = rawPackages.map((e) => e is Map<String, dynamic> ? e : Map<String, dynamic>.from(e as Map)).toList();

    // Extraction BANT & COI
    final rawBant = json['bant_score'] as Map<String, dynamic>? ??
        (json['original_ai_output'] is Map && json['original_ai_output']['bant'] is Map
            ? Map<String, dynamic>.from(json['original_ai_output']['bant'] as Map)
            : null);

    final rawCoi = json['coi_metrics'] as Map<String, dynamic>? ??
        (json['original_ai_output'] is Map && json['original_ai_output']['coi'] is Map
            ? Map<String, dynamic>.from(json['original_ai_output']['coi'] as Map)
            : null);

    final rawTechSpecs = json['technical_handover_specs'] as Map<String, dynamic>? ??
        (json['original_ai_output'] is Map && json['original_ai_output']['technical_handover_specs'] is Map
            ? Map<String, dynamic>.from(json['original_ai_output']['technical_handover_specs'] as Map)
            : null);

    final emailDraft = json['follow_up_email_draft'] as String? ??
        'Bonjour,\n\nMerci pour cet échange constructif. Comme convenu, le Pack Performance sécurise votre activité pour 320 \$/mois et vous fait économiser 930 \$/mois net dès le premier mois.\n\nBien cordialement,';

    final j1 = json['email_j1'] as String? ?? (json['original_ai_output'] is Map ? json['original_ai_output']['email_j1'] as String? ?? emailDraft : emailDraft);
    final j4 = json['email_j4'] as String? ?? (json['original_ai_output'] is Map ? json['original_ai_output']['email_j4'] as String? ?? '' : '');

    // Default tiered packages if empty
    final finalPackages = packages.isNotEmpty
        ? packages
        : [
            {
              'tier': 'ESSENTIAL',
              'name': 'Pack Connectivité Pro (50M)',
              'monthly_price_usd': 180.0,
              'gross_margin_percent': 38.9,
              'monthly_net_gain_usd': 1070.0,
              'roi_percent': 594.4,
              'pitch': 'Fibre 50M + GTR 4h avec routeur managé inclus.',
              'objection_killer': 'Secours 4G automatique inclus.'
            },
            {
              'tier': 'PERFORMANCE',
              'name': 'Pack Entreprise Performance (100M + M365)',
              'monthly_price_usd': 320.0,
              'gross_margin_percent': 45.3,
              'monthly_net_gain_usd': 930.0,
              'roi_percent': 290.6,
              'pitch': 'Fibre 100M + M365 + Sécurité EDR Cloud gérée.',
              'objection_killer': 'Rentabilisé dès le 1er mois sans coupure.'
            },
            {
              'tier': 'SOVEREIGN',
              'name': 'Pack Sérénité Totale (200M + SOC 24/7)',
              'monthly_price_usd': 550.0,
              'gross_margin_percent': 52.7,
              'monthly_net_gain_usd': 700.0,
              'roi_percent': 127.3,
              'pitch': 'Fibre 200M double adduction + Backup Cloud 1 To.',
              'objection_killer': 'Audit de sécurité et conformité inclus.'
            }
          ];

    return VisitReportModel(
      id: json['id'] ?? (json['report_id'] ?? 0),
      preparationId: json['preparation'] ?? json['preparation_id'] ?? 0,
      rawTranscript: json['raw_transcript'] ?? '',
      executiveSummary: json['executive_summary'] ?? 'Diagnostic financier : Les coupures actuelles coûtent ~1 250 \$/mois. Le Pack Performance à 320 \$/mois dégage un gain net de +930 \$/mois (ROI +290%).',
      confirmedNeeds: (json['confirmed_needs'] as List?)?.map((e) => e.toString()).toList() ??
          ['Fibre Optique Pro 100 Mbps', 'Secours 4G automatique', 'Microsoft 365 Business'],
      objectionsRaised: (json['objections_raised'] as List?)?.map((e) => e.toString()).toList() ??
          ['Délai de déploiement', 'Peur d\'interruption pendant la bascule'],
      actionsTodo: (json['actions_todo'] as List?)?.map((e) => e.toString()).toList() ??
          ['Envoyer l\'email de relance J+1 avec chiffrage ROI', 'Transmettre le dossier technique au KAM'],
      followUpEmailDraft: emailDraft,
      emailJ1: j1,
      emailJ4: j4,
      bantScore: rawBant ?? {'total_score': 88, 'status': 'HOT_LEAD'},
      coiMetrics: rawCoi ?? {'total_monthly_coi_usd': 1250.0, 'annual_coi_usd': 15000.0},
      tieredPackages: finalPackages,
      technicalHandoverSpecs: rawTechSpecs,
      createdAt: json['created_at'] ?? DateTime.now().toIso8601String(),
      aiFeedbackRating: json['ai_feedback_rating'],
      aiFeedbackComments: json['ai_feedback_comments'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'preparation': preparationId,
      'raw_transcript': rawTranscript,
      'executive_summary': executiveSummary,
      'confirmed_needs': confirmedNeeds,
      'objections_raised': objectionsRaised,
      'actions_todo': actionsTodo,
      'follow_up_email_draft': followUpEmailDraft,
      'email_j1': emailJ1,
      'email_j4': emailJ4,
      'bant_score': bantScore,
      'coi_metrics': coiMetrics,
      'tiered_packages': tieredPackages,
      'technical_handover_specs': technicalHandoverSpecs,
      'created_at': createdAt,
      'ai_feedback_rating': aiFeedbackRating,
      'ai_feedback_comments': aiFeedbackComments,
    };
  }
}
