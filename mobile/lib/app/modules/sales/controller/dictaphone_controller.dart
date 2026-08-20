import 'dart:async';
import 'package:get/get.dart';

enum RecordingState { idle, recording, stopped, uploading, completed }

class DictaphoneController extends GetxController {
  final Rx<RecordingState> _state = RecordingState.idle.obs;
  RecordingState get state => _state.value;

  final RxInt recordingSeconds = 0.obs;
  Timer? _timer;

  final RxString transcribedText = "".obs;
  final Rx<String?> audioPath = Rx<String?>(null);
  final RxBool isUploading = false.obs;

  String get formattedDuration {
    final minutes = (recordingSeconds.value ~/ 60).toString().padLeft(2, '0');
    final seconds = (recordingSeconds.value % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  void startRecording() {
    _state.value = RecordingState.recording;
    recordingSeconds.value = 0;
    transcribedText.value = "";
    
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      recordingSeconds.value++;
    });
  }

  void stopRecording() {
    _timer?.cancel();
    _state.value = RecordingState.stopped;
    audioPath.value = "/media/voice_uploads/visit_recording_${DateTime.now().millisecondsSinceEpoch}.m4a";
  }

  Future<String> uploadAndTranscribe(String companyName) async {
    _state.value = RecordingState.uploading;
    isUploading.value = true;

    // Simulate AI Whisper Speech-to-text processing for sales reps audio
    await Future.delayed(const Duration(seconds: 2));

    transcribedText.value = 
      "Rendez-vous chez $companyName. Le client confirme des lenteurs récurrentes sur leur lien ADSL "
      "et exprime un besoin urgent de raccorder ses locaux en Fibre Optique Pro avec basculement 4G de secours. "
      "Ils souhaitent également sécuriser leur infrastructure informatique avec un pare-feu managé et "
      "déployer Microsoft 365 Business Premium pour leurs 25 collaborateurs.";

    isUploading.value = false;
    _state.value = RecordingState.completed;

    return transcribedText.value;
  }

  void reset() {
    _timer?.cancel();
    _state.value = RecordingState.idle;
    recordingSeconds.value = 0;
    transcribedText.value = "";
    audioPath.value = null;
  }

  @override
  void onClose() {
    _timer?.cancel();
    super.onClose();
  }
}
