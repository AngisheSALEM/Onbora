import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../view_models/dictaphone_view_model.dart';
import '../view_models/sales_view_model.dart';
import 'visit_report_detail_view.dart';

class DictaphoneRecordingView extends StatelessWidget {
  const DictaphoneRecordingView({super.key});

  @override
  Widget build(BuildContext context) {
    final salesVm = context.watch<SalesViewModel>();
    final dictVm = context.watch<DictaphoneViewModel>();
    final enterprise = salesVm.selectedEnterprise;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Dictaphone Vocal Terrain'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            children: [
              // Enterprise Badge Header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.business_rounded, color: Color(0xFFF97316), size: 18),
                    const SizedBox(width: 8),
                    Text(
                      enterprise?.name ?? 'Entreprise Ciblée',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ],
                ),
              ),
              const Spacer(),

              // Timer Display
              Text(
                dictVm.formattedDuration,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 54,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                dictVm.state == RecordingState.recording
                    ? 'ENREGISTREMENT EN COURS...'
                    : dictVm.state == RecordingState.stopped
                        ? 'ENREGISTREMENT TERMINÉ'
                        : dictVm.state == RecordingState.uploading
                            ? 'ANALYSE WHISPER SPEECH-TO-TEXT...'
                            : 'Appuyez pour démarrer l\'enregistrement',
                style: TextStyle(
                  color: dictVm.state == RecordingState.recording ? const Color(0xFFF97316) : Colors.grey,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(height: 40),

              // Large Animated Microphone Record Button
              Center(
                child: GestureDetector(
                  onTap: () {
                    if (dictVm.state == RecordingState.idle) {
                      dictVm.startRecording();
                    } else if (dictVm.state == RecordingState.recording) {
                      dictVm.stopRecording();
                    }
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    height: 140,
                    width: 140,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: dictVm.state == RecordingState.recording
                          ? const Color(0xFFEF4444)
                          : const Color(0xFFF97316),
                      boxShadow: [
                        BoxShadow(
                          color: (dictVm.state == RecordingState.recording
                                  ? const Color(0xFFEF4444)
                                  : const Color(0xFFF97316))
                              .withValues(alpha: 0.4),
                          blurRadius: dictVm.state == RecordingState.recording ? 30 : 15,
                          spreadRadius: dictVm.state == RecordingState.recording ? 10 : 2,
                        ),
                      ],
                    ),
                    child: Icon(
                      dictVm.state == RecordingState.recording ? Icons.stop_rounded : Icons.mic_rounded,
                      size: 64,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
              const Spacer(),

              // Transcript Preview Card when stopped/completed
              if (dictVm.transcribedText.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: const [
                          Icon(Icons.graphic_eq_rounded, color: Color(0xFF14B8A6), size: 18),
                          SizedBox(width: 8),
                          Text(
                            'Transcription Vocale (Whisper AI)',
                            style: TextStyle(color: Color(0xFF14B8A6), fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        dictVm.transcribedText,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.4),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Bottom Action Buttons
              if (dictVm.state == RecordingState.stopped || dictVm.state == RecordingState.completed) ...[
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton.icon(
                    onPressed: salesVm.isGeneratingReport || dictVm.isUploading
                        ? null
                        : () async {
                            final transcript = dictVm.transcribedText.isNotEmpty
                                ? dictVm.transcribedText
                                : await dictVm.uploadAndTranscribe(enterprise?.name ?? 'Client');

                            final success = await salesVm.generateReportFromTranscript(
                              transcript,
                              audioPath: dictVm.audioPath,
                            );

                            if (context.mounted && success) {
                              Navigator.pushReplacement(
                                context,
                                MaterialPageRoute(builder: (_) => const VisitReportDetailView()),
                              );
                            }
                          },
                    icon: salesVm.isGeneratingReport || dictVm.isUploading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Icon(Icons.auto_awesome_rounded, size: 22),
                    label: Text(
                      salesVm.isGeneratingReport || dictVm.isUploading
                          ? 'Génération du Rapport IA...'
                          : 'Générer le Rapport avec Onbora IA',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF14B8A6),
                    ),
                  ),
                ),
              ] else if (dictVm.state == RecordingState.idle) ...[
                const Text(
                  'Conseil : Parlez naturellement des besoins identifiés (Fibre, Sécurité, Microsoft 365).',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
