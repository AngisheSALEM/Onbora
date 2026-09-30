import 'dart:async';
import 'package:get/get.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:permission_handler/permission_handler.dart';
import 'sales_controller.dart';
import '../../../core/storage/transcript_draft.dart';

enum RecordingState { idle, recording, stopped, uploading, completed }

class DictaphoneController extends GetxController {
  final Rx<RecordingState> _state = RecordingState.idle.obs;
  RecordingState get state => _state.value;

  final RxInt recordingSeconds = 0.obs;
  Timer? _timer;

  final RxString transcribedText = "".obs;
  final Rx<String?> audioPath = Rx<String?>(null);
  final RxBool isUploading = false.obs;
  final RxBool isSpeechAvailable = false.obs;
  final RxString speechStatus = "".obs;

  // Continuous speech accumulation & VAD
  final RxBool isVADSpeaking = false.obs;
  final RxString lastSpeechChunk = "".obs;
  Timer? _silenceDebounceTimer;
  Timer? _restartListenTimer;
  final TranscriptBuffer _transcript = TranscriptBuffer();
  late final TranscriptDraft _draft;
  Future<void> restored = Future.value();
  late final TranscriptDraft notesDraft;
  final manualNotes = ''.obs;
  final ready = false.obs;
  bool _acceptResults = true;
  Completer<void>? _finalResult;
  String _lastDispatchedText = "";

  // Guard pour éviter les tentatives de relance concurrentes (ERROR_BUSY)
  bool _isRelaunching = false;

  final stt.SpeechToText _speechToText = stt.SpeechToText();

  @override
  void onInit() {
    super.onInit();
    final sales = Get.find<SalesController>();
    _draft = TranscriptDraft(
      'sales:enterprise:${sales.selectedEnterprise.value?.id ?? 'unassigned'}',
    );
    notesDraft = TranscriptDraft('${_draft.scope}:notes');
    restored = _restoreDraft();
  }

  Future<void> _initSpeechRecognizer() async {
    try {
      final available = await _speechToText.initialize(
        onStatus: _handleSpeechStatus,
        onError: (errorNotification) {
          speechStatus.value = "Erreur: ${errorNotification.errorMsg}";
          // Ne relancer QUE si l'erreur n'est pas permanente et qu'on est
          // toujours en mode enregistrement.
          // Les erreurs permanentes (ex: microphone indisponible, permission
          // refusée) ne doivent PAS provoquer de relance infinie.
          if (!errorNotification.permanent &&
              _state.value == RecordingState.recording) {
            _scheduleErrorRestart();
          }
        },
      );
      _speechToText.statusListener = _handleSpeechStatus;
      _speechToText.errorListener = (errorNotification) {
        speechStatus.value =
            'Reconnaissance interrompue : ${errorNotification.errorMsg}';
        if (!errorNotification.permanent && state == RecordingState.recording) {
          _scheduleErrorRestart();
        } else if (errorNotification.permanent) {
          unawaited(stopRecording());
        }
      };
      isSpeechAvailable.value = available;
    } catch (_) {
      isSpeechAvailable.value = false;
    }
  }

  void _handleSpeechStatus(String status) {
    speechStatus.value = status;
    // Quand le moteur Android signale la fin d'une session d'ecoute
    // (pause naturelle apres silence), on consolide et on relance.
    if ((status == 'done' || status == 'notListening') &&
        _state.value == RecordingState.recording) {
      _scheduleStatusRestart();
    }
  }

  /// Relance apres un changement de status (done/notListening).
  /// Delai : 600ms — laisse au moteur Android le temps de liberer le micro.
  void _scheduleStatusRestart() {
    if (_isRelaunching) return;
    _restartListenTimer?.cancel();
    if (_state.value != RecordingState.recording) return;

    _restartListenTimer = Timer(const Duration(milliseconds: 600), () {
      _isRelaunching = false;
      if (_state.value == RecordingState.recording &&
          !_speechToText.isListening) {
        _startListeningLoop();
      }
    });
    _isRelaunching = true;
  }

