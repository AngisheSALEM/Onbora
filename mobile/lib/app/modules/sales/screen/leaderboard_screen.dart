import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/sales_controller.dart';
import '../model/field_intelligence_model.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';
import '../../../common/screen/widget/apple_large_title_sliver_app_bar.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  String _selectedPeriod = 'MONTH'; // MONTH, WEEK, ALL

  @override
  void initState() {
    super.initState();
    final salesController = Get.isRegistered<SalesController>() ? Get.find<SalesController>() : null;
    salesController?.fetchLeaderboard();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final salesController = Get.isRegistered<SalesController>() ? Get.find<SalesController>() : null;

    return Scaffold(
      backgroundColor: isDark ? AppConstants.backgroundDark : AppConstants.backgroundLight,
      body: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(
          parent: BouncingScrollPhysics(),
        ),
        slivers: [
          // 1. Collapsible Large Title (Apple Music Scroll Animation)
          AppleLargeTitleSliverAppBar(
            title: 'Classement',
            leading: ScaleTap(
              onTap: () => Get.back(),
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  CupertinoIcons.chevron_back,
                  color: isDark ? Colors.white : AppConstants.textDark,
                  size: 20,
                ),
              ),
            ),
            actions: [
              IconButton(
                icon: Icon(CupertinoIcons.arrow_clockwise, color: isDark ? Colors.white70 : AppConstants.textDark, size: 20),
                tooltip: 'Actualiser',
                onPressed: () => salesController?.fetchLeaderboard(),
              ),
            ],
          ),

          // 2. Main Content
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 8),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // Period Selector
                Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1C1C1E) : const Color(0xFFE5E5EA),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      _buildPeriodTab('Ce mois-ci', 'MONTH', isDark),
                      _buildPeriodTab('Cette semaine', 'WEEK', isDark),
                      _buildPeriodTab('Global', 'ALL', isDark),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // =========================================================
                // PODIUM TOP 3
                // =========================================================
                if (salesController != null)
                  Obx(() {
                    if (salesController.isLoadingLeaderboard.value) {
                      return Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: CupertinoActivityIndicator(
                            color: isDark ? Colors.white : AppConstants.primaryBlack,
                          ),
                        ),
                      );
                    }

                    final list = salesController.leaderboardList;
                    if (list.isEmpty) {
                      return const SizedBox.shrink();
                    }

                    final first = list.isNotEmpty ? list[0] : null;
                    final second = list.length > 1 ? list[1] : null;
                    final third = list.length > 2 ? list[2] : null;

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
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          // 2nd Place
                          if (second != null)
                            Expanded(
                              child: _buildPodiumColumn(
                                entry: second,
                                rank: 2,
                                height: 100,
                                color: const Color(0xFF94A3B8),
                                isDark: isDark,
                              ),
                            )
                          else
                            const Spacer(),

                          const SizedBox(width: 8),

                          // 1st Place (Winner - Gold / High Contrast)
                          if (first != null)
                            Expanded(
                              child: _buildPodiumColumn(
                                entry: first,
                                rank: 1,
                                height: 130,
                                color: const Color(0xFFF59E0B),
                                isDark: isDark,
                                isWinner: true,
                              ),
                            )
                          else
                            const Spacer(),

                          const SizedBox(width: 8),

                          // 3rd Place
                          if (third != null)
                            Expanded(
                              child: _buildPodiumColumn(
                                entry: third,
                                rank: 3,
                                height: 85,
                                color: const Color(0xFFB45309),
                                isDark: isDark,
                              ),
                            )
                          else
                            const Spacer(),
                        ],
                      ),
                    );
                  }),
                const SizedBox(height: 16),

                // =========================================================
                // CARTE MON STATUT & PRIME ACCUMULÉE
                // =========================================================
                if (salesController != null)
                  Obx(() {
                    final points = salesController.userTotalPoints.value > 0
                        ? salesController.userTotalPoints.value
                        : 18;
                    final estimatedBonus = (points * 5).toStringAsFixed(0);

                    return Container(
                      width: double.infinity,
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
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  CupertinoIcons.rosette,
                                  color: isDark ? Colors.white : AppConstants.textDark,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Votre Performance Terrain',
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w700,
                                        color: isDark ? Colors.white : AppConstants.textDark,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Rang #2 sur votre plaque • Kinshasa',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    '$points pts',
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w800,
                                      color: isDark ? Colors.white : AppConstants.textDark,
                                    ),
                                  ),
                                  Text(
                                    '+ $estimatedBonus \$ prime',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF10B981),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Divider(
                            height: 1,
                            thickness: 0.5,
                            color: isDark ? const Color(0x1FFFFFFF) : const Color(0x15000000),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _buildMiniStat('Conversions', '2', const Color(0xFF10B981), isDark),
                              _buildMiniStat('Voisins 100m', '4', isDark ? Colors.white : AppConstants.textDark, isDark),
                              _buildMiniStat('Parrainages', '3', isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280), isDark),
                              _buildMiniStat('Frictions', '2', const Color(0xFFEF4444), isDark),
                            ],
                          ),
                        ],
                      ),
                    );
                  }),
                const SizedBox(height: 20),

                // =========================================================
                // GRILLE DE RÉMUNÉRATION DES LEADS (INCENTIVE RULES)
                // =========================================================
                Text(
                  'Barème des Primes & Points',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                ),
                const SizedBox(height: 10),
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
                  child: Column(
                    children: [
                      _buildIncentiveRow(
                        icon: CupertinoIcons.checkmark_seal_fill,
                        title: 'Pré-conversion réussie (RCCM / KYC)',
                        points: '+5 pts',
                        prime: '~ \$25',
                        color: const Color(0xFF10B981),
                        isDark: isDark,
                      ),
                      Divider(height: 20, thickness: 0.5, indent: 32, color: isDark ? const Color(0x1FFFFFFF) : const Color(0x15000000)),
                      _buildIncentiveRow(
                        icon: CupertinoIcons.map_pin_ellipse,
                        title: 'Lead voisin repéré (Lookalike 100m)',
                        points: '+1 pt',
                        prime: '~ \$5',
                        color: isDark ? Colors.white : AppConstants.textDark,
                        isDark: isDark,
                      ),
                      Divider(height: 20, thickness: 0.5, indent: 32, color: isDark ? const Color(0x1FFFFFFF) : const Color(0x15000000)),
                      _buildIncentiveRow(
                        icon: CupertinoIcons.person_3_fill,
                        title: 'Parrainage Fournisseur / Partenaire',
                        points: '+1 pt',
                        prime: '~ \$5',
                        color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                        isDark: isDark,
                      ),
                      Divider(height: 20, thickness: 0.5, indent: 32, color: isDark ? const Color(0x1FFFFFFF) : const Color(0x15000000)),
                      _buildIncentiveRow(
                        icon: CupertinoIcons.exclamationmark_triangle_fill,
                        title: 'Audit de friction concurrentielle',
                        points: '+1 pt',
                        prime: '~ \$5',
                        color: const Color(0xFFF59E0B),
                        isDark: isDark,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // =========================================================
                // LISTE DU CLASSEMENT COMPLET
                // =========================================================
                Text(
                  'Classement Général',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                ),
                const SizedBox(height: 10),
                if (salesController != null)
                  Obx(() {
                    final list = salesController.leaderboardList;
                    return ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: list.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final entry = list[index];
                        final isSelf = entry.salespersonName == 'dieudonne_mukendi' || entry.salespersonName == 'sales_test';

                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: isSelf
                                ? (isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA))
                                : (isDark ? AppConstants.cardDark : AppConstants.cardLight),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                              width: 1,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 28,
                                height: 28,
                                decoration: BoxDecoration(
                                  color: entry.rank == 1
                                      ? const Color(0xFFF59E0B)
                                      : (isDark ? const Color(0xFF2B2B32) : const Color(0xFFF2F2F7)),
                                  shape: BoxShape.circle,
                                ),
                                child: Center(
                                  child: Text(
                                    '#${entry.rank}',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: entry.rank == 1 ? Colors.white : (isDark ? Colors.white70 : AppConstants.textDark),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Flexible(
                                          child: Text(
                                            entry.fullName,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w700,
                                              color: isDark ? Colors.white : AppConstants.textDark,
                                            ),
                                          ),
                                        ),
                                        if (isSelf) ...[
                                          const SizedBox(width: 6),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                            decoration: BoxDecoration(
                                              color: isDark ? Colors.white : AppConstants.primaryBlack,
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              'Moi',
                                              style: TextStyle(
                                                color: isDark ? Colors.black : Colors.white,
                                                fontSize: 9,
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${entry.nearbyLeadsCount} voisins • ${entry.referralsCount} parrainages • ${entry.successfulConversionsCount} RCCM',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '${entry.totalPoints} pts',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: isDark ? Colors.white : AppConstants.textDark,
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    );
                  }),
                const SizedBox(height: 32),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPeriodTab(String label, String code, bool isDark) {
    final isSelected = _selectedPeriod == code;
    return Expanded(
      child: ScaleTap(
        onTap: () => setState(() => _selectedPeriod = code),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? (isDark ? Colors.white : AppConstants.primaryBlack)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : [],
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: isSelected
                    ? (isDark ? Colors.black : Colors.white)
                    : (isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280)),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPodiumColumn({
    required LeaderboardEntryModel entry,
    required int rank,
    required double height,
    required Color color,
    required bool isDark,
    bool isWinner = false,
  }) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        if (isWinner)
          const Icon(CupertinoIcons.sparkles, color: Color(0xFFF59E0B), size: 20),
        const SizedBox(height: 4),
        Container(
          width: isWinner ? 48 : 40,
          height: isWinner ? 48 : 40,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            shape: BoxShape.circle,
            border: Border.all(color: color, width: isWinner ? 2 : 1),
          ),
          child: Center(
            child: Text(
              entry.fullName.isNotEmpty ? entry.fullName.substring(0, 1) : '?',
              style: TextStyle(
                fontSize: isWinner ? 18 : 15,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          entry.fullName.split(' ').first,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white : AppConstants.textDark,
          ),
        ),
        Text(
          '${entry.totalPoints} pts',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          width: double.infinity,
          height: height,
          decoration: BoxDecoration(
            color: color.withValues(alpha: isWinner ? 0.25 : 0.15),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            border: Border.all(color: color.withValues(alpha: 0.3)),
          ),
          child: Center(
            child: Text(
              '#$rank',
              style: TextStyle(
                fontSize: isWinner ? 22 : 18,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMiniStat(String label, String value, Color color, bool isDark) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: color),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
          ),
        ),
      ],
    );
  }

  Widget _buildIncentiveRow({
    required IconData icon,
    required String title,
    required String points,
    required String prime,
    required Color color,
    required bool isDark,
  }) {
    return Row(
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : AppConstants.textDark,
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            points,
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          prime,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF10B981)),
        ),
      ],
    );
  }
}
