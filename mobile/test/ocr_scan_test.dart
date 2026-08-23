import 'package:flutter_test/flutter_test.dart';
import 'package:get/get.dart';
import 'package:onbora_sales/app/common/controller/theme_controller.dart';
import 'package:onbora_sales/app/core/api/api_client.dart';
import 'package:onbora_sales/app/core/storage/session_storage.dart';
import 'package:onbora_sales/app/modules/auth/controller/auth_controller.dart';
import 'package:onbora_sales/app/modules/sales/controller/sales_controller.dart';
import 'package:onbora_sales/app/modules/sales/screen/document_scan_screen.dart';

void main() {
  setUp(() {
    Get.testMode = true;
    Get.reset();
    Get.put<ApiClient>(ApiClient());
    Get.put<SessionStorage>(SessionStorage());
    Get.put<ThemeController>(ThemeController());
    Get.put<AuthController>(AuthController());
    Get.put<SalesController>(SalesController());
  });

  testWidgets('DocumentScanScreen renders header and document type selector', (WidgetTester tester) async {
    await tester.pumpWidget(
      const GetMaterialApp(
        home: DocumentScanScreen(),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Numérisation de Document'), findsOneWidget);
    expect(find.text('Extrait RCCM / NIF'), findsOneWidget);
    expect(find.text('Carte de Visite'), findsOneWidget);
    expect(find.text('Facture / Contrat FAI'), findsOneWidget);
    expect(find.text('Prendre une photo'), findsOneWidget);
    expect(find.text('Valider et Insérer dans le Dossier'), findsOneWidget);
  });

  test('SalesController simulates OCR extraction for RCCM and updates state', () async {
    final controller = Get.find<SalesController>();
    final result = await controller.scanDocument(docType: 'RCCM', companyHint: 'TEST SARL');
    expect(result, isNotNull);
    expect(result!.companyName, 'TEST SARL');
    expect(result.rccm, isNotEmpty);
    expect(controller.lastOcrResult.value, isNotNull);
  });
}
