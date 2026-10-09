import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../controller/sales_controller.dart';
import '../model/visit_report_model.dart';
import '../../../core/api/api_config.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';
import '../../../common/screen/widget/aurora_background.dart';

/// Écran de Détail du Compte-Rendu de Visite (Apple Design System & DESIGN.md)
/// Présente l'intégralité des données commerciales synthétisées dans une SEULE carte unifiée et minimaliste.
class VisitReportDetailScreen extends StatefulWidget {
  const VisitReportDetailScreen({super.key});

  @override
  State<VisitReportDetailScreen> createState() => _VisitReportDetailScreenState();
}

class _VisitReportDetailScreenState extends State<VisitReportDetailScreen> {
  static const List<String> _frenchMonths = [
    '', 'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
    'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'
  ];

  String _formatFrenchDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return 'Date non précisée';
    try {
      final dt = DateTime.parse(dateStr).toLocal();
      final day = dt.day.toString().padLeft(2, '0');
      final month = (dt.month >= 1 && dt.month <= 12) ? _frenchMonths[dt.month] : '${dt.month}';
      final year = dt.year;
      final hour = dt.hour.toString().padLeft(2, '0');
      final minute = dt.minute.toString().padLeft(2, '0');
      return '$day $month $year à ${hour}h$minute';
    } catch (_) {
      return dateStr;
    }
  }

  void _copyToClipboard(String text, String label) {
    if (text.trim().isEmpty) return;
    Clipboard.setData(ClipboardData(text: text));
    HapticFeedback.lightImpact();
    Get.snackbar(
      label,
      'Copié dans le presse-papiers.',
      snackPosition: SnackPosition.BOTTOM,
      backgroundColor: const Color(0xFF1E1E22),
      colorText: Colors.white,
      duration: const Duration(seconds: 2),
      margin: const EdgeInsets.all(16),
      borderRadius: 12,
    );
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
        leading: ScaleTap(
          onTap: () => Get.back(),
          child: Container(
            margin: const EdgeInsets.only(left: 14),
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
              shape: BoxShape.circle,
            ),
            child: Icon(
              CupertinoIcons.chevron_back,
              size: 20,
              color: isDark ? Colors.white : AppConstants.textDark,
            ),
          ),
        ),
        title: Text(
          'Compte-rendu de visite',
          style: TextStyle(
            color: isDark ? Colors.white : AppConstants.textDark,
            fontWeight: FontWeight.w600,
            fontSize: 17,
            letterSpacing: -0.3,
          ),
        ),
        centerTitle: true,
        actions: [
          Obx(() {
            final report = salesController.currentReport.value;
            if (report == null) return const SizedBox.shrink();
            return ScaleTap(
              onTap: () async {
                final pdfUrl = '${ApiConfig.baseUrl}/api/sales/visit-reports/${report.id}/export/?format=pdf';
                final uri = Uri.parse(pdfUrl);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                } else {
                  Get.snackbar('Export PDF', 'Lien : $pdfUrl');
                }
              },
              child: Container(
                margin: const EdgeInsets.only(right: 14),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  LucideIcons.download,
                  size: 18,
                  color: isDark ? Colors.white : AppConstants.textDark,
                ),
              ),
            );
          }),
        ],
      ),
      body: AuroraBackground(
        child: SafeArea(
          child: Obx(() {
            final report = salesController.currentReport.value;
            final enterprise = salesController.selectedEnterprise.value;

            if (report == null) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(CupertinoIcons.doc_text, size: 48, color: Color(0xFF8E8E93)),
                    const SizedBox(height: 12),
                    Text(
                      'Aucun compte-rendu chargé',
                      style: AppConstants.headlineStyle(isDark),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Sélectionnez une visite dans l\'historique.',
                      style: AppConstants.subheadStyle(isDark),
                    ),
                  ],
                ),
              );
            }

            final isTransmitted = report.hasDossier;
            final bant = report.bantScore;
            final coi = report.coiMetrics;

            return SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ============================================================
                  // CARTE UNIQUE ET MINIMALISTE REGROUPANT TOUTES LES INFORMATIONS
                  // (Conforme stricte DESIGN.md : fond plein, 0px border, dividers)
                  // ============================================================
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                    decoration: BoxDecoration(
                      color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
                      borderRadius: BorderRadius.circular(22),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.05),
                          blurRadius: 18,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 1. EN-TÊTE DE LA CARTE : Entreprise & Métadonnées
                        _buildHeaderSection(context, isDark, report, enterprise, isTransmitted),

                        _buildDivider(isDark),

                        // 2. SYNTHÈSE EXÉCUTIVE CORE AI
                        _buildSummarySection(isDark, report),

                        // 3. QUALIFICATION BANT & IMPACT FINANCIER (COI / ROI)
                        if (bant != null || coi != null) ...[
                          _buildDivider(isDark),
                          _buildBantAndRoiSection(isDark, bant, coi),
                        ],

                        // 4. BESOINS CONFIRMÉS & OBJECTIONS RELEVÉES
                        if (report.confirmedNeeds.isNotEmpty || report.objectionsRaised.isNotEmpty) ...[
                          _buildDivider(isDark),
                          _buildNeedsAndObjectionsSection(isDark, report),
                        ],

                        // 5. PLAN D'ACTIONS & PROCHAINES ÉTAPES
                        if (report.actionsTodo.isNotEmpty) ...[
                          _buildDivider(isDark),
                          _buildActionsSection(isDark, report),
                        ],

                        // 6. OFFRES RECOMMANDÉES & PACKAGES TIERÉS
                        if (report.tieredPackages.isNotEmpty) ...[
                          _buildDivider(isDark),
                          _buildPackagesSection(isDark, report),
                        ],

                        // 7. RETRANSCRIPTION DE L'ÉCHANGE (AUDIO / NOTES)
                        if (report.rawTranscript.trim().isNotEmpty) ...[
                          _buildDivider(isDark),
                          _buildTranscriptSection(isDark, report),
                        ],

                        // 8. BROUILLON D'EMAIL COMMERCIAL PRÊT À L'ENVOI
                        if (report.followUpEmailDraft.trim().isNotEmpty) ...[
                          _buildDivider(isDark),
                          _buildEmailSection(isDark, report),
                        ],

                        _buildDivider(isDark),

                        // 9. ACTION DE TRANSMISSION AU BACK-OFFICE KAM
                        _buildBackOfficeActionSection(context, isDark, report, salesController, isTransmitted),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
        ),
      ),
    );
  }

  // =========================================================================
  // SECTIONS MINIMALISTES INTÉGRÉES DANS LA CARTE UNIQUE
  // =========================================================================

  Widget _buildDivider(bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 18),
      child: Divider(
        height: 1,
        thickness: 0.5,
        color: isDark ? const Color(0x1EFFFFFF) : const Color(0x14000000),
      ),
    );
  }

  /// 1. En-tête : Nom, badges, localisation, date et temps IA
  Widget _buildHeaderSection(
    BuildContext context,
    bool isDark,
    VisitReportModel report,
    dynamic enterprise,
    bool isTransmitted,
  ) {
    final durationSec = report.processingTimeSeconds;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    enterprise?.name ?? 'Compte Commercial',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.4,
                      color: isDark ? Colors.white : AppConstants.textDark,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${enterprise?.sector ?? "Services"} • ${enterprise?.location ?? "Kinshasa"}',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6E6C67),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            // Badge de statut (Transmis vs Enregistré)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: isTransmitted
                    ? const Color(0xFF10B981).withValues(alpha: 0.15)
                    : const Color(0xFF4F6CE8).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppConstants.borderRadiusPill),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    isTransmitted ? LucideIcons.checkCheck : LucideIcons.fileCheck,
                    size: 13,
                    color: isTransmitted ? const Color(0xFF10B981) : const Color(0xFF4F6CE8),
                  ),
                  const SizedBox(width: 5),
                  Text(
                    isTransmitted ? 'Transmis KAM' : 'Qualifié',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: isTransmitted ? const Color(0xFF10B981) : const Color(0xFF4F6CE8),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 6,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(LucideIcons.calendar, size: 13, color: isDark ? const Color(0xFF8E8E93) : const Color(0xFF6E6C67)),
                const SizedBox(width: 6),
                Text(
                  _formatFrenchDate(report.createdAt),
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6E6C67),
                  ),
                ),
              ],
            ),
            if (durationSec != null && durationSec > 0)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(LucideIcons.zap, size: 13, color: Color(0xFF10B981)),
                  const SizedBox(width: 4),
                  Text(
                    'Core AI (${durationSec.toStringAsFixed(1)}s)',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF10B981),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ],
    );
  }

  /// 2. Synthèse exécutive
  Widget _buildSummarySection(bool isDark, VisitReportModel report) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(LucideIcons.sparkles, size: 16, color: Color(0xFF4F6CE8)),
            const SizedBox(width: 8),
            Text(
              'Synthèse Exécutive',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : AppConstants.textDark,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Text(
          report.executiveSummary.trim().isNotEmpty
              ? report.executiveSummary.trim()
              : "Compte-rendu de visite rédigé suite à l'échange commercial terrain.",
          style: TextStyle(
            fontSize: 13,
            height: 1.45,
            color: isDark ? const Color(0xFFE4E4E7) : const Color(0xFF27272A),
          ),
        ),
      ],
    );
  }

  /// 3. Score BANT & Diagnostic Financier (COI / ROI)
  Widget _buildBantAndRoiSection(bool isDark, Map<String, dynamic>? bant, Map<String, dynamic>? coi) {
    final score = bant?['score'] ?? bant?['bant_score'] ?? 75;
    final budget = bant?['budget']?.toString() ?? 'Non évalué';
    final authority = bant?['authority']?.toString() ?? 'Non évalué';
    final need = bant?['need']?.toString() ?? 'Non évalué';
    final timeline = bant?['timeline']?.toString() ?? 'Non précisé';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(LucideIcons.target, size: 16, color: Color(0xFF4F6CE8)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Qualification BANT & Rentabilité',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : AppConstants.textDark,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                '$score/100',
                style: const TextStyle(
                  color: Color(0xFF10B981),
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        // 4 Piliers BANT
        _buildBantRow(isDark, 'Budget', budget),
        _buildBantRow(isDark, 'Autorité (Décideur)', authority),
        _buildBantRow(isDark, 'Besoin Exprimé', need),
        _buildBantRow(isDark, 'Échéance Projet', timeline),

        // Données financières COI si disponibles
        if (coi != null && coi.isNotEmpty) ...[
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              if (coi['cost_of_inaction_usd'] != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'Pertes évitées (COI) : \$${coi['cost_of_inaction_usd']}/an',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFFF59E0B)),
                  ),
                ),
              if (coi['estimated_net_gain_usd'] != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'Gain Net Estimé : \$${coi['estimated_net_gain_usd']}/an',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF10B981)),
                  ),
                ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildBantRow(bool isDark, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 4,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6E6C67),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 5,
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : AppConstants.textDark,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 4. Besoins confirmés & Objections
  Widget _buildNeedsAndObjectionsSection(bool isDark, VisitReportModel report) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (report.confirmedNeeds.isNotEmpty) ...[
          Row(
            children: [
              const Icon(LucideIcons.checkCircle2, size: 16, color: Color(0xFF10B981)),
              const SizedBox(width: 8),
              Text(
                'Besoins Confirmés',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : AppConstants.textDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...report.confirmedNeeds.map((need) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(top: 4, right: 8),
                      child: Icon(LucideIcons.check, size: 12, color: Color(0xFF10B981)),
                    ),
                    Expanded(
                      child: Text(
                        need,
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? const Color(0xFFE4E4E7) : const Color(0xFF27272A),
                        ),
                      ),
                    ),
                  ],
                ),
              )),
        ],
        if (report.objectionsRaised.isNotEmpty) ...[
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(LucideIcons.shieldAlert, size: 16, color: Color(0xFFF59E0B)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Points de Vigilance & Objections',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : AppConstants.textDark,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...report.objectionsRaised.map((obj) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(top: 4, right: 8),
                      child: Icon(LucideIcons.info, size: 12, color: Color(0xFFF59E0B)),
                    ),
                    Expanded(
                      child: Text(
                        obj,
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? const Color(0xFFE4E4E7) : const Color(0xFF27272A),
                        ),
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ],
    );
  }

  /// 5. Plan d'actions
  Widget _buildActionsSection(bool isDark, VisitReportModel report) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(LucideIcons.listTodo, size: 16, color: Color(0xFF4F6CE8)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Plan d\'Actions Immédiat',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : AppConstants.textDark,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ...report.actionsTodo.map((action) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(top: 4, right: 8),
                    child: Icon(LucideIcons.arrowRight, size: 12, color: Color(0xFF4F6CE8)),
                  ),
                  Expanded(
                    child: Text(
                      action,
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? const Color(0xFFE4E4E7) : const Color(0xFF27272A),
                      ),
                    ),
                  ),
                ],
              ),
            )),
      ],
    );
  }

  /// 6. Packages & Solutions recommandées
  Widget _buildPackagesSection(bool isDark, VisitReportModel report) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(LucideIcons.packageCheck, size: 16, color: Color(0xFF4F6CE8)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Solutions & Packages Recommandés',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : AppConstants.textDark,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        ...report.tieredPackages.map((pkg) {
          final name = pkg['name'] ?? pkg['tier_name'] ?? 'Solution Orange Business';
          final price = pkg['monthly_price_usd'] ?? pkg['price'];
          final desc = pkg['description'] ?? '';

          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.only(top: 3, right: 8),
                  child: Icon(LucideIcons.check, size: 13, color: Color(0xFF4F6CE8)),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Flexible(
                            child: Text(
                              name.toString(),
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white : AppConstants.textDark,
                              ),
                            ),
                          ),
                          if (price != null) ...[
                            Text(
                              '\$$price/mois',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF4F6CE8),
                              ),
                            ),
                          ],
                        ],
                      ),
                      if (desc.toString().isNotEmpty) ...[
                        Text(
                          desc.toString(),
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6E6C67),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  /// 7. Retranscription de l'échange
  Widget _buildTranscriptSection(bool isDark, VisitReportModel report) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(LucideIcons.mic, size: 16, color: Color(0xFF4F6CE8)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Retranscription de l\'Échange',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : AppConstants.textDark,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            ScaleTap(
              onTap: () => _copyToClipboard(report.rawTranscript, 'Transcription'),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(LucideIcons.copy, size: 13, color: Color(0xFF4F6CE8)),
                  SizedBox(width: 4),
                  Text('Copier', style: TextStyle(fontSize: 11, color: Color(0xFF4F6CE8), fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Text(
          report.rawTranscript.trim(),
          style: TextStyle(
            fontSize: 12,
            height: 1.45,
            color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6E6C67),
          ),
        ),
      ],
    );
  }

  /// 8. Brouillon d'email de suivi
  Widget _buildEmailSection(bool isDark, VisitReportModel report) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(LucideIcons.mail, size: 16, color: Color(0xFF4F6CE8)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Brouillon d\'Email Commercial',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : AppConstants.textDark,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            ScaleTap(
              onTap: () => _copyToClipboard(report.followUpEmailDraft, 'Brouillon d\'email'),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(LucideIcons.copy, size: 13, color: Color(0xFF4F6CE8)),
                  SizedBox(width: 4),
                  Text('Copier', style: TextStyle(fontSize: 11, color: Color(0xFF4F6CE8), fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Text(
          report.followUpEmailDraft.trim(),
          style: TextStyle(
            fontSize: 12,
            height: 1.45,
            color: isDark ? const Color(0xFFE4E4E7) : const Color(0xFF27272A),
          ),
        ),
      ],
    );
  }

  /// 9. Statut et action Back-Office KAM
  Widget _buildBackOfficeActionSection(
    BuildContext context,
    bool isDark,
    VisitReportModel report,
    SalesController salesController,
    bool isTransmitted,
  ) {
    if (isTransmitted) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const Icon(LucideIcons.checkCheck, size: 18, color: Color(0xFF10B981)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Dossier synchronisé et transmis au Back-Office KAM',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isDark ? const Color(0xFF10B981) : const Color(0xFF059669),
              ),
            ),
          ),
        ],
      );
    }

    return Obx(() {
      final isTransmitting = salesController.isTransmitting.value;

      return ScaleTap(
        onTap: isTransmitting
            ? null
            : () async {
                final success = await salesController.transmitReportToKAM();
                if (success) {
                  Get.snackbar(
                    'Back-Office KAM',
                    'Compte-rendu transmis avec succès.',
                    snackPosition: SnackPosition.BOTTOM,
                    backgroundColor: const Color(0xFF10B981),
                    colorText: Colors.white,
                  );
                }
              },
        child: Container(
          width: double.infinity,
          height: 48,
          decoration: BoxDecoration(
            color: const Color(0xFF4F6CE8),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Center(
            child: isTransmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(LucideIcons.send, size: 16, color: Colors.white),
                      SizedBox(width: 8),
                      Text(
                        'Transmettre au Back-Office KAM',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      );
    });
  }
}
