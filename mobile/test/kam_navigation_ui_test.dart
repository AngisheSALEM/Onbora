import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:onbora_sales/app/core/api/api_client.dart';
import 'package:onbora_sales/app/core/theme/app_theme.dart';
import 'package:onbora_sales/app/modules/kam/controller/kam_workspace_controller.dart';
import 'package:onbora_sales/app/modules/kam/screen/kam_main_navigation_screen.dart';
import 'package:onbora_sales/app/common/screen/widget/visit_report_document.dart';

void main() {
  setUpAll(() async {
    await initializeDateFormatting('fr_FR');
    final font = FontLoader('SFPro')
      ..addFont(rootBundle.load('assets/fonts/SF-Pro-Text-Regular.otf'))
      ..addFont(rootBundle.load('assets/fonts/SF-Pro-Text-Semibold.otf'))
      ..addFont(rootBundle.load('assets/fonts/SF-Pro-Display-Bold.otf'));
    await font.load();
    await (FontLoader('packages/cupertino_icons/CupertinoIcons')..addFont(
          rootBundle.load('packages/cupertino_icons/assets/CupertinoIcons.ttf'),
        ))
        .load();
  });
  setUp(() {
    Get.reset();
    Get.testMode = true;
    SharedPreferences.setMockInitialValues({});
  });
  tearDown(() => Get.reset());
  const account = {
    'account_id': '42',
    'account_name': 'Rawbank RDC',
    'crm_id': 'CRM-CD-0042',
    'location': 'Gombe, Kinshasa',
    'status_label': 'En négociation',
    'conversion_status': 'IN_NEGOTIATION',
  };
  const report = {
    'id': 7,
    'enterprise_name': 'Rawbank RDC',
    'created_at': '2026-09-30T10:00:00Z',
    'executive_summary':
        'Le client souhaite fiabiliser les connexions de ses trois sites. La proposition devra préciser les garanties de disponibilité.',
    'confirmed_needs': ['Fibre dédiée pour le siège', 'Lien de secours'],
    'actions_todo': [
      'Préparer une proposition et confirmer le budget avec la direction.',
    ],
    'raw_transcript':
        'Nous souhaitons une connexion plus stable pour nos trois sites.',
    'follow_up_email_draft':
        'Bonjour, voici les points convenus lors de notre échange.',
    'visit_purpose_label': 'Suivi client',
  };
  const appointment = {
    'id': 12,
    'enterprise_id': 42,
    'enterprise_name': 'Rawbank RDC',
    'title': 'Revue des engagements',
    'scheduled_at': '2026-10-01T09:00:00Z',
    'meeting_type_label': 'Visite sur place',
    'status': 'SCHEDULED',
    'status_label': 'Planifié',
  };

  testWidgets(
    'KAM tabs swipe through agenda and history, report opens with one primary action',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final api = ApiClient(
        httpClient: MockClient((request) async {
          final dynamic data;
          switch (request.url.path) {
            case '/api/kam/accounts/':
              data = {
                'accounts': [account],
              };
            case '/api/kam/appointments/':
              data = [appointment];
            case '/api/kam/visits/':
              data = {
                'visits': [report],
              };
            case '/api/kam/visits/7/':
              data = report;
            default:
              data = {};
          }
          return http.Response.bytes(utf8.encode(jsonEncode(data)), 200);
        }),
      );
      Get.put<ApiClient>(api);
      Get.put(KamWorkspaceController(api: api));
      const key = ValueKey('mobile-proof');
      await tester.pumpWidget(
        GetMaterialApp(
          theme: AppTheme.lightTheme,
          home: const RepaintBoundary(
            key: key,
            child: KamMainNavigationScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Mes comptes'), findsOneWidget);
      expect(find.text('Rawbank RDC'), findsOneWidget);
      expect(find.byType(FilledButton), findsOneWidget);
      await _proof(tester, key, 'onbora-mobile-kam.png');
      await tester.dragFrom(const Offset(330, 390), const Offset(-300, 0));
      await tester.pumpAndSettle();
      expect(find.text('Agenda').hitTestable(), findsOneWidget);
      expect(
        find.text('Revue des engagements').hitTestable(),
        findsNothing,
      ); // row combines title with date and format.
      expect(
        find.textContaining('Revue des engagements').hitTestable(),
        findsOneWidget,
      );
      expect(find.text('Briefing').hitTestable(), findsOneWidget);
      await tester.dragFrom(const Offset(330, 390), const Offset(-300, 0));
      await tester.pumpAndSettle();
      expect(find.text('Mes visites').hitTestable(), findsOneWidget);
      await tester.tap(find.text('Rawbank RDC').hitTestable());
      await tester.pumpAndSettle();
      expect(find.byType(VisitReportDocument), findsOneWidget);
      expect(find.byType(FilledButton), findsOneWidget);
      expect(find.byType(Icon), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('Report visual proof uses the real app theme and readable type', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    const key = ValueKey('mobile-report-proof');
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: RepaintBoundary(
          key: key,
          child: VisitReportDocument(
            report: report,
            company: 'Rawbank RDC',
            primaryLabel: 'Synchroniser avec le CRM',
            onPrimary: () {},
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await _proof(tester, key, 'onbora-mobile-rapport.png');
    expect(tester.takeException(), isNull);
  });
}

Future<void> _proof(WidgetTester tester, Key key, String name) async {
  final directory = Platform.environment['ONBORA_UI_PROOFS'];
  if (directory == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(find.byKey(key));
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    await File('$directory/$name').writeAsBytes(bytes!.buffer.asUint8List());
    image.dispose();
  });
}
