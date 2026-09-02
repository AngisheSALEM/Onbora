// ignore_for_file: constant_identifier_names

import 'package:get/get.dart';
import 'app_routes.dart';
import '../modules/auth/binding/auth_binding.dart';
import '../modules/auth/screen/login_screen.dart';
import '../modules/navigation/binding/main_navigation_binding.dart';
import '../modules/navigation/screen/main_navigation_screen.dart';
import '../modules/sales/binding/sales_binding.dart';
import '../modules/sales/binding/dictaphone_binding.dart';
import '../modules/sales/binding/enterprise_search_binding.dart';
import '../modules/sales/binding/visit_prep_binding.dart';
import '../modules/sales/binding/visit_report_binding.dart';
import '../modules/sales/screen/sales_home_screen.dart';
import '../modules/sales/screen/enterprise_search_screen.dart';
import '../modules/sales/screen/visit_preparation_screen.dart';
import '../modules/sales/screen/dictaphone_recording_screen.dart';
import '../modules/sales/screen/visit_report_detail_screen.dart';
import '../modules/sales/screen/visits_history_screen.dart';
import '../modules/catalog/binding/catalog_binding.dart';
import '../modules/catalog/screen/catalog_screen.dart';
import '../modules/profile/binding/profile_binding.dart';
import '../modules/profile/screen/profile_screen.dart';

import '../modules/sales/screen/leaderboard_screen.dart';
import '../modules/sales/screen/field_intelligence_screen.dart';
import '../modules/sales/screen/document_scan_screen.dart';
import '../modules/sales/screen/visit_form_screen.dart';

// Modules KAM (Grands Comptes)
import '../modules/kam/binding/kam_binding.dart';
import '../modules/kam/binding/kam_navigation_binding.dart';
import '../modules/kam/screen/kam_main_navigation_screen.dart';
import '../modules/kam/screen/kam_home_screen.dart';
import '../modules/kam/screen/kam_briefing_screen.dart';
import '../modules/kam/screen/kam_debrief_screen.dart';
import '../modules/kam/screen/kam_account_detail_screen.dart';

class AppPages {
  static const INITIAL = Routes.LOGIN;

  static final routes = [
    GetPage(
      name: Routes.LOGIN,
      page: () => const LoginScreen(),
      binding: AuthBinding(),
    ),
    GetPage(
      name: Routes.MAIN_NAVIGATION,
      page: () => const MainNavigationScreen(),
      binding: MainNavigationBinding(),
    ),
    GetPage(
      name: Routes.SALES_HOME,
      page: () => const SalesHomeScreen(),
      binding: SalesBinding(),
    ),
    GetPage(
      name: Routes.ENTERPRISE_SEARCH,
      page: () => const EnterpriseSearchScreen(),
      binding: EnterpriseSearchBinding(),
      transition: Transition.rightToLeftWithFade,
      transitionDuration: const Duration(milliseconds: 200),
    ),
    GetPage(
      name: Routes.VISIT_PREPARATION,
      page: () => const VisitPreparationScreen(),
      binding: VisitPrepBinding(),
      transition: Transition.rightToLeftWithFade,
      transitionDuration: const Duration(milliseconds: 200),
    ),
    GetPage(
      name: Routes.DICTAPHONE,
      page: () => const DictaphoneRecordingScreen(),
      binding: DictaphoneBinding(),
      transition: Transition.rightToLeftWithFade,
      transitionDuration: const Duration(milliseconds: 200),
    ),
    GetPage(
      name: Routes.VISIT_REPORT_DETAIL,
      page: () => const VisitReportDetailScreen(),
      binding: VisitReportBinding(),
      transition: Transition.rightToLeftWithFade,
      transitionDuration: const Duration(milliseconds: 200),
    ),
    GetPage(
      name: Routes.VISITS_HISTORY,
      page: () => const VisitsHistoryScreen(),
      binding: SalesBinding(),
      transition: Transition.rightToLeftWithFade,
      transitionDuration: const Duration(milliseconds: 200),
    ),
    GetPage(
      name: Routes.LEADERBOARD,
      page: () => const LeaderboardScreen(),
      binding: SalesBinding(),
      transition: Transition.rightToLeftWithFade,
      transitionDuration: const Duration(milliseconds: 200),
    ),
    GetPage(
      name: Routes.FIELD_INTELLIGENCE,
      page: () => const FieldIntelligenceScreen(),
      binding: SalesBinding(),
      transition: Transition.rightToLeftWithFade,
      transitionDuration: const Duration(milliseconds: 200),
    ),
    GetPage(
      name: Routes.DOCUMENT_SCAN,
      page: () => const DocumentScanScreen(),
      binding: SalesBinding(),
      transition: Transition.rightToLeftWithFade,
      transitionDuration: const Duration(milliseconds: 200),
    ),
    GetPage(
      name: Routes.VISIT_FORM,
      page: () => const VisitFormScreen(),
      binding: SalesBinding(),
      transition: Transition.rightToLeftWithFade,
      transitionDuration: const Duration(milliseconds: 200),
    ),
    GetPage(
      name: Routes.CATALOG,
      page: () => const CatalogScreen(),
      binding: CatalogBinding(),
    ),
    GetPage(
      name: Routes.PROFILE,
      page: () => const ProfileScreen(),
      binding: ProfileBinding(),
    ),
    // Routes KAM (Grands Comptes)
    GetPage(
      name: Routes.KAM_NAVIGATION,
      page: () => const KamMainNavigationScreen(),
      binding: KamNavigationBinding(),
    ),
    GetPage(
      name: Routes.KAM_HOME,
      page: () => const KamHomeScreen(),
      binding: KamBinding(),
    ),
    GetPage(
      name: Routes.KAM_BRIEFING,
      page: () => const KamBriefingScreen(),
      binding: KamBinding(),
      transition: Transition.rightToLeftWithFade,
      transitionDuration: const Duration(milliseconds: 200),
    ),
    GetPage(
      name: Routes.KAM_DEBRIEF,
      page: () => const KamDebriefScreen(),
      binding: KamBinding(),
      transition: Transition.rightToLeftWithFade,
      transitionDuration: const Duration(milliseconds: 200),
    ),
    GetPage(
      name: Routes.KAM_ACCOUNT_DETAIL,
      page: () => const KamAccountDetailScreen(),
      binding: KamBinding(),
      transition: Transition.rightToLeftWithFade,
      transitionDuration: const Duration(milliseconds: 200),
    ),
  ];
}
