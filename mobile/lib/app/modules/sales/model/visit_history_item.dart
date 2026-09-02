class VisitHistoryItem {
  final int id;
  final String enterpriseName;
  final String sector;
  final String location;
  final DateTime visitDate;
  final String status; // 'EFFECTUEE', 'TRANSMIS', 'EN_COURS'

  const VisitHistoryItem({
    required this.id,
    required this.enterpriseName,
    required this.sector,
    required this.location,
    required this.visitDate,
    required this.status,
  });

  bool get isToday {
    final now = DateTime.now();
    return visitDate.year == now.year &&
        visitDate.month == now.month &&
        visitDate.day == now.day;
  }

  bool get isThisMonth {
    final now = DateTime.now();
    return visitDate.year == now.year && visitDate.month == now.month;
  }

  String get formattedTime {
    final now = DateTime.now();
    final hourStr = '${visitDate.hour.toString().padLeft(2, '0')}:${visitDate.minute.toString().padLeft(2, '0')}';
    if (isToday) {
      return 'Aujourd\'hui à $hourStr';
    }
    final diff = now.difference(visitDate).inDays;
    if (diff == 1) {
      return 'Hier à $hourStr';
    }
    return '${visitDate.day.toString().padLeft(2, '0')}/${visitDate.month.toString().padLeft(2, '0')} à $hourStr';
  }

  factory VisitHistoryItem.fromJson(Map<String, dynamic> json) {
    return VisitHistoryItem(
      id: json['id'] as int? ?? 0,
      enterpriseName: json['enterprise_name'] as String? ?? (json['enterprise'] is Map ? json['enterprise']['name'] : 'Client Prospect'),
      sector: json['sector'] as String? ?? 'B2B',
      location: json['location'] as String? ?? 'Kinshasa',
      visitDate: json['created_at'] != null ? DateTime.tryParse(json['created_at']) ?? DateTime.now() : DateTime.now(),
      status: json['status'] as String? ?? 'EFFECTUEE',
    );
  }
}
