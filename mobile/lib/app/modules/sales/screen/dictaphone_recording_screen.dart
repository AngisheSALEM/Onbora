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
                                Icon(LucideIcons.activity, color: isDark ? Colors.white70 : AppConstants.textSecondaryLight, size: 18),
                                const SizedBox(width: 8),
                                Text(
                                  'Transcription Vocale Whisper AI',
                                  style: TextStyle(
                                    color: isDark ? Colors.white : AppConstants.textDark,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              text.isNotEmpty
                                  ? text
                                  : 'Écoute en cours... Échangez avec le client sur les besoins Fibre / Teams.',
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
                                      ? 'Étape 1/3 : Transcription vocale Whisper AI en cours...'
                                      : _processingStep == 2
                                          ? 'Étape 2/3 : Analyse et extraction des besoins télécoms...'
                                          : 'Étape 3/3 : Génération du compte-rendu et plan d\'actions...',
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
                              isProcessing ? 'Traitement IA...' : AppConstants.dictaphoneGenerateBtn,
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
                        'Conseil : Parlez naturellement des besoins identifiés (Fibre, Sécurité, Microsoft 365).',
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
