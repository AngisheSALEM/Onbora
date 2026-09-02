import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/kam_debrief_controller.dart';
import '../model/kam_debrief_model.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/scale_tap.dart';

class KamDebriefScreen extends StatelessWidget {
  const KamDebriefScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.isRegistered<KamDebriefController>()
        ? Get.find<KamDebriefController>()
        : Get.put(KamDebriefController());
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
        middle: Text(
          'Débriefing C-Level',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            color: isDark ? Colors.white : AppConstants.textDark,
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
              size: 18,
              color: isDark ? Colors.white : AppConstants.textDark,
            ),
          ),
        ),
        trailing: Obx(() {
          if (controller.recordingState.value == DebriefRecordingState.completed) {
            return ScaleTap(
              onTap: () => controller.reset(),
              child: Text(
                'Recommencer',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : AppConstants.textDark,
                ),
              ),
            );
          }
          return const SizedBox.shrink();
        }),
      ),
      body: Obx(() {
        final state = controller.recordingState.value;

        if (state == DebriefRecordingState.completed) {
          return _buildCompletedDebriefView(context, controller, isDark);
        }

        if (state == DebriefRecordingState.processing) {
          return _buildProcessingView(isDark);
        }

        return _buildRecordingView(context, controller, isDark);
      }),
    );
  }

  Widget _buildRecordingView(
    BuildContext context,
    KamDebriefController controller,
    bool isDark,
  ) {
    final isRecording = controller.recordingState.value == DebriefRecordingState.recording;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20.0, 16.0, 20.0, 100.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Spacer(),
          // Titre explicatif
          Text(
            isRecording ? 'Enregistrement de la Réunion' : 'Débrief Vocal Post-Visite',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.4,
              color: isDark ? Colors.white : AppConstants.textDark,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            isRecording
                ? 'Dictez vos impressions, points d\'accord, objections et engagements...'
                : 'En sortant du rendez-vous, dictez librement pendant 1 à 2 minutes. L\'IA Onbora génère la synthèse stratégique et l\'email client.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13.5,
              height: 1.4,
              color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
            ),
          ),
          const SizedBox(height: 36),

          // Chronomètre Vocal
          Text(
            controller.formattedDuration,
            style: TextStyle(
              fontSize: 48,
              fontWeight: FontWeight.w800,
              fontFeatures: const [FontFeature.tabularFigures()],
              color: isRecording ? const Color(0xFFEF4444) : (isDark ? Colors.white : AppConstants.textDark),
            ),
          ),
          const SizedBox(height: 36),

          // Gros Bouton Dictaphone Animé
          ScaleTap(
            onTap: () {
              if (isRecording) {
                controller.stopRecording();
              } else {
                controller.startRecording();
              }
            },
            child: Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isRecording
                    ? const Color(0xFFEF4444)
                    : (isDark ? Colors.white : AppConstants.primaryBlack),
                boxShadow: [
                  BoxShadow(
                    color: (isRecording ? const Color(0xFFEF4444) : Colors.black)
                        .withValues(alpha: isDark ? 0.4 : 0.2),
                    blurRadius: 30,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Icon(
                isRecording ? CupertinoIcons.stop_fill : CupertinoIcons.mic_fill,
                size: 40,
                color: isRecording
                    ? Colors.white
                    : (isDark ? Colors.black : Colors.white),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            isRecording ? 'Appuyez pour arrêter' : 'Appuyez pour dicter',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
            ),
          ),

          const Spacer(),

          // Si enregistrement stoppé : Bouton "Générer la Synthèse IA"
          if (controller.recordingState.value == DebriefRecordingState.stopped) ...[
            ScaleTap(
              onTap: () => controller.generateExecutiveDebrief(),
              child: Container(
                height: 54,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: AppConstants.primaryBtnColor(isDark),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.15),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                alignment: Alignment.center,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      CupertinoIcons.sparkles,
                      color: AppConstants.primaryBtnTextColor(isDark),
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Générer la Synthèse & Email',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppConstants.primaryBtnTextColor(isDark),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ],
      ),
    );
  }

  Widget _buildProcessingView(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20.0, 16.0, 20.0, 100.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: CupertinoActivityIndicator(
                radius: 18,
                color: isDark ? Colors.white : AppConstants.primaryBlack,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'IA Onbora en action...',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: isDark ? Colors.white : AppConstants.textDark,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Extraction des engagements, analyse du climat et rédaction de l\'email.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCompletedDebriefView(
    BuildContext context,
    KamDebriefController controller,
    bool isDark,
  ) {
    final debrief = controller.generatedDebrief.value!;

    return Column(
      children: [
        // Sélecteur d'Onglets (Segmented Control)
        Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1C1C1E) : const Color(0xFFE5E5EA),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            children: [
              _buildTabButton(0, 'Synthèse', controller, isDark),
              _buildTabButton(1, 'Engagements', controller, isDark),
              _buildTabButton(2, 'Email Client', controller, isDark),
            ],
          ),
        ),

        // Contenu de l'Onglet Actif
        Expanded(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16.0, 0, 16.0, 110.0),
            child: Obx(() {
              switch (controller.currentTabIndex.value) {
                case 0:
                  return _buildExecutiveSummaryTab(debrief, isDark);
                case 1:
                  return _buildCommitmentsTab(debrief, isDark);
                case 2:
                  return _buildEmailDraftTab(controller, debrief, isDark);
                default:
                  return const SizedBox.shrink();
              }
            }),
          ),
        ),
      ],
    );
  }

  Widget _buildTabButton(
    int index,
    String title,
    KamDebriefController controller,
    bool isDark,
  ) {
    final isSelected = controller.currentTabIndex.value == index;

    return Expanded(
      child: ScaleTap(
        onTap: () => controller.currentTabIndex.value = index,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? (isDark ? Colors.white : AppConstants.primaryBlack)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    )
                  ]
                : null,
          ),
          alignment: Alignment.center,
          child: Text(
            title,
            style: TextStyle(
              fontSize: 13,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected
                  ? (isDark ? Colors.black : Colors.white)
                  : (isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280)),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildExecutiveSummaryTab(KamDebriefModel debrief, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Climat de Réunion
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF10B981).withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: const Color(0xFF10B981).withValues(alpha: 0.25),
              width: 1,
            ),
          ),
          child: Row(
            children: [
              const Icon(CupertinoIcons.heart_fill, size: 16, color: Color(0xFF10B981)),
              const SizedBox(width: 8),
              Text(
                'Climat : ${debrief.meetingAtmosphere}',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF10B981),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Résumé Exécutif
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
              Text(
                'SYNTHÈSE EXÉCUTIVE',
                style: AppConstants.overlineStyle(isDark).copyWith(
                  fontWeight: FontWeight.w700,
                  color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                debrief.executiveSummary,
                style: TextStyle(
                  fontSize: 13.5,
                  height: 1.4,
                  color: isDark ? Colors.white : AppConstants.textDark,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Points d'Accord Clés
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
              Text(
                'POINTS D\'ACCORD DÉCISIFS',
                style: AppConstants.overlineStyle(isDark).copyWith(
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF10B981),
                ),
              ),
              const SizedBox(height: 10),
              ...debrief.agreedKeyPoints.map<Widget>((point) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8.0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(CupertinoIcons.checkmark_circle_fill, size: 14, color: Color(0xFF10B981)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          point,
                          style: TextStyle(
                            fontSize: 13,
                            color: isDark ? const Color(0xFFD1D1D6) : const Color(0xFF3A3A3C),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        ),
        const SizedBox(height: 30),
      ],
    );
  }

  Widget _buildCommitmentsTab(KamDebriefModel debrief, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'ACTIONS & ENGAGEMENTS PRIS',
          style: AppConstants.overlineStyle(isDark).copyWith(
            fontWeight: FontWeight.w700,
            color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
          ),
        ),
        const SizedBox(height: 12),
        ...debrief.commitments.map<Widget>((commit) {
          final isOrange = commit.owner.contains('Orange');
          return Padding(
            padding: const EdgeInsets.only(bottom: 12.0),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
                borderRadius: BorderRadius.circular(16),
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
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: isOrange
                              ? (isDark ? const Color(0xFF2C2C2E) : const Color(0xFFF2F2F7))
                              : const Color(0xFFF59E0B).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          commit.owner,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: isOrange
                                ? (isDark ? Colors.white : AppConstants.textDark)
                                : const Color(0xFFF59E0B),
                          ),
                        ),
                      ),
                      Text(
                        'Échéance : ${commit.dueDate}',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFFEF4444),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    commit.action,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : AppConstants.textDark,
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildEmailDraftTab(
    KamDebriefController controller,
    KamDebriefModel debrief,
    bool isDark,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'EMAIL DE SUIVI C-LEVEL',
              style: AppConstants.overlineStyle(isDark).copyWith(
                fontWeight: FontWeight.w700,
                color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
              ),
            ),
            ScaleTap(
              onTap: () => controller.copyEmailToClipboard(),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AppConstants.primaryBtnColor(isDark),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      CupertinoIcons.doc_on_clipboard_fill,
                      size: 12,
                      color: AppConstants.primaryBtnTextColor(isDark),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Copier',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppConstants.primaryBtnTextColor(isDark),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
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
          child: Text(
            debrief.followUpEmailDraft,
            style: TextStyle(
              fontSize: 13,
              height: 1.5,
              color: isDark ? const Color(0xFFE5E5EA) : const Color(0xFF1C1C1E),
            ),
          ),
        ),
        const SizedBox(height: 30),
      ],
    );
  }
}
