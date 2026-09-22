import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Service de persistance et de cache local pour le mode hors-ligne (Offline-First).
/// Stocke les briefings pré-visite, formulaires de qualification et comptes récents.
class LocalCacheService {
  static const String _prefixBriefing = 'cache_briefing_';
  static const String _prefixQualification = 'cache_qualification_';
  static const String _keyRecentAccounts = 'cache_recent_accounts';
  static const String _keyOutbox = 'onbora_offline_outbox_v1';

  final SharedPreferences _prefs;

  LocalCacheService(this._prefs);

  static Future<LocalCacheService> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    return LocalCacheService(prefs);
  }

  // --- 1. Briefings Pré-Visite ---

  Future<void> saveBriefing(int enterpriseId, Map<String, dynamic> briefingData) async {
    final payload = {
      'enterprise_id': enterpriseId,
      'cached_at': DateTime.now().toIso8601String(),
      'data': briefingData,
    };
    await _prefs.setString('$_prefixBriefing$enterpriseId', jsonEncode(payload));
  }

  Map<String, dynamic>? getBriefing(int enterpriseId) {
    final raw = _prefs.getString('$_prefixBriefing$enterpriseId');
    if (raw == null) return null;
    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      return decoded['data'] as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  // --- 2. Formulaires & Arbres de Qualification ---

  Future<void> saveQualificationTemplate(String segment, Map<String, dynamic> templateData) async {
    await _prefs.setString('$_prefixQualification$segment', jsonEncode(templateData));
  }

  Map<String, dynamic>? getQualificationTemplate(String segment) {
    final raw = _prefs.getString('$_prefixQualification$segment');
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  // --- 3. Comptes Récents du Portefeuille ---

  Future<void> saveRecentAccounts(List<Map<String, dynamic>> accounts) async {
    await _prefs.setString(_keyRecentAccounts, jsonEncode(accounts));
  }

  List<Map<String, dynamic>> getRecentAccounts() {
    final raw = _prefs.getString(_keyRecentAccounts);
    if (raw == null) return [];
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list.map((e) => e as Map<String, dynamic>).toList();
    } catch (_) {
      return [];
    }
  }

  // --- 4. Stockage Brut de l'Outbox ---

  Future<void> saveOutboxRaw(String rawJson) async {
    await _prefs.setString(_keyOutbox, rawJson);
  }

  String? getOutboxRaw() {
    return _prefs.getString(_keyOutbox);
  }
}
