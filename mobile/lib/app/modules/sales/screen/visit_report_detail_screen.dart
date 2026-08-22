import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../controller/sales_controller.dart';
import '../../../core/api/api_config.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';
import '../../../common/screen/widget/aurora_background.dart';
import '../../../common/screen/widget/glass_card.dart';
import 'field_intelligence_screen.dart';

class VisitReportDetailScreen extends StatefulWidget {
  const VisitReportDetailScreen({super.key});

  @override
  State<VisitReportDetailScreen> createState() => _VisitReportDetailScreenState();
}

class _VisitReportDetailScreenState extends State<VisitReportDetailScreen> {
  late TextEditingController _emailController;
  bool _isEditingEmail = false;

  @override
  void initState() {
    super.initState();
    final salesController = Get.find<SalesController>();
    final draft = salesController.currentReport.value?.followUpEmailDraft ?? '';
    _emailController = TextEditingController(text: draft);
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  void _copyEmailToClipboard() {
    Clipboard.setData(ClipboardData(text: _emailController.text));
    Get.snackbar(
      'Copié !',
      'Le brouillon d\'email a été copié dans le presse-papiers.',
      snackPosition: SnackPosition.BOTTOM,
      backgroundColor: AppConstants.pureBlack,
      colorText: Colors.white,
      duration: const Duration(seconds: 2),
      margin: const EdgeInsets.all(16),
      borderRadius: 12,
    );
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
            'Rapport de Visite Synthétisé',
            style: TextStyle(
              color: isDark ? Colors.white : AppConstants.textDark,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.3,
            ),
          ),
          actions: [
            Obx(() {
              final report = salesController.currentReport.value;
              if (report == null) return const SizedBox.shrink();
              return IconButton(
                icon: Icon(LucideIcons.download, color: isDark ? Colors.white70 : AppConstants.textDark, size: 20),
                tooltip: 'Télécharger Export PDF',
                onPressed: () async {
                  final pdfUrl = '${ApiConfig.activeBaseUrl}/api/sales/visit-reports/${report.id}/export/?format=pdf';
                  final uri = Uri.parse(pdfUrl);
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  } else {
                    Get.snackbar('Ouverture PDF', 'Lien PDF : $pdfUrl');
                  }
                },
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
                  child: Text(
                    'Aucun rapport disponible.',
                    style: TextStyle(color: isDark ? Colors.white70 : AppConstants.textDark),
                  ),
                );
              }

              return SingleChildScrollView(
                physics: const ClampingScrollPhysics(),
                padding: const EdgeInsets.all(AppConstants.paddingLg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Success Transmitted Notification Banner
                    if (salesController.successMessage.value.isNotEmpty) ...[
                      RepaintBoundary(
                        child: Container(
                          padding: const EdgeInsets.all(AppConstants.paddingLg),
                          margin: const EdgeInsets.only(bottom: AppConstants.marginLg),
                          decoration: BoxDecoration(
                            color: AppConstants.successGreen.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(AppConstants.borderRadiusLg),
                            border: Border.all(color: AppConstants.successGreen.withValues(alpha: 0.5)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.check_circle_rounded, color: AppConstants.successGreen, size: 28),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  salesController.successMessage.value,
                                  style: const TextStyle(color: AppConstants.successGreen, fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],

                    // Error Banner with Direct Retry Action
                    if (salesController.errorMessage.value.isNotEmpty) ...[
                      RepaintBoundary(
                        child: Container(
                          padding: const EdgeInsets.all(AppConstants.paddingLg),
                          margin: const EdgeInsets.only(bottom: AppConstants.marginLg),
                          decoration: BoxDecoration(
                            color: Colors.red.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(AppConstants.borderRadiusLg),
                            border: Border.all(color: Colors.redAccent.withValues(alpha: 0.5)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 28),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  salesController.errorMessage.value,
                                  style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                              ),
                              TextButton(
                                onPressed: () => salesController.transmitReportToKAM(),
                                child: const Text('Réessayer', style: TextStyle(color: AppConstants.orangeOfficial, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],

                    // Enterprise Title Card
                    RepaintBoundary(
                      child: GlassCard(
                        padding: const EdgeInsets.all(18),
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
                                child: Icon(Icons.description_rounded, color: Colors.white, size: 24),
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
                                  const SizedBox(height: 2),
                                  Text(
                                    'Qualifié Onbora AI • Prêt pour transmission KAM',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                                      fontSize: 12,
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

                    // 0. Whisper AI Raw Transcript Block (Bloc Texte Brut Whisper pour vérification)
                    RepaintBoundary(
                      child: GlassCard(
                        padding: const EdgeInsets.all(AppConstants.paddingLg),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(6),
                                      decoration: BoxDecoration(
                                        color: isDark ? const Color(0xFF222228) : const Color(0xFFE0E7FF),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Icon(
                                        LucideIcons.mic,
                                        color: AppConstants.primaryBlue,
                                        size: 18,
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Text(
                                      'Transcription Brute Whisper AI',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 15,
                                        color: isDark ? Colors.white : AppConstants.textDark,
                                      ),
                                    ),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: AppConstants.primaryBlue.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    'Audio STT',
                                    style: TextStyle(
                                      color: AppConstants.primaryBlue,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF141416) : const Color(0xFFE2E8F0).withValues(alpha: 0.5),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: SelectableText(
                                report.rawTranscript.isNotEmpty
                                    ? report.rawTranscript
                                    : 'Aucune transcription brute reçue de Whisper AI.',
                                style: TextStyle(
                                  fontSize: 13,
                                  height: 1.5,
                                  fontWeight: FontWeight.w500,
                                  color: isDark ? Colors.white : AppConstants.textDark,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Executive Summary
                    RepaintBoundary(
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
                                  child: Icon(LucideIcons.sparkles, color: isDark ? Colors.white70 : AppConstants.textDark, size: 18),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    'Résumé Exécutif IA',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 15,
                                      color: isDark ? Colors.white : AppConstants.textDark,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              report.executiveSummary,
                              style: TextStyle(
                                fontSize: 14,
                                height: 1.5,
                                color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Confirmed Needs Badges
                    RepaintBoundary(
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
                                    color: AppConstants.successGreen.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(LucideIcons.checkCircle2, color: AppConstants.successGreen, size: 18),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    'Besoins Confirmés',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 15,
                                      color: isDark ? Colors.white : AppConstants.textDark,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: report.confirmedNeeds.map((need) {
                                return Chip(
                                  backgroundColor: AppConstants.successGreen.withValues(alpha: 0.12),
                                  side: BorderSide.none,
                                  label: Text(
                                    need,
                                    style: const TextStyle(color: AppConstants.successGreen, fontWeight: FontWeight.w800, fontSize: 13),
                                  ),
                                  avatar: const Icon(LucideIcons.check, color: AppConstants.successGreen, size: 15),
                                );
                              }).toList(),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Action Items
                    RepaintBoundary(
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
                                  child: Icon(LucideIcons.listChecks, color: isDark ? Colors.white70 : AppConstants.textDark, size: 18),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    'Plan d\'Actions à Dérouler',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 15,
                                      color: isDark ? Colors.white : AppConstants.textDark,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Column(
                              children: report.actionsTodo.map((action) {
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Icon(LucideIcons.arrowRight, color: isDark ? Colors.white70 : AppConstants.textDark, size: 16),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: Text(
                                          action,
                                          style: TextStyle(
                                            fontSize: 13,
                                            color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }).toList(),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Follow up Email Draft (100% User-Editable + Copy to Clipboard)
                    RepaintBoundary(
                      child: GlassCard(
                        padding: const EdgeInsets.all(AppConstants.paddingLg),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(6),
                                        decoration: BoxDecoration(
                                          color: isDark ? const Color(0xFF1E1E1E) : const Color(0xFFF1F5F9),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Icon(LucideIcons.mail, color: isDark ? Colors.white : AppConstants.textDark, size: 18),
                                      ),
                                      const SizedBox(width: 8),
                                      Flexible(
                                        child: Text(
                                          'Brouillon d\'Email de Relance',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            fontWeight: FontWeight.w800,
                                            fontSize: 14,
                                            color: isDark ? Colors.white : AppConstants.textDark,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      icon: Icon(LucideIcons.copy, size: 18, color: isDark ? Colors.white70 : AppConstants.textDark),
                                      tooltip: 'Copier l\'email',
                                      onPressed: _copyEmailToClipboard,
                                    ),
                                    IconButton(
                                      icon: Icon(
                                        _isEditingEmail ? LucideIcons.checkCircle2 : LucideIcons.edit3,
                                        size: 18,
                                        color: _isEditingEmail ? AppConstants.successGreen : (isDark ? Colors.white70 : AppConstants.textDark),
                                      ),
                                      tooltip: _isEditingEmail ? 'Valider' : 'Modifier',
                                      onPressed: () => setState(() => _isEditingEmail = !_isEditingEmail),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            if (_isEditingEmail)
                              TextFormField(
                                controller: _emailController,
                                maxLines: 8,
                                style: TextStyle(fontSize: 13, color: isDark ? Colors.white : AppConstants.textDark, fontWeight: FontWeight.w500),
                                decoration: InputDecoration(
                                  hintText: 'Personnalisez le contenu de l\'email...',
                                  filled: true,
                                  fillColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                              )
                            else
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: isDark ? const Color(0xFF18181A) : const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                                  ),
                                ),
                                child: Text(
                                  _emailController.text.isNotEmpty ? _emailController.text : report.followUpEmailDraft,
                                  style: TextStyle(
                                    fontSize: 13,
                                    height: 1.4,
                                    color: isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Field Intelligence Lead Generation Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563EB).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(
                          color: const Color(0xFF2563EB).withValues(alpha: 0.3),
                          width: 1.5,
                        ),
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
                                child: const Icon(LucideIcons.sparkles, color: Colors.white, size: 16),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Intelligence Terrain & Prime',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w800,
                                        color: isDark ? Colors.white : AppConstants.textDark,
                                      ),
                                    ),
                                    const Text(
                                      'Lookalike 100m • Parrainages • Radar Friction',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF2563EB),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF2563EB),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Text(
                                  '+175 pts',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(
                            'Enrichissez ce rapport en signalant les 2 commerces voisins et les partenaires du client pour débloquer vos primes de dénicheur de leads.',
                            style: TextStyle(
                              fontSize: 11,
                              height: 1.35,
                              color: isDark ? Colors.white70 : AppConstants.textSecondaryLight,
                            ),
                          ),
                          const SizedBox(height: 14),
                          SizedBox(
                            width: double.infinity,
                            height: 46,
                            child: ScaleTap(
                              child: ElevatedButton.icon(
                                onPressed: () => Get.to(() => const FieldIntelligenceScreen()),
                                icon: const Icon(LucideIcons.mapPin, size: 16, color: Colors.white),
                                label: const Text(
                                  'Compléter l\'Intelligence Terrain',
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF2563EB),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Transmit to KAM Button
                    SizedBox(
                      width: double.infinity,
                      height: 54,
                      child: ScaleTap(
                        child: ElevatedButton.icon(
                          onPressed: salesController.isTransmitting.value
                            ? null
                            : () => salesController.transmitReportToKAM(),
                          icon: salesController.isTransmitting.value
                              ? SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(color: isDark ? const Color(0xFF121214) : Colors.white, strokeWidth: 2),
                                )
                              : Icon(LucideIcons.send, size: 20, color: isDark ? const Color(0xFF121214) : Colors.white),
                          label: Text(
                            salesController.isTransmitting.value
                                ? 'Transmission au KAM en cours...'
                                : 'Transmettre le Dossier au KAM',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: isDark ? const Color(0xFF121214) : Colors.white),
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
}
