class NearbyLeadItem {
  String name;
  String sector;
  String managerName;
  String phone;
  String proximityNotes;
  String photoUrl;
  double? latitude;
  double? longitude;

  NearbyLeadItem({
    required this.name,
    this.sector = 'Commerce / PME',
    this.managerName = '',
    this.phone = '',
    this.proximityNotes = '',
    this.photoUrl = '',
    this.latitude,
    this.longitude,
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'sector': sector,
      'manager_name': managerName,
      'phone': phone,
      'proximity_notes': proximityNotes,
      'photo_url': photoUrl,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
    };
  }

  factory NearbyLeadItem.fromJson(Map<String, dynamic> json) {
    return NearbyLeadItem(
      name: json['name'] ?? '',
      sector: json['sector'] ?? 'Commerce / PME',
      managerName: json['manager_name'] ?? '',
      phone: json['phone'] ?? '',
      proximityNotes: json['proximity_notes'] ?? '',
      photoUrl: json['photo_url'] ?? '',
      latitude: json['latitude'] != null ? (json['latitude'] as num).toDouble() : null,
      longitude: json['longitude'] != null ? (json['longitude'] as num).toDouble() : null,
    );
  }
}

class ReferralLeadItem {
  String referralType; // SUPPLIER, PARTNER, PEER
  String companyName;
  String contactPerson;
  String phone;
  String notes;

  ReferralLeadItem({
    this.referralType = 'SUPPLIER',
    required this.companyName,
    this.contactPerson = '',
    this.phone = '',
    this.notes = '',
  });

  Map<String, dynamic> toJson() {
    return {
      'referral_type': referralType,
      'company_name': companyName,
      'contact_person': contactPerson,
      'phone': phone,
      'notes': notes,
    };
  }

  factory ReferralLeadItem.fromJson(Map<String, dynamic> json) {
    return ReferralLeadItem(
      referralType: json['referral_type'] ?? 'SUPPLIER',
      companyName: json['company_name'] ?? '',
      contactPerson: json['contact_person'] ?? '',
      phone: json['phone'] ?? '',
      notes: json['notes'] ?? '',
    );
  }
}

class TradeAuditItem {
  String competitorName;
  int satisfactionScore; // 1 to 5
  List<String> frictionReasons;
  double? monthlySpendEstimated;
  String alertNotes;

  TradeAuditItem({
    required this.competitorName,
    this.satisfactionScore = 3,
    this.frictionReasons = const [],
    this.monthlySpendEstimated,
    this.alertNotes = '',
  });

  Map<String, dynamic> toJson() {
    return {
      'competitor_name': competitorName,
      'satisfaction_score': satisfactionScore,
      'friction_reasons': frictionReasons,
      if (monthlySpendEstimated != null) 'monthly_spend_estimated': monthlySpendEstimated,
      'alert_notes': alertNotes,
    };
  }

