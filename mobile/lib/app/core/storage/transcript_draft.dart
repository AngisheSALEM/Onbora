import 'package:shared_preferences/shared_preferences.dart';
import 'session_storage.dart';

/// A partial result replaces the current segment. A late final result therefore
/// cannot duplicate words already received in a done/notListening callback.
class TranscriptBuffer {
  String _previous = '';
  String _segment = '';
  String get text =>
      [_previous, _segment].where((s) => s.isNotEmpty).join(' ').trim();
  void restore(String value) {
    _previous = value.trim();
    _segment = '';
  }

  void beginSegment() {
    _previous = text;
    _segment = '';
  }

  String update(String words) {
    _segment = words.trim();
    return text;
  }
}

/// Drafts are separated by signed-in user and visit, and writes stay ordered.
class TranscriptDraft {
  TranscriptDraft(this.scope);
  final String scope;
  Future<void> _writes = Future.value();

  Future<String>? _storageKey;
  Future<String> _key() => _storageKey ??= _resolveKey();
  Future<String> _resolveKey() async =>
      'transcript_draft:${await SessionStorage.getUserEmail() ?? 'local'}:$scope';

  Future<String> read() async {
    await _writes;
    final key = await _key();
    return (await SharedPreferences.getInstance()).getString(key) ?? '';
  }

  Future<void> save(String text) {
    final operation = _writes.then((_) async {
      final key = await _key();
      final prefs = await SharedPreferences.getInstance();
      if (text.trim().isEmpty) {
        await prefs.remove(key);
      } else {
        await prefs.setString(key, text.trim());
      }
    });
    _writes = operation.catchError((Object _) {});
    return operation;
  }

  Future<void> clear() => save('');
}
