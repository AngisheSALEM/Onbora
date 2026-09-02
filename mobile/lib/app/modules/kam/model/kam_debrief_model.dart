class KamCommitment {
  final String action;
  final String owner; // "Orange" ou "Client"
  final String dueDate;
  final String priority; // "HAUTE", "MOYENNE"

  KamCommitment({
    required this.action,
    required this.owner,
    required this.dueDate,
    this.priority = 'HAUTE',
  });
}

class KamDebriefModel {
  final int accountId;
  final String accountName;
  final String meetingDate;
  final String rawTranscript;
  final String meetingAtmosphere; // "Très positif", "Constructif mais exigeant", "Tendu sur les SLA"
  final String executiveSummary;
  final List<String> agreedKeyPoints;
  final List<String> clientObjections;
  final List<KamCommitment> commitments;
  final String followUpEmailDraft;
  final String nextSteps;

  KamDebriefModel({
    required this.accountId,
    required this.accountName,
    required this.meetingDate,
    required this.rawTranscript,
    required this.meetingAtmosphere,
    required this.executiveSummary,
    required this.agreedKeyPoints,
    required this.clientObjections,
    required this.commitments,
    required this.followUpEmailDraft,
    required this.nextSteps,
  });
}
