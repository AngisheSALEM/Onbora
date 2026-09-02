import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/kam_controller.dart';
import '../model/kam_account_model.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';
import '../../../common/screen/widget/apple_large_title_sliver_app_bar.dart';

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
          // 1. Apple Large Title SliverAppBar
          AppleLargeTitleSliverAppBar(
            title: 'Grands Comptes',
            actions: [
              IconButton(
                icon: Icon(
                  CupertinoIcons.slider_horizontal_3,
                  size: 22,
                  color: isDark ? Colors.white : AppConstants.textDark,
                ),
                onPressed: () {},
              ),
            ],
          ),

          // 2. Contenu Défilant
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 8),

                  // Barre de Recherche Épurée
                  Container(
                    height: 44,
                    decoration: BoxDecoration(
                      color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                        width: 1,
                      ),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Row(
                      children: [
                        Icon(
                          CupertinoIcons.search,
                          size: 18,
                          color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            onChanged: (val) => controller.searchQuery.value = val,
                            style: TextStyle(
                              fontSize: 15,
                              color: isDark ? Colors.white : AppConstants.textDark,
                            ),
                            decoration: InputDecoration(
                              hintText: 'Rechercher un compte, secteur, ville...',
                              hintStyle: TextStyle(
                                fontSize: 15,
                                color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                              ),
                              border: InputBorder.none,
                              isDense: true,
                              contentPadding: EdgeInsets.zero,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Résumé du Portefeuille (Chiffres Clés)
                  Obx(() => _buildPortfolioSummaryCard(context, controller, isDark)),

                  const SizedBox(height: 16),

                  // Prochaine Visite Stratégique (VIP Card)
                  Obx(() {
                    if (controller.allAccounts.isEmpty) return const SizedBox.shrink();
                    final upcomingAccount = controller.allAccounts.firstWhere(
                      (acc) => acc.nextVisitDate != null,
                      orElse: () => controller.allAccounts.first,
                    );
                    return _buildUpcomingStrategicVisitCard(context, controller, upcomingAccount, isDark);
                  }),

                  const SizedBox(height: 20),

                  // Filtres de Santé du Compte
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Portefeuille Dédié',
                        style: AppConstants.title2Style(isDark).copyWith(fontSize: 18),
                      ),
                      Obx(() => Text(
                            '${controller.filteredAccounts.length} comptes',
                            style: AppConstants.subheadStyle(isDark),
                          )),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // Pilules de Filtres
                  Obx(() => _buildHealthFilterPills(controller, isDark)),

                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),

          // 3. Liste des Comptes Stratégiques
          Obx(() {
            if (controller.isLoading.value) {
              return SliverToBoxAdapter(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32.0),
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
                  padding: const EdgeInsets.symmetric(vertical: 40.0),
                  child: Center(
                    child: Column(
                      children: [
                        Icon(
                          CupertinoIcons.building_2_fill,
                          size: 48,
                          color: isDark ? const Color(0xFF3A3A3C) : const Color(0xFFC7C7CC),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Aucun compte trouvé',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
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
                      child: _buildAccountCard(context, controller, account, isDark),
                    );
                  },
                  childCount: controller.filteredAccounts.length,
                ),
              ),
            );
          }),

          // Marge basse
          const SliverToBoxAdapter(
            child: SizedBox(height: 120),
          ),
        ],
      ),
    );
  }

  Widget _buildPortfolioSummaryCard(BuildContext context, KamController controller, bool isDark) {
    return Container(
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
                  style: AppConstants.overlineStyle(isDark).copyWith(
                    fontWeight: FontWeight.w700,
                    color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isDark ? const Color(0x1AFFFFFF) : const Color(0xFFE5E5EA),
                    width: 1,
                  ),
                ),
                child: Text(
                  'Orange B2B',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '142 500 \$ / mois',
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.6,
              color: isDark ? Colors.white : AppConstants.textDark,
            ),
          ),
          const SizedBox(height: 12),
          Divider(
            height: 1,
            color: isDark ? AppConstants.dividerDark : AppConstants.dividerLight,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildKpiItem(
                label: 'Comptes actifs',
                value: '${controller.totalAccountsCount.value}',
                color: isDark ? Colors.white : AppConstants.textDark,
                isDark: isDark,
              ),
              _buildVerticalDivider(isDark),
              _buildKpiItem(
                label: 'Renouvellements',
                value: '${controller.renewalImminentCount.value} sous 60j',
                color: const Color(0xFFF59E0B),
                isDark: isDark,
              ),
              _buildVerticalDivider(isDark),
              _buildKpiItem(
                label: 'Alertes SLA',
                value: '${controller.criticalAlertsCount.value} récents',
                color: const Color(0xFFEF4444),
                isDark: isDark,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildKpiItem({
    required String label,
    required String value,
    required Color color,
    required bool isDark,
  }) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 10.5,
              color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
            ),
          ),
          const SizedBox(height: 2),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVerticalDivider(bool isDark) {
    return Container(
      width: 1,
      height: 24,
      margin: const EdgeInsets.symmetric(horizontal: 8),
      color: isDark ? AppConstants.dividerDark : AppConstants.dividerLight,
    );
  }

  Widget _buildUpcomingStrategicVisitCard(
    BuildContext context,
    KamController controller,
    KamAccountModel account,
    bool isDark,
  ) {
    return ScaleTap(
      onTap: () => controller.openBriefingForAccount(account),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E1E22) : AppConstants.cardLight,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isDark ? const Color(0x33FFFFFF) : AppConstants.borderLight,
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.06),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 8,
              runSpacing: 6,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white : AppConstants.primaryBlack,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        CupertinoIcons.clock_fill,
                        size: 12,
                        color: isDark ? Colors.black : Colors.white,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${account.nextVisitDate} • ${account.nextVisitTime}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: isDark ? Colors.black : Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(CupertinoIcons.doc_text_fill, size: 12, color: Color(0xFF10B981)),
                      SizedBox(width: 4),
                      Text(
                        'Briefing 30s',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF10B981),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              account.name,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.3,
                color: isDark ? Colors.white : AppConstants.textDark,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              account.nextVisitObjective ?? 'Revue stratégique et présentation SD-WAN',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 13,
                color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
              ),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: AppConstants.primaryBtnColor(isDark),
                borderRadius: BorderRadius.circular(12),
              ),
              alignment: Alignment.center,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    CupertinoIcons.book_fill,
                    size: 16,
                    color: AppConstants.primaryBtnTextColor(isDark),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Consulter le Briefing Pré-Visite',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppConstants.primaryBtnTextColor(isDark),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

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
            dotColor: const Color(0xFF10B981),
            isSelected: controller.selectedHealthFilter.value == AccountHealthStatus.healthy,
            onTap: () => controller.setHealthFilter(AccountHealthStatus.healthy),
            isDark: isDark,
          ),
          const SizedBox(width: 8),
          _buildPill(
            label: 'Renouvellement 60j',
            dotColor: const Color(0xFFF59E0B),
            isSelected: controller.selectedHealthFilter.value == AccountHealthStatus.warning,
            onTap: () => controller.setHealthFilter(AccountHealthStatus.warning),
            isDark: isDark,
          ),
          const SizedBox(width: 8),
          _buildPill(
            label: 'Risque / Incident',
            dotColor: const Color(0xFFEF4444),
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
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? Colors.white : AppConstants.primaryBlack)
              : (isDark ? AppConstants.cardDark : AppConstants.cardLight),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? Colors.transparent
                : (isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (dotColor != null) ...[
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: dotColor,
                ),
              ),
              const SizedBox(width: 6),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected
                    ? (isDark ? Colors.black : Colors.white)
                    : (isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAccountCard(
    BuildContext context,
    KamController controller,
    KamAccountModel account,
    bool isDark,
  ) {
    return Container(
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar Logo Entreprise Initiale
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isDark ? const Color(0x1AFFFFFF) : const Color(0xFFE5E5EA),
                    width: 1,
                  ),
                ),
                alignment: Alignment.center,
                child: Text(
                  account.name.substring(0, 1),
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      account.name,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.2,
                        color: isDark ? Colors.white : AppConstants.textDark,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${account.sector} • ${account.headquarters.split(',').first}',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                      ),
                    ),
                  ],
                ),
              ),
              // Badge de Santé
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: account.healthColor.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  account.healthDisplay,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: account.healthColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Motif de santé / Alerte
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF242426) : const Color(0xFFF8F8FA),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: isDark ? const Color(0x1AFFFFFF) : const Color(0xFFE5E5EA),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  CupertinoIcons.info_circle_fill,
                  size: 14,
                  color: account.healthColor,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    account.healthReason,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF4B5563),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'MRR Orange',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                      ),
                    ),
                    Text(
                      account.monthlyRevenueOrange,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : AppConstants.textDark,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ScaleTap(
                    onTap: () => controller.openBriefingForAccount(account),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isDark ? const Color(0x28FFFFFF) : const Color(0xFFE5E5EA),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            CupertinoIcons.doc_text_fill,
                            size: 14,
                            color: isDark ? Colors.white : AppConstants.textDark,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Briefing',
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
                  const SizedBox(width: 6),
                  ScaleTap(
                    onTap: () => controller.openAccountDetail(account),
                    child: Icon(
                      CupertinoIcons.chevron_right,
                      size: 16,
                      color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
