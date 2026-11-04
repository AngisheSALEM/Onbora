import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get/get.dart';
import 'package:onbora_sales/app/core/api/api_client.dart';
import 'package:onbora_sales/app/core/theme/app_theme.dart';
import 'package:onbora_sales/app/modules/kam/data/kam_repository.dart';
import 'package:onbora_sales/app/modules/kam/screen/kam_workspace_screen.dart';

class _LayoutApi extends ApiClient {
  @override
  Future<dynamic> get(
    String path, {
    Map<String, dynamic>? queryParams,
    bool includeAuth = true,
  }) async => {
    'count': 2,
    'results': [
      {
        'id': '1',
        'title': 'Expansion du réseau d’agences à Lubumbashi',
        'summary':
            'L’entreprise ouvre deux nouveaux sites. Préparez un échange sur les besoins de connectivité et la continuité des services.',
        'source_name': 'Veille du portefeuille',
        'signal_strength_display': 'Signal fort',
        'is_read': false,
        'is_saved': false,
      },
      {
        'id': '2',
        'title': 'Modernisation des équipements du siège',
        'summary':
            'Un projet d’infrastructure est annoncé. Les besoins techniques restent à confirmer auprès du décideur.',
        'source_name': 'Actualités B2B',
        'signal_strength_display': 'Signal faible',
        'is_read': true,
        'is_saved': true,
      },
    ],
  };
}

void main() {
  setUpAll(() async {
    final regular = FontLoader('SFPro')
      ..addFont(rootBundle.load('assets/fonts/SF-Pro-Text-Regular.otf'));
    await regular.load();
    final icons = FontLoader('MaterialIcons')
      ..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'));
    await icons.load();
  });
  for (final dark in [false, true]) {
    for (final width in [320.0, 768.0]) {
      testWidgets('news layout at $width, dark=$dark, enlarged text', (
        tester,
      ) async {
        Get.testMode = true;
        Get.put(KamRepository(_LayoutApi()));
        addTearDown(Get.reset);
        tester.view.physicalSize = Size(width, width == 320 ? 720 : 1024);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final boundary = GlobalKey();
        await tester.pumpWidget(
          MaterialApp(
            theme: dark ? AppTheme.darkTheme : AppTheme.lightTheme,
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(textScaler: TextScaler.linear(1.3)),
              child: RepaintBoundary(key: boundary, child: child!),
            ),
            home: const KamWorkspaceScreen(section: KamSection.news),
          ),
        );
        await tester.pumpAndSettle();
        expect(
          find.text('Expansion du réseau d’agences à Lubumbashi'),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
        if (const bool.fromEnvironment('KAM_CAPTURE')) {
          await tester.runAsync(() async {
            final render =
                boundary.currentContext!.findRenderObject()
                    as RenderRepaintBoundary;
            final image = await render.toImage();
            final bytes = await image.toByteData(
              format: ui.ImageByteFormat.png,
            );
            final dir = await Directory(
              'build/kam-previews',
            ).create(recursive: true);
            await File(
              '${dir.path}/news-${dark ? 'dark' : 'light'}-${width.toInt()}.png',
            ).writeAsBytes(bytes!.buffer.asUint8List());
            image.dispose();
          });
        }
      });
    }
  }
}
