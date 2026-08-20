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
            'Brief & Pitch de Visite IA',
            style: TextStyle(
              color: isDark ? Colors.white : AppConstants.textDark,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.3,
            ),
          ),
          actions: [
            IconButton(
              icon: Icon(LucideIcons.rotateCcw, color: isDark ? Colors.white70 : AppConstants.textDark, size: 18),
              tooltip: 'Régénérer le brief',
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
                          'Aucune préparation générée',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: isDark ? Colors.white : AppConstants.textDark,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Sélectionnez un prospect B2B pour que l\'IA génère un brief d\'entretien personnalisé.',
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
                              backgroundColor: AppConstants.orangeOfficial,
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
                      title: 'Hypothèses Terrain à Vérifier',
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
                                      'Pitch Commercial Sur-Mesure',
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

                    // Key Questions
                    _buildSectionCard(
                      context,
                      title: 'Questions Clés à Poser',
                      icon: LucideIcons.helpCircle,
                      content: prep.keyQuestions,
                    ),
                    const SizedBox(height: 24),

                    // Action Button: Launch Voice Dictaphone
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ScaleTap(
                        child: ElevatedButton.icon(
                          onPressed: () => Get.toNamed(Routes.DICTAPHONE),
                          icon: Icon(
                            LucideIcons.mic,
                            size: 20,
                            color: isDark ? const Color(0xFF121214) : Colors.white,
                          ),
                          label: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              'Démarrer l\'Enregistrement Vocal (Dictaphone)',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: isDark ? const Color(0xFF121214) : Colors.white,
                              ),
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isDark ? Colors.white : const Color(0xFF18181B),
                            foregroundColor: isDark ? const Color(0xFF121214) : Colors.white,
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
