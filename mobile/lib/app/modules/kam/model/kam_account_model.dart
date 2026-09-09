import 'package:flutter/material.dart';

enum AccountHealthStatus {
  healthy,      // Vert : Compte stable, SLA respecté
  warning,      // Jaune : Renouvellement proche (60-90j) ou renégociation
  critical,     // Rouge : Incident SLA majeur, risque de résiliation / churn
}

enum DecisionRole {
  economicBuyer,  // Signataire du chèque / DG / DAF
  champion,       // Allié interne Orange
  technicalBuyer, // DSI / RSSI / Resp Réseau
  user,           // Utilisateur final
  blocker,        // Opposant / Favorable au concurrent
}

class KamStakeholder {
  final String id;
  final String fullName;
  final String jobTitle;
  final DecisionRole role;
  final String influence; // "HAUTE", "MOYENNE", "FAIBLE"
  final String stance;    // "FAVORABLE", "NEUTRE", "DEFAVORABLE"
  final String? lastContactDate;
  final String notes;

  KamStakeholder({
    required this.id,
    required this.fullName,
    required this.jobTitle,
    required this.role,
    this.influence = 'HAUTE',
    this.stance = 'FAVORABLE',
    this.lastContactDate,
    this.notes = '',
  });

  factory KamStakeholder.fromJson(Map<String, dynamic> json) {
    DecisionRole parsedRole = DecisionRole.economicBuyer;
    final roleStr = (json['role_in_decision'] ?? json['role'] ?? '').toString().toUpperCase();
    if (roleStr.contains('CHAMPION')) {
      parsedRole = DecisionRole.champion;
    } else if (roleStr.contains('TECHNICAL') || roleStr.contains('DSI')) {
      parsedRole = DecisionRole.technicalBuyer;
    } else if (roleStr.contains('USER')) {
      parsedRole = DecisionRole.user;
    } else if (roleStr.contains('BLOCKER')) {
      parsedRole = DecisionRole.blocker;
    }

    return KamStakeholder(
      id: json['id']?.toString() ?? '',
      fullName: json['full_name'] ?? json['name'] ?? 'Contact Exécutif',
      jobTitle: json['job_title'] ?? json['title'] ?? 'Décideur',
      role: parsedRole,
      influence: json['influence_level'] ?? json['influence'] ?? 'HAUTE',
      stance: json['stance_towards_orange'] ?? json['stance'] ?? 'NEUTRAL',
      lastContactDate: json['last_contacted_date']?.toString(),
      notes: json['key_notes'] ?? json['notes'] ?? '',
    );
  }

  String get roleDisplay {
    switch (role) {
      case DecisionRole.economicBuyer:
        return 'Décideur Économique';
      case DecisionRole.champion:
        return 'Champion Orange';
      case DecisionRole.technicalBuyer:
        return 'Décideur Technique';
      case DecisionRole.user:
        return 'Utilisateur';
      case DecisionRole.blocker:
        return 'Bloqueur';
    }
  }

  Color get stanceColor {
    switch (stance.toUpperCase()) {
      case 'FAVORABLE':
      case 'POSITIVE':
        return const Color(0xFF10B981);
      case 'NEUTRE':
      case 'NEUTRAL':
        return const Color(0xFF64748B);
      case 'DEFAVORABLE':
      case 'NEGATIVE':
        return const Color(0xFFEF4444);
      default:
        return const Color(0xFF8E8E93);
    }
  }
}

class KamActiveContract {
  final String serviceName;
  final String monthlyRevenue;
  final String endDate;
  final bool isRenewalImminent;
  final String slaStatus;

  KamActiveContract({
    required this.serviceName,
    required this.monthlyRevenue,
    required this.endDate,
    this.isRenewalImminent = false,
    this.slaStatus = 'Conforme (99.9%)',
  });

