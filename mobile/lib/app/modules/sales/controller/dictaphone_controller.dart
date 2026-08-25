import 'dart:async';
import 'package:get/get.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:permission_handler/permission_handler.dart';
import 'sales_controller.dart';

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
  String _accumulatedWords = "";
  String _currentSessionWords = "";
  String _lastDispatchedText = "";

  final stt.SpeechToText _speechToText = stt.SpeechToText();

  @override
  void onInit() {
    super.onInit();
    _initSpeechRecognizer();
  }

  Future<void> _initSpeechRecognizer() async {
    try {
      final available = await _speechToText.initialize(
        onStatus: _handleSpeechStatus,
        onError: (errorNotification) {
          speechStatus.value = "Erreur: ${errorNotification.errorMsg}";
          if (_state.value == RecordingState.recording) {
            _scheduleContinuousRestart();
          }
        },
      );
      isSpeechAvailable.value = available;
    } catch (_) {
      isSpeechAvailable.value = false;
    }
  }

  void _handleSpeechStatus(String status) {
    speechStatus.value = status;
    // Si le moteur STT s'arrête (après une pause ou un silence), on le relance immédiatement en continu
    if ((status == 'done' || status == 'notListening') && _state.value == RecordingState.recording) {
      if (_currentSessionWords.trim().isNotEmpty) {
        _accumulatedWords = (_accumulatedWords.isEmpty ? _currentSessionWords : "$_accumulatedWords $_currentSessionWords").trim();
        _currentSessionWords = "";
        transcribedText.value = _accumulatedWords;
      }
      _scheduleContinuousRestart();
    }
  }

  void _scheduleContinuousRestart() {
    _restartListenTimer?.cancel();
    if (_state.value != RecordingState.recording) return;

    _restartListenTimer = Timer(const Duration(milliseconds: 150), () {
      if (_state.value == RecordingState.recording && !_speechToText.isListening) {
        _startListeningLoop();
      }
    });
  }

  String get formattedDuration {
    final minutes = (recordingSeconds.value ~/ 60).toString().padLeft(2, '0');
    final seconds = (recordingSeconds.value % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  Future<void> startRecording() async {
    final micPerm = await Permission.microphone.request();
    if (!micPerm.isGranted) {
      Get.snackbar(
        'Permission requise',
        'Veuillez autoriser l\'accès au microphone pour enregistrer.',
        snackPosition: SnackPosition.BOTTOM,
      );
      return;
    }

    _state.value = RecordingState.recording;
    recordingSeconds.value = 0;
    transcribedText.value = "";
    _accumulatedWords = "";
    _currentSessionWords = "";
    _lastDispatchedText = "";
    lastSpeechChunk.value = "";
    isVADSpeaking.value = false;

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

    try {
      await _speechToText.listen(
        onResult: (result) {
          _currentSessionWords = result.recognizedWords;
          final fullText = (_accumulatedWords.isEmpty ? _currentSessionWords : "$_accumulatedWords $_currentSessionWords").trim();
          transcribedText.value = fullText;
          isVADSpeaking.value = true;

          // Réinitialisation de la fenêtre temporelle de silence (VAD 500-600ms)
          _silenceDebounceTimer?.cancel();
          _silenceDebounceTimer = Timer(const Duration(milliseconds: 600), () {
            _onSilenceDetected();
          });

          if (result.finalResult) {
            _accumulatedWords = fullText;
            _currentSessionWords = "";
          }
        },
        listenOptions: stt.SpeechListenOptions(
          listenMode: stt.ListenMode.dictation,
          cancelOnError: false,
          partialResults: true,
          onDevice: false,
          pauseFor: const Duration(seconds: 4),
          listenFor: const Duration(hours: 1),
          localeId: 'fr_FR',
        ),
      );
    } catch (_) {
      if (_state.value == RecordingState.recording) {
        _scheduleContinuousRestart();
      }
    }
  }

  /// Déclenché dès qu'un silence de clôture (500-600ms) est détecté après une prise de parole
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
    isVADSpeaking.value = false;

    if (_currentSessionWords.trim().isNotEmpty) {
      _accumulatedWords = (_accumulatedWords.isEmpty ? _currentSessionWords : "$_accumulatedWords $_currentSessionWords").trim();
      _currentSessionWords = "";
      transcribedText.value = _accumulatedWords;
    }

    // Dispatch final turn si reliquat de parole
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
    audioPath.value = "/media/voice_uploads/visit_recording_${DateTime.now().millisecondsSinceEpoch}.m4a";

    if (_speechToText.isListening) {
      await _speechToText.stop();
    }
  }

  Future<String> uploadAndTranscribe(String companyName) async {
    _state.value = RecordingState.uploading;
    isUploading.value = true;

    // Si Speech-to-text a capturé la voix réelle de l'utilisateur
    if (transcribedText.value.trim().isNotEmpty) {
      isUploading.value = false;
      _state.value = RecordingState.completed;
      return transcribedText.value;
    }

    // Si aucune voix n'a été détectée par le microphone
    transcribedText.value = "Aucun son capturé ou microphone non configuré.";
    isUploading.value = false;
    _state.value = RecordingState.completed;
    return transcribedText.value;
  }

  void reset() {
    _timer?.cancel();
    _silenceDebounceTimer?.cancel();
    _restartListenTimer?.cancel();
    if (_speechToText.isListening) {
      _speechToText.stop();
    }
    _state.value = RecordingState.idle;
    recordingSeconds.value = 0;
    transcribedText.value = "";
    _accumulatedWords = "";
    _currentSessionWords = "";
    _lastDispatchedText = "";
    lastSpeechChunk.value = "";
    isVADSpeaking.value = false;
    audioPath.value = null;
  }

  @override
  void onClose() {
    _timer?.cancel();
    _silenceDebounceTimer?.cancel();
    _restartListenTimer?.cancel();
    if (_speechToText.isListening) {
      _speechToText.stop();
    }
    super.onClose();
  }
}
