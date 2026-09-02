import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../view_models/dictaphone_view_model.dart';
import '../view_models/sales_view_model.dart';
import 'visit_report_detail_view.dart';

class DictaphoneRecordingView extends StatefulWidget {
  const DictaphoneRecordingView({super.key});

  @override
  State<DictaphoneRecordingView> createState() => _DictaphoneRecordingViewState();
}

class _DictaphoneRecordingViewState extends State<DictaphoneRecordingView> {
  int _selectedInputMode = 0; // 0 = Audio (Dictaphone), 1 = Saisie Manuelle (Notes)
  int _processingStep = 1;

  // Champs de saisie manuelle (si enregistrement vocal impossible)
  final TextEditingController _notesController = TextEditingController();
  final TextEditingController _budgetController = TextEditingController();
  bool _deciderMet = true;
  final Set<String> _selectedNeeds = {'Fibre Pro', 'Microsoft 365'};

  @override
  void dispose() {
    _notesController.dispose();
    _budgetController.dispose();
    super.dispose();
  }

  void _simulateProgressSteps() async {
    setState(() => _processingStep = 1);
    await Future.delayed(const Duration(milliseconds: 1200));
    if (mounted) setState(() => _processingStep = 2);
    await Future.delayed(const Duration(milliseconds: 1500));
    if (mounted) setState(() => _processingStep = 3);
  }

