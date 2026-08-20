import 'package:flutter_test/flutter_test.dart';
import 'package:onbora_sales/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const OnboraSalesApp());
    expect(find.byType(OnboraSalesApp), findsOneWidget);
  });
}
