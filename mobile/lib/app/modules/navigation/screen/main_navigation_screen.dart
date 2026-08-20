import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter/services.dart';
import '../controller/main_navigation_controller.dart';
import '../../sales/screen/plaque_map_home_screen.dart';
import '../../sales/screen/sales_home_screen.dart';
import '../../catalog/screen/catalog_screen.dart';
import '../../profile/screen/profile_screen.dart';
import '../../../common/constants/app_constants.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  DateTime? _lastBackPressTime;

  final List<Widget> _views = const [
    PlaqueMapHomeScreen(),
    SalesHomeScreen(),
    CatalogScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<MainNavigationController>();
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Obx(
      () => PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, result) {
          if (didPop) return;
          if (controller.currentIndex.value != 0) {
            controller.changePage(0);
            return;
          }
          final now = DateTime.now();
          if (_lastBackPressTime == null || now.difference(_lastBackPressTime!) > const Duration(seconds: 2)) {
            _lastBackPressTime = now;
            Get.snackbar(
              'Onbora',
              'Appuyez à nouveau pour quitter l\'application',
              snackPosition: SnackPosition.BOTTOM,
              duration: const Duration(seconds: 2),
              margin: const EdgeInsets.all(16),
              backgroundColor: isDark ? const Color(0xFF222226) : Colors.black87,
              colorText: Colors.white,
            );
            return;
          }
          SystemNavigator.pop();
        },
        child: Scaffold(
          extendBody: false,
          body: IndexedStack(
            index: controller.currentIndex.value,
            children: _views,
          ),
          bottomNavigationBar: Container(
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF141416) : Colors.white,
              border: Border(
                top: BorderSide(
                  color: isDark ? const Color(0x33FFFFFF) : const Color(0x1A000000),
                  width: 1.0,
                ),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.06),
                  blurRadius: 10,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SafeArea(
              top: false,
              child: BottomNavigationBar(
                currentIndex: controller.currentIndex.value,
                onTap: controller.changePage,
                selectedItemColor: AppConstants.orangeOfficial,
                unselectedItemColor: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                backgroundColor: Colors.transparent,
                elevation: 0,
                type: BottomNavigationBarType.fixed,
                selectedFontSize: 11,
                unselectedFontSize: 11,
                selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w900),
                unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600),
                items: const [
                  BottomNavigationBarItem(
                    icon: Icon(Icons.map_rounded),
                    activeIcon: Icon(Icons.map_rounded),
                    label: 'Carte & Plaques',
                  ),
                  BottomNavigationBarItem(
                    icon: Icon(Icons.directions_run_rounded),
                    activeIcon: Icon(Icons.directions_run_rounded),
                    label: 'Visites Terrain',
                  ),
                  BottomNavigationBarItem(
                    icon: Icon(Icons.inventory_2_rounded),
                    activeIcon: Icon(Icons.inventory_2_rounded),
                    label: 'Offres B2B',
                  ),
                  BottomNavigationBarItem(
                    icon: Icon(Icons.person_rounded),
                    activeIcon: Icon(Icons.person_rounded),
                    label: 'Profil & IA',
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
