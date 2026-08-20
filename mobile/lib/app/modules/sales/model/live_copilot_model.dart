class RecommendedPackageModel {
  final String serviceId;
  final String name;
  final double monthlyPriceUsd;
  final String pitchArgument;
  final String objectionKiller;

  RecommendedPackageModel({
    required this.serviceId,
    required this.name,
    required this.monthlyPriceUsd,
    required this.pitchArgument,
    required this.objectionKiller,
  });

  factory RecommendedPackageModel.fromJson(Map<String, dynamic> json) {
    return RecommendedPackageModel(
      serviceId: json['service_id'] ?? '',
      name: json['name'] ?? '',
      monthlyPriceUsd: (json['monthly_price_usd'] as num?)?.toDouble() ?? 0.0,
      pitchArgument: json['pitch_argument'] ?? '',
      objectionKiller: json['objection_killer'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'service_id': serviceId,
      'name': name,
      'monthly_price_usd': monthlyPriceUsd,
      'pitch_argument': pitchArgument,
      'objection_killer': objectionKiller,
    };
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
}

class LiveCopilotTurnModel {
  final int sessionId;
  final int enterpriseId;
  final String enterpriseName;
  final String activeSentiment;
  final List<String> detectedNeeds;
  final List<String> detectedObjections;
  final LivePropositionModel realtimeProposition;

  LiveCopilotTurnModel({
    required this.sessionId,
    required this.enterpriseId,
    required this.enterpriseName,
    required this.activeSentiment,
    required this.detectedNeeds,
    required this.detectedObjections,
    required this.realtimeProposition,
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
    );
  }
}
