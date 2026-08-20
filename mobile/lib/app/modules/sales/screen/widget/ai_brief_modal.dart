import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../model/enterprise_model.dart';
import '../../controller/sales_controller.dart';
import '../../../../routes/app_routes.dart';
import '../../../../common/constants/app_constants.dart';
import '../../../../common/screen/widget/glass_card.dart';
import '../../../../common/screen/widget/scale_tap.dart';

/// Modal Débrief Commercial
/// Affiche la synthèse du compte, le pitch commercial et les solutions préconisées.
class AiBriefModal extends StatelessWidget {
  final EnterpriseModel enterprise;

  const AiBriefModal({super.key, required this.enterprise});

  static void show(BuildContext context, EnterpriseModel enterprise) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => AiBriefModal(enterprise: enterprise),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final salesCtrl = Get.find<SalesController>();

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF121214) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(
            color: isDark ? AppConstants.glassDarkBorder : AppConstants.borderLight,
            width: 1.5,
          ),
        ),
      ),
      padding: EdgeInsets.fromLTRB(
        AppConstants.paddingLg,
        14,
        AppConstants.paddingLg,
        MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          physics: const ClampingScrollPhysics(),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Poignée de glissement
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF333338) : const Color(0xFFD1D5DB),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // En-tête : Nom & Statut
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E1E22) : AppConstants.pureBlack,
                      borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
                    ),
                    child: Center(
                      child: Text(
                        enterprise.name.isNotEmpty ? enterprise.name[0].toUpperCase() : 'E',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 20,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          enterprise.name,
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.3,
                            color: isDark ? Colors.white : AppConstants.textDark,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${enterprise.sector} • ${enterprise.location}',
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: enterprise.isConverted
                          ? AppConstants.successGreen.withValues(alpha: 0.15)
                          : AppConstants.accentYellow.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppConstants.borderRadiusPill),
                      border: Border.all(
                        color: enterprise.isConverted ? AppConstants.successGreen : AppConstants.accentYellow,
                        width: 1.0,
                      ),
                    ),
                    child: Text(
                      enterprise.isConverted ? 'Converti' : 'À convertir',
                      style: TextStyle(
                        color: enterprise.isConverted ? AppConstants.successGreen : const Color(0xFFD97706),
                        fontWeight: FontWeight.w800,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Synthèse du compte
              Text(
                'Diagnostic du Compte',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: isDark ? Colors.white : AppConstants.textDark,
                ),
              ),
              const SizedBox(height: 6),
              GlassCard(
                padding: const EdgeInsets.all(12),
                borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
                child: Text(
                  enterprise.aiBriefSummary,
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.4,
                    color: isDark ? Colors.white70 : AppConstants.textDark,
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Solutions Orange B2B
              Text(
                'Solutions Recommandées Orange B2B',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: isDark ? Colors.white : AppConstants.textDark,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: enterprise.keyNeeds.map((need) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E1E24) : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(AppConstants.borderRadiusPill),
                      border: Border.all(
                        color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                      ),
                    ),
                    child: Text(
                      need,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : AppConstants.textDark,
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 14),

              // Pitch commercial
              if (enterprise.customPitch != null) ...[
                Text(
                  'Pitch Commercial Conseillé',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                ),
                const SizedBox(height: 6),
                GlassCard(
                  padding: const EdgeInsets.all(12),
                  borderRadius: BorderRadius.circular(AppConstants.borderRadiusMd),
                  child: Text(
                    enterprise.customPitch!,
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.4,
                      color: isDark ? Colors.white : AppConstants.textDark,
                    ),
                  ),
                ),
                const SizedBox(height: 18),
              ],

              // Actions
              Row(
                children: [
                  Expanded(
                    child: ScaleTap(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(context);
                          salesCtrl.selectEnterprise(enterprise);
                          Get.toNamed(Routes.VISIT_PREPARATION);
                        },
                        icon: const Icon(Icons.directions_run_rounded, size: 18, color: Colors.white),
                        label: const Text(
                          'Démarrer Visite',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppConstants.orangeOfficial,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  ScaleTap(
                    onTap: () {
                      Navigator.pop(context);
                      salesCtrl.selectEnterprise(enterprise);
                      Get.toNamed(Routes.DICTAPHONE);
                    },
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E1E24) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton),
                        border: Border.all(
                          color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                        ),
                      ),
                      child: Icon(
                        Icons.mic_rounded,
                        color: isDark ? Colors.white : AppConstants.textDark,
                        size: 20,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
