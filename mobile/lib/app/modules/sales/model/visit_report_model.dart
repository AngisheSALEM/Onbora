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
  final double? processingTimeSeconds;
  final bool hasDossier;

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
    this.processingTimeSeconds,
    this.hasDossier = false,
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

    final emailDraft = json['follow_up_email_draft'] as String? ?? '';
    final j1 = json['email_j1'] as String? ?? (json['original_ai_output'] is Map ? json['original_ai_output']['email_j1'] as String? ?? emailDraft : emailDraft);
    final j4 = json['email_j4'] as String? ?? (json['original_ai_output'] is Map ? json['original_ai_output']['email_j4'] as String? ?? '' : '');

    final rawProcessingTime = json['processing_time_seconds'] as num? ??
        (json['original_ai_output'] is Map && json['original_ai_output']['processing_time_seconds'] != null
            ? json['original_ai_output']['processing_time_seconds'] as num?
            : null);

    return VisitReportModel(
      id: json['id'] as int? ?? (json['report_id'] as int? ?? 0),
      preparationId: json['preparation'] as int? ?? (json['preparation_id'] as int? ?? 0),
      rawTranscript: json['raw_transcript'] as String? ?? '',
      executiveSummary: json['executive_summary'] as String? ?? '',
      confirmedNeeds: (json['confirmed_needs'] as List?)?.map((e) => e.toString()).toList() ?? [],
      objectionsRaised: (json['objections_raised'] as List?)?.map((e) => e.toString()).toList() ?? [],
      actionsTodo: (json['actions_todo'] as List?)?.map((e) => e.toString()).toList() ?? [],
      followUpEmailDraft: emailDraft,
      emailJ1: j1,
      emailJ4: j4,
      bantScore: rawBant,
      coiMetrics: rawCoi,
      tieredPackages: packages,
      technicalHandoverSpecs: rawTechSpecs,
      createdAt: json['created_at'] as String? ?? DateTime.now().toIso8601String(),
      aiFeedbackRating: json['ai_feedback_rating'] as int?,
      aiFeedbackComments: json['ai_feedback_comments'] as String? ?? '',
      processingTimeSeconds: rawProcessingTime?.toDouble(),
      hasDossier: json['has_dossier'] as bool? ?? false,
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
      'processing_time_seconds': processingTimeSeconds,
    };
  }
}
