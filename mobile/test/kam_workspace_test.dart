import 'dart:convert';
import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:onbora_sales/app/core/api/api_client.dart';
import 'package:onbora_sales/app/core/api/api_config.dart';
import 'package:onbora_sales/app/core/storage/transcript_draft.dart';
import 'package:onbora_sales/app/modules/kam/controller/kam_workspace_controller.dart';
import 'package:onbora_sales/app/modules/kam/controller/kam_debrief_controller.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    Get.reset();
    Get.testMode = true;
    ApiConfig.baseUrl = 'http://localhost:8000';
  });
  tearDown(() => Get.reset());
  test(
    'Completion sends exact transcript and notes, and updates real visit history',
    () async {
      final calls = <http.Request>[];
      final api = ApiClient(
        httpClient: MockClient((request) async {
          calls.add(request);
          return http.Response.bytes(
            utf8.encode(
              jsonEncode({
                'report': {'id': 7, 'raw_transcript': 'Paroles réelles'},
                'appointment': {'id': 42, 'status': 'COMPLETED'},
              }),
            ),
            201,
          );
        }),
      );
      final ctrl = KamWorkspaceController(api: api);
      ctrl.appointments.add({'id': 42, 'status': 'IN_PROGRESS'});
      final report = await ctrl.completeAppointment(
        42,
        '  Paroles réelles  ',
        ' Budget confirmé ',
        'IN_NEGOTIATION',
      );
      expect(calls.single.url.path, '/api/kam/appointments/42/complete-vocal/');
      expect(jsonDecode(calls.single.body), {
        'transcript': 'Paroles réelles',
        'notes': 'Budget confirmé',
        'conversion_status': 'IN_NEGOTIATION',
      });
      expect(report['id'], 7);
      expect(ctrl.appointments.single['status'], 'COMPLETED');
      expect(ctrl.visits.single['raw_transcript'], 'Paroles réelles');
    },
  );
  test(
    'Empty meetings never generate fabricated content or call the backend',
    () async {
      var called = false;
      final ctrl = KamWorkspaceController(
        api: ApiClient(
          httpClient: MockClient((request) async {
            called = true;
            return http.Response('{}', 200);
          }),
        ),
      );
      await expectLater(
        ctrl.completeAppointment(42, ' ', '', 'IN_NEGOTIATION'),
        throwsStateError,
      );
      expect(called, false);
    },
  );
  test(
    'Generation failure preserves transcript and notes; successful retry clears drafts',
    () async {
      var fail = true;
      final api = ApiClient(
        httpClient: MockClient((request) async {
          if (request.method == 'GET') {
            return http.Response(
              jsonEncode(request.url.path.contains('appointments') ? [] : {}),
              200,
            );
          }
          if (fail) {
            return http.Response('{"detail":"Connexion interrompue"}', 503);
          }
          final body = jsonDecode(request.body);
          expect(body['transcript'], 'Transcription sauvegardée');
          expect(body['notes'], 'Notes sauvegardées');
          return http.Response(
            '{"report":{"id":7},"appointment":{"id":42,"status":"COMPLETED"}}',
            201,
          );
        }),
      );
      Get.put(KamWorkspaceController(api: api));
      await TranscriptDraft('kam:42').save('Transcription sauvegardée');
      await TranscriptDraft('kam-notes:42').save('Notes sauvegardées');
      final debrief = Get.put(KamDebriefController(appointmentId: 42));
      await debrief.restored;
      expect(await debrief.generateExecutiveDebrief('IN_NEGOTIATION'), isNull);
      expect(
        await TranscriptDraft('kam:42').read(),
        'Transcription sauvegardée',
      );
      expect(
        await TranscriptDraft('kam-notes:42').read(),
        'Notes sauvegardées',
      );
      fail = false;
      expect(
        (await debrief.generateExecutiveDebrief('IN_NEGOTIATION'))!['id'],
        7,
      );
      expect(await TranscriptDraft('kam:42').read(), '');
      expect(await TranscriptDraft('kam-notes:42').read(), '');
    },
  );
  test('Concurrent generation submits the meeting only once', () async {
    var posts = 0;
    final completion = Completer<http.Response>();
    final api = ApiClient(
      httpClient: MockClient((request) async {
        if (request.method == 'GET') return http.Response('{}', 200);
        posts++;
        return completion.future;
      }),
    );
    Get.put(KamWorkspaceController(api: api));
    final debrief = Get.put(KamDebriefController(appointmentId: 42));
    await debrief.restored;
    await debrief.editNotes('Le client confirme le besoin.');
    final first = debrief.generateExecutiveDebrief('IN_NEGOTIATION');
    expect(await debrief.generateExecutiveDebrief('IN_NEGOTIATION'), isNull);
    completion.complete(
      http.Response(
        '{"report":{"id":7},"appointment":{"id":42,"status":"COMPLETED"}}',
        201,
      ),
    );
    expect((await first)!['id'], 7);
    expect(posts, 1);
  });
}