  Future<void> _processManualNotes(SalesViewModel salesVm, String enterpriseName) async {
    final notes = _notesController.text.trim();
    final budget = _budgetController.text.trim();
    final needsList = _selectedNeeds.join(', ');

    final compiledTranscript = StringBuffer();
    compiledTranscript.writeln("Compte-rendu de visite sur le terrain pour l'entreprise $enterpriseName.");
    compiledTranscript.writeln("Décideur rencontré : ${_deciderMet ? 'Oui (Gérant/Directeur)' : 'Non (Interlocuteur secondaire)'}.");
    if (budget.isNotEmpty) {
      compiledTranscript.writeln("Budget mensuel évoqué : $budget \$/mois.");
    }
    if (_selectedNeeds.isNotEmpty) {
      compiledTranscript.writeln("Besoins identifiés lors de l'échange : $needsList.");
    }
    if (notes.isNotEmpty) {
      compiledTranscript.writeln("Notes du commercial : $notes");
    } else {
      compiledTranscript.writeln("Notes du commercial : Le client confirme son intérêt pour moderniser sa connectivité et ses outils.");
    }

    _simulateProgressSteps();
    final success = await salesVm.generateReportFromTranscript(compiledTranscript.toString());

    if (mounted && success) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const VisitReportDetailView()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final salesVm = context.watch<SalesViewModel>();
    final dictVm = context.watch<DictaphoneViewModel>();
    final enterprise = salesVm.selectedEnterprise;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Compte-Rendu à Chaud'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
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
                    Flexible(
                      child: Text(
                        enterprise?.name ?? 'Entreprise Ciblée',
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Mode Selector Segment (Voice Dictaphone vs Notes Textarea)
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedInputMode = 0),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: _selectedInputMode == 0 ? const Color(0xFFF97316) : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.mic_rounded, color: _selectedInputMode == 0 ? Colors.white : Colors.grey, size: 18),
                              const SizedBox(width: 6),
                              Text(
                                'Dictaphone Vocal',
                                style: TextStyle(
                                  color: _selectedInputMode == 0 ? Colors.white : Colors.grey,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedInputMode = 1),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: _selectedInputMode == 1 ? const Color(0xFFF97316) : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.edit_note_rounded, color: _selectedInputMode == 1 ? Colors.white : Colors.grey, size: 18),
                              const SizedBox(width: 6),
                              Text(
                                'Saisie de Notes',
                                style: TextStyle(
                                  color: _selectedInputMode == 1 ? Colors.white : Colors.grey,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
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

              // ===============================================================
              // MODE 0 : DICTAPHONE VOCAL WHISPER
              // ===============================================================
              if (_selectedInputMode == 0) ...[
                // Timer Display
                Text(
                  dictVm.formattedDuration,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 50,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  dictVm.state == RecordingState.recording
                      ? 'ENREGISTREMENT EN COURS...'
                      : dictVm.state == RecordingState.stopped
                          ? 'ENREGISTREMENT TERMINÉ'
                          : dictVm.state == RecordingState.uploading
                              ? 'ANALYSE WHISPER SPEECH-TO-TEXT...'
                              : 'Appuyez pour enregistrer votre débrief à chaud',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: dictVm.state == RecordingState.recording ? const Color(0xFFF97316) : Colors.grey,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 24),

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
                      height: 120,
                      width: 120,
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
                        size: 56,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Transcript Preview Card with Character Counter
                if (dictVm.transcribedText.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: const [
                                Icon(Icons.graphic_eq_rounded, color: Color(0xFF14B8A6), size: 16),
                                SizedBox(width: 6),
                                Text(
                                  'Transcription Vocale IA',
                                  style: TextStyle(color: Color(0xFF14B8A6), fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                              ],
                            ),
                            Text(
                              '${dictVm.transcribedText.length} caract.',
                              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
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

                // Action Button: Generate AI Report from Voice
                if (dictVm.state == RecordingState.stopped || dictVm.state == RecordingState.completed) ...[
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton.icon(
                      onPressed: salesVm.isGeneratingReport || dictVm.isUploading
                          ? null
                          : () async {
                              _simulateProgressSteps();
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
                            ? 'Traitement IA à chaud...'
                            : 'Générer le Rapport & Devis IA',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF14B8A6),
                      ),
                    ),
                  ),
                ] else if (dictVm.state == RecordingState.idle) ...[
                  const Text(
                    'Parlez 30 à 60s (besoins, pannes constatées, budget) pour que l\'IA génère le devis et le compte-rendu.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                  ),
                ],
              ],

              // ===============================================================
              // MODE 1 : SAISIE DE NOTES & FORMULAIRE RAPIDE (Si pas d'audio)
              // ===============================================================
              if (_selectedInputMode == 1) ...[
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
                      // Décideur rencontré
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Décideur / Gérant rencontré ?',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                          ),
                          Switch(
                            value: _deciderMet,
                            activeThumbColor: const Color(0xFF22C55E),
                            onChanged: (val) => setState(() => _deciderMet = val),
                          ),
                        ],
                      ),
                      const Divider(color: Color(0xFF334155), height: 16),

                      // Besoins rapides (Chips)
                      const Text(
                        'Besoins observés sur place :',
                        style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        children: [
                          'Fibre Pro',
                          'Secours 4G',
                          'Microsoft 365',
                          'Sécurité / Antivirus',
                          'TPE / Paiement',
                          'Interconnexion Sites',
                        ].map((need) {
                          final isSelected = _selectedNeeds.contains(need);
                          return FilterChip(
                            label: Text(need, style: TextStyle(color: isSelected ? Colors.white : Colors.white70, fontSize: 11)),
                            selected: isSelected,
                            selectedColor: const Color(0xFFF97316),
                            backgroundColor: const Color(0xFF0F172A),
                            checkmarkColor: Colors.white,
                            onSelected: (selected) {
                              setState(() {
                                if (selected) {
                                  _selectedNeeds.add(need);
                                } else {
                                  _selectedNeeds.remove(need);
                                }
                              });
                            },
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 14),

                      // Budget Mensuel Indicatif
                      TextField(
                        controller: _budgetController,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: InputDecoration(
                          labelText: 'Budget mensuel estimé (\$ / mois)',
                          labelStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                          hintText: 'Ex: 300',
                          hintStyle: const TextStyle(color: Color(0xFF64748B)),
                          filled: true,
                          fillColor: const Color(0xFF0F172A),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // TextArea pour les notes libres du commercial
                      const Text(
                        'Notes de terrain & remarques du commercial :',
                        style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _notesController,
                        maxLines: 5,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'Ex: Le client a 12 employés. Subit 3 coupures par semaine. Intéressé par la Fibre 100M mais craint les interruptions lors de la bascule...',
                          hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                          filled: true,
                          fillColor: const Color(0xFF0F172A),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                          contentPadding: const EdgeInsets.all(14),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Button: Submit Notes to AI
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton.icon(
                    onPressed: salesVm.isGeneratingReport
                        ? null
                        : () => _processManualNotes(salesVm, enterprise?.name ?? 'Client'),
                    icon: salesVm.isGeneratingReport
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Icon(Icons.auto_awesome_rounded, size: 22),
                    label: Text(
                      salesVm.isGeneratingReport
                          ? 'Génération IA à chaud...'
                          : 'Générer le Rapport & Devis IA',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF14B8A6),
                    ),
                  ),
                ),
              ],

              // Dynamic Step Progress Indicator during AI Generation
              if (salesVm.isGeneratingReport || dictVm.isUploading) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Column(
                    children: [
                      LinearProgressIndicator(
                        value: _processingStep / 3.0,
                        backgroundColor: const Color(0xFF334155),
                        color: const Color(0xFF14B8A6),
                        minHeight: 6,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _processingStep == 1
                            ? 'Étape 1/3 : Analyse du contexte et des pannes...'
                            : _processingStep == 2
                                ? 'Étape 2/3 : Calcul du Coût de l\'Inaction & Tarifs...'
                                : 'Étape 3/3 : Génération du devis et plan d\'actions...',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
