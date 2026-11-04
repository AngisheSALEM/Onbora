import '../../../core/api/api_client.dart';

typedef KamRecord = Map<String, dynamic>;

/// Uses the same authenticated endpoints and payloads as the KAM web workspace.
class KamRepository {
  final ApiClient api;
  KamRepository(this.api);

  Future<dynamic> read(String resource, {KamRecord? query}) async {
    final data = await api.get('/api/kam/$resource/', queryParams: query);
    return _waitForResearch(resource, data);
  }

  Future<dynamic> write(String resource, [KamRecord? body]) async {
    final data = await api.post('/api/kam/$resource/', body: body);
    return _waitForResearch(resource, data);
  }

  Future<dynamic> _waitForResearch(String resource, dynamic data) async {
    if (!RegExp(r'^pre-call/\d+$').hasMatch(resource)) return data;
    var job = record(record(data)['research_job']);
    if (!['queued', 'running'].contains(job['state'])) return data;
    final deadline = DateTime.now().add(const Duration(seconds: 310));
    while (['queued', 'running'].contains(job['state'])) {
      if (DateTime.now().isAfter(deadline)) {
        throw ApiException(
          'La recherche continue. Revenez sur ce compte pour consulter son avancement.',
        );
      }
      final delay = (job['retry_after'] as num?)?.toInt() ?? 2;
      await Future<void>.delayed(Duration(seconds: delay.clamp(1, 60)));
      final id = Uri.encodeComponent(job['id'].toString());
      job = record(await api.get('/api/ai/research/jobs/$id/'));
    }
    if (job['state'] != 'completed') {
      throw ApiException(
        'La recherche n’a pas abouti. Votre fiche est conservée. Réessayez l’actualisation.',
      );
    }
    return api.get('/api/kam/$resource/');
  }

  static KamRecord record(dynamic value) =>
      value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};

  static List<KamRecord> records(dynamic value, [String? key]) {
    final source = key == null ? value : record(value)[key];
    if (source is! List) return [];
    return source.whereType<Map>().map(record).toList();
  }

  static int accountId(KamRecord account) {
    final raw =
        account['account_id'] ??
        account['accountId'] ??
        account['enterprise_id'] ??
        account['id'];
    final match = RegExp(
      r'^(?:account-|enterprise_)?(\d+)$',
    ).firstMatch(raw?.toString() ?? '');
    if (match == null) throw const FormatException('Compte introuvable');
    return int.parse(match.group(1)!);
  }
}
