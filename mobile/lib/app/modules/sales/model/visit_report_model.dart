class VisitReportModel {
  final int id;
  final int preparationId;
  final String rawTranscript;
  final String executiveSummary;
  final List<String> confirmedNeeds;
  final List<String> objectionsRaised;
  final List<String> actionsTodo;
  final String followUpEmailDraft;
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
    required this.createdAt,
    this.aiFeedbackRating,
    this.aiFeedbackComments = '',
  });

  factory VisitReportModel.fromJson(Map<String, dynamic> json) {
    return VisitReportModel(
      id: json['id'] ?? 0,
      preparationId: json['preparation'] ?? json['preparation_id'] ?? 0,
      rawTranscript: json['raw_transcript'] ?? '',
      executiveSummary: json['executive_summary'] ?? 'Rendez-vous qualitatif. Le client confirme son intérêt pour la Fibre Optique Pro et la sécurité réseau.',
      confirmedNeeds: (json['confirmed_needs'] as List?)?.map((e) => e.toString()).toList() ??
          ['Fibre Optique Pro 50 Mbps', 'Microsoft 365 Pro & Teams', 'Firewall Managé'],
      objectionsRaised: (json['objections_raised'] as List?)?.map((e) => e.toString()).toList() ??
          ['Délai de déploiement'],
      actionsTodo: (json['actions_todo'] as List?)?.map((e) => e.toString()).toList() ??
          ['Transmettre l\'étude de raccordement', 'Envoyer la proposition tarifaire'],
      followUpEmailDraft: json['follow_up_email_draft'] ??
          'Bonjour,\n\nMerci pour cet échange constructif. Comme convenu, nous étudions votre éligibilité Fibre Optique.\n\nCordialement,',
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
      'created_at': createdAt,
      'ai_feedback_rating': aiFeedbackRating,
      'ai_feedback_comments': aiFeedbackComments,
    };
  }
}
