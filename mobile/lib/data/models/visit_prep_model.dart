import 'enterprise_model.dart';

class VisitPrepModel {
  final int id;
  final int enterpriseId;
  final EnterpriseModel? enterprise;
  final String meetingObjective;
  final String hypothesisToVerify;
  final String customPitch;
  final String keyQuestions;
  final String createdAt;

  VisitPrepModel({
    required this.id,
    required this.enterpriseId,
    this.enterprise,
    required this.meetingObjective,
    required this.hypothesisToVerify,
    required this.customPitch,
    required this.keyQuestions,
    required this.createdAt,
  });

  factory VisitPrepModel.fromJson(Map<String, dynamic> json) {
    return VisitPrepModel(
      id: json['id'] as int? ?? 0,
      enterpriseId: json['enterprise'] is int 
          ? json['enterprise'] as int 
          : (json['enterprise'] is Map ? json['enterprise']['id'] as int : 0),
      enterprise: json['enterprise'] is Map 
          ? EnterpriseModel.fromJson(json['enterprise'] as Map<String, dynamic>) 
          : null,
      meetingObjective: json['meeting_objective'] as String? ?? '',
      hypothesisToVerify: json['hypothesis_to_verify'] as String? ?? '',
      customPitch: json['custom_pitch'] as String? ?? '',
      keyQuestions: json['key_questions'] as String? ?? '',
      createdAt: json['created_at'] as String? ?? DateTime.now().toIso8601String(),
    );
  }
}
