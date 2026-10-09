import 'dart:async';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/services.dart';
import '../model/kam_debrief_model.dart';
import 'kam_controller.dart';
import '../../../common/constants/app_constants.dart';

enum DebriefRecordingState { idle, recording, stopped, processing, completed }

class KamDebriefController extends GetxController {
  final KamController _kamCtrl = Get.find<KamController>();

  final Rx<DebriefRecordingState> recordingState = DebriefRecordingState.idle.obs;
  final RxInt recordingSeconds = 0.obs;
  Timer? _timer;

  final RxString transcribedSpeech = "".obs;
  final Rx<KamDebriefModel?> generatedDebrief = Rx<KamDebriefModel?>(null);

  final RxInt currentTabIndex = 0.obs; // 0: Synthese, 1: Engagements, 2: Email Suivi

  final stt.SpeechToText _speechToText = stt.SpeechToText();
  final RxBool isSpeechAvailable = false.obs;
  final RxString speechStatus = "".obs;

  // Accumulation multi-segments (identique au DictaphoneController)
  String _accumulatedWords = "";
  String _currentSessionWords = "";

  // Guard anti-ERROR_BUSY
  bool _isRelaunching = false;
  Timer? _restartListenTimer;

  @override
  void onInit() {
    super.onInit();
    _initSTT();
  }

