import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/profile_controller.dart';
import '../../sales/controller/sales_controller.dart';
import '../../../routes/app_routes.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';
import '../../../common/screen/widget/apple_large_title_sliver_app_bar.dart';

import 'widget/memoji_picker_modal.dart';

/// Page Profil : Grand Titre iOS « Profil », Deux listes d'activités, Dark mode & Déconnexion
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<ProfileController>();
    final salesController = Get.isRegistered<SalesController>() ? Get.find<SalesController>() : null;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final user = controller.authController.currentUser;

    return Scaffold(
      backgroundColor: isDark ? AppConstants.backgroundDark : AppConstants.backgroundLight,
      body: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(
          parent: BouncingScrollPhysics(),
        ),
        slivers: [
          // 1. Collapsible Large Title (Apple Music Scroll Animation)
          AppleLargeTitleSliverAppBar(
            title: 'Profil',
            actions: [
              Padding(
                padding: const EdgeInsets.only(right: 14),
                child: ScaleTap(
                  onTap: () => MemojiPickerModal.show(context, isDark: isDark),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                      borderRadius: BorderRadius.circular(AppConstants.borderRadiusPill),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          CupertinoIcons.pencil,
                          size: 13,
                          color: isDark ? Colors.white : AppConstants.textDark,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Avatar',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: isDark ? Colors.white : AppConstants.textDark,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),

          // 2. Profile Content
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(
              AppConstants.paddingLg,
              8,
              AppConstants.paddingLg,
              100,
            ),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // En-tête Utilisateur avec Memoji Circulaire
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                      width: 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      ScaleTap(
                        onTap: () => MemojiPickerModal.show(context, isDark: isDark),
                        child: Stack(
                          children: [
                            Container(
                              width: 58,
                              height: 58,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: Colors.transparent,
                              ),
                              child: Obx(() => ClipOval(
                                    child: Image.asset(
                                      controller.currentAvatar.value,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => const Icon(
                                        CupertinoIcons.person_crop_circle_fill,
                                        size: 58,
                                        color: Color(0xFF8E8E93),
                                      ),
                                    ),
                                  )),
                            ),
                            Positioned(
                              right: 0,
                              bottom: 0,
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                  color: isDark ? Colors.white : AppConstants.primaryBlack,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
                                    width: 2,
                                  ),
                                ),
                                child: Icon(
                                  CupertinoIcons.pencil,
                                  size: 10,
                                  color: isDark ? Colors.black : Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user?.displayName ?? 'Commercial Orange B2B',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: isDark ? Colors.white : AppConstants.textDark,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              user?.email ?? 'commercial@orange-b2b.cd',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 13,
                                color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                'ORANGE B2B • COMMERCIAL TERRAIN (PME)',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.2,
                                  color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF4B5563),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Section Titre : Activités & Dossiers
                Text(
                  'Activités & Dossiers Terrain',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                ),
                const SizedBox(height: 12),

                // Liste 1 : Comptes-rendus de visite
                ScaleTap(
                  onTap: () => Get.toNamed(Routes.VISITS_HISTORY),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                        width: 1,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            CupertinoIcons.doc_text_fill,
                            color: isDark ? Colors.white : AppConstants.textDark,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Comptes-rendus de visite',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? Colors.white : AppConstants.textDark,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${salesController?.kpiReportsCount.value ?? 12} comptes-rendus rédigés',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(
                          CupertinoIcons.chevron_right,
                          color: Color(0xFF8E8E93),
                          size: 16,
                        ),
                      ],
                    ),
                  ),
                ),

                // Liste 2 : Rendez-vous terrain
                ScaleTap(
                  onTap: () => Get.toNamed(Routes.VISITS_HISTORY),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                        width: 1,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            CupertinoIcons.calendar,
                            color: isDark ? Colors.white : AppConstants.textDark,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Rendez-vous terrain',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? Colors.white : AppConstants.textDark,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${salesController?.kpiVisitsCount.value ?? 3} visites planifiées et effectuées',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(
                          CupertinoIcons.chevron_right,
                          color: Color(0xFF8E8E93),
                          size: 16,
                        ),
                      ],
                    ),
                  ),
                ),

                // Liste 3 : Classement & Primes Dénicheurs
                ScaleTap(
                  onTap: () => Get.toNamed(Routes.LEADERBOARD),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 24),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                        width: 1,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            CupertinoIcons.rosette,
                            color: isDark ? Colors.white : AppConstants.textDark,
                            size: 22,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      'Performance Terrain & Primes',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w700,
                                        color: isDark ? Colors.white : AppConstants.textDark,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF10B981),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      'Rang #2',
                                      style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${salesController?.userTotalPoints.value ?? 18} points cumulés • Voir le barème & primes',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(
                          CupertinoIcons.chevron_right,
                          color: Color(0xFF8E8E93),
                          size: 16,
                        ),
                      ],
                    ),
                  ),
                ),

                // 4. Paramètres Thème Sombre
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                      width: 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Obx(() {
                    final themeCtrl = controller.themeController;
                    return Row(
                      children: [
                        Icon(
                          themeCtrl.isDarkMode ? CupertinoIcons.moon_fill : CupertinoIcons.sun_max_fill,
                          color: const Color(0xFF8E8E93),
                          size: 20,
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Text(
                            'Mode Sombre (OLED)',
                            style: TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w600,
                              color: isDark ? Colors.white : AppConstants.textDark,
                            ),
                          ),
                        ),
                        Switch.adaptive(
                          value: themeCtrl.isDarkMode,
                          activeTrackColor: isDark ? Colors.white : AppConstants.primaryBlack,
                          activeThumbColor: isDark ? Colors.black : Colors.white,
                          onChanged: (_) => themeCtrl.toggleTheme(),
                        ),
                      ],
                    );
                  }),
                ),
                const SizedBox(height: 24),

                // 5. Bouton Déconnexion
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ScaleTap(
                    child: OutlinedButton.icon(
                      onPressed: () => controller.logout(),
                      icon: const Icon(CupertinoIcons.square_arrow_left, color: AppConstants.errorRed, size: 18),
                      label: const Text(
                        'Se Déconnecter',
                        style: TextStyle(color: AppConstants.errorRed, fontWeight: FontWeight.w700),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppConstants.errorRed, width: 1.2),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton),
                        ),
                      ),
                    ),
                  ),
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}
