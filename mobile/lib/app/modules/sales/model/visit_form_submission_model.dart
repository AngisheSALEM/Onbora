class VisitFormSubmissionModel {
  final int submissionId;
  final int reportId;
  final int enterpriseId;
  final String enterpriseName;
  final String targetOfferName;
  final int qualificationScore;
  final String aiSummary;
  final List<String> detectedNeeds;
  final String nextAction;
  final String status;
  final String createdAt;

  VisitFormSubmissionModel({
    required this.submissionId,
    required this.reportId,
    required this.enterpriseId,
    required this.enterpriseName,
    required this.targetOfferName,
    required this.qualificationScore,
    required this.aiSummary,
    required this.detectedNeeds,
    required this.nextAction,
    required this.status,
    required this.createdAt,
  });

  factory VisitFormSubmissionModel.fromJson(Map<String, dynamic> json) {
    var rawNeeds = json['detected_needs'];
    List<String> parsedNeeds = [];
    if (rawNeeds is List) {
      parsedNeeds = rawNeeds.map((e) => e.toString()).toList();
    }

    return VisitFormSubmissionModel(
      submissionId: json['submission_id'] ?? json['id'] ?? 0,
      reportId: json['report_id'] ?? 0,
      enterpriseId: json['enterprise_id'] ?? json['enterprise'] ?? 0,
      enterpriseName: json['enterprise_name'] ?? '',
      targetOfferName: json['target_offer_name'] ?? '',
      qualificationScore: json['qualification_score'] ?? 75,
      aiSummary: json['ai_summary'] ?? '',
      detectedNeeds: parsedNeeds,
      nextAction: json['next_action'] ?? 'Dossier transmis au Back-Office KAM',
      status: json['status'] ?? 'QUALIFIED',
      createdAt: json['created_at'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'submission_id': submissionId,
      'report_id': reportId,
      'enterprise_id': enterpriseId,
      'enterprise_name': enterpriseName,
      'target_offer_name': targetOfferName,
      'qualification_score': qualificationScore,
      'ai_summary': aiSummary,
      'detected_needs': detectedNeeds,
      'next_action': nextAction,
      'status': status,
      'created_at': createdAt,
    };
  }
}
