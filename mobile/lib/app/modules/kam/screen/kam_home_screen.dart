import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/kam_controller.dart';
import '../model/kam_account_model.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';
import '../../../common/screen/widget/apple_large_title_sliver_app_bar.dart';
import 'widget/kam_toolbar_modals.dart';

class KamHomeScreen extends StatelessWidget {
  const KamHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.isRegistered<KamController>()
        ? Get.find<KamController>()
        : Get.put(KamController());
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppConstants.backgroundDark : AppConstants.backgroundLight,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
        slivers: [
          // 1. Apple Large Title SliverAppBar avec ToolBar Exécutive
          AppleLargeTitleSliverAppBar(
            title: 'Grands Comptes',
            actions: [
              // Bouton 1 : Synthèse IA Exécutive
              ScaleTap(
                onTap: () => KamToolbarModals.showExecutiveSummary(context, isDark: isDark, controller: controller),
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: isDark ? AppConstants.subcardDark : AppConstants.subcardLight,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    CupertinoIcons.sparkles,
                    size: 18,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // Bouton 2 : Actions Rapides (+)
              ScaleTap(
                onTap: () => KamToolbarModals.showQuickActions(context, isDark: isDark, controller: controller),
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: isDark ? AppConstants.subcardDark : AppConstants.subcardLight,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    CupertinoIcons.plus,
                    size: 18,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // Bouton 3 : Cloche de Notifications avec Badge Dynamique
              Obx(() {
                final hasAlerts = controller.criticalAlertsCount.value > 0;
                return ScaleTap(
                  onTap: () => KamToolbarModals.showNotifications(context, isDark: isDark, controller: controller),
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: isDark ? AppConstants.subcardDark : AppConstants.subcardLight,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          CupertinoIcons.bell_fill,
                          size: 17,
                          color: isDark ? Colors.white : AppConstants.textDark,
                        ),
                      ),
                      if (hasAlerts)
                        Positioned(
                          top: 0,
                          right: 0,
                          child: Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              color: AppConstants.accentBlue,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: isDark ? AppConstants.backgroundDark : Colors.white,
                                width: 2,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                );
              }),
              const SizedBox(width: 12),
            ],
          ),

          // 2. Synthèse Portefeuille & Filtres Rapides
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 8),

                  // Carte Héro Portefeuille (Noir OLED / Gris Apple sans bordure)
                  Obx(() => _buildHeroPortfolioCard(controller, isDark)),

                  const SizedBox(height: 16),

                  // Barre de Filtres par Statut
                  Obx(() => _buildHealthFilterPills(controller, isDark)),

                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),

          // 3. Liste Fluide des Comptes Stratégiques
          Obx(() {
            if (controller.isLoading.value) {
              return SliverToBoxAdapter(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(40.0),
                    child: CupertinoActivityIndicator(
                      radius: 14,
                      color: isDark ? Colors.white : AppConstants.primaryBlack,
                    ),
                  ),
                ),
              );
            }

            if (controller.filteredAccounts.isEmpty) {
              return SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 60.0),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          CupertinoIcons.building_2_fill,
                          size: 44,
                          color: isDark ? const Color(0xFF3A3A3C) : const Color(0xFFC7C7CC),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Aucun compte dans cette catégorie',
                          style: TextStyle(
                            fontFamily: AppConstants.fontFamilyPrimary,
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                            color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }

