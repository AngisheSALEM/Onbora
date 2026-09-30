import 'dart:async';
import 'package:get/get.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:permission_handler/permission_handler.dart';
import '../../../core/storage/transcript_draft.dart';
import 'kam_workspace_controller.dart';

enum DebriefRecordingState { idle, recording, stopped, processing, completed }

class KamDebriefController extends GetxController {
  KamDebriefController({int? appointmentId})
    : appointmentId =
          appointmentId ??
          Get.find<KamWorkspaceController>().selectedAppointment?['id'] as int?;
  final int? appointmentId;
  final recordingState = DebriefRecordingState.idle.obs;
  final recordingSeconds = 0.obs;
  final transcribedSpeech = ''.obs;
  final notes = ''.obs;
  final error = ''.obs;
  final ready = false.obs;
  final _speech = stt.SpeechToText();
  final _buffer = TranscriptBuffer();
  late final TranscriptDraft _draft = TranscriptDraft('kam:$appointmentId');
  late final TranscriptDraft _notesDraft = TranscriptDraft(
    'kam-notes:$appointmentId',
  );
  late Future<void> restored;
  Timer? _timer, _restart;
  bool _available = false, _acceptResults = true;
  Completer<void>? _finalResult;

  @override
  void onInit() {
    super.onInit();
    restored = _restore();
  }

  Future<void> _restore() async {
    transcribedSpeech.value = await _draft.read();
    notes.value = await _notesDraft.read();
    _buffer.restore(transcribedSpeech.value);
    ready.value = true;
  }

  Future<void> editTranscript(String text) async {
    transcribedSpeech.value = text;
    _buffer.restore(text);
    await _draft.save(text);
  }

  Future<void> editNotes(String text) async {
    notes.value = text;
    await _notesDraft.save(text);
  }

  String get formattedDuration =>
      '${(recordingSeconds.value ~/ 60).toString().padLeft(2, '0')}:${(recordingSeconds.value % 60).toString().padLeft(2, '0')}';

  Future<void> startRecording() async {
    await restored;
    error.value = '';
    if (!(await Permission.microphone.request()).isGranted) {
      error.value = 'Autorisez le microphone ou saisissez vos notes.';
      return;
    }
    _speech.statusListener = (status) {
      if ((status == 'done' || status == 'notListening') &&
          recordingState.value == DebriefRecordingState.recording) {
        _scheduleRestart();
      }
    };
    _speech.errorListener = (notification) {
      error.value =
          'Reconnaissance interrompue. Vous pouvez compléter le texte manuellement.';
      if (!notification.permanent) {
        _scheduleRestart();
      } else {
        unawaited(stopRecording());
      }
    };
    if (!_available) {
      _available = await _speech.initialize(
        onStatus: (status) {
          if ((status == 'done' || status == 'notListening') &&
              recordingState.value == DebriefRecordingState.recording) {
            _scheduleRestart();
          }
        },
        onError: (errorNotification) {
          error.value =
              'Reconnaissance interrompue. Vous pouvez compléter le texte manuellement.';
          if (!errorNotification.permanent) {
            _scheduleRestart();
          } else {
            unawaited(stopRecording());
          }
        },
      );
    }
    if (!_available) {
      error.value =
          'Reconnaissance vocale indisponible. Saisissez vos notes pour continuer.';
      return;
    }
    recordingState.value = DebriefRecordingState.recording;
    _timer?.cancel();
    _timer = Timer.periodic(
      const Duration(seconds: 1),
      (_) => recordingSeconds.value++,
    );
    await _listen();
  }

  void _scheduleRestart() {
    _restart?.cancel();
    _restart = Timer(const Duration(milliseconds: 800), () {
      if (recordingState.value == DebriefRecordingState.recording &&
          !_speech.isListening) {
        _listen();
      }
    });
  }

  Future<void> _listen() async {
    _buffer.beginSegment();
    try {
      await _speech.listen(
        onResult: (result) {
          if (!_acceptResults) return;
          transcribedSpeech.value = _buffer.update(result.recognizedWords);
          unawaited(_draft.save(transcribedSpeech.value));
          if (result.finalResult && !(_finalResult?.isCompleted ?? true)) {
            _finalResult!.complete();
          }
        },
        listenOptions: stt.SpeechListenOptions(
          localeId: 'fr_FR',
          listenMode: stt.ListenMode.dictation,
          cancelOnError: false,
          partialResults: true,
          pauseFor: const Duration(seconds: 5),
          listenFor: const Duration(hours: 1),
        ),
      );
    } catch (e) {
      error.value =
          'Le microphone est indisponible. Réessayez ou saisissez vos notes.';
      await stopRecording();
    }
  }

  Future<void> stopRecording() async {
    _timer?.cancel();
    _restart?.cancel();
    final listening = _speech.isListening;
    recordingState.value = DebriefRecordingState.stopped;
    _finalResult = Completer<void>();
    await _speech.stop();
    if (listening) {
      await _finalResult!.future.timeout(
        const Duration(milliseconds: 2500),
        onTimeout: () {},
      );
    }
    await _draft.save(transcribedSpeech.value);
  }

  bool _submitting = false;
  Future<KamData?> generateExecutiveDebrief(String status) async {
    if (_submitting) return null;
    _submitting = true;
    try {
      return await _generate(status);
    } finally {
      _submitting = false;
    }
  }

  Future<KamData?> _generate(String status) async {
    await restored;
    if (recordingState.value == DebriefRecordingState.processing) return null;
    await stopRecording();
    if (appointmentId == null ||
        (transcribedSpeech.value.trim().isEmpty &&
            notes.value.trim().isEmpty)) {
      error.value =
          'Sélectionnez une réunion et ajoutez une transcription ou des notes.';
      return null;
    }
    recordingState.value = DebriefRecordingState.processing;
    error.value = '';
    _acceptResults = false;
    try {
      final report = await Get.find<KamWorkspaceController>()
          .completeAppointment(
            appointmentId!,
            transcribedSpeech.value,
            notes.value,
            status,
          );
      _acceptResults = false;
      try {
        await _draft.clear();
        await _notesDraft.clear();
      } catch (_) {
        error.value =
            'Le rapport est enregistré. Le brouillon local n’a pas pu être nettoyé.';
      }
      recordingState.value = DebriefRecordingState.completed;
      return report;
    } catch (e) {
      _acceptResults = true;
      error.value = '$e';
      recordingState.value = DebriefRecordingState.stopped;
      return null;
    }
  }

  @override
  void onClose() {
    _acceptResults = false;
    _timer?.cancel();
    _restart?.cancel();
    _speech.cancel();
    super.onClose();
  }
}
