class EnterpriseModel {
  final int id;
  final String name;
  final String? sector;
  final String approximateSize;
  final String? location;
  final String? address;
  final String? website;
  final String syncStatus;
  final String plaqueCode;
  final int? plaqueId;
  final int conversionScore;
  final bool isConverted;
  final List<String> keyNeeds;
  final String aiBriefSummary;
  final String? customPitch;
  final double latitude;
  final double longitude;

  // Données de Scraping et Hypothèses IA
  final String scrapingStatus;
  final Map<String, dynamic> scrapedData;
  final List<String> aiHypotheses;
  final String aiTailoredPitch;
  final List<String> aiKeyQuestions;
  final List<String> aiPotentialObjections;

  String get creditRating {
    final s = (sector ?? '').toLowerCase();
    if (s.contains('banque') || s.contains('finance') || s.contains('assurance') || conversionScore >= 90) {
      return 'AAA';
    } else if (s.contains('industrie') || s.contains('télécom') || conversionScore >= 80) {
      return 'AA';
    } else if (conversionScore >= 65) {
      return 'BBB';
    }
    return 'B';
  }

  String get creditRecommendation {
    switch (creditRating) {
      case 'AAA':
        return 'Solvable • Paiement à terme 30j';
      case 'AA':
        return 'Solvable • Facturation standard';
      case 'BBB':
        return 'PME Solide • Acompte 30%';
      default:
        return 'Vigilance • Paiement d\'avance requis';
    }
  }

  EnterpriseModel({
    required this.id,
    required this.name,
    this.sector,
    required this.approximateSize,
    this.location,
    this.address,
    this.website,
    this.syncStatus = 'SYNCED',
    this.plaqueCode = 'KIN-GOMBE',
    this.plaqueId,
    this.conversionScore = 85,
    this.isConverted = false,
    this.keyNeeds = const ['Fibre Optique Pro 100M', 'Microsoft 365 Business', 'Firewall Managé'],
    this.aiBriefSummary = 'Besoin prioritaire en interconnexion multisite et sécurisation des flux de données.',
    this.customPitch,
    this.latitude = -4.3033,
    this.longitude = 15.3084,
    this.scrapingStatus = 'PENDING',
    this.scrapedData = const {},
    this.aiHypotheses = const [],
    this.aiTailoredPitch = '',
    this.aiKeyQuestions = const [],
    this.aiPotentialObjections = const [],
  });

  factory EnterpriseModel.fromJson(Map<String, dynamic> json) {
    List<String> parsedNeeds = [];
    if (json['key_needs'] is List) {
      parsedNeeds = List<String>.from(json['key_needs'].map((e) => e.toString()));
    } else if (json['needs'] is List) {
      parsedNeeds = List<String>.from(json['needs'].map((e) => e.toString()));
    } else {
      parsedNeeds = const ['Fibre Optique Pro', 'Cloud Orange & Sauvegarde', 'Sécurité Managée'];
    }

    return EnterpriseModel(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      sector: json['sector'] ?? 'Non spécifié',
      approximateSize: json['approximate_size'] ?? json['size'] ?? 'Indéterminé',
      location: json['city'] ?? json['location'] ?? 'Kinshasa',
      address: json['address'] ?? json['street_address'] ?? 'Boulevard du 30 Juin',
      website: json['website'],
      syncStatus: json['sync_status'] ?? 'SYNCED',
      plaqueCode: json['plaque_code'] ?? json['plaque'] ?? 'KIN-GOMBE',
      plaqueId: json['plaque_rel'] ?? json['plaque_id'],
      conversionScore: json['conversion_score'] ?? json['score'] ?? 88,
      isConverted: json['is_converted'] ?? json['converted'] ?? (json['id'] == 1 || json['id'] == 3),
      keyNeeds: parsedNeeds,
      aiBriefSummary: json['ai_brief_summary'] ?? json['brief'] ?? 'Compte éligible au bouquet Fibre & SD-WAN Orange B2B.',
      customPitch: json['custom_pitch'] ?? json['pitch'],
      latitude: (json['latitude'] as num?)?.toDouble() ?? -4.3033,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 15.3084,
      scrapingStatus: json['scraping_status'] ?? 'PENDING',
      scrapedData: (json['scraped_data'] as Map<String, dynamic>?) ?? {},
      aiHypotheses: (json['ai_hypotheses'] as List?)?.map((e) => e.toString()).toList() ?? [],
      aiTailoredPitch: json['ai_tailored_pitch'] ?? '',
      aiKeyQuestions: (json['ai_key_questions'] as List?)?.map((e) => e.toString()).toList() ?? [],
      aiPotentialObjections: (json['ai_potential_objections'] as List?)?.map((e) => e.toString()).toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'sector': sector,
      'approximate_size': approximateSize,
      'location': location,
      'address': address,
      'website': website,
      'sync_status': syncStatus,
      'plaque_code': plaqueCode,
      'plaque_id': plaqueId,
      'conversion_score': conversionScore,
      'is_converted': isConverted,
      'key_needs': keyNeeds,
      'ai_brief_summary': aiBriefSummary,
      'custom_pitch': customPitch,
      'latitude': latitude,
      'longitude': longitude,
      'scraping_status': scrapingStatus,
      'scraped_data': scrapedData,
      'ai_hypotheses': aiHypotheses,
      'ai_tailored_pitch': aiTailoredPitch,
      'ai_key_questions': aiKeyQuestions,
      'ai_potential_objections': aiPotentialObjections,
    };
  }
}
