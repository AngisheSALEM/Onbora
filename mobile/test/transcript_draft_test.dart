import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:onbora_sales/app/core/storage/session_storage.dart';
import 'package:onbora_sales/app/core/storage/transcript_draft.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));
  test('Late final results replace a partial segment without duplicating it', () {
    final buffer = TranscriptBuffer();
    buffer.beginSegment();
    expect(buffer.update('Le client souhaite'), 'Le client souhaite');
    expect(
      buffer.update('Le client souhaite une fibre dédiée.'),
      'Le client souhaite une fibre dédiée.',
    );
    // done/notListening does not commit or clear the segment; a late final can replace it.
    expect(
      buffer.update('Le client souhaite une fibre dédiée à Gombe.'),
      'Le client souhaite une fibre dédiée à Gombe.',
    );
    buffer.beginSegment();
    expect(
      buffer.update('Le budget est validé.'),
      'Le client souhaite une fibre dédiée à Gombe. Le budget est validé.',
    );
  });
  test('Restored drafts can be resumed without losing earlier words', () {
    final buffer = TranscriptBuffer()..restore('Premier échange conservé.');
    buffer.beginSegment();
    expect(
      buffer.update('Deuxième échange.'),
      'Premier échange conservé. Deuxième échange.',
    );
  });
  test(
    'Draft writes stay ordered and survive recreating the storage object',
    () async {
      final draft = TranscriptDraft('kam:42');
      final first = draft.save('Texte provisoire');
      final finalResult = draft.save('Texte final complet');
      await Future.wait([first, finalResult]);
      expect(await TranscriptDraft('kam:42').read(), 'Texte final complet');
      expect(await TranscriptDraft('kam:43').read(), '');
      await draft.clear();
      expect(await TranscriptDraft('kam:42').read(), '');
    },
  );
  test('Drafts are isolated between authenticated users', () async {
    Future<void> session(String email) => SessionStorage.saveSession(
      token: 'test',
      email: email,
      role: 'KAM',
      name: 'KAM',
    );
    await session('kam-a@example.com');
    await TranscriptDraft('kam:42').save('Notes du premier KAM');
    await session('kam-b@example.com');
    expect(await TranscriptDraft('kam:42').read(), '');
    await TranscriptDraft('kam:42').save('Notes du deuxième KAM');
    await session('kam-a@example.com');
    expect(await TranscriptDraft('kam:42').read(), 'Notes du premier KAM');
  });
}
