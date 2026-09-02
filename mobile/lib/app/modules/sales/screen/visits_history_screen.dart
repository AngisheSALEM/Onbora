import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/sales_controller.dart';
import '../model/visit_history_item.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/aurora_background.dart';

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
    return '$day $month à ${hour}h$minute';
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final salesController = Get.find<SalesController>();

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: Icon(CupertinoIcons.chevron_back, color: isDark ? Colors.white : AppConstants.textDark, size: 22),
          tooltip: 'Retour',
          onPressed: () => Get.back(),
        ),
      ),
      body: AuroraBackground(
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Grand Titre iOS (34px Bold)
              Padding(
                padding: const EdgeInsets.fromLTRB(AppConstants.paddingLg, 4, AppConstants.paddingLg, 6),
                child: Text(
                  'Historique',
                  style: AppConstants.largeTitleStyle(isDark),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg),
                child: Divider(
                  height: 16,
                  thickness: 0.5,
                  color: isDark ? const Color(0x22FFFFFF) : const Color(0x15000000),
                ),
              ),
              const SizedBox(height: 4),

              // 2. Segmented / Tab Bar
              Container(
                margin: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 6),
                padding: const EdgeInsets.all(3),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1C1C1E) : const Color(0xFFE5E5EA),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: TabBar(
                  controller: _tabController,
                  indicatorSize: TabBarIndicatorSize.tab,
                  dividerColor: Colors.transparent,
                  indicator: BoxDecoration(
                    color: isDark ? const Color(0xFF2C2C2E) : Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: isDark
                        ? []
                        : [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                  ),
                  labelColor: isDark ? Colors.white : AppConstants.textDark,
                  unselectedLabelColor: const Color(0xFF8E8E93),
                  labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                  tabs: const [
                    Tab(text: "Aujourd'hui"),
                    Tab(text: "Ce Mois-ci"),
                  ],
                ),
              ),

              // 3. Liste des Visites
              Expanded(
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
            ],
          ),
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
              const Icon(CupertinoIcons.calendar_badge_minus, size: 48, color: Color(0xFF8E8E93)),
              const SizedBox(height: 14),
              Text(
                emptyMessage,
                textAlign: TextAlign.center,
                style: AppConstants.headlineStyle(isDark),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      physics: const ClampingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(AppConstants.paddingLg, 10, AppConstants.paddingLg, 100),
      itemCount: visits.length,
      separatorBuilder: (_, __) => Divider(
        color: isDark ? const Color(0x1FFFFFFF) : const Color(0x15000000),
        height: 1,
        thickness: 0.5,
        indent: 56,
      ),
      itemBuilder: (context, index) {
        final visit = visits[index];
        final isTransmitted = visit.status == 'TRANSMIS';

        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            children: [
              // Vignette 44x44 style Apple Music
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1C1C1E) : const Color(0xFFF2F2F7),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  isTransmitted ? CupertinoIcons.checkmark_seal_fill : CupertinoIcons.doc_text_fill,
                  size: 20,
                  color: isTransmitted ? const Color(0xFF10B981) : const Color(0xFF8E8E93),
                ),
              ),
              const SizedBox(width: 12),

              // Contenu Textuel : Nom + Métadonnées
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      visit.enterpriseName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppConstants.headlineStyle(isDark),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${visit.sector} • ${visit.location} • ${_formatFrenchDate(visit.visitDate)}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppConstants.subheadStyle(isDark),
                    ),
                  ],
                ),
              ),

              // Trailing Status Tag
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isTransmitted
                      ? const Color(0xFF10B981).withValues(alpha: 0.15)
                      : (isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA)),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  isTransmitted ? 'KAM' : 'Fait',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: isTransmitted
                        ? const Color(0xFF10B981)
                        : (isDark ? Colors.white70 : AppConstants.textSecondaryLight),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

