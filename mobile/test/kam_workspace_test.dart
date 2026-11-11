import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:onbora_sales/app/core/api/api_client.dart';
import 'package:onbora_sales/app/core/api/api_config.dart';
import 'package:onbora_sales/app/core/storage/session_storage.dart';
import 'package:onbora_sales/app/modules/kam/data/kam_repository.dart';
import 'package:onbora_sales/app/modules/kam/data/kam_meeting_draft.dart';
import 'package:onbora_sales/app/modules/kam/screen/kam_workspace_screen.dart';
import 'package:onbora_sales/app/modules/kam/screen/kam_appointment_screen.dart';
import 'package:onbora_sales/app/modules/kam/screen/widget/kam_workspace_widgets.dart';

const account = <String, dynamic>{
  'id': 'account-42',
  'account_id': '42',
  'account_name': 'Rawbank',
  'conversion_status': 'PROSPECT',
  'sector': 'Banque',
  'location': 'Kinshasa',
};

class WorkspaceApi extends ApiClient {
  final List<(String, dynamic)> writes = [];
  final List<String> reads = [];
  bool fail = false;
  @override
  Future<dynamic> get(
    String path, {
    Map<String, dynamic>? queryParams,
    bool includeAuth = true,
  }) async {
    reads.add(path);
    if (fail) throw ApiException('Indisponible');
    if (path == '/api/kam/accounts/') {
      return {
        'accounts': [account],
      };
    }
    if (path == '/api/kam/portfolio-summary/') {
      return {
        'summary_cards': {
          'b2b_accounts': {'count': 1},
        },
      };
    }
    if (path == '/api/kam/pre-call/42/') {
      return {
        'ai_summary': {
          'overview': {'text': 'Besoin vérifié de connectivité.'},
        },
        'real_needs': [
          {'need': 'Connexion du siège'},
        ],
        'predicted_needs': [
          {'need': 'Sauvegarde à confirmer'},
        ],
      };
    }
    if (path == '/api/kam/appointments/') {
      return {
        'appointments': [
          {
            'id': 7,
            'enterprise_id': 42,
            'enterprise_name': 'Rawbank',
            'title': 'Revue client',
            'status': 'SCHEDULED',
            'scheduled_at': '2026-11-10T10:00:00Z',
          },
        ],
      };
    }
    if (path == '/api/kam/appointments/7/preparation/') {
      return {
        'enterprise_name': 'Rawbank',
        'questions_to_confirm': ['Quels sites faut-il raccorder ?'],
        'account_facts': [
          {'label': 'Secteur', 'value': 'Banque', 'source': 'Fiche entreprise'},
        ],
      };
    }
    if (path == '/api/kam/appointments/purpose-suggestion/') {
      return {
        'suggested_purpose': 'FOLLOW_UP',
        'reason': 'Suivi de la relation client',
      };
    }
    if (path == '/api/kam/feed/') {
      return {
        'results': [
          {
            'id': 'news-1',
            'title': 'Ouverture d’une agence',
            'summary': 'Nouveau site à raccorder.',
            'is_read': false,
            'is_saved': false,
          },
        ],
        'count': 1,
      };
    }
    if (path == '/api/kam/visits/99/') {
      return {'id': 99, 'executive_summary': 'Compte-rendu réel'};
    }
    return {};
  }

  @override
  Future<dynamic> post(
    String path, {
    dynamic body,
    bool includeAuth = true,
  }) async {
    writes.add((path, body));
    if (fail) throw ApiException('Indisponible');
    if (path.endsWith('/report-draft/')) {
      return {
        'draft_token': 'review-token',
        'draft': {
          'executive_summary': 'Le client demande une liaison dédiée au siège.',
          'confirmed_needs': ['Liaison dédiée'],
          'objections_raised': [],
          'actions_todo': [],
          'follow_up_email_draft': '',
        },
      };
    }
    return {
      'report': {'id': 99, 'executive_summary': 'Compte-rendu réel'},
    };
  }
}

