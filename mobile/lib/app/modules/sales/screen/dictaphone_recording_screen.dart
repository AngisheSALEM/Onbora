import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../controller/dictaphone_controller.dart';
import '../controller/sales_controller.dart';
import '../../../routes/app_routes.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';
import '../../../common/screen/widget/aurora_background.dart';
import '../../../common/screen/widget/glass_card.dart';

class DictaphoneRecordingScreen extends StatefulWidget {
  const DictaphoneRecordingScreen({super.key});

  @override
  State<DictaphoneRecordingScreen> createState() => _DictaphoneRecordingScreenState();
}

class _DictaphoneRecordingScreenState extends State<DictaphoneRecordingScreen> {
  int _processingStep = 1;

  void _simulateProgressSteps() async {
    setState(() => _processingStep = 1);
    await Future.delayed(const Duration(milliseconds: 1500));
    if (mounted) setState(() => _processingStep = 2);
    await Future.delayed(const Duration(milliseconds: 2000));
    if (mounted) setState(() => _processingStep = 3);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final salesController = Get.find<SalesController>();
    final dictController = Get.find<DictaphoneController>();

    return Scaffold(
        extendBodyBehindAppBar: true,
        appBar: AppBar(
          leading: IconButton(
            icon: Icon(LucideIcons.arrowLeft, color: isDark ? Colors.white : AppConstants.textDark, size: 20),
            tooltip: 'Retour',
            onPressed: () => Get.back(),
          ),
          title: Text(
            AppConstants.dictaphoneTitle,
            style: TextStyle(
              color: isDark ? Colors.white : AppConstants.textDark,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.3,
            ),
          ),
          backgroundColor: Colors.transparent,
          elevation: 0,
        ),
        body: AuroraBackground(
          child: SafeArea(
            child: SingleChildScrollView(
              physics: const ClampingScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingXl, vertical: AppConstants.paddingLg),
              child: Column(
                children: [
                  // Enterprise Badge Header
                  Obx(() {
                    final enterprise = salesController.selectedEnterprise.value;
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: isDark ? AppConstants.primaryDark : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(AppConstants.borderRadiusPill),
                        border: Border.all(
                          color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.building2, color: isDark ? Colors.white70 : AppConstants.textSecondaryLight, size: 16),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              enterprise?.name ?? 'Entreprise Ciblée',
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: isDark ? Colors.white : AppConstants.textDark,
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: 24),

                  // Timer Display (Bold 75 Typography)
                  Obx(() => Text(
                        dictController.formattedDuration,
                        style: TextStyle(
                          color: isDark ? Colors.white : AppConstants.textDark,
                          fontSize: 56,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      )),
                  const SizedBox(height: 8),
                  Obx(() {
                    final st = dictController.state;
                    final isRec = st == RecordingState.recording;
                    return Text(
                      isRec
                          ? AppConstants.dictaphoneRecordingState
                          : st == RecordingState.stopped
                              ? AppConstants.dictaphoneStoppedState
                              : st == RecordingState.uploading
                                  ? AppConstants.dictaphoneAnalyzingState
                                  : AppConstants.dictaphoneIdleState,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: isRec
                            ? AppConstants.errorRed
                            : (isDark ? AppConstants.textSecondaryDark : AppConstants.textSecondaryLight),
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.1,
                      ),
                    );
                  }),
                  const SizedBox(height: 32),

                  // Large Animated Microphone Record Button (Sleek Apple Studio Style)
                  Center(
                    child: Obx(() {
                      final isRec = dictController.state == RecordingState.recording;
                      return ScaleTap(
                        onTap: () async {
                          if (dictController.state == RecordingState.idle) {
                            await dictController.startRecording();
                          } else if (dictController.state == RecordingState.recording) {
                            await dictController.stopRecording();
                          }
                        },
                        child: RepaintBoundary(
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            curve: Curves.easeOutCubic,
                            height: 120,
                            width: 120,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isRec
                                  ? AppConstants.errorRed
                                  : (isDark ? const Color(0xFF222228) : const Color(0xFF18181B)),
                              border: Border.all(
                                color: isRec
                                    ? AppConstants.errorRed.withValues(alpha: 0.8)
                                    : (isDark ? const Color(0x33FFFFFF) : const Color(0x22000000)),
                                width: 2.0,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: isRec
                                      ? AppConstants.errorRed.withValues(alpha: 0.45)
                                      : Colors.black.withValues(alpha: isDark ? 0.4 : 0.15),
                                  blurRadius: isRec ? 32 : 16,
                                  spreadRadius: isRec ? 6 : 1,
                                ),
                              ],
                            ),
                            child: Center(
                              child: Icon(
                                isRec ? LucideIcons.square : LucideIcons.mic,
                                color: Colors.white,
                                size: isRec ? 44 : 50,
                              ),
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 32),

                  // Speech Transcription Live Preview Box
                  Obx(() {
                    final text = dictController.transcribedText.value;
                    final isSpeaking = dictController.isVADSpeaking.value;
                    if (text.isEmpty && dictController.state != RecordingState.recording) {
                      return const SizedBox.shrink();
                    }

                    return RepaintBoundary(
                      child: GlassCard(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(LucideIcons.activity, color: isSpeaking ? const Color(0xFF10B981) : (isDark ? Colors.white70 : AppConstants.textSecondaryLight), size: 18),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    isSpeaking ? 'Parole détectée (VAD en cours...)' : 'Retranscription en direct',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: isSpeaking ? const Color(0xFF10B981) : (isDark ? Colors.white : AppConstants.textDark),
                                      fontWeight: FontWeight.w800,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                                if (salesController.isAnalyzingCopilotTurn.value)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF2563EB).withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const SizedBox(
                                          width: 10,
                                          height: 10,
                                          child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2563EB)),
                                        ),
                                        const SizedBox(width: 5),
                                        Text(
                                          'IA Live',
                                          style: TextStyle(
                                            color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF2563EB),
                                            fontSize: 10,
                                            fontWeight: FontWeight.w900,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              text.isNotEmpty
                                  ? text
                                  : 'Enregistrement en cours... Échangez avec votre interlocuteur.',
                              style: TextStyle(
                                color: text.isNotEmpty
                                    ? (isDark ? Colors.white : AppConstants.textDark)
                                    : (isDark ? Colors.white60 : AppConstants.textMuted),
                                fontSize: 13,
                                height: 1.5,
                                fontStyle: text.isEmpty ? FontStyle.italic : FontStyle.normal,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 16),

                  // 💡 Real-Time Live Copilot Interactive Recommendations Section
                  Obx(() {
                    final copilot = salesController.currentLiveCopilot.value;
                    if (copilot == null || (dictController.state == RecordingState.idle && copilot.realtimeProposition.recommendedPackages.isEmpty)) {
                      return const SizedBox.shrink();
                    }

                    final prop = copilot.realtimeProposition;
                    final packages = prop.recommendedPackages;

                    return RepaintBoundary(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Header Strip with Live Score
                          GlassCard(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      children: [
                                        const Icon(LucideIcons.sparkles, color: Color(0xFF2563EB), size: 18),
                                        const SizedBox(width: 8),
                                        Text(
                                          'Copilote Commercial Live',
                                          style: TextStyle(
                                            color: isDark ? Colors.white : AppConstants.textDark,
                                            fontWeight: FontWeight.w900,
                                            fontSize: 14,
                                            letterSpacing: -0.2,
                                          ),
                                        ),
                                      ],
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Text(
                                        'Closing : ${prop.closingReadinessScore}%',
                                        style: const TextStyle(
                                          color: Color(0xFF10B981),
                                          fontSize: 11,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),

                                // Real-Time AI Coaching Tip Bubble
                                if (copilot.coachingTip.isNotEmpty) ...[
                                  const SizedBox(height: 12),
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: isDark ? const Color(0xFF1E1E24) : const Color(0xFFF1F5F9),
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(
                                        color: const Color(0xFF2563EB).withValues(alpha: 0.3),
                                      ),
                                    ),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Icon(LucideIcons.lightbulb, color: Color(0xFF2563EB), size: 16),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            copilot.coachingTip,
                                            style: TextStyle(
                                              color: isDark ? Colors.white : AppConstants.textDark,
                                              fontSize: 12,
                                              fontWeight: FontWeight.w700,
                                              height: 1.4,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],

                                // Detected Needs & Objections Badges
                                if (copilot.detectedNeeds.isNotEmpty || copilot.detectedObjections.isNotEmpty) ...[
                                  const SizedBox(height: 10),
                                  Wrap(
                                    spacing: 6,
                                    runSpacing: 6,
                                    children: [
                                      ...copilot.detectedNeeds.map((need) => Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFF2563EB).withValues(alpha: 0.12),
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              '✓ $need',
                                              style: TextStyle(
                                                color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF2563EB),
                                                fontSize: 10,
                                                fontWeight: FontWeight.w800,
                                              ),
                                            ),
                                          )),
                                      ...copilot.detectedObjections.map((obj) => Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFEF4444).withValues(alpha: 0.12),
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              '⚠️ $obj',
                                              style: const TextStyle(
                                                color: Color(0xFFEF4444),
                                                fontSize: 10,
                                                fontWeight: FontWeight.w800,
                                              ),
                                            ),
                                          )),
                                    ],
                                  ),
                                ],

                                // Interactive Recommended Packages Checklist
                                if (packages.isNotEmpty) ...[
                                  const SizedBox(height: 14),
                                  Text(
                                    'Offres Détectées & Recommandées (Cochez pour inclure) :',
                                    style: TextStyle(
                                      color: isDark ? Colors.white70 : AppConstants.textSecondaryLight,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.2,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  ...packages.map((pkg) => Container(
                                        margin: const EdgeInsets.only(bottom: 8),
                                        decoration: BoxDecoration(
                                          color: isDark ? const Color(0xFF18181B) : Colors.white,
                                          borderRadius: BorderRadius.circular(14),
                                          border: Border.all(
                                            color: pkg.checked
                                                ? const Color(0xFF2563EB)
                                                : (isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7)),
                                            width: pkg.checked ? 1.5 : 1.0,
                                          ),
                                        ),
                                        child: Material(
                                          color: Colors.transparent,
                                          child: InkWell(
                                            borderRadius: BorderRadius.circular(14),
                                            onTap: () {
                                              salesController.toggleLivePackage(pkg.serviceId, !pkg.checked);
                                            },
                                            child: Padding(
                                              padding: const EdgeInsets.all(12),
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Row(
                                                    children: [
                                                      Checkbox(
                                                        value: pkg.checked,
                                                        activeColor: const Color(0xFF2563EB),
                                                        shape: RoundedRectangleBorder(
                                                          borderRadius: BorderRadius.circular(4),
                                                        ),
                                                        onChanged: (val) {
                                                          salesController.toggleLivePackage(pkg.serviceId, val ?? true);
                                                        },
                                                      ),
                                                      Expanded(
                                                        child: Column(
                                                          crossAxisAlignment: CrossAxisAlignment.start,
                                                          children: [
                                                            Row(
                                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                              children: [
                                                                Expanded(
                                                                  child: Text(
                                                                    pkg.name,
                                                                    style: TextStyle(
                                                                      color: isDark ? Colors.white : AppConstants.textDark,
                                                                      fontWeight: FontWeight.w800,
                                                                      fontSize: 12,
                                                                    ),
                                                                  ),
                                                                ),
                                                                Text(
                                                                  '${pkg.monthlyPriceUsd.toStringAsFixed(0)} \$/m',
                                                                  style: const TextStyle(
                                                                    color: Color(0xFF2563EB),
                                                                    fontWeight: FontWeight.w900,
                                                                    fontSize: 13,
                                                                  ),
                                                                ),
                                                              ],
                                                            ),
                                                            const SizedBox(height: 2),
                                                            Container(
                                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                              decoration: BoxDecoration(
                                                                color: isDark ? const Color(0xFF27272A) : const Color(0xFFF4F4F5),
                                                                borderRadius: BorderRadius.circular(6),
                                                              ),
                                                              child: Text(
                                                                pkg.category,
                                                                style: TextStyle(
                                                                  color: isDark ? Colors.white70 : AppConstants.textSecondaryLight,
                                                                  fontSize: 9,
                                                                  fontWeight: FontWeight.w700,
                                                                ),
                                                              ),
                                                            ),
                                                          ],
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                  if (pkg.pitchArgument.isNotEmpty) ...[
                                                    const SizedBox(height: 6),
                                                    Padding(
                                                      padding: const EdgeInsets.only(left: 48, right: 4),
                                                      child: Text(
                                                        'Pitch : ${pkg.pitchArgument}',
                                                        style: TextStyle(
                                                          color: isDark ? Colors.white60 : AppConstants.textMuted,
                                                          fontSize: 11,
                                                          height: 1.3,
                                                        ),
                                                      ),
                                                    ),
                                                  ],
                                                ],
                                              ),
                                            ),
                                          ),
                                        ),
                                      )),

                                  // Live Estimated Total MRR Bar
                                  const SizedBox(height: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                    decoration: BoxDecoration(
                                      color: isDark ? const Color(0xFF27272A) : const Color(0xFFF1F5F9),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          'Total MRR Estimé :',
                                          style: TextStyle(
                                            color: isDark ? Colors.white70 : AppConstants.textDark,
                                            fontWeight: FontWeight.w800,
                                            fontSize: 12,
                                          ),
                                        ),
                                        Text(
                                          '${prop.estimatedTotalMonthlyUsd.toStringAsFixed(0)} \$/mois',
                                          style: const TextStyle(
                                            color: Color(0xFF2563EB),
                                            fontWeight: FontWeight.w900,
                                            fontSize: 14,
                                          ),
                                        ),
                                      ],
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
                  const SizedBox(height: 24),

                  // Progress Indicator for Report Generation
                  Obx(() {
                    if (!salesController.isGeneratingReport.value && !dictController.isUploading.value) {
                      return const SizedBox.shrink();
                    }

                    return RepaintBoundary(
                      child: Column(
                        children: [
                          GlassCard(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              children: [
                                LinearProgressIndicator(
                                  value: _processingStep / 3.0,
                                  backgroundColor: isDark ? const Color(0xFF1E1E1E) : const Color(0xFFE5E7EB),
                                  color: isDark ? Colors.white : const Color(0xFF18181B),
                                  minHeight: 6,
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  _processingStep == 1
                                      ? 'Étape 1/3 : Retranscription de l\'échange...'
                                      : _processingStep == 2
                                          ? 'Étape 2/3 : Analyse des besoins identifiés...'
                                          : 'Étape 3/3 : Rédaction du compte-rendu de visite...',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: isDark ? Colors.white : AppConstants.textDark,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],
                      ),
                    );
                  }),

                  // Bottom Action Buttons
                  Obx(() {
                    final st = dictController.state;
                    final isProcessing = salesController.isGeneratingReport.value || dictController.isUploading.value;

                    if (st == RecordingState.stopped || st == RecordingState.completed) {
                      return SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ScaleTap(
                          child: ElevatedButton.icon(
                            onPressed: isProcessing
                                ? null
                                : () async {
                                    _simulateProgressSteps();
                                    final companyName = salesController.selectedEnterprise.value?.name ?? 'Client';
                                    final transcript = dictController.transcribedText.value.isNotEmpty
                                        ? dictController.transcribedText.value
                                        : await dictController.uploadAndTranscribe(companyName);

                                    final success = await salesController.generateReportFromTranscript(
                                      transcript,
                                      audioPath: dictController.audioPath.value,
                                    );

                                    if (success) {
                                      Get.offNamed(Routes.VISIT_REPORT_DETAIL);
                                    }
                                  },
                            icon: isProcessing
                                ? SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(color: isDark ? const Color(0xFF121214) : Colors.white, strokeWidth: 2),
                                  )
                                : Icon(LucideIcons.sparkles, size: 20, color: isDark ? const Color(0xFF121214) : Colors.white),
                            label: Text(
                              isProcessing ? 'Rédaction en cours...' : AppConstants.dictaphoneGenerateBtn,
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: isDark ? const Color(0xFF121214) : Colors.white),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isDark ? Colors.white : const Color(0xFF18181B),
                              foregroundColor: isDark ? const Color(0xFF121214) : Colors.white,
                            ),
                          ),
                        ),
                      );
                    } else if (st == RecordingState.idle) {
                      return Text(
                        'Conseil : Échangez librement sur les besoins de connectivité et de sécurité.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: isDark ? AppConstants.textSecondaryDark : AppConstants.textMuted, fontSize: 12),
                      );
                    }
                    return const SizedBox.shrink();
                  }),
                ],
              ),
            ),
          ),
        ),
      );
  }
}
