import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../controller/sales_controller.dart';
import '../model/field_intelligence_model.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';
import '../../../common/screen/widget/aurora_background.dart';
import '../../../common/screen/widget/glass_card.dart';

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
    final salesController = Get.find<SalesController>();
    salesController.fetchLeaderboard();
  }

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
        leading: IconButton(
          icon: Icon(LucideIcons.arrowLeft, color: isDark ? Colors.white : AppConstants.textDark, size: 20),
          tooltip: 'Retour',
          onPressed: () => Get.back(),
        ),
        title: Text(
          'Classement des Dénicheurs',
          style: TextStyle(
            color: isDark ? Colors.white : AppConstants.textDark,
            fontWeight: FontWeight.w900,
            fontSize: 17,
            letterSpacing: -0.3,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(LucideIcons.refreshCw, color: isDark ? Colors.white70 : AppConstants.textDark, size: 18),
            tooltip: 'Actualiser',
            onPressed: () => salesController.fetchLeaderboard(),
          ),
        ],
      ),
      body: AuroraBackground(
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: () => salesController.fetchLeaderboard(),
            color: const Color(0xFF2563EB),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Period Selector
                  Row(
                    children: [
                      _buildPeriodTab('Ce mois-ci', 'MONTH', isDark),
                      const SizedBox(width: 8),
                      _buildPeriodTab('Cette semaine', 'WEEK', isDark),
                      const SizedBox(width: 8),
                      _buildPeriodTab('Global', 'ALL', isDark),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // =========================================================
                  // PODIUM TOP 3
                  // =========================================================
                  Obx(() {
                    if (salesController.isLoadingLeaderboard.value) {
                      return const Center(
                        child: Padding(
                          padding: EdgeInsets.all(32),
                          child: CircularProgressIndicator(color: Color(0xFF2563EB)),
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
                        color: isDark ? const Color(0xFF1C1C22) : const Color(0xFFF1F2F6),
                        borderRadius: BorderRadius.circular(22),
                      ),
                      child: Column(
                        children: [
                          Row(
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

                              // 1st Place
                              if (first != null)
                                Expanded(
                                  child: _buildPodiumColumn(
                                    entry: first,
                                    rank: 1,
                                    height: 130,
                                    color: const Color(0xFF2563EB),
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
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: 16),

                  // =========================================================
                  // CARTE MON STATUT & PRIME ACCUMULÉE
                  // =========================================================
                  Obx(() {
                    final points = salesController.userTotalPoints.value > 0
                        ? salesController.userTotalPoints.value
                        : 18;
                    final estimatedBonus = (points * 5).toStringAsFixed(0);

                    return Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563EB).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: const Color(0xFF2563EB).withValues(alpha: 0.3)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: const BoxDecoration(
                                  color: Color(0xFF2563EB),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(LucideIcons.medal, color: Colors.white, size: 18),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Votre Performance Terrain',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w900,
                                        color: isDark ? Colors.white : AppConstants.textDark,
                                      ),
                                    ),
                                    Text(
                                      'Rang #2 sur votre plaque • Kinshasa',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: isDark ? Colors.white70 : AppConstants.textSecondaryLight,
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
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w900,
                                      color: Color(0xFF2563EB),
                                    ),
                                  ),
                                  Text(
                                    '+ $estimatedBonus \$ prime',
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFF10B981),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          const Divider(height: 1),
                          const SizedBox(height: 10),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _buildMiniStat('Conversions', '2', const Color(0xFF10B981), isDark),
                              _buildMiniStat('Voisins 100m', '4', const Color(0xFF2563EB), isDark),
                              _buildMiniStat('Parrainages', '3', const Color(0xFF8B5CF6), isDark),
                              _buildMiniStat('Frictions', '2', const Color(0xFFEC4899), isDark),
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
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      color: isDark ? Colors.white : AppConstants.textDark,
                    ),
                  ),
                  const SizedBox(height: 8),
                  GlassCard(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      children: [
                        _buildIncentiveRow(
                          icon: LucideIcons.fileCheck2,
                          title: 'Pré-conversion réussie (RCCM / KYC)',
                          points: '+5 pts',
                          prime: '~ \$25',
                          color: const Color(0xFF10B981),
                          isDark: isDark,
                        ),
                        const Divider(height: 16),
                        _buildIncentiveRow(
                          icon: LucideIcons.mapPin,
                          title: 'Lead voisin repéré (Lookalike 100m)',
                          points: '+1 pt',
                          prime: '~ \$5',
                          color: const Color(0xFF2563EB),
                          isDark: isDark,
                        ),
                        const Divider(height: 16),
                        _buildIncentiveRow(
                          icon: LucideIcons.network,
                          title: 'Parrainage Fournisseur / Partenaire',
                          points: '+1 pt',
                          prime: '~ \$5',
                          color: const Color(0xFF8B5CF6),
                          isDark: isDark,
                        ),
                        const Divider(height: 16),
                        _buildIncentiveRow(
                          icon: LucideIcons.alertTriangle,
                          title: 'Audit de friction concurrentielle (SQL)',
                          points: '+1 pt',
                          prime: '~ \$5',
                          color: const Color(0xFFEC4899),
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
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      color: isDark ? Colors.white : AppConstants.textDark,
                    ),
                  ),
                  const SizedBox(height: 8),
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
                                ? const Color(0xFF2563EB).withValues(alpha: 0.12)
                                : (isDark ? const Color(0xFF1C1C22) : const Color(0xFFF1F2F6)),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isSelf ? const Color(0xFF2563EB).withValues(alpha: 0.4) : Colors.transparent,
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 28,
                                height: 28,
                                decoration: BoxDecoration(
                                  color: entry.rank == 1
                                      ? const Color(0xFF2563EB)
                                      : (isDark ? const Color(0xFF2B2B32) : const Color(0xFFE2E8F0)),
                                  shape: BoxShape.circle,
                                ),
                                child: Center(
                                  child: Text(
                                    '#${entry.rank}',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w900,
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
                                        Text(
                                          entry.fullName,
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w800,
                                            color: isDark ? Colors.white : AppConstants.textDark,
                                          ),
                                        ),
                                        if (isSelf) ...[
                                          const SizedBox(width: 6),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFF2563EB),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: const Text(
                                              'Moi',
                                              style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${entry.nearbyLeadsCount} voisins • ${entry.referralsCount} parrainages • ${entry.successfulConversionsCount} RCCM',
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: isDark ? Colors.white54 : AppConstants.textMuted,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                '${entry.totalPoints} pts',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF2563EB),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    );
                  }),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPeriodTab(String label, String code, bool isDark) {
    final isSelected = _selectedPeriod == code;
    return Expanded(
      child: ScaleTap(
        child: GestureDetector(
          onTap: () => setState(() => _selectedPeriod = code),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: isSelected
                  ? const Color(0xFF2563EB)
                  : (isDark ? const Color(0xFF1C1C22) : const Color(0xFFF1F2F6)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: isSelected ? Colors.white : (isDark ? Colors.white70 : AppConstants.textDark),
                ),
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
          const Icon(LucideIcons.crown, color: Color(0xFFF59E0B), size: 22),
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
                fontWeight: FontWeight.w900,
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
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : AppConstants.textDark,
          ),
        ),
        Text(
          '${entry.totalPoints} pts',
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w900,
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
                fontWeight: FontWeight.w900,
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
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: color),
        ),
        Text(
          label,
          style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: isDark ? Colors.white54 : AppConstants.textMuted),
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
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
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
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: color),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          prime,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFF10B981)),
        ),
      ],
    );
  }
}
