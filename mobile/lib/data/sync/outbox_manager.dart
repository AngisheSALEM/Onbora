import 'dart:convert';
import 'dart:math';
import '../local/local_cache_service.dart';
import 'outbox_command.dart';

/// Gestionnaire de la file d'attente Outbox locale (Offline-First).
/// Enregistre les actions commerciales hors-ligne avec clé d'idempotence UUIDv4.
class OutboxManager {
  final LocalCacheService _cache;
  final List<OutboxCommand> _queue = [];

  OutboxManager(this._cache) {
    _loadQueue();
  }

  void _loadQueue() {
    final raw = _cache.getOutboxRaw();
    if (raw != null && raw.isNotEmpty) {
      try {
        final list = jsonDecode(raw) as List<dynamic>;
        _queue.clear();
        for (final item in list) {
          _queue.add(OutboxCommand.fromJson(item as Map<String, dynamic>));
        }
      } catch (_) {
        // En cas de corruption, préserve une liste vide
      }
    }
  }

  Future<void> _persistQueue() async {
    final list = _queue.map((cmd) => cmd.toJson()).toList();
    await _cache.saveOutboxRaw(jsonEncode(list));
  }

  /// Générateur léger de clé UUIDv4 sans dépendance native externe
  static String generateUuidV4() {
    final random = Random.secure();
    final values = List<int>.generate(16, (i) => random.nextInt(256));
    values[6] = (values[6] & 0x0f) | 0x40; // Version 4
    values[8] = (values[8] & 0x3f) | 0x80; // Variant RFC4122

    final hex = values.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}';
  }

  /// Enfile une commande de clôture de visite avec clé d'idempotence unique
  Future<OutboxCommand> enqueueVisitCompletion({
    required int enterpriseId,
    int? preparationId,
    required String executiveSummary,
    List<String>? confirmedNeeds,
    List<String>? objectionsRaised,
    List<String>? actionsTodo,
    String? rawTranscript,
    Map<String, dynamic>? qualificationAnswers,
    String? expectedVersion,
  }) async {
    final idempotencyKey = generateUuidV4();
    final commandId = generateUuidV4();

    final payload = <String, dynamic>{
      'enterprise_id': enterpriseId,
      if (preparationId != null) 'preparation_id': preparationId,
      'executive_summary': executiveSummary,
      'confirmed_needs': confirmedNeeds ?? [],
      'objections_raised': objectionsRaised ?? [],
      'actions_todo': actionsTodo ?? [],
      'raw_transcript': rawTranscript ?? '',
      if (qualificationAnswers != null) 'qualification_answers': qualificationAnswers,
      if (expectedVersion != null) 'expected_version': expectedVersion,
      'client_timestamp': DateTime.now().toIso8601String(),
    };

    final command = OutboxCommand(
      id: commandId,
      idempotencyKey: idempotencyKey,
      endpoint: '/api/sales/visits/complete/',
      payload: payload,
      createdAt: DateTime.now(),
      status: 'pending',
    );

    _queue.add(command);
    await _persistQueue();
    return command;
  }

  List<OutboxCommand> getPendingCommands() {
    return _queue.where((cmd) => cmd.status == 'pending' || cmd.status == 'failed').toList();
  }

  List<OutboxCommand> getAllCommands() {
    return List.unmodifiable(_queue);
  }

  int get pendingCount => _queue.where((c) => c.status == 'pending').length;

  Future<void> updateCommandStatus(String commandId, String status, {String? error}) async {
    final cmd = _queue.firstWhere((c) => c.id == commandId, orElse: () => throw Exception("Commande introuvable"));
    cmd.status = status;
    if (error != null) {
      cmd.lastError = error;
    }
    if (status == 'syncing') {
      cmd.attempts += 1;
    }
    await _persistQueue();
  }

  Future<void> removeCommand(String commandId) async {
    _queue.removeWhere((c) => c.id == commandId);
    await _persistQueue();
  }

  Future<void> clearCompleted() async {
    _queue.removeWhere((c) => c.status == 'completed');
    await _persistQueue();
  }
}
