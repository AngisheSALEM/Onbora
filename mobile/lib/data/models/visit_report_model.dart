class VisitReportModel {
  final int id;
  final int preparationId;
  final String rawTranscript;
  final String executiveSummary;
  final List<String> confirmedNeeds;
  final List<String> objectionsRaised;
  final List<String> actionsTodo;
  final String followUpEmailDraft;
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
    this.audioFilePath,
    required this.createdAt,
  });

  factory VisitReportModel.fromJson(Map<String, dynamic> json) {
    return VisitReportModel(
      id: json['id'] as int? ?? 0,
      preparationId: json['preparation'] as int? ?? 0,
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
      followUpEmailDraft: json['follow_up_email_draft'] as String? ?? '',
      audioFilePath: json['audio_file_path'] as String?,
      createdAt: json['created_at'] as String? ?? DateTime.now().toIso8601String(),
    );
  }
}
