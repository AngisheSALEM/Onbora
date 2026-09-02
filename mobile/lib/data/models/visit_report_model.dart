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
  final String? audioFilePath;
  final String createdAt;

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
    this.audioFilePath,
    required this.createdAt,
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

    return VisitReportModel(
      id: json['id'] as int? ?? (json['report_id'] as int? ?? 0),
      preparationId: json['preparation'] as int? ?? (json['preparation_id'] as int? ?? 0),
      rawTranscript: json['raw_transcript'] as String? ?? '',
      executiveSummary: json['executive_summary'] as String? ?? '',
      confirmedNeeds: (json['confirmed_needs'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      objectionsRaised: (json['objections_raised'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      actionsTodo: (json['actions_todo'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      followUpEmailDraft: emailDraft,
      emailJ1: j1,
      emailJ4: j4,
      bantScore: rawBant,
      coiMetrics: rawCoi,
      tieredPackages: packages,
      technicalHandoverSpecs: rawTechSpecs,
      audioFilePath: json['audio_file_path'] as String?,
      createdAt: json['created_at'] as String? ?? DateTime.now().toIso8601String(),
    );
  }
}
