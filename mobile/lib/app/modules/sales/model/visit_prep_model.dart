class VisitPrepModel {
  final int id;
  final int enterpriseId;
  final String meetingObjective;
  final String hypothesisToVerify;
  final String customPitch;
  final String keyQuestions;
  final String createdAt;

  VisitPrepModel({
    required this.id,
    required this.enterpriseId,
    required this.meetingObjective,
    required this.hypothesisToVerify,
    required this.customPitch,
    required this.keyQuestions,
    required this.createdAt,
  });

  factory VisitPrepModel.fromJson(Map<String, dynamic> json) {
    return VisitPrepModel(
      id: json['id'] ?? 0,
      enterpriseId: json['enterprise'] ?? 0,
      meetingObjective: json['meeting_objective'] ?? 'Qualifier l\'éligibilité réseau et les besoins de collaboration pour l\'entreprise.',
      hypothesisToVerify: json['hypothesis_to_verify'] ?? 'L\'entreprise utilise des lignes classiques et souhaite migrer vers la Fibre Optique Pro.',
      customPitch: json['custom_pitch'] ?? 'Présenter notre offre Fibre Optique Pro garantie avec basculement automatique et messagerie collaborative Teams.',
      keyQuestions: json['key_questions'] ?? '1. Quelle est votre connexion internet principale actuellement ?\n2. Comment échangez-vous vos fichiers en interne ?\n3. Avez-vous un besoin de sécurité réseau (Firewall) ?',
      createdAt: json['created_at'] ?? DateTime.now().toIso8601String(),
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
    };
  }
}
