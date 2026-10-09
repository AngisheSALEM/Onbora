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

  // Guard pour éviter les tentatives de relance concurrentes (ERROR_BUSY)
  bool _isRelaunching = false;

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
      if (_currentSessionWords.trim().isNotEmpty) {
        _accumulatedWords = (_accumulatedWords.isEmpty
                ? _currentSessionWords
                : "$_accumulatedWords $_currentSessionWords")
            .trim();
        _currentSessionWords = "";
        transcribedText.value = _accumulatedWords;
      }
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
      if (_state.value == RecordingState.recording && !_speechToText.isListening) {
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
      if (_state.value == RecordingState.recording && !_speechToText.isListening) {
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

  Future<void> startRecording() async {
    final micPerm = await Permission.microphone.request();
    if (!micPerm.isGranted) {
      Get.snackbar(
        'Permission requise',
        'Veuillez autoriser l\'acces au microphone pour enregistrer.',
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

    try {
      await _speechToText.listen(
        onResult: (result) {
          _currentSessionWords = result.recognizedWords;
          final fullText = (_accumulatedWords.isEmpty
                  ? _currentSessionWords
                  : "$_accumulatedWords $_currentSessionWords")
              .trim();
          transcribedText.value = fullText;
          isVADSpeaking.value = true;

          // Reinitialisation de la fenetre temporelle de silence (VAD)
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

    if (_currentSessionWords.trim().isNotEmpty) {
      _accumulatedWords = (_accumulatedWords.isEmpty
              ? _currentSessionWords
              : "$_accumulatedWords $_currentSessionWords")
          .trim();
      _currentSessionWords = "";
      transcribedText.value = _accumulatedWords;
    }

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
    _state.value = RecordingState.uploading;
    isUploading.value = true;

    // Si Speech-to-text a capture la voix reelle de l'utilisateur, l'utiliser
    if (transcribedText.value.trim().isNotEmpty) {
      isUploading.value = false;
      _state.value = RecordingState.completed;
      return transcribedText.value;
    }

    // Si aucune parole n'a ete detectee par le moteur STT local
    const noSpeechMsg = "Aucune parole detectee. Verifiez que le microphone est "
        "actif et que la langue francaise est disponible sur votre appareil.";
    transcribedText.value = noSpeechMsg;
    isUploading.value = false;
    _state.value = RecordingState.completed;
    return transcribedText.value;
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
    _isRelaunching = false;
    if (_speechToText.isListening) {
      _speechToText.stop();
    }
    super.onClose();
  }
}
