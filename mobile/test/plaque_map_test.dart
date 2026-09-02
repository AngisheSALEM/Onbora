import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:onbora_sales/app/common/constants/app_constants.dart';
import 'package:onbora_sales/app/common/controller/theme_controller.dart';
import 'package:onbora_sales/app/core/api/api_client.dart';
import 'package:onbora_sales/app/core/storage/session_storage.dart';
import 'package:onbora_sales/app/modules/auth/controller/auth_controller.dart';
import 'package:onbora_sales/app/modules/catalog/controller/catalog_controller.dart';
import 'package:onbora_sales/app/modules/catalog/screen/catalog_screen.dart';
import 'package:onbora_sales/app/modules/navigation/controller/main_navigation_controller.dart';
import 'package:onbora_sales/app/modules/navigation/screen/main_navigation_screen.dart';
import 'package:onbora_sales/app/modules/profile/controller/profile_controller.dart';
import 'package:onbora_sales/app/modules/profile/screen/profile_screen.dart';
import 'package:onbora_sales/app/modules/sales/controller/sales_controller.dart';
import 'package:onbora_sales/app/modules/sales/screen/plaque_map_home_screen.dart';
import 'package:onbora_sales/app/modules/sales/screen/sales_home_screen.dart';
import 'package:onbora_sales/app/modules/sales/screen/enterprise_search_screen.dart';
import 'package:onbora_sales/app/modules/sales/screen/leaderboard_screen.dart';
import 'package:onbora_sales/app/modules/sales/screen/widget/credit_risk_badge.dart';
import 'package:onbora_sales/app/modules/catalog/screen/widget/roi_simulator_modal.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    Get.testMode = true;
    Get.reset();
    Get.put<ApiClient>(ApiClient());
    Get.put<SessionStorage>(SessionStorage());
    Get.put<ThemeController>(ThemeController());
    Get.put<AuthController>(AuthController());
    Get.put<SalesController>(SalesController());
    Get.put<CatalogController>(CatalogController());
    Get.put<ProfileController>(ProfileController());
    Get.put<MainNavigationController>(MainNavigationController());
  });

  testWidgets('MainNavigationScreen displays navigation bar', (WidgetTester tester) async {
    await tester.pumpWidget(
      const GetMaterialApp(
        home: MainNavigationScreen(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Accueil'), findsOneWidget);
    expect(find.text('Map'), findsWidgets);
    expect(find.text('Catalogue'), findsWidgets);
    expect(find.text('Profil'), findsWidgets);
  });

  testWidgets('PlaqueMapHomeScreen renders Map title', (WidgetTester tester) async {
    await tester.pumpWidget(
      const GetMaterialApp(
        home: PlaqueMapHomeScreen(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Map'), findsOneWidget);
  });

  testWidgets('SalesHomeScreen renders clean header without redundant search bar', (WidgetTester tester) async {
    await tester.pumpWidget(
      const GetMaterialApp(
        home: SalesHomeScreen(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Rendez-vous'), findsOneWidget);
    expect(find.text(AppConstants.recentVisitsTitle), findsOneWidget);
  });

  testWidgets('CatalogScreen renders Orange B2B catalog title', (WidgetTester tester) async {
    await tester.pumpWidget(
      const GetMaterialApp(
        home: CatalogScreen(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text(AppConstants.catalogTitle), findsWidgets);
    expect(find.text('Rechercher une offre...'), findsOneWidget);
  });

  testWidgets('ProfileScreen renders 2 clean lists and OLED switch', (WidgetTester tester) async {
    await tester.pumpWidget(
      const GetMaterialApp(
        home: ProfileScreen(),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Profil'), findsWidgets);
    expect(find.text('Comptes-rendus de visite'), findsOneWidget);
    expect(find.text('Rendez-vous terrain'), findsOneWidget);
    expect(find.text('Mode Sombre (OLED)'), findsOneWidget);
  });

  testWidgets('EnterpriseSearchScreen renders with search title without B2B and OK badge', (WidgetTester tester) async {
    await tester.pumpWidget(
      const GetMaterialApp(
        home: EnterpriseSearchScreen(),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Recherche'), findsWidgets);
    expect(find.text('RAWBANK RDC'), findsOneWidget);
    expect(find.text('OK'), findsWidgets);
    expect(find.text('À convertir'), findsWidgets);
  });

  testWidgets('LeaderboardScreen renders podium, points and incentive guide', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      const GetMaterialApp(
        home: LeaderboardScreen(),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Classement'), findsWidgets);
    expect(find.text('Barème des Primes & Points'), findsOneWidget);
    expect(find.text('Pré-conversion réussie (RCCM / KYC)'), findsOneWidget);
  });

  testWidgets('CreditRiskBadge renders AAA rating label', (WidgetTester tester) async {
    await tester.pumpWidget(
      const GetMaterialApp(
        home: Scaffold(
          body: CreditRiskBadge(rating: 'AAA'),
        ),
      ),
    );
    expect(find.textContaining('AAA'), findsOneWidget);
    expect(find.textContaining('Solvable'), findsOneWidget);
  });

  testWidgets('RoiSimulatorModal renders sliders and pricing calculation', (WidgetTester tester) async {
    await tester.pumpWidget(
      const GetMaterialApp(
        home: Scaffold(
          body: RoiSimulatorModal(),
        ),
      ),
    );
    expect(find.text('Simulateur ROI Express'), findsOneWidget);
    expect(find.text('Collaborateurs / Postes'), findsOneWidget);
    expect(find.text('Débit Fibre Optique Pro'), findsOneWidget);
    expect(find.text('Partager WhatsApp'), findsOneWidget);
    expect(find.text('Signer l\'Accord'), findsOneWidget);
  });
}
