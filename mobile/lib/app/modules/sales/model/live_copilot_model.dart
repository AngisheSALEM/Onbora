class RecommendedPackageModel {
  final String serviceId;
  final String name;
  final double monthlyPriceUsd;
  final String category;
  final String pitchArgument;
  final String objectionKiller;
  bool checked;

  RecommendedPackageModel({
    required this.serviceId,
    required this.name,
    required this.monthlyPriceUsd,
    this.category = 'Offre Recommandée',
    required this.pitchArgument,
    required this.objectionKiller,
    this.checked = true,
  });

  factory RecommendedPackageModel.fromJson(Map<String, dynamic> json) {
    return RecommendedPackageModel(
      serviceId: json['service_id'] ?? '',
      name: json['name'] ?? '',
      monthlyPriceUsd: (json['monthly_price_usd'] as num?)?.toDouble() ?? 0.0,
      category: json['category'] ?? 'Offre Recommandée',
      pitchArgument: json['pitch_argument'] ?? '',
      objectionKiller: json['objection_killer'] ?? '',
      checked: json['checked'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'service_id': serviceId,
      'name': name,
      'monthly_price_usd': monthlyPriceUsd,
      'category': category,
      'pitch_argument': pitchArgument,
      'objection_killer': objectionKiller,
      'checked': checked,
    };
  }

  RecommendedPackageModel copyWith({
    String? serviceId,
    String? name,
    double? monthlyPriceUsd,
    String? category,
    String? pitchArgument,
    String? objectionKiller,
    bool? checked,
  }) {
    return RecommendedPackageModel(
      serviceId: serviceId ?? this.serviceId,
      name: name ?? this.name,
      monthlyPriceUsd: monthlyPriceUsd ?? this.monthlyPriceUsd,
      category: category ?? this.category,
      pitchArgument: pitchArgument ?? this.pitchArgument,
      objectionKiller: objectionKiller ?? this.objectionKiller,
      checked: checked ?? this.checked,
    );
  }
}

class LivePropositionModel {
  final String title;
  final List<RecommendedPackageModel> recommendedPackages;
  final double estimatedTotalMonthlyUsd;
  final int closingReadinessScore;

  LivePropositionModel({
    required this.title,
    required this.recommendedPackages,
    required this.estimatedTotalMonthlyUsd,
    required this.closingReadinessScore,
  });

  factory LivePropositionModel.fromJson(Map<String, dynamic> json) {
    var packages = <RecommendedPackageModel>[];
    if (json['recommended_packages'] is List) {
      packages = (json['recommended_packages'] as List)
          .map((e) => RecommendedPackageModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return LivePropositionModel(
      title: json['title'] ?? 'Proposition Commerciale Orange B2B',
      recommendedPackages: packages,
      estimatedTotalMonthlyUsd: (json['estimated_total_monthly_usd'] as num?)?.toDouble() ?? 0.0,
      closingReadinessScore: json['closing_readiness_score'] ?? 80,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'recommended_packages': recommendedPackages.map((e) => e.toJson()).toList(),
      'estimated_total_monthly_usd': estimatedTotalMonthlyUsd,
      'closing_readiness_score': closingReadinessScore,
    };
  }

  LivePropositionModel copyWith({
    String? title,
    List<RecommendedPackageModel>? recommendedPackages,
    double? estimatedTotalMonthlyUsd,
    int? closingReadinessScore,
  }) {
    return LivePropositionModel(
      title: title ?? this.title,
      recommendedPackages: recommendedPackages ?? this.recommendedPackages,
      estimatedTotalMonthlyUsd: estimatedTotalMonthlyUsd ?? this.estimatedTotalMonthlyUsd,
      closingReadinessScore: closingReadinessScore ?? this.closingReadinessScore,
    );
  }
}

class LiveCopilotTurnModel {
  final int sessionId;
  final int enterpriseId;
  final String enterpriseName;
  final String activeSentiment;
  final List<String> detectedNeeds;
  final List<String> detectedObjections;
  final LivePropositionModel realtimeProposition;
  final String coachingTip;

  LiveCopilotTurnModel({
    required this.sessionId,
    required this.enterpriseId,
    required this.enterpriseName,
    required this.activeSentiment,
    required this.detectedNeeds,
    required this.detectedObjections,
    required this.realtimeProposition,
    this.coachingTip = '',
  });

  factory LiveCopilotTurnModel.fromJson(Map<String, dynamic> json) {
    return LiveCopilotTurnModel(
      sessionId: json['session_id'] ?? 0,
      enterpriseId: json['enterprise_id'] ?? 0,
      enterpriseName: json['enterprise_name'] ?? '',
      activeSentiment: json['active_sentiment'] ?? 'En discussion',
      detectedNeeds: (json['detected_needs'] as List?)?.map((e) => e.toString()).toList() ?? [],
      detectedObjections: (json['detected_objections'] as List?)?.map((e) => e.toString()).toList() ?? [],
      realtimeProposition: LivePropositionModel.fromJson(
        (json['realtime_proposition'] as Map<String, dynamic>?) ?? {},
      ),
      coachingTip: json['coaching_tip'] ?? '',
    );
  }
}
