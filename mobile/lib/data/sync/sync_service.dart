import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../../core/api/api_config.dart';
import '../../core/storage/session_storage.dart';
import 'outbox_manager.dart';

/// Service de réconciliation réseau (Sync Service).
/// Rejoue les commandes de l'Outbox locale vers le backend Django avec idempotence,
/// et détecte les conflits de version concurrents (HTTP 409).
class SyncService {
  final OutboxManager outboxManager;
  final http.Client _httpClient;
  bool _isSyncing = false;

  SyncService({
    required this.outboxManager,
    http.Client? httpClient,
  })  : _httpClient = httpClient ?? http.Client();

  bool get isSyncing => _isSyncing;

  /// Exécute la réconciliation complète des commandes en attente
  Future<SyncReport> syncPendingCommands() async {
    if (_isSyncing) {
      return SyncReport(syncedCount: 0, failedCount: 0, conflictsCount: 0);
    }

    _isSyncing = true;
    int synced = 0;
    int failed = 0;
    int conflicts = 0;

    final pending = outboxManager.getPendingCommands();

    try {
      final token = await SessionStorage.getToken();
      final headers = <String, String>{
        HttpHeaders.contentTypeHeader: 'application/json; charset=UTF-8',
        HttpHeaders.acceptHeader: 'application/json',
        if (token != null && token.isNotEmpty) HttpHeaders.authorizationHeader: 'Token $token',
      };

      for (final command in pending) {
        await outboxManager.updateCommandStatus(command.id, 'syncing');

        try {
          final uri = Uri.parse('${ApiConfig.baseUrl}${command.endpoint}');
          final reqHeaders = Map<String, String>.from(headers)
            ..['Idempotency-Key'] = command.idempotencyKey;

          final response = await _httpClient
              .post(
                uri,
                headers: reqHeaders,
                body: jsonEncode(command.payload),
              )
              .timeout(const Duration(seconds: 30));

          if (response.statusCode >= 200 && response.statusCode < 300) {
            await outboxManager.updateCommandStatus(command.id, 'completed');
            synced++;
          } else if (response.statusCode == 409) {
            // Conflit de version serveur : le brouillon local est conservé pour révision
            final errorBody = response.body;
            await outboxManager.updateCommandStatus(
              command.id,
              'conflict',
              error: 'Conflit de version distant : $errorBody',
            );
            conflicts++;
          } else {
            await outboxManager.updateCommandStatus(
              command.id,
              'failed',
              error: 'HTTP ${response.statusCode} : ${response.body}',
            );
            failed++;
          }
        } catch (e) {
          await outboxManager.updateCommandStatus(
            command.id,
            'failed',
            error: e.toString(),
          );
          failed++;
        }
      }
    } finally {
      _isSyncing = false;
    }

    return SyncReport(
      syncedCount: synced,
      failedCount: failed,
      conflictsCount: conflicts,
    );
  }
}

class SyncReport {
  final int syncedCount;
  final int failedCount;
  final int conflictsCount;

  SyncReport({
    required this.syncedCount,
    required this.failedCount,
    required this.conflictsCount,
  });

  bool get hasConflicts => conflictsCount > 0;
  bool get hasErrors => failedCount > 0;

  @override
  String toString() =>
      'SyncReport: $syncedCount synchronisées, $failedCount échouées, $conflictsCount conflits.';
}