  Future<void> _initSTT() async {
    try {
      final available = await _speechToText.initialize(
        onStatus: _handleSpeechStatus,
        onError: (errorNotification) {
          speechStatus.value = "Erreur: ${errorNotification.errorMsg}";
          if (!errorNotification.permanent &&
              recordingState.value == DebriefRecordingState.recording) {
            _scheduleRestart(delayMs: 1200);
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
    if ((status == 'done' || status == 'notListening') &&
        recordingState.value == DebriefRecordingState.recording) {
      // Consolider le segment courant dans l'accumulation globale
      if (_currentSessionWords.trim().isNotEmpty) {
        _accumulatedWords = (_accumulatedWords.isEmpty
                ? _currentSessionWords
                : "$_accumulatedWords $_currentSessionWords")
            .trim();
        _currentSessionWords = "";
        transcribedSpeech.value = _accumulatedWords;
      }
      _scheduleRestart(delayMs: 600);
    }
  }

  void _scheduleRestart({required int delayMs}) {
    if (_isRelaunching) return;
    _restartListenTimer?.cancel();
    if (recordingState.value != DebriefRecordingState.recording) return;

    _restartListenTimer = Timer(Duration(milliseconds: delayMs), () {
      _isRelaunching = false;
      if (recordingState.value == DebriefRecordingState.recording &&
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

  Future<void> startRecording() async {
    final micPerm = await Permission.microphone.request();
    if (!micPerm.isGranted) {
      Get.snackbar('Microphone requis', 'Veuillez autoriser l\'acces au microphone.');
      return;
    }

    recordingState.value = DebriefRecordingState.recording;
    recordingSeconds.value = 0;
    transcribedSpeech.value = "";
    _accumulatedWords = "";
    _currentSessionWords = "";
    _isRelaunching = false;

    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => recordingSeconds.value++);

    if (!isSpeechAvailable.value) {
      await _initSTT();
    }

    _startListeningLoop();
  }

  Future<void> _startListeningLoop() async {
    if (recordingState.value != DebriefRecordingState.recording) return;
    _isRelaunching = false;

    try {
      await _speechToText.listen(
        onResult: (result) {
          _currentSessionWords = result.recognizedWords;
          final fullText = (_accumulatedWords.isEmpty
                  ? _currentSessionWords
                  : "$_accumulatedWords $_currentSessionWords")
              .trim();
          transcribedSpeech.value = fullText;

          if (result.finalResult) {
            _accumulatedWords = fullText;
            _currentSessionWords = "";
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
    } catch (_) {
      if (recordingState.value == DebriefRecordingState.recording) {
        _scheduleRestart(delayMs: 1200);
      }
    }
  }

  Future<void> stopRecording() async {
    _timer?.cancel();
    _restartListenTimer?.cancel();
    _isRelaunching = false;

    // Consolider le dernier segment
    if (_currentSessionWords.trim().isNotEmpty) {
      _accumulatedWords = (_accumulatedWords.isEmpty
              ? _currentSessionWords
              : "$_accumulatedWords $_currentSessionWords")
          .trim();
      _currentSessionWords = "";
      transcribedSpeech.value = _accumulatedWords;
    }

    recordingState.value = DebriefRecordingState.stopped;
    if (_speechToText.isListening) {
      await _speechToText.stop();
    }
  }

  Future<void> generateExecutiveDebrief() async {
    recordingState.value = DebriefRecordingState.processing;

    // Simulation du traitement Core AI & LLM d'Onbora (2 secondes)
    await Future.delayed(const Duration(seconds: 2));

    final account = _kamCtrl.selectedAccount.value;
    final accountName = account?.name ?? "Rawbank RDC";

    // Utilise la vraie transcription capturee, avec un fallback indicatif
    final rawTranscript = transcribedSpeech.value.trim().isNotEmpty
        ? transcribedSpeech.value.trim()
        : "Debriefing enregistre sans transcription vocale disponible.";

    generatedDebrief.value = KamDebriefModel(
      accountId: account?.id ?? 1,
      accountName: accountName,
      meetingDate: "Aujourd'hui a 15h15",
      rawTranscript: rawTranscript,
      meetingAtmosphere: "Tres constructif et strategique",
      executiveSummary: "Reunion decisive avec le DSI et les Achats. Le client a confirme sa volonte de renouveler le lien Fibre Siege (18k\$/mois) sous condition de remise d'un plan de continuite haute disponibilite. Forte traction sur notre offre SD-WAN Manage pour leurs 12 nouvelles agences provinciales.",
      agreedKeyPoints: [
        "Accord de principe sur le renouvellement de la Fibre Siege avec integration d'un backup 5G Entreprise.",
        "Validation pour organiser un atelier technique d'architecture SD-WAN le mardi 8 septembre avec l'ingenieur avant-vente Orange.",
        "Les Achats ont accepte de suspendre leur consultation concurrente si nous fournissons l'offre globale avant le 15 septembre.",
      ],
      clientObjections: [
        "Exigence d'un engagement SLA a 99.99% avec penalites automatiques de facturation en cas de coupure > 15 min.",
        "Demande d'une reduction de 5% sur le parc MPLS provincial existant lors du renouvellement.",
      ],
      commitments: [
        KamCommitment(
          action: "Transmettre la matrice technique de haute disponibilite Fibre + 5G au DSI",
          owner: "Orange (KAM & Avant-Vente)",
          dueDate: "04/09/2026",
          priority: "HAUTE",
        ),
        KamCommitment(
          action: "Envoyer l'invitation pour l'atelier d'architecture SD-WAN avec les equipes reseau",
          owner: "Orange (KAM)",
          dueDate: "05/09/2026",
          priority: "HAUTE",
        ),
        KamCommitment(
          action: "Fournir la cartographie des adresses des 12 nouvelles agences dans le Katanga",
          owner: "Client (Alain Kabasele)",
          dueDate: "07/09/2026",
          priority: "MOYENNE",
        ),
      ],
      followUpEmailDraft: """Madame Lumumba, Monsieur Mwembo,

Je tiens a vous remercier chaleureusement pour la qualite et la franchise de nos echanges de ce jour au sein de votre siege.

Comme convenu lors de notre reunion, voici le recapitulatif des orientations strategiques partagees :
1. Securisation du Siege : Nous finalisons la proposition de redondance active (Fibre Dediee + Secours 5G Entreprise) garantissant un SLA de 99.99%.
2. Modernisation SD-WAN : Nos equipes avant-vente animeront l'atelier technique d'architecture le mardi 8 septembre prochain afin de dimensionner l'interconnexion de vos 12 futures agences provinciales.
3. Proposition Commerciale Globale : Notre offre financiere consolidee vous parviendra d'ici le 15 septembre.

Je reste a votre entiere disposition pour tout complement et vous reitere l'engagement d'Orange Business a accompagner la croissance de la Rawbank.

Bien cordialement,
Votre Key Account Manager — Orange Business""",
      nextSteps: "Planifier l'atelier avant-vente et saisir les opportunites dans le CRM Kaabu.",
    );

    recordingState.value = DebriefRecordingState.completed;
  }

  void copyEmailToClipboard() {
    final email = generatedDebrief.value?.followUpEmailDraft;
    if (email != null && email.isNotEmpty) {
      Clipboard.setData(ClipboardData(text: email));
      Get.snackbar(
        'Email Copie',
        'Le brouillon d\'email C-Level a ete copie dans votre presse-papier.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: AppConstants.primaryBlack,
        colorText: Colors.white,
      );
    }
  }

  void reset() {
    _timer?.cancel();
    _restartListenTimer?.cancel();
    _isRelaunching = false;
    if (_speechToText.isListening) {
      _speechToText.stop();
    }
    recordingState.value = DebriefRecordingState.idle;
    recordingSeconds.value = 0;
    transcribedSpeech.value = "";
    _accumulatedWords = "";
    _currentSessionWords = "";
    generatedDebrief.value = null;
  }

  @override
  void onClose() {
    _timer?.cancel();
    _restartListenTimer?.cancel();
    _isRelaunching = false;
    if (_speechToText.isListening) {
      _speechToText.stop();
    }
    super.onClose();
  }
}