            return SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final account = controller.filteredAccounts[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12.0),
                      child: _buildMinimalistAccountCard(context, controller, account, isDark),
                    );
                  },
                  childCount: controller.filteredAccounts.length,
                ),
              ),
            );
          }),

          // Marge basse pour laisser respirer la TabBar flottante
          const SliverToBoxAdapter(
            child: SizedBox(height: 110),
          ),
        ],
      ),
    );
  }

  /// Carte Héro Portefeuille : Mise en scène visuelle épurée Apple
  Widget _buildHeroPortfolioCard(KamController controller, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      decoration: BoxDecoration(
        color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
        borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleCard),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.04),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'REVENU SOUS GESTION',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: AppConstants.fontFamilyPrimary,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.4,
                    color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${controller.allAccounts.length} comptes actifs',
                style: TextStyle(
                  fontFamily: AppConstants.fontFamilyPrimary,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Flexible(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        '142 500 \$',
                        style: TextStyle(
                          fontFamily: AppConstants.fontFamilyPrimary,
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.4,
                          color: isDark ? Colors.white : AppConstants.textDark,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '/ mois',
                        style: TextStyle(
                          fontFamily: AppConstants.fontFamilyPrimary,
                          fontSize: 13,
                          fontWeight: FontWeight.w400,
                          color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (controller.criticalAlertsCount.value > 0) ...[
                const SizedBox(width: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                  decoration: BoxDecoration(
                    color: AppConstants.accentBlue.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(CupertinoIcons.bell_fill, size: 11, color: AppConstants.accentBlue),
                      const SizedBox(width: 4),
                      Text(
                        '${controller.criticalAlertsCount.value} Alertes',
                        style: const TextStyle(
                          fontFamily: AppConstants.fontFamilyPrimary,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppConstants.accentBlue,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  /// Filtres Horizontaux par Statut
  Widget _buildHealthFilterPills(KamController controller, bool isDark) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: [
          _buildPill(
            label: 'Tous (${controller.allAccounts.length})',
            isSelected: controller.selectedHealthFilter.value == null,
            onTap: () => controller.setHealthFilter(null),
            isDark: isDark,
          ),
          const SizedBox(width: 8),
          _buildPill(
            label: 'Sains',
            dotColor: AppConstants.accentGreen,
            isSelected: controller.selectedHealthFilter.value == AccountHealthStatus.healthy,
            onTap: () => controller.setHealthFilter(AccountHealthStatus.healthy),
            isDark: isDark,
          ),
          const SizedBox(width: 8),
          _buildPill(
            label: 'Renouvellement 60j',
            dotColor: AppConstants.accentAmber,
            isSelected: controller.selectedHealthFilter.value == AccountHealthStatus.warning,
            onTap: () => controller.setHealthFilter(AccountHealthStatus.warning),
            isDark: isDark,
          ),
          const SizedBox(width: 8),
          _buildPill(
            label: 'Risque / SLA',
            dotColor: AppConstants.accentRed,
            isSelected: controller.selectedHealthFilter.value == AccountHealthStatus.critical,
            onTap: () => controller.setHealthFilter(AccountHealthStatus.critical),
            isDark: isDark,
          ),
        ],
      ),
    );
  }

  Widget _buildPill({
    required String label,
    Color? dotColor,
    required bool isSelected,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return ScaleTap(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 7.5),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? Colors.white : AppConstants.primaryBlack)
              : (isDark ? AppConstants.cardDark : AppConstants.cardLight),
          borderRadius: BorderRadius.circular(18),
          boxShadow: isSelected
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.02),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (dotColor != null) ...[
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: dotColor,
                ),
              ),
              const SizedBox(width: 5),
            ],
            Text(
              label,
              style: TextStyle(
                fontFamily: AppConstants.fontFamilyPrimary,
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: isSelected
                    ? (isDark ? Colors.black : Colors.white)
                    : (isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Carte de Compte Épurée : Zéro sous-carte imbriquée, différenciation par l'espace
  Widget _buildMinimalistAccountCard(
    BuildContext context,
    KamController controller,
    KamAccountModel account,
    bool isDark,
  ) {
    return ScaleTap(
      onTap: () => controller.openAccountDetail(account),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        decoration: BoxDecoration(
          color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
          borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleCard),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.035),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Monogramme Entreprise
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: isDark ? AppConstants.subcardDark : AppConstants.subcardLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    account.name.substring(0, 1).toUpperCase(),
                    style: TextStyle(
                      fontFamily: AppConstants.fontFamilyPrimary,
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : AppConstants.textDark,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Nom & Localisation
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        account.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: AppConstants.fontFamilyPrimary,
                          fontSize: 15.5,
                          fontWeight: FontWeight.w600,
                          letterSpacing: -0.2,
                          color: isDark ? Colors.white : AppConstants.textDark,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${account.sector} • ${account.headquarters.split(',').first}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: AppConstants.fontFamilyPrimary,
                          fontSize: 12,
                          fontWeight: FontWeight.w400,
                          color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // MRR & Pastille Santé
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      account.monthlyRevenueOrange,
                      style: TextStyle(
                        fontFamily: AppConstants.fontFamilyPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : AppConstants.textDark,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6.5, vertical: 2),
                      decoration: BoxDecoration(
                        color: account.healthColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        account.healthDisplay,
                        style: TextStyle(
                          fontFamily: AppConstants.fontFamilyPrimary,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w500,
                          color: account.healthColor,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 4),
                Icon(
                  CupertinoIcons.chevron_right,
                  size: 14,
                  color: isDark ? AppConstants.textTertiaryDark : AppConstants.textTertiaryLight,
                ),
              ],
            ),
            // Motif d'alerte / santé affiché en direct SANS sous-boîte grise imbriquée
            if (account.healthReason.isNotEmpty && account.healthStatus != AccountHealthStatus.healthy) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  Icon(
                    CupertinoIcons.info_circle_fill,
                    size: 13,
                    color: account.healthColor,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      account.healthReason,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontFamily: AppConstants.fontFamilyPrimary,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w400,
                        color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
