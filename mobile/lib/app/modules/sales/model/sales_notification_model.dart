class SalesNotificationModel {
  final int id;
  final String title;
  final String message;
  final String notificationType;
  final int? plaqueId;
  final String plaqueCode;
  final String plaqueName;
  final Map<String, dynamic> payload;
  final bool isRead;
  final DateTime? createdAt;

  SalesNotificationModel({
    required this.id,
    required this.title,
    required this.message,
    required this.notificationType,
    this.plaqueId,
    this.plaqueCode = '',
    this.plaqueName = '',
    this.payload = const {},
    this.isRead = false,
    this.createdAt,
  });

  factory SalesNotificationModel.fromJson(Map<String, dynamic> json) {
    return SalesNotificationModel(
      id: json['id'] ?? 0,
      title: json['title'] ?? 'Notification',
      message: json['message'] ?? '',
      notificationType: json['notification_type'] ?? 'PLAQUE_ASSIGNED',
      plaqueId: json['plaque'],
      plaqueCode: json['plaque_code'] ?? '',
      plaqueName: json['plaque_name'] ?? '',
      payload: json['payload'] is Map<String, dynamic> ? json['payload'] : {},
      isRead: json['is_read'] ?? false,
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'message': message,
      'notification_type': notificationType,
      'plaque': plaqueId,
      'plaque_code': plaqueCode,
      'plaque_name': plaqueName,
      'payload': payload,
      'is_read': isRead,
      'created_at': createdAt?.toIso8601String(),
    };
  }
}