  factory KamActiveContract.fromJson(Map<String, dynamic> json) {
    return KamActiveContract(
      serviceName: json['service_name'] ?? json['name'] ?? 'Lien Connectivité Pro',
      monthlyRevenue: json['monthly_value'] != null
          ? "${json['monthly_value']} \$ / mois"
          : (json['monthly_revenue'] ?? "N/A"),
      endDate: json['end_date'] ?? '31/12/2026',
      isRenewalImminent: json['is_renewal_imminent'] ?? false,
      slaStatus: json['sla_status'] ?? 'Conforme (99.9%)',
    );
  }
}

class KamPainHypothesis {
  final String title;
  final String contextEvidence;
  final String orangeOpportunity;

  KamPainHypothesis({
    required this.title,
    required this.contextEvidence,
    required this.orangeOpportunity,
  });

  factory KamPainHypothesis.fromJson(Map<String, dynamic> json) {
    return KamPainHypothesis(
      title: json['hypothesis'] ?? json['title'] ?? '',
      contextEvidence: json['trigger_evidence'] ?? json['context_evidence'] ?? '',
      orangeOpportunity: json['discovery_angle'] ?? json['orange_opportunity'] ?? '',
    );
  }
}

class KamTriggerSignal {
  final String category; // "NOMINATION", "EXPANSION", "INCIDENT", "RECRUTEMENT_IT"
  final String title;
  final String description;
  final String date;

  KamTriggerSignal({
    required this.category,
    required this.title,
    required this.description,
    required this.date,
  });

  factory KamTriggerSignal.fromJson(Map<String, dynamic> json) {
    return KamTriggerSignal(
      category: json['category'] ?? 'OPPORTUNITÉ',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      date: json['date'] ?? '',
    );
  }
}

class KamAccountModel {
  final int id;
  final String name;
  final String legalId;
  final String sector;
  final String growthStage;
  final int headcount;
  final int sitesCount;
  final String headquarters;
  final String annualRevenue;
  final String monthlyRevenueOrange;
  final double walletSharePercentage;
  final AccountHealthStatus healthStatus;
  final String healthReason;
  final String businessSummary;
  final List<KamActiveContract> activeContracts;
  final List<KamStakeholder> stakeholders;
  final List<String> missingStakeholders;
  final List<KamPainHypothesis> painHypotheses;
  final List<KamTriggerSignal> triggerSignals;
  final String? nextVisitDate;
  final String? nextVisitTime;
  final String? nextVisitObjective;

  KamAccountModel({
    required this.id,
    required this.name,
    required this.legalId,
    required this.sector,
    required this.growthStage,
    required this.headcount,
    required this.sitesCount,
    required this.headquarters,
    required this.annualRevenue,
    required this.monthlyRevenueOrange,
    required this.walletSharePercentage,
    required this.healthStatus,
    required this.healthReason,
    required this.businessSummary,
    this.activeContracts = const [],
    this.stakeholders = const [],
    this.missingStakeholders = const [],
    this.painHypotheses = const [],
    this.triggerSignals = const [],
    this.nextVisitDate,
    this.nextVisitTime,
    this.nextVisitObjective,
  });

