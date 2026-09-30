import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/kam_workspace_controller.dart';
import '../../../common/screen/widget/mobile_page.dart';
import 'kam_screen_helpers.dart';
import 'kam_report_page.dart';
import '../controller/kam_debrief_controller.dart';

class KamMeetingPage extends StatefulWidget {
  const KamMeetingPage({super.key, required this.appointment});
  final KamData appointment;
  @override
  State<KamMeetingPage> createState() => _KamMeetingPageState();
}

class _KamMeetingPageState extends State<KamMeetingPage> {
  late final KamDebriefController _ctrl;
  final _text = TextEditingController(), _notes = TextEditingController();
  late final Worker _speechWorker;
  String _status = 'IN_NEGOTIATION';
  bool _consent = false;
  @override
  void initState() {
    super.initState();
    _ctrl = Get.put(
      KamDebriefController(appointmentId: widget.appointment['id'] as int),
      tag: 'meeting-${widget.appointment['id']}',
    );
    _ctrl.restored.then((_) {
      if (mounted) {
        _text.text = _ctrl.transcribedSpeech.value;
        _notes.text = _ctrl.notes.value;
      }
    });
    _speechWorker = ever(_ctrl.transcribedSpeech, (String text) {
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
    _speechWorker.dispose();
    Get.delete<KamDebriefController>(
      tag: 'meeting-${widget.appointment['id']}',
    );
    _text.dispose();
    _notes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Obx(() {
    final recording =
        _ctrl.recordingState.value == DebriefRecordingState.recording;
    final processing =
        _ctrl.recordingState.value == DebriefRecordingState.processing;
    return MobilePage(
      title: 'Réunion en cours',
      subtitle:
          '${widget.appointment['enterprise_name']}\n${widget.appointment['title']}',
      primaryLabel: recording ? 'Terminer la dictée' : 'Générer le rapport',
      busy: processing,
      onPrimary: !_ctrl.ready.value
          ? null
          : recording
          ? () => _ctrl.stopRecording()
          : () async {
              final report = await _ctrl.generateExecutiveDebrief(_status);
              if (report != null && mounted) {
                Get.off(
                  () => KamReportPage(
                    reportId: report['id'] as int,
                    initialReport: report,
                  ),
                );
              }
            },
      children: [
        if (!_ctrl.ready.value)
          const LinearProgressIndicator(color: mobilePrimary),
        ReadingSection(
          'Transcription',
          recording
              ? 'Dictée en cours · ${_ctrl.formattedDuration}'
              : 'Le texte est conservé pour cette réunion. Vous pouvez le corriger ou saisir vos notes.',
        ),
        spacedField(
          TextField(
            controller: _text,
            minLines: 5,
            maxLines: 12,
            enabled: !recording && !processing && _ctrl.ready.value,
            onChanged: _ctrl.editTranscript,
            decoration: const InputDecoration(
              labelText: 'Texte de la réunion',
              alignLabelWithHint: true,
            ),
          ),
        ),
        if (!recording) ...[
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            value: _consent,
            controlAffinity: ListTileControlAffinity.leading,
            title: const Text(
              'Mon interlocuteur accepte la transcription vocale.',
              style: TextStyle(fontSize: 14, height: 1.5),
            ),
            onChanged: processing
                ? null
                : (v) => setState(() => _consent = v ?? false),
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: _consent && !processing && _ctrl.ready.value
                  ? () => _ctrl.startRecording()
                  : null,
              child: const Text('Dicter ou poursuivre la transcription'),
            ),
          ),
          const SizedBox(height: 24),
        ],
        spacedField(
          TextField(
            controller: _notes,
            minLines: 3,
            maxLines: 8,
            enabled: !processing && _ctrl.ready.value,
            onChanged: _ctrl.editNotes,
            decoration: const InputDecoration(
              labelText: 'Notes complémentaires',
              alignLabelWithHint: true,
            ),
          ),
        ),
        spacedField(
          DropdownButtonFormField<String>(
            initialValue: _status,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Résultat de la réunion',
            ),
            items:
                {
                      'IN_NEGOTIATION': 'En négociation',
                      'CONVERTED': 'Converti',
                      'LOST': 'Perdu',
                          }.entries
                    .map(
                      (e) =>
                          DropdownMenuItem(value: e.key, child: Text(e.value)),
                    )
                    .toList(),
            onChanged: processing ? null : (v) => setState(() => _status = v!),
          ),
        ),
        if (_ctrl.error.isNotEmpty)
          ReadingSection('Rapport non généré', _ctrl.error.value),
      ],
    );
  });
}
