import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../controller/sales_controller.dart';
import '../../../routes/app_routes.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/skeleton_loader.dart';
import '../../../common/screen/widget/scale_tap.dart';
import '../../../common/screen/widget/aurora_background.dart';
import '../../../common/screen/widget/glass_card.dart';

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
            'Préparation de Visite',
            style: TextStyle(
              color: isDark ? Colors.white : AppConstants.textDark,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.3,
            ),
          ),
          actions: [
            IconButton(
              icon: Icon(LucideIcons.rotateCcw, color: isDark ? Colors.white70 : AppConstants.textDark, size: 18),
              tooltip: 'Actualiser',
              onPressed: () {
                final enterprise = salesController.selectedEnterprise.value;
                if (enterprise != null) {
                  salesController.prepareVisit();
                }
              },
            ),
          ],
        ),
        body: AuroraBackground(
          child: SafeArea(
            child: Obx(() {
              if (salesController.isCreatingPrep.value) {
                return const SkeletonListLoader(count: 3);
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
                        const Icon(Icons.assignment_late_rounded, size: 54, color: AppConstants.textMuted),
                        const SizedBox(height: 16),
                        Text(
                          'Aucune fiche de préparation',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: isDark ? Colors.white : AppConstants.textDark,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Sélectionnez une entreprise pour afficher les informations clés avant votre visite.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: isDark ? AppConstants.textSecondaryDark : AppConstants.textMuted, fontSize: 13),
                        ),
                        const SizedBox(height: 20),
                        ScaleTap(
                          onTap: () => Get.offNamed(Routes.ENTERPRISE_SEARCH),
                          child: ElevatedButton.icon(
                            onPressed: () => Get.offNamed(Routes.ENTERPRISE_SEARCH),
                            icon: const Icon(Icons.search_rounded, color: Colors.white),
                            label: const Text('Choisir une Entreprise', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF2563EB),
                              foregroundColor: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }

              return SingleChildScrollView(
                physics: const ClampingScrollPhysics(),
                padding: const EdgeInsets.all(AppConstants.paddingLg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Enterprise Info Header Card
                    RepaintBoundary(
                      child: GlassCard(
                        padding: const EdgeInsets.all(AppConstants.paddingLg),
                        child: Row(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF1E1E1E) : AppConstants.pureBlack,
                                borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
                                border: Border.all(
                                  color: isDark ? AppConstants.cardDarkBorder : Colors.transparent,
                                ),
                              ),
                              child: const Center(
                                child: Icon(Icons.business_rounded, color: Colors.white, size: 24),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    enterprise?.name ?? 'Entreprise',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: isDark ? Colors.white : AppConstants.textDark,
                                      fontSize: 18,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${enterprise?.sector ?? 'Secteur'} • ${enterprise?.location ?? 'Kinshasa / RDC'}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // ⚡ Brief Flash 30 Secondes (Innovation n°1 - Préparation Instantanée)
                    GlassCard(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF2563EB).withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(LucideIcons.zap, color: Color(0xFF2563EB), size: 16),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Brief Flash 30s',
                                      style: TextStyle(
                                        color: isDark ? Colors.white : AppConstants.textDark,
                                        fontWeight: FontWeight.w900,
                                        fontSize: 14,
                                        letterSpacing: -0.2,
                                      ),
                                    ),
                                    Text(
                                      'À consulter avant d\'entrer en rendez-vous',
                                      style: TextStyle(
                                        color: isDark ? AppConstants.textSecondaryDark : AppConstants.textMuted,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),

                          // Offre Orange Cible Prioritaire
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1E1E24) : const Color(0xFFF4F4F6),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isDark ? const Color(0x1AFFFFFF) : const Color(0x0A000000),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'OFFRE ORANGE CIBLE',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                    color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF2563EB),
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  prep.targetOffer,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                    color: isDark ? Colors.white : AppConstants.textDark,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),

                          // 5 Questions d'Or de Découverte
                          if (prep.goldenQuestions.isNotEmpty) ...[
                            Text(
                              '5 Questions d\'Or de Découverte :',
                              style: TextStyle(
                                color: isDark ? Colors.white70 : AppConstants.textSecondaryLight,
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
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
                                            fontWeight: FontWeight.w800,
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
                                          fontSize: 13,
                                          height: 1.35,
                                          color: isDark ? AppConstants.textLight : AppConstants.textDark,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }),
                          ],

                          // Alerte Concurrence & Risques
                          if (prep.competitorAlert.isNotEmpty) ...[
                            const SizedBox(height: 6),
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
                                  const Icon(LucideIcons.alertTriangle, color: Color(0xFFF59E0B), size: 16),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      prep.competitorAlert,
                                      style: TextStyle(
                                        fontSize: 12,
                                        height: 1.35,
                                        fontWeight: FontWeight.w700,
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

                    // Meeting Objective
                    _buildSectionCard(
                      context,
                      title: 'Objectif du Rendez-vous',
                      icon: LucideIcons.target,
                      content: prep.meetingObjective,
                    ),
                    const SizedBox(height: 14),

                    // Hypotheses to Verify
                    _buildSectionCard(
                      context,
                      title: 'Points clés à valider',
                      icon: LucideIcons.brain,
                      content: prep.hypothesisToVerify,
                    ),
                    const SizedBox(height: 14),

                    // Progressive Disclosure: Pitch Commercial collapsible
                    GlassCard(
                      padding: EdgeInsets.zero,
                      child: Column(
                        children: [
                          InkWell(
                            borderRadius: BorderRadius.circular(AppConstants.borderRadiusLg),
                            onTap: () => setState(() => _showAdvancedPitch = !_showAdvancedPitch),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: BoxDecoration(
                                      color: isDark ? const Color(0xFF222228) : const Color(0xFFF1F5F9),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Icon(LucideIcons.megaphone, color: isDark ? Colors.white70 : AppConstants.textDark, size: 18),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      'Argumentaire personnalisé',
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w800,
                                        color: isDark ? Colors.white : AppConstants.textDark,
                                      ),
                                    ),
                                  ),
                                  Icon(
                                    _showAdvancedPitch ? LucideIcons.chevronUp : LucideIcons.chevronDown,
                                    color: isDark ? Colors.white70 : AppConstants.textDark,
                                    size: 18,
                                  ),
                                ],
                              ),
                            ),
                          ),
                          if (_showAdvancedPitch)
                            Padding(
                              padding: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
                              child: Text(
                                prep.customPitch,
                                style: TextStyle(
                                  fontSize: 14,
                                  height: 1.5,
                                  color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    const SizedBox(height: 24),

                    // Primary Action Button: Launch Guided Offer Form
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ScaleTap(
                        onTap: () => Get.toNamed(Routes.VISIT_FORM),
                        child: Container(
                          decoration: BoxDecoration(
                            color: AppConstants.primaryBlue,
                            borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton),
                            boxShadow: [
                              BoxShadow(
                                color: AppConstants.primaryBlue.withValues(alpha: 0.3),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(LucideIcons.clipboardList, size: 20, color: Colors.white),
                              SizedBox(width: 8),
                              Text(
                                "Remplir le Formulaire de l'Offre",
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Secondary Action: Audio / Note-taking mode
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ScaleTap(
                        child: ElevatedButton.icon(
                          onPressed: () => Get.toNamed(Routes.DICTAPHONE),
                          icon: Icon(
                            LucideIcons.mic,
                            size: 18,
                            color: isDark ? Colors.white70 : AppConstants.textDark,
                          ),
                          label: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              'Mode Enregistrement Audio / Live',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: isDark ? Colors.white70 : AppConstants.textDark,
                              ),
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isDark ? const Color(0xFF27272A) : const Color(0xFFF1F5F9),
                            foregroundColor: isDark ? Colors.white : AppConstants.textDark,
                            elevation: 0,
                            side: BorderSide(
                              color: isDark ? const Color(0xFF3F3F46) : const Color(0xFFE2E8F0),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              );
            }),
          ),
        ),
      );
  }

  Widget _buildSectionCard(
    BuildContext context, {
    required String title,
    required IconData icon,
    required String content,
    Color? iconColor,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return RepaintBoundary(
      child: GlassCard(
        padding: const EdgeInsets.all(AppConstants.paddingLg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF222228) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: iconColor ?? (isDark ? Colors.white70 : AppConstants.textDark), size: 18),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: isDark ? Colors.white : AppConstants.textDark,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              content,
              style: TextStyle(
                fontSize: 14,
                height: 1.5,
                color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
