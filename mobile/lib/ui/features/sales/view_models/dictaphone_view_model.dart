import 'dart:async';
import 'package:flutter/material.dart';

enum RecordingState { idle, recording, stopped, uploading, completed }

class DictaphoneViewModel extends ChangeNotifier {
  RecordingState _state = RecordingState.idle;
  RecordingState get state => _state;

  int _recordingSeconds = 0;
  int get recordingSeconds => _recordingSeconds;

  Timer? _timer;

  String _transcribedText = "";
  String get transcribedText => _transcribedText;

  String? _audioPath;
  String? get audioPath => _audioPath;

  bool _isUploading = false;
  bool get isUploading => _isUploading;

  String get formattedDuration {
    final minutes = (_recordingSeconds ~/ 60).toString().padLeft(2, '0');
    final seconds = (_recordingSeconds % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  void startRecording() {
    _state = RecordingState.recording;
    _recordingSeconds = 0;
    _transcribedText = "";
    notifyListeners();

    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _recordingSeconds++;
      notifyListeners();
    });
  }

  void stopRecording() {
    _timer?.cancel();
    _state = RecordingState.stopped;
    _audioPath = "/media/voice_uploads/visit_recording_${DateTime.now().millisecondsSinceEpoch}.m4a";
    notifyListeners();
  }

  Future<String> uploadAndTranscribe(String companyName) async {
    _state = RecordingState.uploading;
    _isUploading = true;
    notifyListeners();

    // Simulate AI Whisper Speech-to-text processing for sales reps audio
    await Future.delayed(const Duration(seconds: 2));

    _transcribedText = 
      "Rendez-vous chez $companyName. Le client confirme des lenteurs récurrentes sur leur lien ADSL "
      "et exprime un besoin urgent de raccorder ses locaux en Fibre Optique Pro avec basculement 4G de secours. "
      "Ils souhaitent également sécuriser leur infrastructure informatique avec un pare-feu managé et "
      "déployer Microsoft 365 Business Premium pour leurs 25 collaborateurs.";

    _isUploading = false;
    _state = RecordingState.completed;
    notifyListeners();

    return _transcribedText;
  }

  void reset() {
    _timer?.cancel();
    _state = RecordingState.idle;
    _recordingSeconds = 0;
    _transcribedText = "";
    _audioPath = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
