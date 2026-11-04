import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/api/api_config.dart';
import '../../../core/storage/session_storage.dart';
import 'kam_repository.dart';

/// Drafts are isolated by signed-in account, server and meeting.
class KamMeetingDraft {
  final String key;
  KamMeetingDraft._(this.key);
  static Future<KamMeetingDraft?> open(String meeting) async {
    final email = await SessionStorage.getUserEmail();
    if (email == null || email.isEmpty) return null;
    return KamMeetingDraft._(
      'kam_draft:${ApiConfig.activeBaseUrl}:$email:$meeting',
    );
  }

  Future<KamRecord> read() async {
    final raw = (await SharedPreferences.getInstance()).getString(key);
    if (raw == null) return {};
    try {
      return KamRepository.record(jsonDecode(raw));
    } on FormatException {
      return {};
    }
  }

  Future<void> save(KamRecord value) async =>
      (await SharedPreferences.getInstance()).setString(key, jsonEncode(value));
  Future<void> clear() async =>
      (await SharedPreferences.getInstance()).remove(key);
}
