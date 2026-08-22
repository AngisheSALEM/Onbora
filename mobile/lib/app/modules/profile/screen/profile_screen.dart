import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../controller/profile_controller.dart';
import '../../sales/controller/sales_controller.dart';
import '../../../routes/app_routes.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';
import '../../../common/screen/widget/aurora_background.dart';
import '../../../common/screen/widget/glass_card.dart';

/// Page Profil Épurée : Deux listes principales (Rapports rédigés avec l'IA & Visites enregistrées)
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<ProfileController>();
    final salesController = Get.find<SalesController>();
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final user = controller.authController.currentUser;

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'Profil',
          style: TextStyle(
            color: isDark ? Colors.white : AppConstants.textDark,
            fontWeight: FontWeight.w900,
            fontSize: 18,
            letterSpacing: -0.3,
          ),
        ),
      ),
      body: AuroraBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            physics: const ClampingScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              AppConstants.paddingLg,
              8,
              AppConstants.paddingLg,
              AppConstants.paddingXl,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. En-tête Utilisateur Simple
                GlassCard(
                  padding: const EdgeInsets.all(16),
                  borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleCard),
                  child: Row(
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF222228) : const Color(0xFF18181B),
                          borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
                        ),
                        child: const Center(
                          child: Icon(LucideIcons.user, size: 28, color: Colors.white),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user?.displayName ?? 'Commercial Terrain',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 16,
                                color: isDark ? Colors.white : AppConstants.textDark,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              user?.email ?? 'sales1@orange.cd',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: isDark ? AppConstants.textSecondaryDark : AppConstants.textMuted,
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Orange B2B • ${user?.role ?? "COMMERCIAL"}',
                              style: TextStyle(
                                color: isDark ? Colors.white70 : AppConstants.textSecondaryLight,
                                fontWeight: FontWeight.w800,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // 2. Les Deux Listes Principales
                Text(
                  'Activités & Dossiers',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                ),
                const SizedBox(height: 10),

                // Liste 1 : Rapports faits avec l'IA
                GlassCard(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleCard),
                  onTap: () => Get.toNamed(Routes.VISITS_HISTORY),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E1E24) : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(LucideIcons.fileText, color: isDark ? Colors.white70 : AppConstants.textDark, size: 22),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Rapports faits avec l\'IA',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 15,
                                color: isDark ? Colors.white : AppConstants.textDark,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Obx(() => Text(
                                  '${salesController.kpiReportsCount.value} rapports et comptes-rendus générés',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                                  ),
                                )),
                          ],
                        ),
                      ),
                      Icon(
                        LucideIcons.chevronRight,
                        color: isDark ? AppConstants.textSecondaryDark : AppConstants.textMuted,
                        size: 20,
                      ),
                    ],
                  ),
                ),

                // Liste 2 : Visites enregistrées
                GlassCard(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleCard),
                  onTap: () => Get.toNamed(Routes.VISITS_HISTORY),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E1E24) : const Color(0xFFF0FDF4),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(LucideIcons.calendarCheck, color: AppConstants.successGreen, size: 22),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Visites enregistrées',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 15,
                                color: isDark ? Colors.white : AppConstants.textDark,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Obx(() => Text(
                                  '${salesController.kpiVisitsCount.value} visites terrain enregistrées',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                                  ),
                                )),
                          ],
                        ),
                      ),
                      Icon(
                        LucideIcons.chevronRight,
                        color: isDark ? AppConstants.textSecondaryDark : AppConstants.textMuted,
                        size: 20,
                      ),
                    ],
                  ),
                ),

                // Liste 3 : Classement & Primes Dénicheurs
                GlassCard(
                  margin: const EdgeInsets.only(bottom: 24),
                  padding: const EdgeInsets.all(16),
                  borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleCard),
                  onTap: () => Get.toNamed(Routes.LEADERBOARD),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF2563EB).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(LucideIcons.trophy, color: Color(0xFF2563EB), size: 22),
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
                                    'Classement Dénicheurs',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 15,
                                      color: isDark ? Colors.white : AppConstants.textDark,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF10B981),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    'Rang #2',
                                    style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Obx(() {
                              final pts = salesController.userTotalPoints.value > 0 ? salesController.userTotalPoints.value : 320;
                              return Text(
                                '$pts points accumulés • Voir le barème des primes',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                                ),
                              );
                            }),
                          ],
                        ),
                      ),
                      Icon(
                        LucideIcons.chevronRight,
                        color: isDark ? AppConstants.textSecondaryDark : AppConstants.textMuted,
                        size: 20,
                      ),
                    ],
                  ),
                ),

                // 3. Paramètres Thème Sombre
                GlassCard(
                  padding: const EdgeInsets.all(12),
                  borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleCard),
                  child: Obx(() {
                    final themeCtrl = controller.themeController;
                    return SwitchListTile(
                      value: themeCtrl.isDarkMode,
                      activeThumbColor: const Color(0xFF2563EB),
                      activeTrackColor: const Color(0xFF2563EB).withValues(alpha: 0.3),
                      onChanged: (_) => themeCtrl.toggleTheme(),
                      title: Text(
                        'Mode Sombre (OLED)',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: isDark ? Colors.white : AppConstants.textDark,
                        ),
                      ),
                      secondary: Icon(
                        themeCtrl.isDarkMode ? LucideIcons.moon : LucideIcons.sun,
                        color: isDark ? Colors.white70 : AppConstants.textDark,
                        size: 20,
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 24),

                // 4. Bouton Déconnexion
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ScaleTap(
                    child: OutlinedButton.icon(
                      onPressed: () => controller.logout(),
                      icon: const Icon(LucideIcons.logOut, color: AppConstants.errorRed, size: 18),
                      label: const Text(
                        'Se Déconnecter',
                        style: TextStyle(color: AppConstants.errorRed, fontWeight: FontWeight.w800),
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
              ],
            ),
          ),
        ),
      ),
    );
  }
}
