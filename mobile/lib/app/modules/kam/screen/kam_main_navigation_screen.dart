import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter/services.dart';
import '../controller/kam_navigation_controller.dart';
import '../screen/kam_home_screen.dart';
import '../screen/kam_briefing_screen.dart';
import '../screen/kam_debrief_screen.dart';
import '../screen/kam_profile_screen.dart';
import '../../profile/controller/profile_controller.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';

class _NavItem {
  final IconData? icon;
  final String label;
  final bool isProfile;

  const _NavItem({this.icon, required this.label, this.isProfile = false});
}

/// Écran de Navigation Principal Dédié aux Key Account Managers (Grands Comptes)
class KamMainNavigationScreen extends StatefulWidget {
  const KamMainNavigationScreen({super.key});

  @override
  State<KamMainNavigationScreen> createState() => _KamMainNavigationScreenState();
}

class _KamMainNavigationScreenState extends State<KamMainNavigationScreen> {
  DateTime? _lastBackPressTime;

  final List<Widget> _kamViews = const [
    KamHomeScreen(),
    KamBriefingScreen(),
    KamDebriefScreen(),
    KamProfileScreen(),
  ];

  static const List<_NavItem> _kamNavItems = [
    _NavItem(icon: CupertinoIcons.building_2_fill, label: 'Comptes'),
    _NavItem(icon: CupertinoIcons.doc_text_fill, label: 'Briefing'),
    _NavItem(icon: CupertinoIcons.waveform, label: 'Débrief'),
    _NavItem(label: 'Profil', isProfile: true),
  ];

  @override
  Widget build(BuildContext context) {
    final controller = Get.isRegistered<KamNavigationController>()
        ? Get.find<KamNavigationController>()
        : Get.put(KamNavigationController());
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
              'Onbora KAM',
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
          resizeToAvoidBottomInset: false,
          backgroundColor: isDark ? AppConstants.backgroundDark : AppConstants.backgroundLight,
          body: Stack(
            children: [
              // 1. Vues de contenu avec extension continue de l'arrière-plan
              Positioned.fill(
                child: IndexedStack(
                  index: controller.currentIndex.value < _kamViews.length ? controller.currentIndex.value : 0,
                  children: _kamViews,
                ),
              ),

              // 2. Masque de Dégradé Inférieur
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                height: 120,
                child: IgnorePointer(
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          (isDark ? Colors.black : Colors.white).withValues(alpha: 0.0),
                          (isDark ? Colors.black : Colors.white).withValues(alpha: 0.85),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              // 3. Barre Flottante Inférieure KAM
              Obx(() {
                final isVisible = controller.isTabBarVisible.value;
                final bottomPadding = MediaQuery.of(context).padding.bottom > 0
                    ? MediaQuery.of(context).padding.bottom + 6
                    : 18.0;

                return AnimatedPositioned(
                  duration: const Duration(milliseconds: 280),
                  curve: Curves.easeOutCubic,
                  left: 20,
                  right: 20,
                  bottom: isVisible ? bottomPadding : -100,
                  child: AnimatedOpacity(
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeOut,
                    opacity: isVisible ? 1.0 : 0.0,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(32),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
                        child: Container(
                          height: 68,
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isDark
                                ? const Color(0xCC18181C)
                                : const Color(0xE6FFFFFF),
                            borderRadius: BorderRadius.circular(34),
                            border: Border.all(
                              color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                              width: 1,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.08),
                                blurRadius: 24,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: List.generate(_kamNavItems.length, (index) {
                              final item = _kamNavItems[index];
                              final isSelected = controller.currentIndex.value == index;

                              return Expanded(
                                child: ScaleTap(
                                  onTap: () => controller.changePage(index),
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 200),
                                    curve: Curves.easeOutCubic,
                                    padding: const EdgeInsets.symmetric(vertical: 3, horizontal: 2),
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? (isDark
                                              ? const Color(0x38FFFFFF)
                                              : const Color(0x18000000))
                                          : Colors.transparent,
                                      borderRadius: BorderRadius.circular(22),
                                    ),
                                    child: FittedBox(
                                      fit: BoxFit.scaleDown,
                                      child: Column(
                                        mainAxisSize: MainAxisSize.min,
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          if (item.isProfile)
                                            GetBuilder<ProfileController>(
                                              init: Get.isRegistered<ProfileController>()
                                                  ? Get.find<ProfileController>()
                                                  : Get.put(ProfileController()),
                                              builder: (profileCtrl) {
                                                return Obx(() {
                                                  final avatarPath = profileCtrl.currentAvatar.value;
                                                  return Container(
                                                    width: 25,
                                                    height: 25,
                                                    padding: const EdgeInsets.all(1.2),
                                                    decoration: BoxDecoration(
                                                      shape: BoxShape.circle,
                                                      border: isSelected
                                                          ? Border.all(
                                                              color: isDark
                                                                  ? Colors.white
                                                                  : AppConstants.primaryBlack,
                                                              width: 1.8,
                                                            )
                                                          : Border.all(
                                                              color: Colors.transparent,
                                                              width: 1.8,
                                                            ),
                                                    ),
                                                    child: ClipOval(
                                                      child: Image.asset(
                                                        avatarPath,
                                                        fit: BoxFit.cover,
                                                        errorBuilder: (_, __, ___) => Icon(
                                                          CupertinoIcons.person_crop_circle_fill,
                                                          size: 22,
                                                          color: isSelected
                                                              ? (isDark
                                                                  ? Colors.white
                                                                  : AppConstants.primaryBlack)
                                                              : const Color(0xFF8E8E93),
                                                        ),
                                                      ),
                                                    ),
                                                  );
                                                });
                                              },
                                            )
                                          else
                                            Icon(
                                              item.icon!,
                                              size: 22,
                                              color: isSelected
                                                  ? (isDark ? Colors.white : AppConstants.textDark)
                                                  : const Color(0xFF8E8E93),
                                            ),
                                          const SizedBox(height: 2),
                                          Text(
                                            item.label,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              fontSize: 10.5,
                                              height: 1.1,
                                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                              letterSpacing: -0.2,
                                              color: isSelected
                                                  ? (isDark ? Colors.white : AppConstants.textDark)
                                                  : const Color(0xFF8E8E93),
                                            ),
                                          ),
                                        ],
                                      ),
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
                );
              }),
            ],
          ),
        ),
      ),
    );
  }
}
