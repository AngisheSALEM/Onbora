import 'kam_account_model.dart';

class KamBriefingModel {
  final int accountId;
  final String accountName;
  final String sector;
  final String visitDate;
  final String visitTime;
  final String visitLocation;
  final int estimatedReadTimeMinutes;
  final String primaryObjective;
  final String idealOutcome;
  final List<String> suggestedAgenda;
  final List<String> trapsToAvoid;
  final List<KamStakeholder> meetingAttendees;
  final List<String> missingKeyPeople;
  final List<KamPainHypothesis> painHypotheses;
  final List<KamActiveContract> currentOrangeServices;
  final int openIncidentsCount;
  final String incidentsSummary;
  final List<String> lastInteractions;
  final bool isPrepared;

  KamBriefingModel({
    required this.accountId,
    required this.accountName,
    required this.sector,
    required this.visitDate,
    required this.visitTime,
    required this.visitLocation,
    this.estimatedReadTimeMinutes = 4,
    required this.primaryObjective,
    required this.idealOutcome,
    required this.suggestedAgenda,
    this.trapsToAvoid = const [],
    required this.meetingAttendees,
    this.missingKeyPeople = const [],
    required this.painHypotheses,
    required this.currentOrangeServices,
    this.openIncidentsCount = 0,
    this.incidentsSummary = '',
    this.lastInteractions = const [],
    this.isPrepared = false,
  });
}
