import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/dictaphone_controller.dart';
import '../controller/sales_controller.dart';
import '../../../routes/app_routes.dart';
import '../../../common/screen/widget/mobile_page.dart';

class DictaphoneRecordingScreen extends StatefulWidget {
  const DictaphoneRecordingScreen({super.key});
  @override
  State<DictaphoneRecordingScreen> createState() =>
      _DictaphoneRecordingScreenState();
}

class _DictaphoneRecordingScreenState extends State<DictaphoneRecordingScreen> {
  late final DictaphoneController _dict = Get.find<DictaphoneController>();
  late final SalesController _sales = Get.find<SalesController>();
  final _text = TextEditingController(), _notes = TextEditingController();
  late final Worker _worker;
  bool _consent = false, _submitting = false;
  @override
  void initState() {
    super.initState();
    _dict.restored.then((_) {
      if (mounted) {
        _text.text = _dict.transcribedText.value;
        _notes.text = _dict.manualNotes.value;
      }
    });
    _worker = ever(_dict.transcribedText, (String text) {
      if (_text.text != text) {
        _text.value = TextEditingValue(
          text: text,
          selection: TextSelection.collapsed(offset: text.length),
        );
      }
    });
  }

  @override
  void dispose() {
    _worker.dispose();
    _text.dispose();
    _notes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Obx(() {
    final recording = _dict.state == RecordingState.recording;
    final busy = _sales.isGeneratingReport.value || _submitting;
    final hasText =
        _dict.transcribedText.value.trim().isNotEmpty ||
        _dict.manualNotes.value.trim().isNotEmpty;
    final copilot = _sales.currentLiveCopilot.value;
    return MobilePage(
      title: 'Compte-rendu de visite',
      subtitle:
          _sales.selectedEnterprise.value?.name ??
          'Sélectionnez une entreprise avant la visite.',
      primaryLabel: recording
          ? 'Terminer la dictée'
          : hasText
          ? 'Générer le rapport'
          : 'Commencer la dictée',
      busy: busy,
      onPrimary: !_dict.ready.value
          ? null
          : recording
          ? () => _dict.stopRecording()
          : hasText
          ? _generate
          : _consent
          ? () => _dict.startRecording()
          : null,
      children: [
        ReadingSection(
          'Transcription',
          recording
              ? 'Dictée en cours · ${_dict.formattedDuration}'
              : 'Votre brouillon est conservé pour cette visite. Corrigez le texte avant de générer le rapport.',
        ),
        if (!_dict.ready.value)
          const LinearProgressIndicator(color: mobilePrimary),
        Padding(
          padding: const EdgeInsets.only(bottom: 24),
          child: TextField(
            controller: _text,
            minLines: 5,
            maxLines: 12,
            enabled: !recording && !busy && _dict.ready.value,
            onChanged: _dict.saveEditedTranscript,
            decoration: const InputDecoration(
              labelText: 'Texte de la visite',
              alignLabelWithHint: true,
            ),
          ),
        ),
        if (!recording) ...[
          CheckboxListTile(
            value: _consent,
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            onChanged: busy
                ? null
                : (v) => setState(() => _consent = v ?? false),
            title: const Text(
              'Mon interlocuteur accepte la transcription vocale.',
              style: TextStyle(fontSize: 14, height: 1.5),
            ),
          ),
          if (hasText)
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: _consent && !busy
                    ? () => _dict.startRecording()
                    : null,
                child: const Text('Poursuivre la dictée'),
              ),
            ),
          const SizedBox(height: 24),
        ],
        Padding(
          padding: const EdgeInsets.only(bottom: 28),
          child: TextField(
            controller: _notes,
            minLines: 3,
            maxLines: 8,
            enabled: !busy && _dict.ready.value,
            onChanged: _dict.saveNotes,
            decoration: const InputDecoration(
              labelText: 'Notes complémentaires',
              alignLabelWithHint: true,
            ),
          ),
        ),
        if (copilot != null)
          ExpansionTile(
            title: const Text('Suggestions pendant la visite'),
            tilePadding: EdgeInsets.zero,
            children: [
              ReadingSection(
                'Besoins détectés',
                copilot.detectedNeeds.join('\n\n'),
              ),
              ReadingSection('Conseil', copilot.coachingTip),
              for (final offer
                  in copilot.realtimeProposition.recommendedPackages)
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: offer.checked,
                  onChanged: (v) =>
                      _sales.toggleLivePackage(offer.serviceId, v ?? false),
                  title: Text(offer.name),
                  subtitle: Text(
                    '${offer.monthlyPriceUsd} USD / mois\n${offer.pitchArgument}',
                  ),
                ),
            ],
          ),
        if (_sales.errorMessage.isNotEmpty)
          ReadingSection('Rapport non généré', _sales.errorMessage.value),
        if (!_dict.isSpeechAvailable.value && !recording)
          const Text(
            'La saisie manuelle reste disponible si la reconnaissance vocale ne fonctionne pas.',
            style: TextStyle(fontSize: 14, height: 1.5),
          ),
      ],
    );
  });
  Future<void> _generate() async {
    if (_submitting) return;
    setState(() => _submitting = true);
    try {
      await _dict.stopRecording();
      final transcript = _dict.transcribedText.value.trim();
      final notes = _dict.manualNotes.value.trim();
      final text = [
        if (transcript.isNotEmpty) transcript,
        if (notes.isNotEmpty) 'Notes complémentaires :\n$notes',
      ].join('\n\n');
      if (text.isEmpty) return;
      final success = await _sales.generateReportFromTranscript(
        text,
        audioPath: _dict.audioPath.value,
      );
      if (success && mounted) {
        await _dict.clearSubmittedDraft();
        Get.offNamed(Routes.VISIT_REPORT_DETAIL);
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }
}
