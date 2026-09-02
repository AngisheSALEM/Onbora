import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../controller/sales_controller.dart';
import 'widget/notifications_modal.dart';
import 'widget/credit_risk_badge.dart';
import 'widget/deal_share_modal.dart';
import '../../catalog/screen/widget/roi_simulator_modal.dart';
import '../../../routes/app_routes.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';

/// Screen: Rendez-vous (Commercial Terrain)
class SalesHomeScreen extends StatefulWidget {
  const SalesHomeScreen({super.key});

  @override
  State<SalesHomeScreen> createState() => _SalesHomeScreenState();
}

class _SalesHomeScreenState extends State<SalesHomeScreen> {
  final PageController _pageController = PageController(viewportFraction: 0.90);

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final salesController = Get.find<SalesController>();

    return Scaffold(
      extendBodyBehindAppBar: true,
      backgroundColor: isDark ? AppConstants.backgroundDark : AppConstants.backgroundLight,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        actions: [
          // 1. Indicateur de synchronisation hors-ligne
          Obx(() {
            final pending = salesController.pendingSyncCount.value;
            if (pending == 0) return const SizedBox.shrink();
            return ScaleTap(
              onTap: () => salesController.syncPendingQueue(),
              child: Container(
                margin: const EdgeInsets.only(right: 6),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(LucideIcons.cloudUpload, size: 14, color: isDark ? Colors.white : AppConstants.textDark),
                    const SizedBox(width: 4),
                    Text(
                      '$pending',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : AppConstants.textDark,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),

          // 2. Capsule Unifiée d'Outils de Visite (Brief, Scan OCR, Dictaphone)
          ClipRRect(
            borderRadius: BorderRadius.circular(22),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xCC1E1E22) : const Color(0xE6FFFFFF),
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(
                    color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                    width: 1,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.06),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Bouton 1 : Brief IA de Visite
                    ScaleTap(
                      onTap: () {
                        if (salesController.selectedEnterprise.value == null && salesController.searchResults.isNotEmpty) {
                          salesController.selectEnterprise(salesController.searchResults.first);
                        }
                        Get.toNamed(Routes.VISIT_PREPARATION);
                      },
                      child: Container(
                        padding: const EdgeInsets.all(7),
                        decoration: const BoxDecoration(shape: BoxShape.circle),
                        child: Icon(
                          CupertinoIcons.doc_text,
                          size: 18,
                          color: isDark ? Colors.white : AppConstants.textDark,
                        ),
                      ),
                    ),

                    // Séparateur vertical discret
                    Container(
                      width: 1,
                      height: 14,
                      color: isDark ? Colors.white12 : Colors.black12,
                      margin: const EdgeInsets.symmetric(horizontal: 2),
                    ),

                    // Bouton 2 : Scanner OCR
                    ScaleTap(
                      onTap: () => Get.toNamed(Routes.DOCUMENT_SCAN),
                      child: Container(
                        padding: const EdgeInsets.all(7),
                        decoration: const BoxDecoration(shape: BoxShape.circle),
                        child: Icon(
                          CupertinoIcons.viewfinder,
                          size: 18,
                          color: isDark ? Colors.white : AppConstants.textDark,
                        ),
                      ),
                    ),

                    // Séparateur vertical discret
                    Container(
                      width: 1,
                      height: 14,
                      color: isDark ? Colors.white12 : Colors.black12,
                      margin: const EdgeInsets.symmetric(horizontal: 2),
                    ),

                    // Bouton 3 : Dictaphone Audio
                    ScaleTap(
                      onTap: () => Get.toNamed(Routes.DICTAPHONE),
                      child: Container(
                        padding: const EdgeInsets.all(7),
                        decoration: const BoxDecoration(shape: BoxShape.circle),
                        child: Icon(
                          CupertinoIcons.mic,
                          size: 18,
                          color: isDark ? Colors.white : AppConstants.textDark,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),

          // 3. Bouton Autonome Circulaire : Notifications
          Obx(() {
            final unread = salesController.unreadNotificationsCount.value;
            final isOpen = salesController.isNotificationsOpen.value;
            return ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                child: ScaleTap(
                  onTap: () => NotificationsModal.show(context, isDark: isDark),
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(9),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xCC1E1E22) : const Color(0xE6FFFFFF),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                            width: 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.06),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Icon(
                          isOpen ? CupertinoIcons.bell_fill : CupertinoIcons.bell,
                          size: 18,
                          color: isDark ? Colors.white : AppConstants.textDark,
                        ),
                      ),
                      if (unread > 0)
                        Positioned(
                          top: -1,
                          right: -1,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEF4444),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
                                width: 1.2,
                              ),
                            ),
                            child: Text(
                              unread > 9 ? '9+' : '$unread',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 8,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            );
          }),
          const SizedBox(width: 14),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(
            AppConstants.paddingLg,
            8,
            AppConstants.paddingLg,
            110,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Grand Titre iOS (34px Bold)
              Padding(
                padding: const EdgeInsets.only(top: 4, bottom: 6),
                child: Text(
                  AppConstants.salesVisitsTitle,
                  style: AppConstants.largeTitleStyle(isDark),
                ),
              ),
              Divider(
                height: 16,
                thickness: 0.5,
                color: isDark ? const Color(0x22FFFFFF) : const Color(0x15000000),
              ),
              const SizedBox(height: 8),

              // Section Rendez-vous : RDV en cours OU Carrousel 16:9
              Obx(() {
                final active = salesController.selectedEnterprise.value;

                // CAS 1 : RENDEZ-VOUS EN COURS (Cockpit Épuré Apple)
                if (active != null) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        clipBehavior: Clip.antiAlias,
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
                        child: Padding(
                          padding: const EdgeInsets.all(18),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Surtitre + Badge Solvabilité + Bouton Fermer (X)
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Row(
                                      children: [
                                        Flexible(
                                          child: Text(
                                            (active.sector ?? 'PROSPECT B2B').toUpperCase(),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: AppConstants.overlineStyle(isDark).copyWith(
                                              fontWeight: FontWeight.w700,
                                              color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        CreditRiskBadge(rating: active.creditRating, compact: true),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  // Bouton Fermer (X)
                                  ScaleTap(
                                    onTap: () => salesController.resetFlow(),
                                    child: Container(
                                      padding: const EdgeInsets.all(5),
                                      decoration: BoxDecoration(
                                        color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                                        shape: BoxShape.circle,
                                      ),
                                      child: Icon(
                                        CupertinoIcons.xmark,
                                        size: 13,
                                        color: isDark ? Colors.white70 : AppConstants.textDark,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),

                              // Nom de l'entreprise (20px w700)
                              Text(
                                active.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.4,
                                  color: isDark ? Colors.white : AppConstants.textDark,
                                ),
                              ),
                              const SizedBox(height: 3),

                              // Localisation (13px #8E8E93)
                              Text(
                                (active.address?.isNotEmpty == true)
                                    ? active.address!
                                    : (active.location ?? 'Kinshasa, RDC'),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                                ),
                              ),
                              const SizedBox(height: 16),

                              // CTA Principal Rond : Remplir le formulaire
                              ScaleTap(
                                onTap: () => Get.toNamed(Routes.VISIT_FORM),
                                child: Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.symmetric(vertical: 13),
                                  decoration: BoxDecoration(
                                    color: AppConstants.primaryBtnColor(isDark),
                                    borderRadius: BorderRadius.circular(30),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.12),
                                        blurRadius: 10,
                                        offset: const Offset(0, 3),
                                      ),
                                    ],
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        CupertinoIcons.square_pencil,
                                        size: 16,
                                        color: AppConstants.primaryBtnTextColor(isDark),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        "Remplir le formulaire",
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                          color: AppConstants.primaryBtnTextColor(isDark),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 10),

                              // Sous-actions compactes : Simulateur ROI + Message WhatsApp
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  // Outil 1 : Simulateur ROI
                                  ScaleTap(
                                    onTap: () => RoiSimulatorModal.show(context, enterprise: active),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                      decoration: BoxDecoration(
                                        color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(
                                            CupertinoIcons.chart_bar_alt_fill,
                                            size: 13,
                                            color: isDark ? Colors.white : AppConstants.textDark,
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            'Hypothèse ROI',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w700,
                                              color: isDark ? Colors.white : AppConstants.textDark,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),

                                  // Outil 2 : Partager Proposition
                                  ScaleTap(
                                    onTap: () => DealShareModal.show(context, enterprise: active),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                      decoration: BoxDecoration(
                                        color: isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(
                                            CupertinoIcons.share,
                                            size: 13,
                                            color: isDark ? Colors.white70 : AppConstants.textDark,
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            'Partager',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w700,
                                              color: isDark ? Colors.white : AppConstants.textDark,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  );
                }

                // CAS 2 : CARROUSEL DES COMPTES PRIORITAIRES (16:9)
                final appointments = salesController.searchResults;
                if (appointments.isEmpty) {
                  return Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(CupertinoIcons.calendar, color: Color(0xFF8E8E93), size: 22),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'AUCUN RENDEZ-VOUS EN COURS',
                                style: AppConstants.overlineStyle(isDark).copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Sélectionnez un compte sur la Map ou via le bouton de recherche.',
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
                  );
                }

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      height: 195,
                      child: PageView.builder(
                        controller: _pageController,
                        itemCount: appointments.length,
                        itemBuilder: (context, index) {
                          final ent = appointments[index];

                          return Container(
                            margin: const EdgeInsets.only(right: 12),
                            child: ScaleTap(
                              onTap: () {
                                salesController.selectEnterprise(ent);
                                Get.toNamed(Routes.VISIT_PREPARATION);
                              },
                              child: Container(
                                clipBehavior: Clip.antiAlias,
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
                                child: Padding(
                                  padding: const EdgeInsets.all(18),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          // Surtitre / Secteur + Badge Solvabilité avec protection responsive
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  (ent.sector ?? 'PROSPECT').toUpperCase(),
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                  style: AppConstants.overlineStyle(isDark).copyWith(
                                                    fontWeight: FontWeight.w700,
                                                    color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              CreditRiskBadge(rating: ent.creditRating, compact: true),
                                            ],
                                          ),
                                          const SizedBox(height: 6),
                                          // Grand Nom de l'entreprise
                                          Text(
                                            ent.name,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              fontSize: 19,
                                              fontWeight: FontWeight.w800,
                                              letterSpacing: -0.4,
                                              color: isDark ? Colors.white : AppConstants.textDark,
                                            ),
                                          ),
                                          const SizedBox(height: 3),
                                          // Métadonnées : Localisation
                                          Text(
                                            (ent.address?.isNotEmpty == true)
                                                ? ent.address!
                                                : (ent.location ?? 'Kinshasa, RDC'),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              fontSize: 12.5,
                                              color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                                            ),
                                          ),
                                        ],
                                      ),
                                      // Bouton CTA Débrief
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                            decoration: BoxDecoration(
                                              color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                                              borderRadius: BorderRadius.circular(AppConstants.borderRadiusPill),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Text(
                                                  'Voir le brief',
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.w700,
                                                    color: isDark ? Colors.white : AppConstants.textDark,
                                                  ),
                                                ),
                                                const SizedBox(width: 4),
                                                Icon(
                                                  CupertinoIcons.arrow_right,
                                                  size: 12,
                                                  color: isDark ? Colors.white : AppConstants.textDark,
                                                ),
                                              ],
                                            ),
                                          ),
                                          const Icon(
                                            CupertinoIcons.chevron_right,
                                            size: 15,
                                            color: Color(0xFF8E8E93),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                );
              }),
              const SizedBox(height: 28),

              // Titre de Section : Visites récentes (Title 2 : 22px Bold)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    AppConstants.recentVisitsTitle,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: isDark ? Colors.white : AppConstants.textDark,
                    ),
                  ),
                  ScaleTap(
                    onTap: () => Get.toNamed(Routes.VISITS_HISTORY),
                    child: Text(
                      'Voir tout',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : AppConstants.textDark,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Liste Visites récentes (Apple Music Geometry avec indent separator)
              Obx(() {
                final visits = salesController.visitsHistory.take(4).toList();
                if (visits.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Text(
                        'Aucune visite récente',
                        style: AppConstants.subheadStyle(isDark),
                      ),
                    ),
                  );
                }

                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: visits.length,
                  separatorBuilder: (_, _) => Divider(
                    color: isDark ? const Color(0x1FFFFFFF) : const Color(0x15000000),
                    height: 1,
                    thickness: 0.5,
                    indent: 56,
                  ),
                  itemBuilder: (context, index) {
                    final v = visits[index];
                    final isTransmitted = v.status == 'TRANSMIS';

                    return ScaleTap(
                      onTap: () => Get.toNamed(Routes.VISITS_HISTORY),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF1C1C1E) : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(
                                isTransmitted ? CupertinoIcons.checkmark_seal_fill : CupertinoIcons.clock_fill,
                                color: isTransmitted ? AppConstants.successGreen : const Color(0xFF8E8E93),
                                size: 20,
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
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                      color: isDark ? Colors.white : AppConstants.textDark,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    v.formattedTime,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Icon(
                              CupertinoIcons.ellipsis,
                              color: Color(0xFF8E8E93),
                              size: 16,
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              }),
            ],
          ),
        ),
      ),
    );
  }
}
