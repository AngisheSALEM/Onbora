import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../controller/dictaphone_controller.dart';
import '../controller/sales_controller.dart';
import '../model/live_copilot_model.dart';
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
  bool _hasConsented = false;
  bool _isNoAudioMode = false;
  final TextEditingController _manualNotesController = TextEditingController();

  final List<String> _quickNoteChips = [
    'Fibre Pro 50M',
    'Pass Roaming Pro',
    'Microsoft 365',
    'Cloud Backup Souverain',
    'TPE Orange Money',
    'GTR 4h Garantie',
    'Budget Validé',
    'Décideur Absent',
    'Concurrent Vodacom',
    'Concurrent Canalbox',
  ];

  @override
  void dispose() {
    _manualNotesController.dispose();
    super.dispose();
  }

  void _simulateProgressSteps() async {
    setState(() => _processingStep = 1);
    await Future.delayed(const Duration(milliseconds: 1500));
    if (mounted) setState(() => _processingStep = 2);
    await Future.delayed(const Duration(milliseconds: 2000));
    if (mounted) setState(() => _processingStep = 3);
  }

  void _showConsentModal(BuildContext context, bool isDark, DictaphoneController dictController) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF18181B) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.6 : 0.2),
                blurRadius: 20,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(LucideIcons.shieldCheck, color: Color(0xFF10B981), size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Consentement Légal',
                          style: TextStyle(
                            color: isDark ? Colors.white : AppConstants.textDark,
                            fontWeight: FontWeight.w900,
                            fontSize: 16,
                            letterSpacing: -0.2,
                          ),
                        ),
                        Text(
                          'Code du Numérique RDC (Ordonnance-loi n° 23/010)',
                          style: TextStyle(
                            color: isDark ? Colors.white60 : AppConstants.textSecondaryLight,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF222228) : const Color(0xFFF4F4F6),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isDark ? const Color(0x1AFFFFFF) : const Color(0x0A000000),
                  ),
                ),
                child: Text(
                  'Avant d\'activer le micro, demandez l\'accord de votre interlocuteur :\n\n'
                  '« Cet échange est assisté par l\'IA Orange pour la qualification technique et la prise de notes. Êtes-vous d\'accord ? »\n\n'
                  '• Données chiffrées & usage strictement professionnel\n'
                  '• Suppression de l\'audio après génération du rapport',
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.45,
                    color: isDark ? AppConstants.textLight : AppConstants.textDark,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              // Option 1 : Accord du client
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    setState(() {
                      _hasConsented = true;
                      _isNoAudioMode = false;
                    });
                    await dictController.startRecording();
                  },
                  icon: Icon(
                    LucideIcons.mic,
                    size: 18,
                    color: AppConstants.primaryBtnTextColor(isDark),
                  ),
                  label: Text(
                    'Client d\'accord — Enregistrer l\'Audio',
                    style: TextStyle(
                      color: AppConstants.primaryBtnTextColor(isDark),
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppConstants.primaryBtnColor(isDark),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              // Option 2 : Refus -> Mode sans audio
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    setState(() {
                      _isNoAudioMode = true;
                    });
                  },
                  icon: Icon(LucideIcons.fileText, size: 18, color: isDark ? Colors.white : AppConstants.textDark),
                  label: Text(
                    'Client refuse — Mode Prise de Notes / Mémo',
                    style: TextStyle(
                      color: isDark ? Colors.white : AppConstants.textDark,
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: isDark ? const Color(0x33FFFFFF) : const Color(0x33000000)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final salesController = Get.find<SalesController>();
    final dictController = Get.find<DictaphoneController>();

    return Scaffold(
        extendBodyBehindAppBar: true,
        backgroundColor: isDark ? AppConstants.backgroundDark : AppConstants.backgroundLight,
        appBar: AppBar(
          leading: IconButton(
            icon: Icon(CupertinoIcons.chevron_back, color: isDark ? Colors.white : AppConstants.textDark, size: 22),
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
          actions: [
            ScaleTap(
              onTap: () => Get.toNamed(Routes.VISIT_FORM),
              child: Container(
                margin: const EdgeInsets.only(right: 16),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      CupertinoIcons.square_pencil,
                      size: 15,
                      color: isDark ? Colors.white : AppConstants.textDark,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Formulaire',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : AppConstants.textDark,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
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
                  const SizedBox(height: 16),

                  // Mode Selector Tabs (Audio Consenti vs Prise de Notes Sans Audio)
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E1E24) : const Color(0xFFE5E5EA),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              if (_isNoAudioMode) {
                                setState(() => _isNoAudioMode = false);
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: !_isNoAudioMode
                                    ? (isDark ? const Color(0xFF2C2C2E) : Colors.white)
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(LucideIcons.mic, size: 14, color: !_isNoAudioMode ? const Color(0xFF2563EB) : (isDark ? Colors.white60 : AppConstants.textMuted)),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Audio Consenti',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                      color: !_isNoAudioMode ? (isDark ? Colors.white : AppConstants.textDark) : (isDark ? Colors.white60 : AppConstants.textMuted),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              if (!_isNoAudioMode) {
                                if (dictController.state == RecordingState.recording) {
                                  dictController.stopRecording();
                                }
                                setState(() => _isNoAudioMode = true);
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: _isNoAudioMode
                                    ? (isDark ? const Color(0xFF2C2C2E) : Colors.white)
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(LucideIcons.fileText, size: 14, color: _isNoAudioMode ? const Color(0xFF2563EB) : (isDark ? Colors.white60 : AppConstants.textMuted)),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Sans Audio / Mémo',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                      color: _isNoAudioMode ? (isDark ? Colors.white : AppConstants.textDark) : (isDark ? Colors.white60 : AppConstants.textMuted),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  if (!_isNoAudioMode) ...[
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
                              if (!_hasConsented) {
                                _showConsentModal(context, isDark, dictController);
                              } else {
                                await dictController.startRecording();
                              }
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
                  ] else ...[
                    // Mode Prise de Notes / Mémo Sans Audio
                    GlassCard(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(LucideIcons.fileEdit, color: isDark ? Colors.white : AppConstants.textDark, size: 18),
                              const SizedBox(width: 8),
                              Text(
                                'Prise de Notes Rapide & Mémo',
                                style: TextStyle(
                                  color: isDark ? Colors.white : AppConstants.textDark,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Ajoutez des éléments clés en 1 clic :',
                            style: TextStyle(
                              color: isDark ? Colors.white70 : AppConstants.textSecondaryLight,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: _quickNoteChips.map((chip) {
                              return ActionChip(
                                label: Text(chip, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                                backgroundColor: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                                labelStyle: TextStyle(color: isDark ? Colors.white : AppConstants.textDark),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                onPressed: () {
                                  final current = _manualNotesController.text;
                                  _manualNotesController.text = current.isEmpty ? '• $chip' : '$current\n• $chip';
                                },
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 14),
                          TextField(
                            controller: _manualNotesController,
                            maxLines: 6,
                            style: TextStyle(color: isDark ? Colors.white : AppConstants.textDark, fontSize: 13),
                            decoration: InputDecoration(
                              hintText: 'Saisissez vos observations ou dictez un mémo rapide après votre sortie du rendez-vous...',
                              hintStyle: TextStyle(color: isDark ? Colors.white38 : AppConstants.textMuted, fontSize: 12),
                              filled: true,
                              fillColor: isDark ? const Color(0xFF1E1E24) : const Color(0xFFF8FAFC),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(color: isDark ? const Color(0x1AFFFFFF) : const Color(0x0A000000)),
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),
                          SizedBox(
                            width: double.infinity,
                            height: 46,
                            child: ElevatedButton.icon(
                              onPressed: () async {
                                final text = _manualNotesController.text.trim();
                                if (text.isEmpty) {
                                  Get.snackbar('Note vide', 'Veuillez saisir au moins quelques éléments de visite.');
                                  return;
                                }
                                _simulateProgressSteps();
                                final success = await salesController.generateReportFromTranscript(text, audioPath: null);
                                if (success) {
                                  Get.offNamed(Routes.VISIT_REPORT_DETAIL);
                                }
                              },
                              icon: const Icon(LucideIcons.sparkles, size: 16, color: Colors.white),
                              label: const Text('Générer le Compte-Rendu IA', style: TextStyle(fontWeight: FontWeight.w800, color: Colors.white)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: isDark ? Colors.white : const Color(0xFF18181B),
                                foregroundColor: isDark ? const Color(0xFF121214) : Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

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
                                      color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        SizedBox(
                                          width: 10,
                                          height: 10,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: isDark ? Colors.white : AppConstants.textDark,
                                          ),
                                        ),
                                        const SizedBox(width: 5),
                                        Text(
                                          'IA Live',
                                          style: TextStyle(
                                            color: isDark ? Colors.white : AppConstants.textDark,
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

                  const SizedBox(height: 20),

                  // 💡 Live Offers Section (Minimalist Circular Checkbox Cards + Skeleton Loader)
                  Obx(() {
                    final copilot = salesController.currentLiveCopilot.value;
                    final packages = copilot?.realtimeProposition.recommendedPackages ?? [];
                    final isRecording = dictController.state == RecordingState.recording;
                    final isAnalyzing = salesController.isAnalyzingCopilotTurn.value;

                    // If not recording and no packages discovered, do not render empty section
                    if (!isRecording && packages.isEmpty) {
                      return const SizedBox.shrink();
                    }

                    return RepaintBoundary(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Discovered Live Offer Cards
                          ...packages.map((pkg) => _LiveOfferCard(
                                package: pkg,
                                isDark: isDark,
                                onToggle: () {
                                  salesController.toggleLivePackage(pkg.serviceId, !pkg.checked);
                                },
                              )),

                          // Animated Skeleton Loader showing that Core AI is listening & another offer is pending
                          if (isRecording || isAnalyzing) ...[
                            _LiveSkeletonOfferCard(isDark: isDark),
                          ],
                        ],
                      ),
                    );
                  }),

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

/// Carte d'offre ultra-épurée avec case à cocher circulaire conforme à l'UI Onbora
class _LiveOfferCard extends StatelessWidget {
  final RecommendedPackageModel package;
  final bool isDark;
  final VoidCallback onToggle;

  const _LiveOfferCard({
    required this.package,
    required this.isDark,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      onTap: onToggle,
      child: Row(
        children: [
          // Case à cocher circulaire conforme à l'UI
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeInOut,
            width: 26,
            height: 26,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: package.checked
                  ? (isDark ? Colors.white : const Color(0xFF18181B))
                  : (isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7)),
              border: Border.all(
                color: package.checked
                    ? (isDark ? Colors.white : const Color(0xFF18181B))
                    : (isDark ? const Color(0xFF48484A) : const Color(0xFFD1D1D6)),
                width: package.checked ? 2.0 : 1.5,
              ),
            ),
            child: package.checked
                ? Center(
                    child: Icon(
                      Icons.check,
                      size: 16,
                      color: isDark ? const Color(0xFF121214) : Colors.white,
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 14),
          // Uniquement le nom de l'offre
          Expanded(
            child: Text(
              package.name,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: isDark ? AppConstants.textLight : AppConstants.textDark,
                height: 1.35,
                letterSpacing: -0.2,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Carte Skeleton animée indiquant qu'une autre proposition est en cours d'analyse par l'IA
class _LiveSkeletonOfferCard extends StatefulWidget {
  final bool isDark;
  const _LiveSkeletonOfferCard({required this.isDark});

  @override
  State<_LiveSkeletonOfferCard> createState() => _LiveSkeletonOfferCardState();
}

class _LiveSkeletonOfferCardState extends State<_LiveSkeletonOfferCard> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.35, end: 0.85).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _pulseAnim,
      builder: (context, child) {
        return Opacity(
          opacity: _pulseAnim.value,
          child: GlassCard(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
            child: Row(
              children: [
                // Skeleton Cercle de case à cocher
                Container(
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: widget.isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                  ),
                ),
                const SizedBox(width: 14),
                // Skeleton Barre de texte pour l'offre à venir
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        height: 14,
                        width: 180,
                        decoration: BoxDecoration(
                          color: widget.isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
