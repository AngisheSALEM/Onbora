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

  final RxInt currentTabIndex = 0.obs; // 0: Synthèse, 1: Engagements, 2: Email Suivi

  final stt.SpeechToText _speechToText = stt.SpeechToText();
  final RxBool isSpeechAvailable = false.obs;

  @override
  void onInit() {
    super.onInit();
    _initSTT();
  }

  Future<void> _initSTT() async {
    try {
      final available = await _speechToText.initialize();
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
      Get.snackbar('Microphone requis', 'Veuillez autoriser l\'accès au microphone.');
      return;
    }

    recordingState.value = DebriefRecordingState.recording;
    recordingSeconds.value = 0;
    transcribedSpeech.value = "";

    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => recordingSeconds.value++);

    try {
      await _speechToText.listen(
        onResult: (result) {
          transcribedSpeech.value = result.recognizedWords;
        },
        listenOptions: stt.SpeechListenOptions(
          localeId: 'fr_FR',
          listenMode: stt.ListenMode.dictation,
          cancelOnError: false,
        ),
      );
    } catch (_) {}
  }

  Future<void> stopRecording() async {
    _timer?.cancel();
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

    generatedDebrief.value = KamDebriefModel(
      accountId: account?.id ?? 1,
      accountName: accountName,
      meetingDate: "Aujourd'hui à 15h15",
      rawTranscript: transcribedSpeech.value.isNotEmpty
          ? transcribedSpeech.value
          : "Discussion approfondie avec le DSI (Dieudonné Mwembo) et la Directrice des Achats (Patricia Lumumba). Point critique sur la redondance du lien Siège et validation de principe pour le POC SD-WAN.",
      meetingAtmosphere: "Très constructif et stratégique",
      executiveSummary: "Réunion décisive avec le DSI et les Achats. Le client a confirmé sa volonté de renouveler le lien Fibre Siège (18k\$/mois) sous condition de remise d'un plan de continuité haute disponibilité. Forte traction sur notre offre SD-WAN Managé pour leurs 12 nouvelles agences provinciales.",
      agreedKeyPoints: [
        "Accord de principe sur le renouvellement de la Fibre Siège avec intégration d'un backup 5G Entreprise.",
        "Validation pour organiser un atelier technique d'architecture SD-WAN le mardi 8 septembre avec l'ingénieur avant-vente Orange.",
        "Les Achats ont accepté de suspendre leur consultation concurrente si nous fournissons l'offre globale avant le 15 septembre.",
      ],
      clientObjections: [
        "Exigence d'un engagement SLA à 99.99% avec pénalités automatiques de facturation en cas de coupure > 15 min.",
        "Demande d'une réduction de 5% sur le parc MPLS provincial existant lors du renouvellement.",
      ],
      commitments: [
        KamCommitment(
          action: "Transmettre la matrice technique de haute disponibilité Fibre + 5G au DSI",
          owner: "Orange (KAM & Avant-Vente)",
          dueDate: "04/09/2026",
          priority: "HAUTE",
        ),
        KamCommitment(
          action: "Envoyer l'invitation pour l'atelier d'architecture SD-WAN avec les équipes réseau",
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

Je tiens à vous remercier chaleureusement pour la qualité et la franchise de nos échanges de ce jour au sein de votre siège.

Comme convenu lors de notre réunion, voici le récapitulatif des orientations stratégiques partagées :
1. Sécurisation du Siège : Nous finalisons la proposition de redondance active (Fibre Dédiée + Secours 5G Entreprise) garantissant un SLA de 99.99%.
2. Modernisation SD-WAN : Nos équipes avant-vente animeront l'atelier technique d'architecture le mardi 8 septembre prochain afin de dimensionner l'interconnexion de vos 12 futures agences provinciales.
3. Proposition Commerciale Globale : Notre offre financière consolidée vous parviendra d'ici le 15 septembre.

Je reste à votre entière disposition pour tout complément et vous réitère l'engagement d'Orange Business à accompagner la croissance de la Rawbank.

Bien cordialement,
Votre Key Account Manager — Orange Business""",
      nextSteps: "Planifier l'atelier avant-vente et saisir les opportunités dans le CRM Kaabu.",
    );

    recordingState.value = DebriefRecordingState.completed;
  }

  void copyEmailToClipboard() {
    final email = generatedDebrief.value?.followUpEmailDraft;
    if (email != null && email.isNotEmpty) {
      Clipboard.setData(ClipboardData(text: email));
      Get.snackbar(
        'Email Copié',
        'Le brouillon d\'email C-Level a été copié dans votre presse-papier.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: AppConstants.primaryBlack,
        colorText: Colors.white,
      );
    }
  }

  void reset() {
    _timer?.cancel();
    if (_speechToText.isListening) {
      _speechToText.stop();
    }
    recordingState.value = DebriefRecordingState.idle;
    recordingSeconds.value = 0;
    transcribedSpeech.value = "";
    generatedDebrief.value = null;
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
