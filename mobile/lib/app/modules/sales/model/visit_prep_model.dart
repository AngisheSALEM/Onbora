class VisitPrepModel {
  final int id;
  final int enterpriseId;
  final String meetingObjective;
  final String hypothesisToVerify;
  final String customPitch;
  final String keyQuestions;
  final String createdAt;
  final String targetOffer;
  final List<String> goldenQuestions;
  final String competitorAlert;

  VisitPrepModel({
    required this.id,
    required this.enterpriseId,
    required this.meetingObjective,
    required this.hypothesisToVerify,
    required this.customPitch,
    required this.keyQuestions,
    required this.createdAt,
    this.targetOffer = 'Fibre Pro Orange (50 Mbps) + Microsoft 365 Business',
    this.goldenQuestions = const [],
    this.competitorAlert = '',
  });

  factory VisitPrepModel.fromJson(Map<String, dynamic> json) {
    List<String> parsedGoldenQuestions = [];
    if (json['golden_questions'] is List) {
      parsedGoldenQuestions = (json['golden_questions'] as List).map((e) => e.toString()).toList();
    } else if (json['key_questions'] is String && (json['key_questions'] as String).isNotEmpty) {
      parsedGoldenQuestions = (json['key_questions'] as String)
          .split('\n')
          .where((line) => line.trim().isNotEmpty)
          .toList();
    }

    return VisitPrepModel(
      id: json['id'] ?? 0,
      enterpriseId: json['enterprise'] ?? json['enterprise_id'] ?? 0,
      meetingObjective: json['meeting_objective'] ?? 'Qualifier l\'éligibilité réseau et les besoins de collaboration pour l\'entreprise.',
      hypothesisToVerify: json['hypothesis_to_verify'] ?? 'L\'entreprise utilise des lignes classiques et souhaite migrer vers la Fibre Optique Pro.',
      customPitch: json['custom_pitch'] ?? 'Présenter notre offre Fibre Optique Pro garantie avec basculement automatique et messagerie collaborative Teams.',
      keyQuestions: json['key_questions'] ?? '1. Quelle est votre connexion internet principale actuellement ?\n2. Comment échangez-vous vos fichiers en interne ?\n3. Avez-vous un besoin de sécurité réseau (Firewall) ?',
      createdAt: json['created_at'] ?? DateTime.now().toIso8601String(),
      targetOffer: json['target_offer'] ?? json['recommended_solution'] ?? 'Fibre Pro Orange (50 Mbps) + Microsoft 365 Business',
      goldenQuestions: parsedGoldenQuestions,
      competitorAlert: json['competitor_alert'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'enterprise': enterpriseId,
      'meeting_objective': meetingObjective,
      'hypothesis_to_verify': hypothesisToVerify,
      'custom_pitch': customPitch,
      'key_questions': keyQuestions,
      'created_at': createdAt,
      'target_offer': targetOffer,
      'golden_questions': goldenQuestions,
      'competitor_alert': competitorAlert,
    };
  }
}
