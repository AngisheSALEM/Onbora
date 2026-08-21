import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../controller/sales_controller.dart';
import '../../../routes/app_routes.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';
import '../../../common/screen/widget/aurora_background.dart';
import '../../../common/screen/widget/glass_card.dart';

/// Screen 2: Cleaned Up Visits & Ongoing Meetings Screen
/// - Prominent search bar in header (pure, decluttered)
/// - Removed redundant marketing slogan & quick actions grid
/// - Active Meeting card (Rendez-vous Client en Cours) with 1-tap Brief & Dictaphone
/// - Recent visits history section
class SalesHomeScreen extends StatelessWidget {
  const SalesHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final salesController = Get.find<SalesController>();

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF222228) : const Color(0xFFE2E8F0),
                borderRadius: BorderRadius.circular(AppConstants.borderRadiusSm),
                border: Border.all(
                  color: isDark ? const Color(0x33FFFFFF) : const Color(0x1A000000),
                ),
              ),
              child: Center(
                child: Icon(LucideIcons.footprints, color: isDark ? Colors.white : AppConstants.textDark, size: 18),
              ),
            ),
            const SizedBox(width: 10),
            Flexible(
              child: Text(
                AppConstants.salesVisitsTitle,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: isDark ? Colors.white : AppConstants.textDark,
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  letterSpacing: -0.3,
                ),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(LucideIcons.rotateCcw, color: isDark ? Colors.white70 : AppConstants.textDark, size: 18),
            tooltip: 'Réinitialiser la visite',
            onPressed: () {
              if (salesController.selectedEnterprise.value != null) {
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    backgroundColor: isDark ? AppConstants.primaryDark : Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                    title: Text(
                      'Réinitialiser la visite ?',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                        color: isDark ? Colors.white : AppConstants.textDark,
                      ),
                    ),
                    content: Text(
                      'Souhaitez-vous clôturer le dossier en cours et démarrer une nouvelle prospection ?',
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                      ),
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.of(ctx).pop(),
                        child: const Text('Annuler', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                      ),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.of(ctx).pop();
                          salesController.resetFlow();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isDark ? Colors.white : const Color(0xFF18181B),
                          foregroundColor: isDark ? const Color(0xFF121214) : Colors.white,
                        ),
                        child: Text('Réinitialiser', style: TextStyle(color: isDark ? const Color(0xFF121214) : Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                );
              } else {
                salesController.resetFlow();
              }
            },
          ),
        ],
      ),
      body: AuroraBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            physics: const ClampingScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              AppConstants.paddingLg,
              6,
              AppConstants.paddingLg,
              AppConstants.paddingXl,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Prominent Header Search Bar (Apple-Grade Glass)
                ScaleTap(
                  onTap: () => Get.toNamed(Routes.ENTERPRISE_SEARCH),
                  child: GlassCard(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton),
                    child: Row(
                      children: [
                        Icon(LucideIcons.search, color: isDark ? Colors.white70 : AppConstants.textSecondaryLight, size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                AppConstants.homeSearchProspectBtn,
                                style: TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 14,
                                  color: isDark ? Colors.white : AppConstants.textDark,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Rechercher par nom, secteur ou plaque...',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? AppConstants.textSecondaryDark : AppConstants.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF222228) : const Color(0xFFE2E8F0),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(LucideIcons.arrowRight, size: 16, color: isDark ? Colors.white70 : AppConstants.textDark),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 22),

                // 2. Section Title: Active Meeting Flow
                Text(
                  AppConstants.homeActiveMeetingTitle,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.3,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                ),
                const SizedBox(height: 12),

                // 3. Active Meeting Card
                Obx(() {
                  final selected = salesController.selectedEnterprise.value;
                  if (selected == null) {
                    return GlassCard(
                      padding: const EdgeInsets.all(AppConstants.paddingLg),
                      borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleCard),
                      child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1E1E22) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
                            ),
                            child: Icon(
                              LucideIcons.building2,
                              color: isDark ? Colors.white70 : AppConstants.textDark,
                              size: 22,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Aucun rendez-vous en cours',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14,
                                    color: isDark ? Colors.white : AppConstants.textDark,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Sélectionnez un compte sur la carte ou via la recherche pour démarrer une visite.',
                                  style: TextStyle(
                                    color: isDark ? AppConstants.textSecondaryDark : AppConstants.textMuted,
                                    fontSize: 12,
                                    height: 1.35,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  }

                  return GlassCard(
                    padding: const EdgeInsets.all(AppConstants.paddingLg),
                    borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleCard),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Flexible(
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isDark ? const Color(0xFF1E1E22) : const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(AppConstants.borderRadiusPill),
                                ),
                                child: Text(
                                  selected.sector ?? 'Prospect Orange B2B',
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: isDark ? Colors.white : AppConstants.textDark,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppConstants.successGreen.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: const [
                                  Icon(Icons.circle, color: AppConstants.successGreen, size: 7),
                                  SizedBox(width: 4),
                                  Text(
                                    'Visite Active',
                                    style: TextStyle(
                                      color: AppConstants.successGreen,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          selected.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.3,
                            color: isDark ? Colors.white : AppConstants.textDark,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${selected.location ?? "Localisation non renseignée"} • ${selected.approximateSize}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                            fontSize: AppConstants.fontSizeSm,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: ScaleTap(
                                onTap: () => Get.toNamed(Routes.VISIT_PREPARATION),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                                  decoration: BoxDecoration(
                                    color: salesController.currentPrep.value != null
                                        ? (isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF))
                                        : (isDark ? const Color(0xFF27272A) : const Color(0xFFF1F5F9)),
                                    borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        LucideIcons.fileCheck,
                                        size: 16,
                                        color: salesController.currentPrep.value != null
                                            ? (isDark ? const Color(0xFF93C5FD) : const Color(0xFF2563EB))
                                            : (isDark ? Colors.white70 : AppConstants.textDark),
                                      ),
                                      const SizedBox(width: 6),
                                      Flexible(
                                        child: Text(
                                          salesController.currentPrep.value != null ? 'Brief Prêt' : 'Préparer Brief',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w800,
                                            color: salesController.currentPrep.value != null
                                                ? (isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8))
                                                : (isDark ? Colors.white : AppConstants.textDark),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: ScaleTap(
                                child: ElevatedButton.icon(
                                  onPressed: () => Get.toNamed(Routes.DICTAPHONE),
                                  icon: Icon(
                                    LucideIcons.mic,
                                    size: 16,
                                    color: isDark ? const Color(0xFF121214) : Colors.white,
                                  ),
                                  label: FittedBox(
                                    fit: BoxFit.scaleDown,
                                    child: Text(
                                      'Dictaphone',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w900,
                                        color: isDark ? const Color(0xFF121214) : Colors.white,
                                      ),
                                    ),
                                  ),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: isDark ? Colors.white : const Color(0xFF18181B),
                                    foregroundColor: isDark ? const Color(0xFF121214) : Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                }),
                const SizedBox(height: 26),

                // 4. Section Title: Historique Récent des Visites
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      AppConstants.recentVisitsTitle,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.3,
                        color: isDark ? Colors.white : AppConstants.textDark,
                      ),
                    ),
                    ScaleTap(
                      onTap: () => Get.toNamed(Routes.VISITS_HISTORY),
                      child: Text(
                        'Voir tout',
                        style: TextStyle(
                          color: isDark ? Colors.white70 : AppConstants.textSecondaryLight,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 5. Recent Visits List
                Obx(() {
                  final visits = salesController.visitsHistory.take(3).toList();
                  if (visits.isEmpty) {
                    return GlassCard(
                      padding: const EdgeInsets.all(16),
                      child: Center(
                        child: Text(
                          'Aucune visite récente.',
                          style: TextStyle(
                            color: isDark ? AppConstants.textSecondaryDark : AppConstants.textMuted,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    );
                  }

                  return ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: visits.length,
                    itemBuilder: (context, index) {
                      final v = visits[index];
                      final isTransmitted = v.status == 'TRANSMIS';
                      return GlassCard(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleCard),
                        onTap: () => Get.toNamed(Routes.VISITS_HISTORY),
                        child: Row(
                          children: [
                            Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF1E1E22) : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(
                                LucideIcons.building2,
                                color: isDark ? Colors.white70 : AppConstants.textDark,
                                size: 18,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    v.enterpriseName,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w800,
                                      color: isDark ? Colors.white : AppConstants.textDark,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${v.sector} • ${v.location}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: isTransmitted
                                    ? AppConstants.successGreen.withValues(alpha: 0.15)
                                    : (isDark ? const Color(0xFF2E2E36) : const Color(0xFFE2E8F0)),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                isTransmitted ? 'Transmis' : 'Effectuée',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: isTransmitted
                                      ? AppConstants.successGreen
                                      : (isDark ? Colors.white70 : AppConstants.textSecondaryLight),
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  );
                }),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
