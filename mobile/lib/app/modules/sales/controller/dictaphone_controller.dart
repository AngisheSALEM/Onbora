import 'dart:async';
import 'package:get/get.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:permission_handler/permission_handler.dart';

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

  final stt.SpeechToText _speechToText = stt.SpeechToText();

  @override
  void onInit() {
    super.onInit();
    _initSpeechRecognizer();
  }

  Future<void> _initSpeechRecognizer() async {
    try {
      final available = await _speechToText.initialize(
        onStatus: (status) => speechStatus.value = status,
        onError: (errorNotification) {
          if (transcribedText.value.isEmpty) {
            speechStatus.value = "Erreur: ${errorNotification.errorMsg}";
          }
        },
      );
      isSpeechAvailable.value = available;
    } catch (_) {
      isSpeechAvailable.value = false;
    }
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

    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      recordingSeconds.value++;
    });

    if (!isSpeechAvailable.value) {
      await _initSpeechRecognizer();
    }

    if (isSpeechAvailable.value) {
      await _speechToText.listen(
        onResult: (result) {
          transcribedText.value = result.recognizedWords;
        },
        listenOptions: stt.SpeechListenOptions(
          listenMode: stt.ListenMode.dictation,
          cancelOnError: false,
          partialResults: true,
          onDevice: false,
          localeId: 'fr_FR',
        ),
      );
    }
  }

  Future<void> stopRecording() async {
    _timer?.cancel();
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
    if (_speechToText.isListening) {
      _speechToText.stop();
    }
    _state.value = RecordingState.idle;
    recordingSeconds.value = 0;
    transcribedText.value = "";
    audioPath.value = null;
  }

  @override
  void onClose() {
    _timer?.cancel();
    if (_speechToText.isListening) {
      _speechToText.stop();
    }
    super.onClose();
  }
}
