import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../profile/controller/profile_controller.dart';
import '../../profile/screen/widget/memoji_picker_modal.dart';
import '../controller/kam_controller.dart';
import '../controller/kam_navigation_controller.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';
import '../../../common/screen/widget/apple_large_title_sliver_app_bar.dart';

/// Page Profil Dédiée au Key Account Manager (Grands Comptes)
class KamProfileScreen extends StatelessWidget {
  const KamProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final profileCtrl = Get.isRegistered<ProfileController>()
        ? Get.find<ProfileController>()
        : Get.put(ProfileController());
    final kamCtrl = Get.isRegistered<KamController>()
        ? Get.find<KamController>()
        : Get.put(KamController());
    final kamNavCtrl = Get.isRegistered<KamNavigationController>()
        ? Get.find<KamNavigationController>()
        : null;

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final user = profileCtrl.authController.currentUser;

    return Scaffold(
      backgroundColor: isDark ? AppConstants.backgroundDark : AppConstants.backgroundLight,
      body: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(
          parent: BouncingScrollPhysics(),
        ),
        slivers: [
          // 1. Collapsible Large Title (Apple Music Scroll Animation)
          AppleLargeTitleSliverAppBar(
            title: 'Profil KAM',
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
                                      profileCtrl.currentAvatar.value,
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
                              user?.displayName ?? 'Key Account Manager Orange',
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
                              user?.email ?? 'kam1@orange-b2b.cd',
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
                                'ORANGE B2B • KEY ACCOUNT MANAGER (GRANDS COMPTES)',
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

                // Section Titre : Indicateurs & Portefeuille C-Level
                Text(
                  'Portefeuille & Stratégie C-Level',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                ),
                const SizedBox(height: 12),

                // Item 1 : Portefeuille Grands Comptes
                ScaleTap(
                  onTap: () => kamNavCtrl?.changePage(0),
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
                            CupertinoIcons.building_2_fill,
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
                                'Portefeuille Grands Comptes',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? Colors.white : AppConstants.textDark,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Obx(() => Text(
                                    '${kamCtrl.allAccounts.length} comptes stratégiques sous gestion',
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                                    ),
                                  )),
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

                // Item 2 : Briefings IA Stratégiques
                ScaleTap(
                  onTap: () => kamNavCtrl?.changePage(1),
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
                                'Synthèses & Briefings Stratégiques',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? Colors.white : AppConstants.textDark,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Analyses IA et propositions de valeur C-Level',
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

                // Item 3 : Débriefings & Suivi Décideurs
                ScaleTap(
                  onTap: () => kamNavCtrl?.changePage(2),
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
                            CupertinoIcons.waveform,
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
                                'Débriefings & Retours Comités',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? Colors.white : AppConstants.textDark,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Comptes-rendus exécutifs & plans d\'action',
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

                // Item 4 : Pipeline & Chiffre d'Affaires ARR
                Container(
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
                          CupertinoIcons.chart_bar_alt_fill,
                          color: isDark ? Colors.white : AppConstants.textDark,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  'Pipeline ARR B2B',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? Colors.white : AppConstants.textDark,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF10B981),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    '105% Obj.',
                                    style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '480 000 \$ ARR sous gestion • Objectif annuel validé',
                              style: TextStyle(
                                fontSize: 12.5,
                                color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // 5. Paramètres Thème Sombre
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
                    final themeCtrl = profileCtrl.themeController;
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

                // 6. Bouton Déconnexion
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ScaleTap(
                    child: OutlinedButton.icon(
                      onPressed: () => profileCtrl.logout(),
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