  /// Relance apres une erreur non-permanente (ex: timeout reseau).
  /// Delai : 1200ms — plus long pour eviter ERROR_BUSY (Code 8 Android).
  void _scheduleErrorRestart() {
    if (_isRelaunching) return;
    _restartListenTimer?.cancel();
    if (_state.value != RecordingState.recording) return;

    _restartListenTimer = Timer(const Duration(milliseconds: 1200), () {
      _isRelaunching = false;
      if (_state.value == RecordingState.recording &&
          !_speechToText.isListening) {
        _startListeningLoop();
      }
    });
    _isRelaunching = true;
  }

  String get formattedDuration {
    final minutes = (recordingSeconds.value ~/ 60).toString().padLeft(2, '0');
    final seconds = (recordingSeconds.value % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  Future<void> _restoreDraft() async {
    final saved = await _draft.read();
    manualNotes.value = await notesDraft.read();
    _transcript.restore(saved);
    transcribedText.value = saved;
    if (saved.isNotEmpty || manualNotes.isNotEmpty) {
      _state.value = RecordingState.stopped;
    }
    ready.value = true;
  }

  Future<void> saveEditedTranscript(String text) async {
    _transcript.restore(text);
    transcribedText.value = text;
    await _draft.save(text);
  }

  Future<void> saveNotes(String text) async {
    manualNotes.value = text;
    await notesDraft.save(text);
  }

  Future<void> clearSubmittedDraft() async {
    _acceptResults = false;
    await _draft.clear();
    await notesDraft.clear();
  }

  Future<void> startRecording() async {
    await restored;
    final micPerm = await Permission.microphone.request();
    if (!micPerm.isGranted) {
      Get.snackbar(
        'Permission requise',
        'Veuillez autoriser l\'acces au microphone pour enregistrer.',
        snackPosition: SnackPosition.BOTTOM,
      );
      return;
    }

    await _initSpeechRecognizer();
    if (!isSpeechAvailable.value) {
      Get.snackbar(
        'Reconnaissance indisponible',
        'Vous pouvez saisir vos notes manuellement.',
      );
      return;
    }
    _acceptResults = true;
    _state.value = RecordingState.recording;
    recordingSeconds.value = 0;
    _transcript.restore(transcribedText.value);
    _lastDispatchedText = "";
    lastSpeechChunk.value = "";
    isVADSpeaking.value = false;
    _isRelaunching = false;

    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      recordingSeconds.value++;
    });

    if (!isSpeechAvailable.value) {
      await _initSpeechRecognizer();
    }

    _startListeningLoop();
  }

  Future<void> _startListeningLoop() async {
    if (_state.value != RecordingState.recording) return;
    _isRelaunching = false;

    _transcript.beginSegment();
    try {
      await _speechToText.listen(
        onResult: (result) {
          if (!_acceptResults) return;
          transcribedText.value = _transcript.update(result.recognizedWords);
          unawaited(_draft.save(transcribedText.value));
          if (result.finalResult && !(_finalResult?.isCompleted ?? true)) {
            _finalResult!.complete();
          }
          isVADSpeaking.value = true;

          // Reinitialisation de la fenetre temporelle de silence (VAD)
          _silenceDebounceTimer?.cancel();
          _silenceDebounceTimer = Timer(const Duration(milliseconds: 600), () {
            _onSilenceDetected();
          });
        },
        listenOptions: stt.SpeechListenOptions(
          listenMode: stt.ListenMode.dictation,
          cancelOnError: false,
          partialResults: true,
          onDevice: false,
          // pauseFor : arret de reconnaissance apres 5s de silence
          // (plus long que la valeur precedente de 4s pour reduire les
          // rechargements intempestifs sur Android)
          pauseFor: const Duration(seconds: 5),
          listenFor: const Duration(hours: 1),
          localeId: 'fr_FR',
        ),
      );
    } catch (_) {
      // En cas d'exception au demarrage (ex: ressource micro occupee),
      // on utilise le delai long pour eviter la boucle ERROR_BUSY.
      if (_state.value == RecordingState.recording) {
        _scheduleErrorRestart();
      }
    }
  }

