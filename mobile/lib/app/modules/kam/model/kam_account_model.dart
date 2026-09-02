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
    switch (stance) {
      case 'FAVORABLE':
        return const Color(0xFF10B981);
      case 'NEUTRE':
        return const Color(0xFFF59E0B);
      case 'DEFAVORABLE':
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

  Color get healthColor {
    switch (healthStatus) {
      case AccountHealthStatus.healthy:
        return const Color(0xFF10B981); // Vert émeraude
      case AccountHealthStatus.warning:
        return const Color(0xFFF59E0B); // Ambre
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
