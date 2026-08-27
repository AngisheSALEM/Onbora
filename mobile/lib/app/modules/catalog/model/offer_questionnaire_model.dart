class OfferQuestionModel {
  final int id;
  final String questionText;
  final String questionType; // 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'BOOLEAN', 'TEXT', 'NUMBER'
  final List<String> options;
  final bool isRequired;
  final int order;
  final String helpText;
  final int scoringWeight;

  OfferQuestionModel({
    required this.id,
    required this.questionText,
    required this.questionType,
    required this.options,
    this.isRequired = true,
    this.order = 1,
    this.helpText = '',
    this.scoringWeight = 10,
  });

  factory OfferQuestionModel.fromJson(Map<String, dynamic> json) {
    var rawOpts = json['options'];
    List<String> parsedOptions = [];
    if (rawOpts is List) {
      parsedOptions = rawOpts.map((e) => e.toString()).toList();
    }
    return OfferQuestionModel(
      id: json['id'] ?? 0,
      questionText: json['question_text'] ?? '',
      questionType: json['question_type'] ?? 'SINGLE_CHOICE',
      options: parsedOptions,
      isRequired: json['is_required'] ?? true,
      order: json['order'] ?? 1,
      helpText: json['help_text'] ?? '',
      scoringWeight: json['scoring_weight'] ?? 10,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'question_text': questionText,
      'question_type': questionType,
      'options': options,
      'is_required': isRequired,
      'order': order,
      'help_text': helpText,
      'scoring_weight': scoringWeight,
    };
  }
}

class OfferQuestionnaireModel {
  final int id;
  final int? serviceId;
  final String serviceName;
  final String title;
  final String description;
  final String targetOfferName;
  final bool isActive;
  final List<OfferQuestionModel> questions;

  OfferQuestionnaireModel({
    required this.id,
    this.serviceId,
    this.serviceName = '',
    required this.title,
    this.description = '',
    required this.targetOfferName,
    this.isActive = true,
    required this.questions,
  });

  factory OfferQuestionnaireModel.fromJson(Map<String, dynamic> json) {
    var rawQuestions = json['questions'];
    List<OfferQuestionModel> parsedQuestions = [];
    if (rawQuestions is List) {
      parsedQuestions = rawQuestions
          .map((q) => OfferQuestionModel.fromJson(q as Map<String, dynamic>))
          .toList();
    }
    return OfferQuestionnaireModel(
      id: json['id'] ?? 0,
      serviceId: json['service'],
      serviceName: json['service_name'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      targetOfferName: json['target_offer_name'] ?? '',
      isActive: json['is_active'] ?? true,
      questions: parsedQuestions,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'service': serviceId,
      'service_name': serviceName,
      'title': title,
      'description': description,
      'target_offer_name': targetOfferName,
      'is_active': isActive,
      'questions': questions.map((q) => q.toJson()).toList(),
    };
  }
}
