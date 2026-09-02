import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/sales_controller.dart';
import 'widget/credit_risk_badge.dart';
import 'widget/deal_share_modal.dart';
import '../../catalog/screen/widget/roi_simulator_modal.dart';
import '../../../routes/app_routes.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/skeleton_loader.dart';
import '../../../common/screen/widget/scale_tap.dart';

class VisitPreparationScreen extends StatefulWidget {
  const VisitPreparationScreen({super.key});

  @override
  State<VisitPreparationScreen> createState() => _VisitPreparationScreenState();
}

class _VisitPreparationScreenState extends State<VisitPreparationScreen> {
  bool _showAdvancedPitch = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final ctrl = Get.find<SalesController>();
      if (ctrl.selectedEnterprise.value != null && ctrl.currentPrep.value == null) {
        ctrl.prepareVisit();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final salesController = Get.find<SalesController>();

    return Scaffold(
      backgroundColor: isDark ? AppConstants.backgroundDark : AppConstants.backgroundLight,
      appBar: CupertinoNavigationBar(
        transitionBetweenRoutes: false,
        backgroundColor: isDark ? AppConstants.cardDark : AppConstants.cardLight,
        border: Border(
          bottom: BorderSide(
            color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
            width: 1,
          ),
        ),
        leading: ScaleTap(
          onTap: () => Get.back(),
          child: Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Icon(
              CupertinoIcons.chevron_back,
              color: isDark ? Colors.white : AppConstants.textDark,
              size: 18,
            ),
          ),
        ),
        middle: Obx(() {
          final enterprise = salesController.selectedEnterprise.value;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'PRÉPARATION DE VISITE',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                  color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                enterprise?.name ?? 'Entreprise Ciblée',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: isDark ? Colors.white : AppConstants.textDark,
                ),
              ),
            ],
          );
        }),
        trailing: ScaleTap(
          onTap: () {
            final enterprise = salesController.selectedEnterprise.value;
            if (enterprise != null) {
              salesController.prepareVisit();
            }
          },
          child: Icon(
            CupertinoIcons.arrow_clockwise,
            color: isDark ? Colors.white70 : AppConstants.textDark,
            size: 18,
          ),
        ),
      ),
      body: SafeArea(
        child: Obx(() {
          if (salesController.isCreatingPrep.value) {
            return const Padding(
              padding: EdgeInsets.all(16),
              child: SkeletonListLoader(count: 3),
            );
          }

          final prep = salesController.currentPrep.value;
          final enterprise = salesController.selectedEnterprise.value;

          if (prep == null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(AppConstants.paddingXl),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(CupertinoIcons.doc_text_search, size: 54, color: AppConstants.textMuted),
                    const SizedBox(height: 16),
                    Text(
                      'Aucune fiche de préparation',
                      style: AppConstants.headlineStyle(isDark),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Sélectionnez une entreprise pour afficher les informations clés avant votre visite.',
                      textAlign: TextAlign.center,
                      style: AppConstants.subheadStyle(isDark),
                    ),
                    const SizedBox(height: 20),
                    ScaleTap(
                      onTap: () => Get.offNamed(Routes.ENTERPRISE_SEARCH),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        decoration: BoxDecoration(
                          color: AppConstants.primaryBtnColor(isDark),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              CupertinoIcons.search,
                              color: AppConstants.primaryBtnTextColor(isDark),
                              size: 16,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Choisir une Entreprise',
                              style: TextStyle(
                                color: AppConstants.primaryBtnTextColor(isDark),
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          return SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ==========================================
                // 1. PRÉSENTATION DE L'ENTREPRISE
                // ==========================================
                Text(
                  '1. Présentation de l\'entreprise',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.2,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                ),
                const SizedBox(height: 8),
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
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Center(
                              child: Icon(
                                CupertinoIcons.building_2_fill,
                                color: isDark ? Colors.white : AppConstants.textDark,
                                size: 22,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        enterprise?.name ?? 'Entreprise',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700,
                                          color: isDark ? Colors.white : AppConstants.textDark,
                                        ),
                                      ),
                                    ),
                                    if (enterprise != null)
                                      CreditRiskBadge(rating: enterprise.creditRating, compact: true),
                                  ],
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  '${enterprise?.sector ?? 'Secteur'} • ${enterprise?.location ?? 'Kinshasa / RDC'}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      if (enterprise != null && enterprise.aiBriefSummary.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF242426) : const Color(0xFFF8F8FA),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isDark ? const Color(0x1AFFFFFF) : const Color(0xFFE5E5EA),
                              width: 1,
                            ),
                          ),
                          child: Text(
                            enterprise.aiBriefSummary,
                            style: TextStyle(
                              fontSize: 12.5,
                              height: 1.4,
                              color: isDark ? Colors.white : AppConstants.textDark,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // ==========================================
                // 2. OBJECTIFS DU RDV
                // ==========================================
                Text(
                  '2. Objectifs du RDV',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.2,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                ),
                const SizedBox(height: 8),
                _buildSectionCard(
                  context,
                  title: 'Objectifs Stratégiques & Commerciaux',
                  icon: CupertinoIcons.scope,
                  content: prep.meetingObjective,
                ),
                const SizedBox(height: 18),

                // ==========================================
                // 3. POINTS CLÉS À VALIDER
                // ==========================================
                Text(
                  '3. Points clés à valider',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.2,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                ),
                const SizedBox(height: 8),
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
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              CupertinoIcons.checkmark_seal_fill,
                              color: isDark ? Colors.white : AppConstants.textDark,
                              size: 16,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Hypothèses & Éléments Décisifs',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: isDark ? Colors.white : AppConstants.textDark,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        prep.hypothesisToVerify,
                        style: TextStyle(
                          fontSize: 12.5,
                          height: 1.4,
                          color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF3A3A3C),
                        ),
                      ),
                      if (prep.goldenQuestions.isNotEmpty) ...[
                        const SizedBox(height: 14),
                        Text(
                          'Questions d\'Or de Découverte :',
                          style: AppConstants.overlineStyle(isDark).copyWith(
                            fontWeight: FontWeight.w700,
                            color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                          ),
                        ),
                        const SizedBox(height: 8),
                        ...prep.goldenQuestions.asMap().entries.map((entry) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 20,
                                  height: 20,
                                  margin: const EdgeInsets.only(top: 1),
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                                  ),
                                  child: Center(
                                    child: Text(
                                      '${entry.key + 1}',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: isDark ? Colors.white : AppConstants.textDark,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    entry.value,
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      color: isDark ? Colors.white : AppConstants.textDark,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // ==========================================
                // 4. OFFRES CIBLES
                // ==========================================
                Text(
                  '4. Offres cibles',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.2,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                ),
                const SizedBox(height: 8),
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
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Offre Orange Cible Prioritaire
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF242426) : const Color(0xFFF8F8FA),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isDark ? const Color(0x1AFFFFFF) : const Color(0xFFE5E5EA),
                            width: 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  CupertinoIcons.cube_box_fill,
                                  size: 14,
                                  color: isDark ? Colors.white : AppConstants.textDark,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'SOLUTION ORANGE RECOMMANDÉE',
                                  style: AppConstants.overlineStyle(isDark).copyWith(
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              prep.targetOffer,
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: isDark ? Colors.white : AppConstants.textDark,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Argumentaire personnalisé
                      InkWell(
                        borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
                        onTap: () => setState(() => _showAdvancedPitch = !_showAdvancedPitch),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            children: [
                              const Icon(CupertinoIcons.sparkles, color: Color(0xFFF59E0B), size: 16),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Argumentaire & Pitch de Valeur',
                                  style: TextStyle(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? Colors.white : AppConstants.textDark,
                                  ),
                                ),
                              ),
                              Icon(
                                _showAdvancedPitch ? CupertinoIcons.chevron_up : CupertinoIcons.chevron_down,
                                color: const Color(0xFF8E8E93),
                                size: 14,
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (_showAdvancedPitch) ...[
                        const SizedBox(height: 6),
                        Text(
                          prep.customPitch,
                          style: TextStyle(
                            fontSize: 12.5,
                            height: 1.4,
                            color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF3A3A3C),
                          ),
                        ),
                      ],

                      // Alerte Concurrence si présente
                      if (prep.competitorAlert.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF261C14) : const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: const Color(0xFFF59E0B).withValues(alpha: 0.3),
                            ),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(CupertinoIcons.exclamationmark_triangle_fill, color: Color(0xFFF59E0B), size: 15),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  prep.competitorAlert,
                                  style: TextStyle(
                                    fontSize: 11,
                                    height: 1.35,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? const Color(0xFFFCD34D) : const Color(0xFF92400E),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Actions secondaires : Simulateur ROI & Partage WhatsApp
                Row(
                  children: [
                    Expanded(
                      child: ScaleTap(
                        onTap: () {
                          if (enterprise != null) {
                            RoiSimulatorModal.show(context, enterprise: enterprise);
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 11),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                              width: 1,
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                CupertinoIcons.chart_bar_alt_fill,
                                size: 14,
                                color: isDark ? Colors.white : AppConstants.textDark,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Simulateur ROI',
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
                    const SizedBox(width: 8),
                    Expanded(
                      child: ScaleTap(
                        onTap: () {
                          if (enterprise != null) {
                            DealShareModal.show(context, enterprise: enterprise, offerName: prep.targetOffer);
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 11),
                          decoration: BoxDecoration(
                            color: const Color(0xFF25D366),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(CupertinoIcons.chat_bubble_2_fill, size: 14, color: Colors.white),
                              SizedBox(width: 6),
                              Text(
                                'WhatsApp',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // ==========================================
                // BOUTONS D'ACTION PRINCIPAUX
                // ==========================================
                // 1. Bouton Principal : Remplir le formulaire
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ScaleTap(
                    onTap: () => Get.toNamed(Routes.VISIT_FORM),
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppConstants.primaryBtnColor(isDark),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.15),
                            blurRadius: 14,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            CupertinoIcons.square_pencil,
                            size: 18,
                            color: AppConstants.primaryBtnTextColor(isDark),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            "Remplir le formulaire",
                            style: TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                              color: AppConstants.primaryBtnTextColor(isDark),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                // 2. Bouton Secondaire : Lancer la conversation avec le prospect
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ScaleTap(
                    onTap: () => Get.toNamed(Routes.DICTAPHONE),
                    child: Container(
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            CupertinoIcons.mic_fill,
                            size: 16,
                            color: isDark ? Colors.white : AppConstants.textDark,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Lancer la conversation avec le prospect',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: isDark ? Colors.white : AppConstants.textDark,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          );
        }),
      ),
    );
  }

  Widget _buildSectionCard(
    BuildContext context, {
    required String title,
    required IconData icon,
    required String content,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: isDark ? Colors.white : AppConstants.textDark, size: 16),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            content,
            style: TextStyle(
              fontSize: 12.5,
              height: 1.4,
              color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF3A3A3C),
            ),
          ),
        ],
      ),
    );
  }
}