  /// Declenche quand un silence post-parole est detecte (VAD 600ms).
  void _onSilenceDetected() {
    isVADSpeaking.value = false;
    final currentFull = transcribedText.value.trim();
    if (currentFull.length > _lastDispatchedText.length) {
      final newChunk = currentFull.substring(_lastDispatchedText.length).trim();
      if (newChunk.isNotEmpty && newChunk.length >= 6) {
        _lastDispatchedText = currentFull;
        lastSpeechChunk.value = newChunk;

        // Envoi asynchrone au Copilote IA sans bloquer le flux audio
        _dispatchChunkToLiveCopilot(newChunk);
      }
    }
  }

  void _dispatchChunkToLiveCopilot(String chunk) {
    try {
      if (Get.isRegistered<SalesController>()) {
        final salesCtrl = Get.find<SalesController>();
        final entId = salesCtrl.selectedEnterprise.value?.id ?? 1;
        salesCtrl.sendLiveCopilotTurn(entId, chunk);
      }
    } catch (_) {}
  }

  Future<void> stopRecording() async {
    _timer?.cancel();
    _silenceDebounceTimer?.cancel();
    _restartListenTimer?.cancel();
    _isRelaunching = false;
    isVADSpeaking.value = false;

    await restored;
    final listening = _speechToText.isListening;
    _state.value = RecordingState.stopped;
    _finalResult = Completer<void>();
    await _speechToText.stop();
    if (listening) {
      await _finalResult!.future.timeout(
        const Duration(milliseconds: 2500),
        onTimeout: () {},
      );
    }
    await _draft.save(transcribedText.value);

    // Dispatch final si reliquat de parole non encore envoye
    final currentFull = transcribedText.value.trim();
    if (currentFull.length > _lastDispatchedText.length) {
      final newChunk = currentFull.substring(_lastDispatchedText.length).trim();
      if (newChunk.isNotEmpty) {
        _lastDispatchedText = currentFull;
        lastSpeechChunk.value = newChunk;
        _dispatchChunkToLiveCopilot(newChunk);
      }
    }

    _state.value = RecordingState.stopped;
    // audioPath reste null : l'app mobile utilise la transcription STT locale,
    // pas un fichier audio enregistre sur le disque.
    audioPath.value = null;

    if (_speechToText.isListening) {
      await _speechToText.stop();
    }
  }

  Future<String> uploadAndTranscribe(String companyName) async {
    await restored;
    if (state == RecordingState.recording) await stopRecording();
    await _draft.save(transcribedText.value);
    if (transcribedText.value.trim().isEmpty) {
      throw StateError(
        'Aucune transcription. Dictez ou saisissez vos notes avant de générer le rapport.',
      );
    }
    _state.value = RecordingState.completed;
    return transcribedText.value.trim();
  }

  void reset() {
    _timer?.cancel();
    _silenceDebounceTimer?.cancel();
    _restartListenTimer?.cancel();
    _isRelaunching = false;
    if (_speechToText.isListening) {
      _speechToText.stop();
    }
    _state.value = RecordingState.idle;
    recordingSeconds.value = 0;
    transcribedText.value = "";
    _transcript.restore('');
    unawaited(_draft.clear());
    _lastDispatchedText = "";
    lastSpeechChunk.value = "";
    isVADSpeaking.value = false;
    audioPath.value = null;
  }

  @override
  void onClose() {
    _acceptResults = false;
    _timer?.cancel();
    _silenceDebounceTimer?.cancel();
    _restartListenTimer?.cancel();
    _isRelaunching = false;
    if (_speechToText.isListening) {
      _speechToText.stop();
    }
    super.onClose();
  }
}
