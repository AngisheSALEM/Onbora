import '../../../core/api/api_client.dart';

typedef KamRecord = Map<String, dynamic>;

/// Uses the same authenticated endpoints and payloads as the KAM web workspace.
class KamRepository {
  final ApiClient api;
  KamRepository(this.api);

  Future<dynamic> read(String resource, {KamRecord? query}) =>
      api.get('/api/kam/$resource/', queryParams: query);

  Future<dynamic> write(String resource, [KamRecord? body]) =>
      api.post('/api/kam/$resource/', body: body);

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
