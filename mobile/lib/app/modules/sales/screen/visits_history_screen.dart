import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/sales_controller.dart';
import '../model/visit_history_item.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/aurora_background.dart';
import '../../../common/screen/widget/glass_card.dart';

class VisitsHistoryScreen extends StatefulWidget {
  const VisitsHistoryScreen({super.key});

  @override
  State<VisitsHistoryScreen> createState() => _VisitsHistoryScreenState();
}

class _VisitsHistoryScreenState extends State<VisitsHistoryScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  static const List<String> _frenchMonths = [
    '', 'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
    'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'
  ];

  String _formatFrenchDate(DateTime dt) {
    final day = dt.day.toString().padLeft(2, '0');
    final month = (dt.month >= 1 && dt.month <= 12) ? _frenchMonths[dt.month] : '${dt.month}';
    final hour = dt.hour.toString().padLeft(2, '0');
    final minute = dt.minute.toString().padLeft(2, '0');
    return '$day $month ${dt.year} à ${hour}h$minute';
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Get.find<SalesController>().fetchVisitsHistory();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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
            icon: Icon(Icons.arrow_back_rounded, color: isDark ? Colors.white : AppConstants.textDark),
            tooltip: 'Retour',
            onPressed: () => Get.back(),
          ),
          title: Text(
            'Historique des Visites',
            style: TextStyle(
              color: isDark ? Colors.white : AppConstants.textDark,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.3,
            ),
          ),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(48),
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight),
              ),
              child: TabBar(
                controller: _tabController,
                indicatorSize: TabBarIndicatorSize.tab,
                dividerColor: Colors.transparent,
                indicator: BoxDecoration(
                  color: isDark ? Colors.white : const Color(0xFF18181B),
                  borderRadius: BorderRadius.circular(10),
                ),
                labelColor: isDark ? const Color(0xFF121214) : Colors.white,
                unselectedLabelColor: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                tabs: const [
                  Tab(text: "Aujourd'hui (Journalier)"),
                  Tab(text: "Ce Mois-ci (Mensuel)"),
                ],
              ),
            ),
          ),
        ),
        body: AuroraBackground(
          child: SafeArea(
            child: Obx(() {
              if (salesController.isLoadingVisits.value) {
                return Center(child: CircularProgressIndicator(color: isDark ? Colors.white : AppConstants.textDark));
              }

              final allVisits = salesController.visitsHistory;
              final todayVisits = allVisits.where((v) => v.isToday).toList();
              final monthlyVisits = allVisits.where((v) => v.isThisMonth).toList();

              return TabBarView(
                controller: _tabController,
                children: [
                  _buildVisitsList(context, todayVisits, "Aucune visite effectuée aujourd'hui"),
                  _buildVisitsList(context, monthlyVisits, "Aucune visite enregistrée ce mois-ci"),
                ],
              );
            }),
          ),
        ),
      );
  }

  Widget _buildVisitsList(BuildContext context, List<VisitHistoryItem> visits, String emptyMessage) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (visits.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppConstants.paddingXl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.event_busy_rounded, size: 54, color: AppConstants.textMuted),
              const SizedBox(height: 16),
              Text(
                emptyMessage,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: isDark ? Colors.white : AppConstants.textDark,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      physics: const ClampingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(AppConstants.paddingLg, 16, AppConstants.paddingLg, AppConstants.paddingXl),
      itemCount: visits.length,
      itemBuilder: (context, index) {
        final visit = visits[index];
        final isTransmitted = visit.status == 'TRANSMIS';

        return GlassCard(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Company Name & Status
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      visit.enterpriseName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : AppConstants.textDark,
                      ),
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
                      isTransmitted ? 'Transmis au KAM' : 'Effectuée',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: isTransmitted
                            ? AppConstants.successGreen
                            : (isDark ? Colors.white70 : AppConstants.textSecondaryLight),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),

              // Sector & Location
              Text(
                '${visit.sector} • ${visit.location}',
                style: TextStyle(color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight, fontSize: 12),
              ),
              const Divider(height: 18),

              // Date, Time & Confidentiality Tag
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.calendar_today_rounded, size: 14, color: isDark ? AppConstants.textSecondaryDark : AppConstants.textDark),
                      const SizedBox(width: 6),
                      Text(
                        _formatFrenchDate(visit.visitDate),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppConstants.textSecondaryDark : AppConstants.textDark,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Icon(Icons.lock_rounded, size: 12, color: isDark ? AppConstants.textSecondaryDark : AppConstants.textMuted),
                      const SizedBox(width: 4),
                      Text(
                        'Confidentiel',
                        style: TextStyle(fontSize: 10, color: isDark ? AppConstants.textSecondaryDark : AppConstants.textMuted, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
