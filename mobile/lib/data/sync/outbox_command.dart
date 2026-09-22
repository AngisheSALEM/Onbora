import 'dart:convert';
import 'package:crypto/crypto.dart' if (dart.library.html) 'dart:convert';

/// Représente une commande stockée dans l'Outbox locale en attente d'envoi réseau.
class OutboxCommand {
  final String id;
  final String idempotencyKey;
  final String endpoint;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  String status; // 'pending', 'syncing', 'completed', 'conflict', 'failed'
  int attempts;
  String? lastError;
  final String contentHash;

  OutboxCommand({
    required this.id,
    required this.idempotencyKey,
    required this.endpoint,
    required this.payload,
    required this.createdAt,
    this.status = 'pending',
    this.attempts = 0,
    this.lastError,
    String? contentHash,
  }) : contentHash = contentHash ?? _computeHash(payload);

  static String _computeHash(Map<String, dynamic> data) {
    final raw = jsonEncode(data);
    // Empreinte simplifiée basée sur le contenu
    var hash = 0;
    for (var i = 0; i < raw.length; i++) {
      hash = (31 * hash + raw.codeUnitAt(i)) & 0xFFFFFFFF;
    }
    return hash.toRadixString(16).padLeft(8, '0');
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'idempotencyKey': idempotencyKey,
      'endpoint': endpoint,
      'payload': payload,
      'createdAt': createdAt.toIso8601String(),
      'status': status,
      'attempts': attempts,
      'lastError': lastError,
      'contentHash': contentHash,
    };
  }

  factory OutboxCommand.fromJson(Map<String, dynamic> json) {
    return OutboxCommand(
      id: json['id'] as String,
      idempotencyKey: json['idempotencyKey'] as String,
      endpoint: json['endpoint'] as String,
      payload: Map<String, dynamic>.from(json['payload'] as Map),
      createdAt: DateTime.parse(json['createdAt'] as String),
      status: (json['status'] as String?) ?? 'pending',
      attempts: (json['attempts'] as int?) ?? 0,
      lastError: json['lastError'] as String?,
      contentHash: json['contentHash'] as String?,
    );
  }
}