void main() {
  setUp(() {
    Get.testMode = true;
    SharedPreferences.setMockInitialValues({});
  });
  tearDown(() async => Get.reset());

  test(
    'account identifiers preserve the web contract and reject malformed IDs',
    () {
      expect(KamRepository.accountId(account), 42);
      expect(KamRepository.accountId({'accountId': '25'}), 25);
      expect(KamRepository.accountId({'id': 'account-3495'}), 3495);
      expect(
        () => KamRepository.accountId({'id': '42-untrusted-99'}),
        throwsFormatException,
      );
    },
  );

  test(
    'authenticated writes use the web endpoint and separate notes from voice',
    () async {
      SharedPreferences.setMockInitialValues({'auth_token': 'test-token'});
      final client = ApiClient(
        httpClient: MockClient((request) async {
          expect(request.url.path, '/api/kam/appointments/7/complete-vocal/');
          expect(request.headers['authorization'], 'Token test-token');
          expect(jsonDecode(request.body), {
            'transcript': 'Parole réelle',
            'notes': 'Note terrain',
            'conversion_status': 'PROSPECT',
          });
          return http.Response('{"report":{"id":99}}', 201);
        }),
      );
      final result = await KamRepository(client)
          .write('appointments/7/complete-vocal', {
            'transcript': 'Parole réelle',
            'notes': 'Note terrain',
            'conversion_status': 'PROSPECT',
          });
      expect(result['report']['id'], 99);
    },
  );

  test(
    'drafts survive reopening and are isolated by user and backend',
    () async {
      ApiConfig.baseUrl = 'https://test.invalid';
      await SessionStorage.saveSession(
        token: 'test',
        email: 'a@example.test',
        role: 'KAM',
        name: 'A',
      );
      final first = (await KamMeetingDraft.open('appointment:7'))!;
      await first.save({'voice': 'Paroles', 'notes': 'Observations'});
      expect(
        (await (await KamMeetingDraft.open('appointment:7'))!.read())['notes'],
        'Observations',
      );
      await SessionStorage.saveSession(
        token: 'test2',
        email: 'b@example.test',
        role: 'KAM',
        name: 'B',
      );
      expect(
        await (await KamMeetingDraft.open('appointment:7'))!.read(),
        isEmpty,
      );
      ApiConfig.baseUrl = 'https://other.invalid';
      expect(
        await (await KamMeetingDraft.open('appointment:7'))!.read(),
        isEmpty,
      );
      await first.clear();
      expect(await first.read(), isEmpty);
    },
  );

  testWidgets('accounts open the real pre-call briefing on a narrow display', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final api = WorkspaceApi();
    Get.put(KamRepository(api));
    await tester.pumpWidget(const MaterialApp(home: KamWorkspaceScreen()));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Rawbank'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Analyse avant rendez-vous'));
    await tester.pumpAndSettle();
    expect(find.text('Besoin vérifié de connectivité.'), findsOneWidget);
    expect(find.text('Besoins réels confirmés'), findsOneWidget);
    expect(api.reads, contains('/api/kam/pre-call/42/'));
    expect(tester.takeException(), isNull);
  });

  testWidgets('appointment preparation displays backend facts and questions', (
    tester,
  ) async {
    Get.put(KamRepository(WorkspaceApi()));
    await tester.pumpWidget(
      const MaterialApp(home: KamWorkspaceScreen(section: KamSection.agenda)),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Rawbank'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Préparer la visite'));
    await tester.tap(find.text('Préparer la visite'));
    await tester.pumpAndSettle();
    expect(find.text('Quels sites faut-il raccorder ?'), findsOneWidget);
    expect(find.text('Banque'), findsOneWidget);
  });

  testWidgets('read and saved news actions persist through the shared API', (
    tester,
  ) async {
    final api = WorkspaceApi();
    Get.put(KamRepository(api));
    await tester.pumpWidget(
      const MaterialApp(home: KamWorkspaceScreen(section: KamSection.news)),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Marquer lu'));
    await tester.pumpAndSettle();
    expect(api.writes.first.$1, '/api/kam/feed/news-1/read/');
    expect(api.writes.first.$2, {'is_read': true});
    await tester.tap(find.text('Enregistrer'));
    await tester.pumpAndSettle();
    expect(api.writes.last.$1, '/api/kam/feed/news-1/save/');
  });

  testWidgets(
    'network failure shows a retry and recovers without a fake empty portfolio',
    (tester) async {
      final api = WorkspaceApi()..fail = true;
      Get.put(KamRepository(api));
      await tester.pumpWidget(const MaterialApp(home: KamWorkspaceScreen()));
      await tester.pumpAndSettle();
      expect(find.text('Réessayer'), findsOneWidget);
      api.fail = false;
      await tester.tap(find.text('Réessayer'));
      await tester.pumpAndSettle();
      expect(find.text('Rawbank'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'Introuvable');
      await tester.pumpAndSettle();
      expect(find.textContaining('Aucun résultat pour'), findsOneWidget);
    },
  );

  testWidgets('empty meeting cannot generate an invented report', (
    tester,
  ) async {
    final api = WorkspaceApi();
    Get.put(KamRepository(api));
    await tester.pumpWidget(
      const MaterialApp(home: KamMeetingScreen(appointment: {'id': 7})),
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Préparer le compte rendu'),
      300,
      scrollable: find
          .descendant(
            of: find.byType(ListView),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    await tester.pumpAndSettle();
    final button = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Préparer le compte rendu'),
    );
    expect(button.onPressed, isNull);
    expect(api.writes, isEmpty);
    expect(find.byIcon(Icons.mic), findsNothing);
  });

  testWidgets('loading uses the report skeleton', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: KamAsyncView(
            load: () => Future<void>.delayed(const Duration(seconds: 1)),
            builder: (_) => const Text('Prêt'),
          ),
        ),
      ),
    );
    await tester.pump(const Duration(seconds: 1));
    await tester.pumpAndSettle();
    expect(find.text('Prêt'), findsOneWidget);
  });

  testWidgets('written notes generate the real appointment report', (
    tester,
  ) async {
    final api = WorkspaceApi();
    Get.put(KamRepository(api));
    await tester.pumpWidget(
      const MaterialApp(home: KamMeetingScreen(appointment: {'id': 7})),
    );
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'Notes ou message'),
      'Le client demande une liaison dédiée au siège.',
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Préparer le compte rendu'),
      300,
      scrollable: find
          .descendant(
            of: find.byType(ListView),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Préparer le compte rendu'));
    await tester.pumpAndSettle();
    expect(api.writes.single.$1, '/api/kam/appointments/7/report-draft/');
    expect(
      api.writes.single.$2['notes'],
      'Le client demande une liaison dédiée au siège.',
    );
    expect(find.text('Relire avant d’enregistrer'), findsOneWidget);
    await tester.enterText(
      find.widgetWithText(TextField, 'Synthèse'),
      'Synthèse corrigée par le KAM.',
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Valider et enregistrer'),
      300,
      scrollable: find
          .descendant(
            of: find.byType(ListView),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Valider et enregistrer'));
    await tester.pumpAndSettle();
    expect(api.writes.last.$1, '/api/kam/appointments/7/report-complete/');
    expect(
      api.writes.last.$2['executive_summary'],
      'Synthèse corrigée par le KAM.',
    );
    expect(find.text('Compte-rendu réel'), findsOneWidget);
  });

  testWidgets('failed report keeps the notes available for retry', (
    tester,
  ) async {
    final api = WorkspaceApi()..fail = true;
    Get.put(KamRepository(api));
    await tester.pumpWidget(
      const MaterialApp(home: KamMeetingScreen(appointment: {'id': 7})),
    );
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'Notes ou message'),
      'Notes terrain à conserver.',
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Préparer le compte rendu'),
      300,
      scrollable: find
          .descendant(
            of: find.byType(ListView),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Préparer le compte rendu'));
    await tester.pumpAndSettle();
    expect(api.writes, hasLength(1));
    expect(
      find.textContaining('Vérifiez votre connexion et réessayez'),
      findsOneWidget,
    );
    expect(
      tester
          .widget<TextField>(find.widgetWithText(TextField, 'Notes ou message'))
          .controller!
          .text,
      'Notes terrain à conserver.',
    );
  });

  testWidgets(
    'appointment creation keeps the web payload and the suggested purpose',
    (tester) async {
      final api = WorkspaceApi();
      Get.put(KamRepository(api));
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: FilledButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const KamAppointmentScreen(accountId: 42),
                  ),
                ),
                child: const Text('Planifier'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Planifier'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byWidgetPredicate(
          (w) => w is TextField && w.decoration?.labelText == 'Objet *',
        ),
        'Revue du compte',
      );
      tester.testTextInput.hide();
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('Créer le rendez-vous'),
        400,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.drag(find.byType(ListView), const Offset(0, -250));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Créer le rendez-vous'));
      await tester.pumpAndSettle();
      expect(api.writes.single.$1, '/api/kam/appointments/');
      expect(api.writes.single.$2['enterprise_id'], 42);
      expect(api.writes.single.$2['title'], 'Revue du compte');
      expect(api.writes.single.$2['visit_purpose'], 'FOLLOW_UP');
      expect(
        DateTime.parse(api.writes.single.$2['scheduled_at']).isUtc,
        isTrue,
      );
    },
  );
}