  factory KamAccountModel.fromJson(Map<String, dynamic> json) {
    final briefing = (json['briefing'] is Map) ? Map<String, dynamic>.from(json['briefing'] as Map) : <String, dynamic>{};
    final firmo = (briefing['firmographics'] is Map) ? Map<String, dynamic>.from(briefing['firmographics'] as Map) : <String, dynamic>{};
    final orangeRel = (briefing['orange_relationship'] is Map) ? Map<String, dynamic>.from(briefing['orange_relationship'] as Map) : <String, dynamic>{};

    int parsedId = 0;
    if (json['account_id'] != null) {
      parsedId = int.tryParse(json['account_id'].toString().replaceAll(RegExp(r'[^0-9]'), '')) ?? 0;
    } else if (json['id'] != null) {
      parsedId = int.tryParse(json['id'].toString().replaceAll(RegExp(r'[^0-9]'), '')) ?? 0;
    }

    AccountHealthStatus health = AccountHealthStatus.healthy;
    final dot = (json['dot_color'] ?? '').toString().toLowerCase();
    final conv = (json['conversion_status'] ?? '').toString().toUpperCase();
    if (dot == 'orange' || dot == 'warning' || conv == 'QUALIFIED') {
      health = AccountHealthStatus.warning;
    } else if (dot == 'red' || dot == 'critical' || conv == 'LOST') {
      health = AccountHealthStatus.critical;
    } else {
      health = AccountHealthStatus.healthy;
    }

    List<KamActiveContract> parsedContracts = [];
    if (orangeRel['active_contracts'] is List) {
      parsedContracts = (orangeRel['active_contracts'] as List)
          .map((c) => KamActiveContract.fromJson(Map<String, dynamic>.from(c as Map)))
          .toList();
    }

    List<KamStakeholder> parsedStakeholders = [];
    if (briefing['stakeholders_mapping'] is List) {
      parsedStakeholders = (briefing['stakeholders_mapping'] as List)
          .map((s) => KamStakeholder.fromJson(Map<String, dynamic>.from(s as Map)))
          .toList();
    }

    List<KamPainHypothesis> parsedPains = [];
    if (json['pain_hypotheses'] is List) {
      parsedPains = (json['pain_hypotheses'] as List)
          .map((p) => KamPainHypothesis.fromJson(Map<String, dynamic>.from(p as Map)))
          .toList();
    }

    final double walletShare = (orangeRel['wallet_share_percentage'] as num?)?.toDouble() ??
        (json['wallet_share_percentage'] as num?)?.toDouble() ?? 0.0;
    final mrrCurrent = orangeRel['mrr_current'] ?? json['mrr_current'] ?? 0.0;

    return KamAccountModel(
      id: parsedId,
      name: json['account_name'] ?? json['name'] ?? briefing['account_name'] ?? 'Compte Stratégique',
      legalId: json['crm_id'] ?? json['legal_id'] ?? 'CRM-CD-$parsedId',
      sector: briefing['industry'] ?? json['sector'] ?? 'Secteur Tertiaire & Services',
      growthStage: briefing['growth_stage'] ?? 'CONGLOMERATE',
      headcount: (firmo['headcount'] as num?)?.toInt() ?? 25,
      sitesCount: (firmo['locations_count'] as num?)?.toInt() ?? 1,
      headquarters: json['location'] ?? firmo['business_model_summary'] ?? 'Kinshasa',
      annualRevenue: firmo['estimated_annual_revenue']?.toString() ?? 'N/A',
      monthlyRevenueOrange: "$mrrCurrent \$ / mois",
      walletSharePercentage: walletShare,
      healthStatus: health,
      healthReason: json['golden_rule'] ?? json['status_label'] ?? 'Suivi régulier du portefeuille',
      businessSummary: firmo['business_model_summary'] ?? json['business_summary'] ?? '',
      activeContracts: parsedContracts,
      stakeholders: parsedStakeholders,
      missingStakeholders: const [],
      painHypotheses: parsedPains,
      triggerSignals: const [],
      nextVisitDate: json['meeting_date'],
      nextVisitTime: json['meeting_time'],
      nextVisitObjective: json['meeting_title'],
    );
  }

  Color get healthColor {
    switch (healthStatus) {
      case AccountHealthStatus.healthy:
        return const Color(0xFF10B981); // Vert émeraude
      case AccountHealthStatus.warning:
        return const Color(0xFF007AFF); // Apple System Blue
      case AccountHealthStatus.critical:
        return const Color(0xFFEF4444); // Rouge alerte
    }
  }

  String get healthDisplay {
    switch (healthStatus) {
      case AccountHealthStatus.healthy:
        return 'Compte Sain';
      case AccountHealthStatus.warning:
        return 'Renouvellement Proche';
      case AccountHealthStatus.critical:
        return 'Risque / Incident';
    }
  }
}
