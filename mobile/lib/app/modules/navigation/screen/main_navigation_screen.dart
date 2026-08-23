import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../controller/main_navigation_controller.dart';
import '../../sales/screen/plaque_map_home_screen.dart';
import '../../sales/screen/sales_home_screen.dart';
import '../../catalog/screen/catalog_screen.dart';
import '../../profile/screen/profile_screen.dart';
import '../../../common/screen/widget/scale_tap.dart';

class _NavItem {
  final IconData icon;
  final String label;

  const _NavItem({required this.icon, required this.label});
}

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

  static const List<_NavItem> _navItems = [
    _NavItem(icon: LucideIcons.mapPin, label: 'Carte & Plaques'),
    _NavItem(icon: LucideIcons.footprints, label: 'Visites Terrain'),
    _NavItem(icon: LucideIcons.layers, label: 'Offres B2B'),
    _NavItem(icon: LucideIcons.user, label: 'Profil'),
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
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.05),
                  blurRadius: 16,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: List.generate(_navItems.length, (index) {
                    final item = _navItems[index];
                    final isSelected = controller.currentIndex.value == index;

                    return ScaleTap(
                      onTap: () => controller.changePage(index),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        color: Colors.transparent,
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 200),
                          transitionBuilder: (child, animation) => FadeTransition(
                            opacity: animation,
                            child: child,
                          ),
                          child: isSelected
                              ? Text(
                                  item.label,
                                  key: ValueKey('text_$index'),
                                  style: TextStyle(
                                    color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF2563EB),
                                    fontWeight: FontWeight.w900,
                                    fontSize: 13,
                                    letterSpacing: -0.2,
                                  ),
                                )
                              : Icon(
                                  item.icon,
                                  key: ValueKey('icon_$index'),
                                  size: 22,
                                  color: isDark ? const Color(0xFF71717A) : const Color(0xFFA1A1AA),
                                ),
                        ),
                      ),
                    );
                  }),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