  factory TradeAuditItem.fromJson(Map<String, dynamic> json) {
    return TradeAuditItem(
      competitorName: json['competitor_name'] ?? '',
      satisfactionScore: json['satisfaction_score'] ?? 3,
      frictionReasons: (json['friction_reasons'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      monthlySpendEstimated: json['monthly_spend_estimated'] != null ? (json['monthly_spend_estimated'] as num).toDouble() : null,
      alertNotes: json['alert_notes'] ?? '',
    );
  }
}

class FieldIntelligenceReportModel {
  int? id;
  int? enterpriseId;
  int? visitReportId;
  String conversionStatus; // SUCCESS, HESITATION, REFUSAL
  String rccmNumber;
  String nurturingReason; // NONE, DECIDER_ABSENT, COMPETITOR_CONTRACT, BUDGET_WAITING, COMMITMENT_FEAR, TECHNICAL_DOUBT, OTHER
  String? contractExpiryDate;
  String? scheduledFollowUp;
  String nurturingNotes;
  int pointsEarned;
  List<NearbyLeadItem> nearbyLeads;
  List<ReferralLeadItem> referrals;
  List<TradeAuditItem> tradeAudits;

  FieldIntelligenceReportModel({
    this.id,
    this.enterpriseId,
    this.visitReportId,
    this.conversionStatus = 'SUCCESS',
    this.rccmNumber = '',
    this.nurturingReason = 'NONE',
    this.contractExpiryDate,
    this.scheduledFollowUp,
    this.nurturingNotes = '',
    this.pointsEarned = 0,
    this.nearbyLeads = const [],
    this.referrals = const [],
    this.tradeAudits = const [],
  });

  Map<String, dynamic> toJson() {
    return {
      if (enterpriseId != null) 'enterprise_id': enterpriseId,
      if (visitReportId != null) 'visit_report_id': visitReportId,
      'conversion_status': conversionStatus,
      'rccm_number': rccmNumber,
      'nurturing_reason': nurturingReason,
      if (contractExpiryDate != null) 'contract_expiry_date': contractExpiryDate,
      if (scheduledFollowUp != null) 'scheduled_follow_up': scheduledFollowUp,
      'nurturing_notes': nurturingNotes,
      'nearby_leads': nearbyLeads.map((e) => e.toJson()).toList(),
      'referrals': referrals.map((e) => e.toJson()).toList(),
      'trade_audits': tradeAudits.map((e) => e.toJson()).toList(),
    };
  }

  factory FieldIntelligenceReportModel.fromJson(Map<String, dynamic> json) {
    return FieldIntelligenceReportModel(
      id: json['id'],
      enterpriseId: json['enterprise'],
      visitReportId: json['visit_report'],
      conversionStatus: json['conversion_status'] ?? 'SUCCESS',
      rccmNumber: json['rccm_number'] ?? '',
      nurturingReason: json['nurturing_reason'] ?? 'NONE',
      contractExpiryDate: json['contract_expiry_date'],
      scheduledFollowUp: json['scheduled_follow_up'],
      nurturingNotes: json['nurturing_notes'] ?? '',
      pointsEarned: json['points_earned'] ?? 0,
      nearbyLeads: (json['nearby_leads'] as List<dynamic>?)?.map((e) => NearbyLeadItem.fromJson(e)).toList() ?? [],
      referrals: (json['referrals'] as List<dynamic>?)?.map((e) => ReferralLeadItem.fromJson(e)).toList() ?? [],
      tradeAudits: (json['trade_audits'] as List<dynamic>?)?.map((e) => TradeAuditItem.fromJson(e)).toList() ?? [],
    );
  }
}

class LeaderboardEntryModel {
  final int salespersonId;
  final String salespersonName;
  final String fullName;
  final int totalPoints;
  final int successfulConversionsCount;
  final int nearbyLeadsCount;
  final int referralsCount;
  final int tradeAuditsCount;
  final int rank;

  LeaderboardEntryModel({
    required this.salespersonId,
    required this.salespersonName,
    required this.fullName,
    required this.totalPoints,
    required this.successfulConversionsCount,
    required this.nearbyLeadsCount,
    required this.referralsCount,
    required this.tradeAuditsCount,
    required this.rank,
  });

  factory LeaderboardEntryModel.fromJson(Map<String, dynamic> json) {
    return LeaderboardEntryModel(
      salespersonId: json['salesperson_id'] ?? 0,
      salespersonName: json['salesperson_name'] ?? '',
      fullName: json['full_name'] ?? '',
      totalPoints: json['total_points'] ?? 0,
      successfulConversionsCount: json['successful_conversions_count'] ?? 0,
      nearbyLeadsCount: json['nearby_leads_count'] ?? 0,
      referralsCount: json['referrals_count'] ?? 0,
      tradeAuditsCount: json['trade_audits_count'] ?? 0,
      rank: json['rank'] ?? 0,
    );
  }
}
