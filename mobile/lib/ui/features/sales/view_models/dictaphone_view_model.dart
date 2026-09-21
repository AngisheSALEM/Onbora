import 'dart:async';
import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:permission_handler/permission_handler.dart';

enum RecordingState { idle, recording, stopped, uploading, completed }

/// ViewModel du dictaphone commercial pour l'architecture UI Provider.
///
/// Utilise le moteur de reconnaissance vocale natif [speech_to_text] identique
/// au [DictaphoneController] GetX, avec la même logique anti-ERROR_BUSY :
///   - Délai 600ms après status 'done'/'notListening'
///   - Délai 1200ms après une erreur non-permanente
///   - Guard [_isRelaunching] pour éviter les relances concurrentes
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

  bool _isSpeechAvailable = false;
  bool get isSpeechAvailable => _isSpeechAvailable;

  // Accumulation multi-segments
  String _accumulatedWords = "";
  String _currentSessionWords = "";
  bool _isRelaunching = false;
  Timer? _restartListenTimer;
  bool _isVADSpeaking = false;
  bool get isVADSpeaking => _isVADSpeaking;

  final stt.SpeechToText _speechToText = stt.SpeechToText();

  DictaphoneViewModel() {
    _initSpeechRecognizer();
  }

  Future<void> _initSpeechRecognizer() async {
    try {
      final available = await _speechToText.initialize(
        onStatus: _handleSpeechStatus,
        onError: (errorNotification) {
          if (!errorNotification.permanent && _state == RecordingState.recording) {
            _scheduleRestart(delayMs: 1200);
          }
        },
      );
      _isSpeechAvailable = available;
      notifyListeners();
    } catch (_) {
      _isSpeechAvailable = false;
    }
  }

  void _handleSpeechStatus(String status) {
    if ((status == 'done' || status == 'notListening') && _state == RecordingState.recording) {
      if (_currentSessionWords.trim().isNotEmpty) {
        _accumulatedWords = (_accumulatedWords.isEmpty
                ? _currentSessionWords
                : "$_accumulatedWords $_currentSessionWords")
            .trim();
        _currentSessionWords = "";
        _transcribedText = _accumulatedWords;
        notifyListeners();
      }
      _scheduleRestart(delayMs: 600);
    }
  }

  void _scheduleRestart({required int delayMs}) {
    if (_isRelaunching) return;
    _restartListenTimer?.cancel();
    if (_state != RecordingState.recording) return;

    _restartListenTimer = Timer(Duration(milliseconds: delayMs), () {
      _isRelaunching = false;
      if (_state == RecordingState.recording && !_speechToText.isListening) {
        _startListeningLoop();
      }
    });
    _isRelaunching = true;
  }

  String get formattedDuration {
    final minutes = (_recordingSeconds ~/ 60).toString().padLeft(2, '0');
    final seconds = (_recordingSeconds % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  Future<void> startRecording() async {
    final micPerm = await Permission.microphone.request();
    if (!micPerm.isGranted) {
      return;
    }

    _state = RecordingState.recording;
    _recordingSeconds = 0;
    _transcribedText = "";
    _accumulatedWords = "";
    _currentSessionWords = "";
    _isRelaunching = false;
    notifyListeners();

    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _recordingSeconds++;
      notifyListeners();
    });

    if (!_isSpeechAvailable) {
      await _initSpeechRecognizer();
    }

    _startListeningLoop();
  }

  Future<void> _startListeningLoop() async {
    if (_state != RecordingState.recording) return;
    _isRelaunching = false;

    try {
      await _speechToText.listen(
        onResult: (result) {
          _currentSessionWords = result.recognizedWords;
          final fullText = (_accumulatedWords.isEmpty
                  ? _currentSessionWords
                  : "$_accumulatedWords $_currentSessionWords")
              .trim();
          _transcribedText = fullText;
          _isVADSpeaking = true;
          notifyListeners();

          if (result.finalResult) {
            _accumulatedWords = fullText;
            _currentSessionWords = "";
          }
        },
        listenOptions: stt.SpeechListenOptions(
          listenMode: stt.ListenMode.dictation,
          cancelOnError: false,
          partialResults: true,
          pauseFor: const Duration(seconds: 5),
          listenFor: const Duration(hours: 1),
          localeId: 'fr_FR',
        ),
      );
    } catch (_) {
      if (_state == RecordingState.recording) {
        _scheduleRestart(delayMs: 1200);
      }
    }
  }

  void stopRecording() {
    _timer?.cancel();
    _restartListenTimer?.cancel();
    _isRelaunching = false;
    _isVADSpeaking = false;

    if (_currentSessionWords.trim().isNotEmpty) {
      _accumulatedWords = (_accumulatedWords.isEmpty
              ? _currentSessionWords
              : "$_accumulatedWords $_currentSessionWords")
          .trim();
      _currentSessionWords = "";
      _transcribedText = _accumulatedWords;
    }

    _state = RecordingState.stopped;
    // audioPath reste null : pas de fichier audio physique enregistre
    _audioPath = null;

    if (_speechToText.isListening) {
      _speechToText.stop();
    }

    notifyListeners();
  }

  Future<String> uploadAndTranscribe(String companyName) async {
    _state = RecordingState.uploading;
    _isUploading = true;
    notifyListeners();

    // Retourne la transcription STT locale capturee
    if (_transcribedText.trim().isNotEmpty) {
      _isUploading = false;
      _state = RecordingState.completed;
      notifyListeners();
      return _transcribedText;
    }

    const noSpeechMsg = "Aucune parole detectee. Verifiez que le microphone est "
        "actif et que la langue francaise est disponible sur votre appareil.";
    _transcribedText = noSpeechMsg;
    _isUploading = false;
    _state = RecordingState.completed;
    notifyListeners();
    return _transcribedText;
  }

  void reset() {
    _timer?.cancel();
    _restartListenTimer?.cancel();
    _isRelaunching = false;
    if (_speechToText.isListening) {
      _speechToText.stop();
    }
    _state = RecordingState.idle;
    _recordingSeconds = 0;
    _transcribedText = "";
    _accumulatedWords = "";
    _currentSessionWords = "";
    _isVADSpeaking = false;
    _audioPath = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _restartListenTimer?.cancel();
    _isRelaunching = false;
    if (_speechToText.isListening) {
      _speechToText.stop();
    }
    super.dispose();
  }
}
