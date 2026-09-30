import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:onbora_sales/app/common/screen/widget/swipe_tab_views.dart';
import 'package:onbora_sales/app/common/screen/widget/visit_report_document.dart';

void main() {
  testWidgets(
    'Swipes and distant tab taps keep selection synchronized and state preserved',
    (tester) async {
      var index = 0;
      var selected = <int>[];
      late StateSetter rebuild;
      await tester.pumpWidget(
        MaterialApp(
          home: StatefulBuilder(
            builder: (context, setState) {
              rebuild = setState;
              return Scaffold(
                body: SwipeTabViews(
                  index: index,
                  onChanged: (i) {
                    selected.add(i);
                    setState(() => index = i);
                  },
                  children: [
                    ListView(
                      children: const [
                        TextField(key: ValueKey('notes')),
                        SizedBox(height: 800),
                      ],
                    ),
                    const Text('Agenda'),
                    const Text('Visites'),
                    const Text('Profil'),
                  ],
                ),
              );
            },
          ),
        ),
      );
      await tester.enterText(find.byType(TextField), 'Brouillon conservé');
      await tester.dragFrom(const Offset(700, 350), const Offset(-650, 0));
      await tester.pumpAndSettle();
      expect(index, 1);
      rebuild(() => index = 3);
      await tester.pumpAndSettle();
      expect(find.text('Profil').hitTestable(), findsOneWidget);
      expect(index, 3);
      expect(selected, [
        1,
      ]); // Programmatic intermediate pages never overwrite the requested tab.
      rebuild(() => index = 0);
      await tester.pumpAndSettle();
      expect(find.text('Brouillon conservé'), findsOneWidget);
    },
  );

  testWidgets('Edge swipes remain available when a map owns centre gestures', (
    tester,
  ) async {
    var index = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: StatefulBuilder(
          builder: (context, setState) => Scaffold(
            body: SwipeTabViews(
              index: index,
              onChanged: (v) => setState(() => index = v),
              children: [
                GestureDetector(
                  onHorizontalDragUpdate: (_) {},
                  child: Container(color: Colors.white),
                ),
                const Text('Catalogue'),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.dragFrom(const Offset(400, 300), const Offset(-300, 0));
    await tester.pumpAndSettle();
    expect(index, 0);
    await tester.dragFrom(const Offset(790, 300), const Offset(-300, 0));
    await tester.pumpAndSettle();
    expect(index, 1);
  });
  for (final width in [320.0, 390.0, 768.0]) {
    for (final dark in [false, true]) {
      testWidgets(
        'Report is readable, icon-free and has one primary action at $width / dark=$dark',
        (tester) async {
          tester.view.physicalSize = Size(width, 844);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          await tester.pumpWidget(
            MaterialApp(
              theme: ThemeData(
                brightness: dark ? Brightness.dark : Brightness.light,
              ),
              home: VisitReportDocument(
                company: 'Entreprise de démonstration',
                primaryLabel: 'Synchroniser avec le CRM',
                onPrimary: () {},
                report: {
                  'executive_summary':
                      'Le client souhaite fiabiliser la connexion de ses trois sites. Le budget doit être confirmé avec la direction.',
                  'confirmed_needs': ['Fibre dédiée', 'Redondance'],
                  'actions_todo': ['Préparer une proposition'],
                  'raw_transcript': 'Le texte de la réunion est conservé.',
                  'follow_up_email_draft':
                      'Bonjour, voici les points convenus.',
                },
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
          expect(find.byType(Icon), findsNothing);
          expect(find.byType(FilledButton), findsOneWidget);
          expect(
            find.text('Synchroniser avec le CRM').hitTestable(),
            findsOneWidget,
          );
          await tester.tap(find.text('Email'));
          await tester.pumpAndSettle();
          expect(
            find.text('Bonjour, voici les points convenus.'),
            findsOneWidget,
          );
          expect(find.byType(Icon), findsNothing);
          await tester.tap(find.text('Transcription'));
          await tester.pumpAndSettle();
          expect(
            find.text('Le texte de la réunion est conservé.'),
            findsOneWidget,
          );
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
}
