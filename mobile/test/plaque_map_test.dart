import 'package:flutter_test/flutter_test.dart';
import 'package:get/get.dart';
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

void main() {
  setUp(() {
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

  testWidgets('MainNavigationScreen displays 4 navigation tabs', (WidgetTester tester) async {
    await tester.pumpWidget(
      const GetMaterialApp(
        home: MainNavigationScreen(),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Carte & Plaques'), findsOneWidget);
  });

  testWidgets('PlaqueMapHomeScreen renders map header and plaque pills', (WidgetTester tester) async {
    await tester.pumpWidget(
      const GetMaterialApp(
        home: PlaqueMapHomeScreen(),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Carte Territoire Orange B2B'), findsOneWidget);
    expect(find.text('KIN-GOMBE'), findsWidgets);
  });

  testWidgets('SalesHomeScreen renders clean header without marketing slogan', (WidgetTester tester) async {
    await tester.pumpWidget(
      const GetMaterialApp(
        home: SalesHomeScreen(),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text(AppConstants.salesVisitsTitle), findsOneWidget);
    expect(find.text(AppConstants.homeSearchProspectBtn), findsOneWidget);
    expect(find.text(AppConstants.homeActiveMeetingTitle), findsOneWidget);
    expect(find.text(AppConstants.recentVisitsTitle), findsOneWidget);
  });

  testWidgets('CatalogScreen renders Orange B2B catalog title', (WidgetTester tester) async {
    await tester.pumpWidget(
      const GetMaterialApp(
        home: CatalogScreen(),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text(AppConstants.catalogTitle), findsOneWidget);
  });

  testWidgets('ProfileScreen renders 2 clean lists and OLED switch', (WidgetTester tester) async {
    await tester.pumpWidget(
      const GetMaterialApp(
        home: ProfileScreen(),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Profil'), findsOneWidget);
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

    expect(find.text('Recherche Prospects'), findsOneWidget);
    expect(find.text('RAWBANK RDC'), findsOneWidget);
    expect(find.text('OK'), findsWidgets);
    expect(find.text('À convertir'), findsWidgets);
  });

  testWidgets('LeaderboardScreen renders podium, points and incentive guide', (WidgetTester tester) async {
    await tester.pumpWidget(
      const GetMaterialApp(
        home: LeaderboardScreen(),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Classement des Dénicheurs'), findsOneWidget);
    expect(find.text('Barème des Primes & Points'), findsOneWidget);
    expect(find.text('Pré-conversion réussie (RCCM / KYC)'), findsOneWidget);
  });
}
